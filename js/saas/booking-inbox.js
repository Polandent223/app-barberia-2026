SaaS.bookingInbox=SaaS.bookingInbox||[];
SaaS.bookingInboxUnsub=null;

SaaS.serviceName=function(id){return window.App?.db?.services?.find(s=>s.id===id)?.name||id||"Servicio"};
SaaS.barberName=function(id){return window.App?.db?.barbers?.find(b=>b.id===id)?.name||id||"Profesional"};

SaaS.renderBookingInbox=function(){
  const box=document.getElementById("bookingInboxList");if(!box)return;
  const q=(document.getElementById("bookingSearch")?.value||"").toLowerCase().trim();
  const status=document.getElementById("bookingStatusFilter")?.value||"";
  const rows=[...(SaaS.bookingInbox||[])].sort((a,b)=>{
    const ta=a.createdAt?.seconds||0,tb=b.createdAt?.seconds||0;return tb-ta;
  });

  const filtered=rows.filter(r=>{
    const text=`${r.name||""} ${r.phone||""} ${r.date||""} ${r.time||""}`.toLowerCase();
    return (!q||text.includes(q))&&(!status||r.status===status);
  });

  const today=new Date().toISOString().slice(0,10);
  document.getElementById("bookingPendingCount")&&(document.getElementById("bookingPendingCount").textContent=rows.filter(r=>r.status==="Pendiente").length);
  document.getElementById("bookingApprovedCount")&&(document.getElementById("bookingApprovedCount").textContent=rows.filter(r=>r.status==="Aprobada").length);
  document.getElementById("bookingRejectedCount")&&(document.getElementById("bookingRejectedCount").textContent=rows.filter(r=>r.status==="Rechazada").length);
  document.getElementById("bookingTodayCount")&&(document.getElementById("bookingTodayCount").textContent=rows.filter(r=>{
    const d=r.createdAt?.toDate?.();return d?d.toISOString().slice(0,10)===today:false;
  }).length);

  box.innerHTML=filtered.map(r=>`<div class="row booking-request ${r.status==="Aprobada"?"approved":r.status==="Rechazada"?"rejected":""}">
    <div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><strong>${r.name||"Cliente"}</strong><span class="booking-status ${r.status||"Pendiente"}">${r.status||"Pendiente"}</span></div>
      <div class="booking-meta"><span>${r.phone||"Sin teléfono"}</span><span>${SaaS.serviceName(r.serviceId)}</span><span>${SaaS.barberName(r.barberId)}</span><span>${r.date||"—"} · ${r.time||"—"}</span></div>
      ${r.note?`<small>${r.note}</small>`:""}
    </div>
    <div class="manage-actions">
      ${r.status==="Pendiente"?`<button class="btn primary tiny" onclick="SaaS.approvePublicBooking('${r.id}')">Aprobar</button><button class="btn secondary tiny" onclick="SaaS.rejectPublicBooking('${r.id}')">Rechazar</button>`:""}
    </div>
  </div>`).join("")||'<div class="muted">No hay solicitudes con este filtro.</div>';
};

SaaS.createAppointmentFromRequest=function(req){
  const A=window.App;if(!A?.db)return null;
  let client=A.db.clients?.find(c=>c.phone===req.phone);
  if(!client){
    client={id:"client_"+SaaS.uid(),name:req.name||"Cliente",phone:req.phone||"",email:"",businessId:SaaS.getContext()?.businessId||"",branchId:req.branchId||SaaS.getContext()?.branchId||""};
    A.db.clients=A.db.clients||[];A.db.clients.push(client);
  }

  const service=A.db.services?.find(s=>s.id===req.serviceId);
  const barber=A.db.barbers?.find(b=>b.id===req.barberId);
  const appt={
    id:"appt_"+SaaS.uid(),
    clientId:client.id,
    serviceId:req.serviceId,
    barberId:req.barberId,
    date:req.date,
    time:req.time,
    status:"Confirmada",
    note:req.note||"",
    duration:Number(service?.duration||40),
    price:Number(service?.price||0),
    businessId:SaaS.getContext()?.businessId||"",
    branchId:req.branchId||SaaS.getContext()?.branchId||"",
    source:"SAMBRIX Client",
    publicRequestId:req.id,
    createdAt:new Date().toISOString()
  };
  A.db.appointments=A.db.appointments||[];A.db.appointments.push(appt);
  A.persist?.();A.renderAll?.();
  return appt;
};

SaaS.publicBookingConflict=function(req){
  const A=window.App;
  const service=A?.db?.services?.find(s=>s.id===req.serviceId);
  const duration=Number(service?.duration||40);
  if(typeof A?.isBarberAvailable==="function"){
    try{return !A.isBarberAvailable(req.barberId,req.date,req.time,duration)}catch{}
  }
  return (A?.db?.appointments||[]).some(a=>a.barberId===req.barberId&&a.date===req.date&&a.time===req.time&&a.status!=="Cancelada");
};

SaaS.approvePublicBooking=async function(id){
  const req=SaaS.bookingInbox.find(x=>x.id===id);if(!req)return;
  if(SaaS.publicBookingConflict(req))return window.App?.toast?.("Ese horario ya no está disponible");
  try{
    const appt=SaaS.createAppointmentFromRequest(req);
    await window.NexoPublicCloud?.updateBookingRequest?.(SaaS.getContext().businessId,id,{status:"Aprobada",appointmentId:appt?.id||"",resolvedAt:new Date().toISOString()});
    SaaS.audit?.("BUSINESS","Reserva pública aprobada",{requestId:id,appointmentId:appt?.id||""},SaaS.getContext().businessId);
    window.App?.toast?.("Reserva aprobada y cita creada");
  }catch(e){window.App?.toast?.(e.message||"No se pudo aprobar")}
};

SaaS.rejectPublicBooking=async function(id){
  const req=SaaS.bookingInbox.find(x=>x.id===id);if(!req)return;
  const reason=prompt("Motivo (opcional)","");
  try{
    await window.NexoPublicCloud?.updateBookingRequest?.(SaaS.getContext().businessId,id,{status:"Rechazada",reason:reason||"",resolvedAt:new Date().toISOString()});
    SaaS.audit?.("BUSINESS","Reserva pública rechazada",{requestId:id,reason:reason||""},SaaS.getContext().businessId);
    window.App?.toast?.("Solicitud rechazada");
  }catch(e){window.App?.toast?.(e.message||"No se pudo rechazar")}
};

SaaS.watchBookingInbox=function(){
  if(SaaS.bookingInboxUnsub){try{SaaS.bookingInboxUnsub()}catch{}SaaS.bookingInboxUnsub=null}
  const businessId=SaaS.getContext()?.businessId;
  if(!businessId||!window.NexoPublicCloud?.watchPublicBookingRequests)return;
  SaaS.bookingInboxUnsub=window.NexoPublicCloud.watchPublicBookingRequests(businessId,rows=>{SaaS.bookingInbox=rows;SaaS.renderBookingInbox()});
};

const oldSwitchTenant_145=SaaS.switchTenant;
if(oldSwitchTenant_145){
  SaaS.switchTenant=function(id,opts){const r=oldSwitchTenant_145(id,opts);setTimeout(()=>SaaS.watchBookingInbox(),300);return r};
}

const oldRenderAll_145=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_145();SaaS.renderBookingInbox()};
