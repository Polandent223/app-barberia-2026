import test from "node:test";
import assert from "node:assert/strict";
import puppeteer from "puppeteer";
import {createQaServer} from "./qa-browser-server.mjs";
import {seedQa,BUSINESS,SECOND,PHONE,PIN} from "./qa-browser-seed.mjs";
const qa=await createQaServer(),seed=await seedQa();
const browser=await puppeteer.launch({headless:true,args:["--no-sandbox","--disable-setuid-sandbox"]});
const external=[],failures=[];
async function openPage(width=1366,height=900){
 const context=await browser.createBrowserContext(),page=await context.newPage();
 await page.setViewport({width,height});await page.setRequestInterception(true);
 page.on("request",req=>{const url=req.url();if(/^(data:|blob:|about:)/.test(url)||/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(url))void req.continue();else{external.push(url);void req.abort();}});
 page.on("pageerror",e=>failures.push(e.message));
 page.on("console",m=>{if(m.type()==="error")console.log("QA browser console:",m.text().slice(0,700));});
 return {page,context};
}
async function ready(page,path="/"){
 await page.goto(qa.url+path,{waitUntil:"domcontentloaded",timeout:60000});
 await page.waitForFunction(()=>window.FirebaseBridge&&window.SaaSAuthAdmin&&window.SaaSCloudProduction&&window.App,{timeout:60000});
}
async function clickText(page,selector,label){
 await page.waitForFunction((s,t)=>Array.from(document.querySelectorAll(s)).some(b=>b.getBoundingClientRect().width>0&&b.getBoundingClientRect().height>0&&!b.disabled&&b.textContent.includes(t)),{timeout:20000},selector,label);
 await page.evaluate((s,t)=>Array.from(document.querySelectorAll(s)).find(b=>b.getBoundingClientRect().width>0&&b.getBoundingClientRect().height>0&&!b.disabled&&b.textContent.includes(t)).click(),selector,label);
}
async function login(page,role){
 await ready(page);const u=seed.users[role];
 await page.waitForSelector('[data-portal-role="'+(role==="superadmin"?"superadmin":"business")+'"]',{visible:true});
 await page.click('[data-portal-role="'+(role==="superadmin"?"superadmin":"business")+'"]');
 await page.waitForSelector("#loginUser",{visible:true});await page.type("#loginUser",u.email);await page.type("#loginPin",u.password);await page.click("#loginBtn");
}
async function state(page,role,id){
 await page.waitForFunction((r,b)=>window.SaaS?.session?.role===r&&window.SaaS.session.businessId===b&&!document.getElementById("adminApp").classList.contains("hidden")&&(r==="superadmin"||window.SaaSCloudProduction?.isTenantReady(b)&&window.App?.db?.meta?.businessId===b),{timeout:45000},role,id);
 return page.evaluate(()=>({role:SaaS.session.role,uid:FirebaseBridge.user?.uid,business:SaaS.session.businessId,clients:App.db?.clients?.map(x=>x.name)||[],active:document.querySelector("#adminApp .page.active")?.id,root:document.documentElement.scrollWidth,viewport:innerWidth}));
}
test("authenticated SuperAdmin can access modular administration",{timeout:90000},async()=>{
 const {page,context}=await openPage();
 try{await login(page,"superadmin");const s=await state(page,"superadmin","");assert.equal(s.uid,seed.users.superadmin.uid);
 await page.waitForSelector("#sambrixWorkspace",{visible:true});await page.waitForFunction(()=>SaaS.db.businesses.some(b=>b.id==="qa-studio")&&SaaS.db.businesses.some(b=>b.id==="qa-other"),{timeout:30000});
 assert.equal(await page.evaluate(()=>SaaS.pageAllowed("superadmin")),true);
 console.log("QA UI SUPERADMIN: login autenticado, directorio modular y catálogo de empresas.");
 }finally{await context.close();}
});

test("SuperAdmin modular navigation, search and responsive directory",{timeout:180000},async()=>{
 const {page,context}=await openPage();
 const areas=[
  ["Empresas y usuarios","companies","Directorio comercial","saasCRM"],
  ["Planes y suscripciones","plans","Planes y mensualidades","saasPlans"],
  ["Finanzas","finance","Cobros, suscripciones y comprobantes","billingOperationsCenter"],
  ["Soporte y avisos","support","Tickets y soporte empresarial","supportCenter"],
  ["Estadísticas","analytics","Métricas SaaS","saasMetricsCenter"],
  ["Seguridad y auditoría","security","Auditoría","saasAudit"],
  ["Respaldos","backup","Copias de seguridad","backupCenter"],
  ["Configuración","settings","Configuración general","platformSettings"],
  ["Herramientas avanzadas","technical","Salud del sistema","systemHealth"]
 ];
 try{
  await login(page,"superadmin");await state(page,"superadmin","");
  await page.waitForSelector("#sambrixWorkspace",{visible:true});
  for(const width of [1366,768,390]){
   await page.setViewport({width,height:900});
   await page.waitForFunction(()=>document.querySelectorAll("#sambrixWorkspace .workspace-card").length===9);
   const layout=await page.evaluate(()=>{const grid=document.querySelector("#sambrixWorkspace .workspace-grid");const r=grid.getBoundingClientRect();return {columns:getComputedStyle(grid).gridTemplateColumns.split(" ").length,left:r.left,right:r.right,viewport:innerWidth};});
   assert.equal(layout.columns,width>850?3:width>470?2:1);
   assert.ok(layout.left>=-1&&layout.right<=layout.viewport+1,JSON.stringify(layout));
  }
  await page.setViewport({width:1366,height:900});
  await page.type("#sambrixWorkspace input","estadisticas");
  assert.deepEqual(await page.$eval("#sambrixWorkspace .workspace-card:not([hidden]) strong",els=>els.map(e=>e.textContent)),["Estadísticas"]);
  await page.evaluate(()=>{const el=document.querySelector("#sambrixWorkspace input");el.value="";el.dispatchEvent(new Event("input",{bubbles:true}));});
  for(const [area,view,label,id] of areas){
   await clickText(page,"#sambrixWorkspace .workspace-card",area);
   await page.waitForFunction(v=>document.getElementById("superadmin").dataset.moduleView===v,{},view);
   await clickText(page,"#sambrixWorkspace .workspace-card",label);
   await page.waitForFunction(p=>document.querySelector("#adminApp .page.active")?.id===p,{timeout:15000},id);
   await page.waitForSelector("#sambrixModuleBar [data-return-area]",{visible:true});
   await page.click("#sambrixModuleBar [data-return-area]");
   await page.waitForFunction(v=>document.querySelector("#adminApp .page.active")?.id==="superadmin"&&document.getElementById("superadmin").dataset.moduleView===v,{},view);
   await page.click("#sambrixModuleBar [data-return-home]");
   await page.waitForFunction(()=>document.getElementById("superadmin").dataset.moduleView==="home");
  }
  console.log("QA UI SUPERADMIN: 9 areas, module navigation, search and responsive directory at three widths.");
 }finally{await context.close();}
});

for(const role of ["owner","admin","manager","reception","cashier","barber","other"]){
 test("authenticated "+role+" sees only its business and allowed tools",{timeout:90000},async()=>{
 const {page,context}=await openPage(role==="cashier"?390:1366,role==="cashier"?844:900);
 try{
  await login(page,role);const id=role==="other"?SECOND:BUSINESS,expected=role==="other"?"owner":role,s=await state(page,expected,id);
  assert.equal(s.uid,seed.users[role].uid);assert.deepEqual(s.clients,[role==="other"?"Cliente exclusivo otra empresa":"Cliente de prueba"]);
  await page.waitForSelector("#businessWorkspace",{visible:true});
  const expectedCash=["owner","admin","manager","reception","cashier","other"].includes(role);
  assert.equal(await page.evaluate(()=>SaaS.pageAllowed("caja")),expectedCash);
  assert.equal(await page.evaluate(()=>SaaS.pageAllowed("superadmin")),false);
  await page.evaluate(()=>App.go("superadmin"));assert.notEqual(await page.evaluate(()=>document.querySelector("#adminApp .page.active")?.id),"superadmin");
  if(role==="barber"){await page.evaluate(()=>App.go("caja"));assert.notEqual(await page.evaluate(()=>document.querySelector("#adminApp .page.active")?.id),"caja");}
  if(role==="cashier"){
    await clickText(page,"#businessWorkspace button","Caja y ventas");await clickText(page,"#businessWorkspace button","Caja");
    await page.waitForFunction(()=>document.querySelector("#caja")?.classList.contains("active"),{timeout:15000});
    await page.waitForFunction(()=>Array.from(document.querySelectorAll("#caja button")).some(b=>b.textContent==="Nueva venta de productos"&&b.getBoundingClientRect().width>0&&!b.disabled),{timeout:40000});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await clickText(page,"#caja button","Nueva venta de productos");
    await page.waitForSelector("#sambrixShopDialog select",{visible:true,timeout:30000});
    await page.select("#sambrixShopDialog select","product1");
    await clickText(page,"#sambrixShopDialog button","Agregar");
    const onConfirm=dialog=>dialog.type()==="confirm"?dialog.accept():dialog.dismiss();
    page.on("dialog",onConfirm);
    try{await clickText(page,"#sambrixShopDialog button","Confirmar cobro recibido");await page.waitForFunction(()=>!document.getElementById("sambrixShopDialog").open&&App.db.sales.some(s=>s.shopOperationId&&s.total===8),{timeout:45000});}
    finally{page.off("dialog",onConfirm);}
    const [finance,inventory]=await Promise.all(["finance","inventory"].map(n=>seed.db.doc("businesses/"+BUSINESS+"/state/"+n).get()));
    const sale=finance.data().payload.sales[0];assert.equal(sale.total,8);assert.equal(sale.createdBy,seed.users.cashier.uid);assert.equal(finance.data().payload.cash[0].saleId,sale.id);assert.equal(inventory.data().payload.products[0].stock,9);
    console.log("QA UI POS: venta desde caja móvil, comprobante, caja e inventario de servidor verificados.");
  }
  await page.evaluate(()=>SaaS.signOutToPortal());
  await page.waitForFunction(()=>SaaS.session.role==="guest"&&document.getElementById("adminApp").classList.contains("hidden"),{timeout:15000});
  console.log("QA UI "+role+": identidad, datos de empresa, permisos y cierre de sesión.");
 }finally{await context.close();}
 });
}

test("support ticket travels from company to SuperAdmin and back with audit",{timeout:180000},async()=>{
 const subject="QA soporte de acceso",response="QA respuesta verificada";
 let ticketId;
 const staff=await openPage();
 try{
  await login(staff.page,"owner");await state(staff.page,"owner",BUSINESS);
  await staff.page.evaluate(()=>SaaS.openSupportTicket());
  const dialog="dialog.cloud-support-dialog[open]";
  await staff.page.waitForSelector(dialog+" textarea",{visible:true});
  await staff.page.type(dialog+" input",subject);
  await staff.page.type(dialog+" textarea","Solicitud ficticia para verificar el circuito de soporte.");
  await clickText(staff.page,dialog+" button","Enviar a SAMBRIX");
  await staff.page.waitForFunction(s=>Array.from(document.querySelectorAll("dialog[open] .cloud-ticket strong")).some(e=>e.textContent===s),{timeout:30000},subject);
  const records=await seed.db.collection("support_cases").where("businessId","==",BUSINESS).get();
  const ticket=records.docs.find(d=>d.data().subject===subject);
  assert.ok(ticket);ticketId=ticket.id;assert.equal(ticket.data().createdBy,seed.users.owner.uid);assert.equal(ticket.data().status,"Abierto");
 }finally{await staff.context.close();}
 const superuser=await openPage();
 try{
  await login(superuser.page,"superadmin");await state(superuser.page,"superadmin","");
  await superuser.page.evaluate(()=>App.go("supportCenter"));
  await superuser.page.waitForFunction(s=>Array.from(document.querySelectorAll("#cloudSupportCases .cloud-ticket strong")).some(e=>e.textContent===s),{timeout:30000},subject);
  await clickText(superuser.page,"#cloudSupportCases button","Atender / responder");
  const dialog="dialog.cloud-support-dialog[open]";
  await superuser.page.waitForSelector(dialog+" textarea",{visible:true});
  await superuser.page.select(dialog+" select","Resuelto");
  await superuser.page.type(dialog+" textarea",response);
  await clickText(superuser.page,dialog+" button","Guardar respuesta");
  await superuser.page.waitForFunction(()=>!document.querySelector("dialog.cloud-support-dialog[open]"),{timeout:30000});
  const ticket=(await seed.db.collection("support_cases").doc(ticketId).get()).data();
  assert.equal(ticket.status,"Resuelto");assert.equal(ticket.response,response);assert.equal(ticket.updatedBy,seed.users.superadmin.uid);
  const events=await seed.db.collection("support_access_events").where("businessId","==",BUSINESS).get();
  assert.ok(events.docs.some(d=>d.data().caseId===ticketId&&d.data().action==="CASE_UPDATE"&&d.data().actorUid===seed.users.superadmin.uid));
 }finally{await superuser.context.close();}
 const again=await openPage(390,844);
 try{
  await login(again.page,"owner");await state(again.page,"owner",BUSINESS);
  await again.page.evaluate(()=>SaaS.openSupportTicket());
  await again.page.waitForFunction(r=>Array.from(document.querySelectorAll("dialog[open] .cloud-reply")).some(e=>e.textContent.includes(r)),{timeout:30000},response);
 }finally{await again.context.close();}
});

test("suspended business cannot enter authenticated workspace",{timeout:90000},async()=>{
 const {page,context}=await openPage();
 try{await login(page,"suspended");await page.waitForFunction(()=>!document.getElementById("loginBtn").disabled&&SaaS.session.role==="guest",{timeout:45000});assert.equal(await page.evaluate(()=>document.getElementById("adminApp").classList.contains("hidden")),true);console.log("QA UI: empresa suspendida bloqueada.");}finally{await context.close();}
});
test("public client books using real Auth on mobile",{timeout:90000},async()=>{
 const {page,context}=await openPage(360,780);
 try{
  await ready(page,"/?business="+BUSINESS+"&cliente=app");
  await clickText(page,"#sambrixClientV2 button","Reservar ahora");await clickText(page,"#sambrixClientV2 button","Corte QA");await clickText(page,"#sambrixClientV2 button","Profesional QA");
  await page.waitForSelector('#sambrixClientV2 input[type="date"]');
  await page.evaluate(()=>{const d=document.querySelector('#sambrixClientV2 input[type="date"]');d.value="2099-06-15";d.dispatchEvent(new Event("change",{bubbles:true}));});
  await clickText(page,"#sambrixClientV2 button","10:00");await page.waitForSelector('#sambrixClientV2 input[type="tel"]');
  await page.type('#sambrixClientV2 input[type="tel"]',PHONE);await page.type('#sambrixClientV2 input[type="password"]',PIN);
  await clickText(page,"#sambrixClientV2 button","Iniciar sesión");await clickText(page,"#sambrixClientV2 button","Enviar solicitud");
  await page.waitForFunction(()=>document.querySelector("#sambrixClientV2")?.textContent.includes("Pendiente de confirmación"),{timeout:30000});
  const snap=await seed.db.collection("public_businesses").doc(BUSINESS).collection("booking_requests").get();assert.equal(snap.size,1);assert.equal(snap.docs[0].data().clientUid,seed.users.client.uid);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&getComputedStyle(document.getElementById("adminApp")).display==="none"),true);
  console.log("QA UI CLIENT: reserva móvil real en Firestore aislado.");
 }finally{await context.close();}
});
test.after(async()=>{await browser.close();await qa.close();await seed.close();assert.deepEqual(external,[],"No se permite conexión fuera de loopback");assert.deepEqual(failures,[],"Errores JS de la interfaz");});
