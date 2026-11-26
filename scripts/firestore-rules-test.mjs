import {readFileSync} from "node:fs";
import {before,after,test} from "node:test";
import {initializeTestEnvironment,assertSucceeds,assertFails} from "@firebase/rules-unit-testing";
import {doc,collection,getDoc,setDoc,updateDoc,deleteDoc,writeBatch,runTransaction,serverTimestamp} from "firebase/firestore";
import assert from "node:assert/strict";
import {closeAppointment} from "../js/saas/financial-close-core.js";
import {applyInventoryOperation} from "../js/saas/inventory-core.js";
import {checkoutShop} from "../js/saas/shop-core.js";
import {applyCorrection} from "../js/saas/financial-corrections-core.js";
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

test("only owner or admin can refund; cumulative corrections cannot exceed original receipt",async()=>{
  const id="qa-lifecycle",owner=actor("qa-owner"),reception=actor("qa-reception");
  const initial=(await getDoc(state(owner,id,"finance"))).data().payload,original=initial.cash[0];
  const opts={db:owner,sdk:{doc,collection,runTransaction,serverTimestamp},businessId:id,sourceId:original.id,kind:"REFUND",amount:5,reason:"Devolución confirmada",actor:"qa-owner",date:"2026-11-26"};
  await assert.rejects(applyCorrection({...opts,db:reception,actor:"qa-reception"}));
  await assert.rejects(applyCorrection({...opts,amount:13}));
  const first=await applyCorrection(opts);
  assert.equal(first.cumulativeCents,500);
  const races=await Promise.allSettled([applyCorrection({...opts,kind:"VOID",amount:7}),applyCorrection({...opts,kind:"VOID",amount:7})]);
  assert.equal(races.filter(x=>x.status==="fulfilled").length,1,JSON.stringify(races.map(x=>x.status==="rejected"?String(x.reason):x.status)));
  const f=(await getDoc(state(owner,id,"finance"))).data().payload;
  assert.deepEqual(f.sales,initial.sales);assert.deepEqual(f.cash[0],original);assert.equal(f.cash.length,3);
  assert.equal(f.cash.slice(1).reduce((s,x)=>s+x.amount,0),12);
  const total=path(owner,"businesses",id,"correction_totals",original.id);
  assert.equal((await getDoc(total)).data().cents,1200);
  await assertFails(updateDoc(total,{cents:0}));
  const record=path(owner,"businesses",id,"financial_corrections",first.id);
  await assertFails(deleteDoc(record));await assertFails(updateDoc(record,{amountCents:1}));
  const next=writeBatch(reception),finance=state(reception,id,"finance"),audit=path(reception,"businesses",id,"state_events","forged-correction");
  const rev=(await getDoc(finance)).data().syncRevision+1;
  next.update(finance,{payload:{...f,cash:[...f.cash,{...f.cash[1],id:"fake"}]},syncRevision:rev,auditId:"forged-correction",updatedByUid:"qa-reception",updatedAt:serverTimestamp()});
  next.set(audit,{businessId:id,domain:"finance",revision:rev,actorUid:"qa-reception",createdAt:serverTimestamp()});
  await assertFails(next.commit());
});

test("manual cash reversal and server-side validation of new entries",async()=>{
  const id="qa-lifecycle",owner=actor("qa-owner"),ref=state(owner,id,"finance"),snap=await getDoc(ref),finance=snap.data().payload,rev=snap.data().syncRevision+1;
  const expense={id:"manual-expense",type:"Egreso",amount:20,concept:"Gasto registrado",currency:"$",method:"Efectivo",date:"2026-11-26",businessId:id};
  const write=(rows,eventId)=>{
    const b=writeBatch(owner);b.update(ref,{payload:{...finance,cash:[...finance.cash,...rows]},syncRevision:rev,auditId:eventId,updatedByUid:"qa-owner",updatedAt:serverTimestamp()});
    b.set(path(owner,"businesses",id,"state_events",eventId),{businessId:id,domain:"finance",revision:rev,actorUid:"qa-owner",createdAt:serverTimestamp()});return b.commit();
  };
  await assertFails(write([{...expense,amount:-5}],"qa-negative"));
  await assertFails(write([expense,{...expense,id:"manual-duplicate"}],"qa-bulk"));
  await assertSucceeds(write([expense],"qa-manual"));
  const opts={db:owner,sdk:{doc,collection,runTransaction,serverTimestamp},businessId:id,sourceId:expense.id,kind:"CASH_REVERSAL",amount:20,reason:"Gasto registrado por error",actor:"qa-owner",date:"2026-11-26"};
  await assert.rejects(applyCorrection({...opts,amount:1}));
  const result=await applyCorrection(opts);assert.equal(result.cashEntry.type,"Ingreso");assert.equal(result.cashEntry.amount,20);
  const final=(await getDoc(ref)).data().payload;
  assert.deepEqual(final.cash.find(x=>x.id===expense.id),expense);assert.equal(final.cash.find(x=>x.correctionOf===expense.id).amount,20);
});

test("inventory: create at zero, authorized entry, concurrent exits, archive, and reject direct changes",async()=>{
  const id="qa-lifecycle",owner=actor("qa-owner"),reception=actor("qa-reception"),ref=state(owner,id,"inventory");
  const opts={db:owner,sdk:{doc,collection,runTransaction,serverTimestamp},businessId:id,actor:"qa-owner",productId:"qa-product",reason:"Movimiento de prueba",date:"2026-11-26"};
  const values={name:"Producto QA",category:"Insumo",stock:999,min:1,cost:2,price:4};
  await applyInventoryOperation({...opts,kind:"CREATE",values});
  let f=(await getDoc(ref)).data();
  assert.equal(f.payload.products[0].stock,0);
  await assert.rejects(applyInventoryOperation({...opts,db:reception,actor:"qa-reception",kind:"ENTRY",quantity:10}));
  await applyInventoryOperation({...opts,kind:"ENTRY",quantity:10});
  await assert.rejects(applyInventoryOperation({...opts,kind:"ARCHIVE"}));
  await assert.rejects(applyInventoryOperation({...opts,kind:"EXIT",quantity:11}));
  const results=await Promise.allSettled([applyInventoryOperation({...opts,kind:"EXIT",quantity:7}),applyInventoryOperation({...opts,kind:"EXIT",quantity:7})]);
  assert.equal(results.filter(x=>x.status==="fulfilled").length,1,JSON.stringify(results.map(x=>x.status==="rejected"?String(x.reason):x.status)));
  f=(await getDoc(ref)).data();assert.equal(f.payload.products[0].stock,3);
  const forged=writeBatch(owner),rev=f.syncRevision+1;
  forged.update(ref,{payload:{...f.payload,products:[{...f.payload.products[0],stock:100}]},syncRevision:rev,updatedByUid:"qa-owner",updatedAt:serverTimestamp(),auditId:"forged-stock"});
  forged.set(path(owner,"businesses",id,"state_events","forged-stock"),{businessId:id,domain:"inventory",revision:rev,actorUid:"qa-owner",createdAt:serverTimestamp()});
  await assertFails(forged.commit());
  await applyInventoryOperation({...opts,kind:"EDIT",values:{...values,name:"Producto actualizado"}});
  assert.equal((await getDoc(ref)).data().payload.products[0].stock,3);
  await applyInventoryOperation({...opts,kind:"EXIT",quantity:3});
  const archived=await applyInventoryOperation({...opts,kind:"ARCHIVE"});
  f=(await getDoc(ref)).data();assert.equal(f.payload.products[0].archived,true);assert.equal(f.payload.products[0].stock,0);assert.equal(f.payload.stockMoves.length,3);
  assert.deepEqual(f.payload.stockMoves.map(m=>[m.stockBefore,m.stockAfter]),[[0,10],[10,3],[3,0]]);
  await assertFails(deleteDoc(path(owner,"businesses",id,"inventory_operations",archived.id)));
});

test("point of sale: three product lines, correct receipt and cash, stock concurrency, no direct forged checkout",async()=>{
 const id="qa-lifecycle",owner=actor("qa-owner"),reception=actor("qa-reception"),inv=state(owner,id,"inventory"),fin=state(owner,id,"finance");
 const io={db:owner,sdk:{doc,collection,runTransaction,serverTimestamp},businessId:id,actor:"qa-owner",reason:"Productos de prueba",date:"2026-11-26"};
 for(const [productId,price] of [["sale-a",4],["sale-b",3.25],["sale-c",2.5]]){
  await applyInventoryOperation({...io,productId,kind:"CREATE",values:{name:productId,category:"Insumo",min:1,cost:1,price}});
  await applyInventoryOperation({...io,productId,kind:"ENTRY",quantity:10});
 }
 const opts={db:owner,sdk:{doc,collection,runTransaction,serverTimestamp},businessId:id,actor:"qa-owner",method:"Efectivo",date:"2026-11-26",time:"10:30"};
 const items=[{id:"sale-a",qty:2,price:4},{id:"sale-b",qty:1,price:3.25},{id:"sale-c",qty:2,price:2.5}];
 await assert.rejects(checkoutShop({...opts,items:[{id:"sale-a",qty:1,price:1}]}));
 await assert.rejects(checkoutShop({...opts,db:reception,actor:"qa-reception",items}));
 const sale=await checkoutShop({...opts,items});
 assert.equal(sale.total,16.25);
 let f=(await getDoc(fin)).data().payload,i=(await getDoc(inv)).data().payload;
 assert.equal(f.cash.find(x=>x.saleId===sale.id).amount,16.25);
 assert.deepEqual(i.products.filter(x=>x.id.startsWith("sale-")).map(x=>x.stock),[8,9,8]);
 const results=await Promise.allSettled([checkoutShop({...opts,items:[{id:"sale-a",qty:7}]}),checkoutShop({...opts,items:[{id:"sale-a",qty:7}]})]);
 assert.equal(results.filter(x=>x.status==="fulfilled").length,1,JSON.stringify(results.map(x=>x.status==="rejected"?String(x.reason):x.status)));
 i=(await getDoc(inv)).data().payload;assert.equal(i.products.find(x=>x.id==="sale-a").stock,1);
 const op=path(owner,"businesses",id,"shop_operations",sale.shopOperationId);
 await assertFails(deleteDoc(op));await assertFails(updateDoc(op,{totalCents:1}));
 const fs=await getDoc(fin);f=fs.data().payload;const rev=fs.data().syncRevision+1;
 const b=writeBatch(owner);b.update(fin,{payload:{...f,cash:[...f.cash,{id:"forged",type:"Ingreso",amount:1,shopOperationId:"fake"}]},syncRevision:rev,updatedByUid:"qa-owner",updatedAt:serverTimestamp(),auditId:"forged-pos"});
 b.set(path(owner,"businesses",id,"state_events","forged-pos"),{businessId:id,domain:"finance",revision:rev,actorUid:"qa-owner",createdAt:serverTimestamp()});await assertFails(b.commit());
});

test("cashier can collect an existing order once, without authority to change stock directly",async()=>{
 const id="qa-lifecycle",owner=actor("qa-owner"),cashier=actor("qa-shop-cashier");
 await assertSucceeds(setDoc(member(owner,id,"qa-shop-cashier"),{uid:"qa-shop-cashier",businessId:id,role:"cashier",active:true}));
 await assertSucceeds(setDoc(path(owner,"platform_users","qa-shop-cashier"),{uid:"qa-shop-cashier",businessId:id,role:"business_user",active:true}));
 // A legacy order already stored on the server; online ordering is not yet enabled.
 await env.withSecurityRulesDisabled(async ctx=>{
  const ref=state(ctx.firestore(),id,"inventory"),snap=await getDoc(ref);
  await updateDoc(ref,{payload:{...snap.data().payload,shopOrders:[{id:"existing-order",phone:"5551234567",status:"Reservado",saleId:"",total:6.5,currency:"$",items:[{id:"sale-b",name:"sale-b",price:3.25,qty:2}]}]}});
 });
 const opts={db:cashier,sdk:{doc,collection,runTransaction,serverTimestamp},businessId:id,actor:"qa-shop-cashier",method:"Efectivo",date:"2026-11-26",time:"11:00",orderId:"existing-order"};
 await assert.rejects(applyInventoryOperation({...opts,kind:"EXIT",productId:"sale-b",quantity:1,reason:"No autorizado"}));
 const sale=await checkoutShop(opts);assert.equal(sale.total,6.5);
 await assert.rejects(checkoutShop(opts));
 const i=(await getDoc(state(owner,id,"inventory"))).data().payload;
 assert.equal(i.shopOrders[0].status,"Pagado/Entregado");assert.equal(i.shopOrders[0].saleId,sale.id);assert.equal(i.products.find(x=>x.id==="sale-b").stock,7);
});
