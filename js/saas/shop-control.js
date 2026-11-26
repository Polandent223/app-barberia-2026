import {auth,firestore} from "../firebase/firebase-core.js";
import {doc,collection,runTransaction,serverTimestamp,getDocFromServer} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import {checkoutShop,MAX_LINES,METHODS} from "./shop-core.js?v=2.0.16";
const el=(tag,text="",cls="")=>{const x=document.createElement(tag);x.textContent=text;if(cls)x.className=cls;return x;};
const button=(text,action,cls="secondary")=>{const b=el("button",text,"btn "+cls);b.type="button";b.addEventListener("click",action);return b;};
function boot(){
 const A=window.App,S=window.SaaS;if(!A||!S)return;
 const bid=()=>String(S.session?.businessId||"");
 const allowed=()=>["owner","admin","manager","cashier"].includes(S.session?.role)&&!!auth.currentUser&&!!bid()&&S.currentBusiness?.()?.id===bid()&&S.pageAllowed?.("caja")&&S.featureAllowed?.("caja",S.currentBusiness?.())&&S.featureAllowed?.("inventario",S.currentBusiness?.());
 const identity=()=>String(auth.currentUser?.uid||"")+":"+bid();
 let busy=false,gen=0,session="";
 const dialog=el("dialog","","cloud-support-dialog"),body=el("div");dialog.id="sambrixShopDialog";dialog.append(el("h2","Punto de venta"),button("Cerrar",()=>{if(!busy)dialog.close();}),body);document.body.append(dialog);
 dialog.addEventListener("cancel",e=>{if(busy)e.preventDefault();});dialog.addEventListener("close",()=>{if(!dialog.open){gen++;body.replaceChildren();session="";}});
 const cash=document.getElementById("caja"),host=el("div","","panel"),openButton=button("Nueva venta de productos",()=>open(""),"primary");host.append(el("h3","Punto de venta"),el("p","Registra cobros recibidos. Caja y existencias se actualizan juntas."),openButton);host.hidden=true;cash?.prepend(host);
 const format=(v,cur)=>String(cur||"$")+Number(v||0).toFixed(2);
 const localClock=()=>{const d=new Date(),p=v=>String(v).padStart(2,"0");return {date:d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate()),time:p(d.getHours())+":"+p(d.getMinutes())};};
 async function open(orderId){
  if(!allowed()||busy)return A.toast("No tienes permiso de venta.");
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
     const sale=await checkoutShop({db:firestore,sdk:{doc,collection,runTransaction,serverTimestamp},businessId,actor,email:auth.currentUser?.email||"",check,orderId,items,method:chosen,...localClock()});
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
 A.returnShopOrder=()=>A.toast("Devolución de mercancía en revisión. No se alteraron las existencias.");
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
 const sync=()=>{host.hidden=!allowed();host.style.display=host.hidden?"none":"";if(dialog.open&&(!allowed()||identity()!==session)){gen++;body.replaceChildren();dialog.close();}};
 const old=A.renderAll;A.renderAll=function(...args){const r=old.apply(this,args);sync();return r;};setInterval(sync,1000);sync();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
