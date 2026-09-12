(function(){
  const approvedDeletes=new Set();
  const ENTITY_PAGE={client:"clientes",barber:"barberos",product:"inventario",service:"servicios",appointment:"citas",sale:"recibos",user:"configuracion"};

  function saasRole(){return String(window.SaaS?.session?.role||"").toLowerCase()}
  function deletionAdmin(){
    const role=saasRole();
    if(role&&role!=="guest")return ["owner","admin","superadmin"].includes(role);
    return App.currentUser()?.role==="Administrador";
  }
  function canAccessEntity(type){
    const page=ENTITY_PAGE[type];
    if(!page)return false;
    if(saasRole()==="superadmin")return false;
    return !!App.allowed?.(page);
  }
  function reviewerName(){
    const user=window.SaaS?.session?.user;
    return user?.displayName||user?.email||App.currentUser()?.name||App.currentUser()?.login||"Administrador";
  }
  function requestUser(){
    const u=App.currentUser();
    const s=window.SaaS?.session;
    return {
      id:s?.user?.uid||u?.id||"",
      name:s?.user?.displayName||s?.user?.email||u?.name||u?.login||"Usuario",
      role:s?.role||u?.role||""
    };
  }

  App.isAdmin=deletionAdmin;

  App.entityLabel=function(type,id){
    if(type==="client")return App.db.clients.find(x=>x.id===id)?.name||"Cliente";
    if(type==="barber")return App.db.barbers.find(x=>x.id===id)?.name||(App.businessVocabulary?.().staffOne||"Profesional");
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

  App.financialDeleteBlockReason=function(type,id){
    const finalized=a=>a&&(a.status==="Finalizada"||!!a.finalizedAccountingAt);
    if(type==="appointment"){
      const a=(App.db.appointments||[]).find(x=>x.id===id);
      if(finalized(a)||(App.db.sales||[]).some(s=>s.appointmentId===id)||(App.db.cash||[]).some(c=>c.appointmentId===id))
        return "Esta cita ya tiene cierre financiero. No se puede eliminar porque rompería la caja y el historial.";
    }
    if(type==="sale"){
      const s=(App.db.sales||[]).find(x=>x.id===id);
      const a=s?.appointmentId?(App.db.appointments||[]).find(x=>x.id===s.appointmentId):null;
      if(s?.appointmentId||finalized(a)||(App.db.cash||[]).some(c=>c.saleId===id))
        return "Este recibo pertenece a un cobro cerrado. No se puede eliminar directamente.";
    }
    if(type==="client"){
      const protectedAppt=(App.db.appointments||[]).some(a=>a.clientId===id&&finalized(a));
      const protectedSale=(App.db.sales||[]).some(s=>s.clientId===id);
      if(protectedAppt||protectedSale)return "Este cliente tiene servicios cobrados. Conserva el cliente para mantener íntegro el historial contable.";
    }
    if(type==="barber"){
      const protectedAppt=(App.db.appointments||[]).some(a=>a.barberId===id&&finalized(a));
      const protectedSale=(App.db.sales||[]).some(s=>s.barberId===id);
      if(protectedAppt||protectedSale)return "Este profesional tiene servicios cobrados. No se puede eliminar porque forma parte del historial contable.";
    }
    if(type==="service"){
      const protectedAppt=(App.db.appointments||[]).some(a=>a.serviceId===id&&finalized(a));
      const protectedSale=(App.db.sales||[]).some(s=>s.serviceId===id||(s.items||[]).some(i=>i.serviceId===id));
      if(protectedAppt||protectedSale)return "Este servicio aparece en cobros históricos. No se puede eliminar; puedes dejarlo inactivo sin alterar recibos anteriores.";
    }
    return "";
  };

  App.requestDelete=function(type,id){
    if(!canAccessEntity(type))return App.toast("No tienes permiso para modificar esta información");
    const blocked=App.financialDeleteBlockReason(type,id);
    if(blocked)return App.toast(blocked);
    if(deletionAdmin()){
      App.confirmAction("Eliminar definitivamente",`¿Deseas eliminar ${App.entityLabel(type,id)}?`,()=>{
        approvedDeletes.add(`${type}:${id}`);
        App.executeDelete(type,id);
      });
      return;
    }
    const duplicate=(App.db.approvalRequests||[]).some(r=>r.status==="Pendiente"&&r.type===type&&r.entityId===id);
    if(duplicate)return App.toast("Ya existe una solicitud pendiente");
    const u=requestUser();
    App.db.approvalRequests=App.db.approvalRequests||[];
    App.db.approvalRequests.push({
      id:App.uid(),action:"Eliminar",type,entityId:id,entityLabel:App.entityLabel(type,id),
      requestedById:u.id,requestedBy:u.name,requestedRole:u.role,
      requestedAt:new Date().toISOString(),status:"Pendiente",reviewedBy:"",reviewedAt:""
    });
    App.logAction("Solicitud de eliminación","Seguridad",`${type}: ${App.entityLabel(type,id)}`);
    App.persist();
    App.toast("Solicitud enviada al administrador");
  };

  App.executeDelete=function(type,id){
    const key=`${type}:${id}`;
    const authorized=deletionAdmin()||approvedDeletes.has(key);
    approvedDeletes.delete(key);
    if(!authorized)return App.toast("No tienes autorización para eliminar definitivamente");
    if(!canAccessEntity(type)&&saasRole()!=="superadmin")return App.toast("No tienes permiso para modificar esta información");
    const blocked=App.financialDeleteBlockReason(type,id);
    if(blocked)return App.toast(blocked);

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
    if(type==="appointment")App.db.appointments=App.db.appointments.filter(x=>x.id!==id);
    if(type==="user"){
      if(App.db.users.length<=1)return App.toast("Debe quedar al menos un usuario");
      App.db.users=App.db.users.filter(x=>x.id!==id);
    }
    if(type==="sale"){
      App.db.sales=App.db.sales.filter(x=>x.id!==id);
      App.db.cash=App.db.cash.filter(c=>c.saleId!==id);
    }
    App.persist();
  };

  App.approveRequest=function(id){
    if(!deletionAdmin())return App.toast("Solo el dueño o administrador puede aprobar eliminaciones");
    const r=(App.db.approvalRequests||[]).find(x=>x.id===id);if(!r||r.status!=="Pendiente")return;
    const blocked=App.financialDeleteBlockReason(r.type,r.entityId);
    if(blocked){
      r.status="Rechazada";r.reviewedBy=reviewerName();r.reviewedAt=new Date().toISOString();
      App.persist();return App.toast(blocked);
    }
    App.confirmAction("Aprobar eliminación",`Eliminar definitivamente: ${r.entityLabel}`,()=>{
      approvedDeletes.add(`${r.type}:${r.entityId}`);
      App.executeDelete(r.type,r.entityId);
      const stillExists=(App.db.approvalRequests||[]).includes(r);
      if(!stillExists)return;
      r.status="Aprobada";r.reviewedBy=reviewerName();r.reviewedAt=new Date().toISOString();
      App.logAction("Eliminación aprobada","Seguridad",r.entityLabel);App.persist();App.toast("Solicitud aprobada");
    });
  };

  App.rejectRequest=function(id){
    if(!deletionAdmin())return App.toast("Solo el dueño o administrador puede revisar eliminaciones");
    const r=(App.db.approvalRequests||[]).find(x=>x.id===id);if(!r||r.status!=="Pendiente")return;
    r.status="Rechazada";r.reviewedBy=reviewerName();r.reviewedAt=new Date().toISOString();
    App.logAction("Eliminación rechazada","Seguridad",r.entityLabel);App.persist();App.toast("Solicitud rechazada");
  };

  App.renderApprovals=function(){
    if(!App.byId("approvalList"))return;
    const all=App.db.approvalRequests||[],pending=all.filter(r=>r.status==="Pendiente");
    App.byId("approvalPendingCount").textContent=pending.length;
    App.byId("approvalApprovedCount").textContent=all.filter(r=>r.status==="Aprobada").length;
    App.byId("approvalRejectedCount").textContent=all.filter(r=>r.status==="Rechazada").length;
    App.byId("approvalTodayCount").textContent=all.filter(r=>r.requestedAt?.slice(0,10)===App.today()).length;
    const actions=deletionAdmin();
    App.byId("approvalList").innerHTML=pending.map(r=>`<div class="row"><div><strong>${r.action}: ${r.entityLabel}</strong><small>${r.requestedBy} · ${r.requestedRole} · ${new Date(r.requestedAt).toLocaleString()}</small></div>${actions?`<div class="manage-actions"><button class="btn primary" onclick="App.approveRequest('${r.id}')">Aprobar</button><button class="btn danger" onclick="App.rejectRequest('${r.id}')">Rechazar</button></div>`:""}</div>`).join("")||'<div class="muted">No hay solicitudes pendientes.</div>';
    App.byId("approvalHistory").innerHTML=all.filter(r=>r.status!=="Pendiente").slice().reverse().map(r=>`<div class="row"><div><strong>${r.entityLabel}</strong><small>${r.requestedBy} solicitó eliminar · revisó ${r.reviewedBy||"Administrador"}</small></div><span class="${r.status==="Aprobada"?"approval-approved":"approval-rejected"}">${r.status}</span></div>`).join("")||'<div class="muted">Sin historial.</div>';
  };

  App.deleteButtonLabel=function(){return deletionAdmin()?"Eliminar":"Solicitar eliminación"};
})();
