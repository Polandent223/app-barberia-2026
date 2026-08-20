SaaS.supportTickets=SaaS.supportTickets||[];
SaaS.supportSession=null;

SaaS.loadSupport=function(){
  try{SaaS.supportTickets=JSON.parse(localStorage.getItem("sambrix_support_tickets"))||[]}catch{SaaS.supportTickets=[]}
  try{SaaS.supportSession=JSON.parse(sessionStorage.getItem("sambrix_support_session"))||null}catch{SaaS.supportSession=null}
};
SaaS.saveSupport=function(){
  localStorage.setItem("sambrix_support_tickets",JSON.stringify(SaaS.supportTickets));
  if(SaaS.supportSession)sessionStorage.setItem("sambrix_support_session",JSON.stringify(SaaS.supportSession));
  else sessionStorage.removeItem("sambrix_support_session");
};

SaaS.openSupportTicket=function(){
  const role=SaaS.session?.role||"";
  if(role==="superadmin")return window.App?.go?.("supportCenter");
  if(!SaaS.getContext?.()?.businessId)return window.App?.toast?.("No hay negocio activo");
  document.getElementById("supportTicketSubject").value="";
  document.getElementById("supportTicketDescription").value="";
  document.getElementById("supportTicketPriority").value="Normal";
  document.getElementById("supportTicketModal")?.classList.add("open");
};
SaaS.closeSupportTicket=function(){document.getElementById("supportTicketModal")?.classList.remove("open")};

SaaS.createSupportTicket=function(){
  const subject=document.getElementById("supportTicketSubject").value.trim();
  const description=document.getElementById("supportTicketDescription").value.trim();
  if(!subject||!description)return alert("Completa asunto y descripción.");
  const ctx=SaaS.getContext(),b=SaaS.db.businesses.find(x=>x.id===ctx.businessId);
  const t={id:"ticket_"+SaaS.uid(),businessId:ctx.businessId,businessName:b?.name||"",subject,description,priority:document.getElementById("supportTicketPriority").value,status:"Abierto",createdAt:new Date().toISOString(),createdBy:window.FirebaseBridge?.user?.email||SaaS.session?.role||"usuario",notes:[]};
  SaaS.supportTickets.push(t);SaaS.saveSupport();SaaS.audit?.("SUPPORT","Ticket creado",{ticketId:t.id,priority:t.priority},ctx.businessId);
  SaaS.closeSupportTicket();SaaS.renderSupport();window.App?.toast?.("Solicitud enviada a soporte");
};

SaaS.updateSupportTicket=function(id,status){
  const t=SaaS.supportTickets.find(x=>x.id===id);if(!t)return;
  t.status=status;t.updatedAt=new Date().toISOString();
  if(status==="Resuelto")t.resolvedAt=new Date().toISOString();
  SaaS.saveSupport();SaaS.audit?.("SUPPORT",`Ticket ${status.toLowerCase()}`,{ticketId:id},t.businessId);SaaS.renderSupport();
};

SaaS.enterSupportMode=function(businessId){
  if((SaaS.session?.role||SaaS.currentSecurityRole?.())!=="superadmin")return window.App?.toast?.("Solo SuperAdmin puede usar modo soporte");
  const b=SaaS.db.businesses.find(x=>x.id===businessId);if(!b)return;
  const reason=prompt(`Motivo para entrar a ${b.name}:`,"Soporte solicitado por el negocio");
  if(!reason)return;
  SaaS.supportSession={businessId,businessName:b.name,reason,startedAt:new Date().toISOString(),superAdmin:window.FirebaseBridge?.user?.email||"SuperAdmin"};
  SaaS.saveSupport();SaaS.audit?.("SUPPORT","SuperAdmin entró en modo soporte",{reason},businessId);
  SaaS.switchTenant?.(businessId,{support:true});
  SaaS.renderSupportModeBanner();window.App?.go?.("inicio");
};

SaaS.exitSupportMode=function(){
  const s=SaaS.supportSession;if(!s)return;
  SaaS.audit?.("SUPPORT","SuperAdmin salió del modo soporte",{durationMs:Date.now()-new Date(s.startedAt).getTime()},s.businessId);
  SaaS.supportSession=null;SaaS.saveSupport();
  try{SaaS.exitBusiness?.()}catch{}
  SaaS.renderSupportModeBanner();window.App?.go?.("supportCenter");
};

SaaS.renderSupportModeBanner=function(){
  const banner=document.getElementById("supportModeBanner");if(!banner)return;
  banner.classList.toggle("hidden",!SaaS.supportSession);
  if(SaaS.supportSession){
    (document.getElementById("supportBannerText")||document.getElementById("supportModeBusinessName")).textContent=`${SaaS.supportSession.businessName} · ${SaaS.supportSession.reason}`;
  }
};

SaaS.renderSupport=function(){
  const list=document.getElementById("supportTicketsList");if(!list)return;
  const filter=document.getElementById("supportStatusFilter")?.value||"";
  const rows=[...SaaS.supportTickets].reverse().filter(t=>!filter||t.status===filter);
  document.getElementById("supportOpenCount").textContent=SaaS.supportTickets.filter(t=>t.status==="Abierto").length;
  document.getElementById("supportProgressCount").textContent=SaaS.supportTickets.filter(t=>t.status==="En progreso").length;
  document.getElementById("supportResolvedCount").textContent=SaaS.supportTickets.filter(t=>t.status==="Resuelto").length;
  document.getElementById("supportModeState").textContent=SaaS.supportSession?"ON":"OFF";
  document.getElementById("supportModeBusiness").textContent=SaaS.supportSession?.businessName||"Sin negocio";

  list.innerHTML=rows.map(t=>`<div class="row support-ticket ${t.priority==="Urgente"?"urgent":""} ${t.status==="Resuelto"?"resolved":""}">
    <div><div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap"><strong>${t.subject}</strong><span class="support-priority ${t.priority}">${t.priority}</span></div><small>${t.businessName} · ${t.status} · ${new Date(t.createdAt).toLocaleString()}</small><div class="notification-meta">${t.description}</div></div>
    <div class="manage-actions">${t.status==="Abierto"?`<button class="btn primary tiny" onclick="SaaS.updateSupportTicket('${t.id}','En progreso')">Atender</button>`:""}${t.status!=="Resuelto"?`<button class="btn secondary tiny" onclick="SaaS.updateSupportTicket('${t.id}','Resuelto')">Resolver</button>`:""}<button class="btn secondary tiny" onclick="SaaS.enterSupportMode('${t.businessId}')">Entrar</button></div>
  </div>`).join("")||'<div class="muted">No hay tickets con este filtro.</div>';

  document.getElementById("supportBusinessList149").innerHTML=(SaaS.db.businesses||[]).map(b=>`<div class="row"><div><strong>${b.name}</strong><small>${b.owner||"Sin dueño"} · ${b.status||"Activo"}</small></div><button class="btn secondary tiny" onclick="SaaS.enterSupportMode('${b.id}')">Asistencia</button></div>`).join("");
  SaaS.renderSupportModeBanner();
};

const oldRenderAll_149=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_149();SaaS.renderSupport()};
