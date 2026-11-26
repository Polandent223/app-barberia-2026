/* SAMBRIX 2: authoritative commercial ledger and verified subscription changes. */
import {auth,firestore,onAuthStateChanged} from "../firebase/firebase-core.js";
import {doc,collection,getDocFromServer,getDocsFromServer,query,where,runTransaction,serverTimestamp} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import {cents,validDay,todayLocal,renewalDate,paymentAmount,commercialState} from "./commercial-core.js?v=2.0.5";
const admin=()=>!!auth.currentUser&&window.SaaS?.session?.role==="superadmin";
const uid=()=>auth.currentUser?.uid||"";
const catalog=()=>doc(firestore,"platform","business_catalog");
const companyRef=id=>doc(firestore,"businesses",id);
const METHODS=["Transferencia","Pago móvil","Zelle","USDT","Efectivo","Otro"];
const $=id=>document.getElementById(id);
const el=(tag,text="",cls="")=>{const x=document.createElement(tag);x.textContent=text;if(cls)x.className=cls;return x;};
const button=(label,fn,cls="secondary")=>{const x=el("button",label,"btn "+cls);x.type="button";x.addEventListener("click",fn);return x;};
const input=(type,value="",max=120)=>{const x=el("input");x.type=type;x.value=value;x.maxLength=max;return x;};
const select=(values,value="")=>{const x=el("select");for(const [v,label] of values)x.append(new Option(label,v));x.value=value||values[0]?.[0]||"";return x;};
const field=(label,x)=>{const n=el("label","","cloud-field");n.append(el("span",label),x);return n;};
const money=c=>new Intl.NumberFormat("es",{style:"currency",currency:"USD"}).format(c/100);
const toast=s=>window.App?.toast?.(s);
let root,planRoot,dialog,body,rows=[],plans=[],selected="",version=0,loading=false,actionBusy=false,filter,search,status,table,plansList,ledger;
const commercialPages=new Set(["billingOperationsCenter","saasSubscriptions","billingCenter","renewalAlertsCenter","invoicesCenter","accountStatementsCenter","discountsCenter"]);
const normalize=s=>String(s||"").normalize("NFKC").trim().toUpperCase().replace(/\s+/g," ");
function scoped(actor,g){return admin()&&uid()===actor&&version===g;}
function assertSession(actor){if(!admin()||uid()!==actor)throw Error("La sesión cambió. Vuelve a entrar.");}
function announce(s,bad=false){status.textContent=s;status.classList.toggle("error",bad);}
function validCatalog(s){if(!s.exists())throw Error("El catálogo comercial todavía no está inicializado.");const d=s.data();if(!Array.isArray(d.plans)||!Array.isArray(d.businesses))throw Error("Catálogo comercial inválido.");return d;}
function mergedBusiness(d,actual,id){
  const listed=d.businesses.find(b=>b.id===id);
  if(!listed||!actual.exists())throw Error("La empresa no está verificada en Firebase.");
  const data=actual.data();
  if(data.id&&data.id!==id)throw Error("Identidad de empresa inválida.");
  // Older company documents omitted nextPayment; catalog is only a fallback before the first managed change.
  return {...listed,...data,id,planId:data.commercialManaged===true?data.planId:(data.planId||listed.planId),nextPayment:data.commercialManaged===true?(data.nextPayment||""):(data.nextPayment||listed.nextPayment||"")};
}
function patchCatalog(d,id,patch){return d.businesses.map(b=>b.id===id?{...b,...patch}:b);}
function auditRecord(action,id,actor,reason){return {action,businessId:id,actorUid:actor,reason,createdAt:serverTimestamp()};}
async function hash(text){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text));return Array.from(new Uint8Array(d),b=>b.toString(16).padStart(2,"0")).join("");}
async function run(btn,fn){if(actionBusy||!admin())return;actionBusy=true;if(btn)btn.disabled=true;try{await fn();}catch(e){console.warn("[SAMBRIX commercial]",e);toast(e?.code==="permission-denied"?"Firebase no autorizó el cambio. Revisa las reglas.":String(e.message||"No se pudo completar."));}finally{actionBusy=false;if(btn)btn.disabled=false;}}
function showDialog(title){body.replaceChildren(el("h2",title),button("Cerrar",()=>dialog.close()));if(!dialog.open)dialog.showModal();}
function currentPlan(id){return plans.find(p=>p.id===id);}
function render(){
  if(!admin()||!table)return;table.replaceChildren();
  const q=normalize(search.value),today=todayLocal();
  const shown=rows.filter(b=>(!q||normalize([b.name,b.owner,b.ownerEmail,b.id].join(" ")).includes(q))&&(!filter.value||commercialState(b,today)===filter.value));
  const cards=$("commercialCounts");cards.replaceChildren();
  for(const [label,count] of [["Al día",rows.filter(b=>commercialState(b,today)==="Al día").length],["Por vencer",rows.filter(b=>commercialState(b,today)==="Por vencer").length],["Vencidas",rows.filter(b=>commercialState(b,today)==="Vencida").length],["Bloqueadas",rows.filter(b=>commercialState(b,today)==="Bloqueada").length]]){const box=el("div","","cloud-value");box.append(el("span",label),el("strong",String(count)));cards.append(box);}
  for(const b of shown){const card=el("article","","cloud-ticket"),h=el("div","","cloud-ticket-head");h.append(el("strong",b.name||b.id),el("span",commercialState(b,today),"cloud-status"));const p=currentPlan(b.planId);card.append(h,el("p",(p?.name||"Sin plan")+" · "+(p?money(cents(p.price))+"/mes":"Precio pendiente")+" · Vence: "+(b.nextPayment||"Sin fecha")));
    const a=el("div","","cloud-actions");a.append(button("Registrar cobro",()=>paymentForm(b.id),"primary"),button("Cambiar plan",()=>planForm(b.id)),button("Historial / comprobantes",()=>history(b.id)));card.append(a);table.append(card);}
  if(!shown.length)table.append(el("p","Sin empresas para este filtro."));
  plansList.replaceChildren();
  for(const p of plans){const row=el("div","","cloud-company-row"),copy=el("div");copy.append(el("strong",p.name||p.id),el("small",money(cents(p.price))+"/mes · "+(p.active===false?"Inactivo":"Disponible")));row.append(copy,button("Editar mensualidad",()=>priceForm(p.id)));plansList.append(row);}
}
async function refresh(){
  if(!admin()||loading)return;loading=true;const actor=uid(),g=++version;rows=[];plans=[];table.replaceChildren();plansList.replaceChildren();$("commercialCounts").replaceChildren();announce("Consultando catálogo y empresas en Firebase…");
  try{
    const d=validCatalog(await getDocFromServer(catalog()));
    const result=await Promise.allSettled(d.businesses.filter(b=>b.id&&b.id!==window.SaaS?.portal?._demoBusinessId).map(async b=>mergedBusiness(d,await getDocFromServer(companyRef(b.id)),b.id)));
    if(!scoped(actor,g))return;
    plans=d.plans;rows=result.filter(r=>r.status==="fulfilled").map(r=>r.value);render();
    const failures=result.filter(r=>r.status==="rejected").length;announce(failures?failures+" empresas sin verificar. No se permite cobrarles hasta corregir su registro.":"Datos comerciales verificados en Firebase.");
  }catch(e){if(scoped(actor,g))announce(String(e.message||"No se pudo consultar Firebase."),true);}finally{loading=false;}
}
async function paymentForm(id){
  if(!admin())return;const b=rows.find(x=>x.id===id),p=currentPlan(b?.planId);if(!b||!p){toast("Primero verifica empresa y plan.");return;}if(cents(p.price)<=0){toast("Este plan no tiene una mensualidad cobrable.");return;}
  const actor=uid();showDialog("Registrar mensualidad · "+b.name);
  const months=select(Array.from({length:12},(_,i)=>[String(i+1),String(i+1)+" mes(es)"]),"1"),paid=input("date",todayLocal()),method=select(METHODS.map(x=>[x,x])),ref=input("text","",120),note=input("text","",500),amount=el("strong"),due=el("p");
  ref.placeholder="Referencia única o número de recibo";
  const preview=()=>{try{amount.textContent=money(paymentAmount(p.price,Number(months.value)));due.textContent="Nuevo vencimiento estimado: "+renewalDate(b.nextPayment,todayLocal(),Number(months.value));}catch(e){due.textContent=e.message;}};
  months.addEventListener("change",preview);preview();body.append(field("Período pagado",months),field("Fecha real del pago",paid),field("Método",method),field("Referencia",ref),field("Observación",note),amount,due,el("p","Registra únicamente pagos que ya comprobaste. No realiza un cargo bancario."));
  const save=button("Confirmar pago recibido",()=>run(save,async()=>{
    assertSession(actor);const today=todayLocal(),period=Number(months.value),paymentDate=paid.value,methodValue=method.value,reference=normalize(ref.value),notes=note.value.trim();
    if(!validDay(paymentDate)||paymentDate>today||reference.length<3||reference.length>120||!METHODS.includes(methodValue)||notes.length>500)throw Error("Revisa fecha, método y referencia.");
    const expected=paymentAmount(p.price,period);
    if(!confirm("¿Confirmar recepción de "+money(expected)+" para "+b.name+"?"))return;
    const paymentId=await hash(methodValue+"\n"+reference),receipt=doc(firestore,"commercial_payments",paymentId),event=doc(collection(firestore,"commercial_events"));
    let result;
    await runTransaction(firestore,async tx=>{
      assertSession(actor);const [cs,bs,prior]=await Promise.all([tx.get(catalog()),tx.get(companyRef(id)),tx.get(receipt)]);const data=validCatalog(cs),current=mergedBusiness(data,bs,id);
      if(prior.exists()){const v=prior.data();if(v.businessId===id&&v.amountCents===expected&&v.months===period&&v.method===methodValue&&v.reference===reference&&v.paidAt===paymentDate){result={existing:true,next:v.nextDue};return;}throw Error("Esta referencia ya fue registrada. Revisa el historial.");}
      if(current.planId!==p.id||current.nextPayment!==b.nextPayment)throw Error("El plan o vencimiento cambió. Actualiza y vuelve a revisar.");
      const active=data.plans.find(x=>x.id===current.planId);if(!active||paymentAmount(active.price,period)!==expected)throw Error("La mensualidad cambió. Actualiza antes de cobrar.");
      const next=renewalDate(current.nextPayment,today,period),patch={planId:current.planId,nextPayment:next,commercialManaged:true};
      if(!current.accessSuspended&&/^(prueba|vencido)$/i.test(current.status||""))patch.status="Activo";
      tx.update(companyRef(id),{...patch,commercialUpdatedAt:serverTimestamp()});
      tx.update(catalog(),{businesses:patchCatalog(data,id,patch),updatedAt:serverTimestamp()});
      tx.set(receipt,{businessId:id,businessName:String(current.name||id).slice(0,180),planId:p.id,planName:String(active.name||p.id).slice(0,180),amountCents:expected,currency:"USD",months:period,paidAt:paymentDate,previousDue:current.nextPayment||"",nextDue:next,method:methodValue,reference,note:notes,createdBy:actor,createdAt:serverTimestamp()});
      tx.set(event,auditRecord("PAYMENT",id,actor,"Pago "+paymentId));result={existing:false,next};
    });
    if(uid()!==actor)return;dialog.close();toast(result.existing?"Ese pago ya estaba registrado. No se duplicó.":"Pago registrado. Vence: "+result.next);await refresh();
  }),"primary");body.append(save);
}
function planForm(id){
  const b=rows.find(x=>x.id===id);if(!admin()||!b)return;const actor=uid();showDialog("Cambiar plan · "+b.name);
  const p=select(plans.filter(x=>x.active!==false).map(x=>[x.id,(x.name||x.id)+" · "+money(cents(x.price))+"/mes"]),b.planId);
  const reason=input("text","",500);body.append(field("Nuevo plan",p),field("Motivo",reason),el("p","No genera cobros, no modifica la fecha de vencimiento ni retira bloqueos administrativos."));
  const save=button("Guardar plan",()=>run(save,async()=>{
    assertSession(actor);const why=reason.value.trim(),target=p.value;if(why.length<3||target===b.planId)throw Error("Selecciona otro plan y escribe un motivo.");
    if(!confirm("¿Cambiar el plan de "+b.name+"?"))return;
    const event=doc(collection(firestore,"commercial_events"));
    await runTransaction(firestore,async tx=>{
      assertSession(actor);const [cs,bs]=await Promise.all([tx.get(catalog()),tx.get(companyRef(id))]),data=validCatalog(cs),current=mergedBusiness(data,bs,id);
      if(current.planId!==b.planId||current.nextPayment!==b.nextPayment)throw Error("La cuenta cambió. Actualiza primero.");
      if(!data.plans.some(x=>x.id===target&&x.active!==false))throw Error("Plan no disponible.");
      const patch={planId:target,nextPayment:current.nextPayment||"",commercialManaged:true};
      tx.update(companyRef(id),{...patch,commercialUpdatedAt:serverTimestamp()});tx.update(catalog(),{businesses:patchCatalog(data,id,patch),updatedAt:serverTimestamp()});
      tx.set(event,auditRecord("PLAN_CHANGE",id,actor,b.planId+" → "+target+" · "+why));
    });
    if(uid()===actor){dialog.close();toast("Plan actualizado en Firebase.");await refresh();}
  }),"primary");body.append(save);
}
function priceForm(id){
  const p=currentPlan(id);if(!admin()||!p)return;const actor=uid();showDialog("Mensualidad · "+p.name);
  const price=input("text",String(p.price)),reason=input("text","",400);body.append(field("Precio mensual USD",price),field("Motivo",reason),el("p","El nuevo precio se aplica a cobros futuros. No modifica pagos registrados ni los módulos incluidos."));
  const save=button("Guardar precio",()=>run(save,async()=>{
    assertSession(actor);const value=cents(price.value),why=reason.value.trim();if(why.length<3)throw Error("Escribe un motivo.");if(!confirm("¿Cambiar mensualidad a "+money(value)+"?"))return;
    const event=doc(collection(firestore,"commercial_events"));
    await runTransaction(firestore,async tx=>{assertSession(actor);const data=validCatalog(await tx.get(catalog())),current=data.plans.find(x=>x.id===id);
      if(!current||cents(current.price)!==cents(p.price))throw Error("El plan cambió. Actualiza primero.");
      tx.update(catalog(),{plans:data.plans.map(x=>x.id===id?{...x,price:value/100}:x),commercialPlansManaged:true,updatedAt:serverTimestamp()});
      tx.set(event,auditRecord("PRICE_CHANGE","",actor,id+" · "+money(value)+" · "+why));});
    if(uid()===actor){dialog.close();toast("Mensualidad actualizada.");await refresh();}
  }),"primary");body.append(save);
}
async function history(id){
  if(!admin())return;const actor=uid(),b=rows.find(x=>x.id===id);if(!b)return;showDialog("Historial · "+b.name);
  const target=el("div","Consultando pagos…");body.append(target);
  try{const data=await getDocsFromServer(query(collection(firestore,"commercial_payments"),where("businessId","==",id)));if(uid()!==actor||!admin()||!target.isConnected)return;
    const entries=data.docs.map(s=>({id:s.id,...s.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));target.replaceChildren();
    for(const p of entries){const row=el("article","","cloud-ticket");row.append(el("strong",money(p.amountCents)),el("p",p.paidAt+" · "+p.method+" · "+p.reference),el("small","Período: "+p.months+" mes(es) · Vencimiento: "+p.nextDue),button("Ver comprobante interno",()=>receiptView(p)));target.append(row);}
    if(!entries.length)target.append(el("p","No hay pagos nuevos registrados en el libro central. Los registros anteriores requieren conciliación."));
  }catch(e){if(target.isConnected)target.textContent="No fue posible consultar el historial.";}
}
function receiptView(p){
  if(!admin())return;showDialog("Comprobante interno de pago");
  for(const line of ["SAMBRIX · "+p.businessName,"Identificador: "+p.id,"Plan: "+p.planName,"Monto: "+money(p.amountCents),"Fecha: "+p.paidAt,"Método: "+p.method,"Referencia: "+p.reference,"Vencimiento: "+p.nextDue,"Comprobante administrativo. No constituye factura fiscal."])body.append(el("p",line));
}
function open(id="",action=""){
  if(!admin())return;window.App?.go?.("billingOperationsCenter");if(!id)return;
  if(rows.some(b=>b.id===id)){if(action==="plan")planForm(id);else paymentForm(id);}else toast("Actualiza y selecciona la empresa verificada.");
}
function boot(){
  const page=$("billingOperationsCenter"),planPage=$("saasPlans");if(root||!page||!planPage)return;
  root=el("div","","cloud-support");root.id="commercialRoot";root.append(el("h2","Cobros y suscripciones"),el("p","Registro central de mensualidades. Los pagos antiguos del navegador no se migran ni se contabilizan automáticamente."));
  const controls=el("div","","cloud-actions");controls.append(button("Actualizar",refresh),button("Planes y mensualidades",()=>window.App?.go?.("saasPlans")));root.append(controls);
  status=el("p","Pendiente de consultar Firebase.","cloud-message");status.setAttribute("role","status");const counts=el("div","","cloud-values");counts.id="commercialCounts";
  search=input("search");search.placeholder="Buscar empresa";search.addEventListener("input",render);
  filter=select([["","Todos"],...["Al día","Por vencer","Vencida","Bloqueada","Prueba","Fecha pendiente"].map(x=>[x,x])]);filter.addEventListener("change",render);
  table=el("div");root.append(status,counts,search,filter,table);page.prepend(root);
  planRoot=el("div","","cloud-support");planRoot.id="commercialPlanRoot";planRoot.append(el("h2","Planes y mensualidades"),el("p","Conserva los planes y permisos existentes. El cambio de precio queda auditado."),button("Actualizar",refresh));plansList=el("div");planRoot.append(plansList);planPage.prepend(planRoot);
  dialog=el("dialog","","cloud-support-dialog");body=el("div","","cloud-dialog-body");dialog.append(body);document.body.append(dialog);dialog.addEventListener("close",()=>body.replaceChildren());
  window.SambrixCommercial={open};
  const S=window.SaaS;
  // Retain historical local records, but do not allow legacy commercial writers to create new ones.
  S.renewBusiness=id=>open(id);S.openPlanChange=id=>open(id,"plan");S.openBillingPayment=id=>open(typeof id==="string"?id:"");
  S.registerBillingPayment=()=>open();S.createBillingPayment=()=>open();S.savePlanChange=()=>open();S.editPlan=id=>priceForm(id);
  for(const fn of ["createDiscount","applyDiscount","toggleDiscount","createInvoice","updateInvoiceStatus","saveBillingPolicy","markRenewalContacted","saveRenewalAlertPolicy","refreshBillingStates"]){S[fn]=()=>toast("Función anterior en revisión. Usa Cobros y suscripciones.");}
  $("addPlanBtn")?.addEventListener("click",e=>{e.stopImmediatePropagation();e.preventDefault();toast("La creación de planes con permisos propios queda pendiente de validación.");},true);
  const oldGo=window.App?.go;if(oldGo)window.App.go=function(id,...args){return oldGo.call(this,admin()&&commercialPages.has(id)?"billingOperationsCenter":id,...args);};
  let last="";const check=()=>{if(!admin())return;const active=document.querySelector("#adminApp .page.active")?.id||"";if(active===last)return;last=active;if(active==="billingOperationsCenter"||active==="saasPlans")refresh();};
  const observer=new MutationObserver(check);observer.observe(page,{attributes:true,attributeFilter:["class"]});observer.observe(planPage,{attributes:true,attributeFilter:["class"]});
  onAuthStateChanged(auth,()=>{version++;rows=[];plans=[];table.replaceChildren();plansList.replaceChildren();$("commercialCounts").replaceChildren();if(dialog.open)dialog.close();last="";check();});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
