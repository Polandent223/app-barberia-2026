import {auth,firestore} from "../firebase/firebase-core.js";
import {doc,collection,runTransaction,serverTimestamp,getDocFromServer,getDocsFromServer,query,orderBy,limit} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import {applyCorrection,correctionSummary,moneyCents} from "./financial-corrections-core.js?v=2.0.13";
const labels={REFUND:"Devolución parcial",VOID:"Anulación del saldo",DISCOUNT:"Descuento posterior al cobro",CASH_REVERSAL:"Reversión de caja manual"};
const S=()=>window.SaaS,A=()=>window.App;
const id=()=>String(S()?.session?.businessId||"");
const role=()=>S()?.session?.role;
const allowed=()=>["owner","admin"].includes(role())&&!!auth.currentUser&&!!id()&&S()?.currentBusiness?.()?.id===id()&&S()?.pageAllowed?.("caja")&&S()?.featureAllowed?.("caja",S()?.currentBusiness?.());
const identity=()=>String(auth.currentUser?.uid||"")+":"+id();
const el=(tag,text="",cls="")=>{const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n;};
const btn=(text,fn,cls="secondary")=>{const b=el("button",text,"btn "+cls);b.type="button";b.addEventListener("click",fn);return b;};
const field=(label,control)=>{const l=el("label");l.append(el("span",label),control);return l;};
const fmt=(n,cur)=>String(cur||"$")+" "+(n/100).toFixed(2);
let dialog,body,busy=false,gen=0,dialogIdentity="";
function dateLocal(){const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function check(tenant,uid){if(!allowed()||id()!==tenant||auth.currentUser?.uid!==uid)throw Error("La sesión o empresa cambió.");}
async function open(){
 if(!allowed()||busy)return;
 const tenant=id(),uid=auth.currentUser.uid,cloud=window.SaaSCloudProduction,load=++gen;
 if(!cloud?.isTenantReady?.(tenant))return A()?.toast?.("Primero verifica la sincronización.");
 dialogIdentity=identity();body.replaceChildren(el("p","Consultando caja en Firebase…"));
 if(!dialog.open)dialog.showModal();
 try{
  await cloud.awaitTenantWrites(tenant);check(tenant,uid);
  const [snap,history]=await Promise.all([getDocFromServer(doc(firestore,"businesses",tenant,"state","finance")),getDocsFromServer(query(collection(firestore,"businesses",tenant,"financial_corrections"),orderBy("createdAt","desc"),limit(50)))]);
  check(tenant,uid);if(load!==gen||!dialog.open)return;
  if(!snap.exists()||snap.data().businessId!==tenant)throw Error("Caja no verificada.");
  const finance=snap.data().payload,source=el("select"),kind=el("select"),amount=el("input"),reason=el("textarea"),summary=el("p"),historyList=el("div");
  source.append(new Option("Selecciona el movimiento original",""));
  for(const row of (finance.cash||[]).slice().reverse()){
    try{const s=correctionSummary(finance,row.id);if(s.remaining>0)source.append(new Option([row.date,row.type,row.concept,fmt(s.remaining,row.currency)].join(" · "),row.id));}catch{}
  }
  amount.type="number";amount.min="0.01";amount.step="0.01";reason.maxLength=500;reason.placeholder="Explica el motivo de la corrección";
  function update(){
    kind.replaceChildren();amount.value="";summary.textContent="";
    if(!source.value){amount.disabled=true;return;}
    const s=correctionSummary(finance,source.value),receipt=finance.sales?.find(x=>x.id===s.source.saleId);
    summary.textContent=(receipt?"Recibo #"+receipt.number+" · ":"")+"Original "+fmt(s.original,s.source.currency)+" · Corregido "+fmt(s.corrected,s.source.currency)+" · Disponible "+fmt(s.remaining,s.source.currency);
    for(const k of receipt?["REFUND","VOID","DISCOUNT"]:["CASH_REVERSAL"])kind.append(new Option(labels[k],k));
    amount.max=String(s.remaining/100);amount.value=String(s.remaining/100);amount.disabled=false;
    adjust();
  }
  function adjust(){const fixed=["VOID","CASH_REVERSAL"].includes(kind.value);amount.readOnly=fixed;if(fixed&&source.value)amount.value=String(correctionSummary(finance,source.value).remaining/100);}
  source.addEventListener("change",update);kind.addEventListener("change",adjust);update();
  const save=btn("Registrar corrección",async()=>{
    if(busy)return;let n;
    try{check(tenant,uid);n=moneyCents(amount.value);if(!source.value||!kind.value||n<=0||reason.value.trim().length<5)throw Error("Completa movimiento, monto y motivo.");}
    catch(e){A()?.toast?.(e.message);return;}
    if(!confirm("¿Registrar "+labels[kind.value]+"? Confirma que el ajuste de dinero ya fue realizado. SAMBRIX no transfiere fondos."))return;
    busy=true;save.disabled=true;
    try{
      await cloud.awaitTenantWrites(tenant);check(tenant,uid);
      const result=await applyCorrection({db:firestore,sdk:{doc,collection,runTransaction,serverTimestamp},businessId:tenant,sourceId:source.value,kind:kind.value,amount:amount.value,reason:reason.value,actor:uid,email:auth.currentUser?.email||"",date:dateLocal(),check:()=>check(tenant,uid)});
      if(id()===tenant&&auth.currentUser?.uid===uid){dialog.close();try{await cloud.refreshTenant(tenant);}catch(e){console.warn("[SAMBRIX correction refresh]",e);}A()?.toast?.("Corrección confirmada · "+fmt(result.amountCents,result.cashEntry.currency));}
    }catch(e){A()?.toast?.(e?.code==="permission-denied"?"Firebase no autorizó la corrección.":e.message||"No se confirmó.");}
    finally{busy=false;save.disabled=false;}
  },"primary");
  historyList.append(el("h3","Últimas 50 correcciones"));
  for(const d of history.docs){const v=d.data(),card=el("div","","panel");card.append(el("strong",labels[v.kind]||v.kind),el("p",fmt(v.amountCents,v.cashEntry?.currency)+" · "+String(v.cashEntry?.date||"")),el("p","Motivo: "+v.reason),el("small","Usuario: "+v.actorUid+" · Movimiento: "+v.sourceId));historyList.append(card);}
  if(!history.size)historyList.append(el("p","Sin correcciones registradas."));
  body.replaceChildren(el("p","No se elimina el recibo original. El ajuste genera un movimiento compensatorio de caja y conserva el motivo y usuario. No realiza devoluciones bancarias."),field("Movimiento original",source),summary,field("Tipo de corrección",kind),field("Importe",amount),field("Motivo obligatorio",reason),save,historyList);
 }catch(e){if(load===gen&&dialog.open)body.replaceChildren(el("p",e.message||"No se pudo consultar caja."));}
}
function renderSummary(panel){
 const data=A()?.db;if(!data||data.meta?.businessId!==id()||!window.SaaSCloudProduction?.isTenantReady?.(id())){panel.querySelector(".correction-summary").replaceChildren(el("p","Verificando información del negocio…"));return;}
 const sales=new Map(),refunds=new Map(),period=panel.dataset.page==="reportes",from=period?(document.getElementById("reportFrom")?.value||"0000-01-01"):"0000-01-01",to=period?(document.getElementById("reportTo")?.value||"9999-12-31"):"9999-12-31";
 for(const row of data.sales||[]){if(row.date<from||row.date>to)continue;try{const key=String(row.currency||"$");sales.set(key,(sales.get(key)||0)+moneyCents(row.total));}catch{}}
 for(const row of data.cash||[]){if(!row.correctionId||!row.originalSaleId||row.type!=="Egreso"||row.date<from||row.date>to)continue;try{const key=String(row.currency||"$");refunds.set(key,(refunds.get(key)||0)+moneyCents(row.amount));}catch{}}
 const out=panel.querySelector(".correction-summary");out.replaceChildren(el("strong",period?"Ventas y ajustes del período":"Ventas acumuladas y ajustes"));
 for(const key of new Set([...sales.keys(),...refunds.keys()])){const gross=sales.get(key)||0,ref=refunds.get(key)||0;out.append(el("p","Bruto "+fmt(gross,key)+" · Devuelto/ajustado "+fmt(ref,key)+" · Neto "+fmt(gross-ref,key)));}
 if(!sales.size&&!refunds.size)out.append(el("p","Sin operaciones."));
}
function boot(){
 if(!A()||!S()||document.getElementById("financialCorrectionsDialog"))return;
 dialog=el("dialog","","cloud-support-dialog");dialog.id="financialCorrectionsDialog";body=el("div");dialog.append(el("h2","Correcciones financieras"),btn("Cerrar",()=>{if(!busy)dialog.close();}),body);dialog.addEventListener("cancel",e=>{if(busy)e.preventDefault();});dialog.addEventListener("close",()=>{if(!dialog.open){gen++;body.replaceChildren();dialogIdentity="";}});document.body.append(dialog);
 const panels=[];
 for(const page of ["caja","recibos","reportes"]){const host=document.getElementById(page);if(!host)continue;const panel=el("div","","panel");panel.hidden=true;panel.dataset.page=page;panel.append(el("div","","correction-summary"));if(page!=="reportes")panel.append(btn("Correcciones y devoluciones",open));host.prepend(panel);panels.push(panel);}
 const sync=()=>{for(const panel of panels){panel.hidden=!allowed();panel.style.display=panel.hidden?"none":"";if(!panel.hidden)renderSummary(panel);}if(dialog.open&&(!allowed()||dialogIdentity!==identity())){gen++;body.replaceChildren();dialog.close();}};
 const old=A().renderAll;A().renderAll=function(...args){const r=old.apply(this,args);sync();return r;};for(const key of ["reportFrom","reportTo"])document.getElementById(key)?.addEventListener("change",sync);setInterval(()=>{for(const panel of panels){panel.hidden=!allowed();panel.style.display=panel.hidden?"none":"";}if(dialog.open&&(!allowed()||dialogIdentity!==identity())){gen++;body.replaceChildren();dialog.close();}},1000);sync();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
