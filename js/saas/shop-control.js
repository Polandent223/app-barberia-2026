import {auth,firestore,firebaseApp} from "../firebase/firebase-core.js";
import {doc,getDocFromServer} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import {getFunctions,httpsCallable} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js";
const MAX_LINES=3,METHODS=["Efectivo","Pago móvil","Transferencia","Divisa","Tarjeta","Otro"];
const el=(tag,text="",cls="")=>{const x=document.createElement(tag);x.textContent=text;if(cls)x.className=cls;return x;};
const button=(text,action,cls="secondary")=>{const b=el("button",text,"btn "+cls);b.type="button";b.addEventListener("click",action);return b;};
function boot(){
 const A=window.App,S=window.SaaS;if(!A||!S)return;
 const bid=()=>String(S.session?.businessId||"");
 let enabled=false,checkedIdentity="",lastCheck=0;
 const allowed=()=>enabled&&["owner","admin","manager","cashier"].includes(S.session?.role)&&!!auth.currentUser&&!!bid()&&S.currentBusiness?.()?.id===bid()&&S.pageAllowed?.("caja")&&S.featureAllowed?.("caja",S.currentBusiness?.())&&S.featureAllowed?.("inventario",S.currentBusiness?.());
 const canReturn=()=>allowed()&&["owner","admin"].includes(S.session?.role);
 const identity=()=>String(auth.currentUser?.uid||"")+":"+bid();
 let busy=false,gen=0,session="";
 const dialog=el("dialog","","cloud-support-dialog"),body=el("div");dialog.id="sambrixShopDialog";dialog.append(el("h2","Punto de venta"),button("Cerrar",()=>{if(!busy)dialog.close();}),body);document.body.append(dialog);
 dialog.addEventListener("cancel",e=>{if(busy)e.preventDefault();});dialog.addEventListener("close",()=>{if(!dialog.open){gen++;body.replaceChildren();session="";}});
 const cash=document.getElementById("caja"),host=el("div","","panel"),openButton=button("Nueva venta de productos",()=>open(""),"primary");const recent=el("div");host.append(el("h3","Punto de venta"),el("p","Registra cobros recibidos. Caja y existencias se actualizan juntas."),openButton,button("Verificar operación pendiente",()=>resume()),recent);host.hidden=true;cash?.prepend(host);
 const format=(v,cur)=>String(cur||"$")+Number(v||0).toFixed(2);
 const endpoints={SALE:httpsCallable(getFunctions(firebaseApp,"us-central1"),"sambrixSellProducts"),RETURN:httpsCallable(getFunctions(firebaseApp,"us-central1"),"sambrixReturnProducts")};
 const draftKey=()=>"sambrix-pos-pending:"+identity();
 function pending(){try{return JSON.parse(localStorage.getItem(draftKey())||"null");}catch{throw Error("No se pudo revisar una operación pendiente.");}}
 async function submit(kind,input){
  const key=draftKey(),prior=pending(),intent={kind,input};
  if(prior&&JSON.stringify(prior.intent)!==JSON.stringify(intent))throw Error("Existe una operación sin confirmar. Reinténtala antes de registrar otra.");
  const draft=prior||{intent,requestId:crypto.randomUUID()};
  localStorage.setItem(key,JSON.stringify(draft));
  try{const response=await endpoints[kind]({...input,requestId:draft.requestId});localStorage.removeItem(key);return response.data;}
  catch(e){if(["functions/permission-denied","functions/invalid-argument","functions/unauthenticated"].includes(e.code))localStorage.removeItem(key);throw e;}
 }
 async function resume(){
  if(!allowed()||busy)return;
  let d;try{d=pending();}catch(e){return A.toast(e.message);}
  if(!d)return A.toast("No hay una operación pendiente.");
  const sessionId=identity();if(!confirm("¿Consultar y reintentar exactamente la misma operación pendiente?"))return;
  busy=true;
  try{const data=await submit(d.intent.kind,d.intent.input);if(identity()===sessionId){await window.SaaSCloudProduction?.refreshTenant?.(bid());A.toast(data.sale?"Venta confirmada. Recibo #"+data.sale.number:"Devolución confirmada.");}}
  catch(e){A.toast(e.message||"La operación sigue pendiente.");}
  finally{busy=false;}
 }
 async function checkFeature(){
  const current=identity(),time=Date.now();
  if(checkedIdentity!==current){checkedIdentity=current;enabled=false;lastCheck=0;}
  if(!auth.currentUser||!bid()||time-lastCheck<30000)return;lastCheck=time;
  try{const snap=await getDocFromServer(doc(firestore,"platform","config"));if(current===identity())enabled=snap.exists()&&snap.data().shopServerEnabled===true;}
  catch{if(current===identity())enabled=false;}
 }
 async function open(orderId){
  if(!allowed()||busy)return A.toast("Punto de venta todavía no habilitado o sin permiso.");
  try{if(pending())return A.toast("Primero verifica la operación pendiente desde Caja.");}catch(e){return A.toast(e.message);}
  const businessId=bid(),actor=auth.currentUser.uid,cloud=window.SaaSCloudProduction,load=++gen;
  if(!cloud?.isTenantReady?.(businessId))return A.toast("Verifica primero la sincronización.");
  const check=()=>{if(!allowed()||bid()!==businessId||auth.currentUser?.uid!==actor)throw Error("Cambió la sesión.");};
  session=identity();body.replaceChildren(el("p","Verificando precios y existencias…"));if(!dialog.open)dialog.showModal();
  try{
   await cloud.awaitTenantWrites(businessId);check();
   const [s,c]=await Promise.all(["inventory","config"].map(n=>getDocFromServer(doc(firestore,"businesses",businessId,"state",n))));
   check();if(load!==gen||!dialog.open)return;
   if([s,c].some(x=>!x.exists()||x.data().businessId!==businessId))throw Error("Inventario no verificado.");
   const inv=s.data().payload,cur=c.data().payload.business?.currency||"$",order=orderId?inv.shopOrders?.find(o=>o.id===orderId):null;
   if(orderId&&(!order||!["Pendiente","Reservado"].includes(order.status)))throw Error("Pedido no disponible.");
   const cart=new Map(),summary=el("div"),select=el("select"),qty=el("input"),method=el("select");
   select.append(new Option("Selecciona un producto",""));
   for(const p of inv.products||[])if(!p.archived&&Number(p.stock)>0&&Number(p.price)>0)select.append(new Option(String(p.name)+" · "+format(p.price,cur)+" · "+p.stock+" u.",p.id));
   qty.type="number";qty.min="1";qty.step="1";qty.value="1";
   for(const m of METHODS)method.append(new Option(m,m));
   const add=button("Agregar",()=>{const p=inv.products.find(x=>x.id===select.value),n=Number(qty.value);if(!p||!Number.isSafeInteger(n)||n<=0)return A.toast("Cantidad inválida.");
    const total=(cart.get(p.id)?.qty||0)+n;if(total>p.stock)return A.toast("Stock insuficiente.");if(!cart.has(p.id)&&cart.size>=MAX_LINES)return A.toast("Máximo "+MAX_LINES+" referencias por recibo.");cart.set(p.id,{id:p.id,qty:total,price:p.price});draw();});
   if(order)for(const i of order.items||[]){if(cart.has(i.id))throw Error("Pedido con referencias duplicadas.");cart.set(i.id,{id:i.id,qty:Number(i.qty),price:i.price});}
   function draw(){
    summary.replaceChildren();let total=0;for(const i of cart.values()){const p=inv.products.find(x=>x.id===i.id);const row=el("div","","row");row.append(el("span",String(p?.name||i.id)+" · "+i.qty+" u."),el("strong",format(Number(i.price)*i.qty,cur)));if(!order)row.append(button("Quitar",()=>{cart.delete(i.id);draw();}));summary.append(row);total+=Number(i.price)*i.qty;}
    summary.append(el("h3","Total: "+format(total,cur)));save.disabled=busy||!cart.size||cart.size>MAX_LINES;
   }
   const save=button("Confirmar cobro recibido",async()=>{
    if(busy||!cart.size||load!==gen)return;
    try{check();}catch(e){return A.toast(e.message);}
    if(!confirm("¿Confirmas que recibiste el pago? SAMBRIX no realiza cargos bancarios."))return;
    busy=true;save.disabled=true;
    const items=[...cart.values()],chosen=method.value;
    try{
     await cloud.awaitTenantWrites(businessId);check();
     const {sale}=await submit("SALE",{businessId,orderId,items:orderId?[]:items,method:chosen});
     if(identity()===session){dialog.close();try{await cloud.refreshTenant(businessId);if(["owner","admin","manager"].includes(S.session?.role))await window.NexoPublicCloud?.publishCurrentBusiness?.();}catch(e){console.warn("[SAMBRIX shop refresh]",e);}A.toast("Venta confirmada. Recibo #"+sale.number);}
    }catch(e){A.toast(e?.code==="permission-denied"?"Firebase no autorizó la venta. Revisa permisos y datos.":e.message||"No se confirmó la venta.");}
    finally{busy=false;save.disabled=false;}
   },"primary");
   body.replaceChildren(el("p",order?"Pedido existente: "+order.id:"Venta directa de mostrador"),el("p","Máximo tres referencias distintas. Los precios se comprueban nuevamente al cobrar."));
   if(!order){const row=el("div","","form-grid");row.append(select,qty,add);body.append(row);}
   body.append(summary,el("label","Método de pago"),method,save);draw();
  }catch(e){if(load===gen&&dialog.open)body.replaceChildren(el("p",e.message||"No se pudo verificar la venta."));}
 }
 A.canCheckoutOrder=allowed;A.checkoutAndDeliverOrder=id=>open(String(id||""));
 async function returnSale(sale){
  if(!canReturn()||busy||!sale?.shopOperationId)return A.toast("Devolución no disponible.");
  try{if(pending())return A.toast("Primero verifica la operación pendiente desde Caja.");}catch(e){return A.toast(e.message);}
  const businessId=bid(),actor=auth.currentUser.uid,cloud=window.SaaSCloudProduction;
  if(!cloud?.isTenantReady?.(businessId))return A.toast("Verifica la sincronización.");
  const check=()=>{if(!canReturn()||bid()!==businessId||auth.currentUser?.uid!==actor)throw Error("Cambió la sesión.");};
  const reason=prompt("Motivo de devolución integral (productos recibidos en buen estado y dinero devuelto)","");if(reason===null)return;
  if(reason.trim().length<5)return A.toast("Escribe el motivo.");
  if(!confirm("¿Confirmas que recibiste todos los productos y devolviste "+format(sale.total,sale.currency)+"? Se reintegrarán las existencias y se registrará el egreso. No se transfiere dinero."))return;
  busy=true;const lock=el("dialog","","cloud-support-dialog");lock.textContent="Verificando devolución…";document.body.append(lock);lock.addEventListener("cancel",e=>e.preventDefault());lock.showModal();
  try{
   await cloud.awaitTenantWrites(businessId);check();
   await submit("RETURN",{businessId,originalOperationId:sale.shopOperationId,reason});
   if(bid()===businessId&&auth.currentUser?.uid===actor){try{await cloud.refreshTenant(businessId);await window.NexoPublicCloud?.publishCurrentBusiness?.();}catch(e){console.warn("[SAMBRIX return refresh]",e);}A.toast("Devolución integral confirmada en Firebase.");}
  }catch(e){A.toast(e?.code==="permission-denied"?"Firebase no autorizó la devolución.":e.message||"No se confirmó la devolución.");}
  finally{busy=false;lock.close();lock.remove();}
 }
 A.returnShopOrder=key=>{const order=A.db.shopOrders?.find(x=>x.id===key),sale=A.db.sales?.find(x=>x.id===order?.saleId);return returnSale(sale);};
 function drawRecent(){
  recent.replaceChildren();
  if(!allowed()||A.db?.meta?.businessId!==bid()||!window.SaaSCloudProduction?.isTenantReady?.(bid()))return;
  recent.append(el("h3","Últimas ventas de productos"));
  for(const s of (A.db.sales||[]).filter(x=>x.shopOperationId).slice(-30).reverse()){
   const source=(A.db.cash||[]).find(x=>x.saleId===s.id&&x.type==="Ingreso");
   const adjusted=(A.db.cash||[]).some(x=>x.correctionOf===source?.id&&!!x.correctionId);
   const row=el("div","","row"),info=el("div");info.append(el("strong","Recibo #"+s.number+" · "+format(s.total,s.currency)),el("small",String(s.date)+" · "+(adjusted?"Con ajuste registrado":"Cobrado")));row.append(info);
   if(canReturn()&&source&&!adjusted)row.append(button("Devolución integral",()=>returnSale(s)));
   recent.append(row);
  }
 }
 // The public shop order workflow has not been rebuilt. Existing server orders
 // can be collected, but legacy local-only creation and state changes must stop.
 A.createShopOrder=()=>A.toast("Los pedidos en línea todavía no están habilitados.");
 A.approveShopOrder=()=>A.toast("La reserva de mercancía está en revisión. Puedes cobrar pedidos existentes desde caja.");
 A.rejectShopOrder=()=>A.toast("La gestión de pedidos en línea está en revisión.");
 A.cancelShopOrder=()=>A.toast("La cancelación de pedidos está en revisión.");
 A.renderCashShopOrders=()=>{
  const box=A.byId("cashShopOrders");if(!box)return;box.replaceChildren();
  if(!allowed()||A.db?.meta?.businessId!==bid()||!window.SaaSCloudProduction?.isTenantReady?.(bid()))return;
  for(const o of (A.db.shopOrders||[]).filter(x=>["Pendiente","Reservado","Pagado/Entregado"].includes(x.status)).slice().reverse()){
   const row=el("div","","row"),info=el("div");info.append(el("strong",String(o.phone||"Cliente")+" · "+format(o.total,o.currency)),el("small",String(o.status)+" · "+(o.items||[]).map(i=>String(i.qty)+" × "+String(i.name)).join(", ")));row.append(info);
   if(["Pendiente","Reservado"].includes(o.status))row.append(button("Cobrar y entregar",()=>open(o.id),"primary"));box.append(row);
  }
  if(!box.childElementCount)box.append(el("p","No hay pedidos existentes."));
 };
 let last="";const sync=()=>{void checkFeature();host.hidden=!allowed();host.style.display=host.hidden?"none":"";if(dialog.open&&(!allowed()||identity()!==session)){gen++;body.replaceChildren();dialog.close();}const signature=identity()+":"+allowed()+":"+canReturn()+":"+window.SaaSCloudProduction?.isTenantReady?.(bid())+":"+String(A.db?.meta?.businessId)+":"+(A.db?.sales?.length||0)+":"+(A.db?.cash?.length||0)+":"+(A.db?.shopOrders?.length||0);if(signature!==last){last=signature;drawRecent();A.renderCashShopOrders();}};
 const old=A.renderAll;A.renderAll=function(...args){const r=old.apply(this,args);sync();return r;};setInterval(sync,1000);sync();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
