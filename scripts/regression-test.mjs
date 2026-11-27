import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {cents,addMonths,renewalDate,paymentAmount,commercialState} from "../js/saas/commercial-core.js";
import {available,slots,dayValid} from "../js/saas/client-booking-core.js";
import {buildCorrection,correctionSummary,refundTotal} from "../js/saas/financial-corrections-core.js";
import {buildShopSale,buildShopReturn} from "../functions/shop-core.js";
import {buildInventoryOperation} from "../js/saas/inventory-core.js";
import {protectHistory} from "../js/saas/protected-history.js";
import {changedParts,assertUnchanged} from "../js/saas/sync-conflict.js";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("exact monetary arithmetic and leap years",()=>{assert.equal(cents("19.99"),1999);assert.equal(paymentAmount("19.99",3),5997);assert.throws(()=>cents("1.001"));assert.equal(addMonths("2028-01-31",1),"2028-02-29");});
test("renewal does not remove suspension",()=>{assert.equal(renewalDate("2026-12-15","2026-11-25",1),"2027-01-15");assert.equal(commercialState({accessSuspended:true,nextPayment:"2027-01-15"},"2026-11-25"),"Bloqueada");});
const now={date:"2026-11-25",time:"09:00"};
const agenda={businessHours:{open:"09:00",close:"19:00"},services:[{id:"s",duration:60}],barbers:[{id:"b",schedule:[{day:3,active:true,start:"10:00",end:"17:00"}]}],busy:[{barberId:"b",date:now.date,time:"12:00",duration:60,status:"Confirmada"}]};
test("booking rejects past dates, overlap, invalid days and outside shifts",()=>{assert.equal(dayValid("2026-02-30"),false);for(const [d,t] of [["2026-11-24","10:00"],[now.date,"11:30"],[now.date,"09:30"],[now.date,"16:30"],["2026-11-26","10:00"]])assert.equal(available(agenda,"s","b",d,t,now),false);assert(slots(agenda,"s","b",now.date,now).includes("13:00"));});
const previous={cash:[{id:"a",amount:10,type:"Ingreso"}],sales:[{id:"b",total:10}]};
test("financial history cannot be edited, deleted or duplicated",()=>{for(const cash of [[],[{...previous.cash[0],amount:1}],[...previous.cash,previous.cash[0]],[...previous.cash,{id:"c",amount:-1,type:"Ingreso"}]])assert.throws(()=>protectHistory("finance",previous,{cash,sales:previous.sales},"a"));assert.equal(protectHistory("finance",previous,{cash:[...previous.cash,{id:"c",amount:5,type:"Ingreso"}],sales:previous.sales},"a").cash.length,2);});
test("stock movement history remains intact",()=>assert.throws(()=>protectHistory("inventory",{stockMoves:[{id:"m",qty:2}]},{stockMoves:[]},"a")));
test("concurrent changes in the same module conflict",()=>{const base={schedule:{appointments:[]},finance:{cash:[]}},next={...base,schedule:{appointments:[{id:"a"}]}};const entries=changedParts(next,base,base);assert.equal(entries.length,1);assert.throws(()=>assertUnchanged(entries,{schedule:{appointments:[{id:"b"}]}}));assert.doesNotThrow(()=>assertUnchanged(entries,{schedule:base.schedule}));});
test("HTML references existing local assets",()=>{const html=read("index.html");for(const m of html.matchAll(/(?:src|href)="((?:js|css)\/[^"?]+)(?:\?[^"]*)?"/g))assert(existsSync(new URL("../"+m[1],import.meta.url)),m[1]);});
test("cloud bridge imports its exposed commit function",()=>{const main=read("js/saas/saas-cloud-main.js");assert.match(main.split("\n")[0],/waitForTenantCommit/);assert.match(read("js/saas/saas-cloud.js"),/export function waitForTenantCommit/);});
test("single Firestore service and audit collection match",()=>{const rules=read("firestore.rules");assert.equal(rules.split("service cloud.firestore").length,2);assert.equal(rules.split("match /commercial_payments/{paymentId}").length,2);assert.match(rules,/match \/state_events\/\{eventId\}/);assert.match(read("js/saas/saas-cloud.js"),/"state_events"/);});

test("pending drafts are persisted before cloud writes and only removed after confirmation",()=>{const code=read("js/saas/saas-cloud.js");const upload=code.slice(code.indexOf("export function uploadCurrentTenant"));assert(upload.indexOf("persistDraft(job);")<upload.indexOf("await runTransaction"));assert.match(upload,/clearConfirmedDraft\(job\)/);assert.match(code,/fingerprint\(snaps\[i\]\.data\(\)\.payload\)===fingerprint\(p\)/);assert.match(read("js/saas/saas-cloud-main.js"),/overlay\.style\.display="none"/);});

test("correction preserves original sale and limits accumulated refunds",()=>{
 const finance={cash:[{id:"c",type:"Ingreso",amount:12,saleId:"s",currency:"$",method:"Efectivo"}],sales:[{id:"s",total:12}]};
 const opts={finance,businessId:"qa",sourceId:"c",kind:"REFUND",amount:5,reason:"Motivo comprobado",actor:"owner",correctionId:"a",date:"2026-11-26",previousCents:0};
 const first=buildCorrection(opts);assert.equal(first.cumulativeCents,500);assert.equal(finance.cash.length,1);
 finance.cash.push(first.cashEntry);assert.equal(correctionSummary(finance,"c").remaining,700);
 assert.throws(()=>buildCorrection({...opts,correctionId:"b",previousCents:500,amount:8}));
 assert.throws(()=>buildCorrection({...opts,correctionId:"b",previousCents:500,kind:"VOID",amount:1}));
 const second=buildCorrection({...opts,correctionId:"b",previousCents:500,kind:"VOID",amount:7});finance.cash.push(second.cashEntry);
 assert.equal(refundTotal(finance.cash),12);assert.equal(finance.sales[0].total,12);
});

test("stock operation preserves history, rejects overselling and requires zero before archive",()=>{
  let payload={products:[],stockMoves:[],shopOrders:[]};const opts={businessId:"qa",actor:"owner",productId:"p",reason:"Motivo comprobado",date:"2026-11-26"};
  const run=(kind,operationId,extra={})=>{const r=buildInventoryOperation({...opts,payload,kind,operationId,...extra});payload=r.payload;return r;};
  run("CREATE","a",{values:{name:"Producto",category:"Insumo",stock:99,min:1,cost:2,price:4}});assert.equal(payload.products[0].stock,0);
  run("ENTRY","b",{quantity:10});assert.throws(()=>run("EXIT","c",{quantity:11}));assert.throws(()=>run("ARCHIVE","d"));
  run("EXIT","e",{quantity:10});run("ARCHIVE","f");assert.equal(payload.products[0].archived,true);assert.equal(payload.stockMoves.length,2);
  assert.deepEqual(payload.stockMoves.map(m=>[m.stockBefore,m.stockAfter]),[[0,10],[10,0]]);
});

test("POS computes total from catalog and preserves original inventory on rejected sale",()=>{
 const inventory={products:[{id:"a",name:"A",stock:5,price:3.25},{id:"b",name:"B",stock:3,price:2}],stockMoves:[],shopOrders:[]},finance={sales:[],cash:[]};
 const opts={inventory,finance,config:{business:{currency:"$"}},businessId:"qa",actor:"owner",operationId:"sale",method:"Efectivo",date:"2026-11-26",time:"10:00"};
 assert.throws(()=>buildShopSale({...opts,items:[{id:"a",qty:6}]}));assert.throws(()=>buildShopSale({...opts,items:[{id:"a",qty:1,price:1}]}));assert.throws(()=>buildShopSale({...opts,items:[{id:"a",qty:1},{id:"a",qty:1}]}));
 const result=buildShopSale({...opts,items:[{id:"a",qty:2},{id:"b",qty:1}]});assert.equal(result.record.totalCents,850);assert.equal(result.finance.cash[0].amount,8.5);assert.equal(result.inventory.products[0].stock,3);assert.equal(inventory.products[0].stock,5);
});

test("physical return restores original quantities and preserves sale record",()=>{
 const inventory={products:[{id:"a",name:"A",stock:5,price:3.25},{id:"b",name:"B",stock:3,price:2}],stockMoves:[],shopOrders:[]},finance={sales:[],cash:[]};
 const opts={inventory,finance,config:{business:{currency:"$"}},businessId:"qa",actor:"owner",operationId:"sale",method:"Efectivo",date:"2026-11-26",time:"10:00"};
 const sold=buildShopSale({...opts,items:[{id:"a",qty:2},{id:"b",qty:1}]});
 const args={...opts,inventory:sold.inventory,finance:sold.finance,original:sold.record,operationId:"return",correctionId:"correction",reason:"Mercancía recibida y dinero devuelto"};
 const result=buildShopReturn(args);
 assert.equal(result.inventory.products[0].stock,5);assert.equal(result.inventory.products[1].stock,3);
 assert.deepEqual(result.finance.sales,sold.finance.sales);assert.equal(result.record.cash.amount,8.5);
 assert.equal(result.record.cash.type,"Egreso");assert.throws(()=>buildShopReturn({...args,previousCents:100}));
});

test("client identity never claims existing private history by phone alone",async()=>{
 const {inspectAccount,makeClient,verifyLink,projection,activationCode,safePublicIdentity}=await import("../js/saas/client-identity-core.js");
 const uid="qa-uid-123456789",p={clientId:"client_"+uid,name:"Cliente QA",phone:"+58 412 1234567",phoneNormalized:"584121234567",status:"Activo"};
 const manual={id:"manual",name:"Cliente anterior",phone:"+58 4121234567",points:30,visits:3,businessId:"one"};
 const clients=[manual],schedule={appointments:[{id:"old",clientId:"manual",status:"Finalizada",date:"2026-11-20",serviceId:"s"}]},config={services:[{id:"s",name:"Manicura"}]};
 assert.equal(inspectAccount(clients,uid,p).kind,"verify");
 assert.throws(()=>verifyLink(clients,uid,p,"manual","wrong","owner","now"));
 assert.equal(manual.firebaseUid,undefined);
 assert.equal(inspectAccount([],uid,p).kind,"new");
 const fresh=makeClient("one","branch",uid,p);assert.equal(fresh.clientLinkVerified,false);
 assert.equal(inspectAccount([fresh,manual],uid,p).kind,"conflict");
 verifyLink(clients,uid,p,"manual",activationCode(uid),"owner","now");
 assert.equal(manual.id,"manual");assert.equal(manual.points,30);
 assert.equal(projection(manual,uid,schedule,config).serviceHistory[0].service,"Manicura");
 assert.equal(projection({...manual,clientLinkVerified:false},uid,schedule,config).serviceHistory.length,0);
 assert.equal(projection({...manual,clientLinkVerified:false},uid,schedule,config).points,0);
 assert.equal(projection(manual,uid,schedule,config,false).serviceHistory.length,0);
 assert.equal(inspectAccount([],uid,{...p,linkedClientId:"manual"}).kind,"conflict");
 assert.equal(safePublicIdentity("<img src=x>","123456789"),false);
 assert.equal(safePublicIdentity("Camila Pérez","0412-1234567"),true);
});

test("client designer normalizes layouts and respects plan capabilities",async()=>{
 const {designOptions}=await import("../js/saas/client-design.js");
 const input={layout:"gallery",coverFit:"contain",buttonShape:"pill",promotionPosition:"top",showProfessionals:true,bookingLabel:"Reserva tu cita"};
 assert.deepEqual(designOptions(input),input);
 assert.deepEqual(designOptions(input,false),{layout:"classic",coverFit:"cover",buttonShape:"rounded",promotionPosition:"after",showProfessionals:false,bookingLabel:""});
 assert.equal(designOptions({layout:"invalid",bookingLabel:"x".repeat(100)}).bookingLabel.length,40);
 assert.equal(designOptions({layout:"invalid"}).layout,"classic");
});
