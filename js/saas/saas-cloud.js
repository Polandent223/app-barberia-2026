
import {firestore,doc,getDoc,setDoc,onSnapshot,serverTimestamp} from "../firebase/firebase-core.js";

const PLATFORM="platform";
const BUSINESSES="businesses";
let catalogUnsub=null,stateUnsubs=[];

function authEmail(){return window.FirebaseBridge?.user?.email||""}
function A(){return window.App}

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
  SaaS.save();SaaS.renderAll?.();
  return true;
}

function split(state){
  return {
    config:{
      business:state.business||{},users:state.users||[],barbers:state.barbers||[],services:state.services||[],products:state.products||[],employees:state.employees||[],meta:state.meta||{}
    },
    operations:{
      clients:state.clients||[],appointments:state.appointments||[],cash:state.cash||[],stockMoves:state.stockMoves||[],sales:state.sales||[],approvalRequests:state.approvalRequests||[],clientRequests:state.clientRequests||[],shopOrders:state.shopOrders||[]
    },
    history:{
      auditLog:state.auditLog||[],clientActivity:state.clientActivity||[],attendance:state.attendance||[],absences:state.absences||[]
    }
  };
}

export async function uploadCurrentTenant(){
  const b=SaaS.currentBusiness();if(!b||!A()?.db)return;
  const parts=split(A().db);
  await Promise.all(Object.entries(parts).map(([name,payload])=>setDoc(doc(firestore,BUSINESSES,b.id,"state",name),{
    payload,updatedAt:serverTimestamp(),updatedBy:authEmail()
  },{merge:true})));
  SaaS.saveTenantState(b.id,A().db);
}

export async function downloadTenant(businessId){
  const names=["config","operations","history"];
  const snaps=await Promise.all(names.map(n=>getDoc(doc(firestore,BUSINESSES,businessId,"state",n))));
  if(!snaps.some(s=>s.exists()))return false;
  let state=SaaS.loadTenantState(businessId);
  snaps.forEach(s=>{if(s.exists()&&s.data()?.payload)state={...state,...s.data().payload}});
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
    SaaS.save();SaaS.renderAll?.();
  });
}

export function watchCurrentTenant(){
  stateUnsubs.forEach(u=>u());stateUnsubs=[];
  const b=SaaS.currentBusiness();if(!b)return;
  ["config","operations","history"].forEach(name=>{
    stateUnsubs.push(onSnapshot(doc(firestore,BUSINESSES,b.id,"state",name),s=>{
      if(!s.exists()||!s.data()?.payload)return;
      const state={...SaaS.loadTenantState(b.id),...s.data().payload};
      SaaS.saveTenantState(b.id,state);
      if(SaaS.getContext().businessId===b.id){
        A().db=state;A().ensurePermissionsData?.();A().ensureStaff?.();localStorage.setItem(A().KEY,JSON.stringify(state));A().renderAll?.();
      }
    }));
  });
}

export function stopSaaSCloud(){
  if(catalogUnsub)catalogUnsub();catalogUnsub=null;
  stateUnsubs.forEach(u=>u());stateUnsubs=[];
}
