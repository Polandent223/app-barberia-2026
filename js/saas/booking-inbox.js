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
  const existing=(A.db.appointments||[]).find(x=>x.publicRequestId===req.id);
  if(existing)return existing;
  let client=A.db.clients?.find(c=>(req.clientUid&&c.firebaseUid===req.clientUid)||(req.clientId&&c.id===req.clientId)||c.phone===req.phone);
  if(!client){
    client={id:req.clientId||("client_"+SaaS.uid()),firebaseUid:req.clientUid||"",name:req.name||"Cliente",phone:req.phone||"",email:"",businessId:SaaS.getContext()?.businessId||"",branchId:req.branchId||SaaS.getContext()?.branchId||""};
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
  return (A?.db?.appointments||[]).some(a=>a.publicRequestId!==req.id&&a.barberId===req.barberId&&a.date===req.date&&a.time===req.time&&a.status!=="Cancelada");
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

/* SAMBRIX 1.0 — Cloud client cancellation/reschedule requests */
SaaS.bookingChangeInbox=SaaS.bookingChangeInbox||[];
SaaS.bookingChangeUnsub=null;

SaaS.renderBookingChangeInbox=function(){
  const box=document.getElementById("bookingInboxList");if(!box||!SaaS.bookingChangeInbox?.length)return;
  const pending=SaaS.bookingChangeInbox.filter(x=>x.status==="Pendiente");
  if(!pending.length)return;
  const html=`<div class="permission-note"><strong>Solicitudes sobre citas confirmadas</strong></div>`+pending.map(r=>{
    const b=SaaS.bookingInbox.find(x=>x.id===r.bookingRequestId)||{};
    return `<div class="row booking-request"><div><strong>${r.type==="cancel"?"Cancelar":"Reprogramar"} · ${b.name||"Cliente"}</strong><small>${r.oldDate||b.date||""} ${r.oldTime||b.time||""}${r.type==="reschedule"?` → ${r.newDate} ${r.newTime}`:""}</small></div><div class="manage-actions"><button class="btn primary tiny" onclick="SaaS.approveBookingChange('${r.id}')">Aprobar</button><button class="btn danger tiny" onclick="SaaS.rejectBookingChange('${r.id}')">Rechazar</button></div></div>`;
  }).join("");
  box.insertAdjacentHTML("beforeend",html);
};

SaaS.approveBookingChange=async function(id){
  const r=SaaS.bookingChangeInbox.find(x=>x.id===id);if(!r)return;
  const booking=SaaS.bookingInbox.find(x=>x.id===r.bookingRequestId);if(!booking)return window.App?.toast?.("No se encontró la reserva original");
  const A=window.App,appt=(A.db.appointments||[]).find(x=>x.publicRequestId===booking.id);
  if(!appt)return window.App?.toast?.("No se encontró la cita vinculada");
  if(r.type==="reschedule"){
    const candidate={...appt,date:r.newDate,time:r.newTime};
    if(A.appointmentConflict?.(candidate,appt.id))return A.toast("El nuevo horario está ocupado");
    appt.date=r.newDate;appt.time=r.newTime;appt.status="Confirmada";
    await NexoPublicCloud.updateBookingRequest(SaaS.getContext().businessId,booking.id,{date:r.newDate,time:r.newTime,status:"Aprobada",resolvedAt:new Date().toISOString()});
  }else{
    appt.status="Cancelada";
    await NexoPublicCloud.updateBookingRequest(SaaS.getContext().businessId,booking.id,{status:"Cancelada",resolvedAt:new Date().toISOString()});
  }
  A.persist?.();A.renderAll?.();
  await NexoPublicCloud.updateBookingChangeRequest(SaaS.getContext().businessId,id,{status:"Aprobada",resolvedAt:new Date().toISOString()});
  A.toast("Solicitud aprobada");
};
SaaS.rejectBookingChange=async function(id){
  try{await NexoPublicCloud.updateBookingChangeRequest(SaaS.getContext().businessId,id,{status:"Rechazada",resolvedAt:new Date().toISOString()});window.App?.toast?.("Solicitud rechazada")}catch(e){window.App?.toast?.(e.message||"No se pudo rechazar")}
};
SaaS.watchBookingChanges=function(){
  if(SaaS.bookingChangeUnsub){try{SaaS.bookingChangeUnsub()}catch{}SaaS.bookingChangeUnsub=null}
  const businessId=SaaS.getContext()?.businessId;
  if(!businessId||!window.NexoPublicCloud?.watchBookingChangeRequests)return;
  SaaS.bookingChangeUnsub=NexoPublicCloud.watchBookingChangeRequests(businessId,rows=>{SaaS.bookingChangeInbox=rows;SaaS.renderBookingInbox();SaaS.renderBookingChangeInbox()});
};
const oldWatchBookingInbox_10=SaaS.watchBookingInbox;
SaaS.watchBookingInbox=function(){const r=oldWatchBookingInbox_10?.();setTimeout(()=>SaaS.watchBookingChanges(),50);return r};
const oldRenderBookingInbox_10=SaaS.renderBookingInbox;
SaaS.renderBookingInbox=function(){const r=oldRenderBookingInbox_10?.();SaaS.renderBookingChangeInbox();return r};


/* SAMBRIX 1.0 v4 — keep client cloud state aligned with the completed service */
const oldFinishAppointmentV4=window.App?.finishAppointment;
if(oldFinishAppointmentV4){
  window.App.finishAppointment=function(id){
    const A=window.App,appt=(A.db.appointments||[]).find(x=>x.id===id);
    const already=appt?.status==="Finalizada";
    const result=oldFinishAppointmentV4.call(A,id);
    if(!appt||already)return result;
    const businessId=SaaS.getContext?.()?.businessId||A.db?.meta?.businessId||"";
    const client=(A.db.clients||[]).find(c=>c.id===appt.clientId);
    if(appt.publicRequestId&&businessId){
      window.NexoPublicCloud?.updateBookingRequest?.(businessId,appt.publicRequestId,{status:"Finalizada",resolvedAt:new Date().toISOString()}).catch(console.error);
    }
    if(client?.firebaseUid&&businessId){
      window.NexoPublicCloud?.updateClientAccount?.(businessId,client.firebaseUid,{points:Number(client.points||0),visits:Number(client.visits||0),lastVisit:client.lastVisit||""}).catch(console.error);
    }
    return result;
  };
}
