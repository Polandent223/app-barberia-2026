import http from "node:http";
import {readFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import assert from "node:assert/strict";
import puppeteer from "puppeteer";
const server=http.createServer(async(req,res)=>{
  const p=new URL(req.url,"http://localhost").pathname;
  if(p==="/fixture"){
    res.writeHead(200,{"content-type":"text/html; charset=utf-8"});
    res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/css/client-public-v2.css"></head><body><div id="adminApp"></div><script>
    const business={name:"Negocio de prueba",status:"Activo",timezone:"America/Caracas",branch:{id:"branch",name:"Sede de prueba"},branding:{brandName:"SAMBRIX QA"},businessHours:{open:"09:00",close:"19:00"},services:[{id:"s",name:"Servicio de prueba",duration:60,price:12}],barbers:[{id:"b",name:"Profesional QA"}],busy:[]};
    let user=null,bookings=[];
    window.testSubmissions=[];
    window.SambrixClientCloud={verifiedAvailability:async()=>business,isReady:()=>true,currentClient:()=>user,login:async()=>{user={name:"Cliente QA",phone:"123456789"};},register:async()=>{},logout:async()=>{user=null;},bookings:()=>bookings,changes:()=>[],createBooking:async data=>{window.testSubmissions.push(data);bookings.push({id:"booking-test",...data,status:"Pendiente"});return {id:"booking-test"};}};
    </script><script type="module" src="/js/saas/client-public-v2.js"></script></body></html>`);
    return;
  }
  if(!/^\/(js|css)\/[a-zA-Z0-9_./-]+$/.test(p)||p.includes("..")){res.writeHead(404);res.end();return;}
  try{res.writeHead(200,{"content-type":p.endsWith(".css")?"text/css":"text/javascript"});res.end(await readFile(fileURLToPath(new URL(".."+p,import.meta.url))));}catch{res.end();}
});
await new Promise(r=>server.listen(0,"127.0.0.1",r));
let browser;
try{
  browser=await puppeteer.launch({headless:true,args:["--no-sandbox","--disable-setuid-sandbox"]});
  const page=await browser.newPage();await page.setViewport({width:360,height:780});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("http://127.0.0.1:"+server.address().port+"/fixture?business=qa&cliente=app");
  const click=async(label)=>{await page.waitForFunction(t=>Array.from(document.querySelectorAll("#sambrixClientV2 button")).some(b=>b.textContent.includes(t)&&!b.disabled),{},label);await page.evaluate(t=>Array.from(document.querySelectorAll("#sambrixClientV2 button")).find(b=>b.textContent.includes(t)&&!b.disabled).click(),label);};
  await click("Reservar ahora");await click("Servicio de prueba");await click("Profesional QA");
  await page.waitForSelector('#sambrixClientV2 input[type="date"]');
  await page.evaluate(()=>{const d=document.querySelector('#sambrixClientV2 input[type="date"]');d.value="2099-06-15";d.dispatchEvent(new Event("change",{bubbles:true}));});
  await click("10:00");await page.waitForSelector('#sambrixClientV2 input[type="tel"]');
  await page.type('#sambrixClientV2 input[type="tel"]',"123456789");await page.type('#sambrixClientV2 input[type="password"]',"12345678");
  await click("Iniciar sesión");await click("Enviar solicitud");
  await page.waitForFunction(()=>document.querySelector("#sambrixClientV2")?.textContent.includes("Pendiente de confirmación"));
  const result=await page.evaluate(()=>({submissions:window.testSubmissions,overflow:document.documentElement.scrollWidth>window.innerWidth,adminHidden:getComputedStyle(document.getElementById("adminApp")).display==="none"}));
  assert.equal(result.submissions.length,1);assert.equal(result.submissions[0].serviceId,"s");assert.equal(result.submissions[0].barberId,"b");assert.equal(result.submissions[0].date,"2099-06-15");assert.equal(result.submissions[0].time,"10:00");assert.equal(result.adminHidden,true);assert.equal(result.overflow,false);assert.deepEqual(errors,[]);
  console.log("CLIENT BROWSER QA: 4 pasos, cuenta simulada, solicitud pendiente y móvil 360px OK.");
}finally{await browser?.close();await new Promise(r=>server.close(r));}
