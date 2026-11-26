import {readFileSync} from "node:fs";
import {before,after,test} from "node:test";
import {initializeTestEnvironment,assertSucceeds,assertFails} from "@firebase/rules-unit-testing";
import {doc,collection,getDoc,setDoc,updateDoc,deleteDoc,writeBatch,runTransaction,serverTimestamp} from "firebase/firestore";
import assert from "node:assert/strict";
import {closeAppointment} from "../js/saas/financial-close-core.js";
import {renewalDate,paymentAmount} from "../js/saas/commercial-core.js";
let env;
const path=(db,...s)=>doc(db,...s);
const state=(db,id,name)=>path(db,"businesses",id,"state",name);
const member=(db,id,uid)=>path(db,"businesses",id,"members",uid);
const actor=uid=>env.authenticatedContext(uid).firestore();
const payload={cash:[{id:"cash1",amount:10,type:"Ingreso"}],sales:[{id:"sale1",total:10}]};
before(async()=>{
  if(!process.env.FIRESTORE_EMULATOR_HOST)throw Error("No se permite ejecutar estas pruebas contra producción.");
  env=await initializeTestEnvironment({projectId:"demo-sambrix-qa",firestore:{rules:readFileSync(new URL("../firestore.rules",import.meta.url),"utf8")}});
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx=>{
    const db=ctx.firestore();
    await setDoc(path(db,"platform","config"),{ownerUid:"root"});
    for(const id of ["one","two","blocked"])await setDoc(path(db,"businesses",id),{id,status:"Activo",accessSuspended:id==="blocked",planId:"plan-pro"});
    for(const [uid,id,role] of [["owner","one","owner"],["admin","one","admin"],["cashier","one","cashier"],["barber","one","barber"],["other","two","owner"],["locked","blocked","owner"]]){
      await setDoc(path(db,"platform_users",uid),{uid,active:true,role:"business_user",businessId:id});
      await setDoc(member(db,id,uid),{uid,businessId:id,role,active:true});
    }
    for(const id of ["one","two","blocked"])await setDoc(state(db,id,"finance"),{businessId:id,payload,syncRevision:1});
  });
});
after(async()=>{if(env)await env.cleanup();});
test("tenant cannot access another business or a suspended business",async()=>{
  await assertSucceeds(getDoc(state(actor("owner"),"one","finance")));
  await assertFails(getDoc(state(actor("other"),"one","finance")));
  await assertFails(getDoc(state(actor("locked"),"blocked","finance")));
  await assertFails(getDoc(state(env.unauthenticatedContext().firestore(),"one","finance")));
});
test("tenant cannot change commercial plan or lift suspension",async()=>{
  await assertFails(updateDoc(path(actor("owner"),"businesses","one"),{planId:"plan-premium"}));
  await assertFails(updateDoc(path(actor("locked"),"businesses","blocked"),{accessSuspended:false}));
});
test("admin cannot promote another user to admin",async()=>{
  await assertFails(updateDoc(member(actor("admin"),"one","cashier"),{role:"admin"}));
});
function financeWrite(db,uid,next,revision,eventId){
  const b=writeBatch(db),ref=state(db,"one","finance"),event=path(db,"businesses","one","state_events",eventId);
  b.update(ref,{payload:next,syncRevision:revision,updatedByUid:uid,updatedAt:serverTimestamp(),auditId:eventId});
  b.set(event,{businessId:"one",domain:"finance",revision,actorUid:uid,createdAt:serverTimestamp()});return b.commit();
}
test("cashier can append an audited movement but cannot edit or delete history",async()=>{
  const db=actor("cashier"),next={...payload,cash:[...payload.cash,{id:"cash2",amount:5,type:"Ingreso"}]};
  await assertFails(updateDoc(state(db,"one","finance"),{payload:next,syncRevision:2,updatedByUid:"cashier",updatedAt:serverTimestamp()}));
  await assertFails(financeWrite(db,"cashier",{...payload,cash:[]},2,"bad-delete"));
  await assertFails(financeWrite(db,"cashier",{...payload,cash:[{...payload.cash[0],amount:1}]},2,"bad-edit"));
  await assertSucceeds(financeWrite(db,"cashier",next,2,"ok"));
  await assertFails(financeWrite(db,"cashier",next,2,"stale"));
  await assertFails(deleteDoc(state(db,"one","finance")));
  await assertFails(deleteDoc(path(db,"businesses","one","state_events","ok")));
  await assertSucceeds(getDoc(path(actor("owner"),"businesses","one","state_events","ok")));
});
test("professional cannot write finance even with audit",async()=>{
  await assertFails(financeWrite(actor("barber"),"barber",payload,3,"bad-role"));
});

const publicDoc=(db,id,kind,key)=>path(db,"public_businesses",id,kind,key);
test("support tickets remain private to the company and requesting employee",async()=>{
  const db=actor("cashier"),ref=path(db,"support_cases","qa-ticket");
  await assertSucceeds(setDoc(ref,{businessId:"one",subject:"Consulta de caja",description:"Revisar una operación registrada",priority:"Normal",status:"Abierto",createdBy:"cashier",createdAt:serverTimestamp()}));
  await assertSucceeds(getDoc(ref));await assertSucceeds(getDoc(path(actor("owner"),"support_cases","qa-ticket")));
  await assertFails(getDoc(path(actor("barber"),"support_cases","qa-ticket")));
  await assertFails(getDoc(path(actor("other"),"support_cases","qa-ticket")));
  await assertFails(updateDoc(ref,{status:"Resuelto",response:"Respuesta falsa",updatedBy:"cashier",updatedAt:serverTimestamp()}));
  await assertSucceeds(updateDoc(path(actor("root"),"support_cases","qa-ticket"),{status:"Resuelto",response:"Revisado",updatedBy:"root",updatedAt:serverTimestamp()}));
});
test("operational backup is private and immutable",async()=>{
  const db=actor("root"),ref=path(db,"tenant_backups","one","snapshots","qa-backup"),part=path(db,"tenant_backups","one","snapshots","qa-backup","parts","finance"),batch=writeBatch(db);
  batch.set(ref,{businessId:"one",name:"Empresa de prueba",reason:"Prueba de respaldo",createdBy:"root",createdAt:serverTimestamp(),domains:["finance"],schemaVersion:1});
  batch.set(part,{businessId:"one",domain:"finance",payload,sourceRevision:1,sourceUpdatedAt:null});
  await assertSucceeds(batch.commit());
  await assertSucceeds(getDoc(part));
  await assertFails(getDoc(path(actor("owner"),"tenant_backups","one","snapshots","qa-backup","parts","finance")));
  await assertFails(updateDoc(part,{payload:{}}));await assertFails(deleteDoc(ref));
});
async function seedClient(uid,id="one"){
  const db=actor(uid);
  await assertSucceeds(setDoc(publicDoc(db,id,"client_accounts",uid),{clientId:"client_"+uid,name:"Cliente "+uid,phone:"123456789",phoneNormalized:"123456789",status:"Activo",createdAt:serverTimestamp(),points:0,visits:0}));
}
function book(uid,reqId,time="10:00",id="one"){
  const db=actor(uid),date="2099-06-15",barberId="staff1",slotId=barberId+"_"+date+"_"+time,b=writeBatch(db);
  b.set(publicDoc(db,id,"booking_slots",slotId),{clientUid:uid,clientId:"client_"+uid,bookingRequestId:reqId,barberId,date,time,status:"Pendiente",createdAt:serverTimestamp()});
  b.set(publicDoc(db,id,"booking_requests",reqId),{name:"Cliente "+uid,phone:"123456789",clientUid:uid,clientId:"client_"+uid,serviceId:"s1",barberId,date,time,note:"",branchId:"branch",status:"Pendiente",slotId,createdAt:serverTimestamp()});
  return b.commit();
}
test("public booking requires a linked slot; two simultaneous clients cannot reserve the same starting time",async()=>{
  await seedClient("clientA");await seedClient("clientB");
  const results=await Promise.allSettled([book("clientA","reqA"),book("clientB","reqB")]);
  if(results.filter(r=>r.status==="fulfilled").length!==1)throw Error("Exactly one request must succeed");
  const winner=results[0].status==="fulfilled"?"clientA":"clientB",loser=winner==="clientA"?"clientB":"clientA",reqId=winner==="clientA"?"reqA":"reqB";
  await assertSucceeds(getDoc(publicDoc(actor(winner),"one","booking_requests",reqId)));
  await assertFails(getDoc(publicDoc(actor(loser),"one","booking_requests",reqId)));
  await assertFails(updateDoc(publicDoc(actor(winner),"one","booking_requests",reqId),{status:"Aprobada"}));
  await assertFails(updateDoc(publicDoc(actor("barber"),"one","booking_requests",reqId),{status:"Aprobada"}));
  await assertFails(deleteDoc(publicDoc(actor("owner"),"one","booking_requests",reqId)));
  await assertFails(book("clientA","badTime","24:00"));
  await assertFails(book("clientA","crossTenant","11:00","two"));
  await assertFails(updateDoc(publicDoc(actor(winner),"one","client_accounts",winner),{points:999}));
});

test("commercial lifecycle: new company, plan, staff, subscription, booking, atomic receipt and cash",async()=>{
  const id="qa-lifecycle",root=actor("root"),owner=actor("qa-owner"),reception=actor("qa-reception");
  const company=path(root,"businesses",id),catalog=path(root,"platform","business_catalog");
  const business={id,name:"SAMBRIX QA",status:"Activo",planId:"qa-plan",nextPayment:"2026-12-15",accessSuspended:false};
  await assertSucceeds(setDoc(company,business));
  await assertSucceeds(setDoc(catalog,{businesses:[business],plans:[{id:"qa-plan",name:"QA",price:25}]}));
  await assertSucceeds(setDoc(member(root,id,"qa-owner"),{uid:"qa-owner",businessId:id,role:"owner",active:true}));
  await assertSucceeds(setDoc(path(root,"platform_users","qa-owner"),{uid:"qa-owner",businessId:id,role:"business_user",active:true}));
  await assertSucceeds(setDoc(member(owner,id,"qa-reception"),{uid:"qa-reception",businessId:id,role:"reception",active:true}));
  await assertSucceeds(setDoc(path(owner,"platform_users","qa-reception"),{uid:"qa-reception",businessId:id,role:"business_user",active:true}));
  const initial={config:{business:{open:"09:00",close:"19:00",currency:"$",pointsPerService:10},meta:{branchId:"branch"},services:[{id:"s1",name:"Corte",duration:60,price:12}],barbers:[{id:"staff1",name:"Profesional"}]},schedule:{appointments:[]},crm:{clients:[]},finance:{cash:[],sales:[]},inventory:{products:[],stockMoves:[]},staff:{employees:[]},attendance:{attendance:[],absences:[]},history:{auditLog:[]}};
  const init=writeBatch(root);
  for(const [name,value] of Object.entries(initial)){
    const record={businessId:id,payload:value,syncRevision:1,updatedByUid:"root",updatedAt:serverTimestamp()};
    if(["finance","inventory"].includes(name)){const e="init-"+name;record.auditId=e;init.set(path(root,"businesses",id,"state_events",e),{businessId:id,domain:name,revision:1,actorUid:"root",createdAt:serverTimestamp()});}
    init.set(state(root,id,name),record);
  }
  await assertSucceeds(init.commit());
  await assertSucceeds(getDoc(state(owner,id,"config")));
  const paymentId="a".repeat(64),nextDue=renewalDate(business.nextPayment,"2026-11-26",2),pay=writeBatch(root),paid={...business,nextPayment:nextDue,commercialManaged:true};
  const receipt=path(root,"commercial_payments",paymentId);
  pay.update(company,{nextPayment:nextDue,commercialManaged:true,commercialUpdatedAt:serverTimestamp()});
  pay.update(catalog,{businesses:[paid],updatedAt:serverTimestamp()});
  pay.set(receipt,{businessId:id,businessName:business.name,planId:"qa-plan",planName:"QA",amountCents:paymentAmount(25,2),currency:"USD",months:2,paidAt:"2026-11-26",previousDue:business.nextPayment,nextDue,method:"Transferencia",reference:"QA-0001",note:"",createdBy:"root",createdAt:serverTimestamp()});
  pay.set(path(root,"commercial_events","qa-payment"),{action:"PAYMENT",businessId:id,actorUid:"root",reason:"Pago de prueba",createdAt:serverTimestamp()});
  await assertSucceeds(pay.commit());
  assert.equal((await getDoc(receipt)).data().amountCents,5000);
  assert.equal((await getDoc(company)).data().nextPayment,"2027-02-15");
  await assertFails(updateDoc(receipt,{amountCents:1}));
  await assertFails(getDoc(path(owner,"commercial_payments",paymentId)));
  await seedClient("qa-client",id);await assertSucceeds(book("qa-client","qa-request","10:00",id));
  const date="2099-06-15",slot="staff1_"+date+"_10:00",appt={id:"public_qa-request",clientId:"client_qa-client",serviceId:"s1",barberId:"staff1",date,time:"10:00",price:12,duration:60,status:"Confirmada",businessId:id,branchId:"branch",publicRequestId:"qa-request"};
  // Exercise approval rules using one atomic batch; checkout calls the actual shared application function.
  const approval=writeBatch(reception);
  approval.update(state(reception,id,"schedule"),{payload:{appointments:[appt]},syncRevision:2,updatedByUid:"qa-reception",updatedAt:serverTimestamp()});
  approval.update(state(reception,id,"crm"),{payload:{clients:[{id:"client_qa-client",firebaseUid:"qa-client",name:"Cliente qa-client",points:0,visits:0,businessId:id}]},syncRevision:2,updatedByUid:"qa-reception",updatedAt:serverTimestamp()});
  approval.update(publicDoc(reception,id,"booking_requests","qa-request"),{status:"Aprobada",appointmentId:appt.id,resolvedAt:new Date().toISOString()});
  approval.update(publicDoc(reception,id,"booking_slots",slot),{status:"Aprobada"});await assertSucceeds(approval.commit());
  const opts={db:reception,sdk:{doc,collection,runTransaction,serverTimestamp},businessId:id,appointmentId:appt.id,actor:"qa-reception",method:"Efectivo",amount:12};
  await assert.rejects(closeAppointment({...opts,amount:1}));
  assert.equal((await getDoc(state(owner,id,"finance"))).data().payload.sales.length,0);
  const closes=await Promise.allSettled([closeAppointment(opts),closeAppointment(opts)]);
  assert.equal(closes.filter(v=>v.status==="fulfilled").length,1,JSON.stringify(closes.map(v=>v.status==="rejected"?String(v.reason):v.status)));
  const f=(await getDoc(state(owner,id,"finance"))).data(),sale=f.payload.sales[0],cash=f.payload.cash[0];
  assert.equal(f.payload.sales.length,1);assert.equal(f.payload.cash.length,1);assert.equal(sale.total,12);assert.equal(cash.amount,12);assert.equal(cash.saleId,sale.id);
  assert.equal(sale.number,"000001");assert.equal((await getDoc(state(owner,id,"schedule"))).data().payload.appointments[0].status,"Finalizada");
  assert.equal((await getDoc(publicDoc(actor("qa-client"),id,"booking_requests","qa-request"))).data().status,"Finalizada");
  assert.equal((await getDoc(publicDoc(owner,id,"booking_slots",slot))).exists(),false);
  assert.equal((await getDoc(state(owner,id,"crm"))).data().payload.clients[0].visits,1);
  await assertSucceeds(getDoc(path(owner,"businesses",id,"state_events",f.auditId)));
});
