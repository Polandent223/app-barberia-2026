/* SAMBRIX 2: cloud support and read-only company assistance. */
import {firestore,auth,onAuthStateChanged} from "../firebase/firebase-core.js";
import {collection,doc,query,where,getDocsFromServer,getDocFromServer,addDoc,writeBatch,runTransaction,serverTimestamp} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
const $=id=>document.getElementById(id);
const admin=()=>!!auth.currentUser&&window.SaaS?.session?.role==="superadmin";
const uid=()=>auth.currentUser?.uid||"";
const businessId=()=>String(window.SaaS?.session?.businessId||"");
const companies=()=>Array.isArray(window.SaaS?.db?.businesses)?window.SaaS.db.businesses:[];
const company=id=>companies().find(b=>b.id===id);
const toast=s=>window.App?.toast?.(s);
const safeDate=t=>t?.toDate? t.toDate().toLocaleString("es"): "Sin fecha verificada";
const norm=s=>String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
let root, staffDialog, companyDialog, activeLoad=0, detailLoad=0, lastCases=[], selected="", statusFilter="Pendientes", searchText="";
function node(tag, cls="", value=""){const n=document.createElement(tag);if(cls)n.className=cls;if(value!==""&&value!=null)n.textContent=String(value);return n;}
function button(label,fn,kind="secondary"){const b=node("button","btn "+kind,label);b.type="button";b.addEventListener("click",fn);return b;}
function field(label,input){const l=node("label","cloud-field");l.append(node("span","",label),input);return l;}
function select(values,value){const s=node("select");for(const v of values){const o=node("option","",v);o.value=v;s.append(o);}s.value=value;return s;}
function message(parent,text,kind=""){const p=node("p","cloud-message "+kind,text);parent.append(p);return p;}
function busy(btn,task){if(btn.disabled)return;btn.disabled=true;return Promise.resolve().then(task).catch(e=>{console.warn("[SAMBRIX Support]",e);toast("No se pudo completar. Revisa permisos y conexión.");}).finally(()=>btn.disabled=false);}
function dialog(title){const d=node("dialog","cloud-support-dialog");const h=node("div","cloud-dialog-head");h.append(node("h2","",title),button("Cerrar",()=>d.close()));const body=node("div","cloud-dialog-body");d.append(h,body);document.body.append(d);d.addEventListener("close",()=>body.replaceChildren());return {d,body};}
function still(id,owner,gen){return admin()&&uid()===owner&&detailLoad===gen&&companyDialog?.d.open&&selected===id;}
function addValue(parent,label,value){const x=node("div","cloud-value");x.append(node("span","",label),node("strong","",value));parent.append(x);}
function eventData(id,action,reason,caseId=""){return {businessId:id,action,reason,caseId,actorUid:uid(),createdAt:serverTimestamp()};}
async function listCases(id=""){
  const ref=collection(firestore,"support_cases");
  const filters=id?[where("businessId","==",id)]:[];
  if(id&&!admin()&&!["owner","admin","manager"].includes(window.SaaS?.session?.role))filters.push(where("createdBy","==",uid()));
  const snap=await getDocsFromServer(filters.length?query(ref,...filters):ref);
  return snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
}
function ticketCard(t,allowEdit=false){
  const card=node("article","cloud-ticket"),h=node("div","cloud-ticket-head");
  h.append(node("strong","",t.subject||"Sin asunto"),node("span","cloud-status",t.status||"Sin estado"));card.append(h);
  card.append(node("small","", (company(t.businessId)?.name||t.businessId)+" · "+(t.priority||"Normal")+" · "+safeDate(t.createdAt)));
  card.append(node("p","cloud-ticket-text",t.description||""));
  if(t.response)card.append(node("p","cloud-reply","Respuesta de SAMBRIX: "+t.response));
  if(allowEdit){
    const a=node("div","cloud-actions");
    a.append(button("Atender / responder",()=>editCase(t),"primary"),button("Ficha de empresa",()=>openCompany(t.businessId,t.id)));
    card.append(a);
  }return card;
}
function renderCases(){
  if(!root||!admin())return;
  const count=$("cloudSupportCounts");count.replaceChildren();
  for(const s of ["Abierto","En progreso","Resuelto"])addValue(count,s,lastCases.filter(t=>t.status===s).length);
  const list=$("cloudSupportCases");list.replaceChildren();
  const q=norm(searchText);
  const matches=lastCases.filter(t=>(statusFilter==="Todos"||(statusFilter==="Pendientes"?t.status!=="Resuelto":t.status===statusFilter))&&(!q||norm([t.subject,t.description,t.businessId,company(t.businessId)?.name,t.priority].join(" ")).includes(q)));
  for(const t of matches)list.append(ticketCard(t,true));
  if(!matches.length)message(list,"No hay solicitudes con este filtro.");
}
function renderCompanies(){
  const list=$("cloudSupportCompanies");if(!list||!admin())return;list.replaceChildren();
  const q=norm($("cloudCompanySearch")?.value);
  const matches=companies().filter(b=>!q||norm([b.name,b.owner,b.ownerEmail,b.phone,b.whatsapp,b.id].join(" ")).includes(q));
  for(const b of matches){const row=node("div","cloud-company-row");const copy=node("div");copy.append(node("strong","",b.name||b.id),node("small","",(b.owner||"Sin propietario")+" · "+(b.status||"Sin estado")));row.append(copy,button("Abrir ficha",()=>openCompany(b.id)));list.append(row);}
  if(!matches.length)message(list,"No se encontraron empresas.");
}
async function refreshAdmin(){
  if(!admin())return;
  const gen=++activeLoad,owner=uid();lastCases=[];$("cloudSupportCounts").replaceChildren();$("cloudSupportCases").replaceChildren();message($("cloudSupportCases"),"Consultando solicitudes en Firebase…");renderCompanies();
  try{const data=await listCases();if(gen!==activeLoad||uid()!==owner||!admin())return;lastCases=data;renderCases();$("cloudSupportState").textContent="Datos consultados en Firebase: "+new Date().toLocaleTimeString("es");}
  catch(e){if(gen!==activeLoad||uid()!==owner||!admin())return;console.warn("[SAMBRIX Support cases]",e);$("cloudSupportCases").replaceChildren();message($("cloudSupportCases"),"No se pudieron verificar las solicitudes. Revisa conexión y reglas de Firebase.","error");$("cloudSupportState").textContent="Sin verificación de Firebase";}
}
function editCase(t){
  if(!admin())return;const owner=uid();const {d,body}=dialog("Atender solicitud");d.addEventListener("close",()=>d.remove(),{once:true});
  body.append(ticketCard(t));
  const status=select(["Abierto","En progreso","Resuelto"],t.status);
  const response=node("textarea");response.maxLength=2000;response.rows=5;response.value=t.response||"";
  body.append(field("Estado",status),field("Respuesta para la empresa",response));
  const save=button("Guardar respuesta",()=>busy(save,async()=>{
    if(!admin()||uid()!==owner)return;
    const value=response.value.trim();if(status.value==="Resuelto"&&value.length<3){toast("Escribe una respuesta antes de resolver.");return;}
    const batch=writeBatch(firestore);
    batch.update(doc(firestore,"support_cases",t.id),{status:status.value,response:value,updatedBy:owner,updatedAt:serverTimestamp()});
    batch.set(doc(collection(firestore,"support_access_events")),eventData(t.businessId,"CASE_UPDATE","Cambio de estado: "+status.value,t.id));
    await batch.commit();if(uid()!==owner||!admin())return;d.close();toast("Respuesta guardada en Firebase.");await refreshAdmin();
  }),"primary");body.append(save);d.showModal();
}
async function openCompany(id,caseId=""){
  if(!admin()||!id)return;
  selected=id;const gen=++detailLoad,owner=uid();
  const body=companyDialog.body;body.replaceChildren();
  const b=company(id);body.append(node("h3","",b?.name||id),node("p","","Consulta de asistencia: no cambia de empresa ni modifica sus operaciones."));
  const reason=node("input");reason.maxLength=500;reason.placeholder="Ej. Revisar problema de acceso";
  body.append(field("Motivo de la consulta",reason));
  const details=node("div","cloud-detail");body.append(details);
  const read=button("Consultar información",()=>busy(read,async()=>{
    if(!still(id,owner,gen))return;
    const why=reason.value.trim();if(why.length<3){toast("Escribe el motivo de la consulta.");return;}
    details.replaceChildren();message(details,"Verificando Firebase…");
    // Fail closed: record the consultation before reading company information.
    await addDoc(collection(firestore,"support_access_events"),eventData(id,"CONSULT",why,caseId));
    const paths=[["Empresa",["businesses",id]],["Agenda",["businesses",id,"state","schedule"]],["Caja",["businesses",id,"state","finance"]],["Inventario",["businesses",id,"state","inventory"]],["Configuración",["businesses",id,"state","config"]]];
    const result=await Promise.allSettled(paths.map(([,p])=>getDocFromServer(doc(firestore,...p))));
    const other=await Promise.allSettled([getDocsFromServer(collection(firestore,"businesses",id,"members")),listCases(id),getDocsFromServer(query(collection(firestore,"support_access_events"),where("businessId","==",id)))]);
    if(!still(id,owner,gen))return;
    details.replaceChildren();
    const meta=result[0];if(meta.status!=="fulfilled"||!meta.value.exists()){message(details,"La empresa no pudo verificarse en Firebase.","error");return;}
    const data=meta.value.data();const values=node("div","cloud-values");
    addValue(values,"Empresa",data.name||id);addValue(values,"Propietario",data.owner||"Sin registro");addValue(values,"Correo",data.ownerEmail||"Sin registro");addValue(values,"Estado",data.status||"Sin registro");addValue(values,"Plan",window.SaaS?.getPlan?.(data.planId)?.name||data.planId||"Sin registro");addValue(values,"Sucursales",Array.isArray(data.branches)?data.branches.length:"Sin verificar");details.append(values);
    const access=node("div","cloud-access-control");
    let blocked=data.accessSuspended===true;
    const accessLabel=node("strong","",blocked?"Acceso administrativo bloqueado":"Acceso administrativo habilitado");
    const accessReason=node("input");accessReason.maxLength=500;accessReason.placeholder="Motivo del bloqueo o reactivación";
    const changeAccess=button(blocked?"Restablecer acceso":"Bloquear acceso",()=>busy(changeAccess,async()=>{
      if(!still(id,owner,gen))return;
      const why=accessReason.value.trim();
      if(why.length<3){toast("Escribe un motivo para cambiar el acceso.");return;}
      const next=!blocked;
      if(!confirm(next?"¿Bloquear el acceso de esta empresa y sus nuevas reservas? No se eliminarán datos.":"¿Restablecer el bloqueo administrativo? El estado comercial seguirá aplicándose."))return;
      const ref=doc(firestore,"businesses",id),audit=doc(collection(firestore,"support_access_events"));
      await runTransaction(firestore,async tx=>{
        const snap=await tx.get(ref);
        if(!snap.exists()||(snap.data().accessSuspended===true)!==blocked)throw new Error("El acceso cambió. Vuelve a consultar.");
        tx.update(ref,{accessSuspended:next,accessChangedAt:serverTimestamp(),accessChangedBy:owner});
        tx.set(audit,eventData(id,next?"ACCESS_SUSPEND":"ACCESS_RESTORE",why,caseId));
      });
      if(!still(id,owner,gen))return;
      blocked=next;accessReason.value="";
      accessLabel.textContent=blocked?"Acceso administrativo bloqueado":"Acceso administrativo habilitado";
      changeAccess.textContent=blocked?"Restablecer acceso":"Bloquear acceso";
      toast(blocked?"Bloqueo guardado en Firebase.":"Bloqueo administrativo retirado.");
    }),"primary");
    access.append(accessLabel,node("p","cloud-message","Control independiente de cobros y renovaciones. No elimina usuarios ni historiales."),field("Motivo del cambio",accessReason),changeAccess);
    details.append(access);
    details.append(button("Respaldos de esta empresa",()=>{if(!still(id,owner,gen))return;companyDialog.d.close();window.SambrixBackup?.open(id); }));
    const checks=node("div","cloud-values");details.append(node("h3","","Diagnóstico de lectura"),checks);
    for(let i=1;i<result.length;i++){const r=result[i];addValue(checks,paths[i][0],r.status==="rejected"?"No verificable":r.value.exists()?"Documento accesible":"Sin documento");}
    addValue(checks,"Usuarios",other[0].status==="fulfilled"?other[0].value.size+" registrados":"No verificable");
    addValue(checks,"Solicitudes",other[1].status==="fulfilled"?other[1].value.length+" registradas":"No verificable");
    message(details,"Este diagnóstico comprueba lectura desde el servidor; no certifica escrituras, respaldos ni sincronización en otros equipos.");
    if(other[0].status==="fulfilled"){
      details.append(node("h3","","Accesos de la empresa"));
      for(const m of other[0].value.docs){const v=m.data();const row=node("div","cloud-company-row"),copy=node("div");copy.append(node("strong","",v.name||v.email||m.id),node("small","",(v.role||"Sin rol")+" · "+(v.active===false?"Suspendido":"Activo")));row.append(copy);if(v.email){const reset=button("Enviar recuperación",()=>busy(reset,async()=>{if(!still(id,owner,gen)||!confirm("¿Enviar correo de recuperación a "+v.email+"?"))return;await addDoc(collection(firestore,"support_access_events"),eventData(id,"RESET_REQUEST","Solicitud de recuperación para el usuario "+m.id,caseId));await window.FirebaseBridge.sendPasswordReset(v.email);toast("Solicitud de recuperación enviada.");}));row.append(reset);}details.append(row);}
    }
    if(other[1].status==="fulfilled"){details.append(node("h3","","Historial de solicitudes"));for(const t of other[1].value.slice(0,20))details.append(ticketCard(t));if(!other[1].value.length)message(details,"Sin solicitudes registradas.");}
    if(other[2].status==="fulfilled"){details.append(node("h3","","Historial de asistencia"));const events=other[2].value.docs.map(x=>x.data()).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));for(const e of events.slice(0,15))message(details,(e.action==="CONSULT"?"Consulta":e.action==="RESET_REQUEST"?"Recuperación de acceso":e.action==="ACCESS_SUSPEND"?"Bloqueo de acceso":e.action==="ACCESS_RESTORE"?"Restablecimiento de acceso":"Actualización")+" · "+e.reason+" · "+safeDate(e.createdAt));}
    const phone=String(data.whatsapp||data.phone||data.branches?.[0]?.whatsapp||"").replace(/\D/g,"");
    if(phone.length>=8&&phone.length<=15){const a=node("a","btn secondary","Contactar por WhatsApp");a.href="https://wa.me/"+phone;a.target="_blank";a.rel="noopener noreferrer";details.append(a);}
  }),"primary");body.insertBefore(read,details);if(!companyDialog.d.open)companyDialog.d.showModal();
}
async function openStaff(){
  const id=businessId(),owner=uid();if(!id||!owner||admin()){toast("Inicia sesión en tu empresa.");return;}
  const body=staffDialog.body;body.replaceChildren();
  const subject=node("input");subject.maxLength=120;
  const description=node("textarea");description.maxLength=2000;description.rows=4;
  const priority=select(["Normal","Alta","Urgente"],"Normal");
  body.append(node("p","","Envía una solicitud a SAMBRIX mediante Firebase. Solo se considera enviada cuando aparece la confirmación del servidor. No incluyas contraseñas ni datos sensibles de clientes."),field("Asunto",subject),field("Descripción",description),field("Prioridad",priority));
  const history=node("div","cloud-detail");
  const reload=async()=>{history.replaceChildren();message(history,"Consultando solicitudes…");try{const rows=await listCases(id);if(uid()!==owner||businessId()!==id||!staffDialog.d.open)return;history.replaceChildren();history.append(node("h3","",["owner","admin","manager"].includes(window.SaaS?.session?.role)?"Solicitudes de tu empresa":"Tus solicitudes"));for(const t of rows)history.append(ticketCard(t));if(!rows.length)message(history,"Todavía no hay solicitudes.");}catch(e){if(uid()!==owner||businessId()!==id)return;history.replaceChildren();message(history,"No se pudieron consultar las solicitudes.","error");}};
  const send=button("Enviar a SAMBRIX",()=>busy(send,async()=>{if(uid()!==owner||businessId()!==id||admin())return;const s=subject.value.trim(),d=description.value.trim();if(s.length<3||d.length<10){toast("Completa el asunto y la descripción.");return;}await addDoc(collection(firestore,"support_cases"),{businessId:id,subject:s,description:d,priority:priority.value,status:"Abierto",createdBy:owner,createdAt:serverTimestamp()});if(uid()!==owner||businessId()!==id)return;subject.value="";description.value="";toast("Solicitud recibida en Firebase.");await reload();}),"primary");
  body.append(send,button("Actualizar solicitudes",reload),history);if(!staffDialog.d.open)staffDialog.d.showModal();await reload();
}
function goSupport(){if(!admin())return;if($("supportCenter").classList.contains("active"))refreshAdmin();else window.App?.go?.("supportCenter");}
function boot(){
  if(root||!$("supportCenter")||!window.SaaS)return;
  staffDialog=dialog("Soporte SAMBRIX");companyDialog=dialog("Ficha de empresa");
  root=node("div","cloud-support");root.id="cloudSupportRoot";$("supportCenter").prepend(root);
  const head=node("div","cloud-ticket-head");head.append(node("h2","","Centro de soporte"),button("Actualizar",refreshAdmin));root.append(head,node("p","","Atiende incidencias y consulta empresas sin cambiar su sesión operativa."));
  const state=node("p","cloud-message","Pendiente de consultar Firebase.");state.id="cloudSupportState";root.append(state);
  const counts=node("div","cloud-values");counts.id="cloudSupportCounts";root.append(counts);
  const layout=node("div","cloud-support-layout"),left=node("div","panel"),right=node("div","panel");
  left.append(node("h3","","Solicitudes de soporte"));const filter=select(["Pendientes","Todos","Abierto","En progreso","Resuelto"],statusFilter);filter.addEventListener("change",()=>{statusFilter=filter.value;renderCases();});
  const search=node("input");search.placeholder="Buscar incidencia o empresa";search.addEventListener("input",()=>{searchText=search.value;renderCases();});left.append(filter,search);
  const list=node("div","cloud-stack");list.id="cloudSupportCases";left.append(list);
  right.append(node("h3","","Empresas y asistencia"));const cs=node("input");cs.id="cloudCompanySearch";cs.placeholder="Buscar empresa o propietario";cs.addEventListener("input",renderCompanies);right.append(cs);const co=node("div","cloud-stack");co.id="cloudSupportCompanies";right.append(co);
  layout.append(left,right);root.append(layout);message(root,"Los tickets antiguos guardados únicamente en el navegador no se importan automáticamente.");
  const S=window.SaaS;
  // Replace the old local-only submission and unsafe legacy support entries.
  const open=()=>{if(!auth.currentUser||!S.session||S.session.role==="guest"){toast("Inicia sesión antes de consultar soporte.");return;}return admin()?goSupport():openStaff();};
  window.SambrixCloudSupport={open};
  S.openSupportTicket=open;
  S.createSupportTicket=open;
  S.startSupport=id=>{if(admin())openCompany(id);};
  S.enterSupportMode=id=>{if(admin())openCompany(id);};
  // Legacy suspension controls were local-only. Route all manual access changes through the audited cloud control.
  for(const name of ["suspendBusiness","toggleBusinessStatus","suspendBilling","reactivateBilling"]){
    S[name]=id=>{if(admin()){toast("Usa el control de acceso de la ficha de empresa.");openCompany(id);}};
  }
  document.addEventListener("click",e=>{
    const b=e.target.closest?.("#openSupportTicketBtn,#newSupportTicketBtn,#saveSupportTicket,#saveSupportTicketBtn,#refreshSupportBtn");
    if(!b)return;
    e.preventDefault();e.stopImmediatePropagation();
    if(b.id==="refreshSupportBtn"&&admin())return refreshAdmin();
    if(b.id==="saveSupportTicket"||b.id==="saveSupportTicketBtn"){toast("El formulario anterior no envía solicitudes. Usa el formulario de Soporte SAMBRIX.");return;}
    open();
  },true);
  // Add a company detail action after each existing table refresh.
  const table=$("saasBusinessTable");
  if(table){const addLinks=()=>{if(!admin())return;for(const row of table.querySelectorAll("tbody tr")){if(row.querySelector("[data-cloud-ficha]"))continue;const old=row.querySelector('button[onclick*="SaaS.openMembers"]');const id=old?.getAttribute("onclick")?.match(/openMembers\('([^']+)'\)/)?.[1];if(!id)continue;const b=button("Ficha",()=>openCompany(id));b.dataset.cloudFicha="1";old.parentElement.append(b);}};new MutationObserver(addLinks).observe(table,{childList:true,subtree:true});addLinks();}
  let visible=false;const check=()=>{const on=admin()&&$("supportCenter").classList.contains("active");if(on&&!visible)refreshAdmin();visible=on;};
  new MutationObserver(check).observe($("supportCenter"),{attributes:true,attributeFilter:["class"]});
  new MutationObserver(check).observe(document.body,{attributes:true,attributeFilter:["data-sambrix-role"]});
  onAuthStateChanged(auth,()=>{activeLoad++;detailLoad++;lastCases=[];selected="";for(const d of document.querySelectorAll("dialog.cloud-support-dialog[open]"))d.close();$("cloudSupportCases")?.replaceChildren();$("cloudSupportCompanies")?.replaceChildren();$("cloudSupportCounts")?.replaceChildren();visible=false;check();});
  check();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
