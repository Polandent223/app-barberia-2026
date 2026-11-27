/* Owner-only subscription workspace. All commercial reads use server-confirmed snapshots. */
import {auth,firestore} from "../firebase/firebase-core.js";
import {doc,collection,getDocFromServer,getDocsFromServer,addDoc,serverTimestamp,onSnapshot} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import {billingPolicy,commercialState,daysToDue,todayLocal,cents} from "./commercial-core.js?v=2.0.6";
import {planName,money} from "./subscription-core.js?v=1";
import {receiptCard,receiptActions} from "./subscription-receipt.js?v=1";
const S=()=>window.SaaS;
const el=(tag,text="",cls="")=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
const btn=(t,fn,cls="secondary")=>{const b=el("button",t,"btn "+cls);b.type="button";b.onclick=fn;return b;};
function ctx(){const s=S()?.session,id=String(s?.businessId||""),uid=auth.currentUser?.uid;return s?.role==="owner"&&id&&uid?{id,uid,key:id+":"+uid}:null;}
const current=c=>ctx()?.key===c.key;
const dateLabel=d=>typeof d==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(d)?d.split("-").reverse().join("/"):"Sin fecha verificada";
function value(parent,title,text){const n=el("div","","cloud-value");n.append(el("span",title),el("strong",text));parent.append(n);}
function dueText(d){return d===null?"Fecha pendiente":d===0?"Vence hoy":d<0?"Venció hace "+Math.abs(d)+" días":"Vence en "+d+" días";}
function price(p){try{return money(cents(p.price))+" / mes";}catch{return "Consultar mensualidad";}}
export async function open(){
 const c=ctx();if(!c||document.getElementById("ownerSubscriptionDialog"))return;
 const dialog=el("dialog","","cloud-support-dialog subscription-dialog");dialog.id="ownerSubscriptionDialog";
 const header=el("div","","cloud-dialog-head"),body=el("div","","cloud-dialog-body"),status=el("p","Consultando suscripción en Firebase…","cloud-message");
 header.append(el("h2","Mi suscripción"),btn("Cerrar",()=>dialog.close()));dialog.append(header,body);body.append(status);document.body.append(dialog);dialog.showModal();
 const alive=()=>dialog.open&&current(c);
 const watcher=setInterval(()=>{if(!current(c)&&dialog.open)dialog.close();},300);
 dialog.addEventListener("close",()=>{clearInterval(watcher);body.replaceChildren();dialog.remove();},{once:true});
 const companyRef=doc(firestore,"businesses",c.id),termsRef=doc(firestore,"platform","subscription_terms"),receiptRef=collection(firestore,"businesses",c.id,"subscription_receipts");
 async function load(){
  if(!alive())return;body.replaceChildren(status);status.textContent="Consultando suscripción en Firebase…";
  const [company,terms,receipts]=await Promise.allSettled([getDocFromServer(companyRef),getDocFromServer(termsRef),getDocsFromServer(receiptRef)]);
  if(!alive())return;
  if(company.status!=="fulfilled"||!company.value.exists()){status.textContent="No se pudo verificar la empresa. Contacta a SAMBRIX.";return;}
  const b=company.value.data();if(b.id&&b.id!==c.id){status.textContent="No se pudo verificar la identidad de la empresa.";return;}
  const t=terms.status==="fulfilled"&&terms.value.exists()?terms.value.data():null,plans=Array.isArray(t?.plans)?t.plans:[],p=plans.find(x=>x.id===b.planId),days=daysToDue(b.nextPayment,todayLocal());
  status.textContent="Suscripción consultada en Firebase.";
  const refresh=btn("Actualizar",load),overview=el("div","","cloud-values");
  value(overview,"Empresa",b.name||c.id);value(overview,"Plan",p?planName(p):({"plan-basic":"Básico","plan-pro":"Pro","plan-premium":"Premium"}[b.planId]||b.planId||"Pendiente"));value(overview,"Mensualidad",p?price(p):"Pendiente de publicación");value(overview,"Vencimiento",dateLabel(b.nextPayment));
  body.append(refresh,overview,el("p",dueText(days)+(t?" · "+commercialState(b,todayLocal(),billingPolicy(t.policy)):""),"subscription-notice"));
  if(!t)body.append(el("p","SAMBRIX aún no ha publicado las condiciones de renovación o no están disponibles. Consulta a soporte.","muted"));
  else{
   body.append(el("h3","Renovación"),el("p","Período de gracia: "+billingPolicy(t.policy).graceDays+" día(s)."),el("p","Métodos habilitados: "+(Array.isArray(t.methods)?t.methods.join(" · "):"Consultar")));
   if(t.instructions)body.append(el("p",String(t.instructions),"subscription-notice"));
  }
  const form=el("section","","panel");form.append(el("h3","Solicitar cambio de plan"),el("p","La solicitud llega al equipo SAMBRIX. No modifica tu plan ni genera un cobro automáticamente.","muted"));
  const select=el("select");select.setAttribute("aria-label","Plan solicitado");
  for(const plan of plans.filter(x=>x.id!==b.planId)){const o=el("option",planName(plan)+" · "+price(plan));o.value=plan.id;select.append(o);}
  const note=el("textarea");note.maxLength=500;note.placeholder="Motivo o comentario (opcional)";note.setAttribute("aria-label","Comentario");
  const request=btn("Enviar solicitud",async()=>{
   if(!alive()||request.disabled)return;const target=plans.find(x=>x.id===select.value&&x.id!==b.planId);if(!target)return;
   if(!confirm("¿Enviar solicitud de cambio a "+planName(target)+"?"))return;
   request.disabled=true;
   try{const fresh=await getDocFromServer(companyRef);if(!alive()||!fresh.exists()||fresh.data().planId!==b.planId)throw Error("El plan cambió. Actualiza.");
    await addDoc(collection(firestore,"support_cases"),{businessId:c.id,subject:"Solicitud de cambio de plan",description:"Plan actual: "+(p?planName(p):b.planId)+". Plan solicitado: "+planName(target)+". "+note.value.trim(),priority:"Normal",status:"Abierto",createdBy:c.uid,createdAt:serverTimestamp()});
    if(alive()){form.replaceChildren(el("p","Solicitud registrada en Firebase. Puedes consultar la respuesta en Soporte y avisos."));}
   }catch(e){if(alive()){window.App?.toast?.(e.message||"No se pudo registrar la solicitud.");request.disabled=false;}}
  },"primary");request.disabled=!select.options.length;form.append(select,note,request);body.append(form,el("h3","Historial de mensualidades"));
  const list=el("div","","stack");body.append(list);
  if(receipts.status!=="fulfilled"){list.append(el("p","El historial todavía no está habilitado para propietarios o no se pudo verificar. Contacta a SAMBRIX.","muted"));return;}
  const rows=receipts.value.docs.map(x=>({id:x.id,...x.data()})).filter(x=>x.businessId===c.id).sort((a,b)=>String(b.paidAt).localeCompare(String(a.paidAt)));
  if(!rows.length)list.append(el("p","No hay comprobantes publicados para esta empresa.","muted"));
  for(const r of rows){const card=el("article","","cloud-ticket");card.append(el("strong",money(r.amountCents)),el("p",dateLabel(r.paidAt)+" · "+r.method+" · "+r.months+" mes(es)"),btn("Ver comprobante",()=>{if(!alive())return;body.replaceChildren(btn("Volver a mi suscripción",load),receiptCard(r),receiptActions(r,alive));}));list.append(card);}
 }
 await load();
}
let key="",stop=null,termsStop=null,company=null,terms=null;
function updateNotice(){
 const b=document.querySelector("[data-owner-subscription]");if(!b)return;const c=ctx(),d=company&&c?.key===key?daysToDue(company.nextPayment,todayLocal()):null,limit=terms?billingPolicy(terms.policy).priorityDays:7;
 b.hidden=!c;b.textContent="Mi suscripción"+(d!==null&&d<=limit?" · "+dueText(d):"");
}
function watch(){
 const c=ctx();if((c?.key||"")===key){updateNotice();return;}
 stop?.();termsStop?.();stop=null;termsStop=null;key=c?.key||"";company=null;terms=null;updateNotice();if(!c)return;
 stop=onSnapshot(doc(firestore,"businesses",c.id),{includeMetadataChanges:true},s=>{if(current(c)&&!s.metadata.fromCache&&!s.metadata.hasPendingWrites){company=s.exists()?s.data():null;updateNotice();}},()=>{if(current(c)){company=null;updateNotice();}});
 termsStop=onSnapshot(doc(firestore,"platform","subscription_terms"),{includeMetadataChanges:true},s=>{if(current(c)&&!s.metadata.fromCache&&!s.metadata.hasPendingWrites){terms=s.exists()?s.data():null;updateNotice();}},()=>{if(current(c)){terms=null;updateNotice();}});
}
setInterval(watch,1200);window.SambrixSubscription={open};
