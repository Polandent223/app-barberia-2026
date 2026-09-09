/* SAMBRIX 20.32 — Confirmación administrativa de reservas del cliente */
(function(){
  const A=window.App;if(!A)return;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const statusLabel=s=>s==='Pendiente'?'Pendiente de confirmación':s;

  // Las reservas creadas desde la cuenta del cliente nunca nacen confirmadas.
  A.submitClientReservation=function(){
    const c=A.currentClient?.();
    if(!c){A.renderClientAuthUI?.('login');return A.toast('Debes ingresar antes de reservar')}
    const s=A.db.services.find(x=>x.id===A.clientSelection.serviceId),date=A.val('clientBookDate'),time=A.clientSelection.time;
    if(!s||!date||!time)return A.toast('Completa servicio, fecha y horario');
    let barberId=A.clientSelection.barberId;
    if(!barberId){const list=A.availableBarbers(date,time,s.duration);if(!list.length)return A.toast('Horario no disponible');barberId=list[0].id}
    if(!A.slotAvailable(barberId,date,time,s.duration))return A.toast('Ese horario acaba de ocuparse. Elige otro');
    const note=A.val('clientBookNote');
    const appt={id:A.uid(),clientId:c.id,barberId,serviceId:s.id,date,time,status:'Pendiente',note:note||'',source:'client-account',createdAt:new Date().toISOString(),requestedAt:new Date().toISOString()};
    A.db.appointments.push(appt);
    A.addClientActivity?.('Solicitud de cita',`${c.name} · ${date} ${time} · pendiente de confirmación`,c.phone||'');
    A.clientSelection={serviceId:'',barberId:'',time:''};
    A.persist();
    A.clientGo('clientAppointments');
    A.toast('Solicitud enviada. Espera la confirmación del negocio');
  };

  A.confirmAppointment2032=function(id){
    const a=A.db.appointments.find(x=>x.id===id);if(!a||a.status!=='Pendiente')return;
    a.status='Confirmada';a.confirmedAt=new Date().toISOString();a.confirmedBy=A.currentUser?.()?.name||'Administrador';
    const c=A.db.clients.find(x=>x.id===a.clientId);
    A.addClientActivity?.('Cita confirmada',`${c?.name||'Cliente'} · ${a.date} ${a.time}`,c?.phone||'');
    A.persist();A.renderAppointments?.();A.lookupClientAppointments?.();A.toast('Cita confirmada');
  };

  A.rejectAppointment2032=function(id){
    const a=A.db.appointments.find(x=>x.id===id);if(!a||a.status!=='Pendiente')return;
    a.status='Rechazada';a.rejectedAt=new Date().toISOString();a.rejectedBy=A.currentUser?.()?.name||'Administrador';
    const c=A.db.clients.find(x=>x.id===a.clientId);
    A.addClientActivity?.('Cita rechazada',`${c?.name||'Cliente'} · ${a.date} ${a.time}`,c?.phone||'');
    A.persist();A.renderAppointments?.();A.lookupClientAppointments?.();A.toast('Solicitud de cita rechazada');
  };

  // Vista del cliente: estado inequívoco y sin sugerir que está confirmada antes de tiempo.
  A.lookupClientAppointments=function(){
    const c=A.currentClient?.(),root=A.byId('clientAppointmentsList');if(!root)return;
    if(!c){root.innerHTML='<div class="muted">Inicia sesión para ver tus citas.</div>';return}
    const data=A.db.appointments.filter(a=>a.clientId===c.id).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
    root.innerHTML=data.map(a=>{
      const req=(A.db.clientRequests||[]).filter(r=>r.appointmentId===a.id&&r.type==='reschedule').sort((x,y)=>(y.createdAt||'').localeCompare(x.createdAt||''))[0];
      const canManage=['Pendiente','Confirmada'].includes(a.status)&&req?.status!=='Pendiente';
      return `<div class="row"><div><strong>${esc(a.date)} ${esc(a.time)}</strong><small>${esc(A.serviceName(a.serviceId))} · ${esc(A.barberName(a.barberId))} · <strong>${esc(statusLabel(a.status))}</strong>${req?` · Reprogramación: ${esc(req.status)}${req.status==='Pendiente'?` → ${esc(req.newDate)} ${esc(req.newTime)}`:''}`:''}</small>${a.status==='Pendiente'?'<div class="muted">El negocio todavía debe confirmar esta cita.</div>':''}${a.status==='Rechazada'?'<div class="muted">Esta solicitud no fue confirmada. Puedes reservar otro horario disponible.</div>':''}</div>${canManage?`<div class="request-actions"><button class="btn secondary" onclick="App.openReschedule('${a.id}')">Reprogramar</button><button class="btn danger" onclick="App.requestAppointmentChange('${a.id}','cancel')">Cancelar</button></div>`:''}</div>`;
    }).join('')||'<div class="muted">No tienes citas registradas.</div>';
  };

  // Vista administrativa: una solicitud nueva requiere decisión explícita.
  const previousRender=A.renderAppointments;
  A.renderAppointments=function(){
    previousRender?.();
    const root=A.byId('appointmentList');if(!root)return;
    const q=A.filters.appointments||'';
    const data=A.db.appointments.slice().reverse().filter(a=>!q||A.clientName(a.clientId).toLowerCase().includes(q)||A.barberName(a.barberId).toLowerCase().includes(q)||A.serviceName(a.serviceId).toLowerCase().includes(q));
    root.innerHTML=data.map(a=>`<div class="row"><div><strong>${esc(a.date)} ${esc(a.time)} · ${esc(A.clientName(a.clientId))}</strong><small>${esc(A.serviceName(a.serviceId))} · ${esc(A.barberName(a.barberId))} · <strong>${esc(statusLabel(a.status))}</strong>${a.source==='client-account'&&a.status==='Pendiente'?' · Solicitud desde App Cliente':''}</small></div><div class="manage-actions">${a.status==='Pendiente'?`<button class="btn primary" onclick="App.confirmAppointment2032('${a.id}')">Confirmar</button><button class="btn danger" onclick="App.rejectAppointment2032('${a.id}')">Rechazar</button>`:''}${a.status==='Confirmada'?`<button class="btn secondary" onclick="App.finishAppointment('${a.id}')">Finalizar</button>`:''}<button class="btn edit" onclick="App.editAppointment('${a.id}')">Editar</button><button class="btn danger" onclick="App.deleteAppointment('${a.id}')">${A.deleteButtonLabel()}</button></div></div>`).join('')||'<div class="muted">Sin citas.</div>';
    A.renderAgendaRequests?.();
    window.SaaS?.applyBusinessTerminology?.();
  };

  setTimeout(()=>{A.renderAppointments?.();A.lookupClientAppointments?.();},120);
})();
