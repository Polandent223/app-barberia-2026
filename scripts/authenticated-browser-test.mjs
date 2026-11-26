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
