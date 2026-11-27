/* Staged scheduled billing enforcement. Disabled unless explicitly enabled twice. */
export function commercialDay(at=new Date()){
 return new Intl.DateTimeFormat("en-CA",{timeZone:"America/Caracas",year:"numeric",month:"2-digit",day:"2-digit"}).format(at);
}
function validDay(s){if(typeof s!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+"T00:00:00Z");return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s;}
export function canAutoSuspend(config,policy,b,today){
 if(config?.commercialAutomationEnabled!==true||policy?.autoSuspend!==true||!Number.isInteger(policy.graceDays)||policy.graceDays<0||policy.graceDays>30)return false;
 if(b?.commercialAutoEligible!==true||b.commercialManaged!==true||b.accessSuspended===true||b.commercialHold===true||!["activo","prueba","vencido"].includes(String(b.status||"").toLowerCase())||!validDay(b.nextPayment)||!validDay(today))return false;
 return (Date.parse(today)-Date.parse(b.nextPayment))/86400000>policy.graceDays;
}
export async function suspendOverdueBusinesses(db,stamp,at=new Date()){
 const today=commercialDay(at),configRef=db.doc("platform/config"),policyRef=db.doc("platform/commercial_policy"),catalogRef=db.doc("platform/business_catalog");
 const [cfg,pol]=await Promise.all([configRef.get(),policyRef.get()]);
 if(cfg.data()?.commercialAutomationEnabled!==true||pol.data()?.autoSuspend!==true)return {enabled:false,suspended:0};
 const catalog=await catalogRef.get(),ids=[...new Set((catalog.data()?.businesses||[]).map(b=>b.id).filter(id=>typeof id==="string"&&/^[A-Za-z0-9_-]{1,80}$/.test(id)))];
 let suspended=0,failed=0;
 for(const id of ids){
  const ref=db.doc("businesses/"+id),pub=db.doc("public_businesses/"+id),audit=db.collection("support_access_events").doc();
  try{const changed=await db.runTransaction(async tx=>{
   const [c,p,list,company,publicSnap]=await Promise.all([tx.get(configRef),tx.get(policyRef),tx.get(catalogRef),tx.get(ref),tx.get(pub)]);
   const business=company.data(),rows=list.data()?.businesses;
   if(!Array.isArray(rows)||!rows.some(b=>b.id===id)||business?.id!==id||!canAutoSuspend(c.data(),p.data(),business,today))return false;
   const patch={accessSuspended:true,commercialHold:true,commercialManaged:true};
   tx.update(ref,{...patch,accessChangedAt:stamp(),accessChangedBy:"system:billing"});
   tx.update(catalogRef,{businesses:rows.map(b=>b.id===id?{...b,...patch}:b),updatedAt:stamp()});
   if(publicSnap.exists)tx.update(pub,{status:"Suspendido",serverUpdatedAt:stamp()});
   tx.set(audit,{businessId:id,action:"ACCESS_SUSPEND",reason:"Cobranza automática: vencimiento "+business.nextPayment+"; gracia "+p.data().graceDays+" días.",caseId:"",actorUid:"system:billing",createdAt:stamp()});
   return true;
  });if(changed)suspended++;}
  catch(error){failed++;console.error("Commercial suspension failed",id,error?.code||"unknown");}
 }
 return {enabled:true,suspended,failed};
}
