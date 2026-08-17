App.addClientActivity=function(type,detail,phone=""){
  App.db.clientActivity=App.db.clientActivity||[];
  App.db.clientActivity.push({id:App.uid(),type,detail,phone,at:new Date().toISOString()});
  if(App.db.clientActivity.length>1000)App.db.clientActivity=App.db.clientActivity.slice(-1000);
};

App.requestAppointmentChange=function(appointmentId,action){
  const a=App.db.appointments.find(x=>x.id===appointmentId);if(!a)return;
  const client=App.db.clients.find(c=>c.id===a.clientId);
  if(action==="cancel"){
    App.confirmAction("Solicitar cancelación",`Cita ${a.date} ${a.time}`,()=>{
      App.db.clientRequests.push({id:App.uid(),type:"cancel",appointmentId,status:"Pendiente",clientId:a.clientId,clientName:client?.name||"Cliente",phone:client?.phone||"",oldDate:a.date,oldTime:a.time,createdAt:new Date().toISOString()});
      App.addClientActivity("Solicitud de cancelación",`${client?.name||"Cliente"} · ${a.date} ${a.time}`,client?.phone||"");
      localStorage.setItem(App.KEY,JSON.stringify(App.db));App.renderAll();App.toast("Solicitud enviada al administrador");
    });
  }else{
    const date=prompt("Nueva fecha YYYY-MM-DD",a.date);if(!date)return;
    const time=prompt("Nueva hora HH:MM",a.time);if(!time)return;
    App.db.clientRequests.push({id:App.uid(),type:"reschedule",appointmentId,status:"Pendiente",clientId:a.clientId,clientName:client?.name||"Cliente",phone:client?.phone||"",oldDate:a.date,oldTime:a.time,newDate:date,newTime:time,createdAt:new Date().toISOString()});
    App.addClientActivity("Solicitud de reprogramación",`${client?.name||"Cliente"} · ${a.date} ${a.time} → ${date} ${time}`,client?.phone||"");
    localStorage.setItem(App.KEY,JSON.stringify(App.db));App.renderAll();App.toast("Solicitud enviada al administrador");
  }
};

App.approveClientRequest=function(id){
  const r=App.db.clientRequests.find(x=>x.id===id);if(!r||r.status!=="Pendiente")return;
  const a=App.db.appointments.find(x=>x.id===r.appointmentId);
  if(!a){r.status="Rechazada";localStorage.setItem(App.KEY,JSON.stringify(App.db));return App.renderAll()}
  if(r.type==="cancel")a.status="Cancelada";
  else{
    const candidate={...a,date:r.newDate,time:r.newTime};
    if(App.appointmentConflict(candidate,a.id))return App.toast("El nuevo horario está ocupado");
    a.date=r.newDate;a.time=r.newTime;a.status="Confirmada";
  }
  r.status="Aprobada";r.reviewedAt=new Date().toISOString();
  App.addClientActivity(r.type==="cancel"?"Cancelación aprobada":"Reprogramación aprobada",r.clientName,r.phone);
  App.logAction("Solicitud cliente aprobada","App Cliente",`${r.clientName} · ${r.type}`);
  localStorage.setItem(App.KEY,JSON.stringify(App.db));App.renderAll();App.toast("Solicitud aprobada");
};
App.rejectClientRequest=function(id){
  const r=App.db.clientRequests.find(x=>x.id===id);if(!r||r.status!=="Pendiente")return;
  r.status="Rechazada";r.reviewedAt=new Date().toISOString();
  App.addClientActivity("Solicitud rechazada",`${r.clientName} · ${r.type}`,r.phone);
  App.logAction("Solicitud cliente rechazada","App Cliente",`${r.clientName} · ${r.type}`);
  localStorage.setItem(App.KEY,JSON.stringify(App.db));App.renderAll();App.toast("Solicitud rechazada");
};

App.renderClientRequestAdmin=function(){
  if(!App.byId("clientRequestAdminList"))return;
  const pending=App.db.clientRequests.filter(r=>r.status==="Pendiente");
  const shopPending=App.db.shopOrders.filter(o=>["Pendiente","Reservado"].includes(o.status));
  App.byId("metricOnlineBookings").textContent=App.db.clientActivity.filter(x=>x.type==="Reserva online").length;
  App.byId("metricReschedules").textContent=App.db.clientRequests.filter(x=>x.type==="reschedule").length;
  App.byId("metricCancellations").textContent=App.db.clientRequests.filter(x=>x.type==="cancel").length;
  App.byId("metricShopOrders").textContent=App.db.shopOrders.length;
  const reqHtml=pending.map(r=>`
    <div class="row"><div><strong>${r.type==="cancel"?"Cancelar cita":"Reprogramar cita"} · ${r.clientName}</strong><small>${r.oldDate} ${r.oldTime}${r.type==="reschedule"?` → ${r.newDate} ${r.newTime}`:""}</small></div><div class="request-actions"><button class="btn primary" onclick="App.approveClientRequest('${r.id}')">Aprobar</button><button class="btn danger" onclick="App.rejectClientRequest('${r.id}')">Rechazar</button></div></div>`).join("");
  const shopHtml=shopPending.map(o=>`
    <div class="row shop-order-card"><div><strong>Compra · ${o.phone}</strong><small>${o.items.map(i=>`${i.qty}× ${i.name}`).join(", ")} · ${o.currency}${o.total.toFixed(2)} · ${o.status}${o.note?` · ${o.note}`:""}</small></div><div class="request-actions">${o.status==="Pendiente"?`<button class="btn primary" onclick="App.approveShopOrder('${o.id}')">Reservar</button><button class="btn danger" onclick="App.rejectShopOrder('${o.id}')">Rechazar</button>`:`<button class="btn danger" onclick="App.cancelShopOrder('${o.id}')">Cancelar reserva</button>`}</div></div>`).join("");
  App.byId("clientRequestAdminList").innerHTML=reqHtml+shopHtml||'<div class="muted">No hay solicitudes pendientes.</div>';
  const activity=[...(App.db.clientActivity||[])].slice().reverse().slice(0,100);
  App.byId("clientActivityAdminList").innerHTML=activity.map(x=>`<div class="row"><div><strong>${x.type}</strong><small>${x.detail}</small></div><span class="audit-chip">${new Date(x.at).toLocaleString()}</span></div>`).join("")||'<div class="muted">Sin actividad.</div>';
};
