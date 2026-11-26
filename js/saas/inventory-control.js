import {auth,firestore} from "../firebase/firebase-core.js";
import {doc,collection,runTransaction,serverTimestamp} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import {applyInventoryOperation} from "./inventory-core.js?v=2.0.14";
let busy=false;
function boot(){
 const A=window.App,S=window.SaaS;if(!A||!S)return;
 const id=()=>String(S.session?.businessId||"");
 const allowed=()=>["owner","admin","manager"].includes(S.session?.role)&&!!auth.currentUser&&!!id()&&S.currentBusiness?.()?.id===id()&&S.pageAllowed?.("inventario")&&S.featureAllowed?.("inventario",S.currentBusiness?.());
 const today=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};
 async function perform(args){
  if(busy||!allowed()){A.toast("Solo la administración autorizada puede modificar inventario.");return false;}
  const businessId=id(),actor=auth.currentUser.uid,cloud=window.SaaSCloudProduction;
  if(!cloud?.isTenantReady?.(businessId)){A.toast("Primero verifica la sincronización.");return false;}
  const check=()=>{if(!allowed()||id()!==businessId||auth.currentUser?.uid!==actor)throw Error("Cambió la sesión.");};
  busy=true;const lock=document.createElement("dialog");lock.className="cloud-support-dialog";lock.textContent="Verificando y guardando inventario…";document.body.append(lock);lock.addEventListener("cancel",e=>e.preventDefault());lock.showModal();
  try{
   await cloud.awaitTenantWrites(businessId);check();
   const r=await applyInventoryOperation({db:firestore,sdk:{doc,collection,runTransaction,serverTimestamp},businessId,actor,email:auth.currentUser?.email||"",date:today(),check,...args});
   if(id()===businessId&&auth.currentUser?.uid===actor){try{await cloud.refreshTenant(businessId);await window.NexoPublicCloud?.publishCurrentBusiness?.();}catch(e){console.warn("[SAMBRIX inventory refresh]",e);}A.toast("Operación confirmada en Firebase.");}
   return r;
  }catch(e){A.toast(e?.code==="permission-denied"?"Firebase no autorizó el movimiento. Revisa permisos y datos del producto.":e.message||"No se guardó.");return false;}
  finally{busy=false;lock.close();lock.remove();}
 }
 A.saveProduct=async()=>{
  if(!allowed()||busy)return A.toast("No tienes permiso para modificar productos.");
  const tenant=id(),actor=auth.currentUser.uid,edit=A.val("productEditId"),p=A.db.products.find(x=>x.id===edit);
  if(edit&&!p)return A.toast("Producto no encontrado.");
  if(Number(A.val("productStock")||0)!==Number(p?.stock||0))return A.toast("Las existencias iniciales son cero. Registra una entrada o salida por separado.");
  const values={name:A.val("productName"),category:A.val("productCategory"),min:A.val("productMin")||0,cost:A.val("productCost")||0,price:A.val("productPrice")||0};
  const file=A.byId("productPhoto")?.files?.[0];
  if(file){try{values.photo=await A.compressImageLocal(file,480,.7);}catch{return A.toast("No se pudo procesar la foto.");}}
  if(tenant!==id()||actor!==auth.currentUser?.uid)return;
  const reason=prompt(edit?"Motivo de la modificación":"Motivo del alta del producto",edit?"Actualización de ficha":"Alta de producto");
  if(reason===null)return;
  const result=await perform({kind:edit?"EDIT":"CREATE",productId:edit||crypto.randomUUID(),values,reason});
  if(result&&tenant===id()&&actor===auth.currentUser?.uid){for(const k of ["productEditId","productName","productStock","productMin","productCost","productPrice","productPhoto"]){const x=A.byId(k);if(x)x.value="";}A.hide("productForm");}
 };
 A.stockMove=(productId,type)=>{
  if(!allowed()||busy)return A.toast("No tienes permiso para ajustar existencias.");
  const p=A.db.products.find(x=>x.id===productId&&!x.archived);if(!p)return;
  if(!["Entrada","Salida"].includes(type))return;
  const tenant=id(),actor=auth.currentUser.uid;
  A.openFormModal({tag:"STOCK",title:type+" de inventario",note:"Existencias actuales: "+Number(p.stock),fields:[{name:"qty",label:"Cantidad de unidades",type:"number",value:1},{name:"reason",label:"Motivo obligatorio",value:""}],saveText:"Confirmar movimiento",onSave:async()=>{if(tenant!==id()||actor!==auth.currentUser?.uid)return;const r=await perform({kind:type==="Entrada"?"ENTRY":"EXIT",productId,quantity:A.readModal("qty"),reason:A.readModal("reason")});if(r&&tenant===id()&&actor===auth.currentUser?.uid)A.closeModal();}});
 };
 A.deleteProduct=async productId=>{
  if(!allowed()||busy)return A.toast("No tienes permiso para archivar productos.");
  const p=A.db.products.find(x=>x.id===productId);if(!p||p.archived)return;
  if(Number(p.stock)!==0)return A.toast("Regulariza las existencias a cero antes de archivar.");
  const reason=prompt("Motivo de archivo (se conserva el historial)","Producto fuera de catálogo");if(reason===null)return;
  await perform({kind:"ARCHIVE",productId,reason});
 };
 const oldDelete=A.requestDelete;A.requestDelete=function(type,key){if(type==="product")return A.deleteProduct(key);return oldDelete.apply(this,arguments);};
 // Legacy shop writes bypassed the atomic ledger. Keep disabled until checkout/return is rebuilt.
 A.checkoutAndDeliverOrder=()=>A.toast("Cobro de pedidos en revisión. No se descontó inventario.");
 A.returnShopOrder=()=>A.toast("Devolución de tienda en revisión. No se modificó caja ni inventario.");
 const el=(tag,text="",cls="")=>{const x=document.createElement(tag);x.textContent=text;if(cls)x.className=cls;return x;};
 const button=(label,action,cls="secondary")=>{const b=el("button",label,"btn "+cls);b.type="button";b.addEventListener("click",action);return b;};
 A.renderInventory=()=>{
  const data=A.db,list=A.byId("productList"),history=A.byId("stockMoveList");if(!list||!history||!data)return;
  if(data.meta?.businessId!==id()||!window.SaaSCloudProduction?.isTenantReady?.(id())){list.replaceChildren(el("p","Verificando inventario…"));history.replaceChildren();return;}
  const products=(data.products||[]).filter(p=>!p.archived),moves=data.stockMoves||[],q=String(A.filters?.products||"").toLowerCase();
  for(const [key,value] of [["invCount",products.length],["invLow",products.filter(p=>Number(p.stock)<=Number(p.min)).length],["invValue",A.money(products.reduce((s,p)=>s+Number(p.stock||0)*Number(p.cost||0),0))],["invMoves",moves.length]]){const x=A.byId(key);if(x)x.textContent=String(value);}
  const cards=document.createDocumentFragment();
  for(const p of products.filter(p=>!q||String(p.name||"").toLowerCase().includes(q)||String(p.category||"").toLowerCase().includes(q))){
   const card=el("article","","card product-card");
   if(/^https:\/\//.test(p.photo||"")||/^data:image\/(jpeg|png|webp);base64,/.test(p.photo||"")){const img=el("img","","catalog-card-photo");img.src=p.photo;img.alt=String(p.name||"Producto");img.loading="lazy";card.append(img);}
   card.append(el("h3",String(p.name||"Producto")),el("div",String(p.category||""),"muted"),el("div",String(p.stock)+" u.","big"),el("div","Mín. "+p.min+" · Precio "+A.money(p.price),"muted"));
   if(allowed()){const actions=el("div","","actions");actions.append(button("+ Entrada",()=>A.stockMove(p.id,"Entrada")),button("- Salida",()=>A.stockMove(p.id,"Salida")),button("Editar",()=>A.editProduct(p.id)),button("Archivar",()=>A.deleteProduct(p.id),"danger"));card.append(actions);}
   cards.append(card);
  }
  list.replaceChildren(cards);if(!list.childElementCount)list.append(el("p","No hay productos activos."));
  const rows=document.createDocumentFragment();
  for(const m of moves.slice().reverse().slice(0,200)){const row=el("div","","row"),copy=el("div");copy.append(el("strong",String(m.productName||data.products?.find(p=>p.id===m.productId)?.name||"Producto")),el("small",[m.date,m.type,m.reason].filter(Boolean).join(" · ")));
   if(Number.isFinite(m.stockBefore)&&Number.isFinite(m.stockAfter))copy.append(el("small","Stock: "+m.stockBefore+" → "+m.stockAfter+" · Usuario: "+String(m.createdBy||"")));
   row.append(copy,el("strong",(m.type==="Entrada"?"+":"−")+String(m.qty)));rows.append(row);}
  history.replaceChildren(rows);if(!history.childElementCount)history.append(el("p","Sin movimientos."));
  const add=A.byId("toggleProductForm");if(add)add.hidden=!allowed();
 };
 const input=A.byId("productStock");if(input){input.readOnly=true;input.placeholder="Existencias por movimientos";}
 const panel=document.createElement("p");panel.className="muted";panel.textContent="El inventario se actualiza por movimientos confirmados. Solo administración autorizada puede modificar existencias. Los productos se archivan sin borrar su historial.";
 document.getElementById("inventario")?.prepend(panel);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
