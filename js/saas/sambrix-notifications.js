SaaS.notifications=SaaS.notifications||[];

SaaS.messageTemplates=[
  {id:"appt_confirm",name:"Confirmación de cita",text:"Hola {cliente}, tu cita en {negocio} está confirmada para el {fecha} a las {hora} con {profesional}."},
  {id:"appt_reminder",name:"Recordatorio de cita",text:"Hola {cliente}, te recordamos tu cita en {negocio} mañana a las {hora}. Si necesitas cambiarla, contáctanos."},
  {id:"booking_rejected",name:"Reserva no disponible",text:"Hola {cliente}, el horario solicitado en {negocio} ya no está disponible. Podemos ayudarte a elegir otro horario."},
  {id:"payment_due",name:"Suscripción SAMBRIX",text:"Tu suscripción SAMBRIX vence el {fecha}. Mantén tu cuenta activa para continuar usando todos los servicios."},
  {id:"stock_low",name:"Stock bajo",text:"Aviso interno: {producto} tiene stock bajo ({stock} unidades)."}
];

SaaS.loadNotifications=function(){
  try{SaaS.notifications=JSON.parse(localStorage.getItem("sambrix_notifications"))||[]}catch{SaaS.notifications=[]}
};
SaaS.saveNotifications=function(){localStorage.setItem("sambrix_notifications",JSON.stringify(SaaS.notifications))};

SaaS.notifKey=function(type,businessId,entityId){return `${type}:${businessId||"platform"}:${entityId||""}`};

SaaS.pushNotification=function(n){
  const key=n.key||SaaS.notifKey(n.type,n.businessId,n.entityId);
  const existing=SaaS.notifications.find(x=>x.key===key&&x.active!==false);
  if(existing){
    existing.title=n.title||existing.title;
    existing.message=n.message||existing.message;
    existing.updatedAt=new Date().toISOString();
    return existing;
  }
  const item={
    id:SaaS.uid(),key,
    type:n.type||"system",
    title:n.title||"Aviso",
    message:n.message||"",
    businessId:n.businessId||"",
    businessName:n.businessName||SaaS.db.businesses.find(b=>b.id===n.businessId)?.name||"",
    entityId:n.entityId||"",
    read:false,active:true,
    createdAt:new Date().toISOString(),
    action:n.action||""
  };
  SaaS.notifications.push(item);SaaS.saveNotifications();return item;
};

SaaS.generateNotifications=function(){
  const today=new Date();
  const currentId=SaaS.getContext?.()?.businessId||"";

  // Subscription alerts
  (SaaS.db.businesses||[]).forEach(b=>{
    const days=SaaS.daysUntil?.(b.nextPayment);
    if(days!==null&&days>=0&&days<=7){
      SaaS.pushNotification({type:"subscription",businessId:b.id,entityId:b.id,key:`subscription:${b.id}:${b.nextPayment}`,title:`${b.name}: suscripción próxima a vencer`,message:`Vence ${b.nextPayment} (${days} día(s)).`,action:"saasSubscriptions"});
    }
    if(["Suspendido","Vencido"].includes(SaaS.subscriptionLabel?.(b)||b.status)){
      SaaS.pushNotification({type:"subscription",businessId:b.id,entityId:b.id,key:`subscription-critical:${b.id}`,title:`${b.name}: cuenta no activa`,message:"Revisa pago, renovación o reactivación.",action:"saasSubscriptions"});
    }
  });

  // Current business appointments and stock
  if(currentId){
    const data=SaaS.loadTenantState?.(currentId)||window.App?.db||{};
    const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);
    const tdate=tomorrow.toISOString().slice(0,10);

    (data.appointments||[]).filter(a=>a.date===tdate&&a.status!=="Cancelada").forEach(a=>{
      const client=(data.clients||[]).find(c=>c.id===a.clientId);
      SaaS.pushNotification({
        type:"appointment",businessId:currentId,entityId:a.id,
        key:`appt:${currentId}:${a.id}:${a.date}`,
        title:`Cita mañana · ${a.time||""}`,
        message:`${client?.name||"Cliente"} · ${SaaS.serviceName?.(a.serviceId)||a.serviceId||"Servicio"}`,
        action:"citas"
      });
    });

    (data.products||[]).filter(p=>Number(p.stock||0)<=Number(p.minStock||p.minimumStock||2)).forEach(p=>{
      SaaS.pushNotification({
        type:"stock",businessId:currentId,entityId:p.id,
        key:`stock:${currentId}:${p.id}:${p.stock}`,
        title:`Stock bajo: ${p.name||"Producto"}`,
        message:`Quedan ${Number(p.stock||0)} unidad(es).`,
        action:"inventario"
      });
    });
  }

  // Pending public bookings
  (SaaS.bookingInbox||[]).filter(r=>r.status==="Pendiente").forEach(r=>{
    SaaS.pushNotification({
      type:"booking",businessId:currentId,entityId:r.id,
      key:`booking:${currentId}:${r.id}`,
      title:`Nueva solicitud de ${r.name||"cliente"}`,
      message:`${r.date||""} · ${r.time||""}`,
      action:"bookingInbox"
    });
  });

  SaaS.saveNotifications();SaaS.renderNotifications();
};

SaaS.renderNotifications=function(){
  const box=document.getElementById("notificationsList");if(!box)return;
  const type=document.getElementById("notifTypeFilter")?.value||"";
  const read=document.getElementById("notifReadFilter")?.value||"";
  const rows=[...SaaS.notifications].filter(n=>n.active!==false).reverse().filter(n=>{
    return (!type||n.type===type)&&(!read||(read==="read"?n.read:!n.read));
  });

  const unread=SaaS.notifications.filter(n=>n.active!==false&&!n.read).length;
  const currentId=SaaS.getContext?.()?.businessId||"";
  const appts=SaaS.notifications.filter(n=>n.type==="appointment"&&!n.read&&(n.businessId===currentId||!currentId)).length;
  const stock=SaaS.notifications.filter(n=>n.type==="stock"&&!n.read&&(n.businessId===currentId||!currentId)).length;
  const subs=SaaS.notifications.filter(n=>n.type==="subscription"&&!n.read).length;

  document.getElementById("notifUnreadCount")&&(document.getElementById("notifUnreadCount").textContent=unread);
  document.getElementById("notifAppointmentCount")&&(document.getElementById("notifAppointmentCount").textContent=appts);
  document.getElementById("notifStockCount")&&(document.getElementById("notifStockCount").textContent=stock);
  document.getElementById("notifSubscriptionCount")&&(document.getElementById("notifSubscriptionCount").textContent=subs);
  document.getElementById("notifTopBadge")&&(document.getElementById("notifTopBadge").textContent=unread);

  const icons={appointment:"◷",booking:"✉",stock:"▣",subscription:"$",system:"!"};
  box.innerHTML=rows.map(n=>`<div class="row notification-row ${n.type} ${n.read?"":"unread"}">
    <div class="notification-icon">${icons[n.type]||"!"}</div>
    <div class="notification-body">
      <strong>${n.title}</strong><small>${n.message}</small>
      <div class="notification-meta">${n.businessName||"SAMBRIX"} · ${new Date(n.createdAt).toLocaleString()}</div>
    </div>
    <div class="manage-actions">
      ${n.action?`<button class="btn secondary tiny" onclick="SaaS.openNotification('${n.id}')">Abrir</button>`:""}
      <button class="btn secondary tiny" onclick="SaaS.toggleNotificationRead('${n.id}')">${n.read?"No leída":"Leída"}</button>
    </div>
  </div>`).join("")||'<div class="muted">No hay notificaciones con este filtro.</div>';

  const templates=document.getElementById("messageTemplatesList");
  if(templates){
    templates.innerHTML=SaaS.messageTemplates.map(t=>`<div class="template-card"><strong>${t.name}</strong><textarea id="template_${t.id}">${t.text}</textarea><div class="actions"><button class="btn secondary tiny" onclick="SaaS.copyTemplate('${t.id}')">Copiar</button></div></div>`).join("");
  }
};

SaaS.openNotification=function(id){
  const n=SaaS.notifications.find(x=>x.id===id);if(!n)return;
  n.read=true;SaaS.saveNotifications();
  if(n.businessId&&SaaS.db.businesses.some(b=>b.id===n.businessId)&&SaaS.getContext()?.businessId!==n.businessId){
    SaaS.enterBusiness?.(n.businessId);
  }
  if(n.action)window.App?.go?.(n.action);
  SaaS.renderNotifications();
};

SaaS.toggleNotificationRead=function(id){
  const n=SaaS.notifications.find(x=>x.id===id);if(!n)return;
  n.read=!n.read;SaaS.saveNotifications();SaaS.renderNotifications();
};

SaaS.markAllNotificationsRead=function(){
  SaaS.notifications.forEach(n=>n.read=true);SaaS.saveNotifications();SaaS.renderNotifications();
};

SaaS.copyTemplate=async function(id){
  const el=document.getElementById(`template_${id}`);
  if(!el)return;
  try{await navigator.clipboard.writeText(el.value);window.App?.toast?.("Mensaje copiado")}catch{el.select()}
};

const oldApprove_146=SaaS.approvePublicBooking;
if(oldApprove_146){
  SaaS.approvePublicBooking=async function(id){
    const req=SaaS.bookingInbox.find(x=>x.id===id);
    const result=await oldApprove_146(id);
    if(req){
      SaaS.pushNotification({type:"booking",businessId:SaaS.getContext()?.businessId||"",entityId:id,key:`booking-approved:${id}`,title:`Reserva aprobada: ${req.name||"Cliente"}`,message:`${req.date||""} · ${req.time||""}`,action:"citas"});
      SaaS.saveNotifications();SaaS.renderNotifications();
    }
    return result;
  };
}

const oldReject_146=SaaS.rejectPublicBooking;
if(oldReject_146){
  SaaS.rejectPublicBooking=async function(id){
    const req=SaaS.bookingInbox.find(x=>x.id===id);
    const result=await oldReject_146(id);
    if(req){
      SaaS.pushNotification({type:"booking",businessId:SaaS.getContext()?.businessId||"",entityId:id,key:`booking-rejected:${id}`,title:`Reserva rechazada: ${req.name||"Cliente"}`,message:`${req.date||""} · ${req.time||""}`,action:"bookingInbox"});
      SaaS.saveNotifications();SaaS.renderNotifications();
    }
    return result;
  };
}

const oldRenderAll_146=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_146();SaaS.renderNotifications()};
