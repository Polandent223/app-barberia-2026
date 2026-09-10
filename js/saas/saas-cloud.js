import {firestore,doc,getDoc,setDoc,onSnapshot,serverTimestamp} from "../firebase/firebase-core.js";

const PLATFORM="platform";
const BUSINESSES="businesses";
let catalogUnsub=null,stateUnsubs=[];

function authEmail(){return window.FirebaseBridge?.user?.email||""}
function A(){return window.App}
function businessById(id){return (SaaS.db.businesses||[]).find(b=>b.id===id)||null}

function normalizeTenantState(businessId,state){
  const business=businessById(businessId);
  const next=state&&typeof state==="object"?state:{};
  next.meta=next.meta||{};
  next.business=next.business||{};
  next.meta.businessId=businessId;
  next.meta.branchId=next.meta.branchId||business?.branches?.[0]?.id||"";
  next.meta.businessType=business?.type||next.meta.businessType||"";
  if(business){
    next.business.name=business.name||next.business.name||"Negocio";
    next.business.clientApp=next.business.clientApp||{};
    next.business.clientApp.brandName=business.brand?.name||business.name||next.business.clientApp.brandName||"Negocio";
  }
  return next;
}

function assertTenantIdentity(businessId,state){
  if(!businessId||!state)throw new Error("Faltan datos del negocio para sincronizar.");
  const embedded=String(state?.meta?.businessId||"");
  if(embedded&&embedded!==String(businessId)){
    throw new Error(`Bloqueada sincronización cruzada: ${embedded} -> ${businessId}`);
  }
  const sessionBusiness=String(SaaS.session?.businessId||"");
  const role=String(SaaS.session?.role||"").toLowerCase();
  if(role!=="superadmin"&&sessionBusiness&&sessionBusiness!==String(businessId)){
    throw new Error("La sesión actual no pertenece al negocio solicitado.");
  }
}

export async function cloudBootstrapPlatform(){
  const cfgRef=doc(firestore,PLATFORM,"config");
  const snap=await getDoc(cfgRef);
  if(!snap.exists()){
    await setDoc(cfgRef,{
      name:"SAMBRIX",
      createdAt:serverTimestamp(),
      ownerEmail:authEmail(),
      ownerUid:window.FirebaseBridge?.user?.uid||""
    });
  }
}

export async function uploadBusinessCatalog(){
  await setDoc(doc(firestore,PLATFORM,"business_catalog"),{
    businesses:SaaS.db.businesses,
    plans:SaaS.db.plans,
    supportAudit:SaaS.db.supportAudit||[],
    updatedAt:serverTimestamp(),
    updatedBy:authEmail()
  },{merge:true});
}

export async function downloadBusinessCatalog(){
  const s=await getDoc(doc(firestore,PLATFORM,"business_catalog"));
  if(!s.exists())return false;
  const d=s.data();
  if(Array.isArray(d.businesses))SaaS.db.businesses=d.businesses;
  if(Array.isArray(d.plans))SaaS.db.plans=d.plans;
  if(Array.isArray(d.supportAudit))SaaS.db.supportAudit=d.supportAudit;
  SaaS.__applyingCloudCatalog=true;
  try{SaaS.save();SaaS.renderAll?.();}finally{SaaS.__applyingCloudCatalog=false;}
  return true;
}

function split(state){
  return {
    config:{business:state.business||{},users:state.users||[],barbers:state.barbers||[],services:state.services||[],meta:state.meta||{}},
    crm:{clients:state.clients||[],approvalRequests:state.approvalRequests||[],clientRequests:state.clientRequests||[]},
    schedule:{appointments:state.appointments||[]},
    finance:{cash:state.cash||[],sales:state.sales||[]},
    inventory:{products:state.products||[],stockMoves:state.stockMoves||[],shopOrders:state.shopOrders||[]},
    staff:{employees:state.employees||[]},
    attendance:{attendance:state.attendance||[],absences:state.absences||[]},
    history:{auditLog:state.auditLog||[],clientActivity:state.clientActivity||[]}
  };
}

function writablePartsForRole(role){
  role=String(role||"").toLowerCase();
  if(["superadmin","owner","admin","manager"].includes(role))return null;
  if(role==="reception")return new Set(["crm","schedule","finance"]);
  if(role==="cashier")return new Set(["crm","finance","inventory"]);
  if(role==="barber")return new Set(["schedule","attendance"]);
  return new Set();
}

async function writeTenantParts(businessId,state,allowed=null){
  assertTenantIdentity(businessId,state);
  state=normalizeTenantState(businessId,state);
  const parts=split(state);
  const entries=Object.entries(parts).filter(([name])=>allowed===null||allowed.has(name));
  if(!entries.length)return false;
  await Promise.all(entries.map(([name,payload])=>setDoc(doc(firestore,BUSINESSES,businessId,"state",name),{
    businessId,payload,updatedAt:serverTimestamp(),updatedBy:authEmail()
  },{merge:true})));
  return true;
}

export async function uploadTenantState(businessId,state){
  await writeTenantParts(businessId,state,null);
  SaaS.saveTenantState?.(businessId,normalizeTenantState(businessId,state));
  return true;
}

export async function ensureTenantState(businessId){
  if(!businessId)return false;
  const cfg=await getDoc(doc(firestore,BUSINESSES,businessId,"state","config"));
  if(cfg.exists())return false;
  const business=businessById(businessId);
  const fallback=SaaS.blankBusinessState?.(business)||{meta:{businessId},business:{name:business?.name||"Negocio"}};
  let state=SaaS.loadTenantState?.(businessId)||fallback;
  state=normalizeTenantState(businessId,state);
  await uploadTenantState(businessId,state);
  return true;
}

export async function uploadCurrentTenant(){
  const b=SaaS.currentBusiness();if(!b||!A()?.db)return false;
  assertTenantIdentity(b.id,A().db);
  const allowed=writablePartsForRole(SaaS.session?.role);
  const state=normalizeTenantState(b.id,A().db);
  const ok=await writeTenantParts(b.id,state,allowed);
  if(ok)SaaS.saveTenantState(b.id,state);
  return ok;
}

export async function downloadTenant(businessId){
  if(!businessId)return false;
  const role=String(SaaS.session?.role||"").toLowerCase();
  if(role!=="superadmin"&&SaaS.session?.businessId&&SaaS.session.businessId!==businessId){
    throw new Error("Intento de lectura de otro negocio bloqueado.");
  }
  const names=["operations","config","history","crm","schedule","finance","inventory","staff","attendance"];
  const snaps=await Promise.all(names.map(n=>getDoc(doc(firestore,BUSINESSES,businessId,"state",n))));
  if(!snaps.some(s=>s.exists()))return false;
  let state=SaaS.loadTenantState(businessId);
  for(const s of snaps){
    if(!s.exists()||!s.data()?.payload)continue;
    const docBusinessId=String(s.data()?.businessId||businessId);
    if(docBusinessId!==businessId){
      console.error("[SAMBRIX] Documento de tenant con identidad inválida bloqueado",{expected:businessId,found:docBusinessId});
      continue;
    }
    state={...state,...s.data().payload};
  }
  state=normalizeTenantState(businessId,state);
  SaaS.saveTenantState(businessId,state);
  if(SaaS.getContext().businessId===businessId){
    A().db=state;A().ensurePermissionsData?.();A().ensureStaff?.();localStorage.setItem(A().KEY,JSON.stringify(state));A().renderAll?.();
  }
  return true;
}

export function watchCatalog(){
  if(catalogUnsub)catalogUnsub();
  catalogUnsub=onSnapshot(doc(firestore,PLATFORM,"business_catalog"),s=>{
    if(!s.exists())return;
    const d=s.data();
    if(Array.isArray(d.businesses))SaaS.db.businesses=d.businesses;
    if(Array.isArray(d.plans))SaaS.db.plans=d.plans;
    if(Array.isArray(d.supportAudit))SaaS.db.supportAudit=d.supportAudit;
    SaaS.__applyingCloudCatalog=true;
    try{SaaS.save();SaaS.renderAll?.();}finally{SaaS.__applyingCloudCatalog=false;}
  },e=>console.error("[SAMBRIX catalog listener]",e));
}

export function watchCurrentTenant(){
  stateUnsubs.forEach(u=>u());stateUnsubs=[];
  const b=SaaS.currentBusiness();if(!b)return;
  const watchedBusinessId=b.id;
  ["config","crm","schedule","finance","inventory","staff","attendance","history"].forEach(name=>{
    stateUnsubs.push(onSnapshot(doc(firestore,BUSINESSES,watchedBusinessId,"state",name),s=>{
      if(!s.exists()||!s.data()?.payload)return;
      if(SaaS.getContext().businessId!==watchedBusinessId)return;
      const docBusinessId=String(s.data()?.businessId||watchedBusinessId);
      if(docBusinessId!==watchedBusinessId){
        console.error(`[SAMBRIX tenant listener:${name}] identidad inválida`,{expected:watchedBusinessId,found:docBusinessId});
        return;
      }
      const state=normalizeTenantState(watchedBusinessId,{...SaaS.loadTenantState(watchedBusinessId),...s.data().payload});
      SaaS.saveTenantState(watchedBusinessId,state);
      if(SaaS.getContext().businessId===watchedBusinessId){
        A().db=state;A().ensurePermissionsData?.();A().ensureStaff?.();localStorage.setItem(A().KEY,JSON.stringify(state));A().renderAll?.();
      }
    },e=>console.error(`[SAMBRIX tenant listener:${name}]`,e)));
  });
}

export function stopSaaSCloud(){
  if(catalogUnsub)catalogUnsub();catalogUnsub=null;
  stateUnsubs.forEach(u=>u());stateUnsubs=[];
}
