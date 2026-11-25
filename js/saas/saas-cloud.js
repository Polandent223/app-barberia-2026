import {firestore,doc,getDoc,setDoc,onSnapshot,serverTimestamp,writeBatch} from "../firebase/firebase-core.js?v=1.0.18";

import {runTransaction,getDocFromServer} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import {cloneJSON,changedParts,assertUnchanged} from "./sync-conflict.js?v=2.0.3";

const PLATFORM="platform";
const BUSINESSES="businesses";
let catalogUnsub=null,stateUnsubs=[];
const baselines=new Map(), pending=new Map();
const tenantKey=(id,uid=authUid())=>uid+":"+id;
const draftKey=key=>"sambrix_sync_pending_v1:"+key;
function storedDraft(key){try{return !!localStorage.getItem(draftKey(key));}catch{return false;}}
function keepDraft(key,job,error){
  job.failed=true;
  try{localStorage.setItem(draftKey(key),JSON.stringify({businessId:job.businessId,at:new Date().toISOString(),error:String(error?.code||error?.message||"sync"),parts:job.latest}));}
  catch(e){console.error("[SAMBRIX pending draft]",e);}
  if(authUid()===job.uid&&SaaS.getContext?.()?.businessId===job.businessId){
    A()?.toast?.("Cambios pendientes. No continúes en este equipo: contacta a soporte.");
    document.dispatchEvent(new CustomEvent("sambrix-sync-conflict",{detail:{businessId:job.businessId}}));
  }
}
export function tenantSyncBlocked(id){const key=tenantKey(id);return !!pending.get(key)?.failed||storedDraft(key);}
export function tenantSyncBusy(id){return !!pending.get(tenantKey(id))?.count;}


function authEmail(){return window.FirebaseBridge?.user?.email||""}
function authUid(){return String(window.FirebaseBridge?.user?.uid||"")}
function A(){return window.App}
function businessById(id){return (SaaS.db.businesses||[]).find(b=>b.id===id)||null}
function sessionCanReadTenant(businessId,uid){
  if(!uid||uid!==authUid())return false;
  const role=String(SaaS.session?.role||"").toLowerCase();
  if(role==="guest")return false;
  if(role==="superadmin")return true;
  return String(SaaS.session?.businessId||"")===String(businessId||"");
}

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
  const branchId=next.meta.branchId||"";
  ["users","barbers","services","clients","appointments","cash","sales","products","stockMoves","shopOrders","employees","attendance","absences","approvalRequests","clientRequests","auditLog","clientActivity"].forEach(k=>{
    if(Array.isArray(next[k]))next[k].forEach(x=>{if(x&&typeof x==="object"){if(!x.businessId)x.businessId=businessId;if(x.branchId===undefined)x.branchId=branchId;}});
  });
  return next;
}

function assertTenantIdentity(businessId,state){
  if(!businessId||!state)throw new Error("Faltan datos del negocio para sincronizar.");
  const embedded=String(state?.meta?.businessId||"");
  if(embedded&&embedded!==String(businessId))throw new Error(`Bloqueada sincronización cruzada: ${embedded} -> ${businessId}`);
  const sessionBusiness=String(SaaS.session?.businessId||"");
  const role=String(SaaS.session?.role||"").toLowerCase();
  if(role!=="superadmin"&&sessionBusiness&&sessionBusiness!==String(businessId))throw new Error("La sesión actual no pertenece al negocio solicitado.");
}

export async function cloudBootstrapPlatform(){
  const cfgRef=doc(firestore,PLATFORM,"config"),snap=await getDoc(cfgRef);
  if(!snap.exists())await setDoc(cfgRef,{name:"SAMBRIX",createdAt:serverTimestamp(),ownerEmail:authEmail(),ownerUid:authUid()});
}

export async function uploadBusinessCatalog(){
  await setDoc(doc(firestore,PLATFORM,"business_catalog"),{businesses:SaaS.db.businesses,plans:SaaS.db.plans,supportAudit:SaaS.db.supportAudit||[],updatedAt:serverTimestamp(),updatedBy:authEmail()},{merge:true});
}

export async function downloadBusinessCatalog(){
  const s=await getDoc(doc(firestore,PLATFORM,"business_catalog"));if(!s.exists())return false;
  const d=s.data();if(Array.isArray(d.businesses))SaaS.db.businesses=d.businesses;if(Array.isArray(d.plans))SaaS.db.plans=d.plans;if(Array.isArray(d.supportAudit))SaaS.db.supportAudit=d.supportAudit;
  SaaS.__applyingCloudCatalog=true;try{SaaS.save();SaaS.renderAll?.();}finally{SaaS.__applyingCloudCatalog=false;}return true;
}

function split(state){return {config:{business:state.business||{},users:state.users||[],barbers:state.barbers||[],services:state.services||[],meta:state.meta||{}},crm:{clients:state.clients||[],approvalRequests:state.approvalRequests||[],clientRequests:state.clientRequests||[]},schedule:{appointments:state.appointments||[]},finance:{cash:state.cash||[],sales:state.sales||[]},inventory:{products:state.products||[],stockMoves:state.stockMoves||[],shopOrders:state.shopOrders||[]},staff:{employees:state.employees||[]},attendance:{attendance:state.attendance||[],absences:state.absences||[]},history:{auditLog:state.auditLog||[],clientActivity:state.clientActivity||[]}}}
function writablePartsForRole(role){role=String(role||"").toLowerCase();if(["superadmin","owner","admin","manager"].includes(role))return null;if(role==="reception")return new Set(["crm","schedule","finance"]);if(role==="cashier")return new Set(["crm","finance","inventory"]);if(role==="barber")return new Set(["schedule","attendance"]);return new Set()}

async function writeTenantParts(businessId,state,allowed=null){
  assertTenantIdentity(businessId,state);state=normalizeTenantState(businessId,state);const parts=split(state),entries=Object.entries(parts).filter(([name])=>allowed===null||allowed.has(name));if(!entries.length)return false;
  const batch=writeBatch(firestore);entries.forEach(([name,payload])=>batch.set(doc(firestore,BUSINESSES,businessId,"state",name),{businessId,payload:JSON.parse(JSON.stringify(payload)),updatedAt:serverTimestamp(),updatedBy:authEmail()},{merge:true}));await batch.commit();return true;
}
export async function uploadTenantState(businessId,state){
  assertTenantIdentity(businessId,state);
  const next=normalizeTenantState(businessId,cloneJSON(state)),parts=split(next);
  const entries=Object.entries(parts),refs=entries.map(([name])=>doc(firestore,BUSINESSES,businessId,"state",name));
  const legacy=doc(firestore,BUSINESSES,businessId,"state","operations");
  await runTransaction(firestore,async tx=>{
    const all=await Promise.all([...refs,legacy].map(ref=>tx.get(ref)));
    if(all.some(s=>s.exists()))throw new Error("La empresa ya tiene datos. No se realizará una inicialización destructiva.");
    entries.forEach(([name,payload],i)=>tx.set(refs[i],{businessId,payload:cloneJSON(payload),updatedAt:serverTimestamp(),updatedBy:authEmail()}));
  });
  SaaS.saveTenantState?.(businessId,next);return true;
}
export async function ensureTenantState(businessId){if(!businessId)return false;const cfg=await getDoc(doc(firestore,BUSINESSES,businessId,"state","config"));if(cfg.exists())return false;const business=businessById(businessId),fallback=SaaS.blankBusinessState?.(business)||{meta:{businessId},business:{name:business?.name||"Negocio"}};let state=SaaS.loadTenantState?.(businessId)||fallback;state=normalizeTenantState(businessId,state);await uploadTenantState(businessId,state);return true}
export function uploadCurrentTenant(){
  const b=SaaS.currentBusiness();if(!b||!A()?.db)return Promise.resolve(false);
  const id=b.id,uid=authUid(),key=tenantKey(id,uid),email=authEmail();
  assertTenantIdentity(id,A().db);
  const state=normalizeTenantState(id,cloneJSON(A().db)), next=split(state);
  const allowed=writablePartsForRole(SaaS.session?.role);
  const base=baselines.get(key);
  if(tenantSyncBlocked(id))return Promise.reject(new Error("Hay cambios pendientes de revisión. Contacta a soporte."));
  if(!base)return Promise.reject(new Error("No existe una lectura de Firebase verificada para este negocio."));
  const entries=changedParts(next,base.logical,base.raw,allowed);
  if(!entries.length)return Promise.resolve(false);
  let job=pending.get(key);
  if(!job){job={uid,businessId:id,count:0,tail:Promise.resolve(),failed:false,latest:{}};pending.set(key,job);}
  for(const entry of entries){job.latest[entry.name]=entry.after;base.raw[entry.name]=entry.after;base.logical[entry.name]=entry.after;}
  job.count++;
  const valid=()=>sessionCanReadTenant(id,uid)&&SaaS.getContext?.()?.businessId===id;
  const work=job.tail.then(async()=>{
    if(job.failed||!valid())throw new Error("La sesión cambió antes de sincronizar.");
    await runTransaction(firestore,async tx=>{
      if(!valid())throw new Error("La sesión cambió antes de sincronizar.");
      const refs=entries.map(e=>doc(firestore,BUSINESSES,id,"state",e.name));
      const snaps=await Promise.all(refs.map(ref=>tx.get(ref)));
      if(!valid())throw new Error("La sesión cambió durante la sincronización.");
      const actual={};
      snaps.forEach((s,i)=>{if(s.exists()){if(String(s.data().businessId||id)!==id)throw new Error("Documento con empresa incorrecta.");actual[entries[i].name]=s.data().payload;}});
      assertUnchanged(entries,actual);
      entries.forEach((e,i)=>tx.set(refs[i],{businessId:id,payload:e.after,updatedAt:serverTimestamp(),updatedBy:email},{mergeFields:["businessId","payload","updatedAt","updatedBy"]}));
    });
    return true;
  }).catch(error=>{keepDraft(key,job,error);throw error;}).finally(()=>{
    job.count--;
    if(!job.count&&!job.failed){
      pending.delete(key);
      if(valid())watchCurrentTenant();
    }
  });
  job.tail=work;
  return work;
}

export async function downloadTenant(businessId){
  if(!businessId)return false;
  const startedUid=authUid();
  if(!sessionCanReadTenant(businessId,startedUid))throw new Error("La sesión actual no puede leer este negocio.");
  const names=["operations","config","history","crm","schedule","finance","inventory","staff","attendance"];
  const key=tenantKey(businessId,startedUid);
  if(tenantSyncBlocked(businessId))throw new Error("Existen cambios locales pendientes de revisión.");
  const snaps=await Promise.all(names.map(n=>getDocFromServer(doc(firestore,BUSINESSES,businessId,"state",n))));
  // La sesión puede cambiar mientras Firestore responde. En ese caso descartamos completamente la descarga.
  if(!sessionCanReadTenant(businessId,startedUid))return false;
  if(!snaps.some(s=>s.exists()))return false;
  // Firebase es la fuente autoritativa al hidratar un tenant. No mezclar aquí
  // datos operativos antiguos de localStorage, porque podrían pertenecer a una
  // sesión previa o reintroducir registros ya eliminados en la nube.
  let state={meta:{businessId}};
  for(const s of snaps){if(!s.exists()||!s.data()?.payload)continue;const docBusinessId=String(s.data()?.businessId||businessId);if(docBusinessId!==businessId){console.error("[SAMBRIX] Documento de tenant con identidad inválida bloqueado",{expected:businessId,found:docBusinessId});continue}state={...state,...s.data().payload}}
  if(!sessionCanReadTenant(businessId,startedUid))return false;
  state=normalizeTenantState(businessId,state);
  const raw={};snaps.forEach((s,i)=>{if(s.exists()&&String(s.data()?.businessId||businessId)===businessId)raw[names[i]]=cloneJSON(s.data().payload||{});});
  baselines.set(key,{raw,logical:cloneJSON(split(state))});
  SaaS.saveTenantState(businessId,state);
  if(sessionCanReadTenant(businessId,startedUid)&&SaaS.getContext().businessId===businessId){A().db=state;A().ensurePermissionsData?.();A().ensureStaff?.();localStorage.setItem(A().KEY,JSON.stringify(state));A().renderAll?.()}
  return true;
}

export function watchCatalog(){if(catalogUnsub)catalogUnsub();catalogUnsub=onSnapshot(doc(firestore,PLATFORM,"business_catalog"),s=>{if(!s.exists())return;const d=s.data();if(Array.isArray(d.businesses))SaaS.db.businesses=d.businesses;if(Array.isArray(d.plans))SaaS.db.plans=d.plans;if(Array.isArray(d.supportAudit))SaaS.db.supportAudit=d.supportAudit;SaaS.__applyingCloudCatalog=true;try{SaaS.save();SaaS.renderAll?.()}finally{SaaS.__applyingCloudCatalog=false}},e=>console.error("[SAMBRIX catalog listener]",e))}

export function watchCurrentTenant(){
  stateUnsubs.forEach(u=>u());stateUnsubs=[];const b=SaaS.currentBusiness();if(!b)return;const watchedBusinessId=b.id,watchedUid=authUid();if(!sessionCanReadTenant(watchedBusinessId,watchedUid))return;
  ["config","crm","schedule","finance","inventory","staff","attendance","history"].forEach(name=>{stateUnsubs.push(onSnapshot(doc(firestore,BUSINESSES,watchedBusinessId,"state",name),{includeMetadataChanges:true},s=>{if(!s.exists()||!s.data()?.payload||s.metadata.fromCache||s.metadata.hasPendingWrites||tenantSyncBusy(watchedBusinessId)||tenantSyncBlocked(watchedBusinessId))return;if(!sessionCanReadTenant(watchedBusinessId,watchedUid))return;if(SaaS.getContext().businessId!==watchedBusinessId)return;const docBusinessId=String(s.data()?.businessId||watchedBusinessId);if(docBusinessId!==watchedBusinessId){console.error(`[SAMBRIX tenant listener:${name}] identidad inválida`,{expected:watchedBusinessId,found:docBusinessId});return}const state=normalizeTenantState(watchedBusinessId,{...SaaS.loadTenantState(watchedBusinessId),...s.data().payload});if(!sessionCanReadTenant(watchedBusinessId,watchedUid))return;const key=tenantKey(watchedBusinessId,watchedUid),base=baselines.get(key);
    if(!base)return;
    base.raw[name]=cloneJSON(s.data().payload);base.logical=cloneJSON(split(state));
    SaaS.saveTenantState(watchedBusinessId,state);if(SaaS.getContext().businessId===watchedBusinessId){A().db=state;A().ensurePermissionsData?.();A().ensureStaff?.();localStorage.setItem(A().KEY,JSON.stringify(state));A().renderAll?.()}},e=>console.error(`[SAMBRIX tenant listener:${name}]`,e)))});
}
export function stopSaaSCloud(){if(catalogUnsub)catalogUnsub();catalogUnsub=null;stateUnsubs.forEach(u=>u());stateUnsubs=[]}
