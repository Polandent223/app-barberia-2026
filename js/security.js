App.isAdmin=function(){return App.currentUser()?.role==="Administrador"};

App.entityLabel=function(type,id){
  if(type==="client")return App.db.clients.find(x=>x.id===id)?.name||"Cliente";
  if(type==="barber")return App.db.barbers.find(x=>x.id===id)?.name||"Barbero";
  if(type==="product")return App.db.products.find(x=>x.id===id)?.name||"Producto";
  if(type==="service")return App.db.services.find(x=>x.id===id)?.name||"Servicio";
  if(type==="appointment"){
    const a=App.db.appointments.find(x=>x.id===id);
    return a?`${App.clientName(a.clientId)} · ${a.date} ${a.time}`:"Cita";
  }
  if(type==="user")return App.db.users.find(x=>x.id===id)?.login||"Usuario";
  if(type==="sale")return "Recibo #"+(App.db.sales.find(x=>x.id===id)?.number||"");
  return type;
};

App.requestDelete=function(type,id){
  if(App.isAdmin()){
    App.confirmAction("Eliminar definitivamente",`¿Deseas eliminar ${App.entityLabel(type,id)}?`,()=>App.executeDelete(type,id));
    return;
  }
  const duplicate=App.db.approvalRequests.some(r=>r.status==="Pendiente"&&r.type===type&&r.entityId===id);
  if(duplicate)return App.toast("Ya existe una solicitud pendiente");
  const u=App.currentUser();
  App.db.approvalRequests.push({
    id:App.uid(),
    action:"Eliminar",
    type,
    entityId:id,
    entityLabel:App.entityLabel(type,id),
    requestedById:u?.id||"",
    requestedBy:u?.name||u?.login||"Usuario",
    requestedRole:u?.role||"",
    requestedAt:new Date().toISOString(),
    status:"Pendiente",
    reviewedBy:"",
    reviewedAt:""
  });
  App.logAction("Solicitud de eliminación","Seguridad",`${type}: ${App.entityLabel(type,id)}`);localStorage.setItem(App.KEY,JSON.stringify(App.db));
  App.renderAll();
  App.toast("Solicitud enviada al administrador");
};

App.executeDelete=function(type,id){
  if(type==="client"){
    App.db.clients=App.db.clients.filter(x=>x.id!==id);
    App.db.appointments=App.db.appointments.filter(a=>a.clientId!==id);
  }
  if(type==="barber"){
    App.db.barbers=App.db.barbers.filter(x=>x.id!==id);
    App.db.appointments=App.db.appointments.filter(a=>a.barberId!==id);
  }
  if(type==="product"){
    App.db.products=App.db.products.filter(x=>x.id!==id);
    App.db.stockMoves=App.db.stockMoves.filter(x=>x.productId!==id);
  }
  if(type==="service"){
    App.db.services=App.db.services.filter(x=>x.id!==id);
    App.db.appointments=App.db.appointments.filter(a=>a.serviceId!==id);
  }
  if(type==="appointment"){
    App.db.appointments=App.db.appointments.filter(x=>x.id!==id);
  }
  if(type==="user"){
    if(App.db.users.length<=1)return App.toast("Debe quedar al menos un usuario");
    App.db.users=App.db.users.filter(x=>x.id!==id);
  }
  if(type==="sale"){
    const s=App.db.sales.find(x=>x.id===id);
    if(s){
      App.db.sales=App.db.sales.filter(x=>x.id!==id);
      App.db.cash=App.db.cash.filter(c=>c.saleId!==id);
    }
  }
  App.persist();
};

App.approveRequest=function(id){
  if(!App.isAdmin())return App.toast("Solo el administrador puede aprobar");
  const r=App.db.approvalRequests.find(x=>x.id===id);if(!r||r.status!=="Pendiente")return;
  App.confirmAction("Aprobar eliminación",`Eliminar definitivamente: ${r.entityLabel}`,()=>{
    App.executeDelete(r.type,r.entityId);
    r.status="Aprobada";r.reviewedBy=App.currentUser()?.name||"Administrador";r.reviewedAt=new Date().toISOString();App.logAction("Eliminación aprobada","Seguridad",r.entityLabel);
    localStorage.setItem(App.KEY,JSON.stringify(App.db));App.renderAll();App.toast("Solicitud aprobada");
  });
};
App.rejectRequest=function(id){
  if(!App.isAdmin())return;
  const r=App.db.approvalRequests.find(x=>x.id===id);if(!r||r.status!=="Pendiente")return;
  r.status="Rechazada";r.reviewedBy=App.currentUser()?.name||"Administrador";r.reviewedAt=new Date().toISOString();App.logAction("Eliminación rechazada","Seguridad",r.entityLabel);
  localStorage.setItem(App.KEY,JSON.stringify(App.db));App.renderAll();App.toast("Solicitud rechazada");
};

App.renderApprovals=function(){
  if(!App.byId("approvalList"))return;
  const all=App.db.approvalRequests||[];
  const pending=all.filter(r=>r.status==="Pendiente");
  App.byId("approvalPendingCount").textContent=pending.length;
  App.byId("approvalApprovedCount").textContent=all.filter(r=>r.status==="Aprobada").length;
  App.byId("approvalRejectedCount").textContent=all.filter(r=>r.status==="Rechazada").length;
  App.byId("approvalTodayCount").textContent=all.filter(r=>r.requestedAt?.slice(0,10)===App.today()).length;

  App.byId("approvalList").innerHTML=pending.map(r=>`
    <div class="row">
      <div>
        <strong>${r.action}: ${r.entityLabel}</strong>
        <small>${r.requestedBy} · ${r.requestedRole} · ${new Date(r.requestedAt).toLocaleString()}</small>
      </div>
      <div class="manage-actions">
        <button class="btn primary" onclick="App.approveRequest('${r.id}')">Aprobar</button>
        <button class="btn danger" onclick="App.rejectRequest('${r.id}')">Rechazar</button>
      </div>
    </div>`).join("")||'<div class="muted">No hay solicitudes pendientes.</div>';

  App.byId("approvalHistory").innerHTML=all.filter(r=>r.status!=="Pendiente").slice().reverse().map(r=>`
    <div class="row">
      <div>
        <strong>${r.entityLabel}</strong>
        <small>${r.requestedBy} solicitó eliminar · revisó ${r.reviewedBy||"Administrador"}</small>
      </div>
      <span class="${r.status==="Aprobada"?"approval-approved":"approval-rejected"}">${r.status}</span>
    </div>`).join("")||'<div class="muted">Sin historial.</div>';
};

App.deleteButtonLabel=function(){
  return App.isAdmin()?"Eliminar":"Solicitar eliminación";
};
