SaaS.renewalAlerts=SaaS.renewalAlerts||{
  policy:{firstAlertDays:30,priorityDays:7},
  contacts:[]
};

SaaS.loadRenewalAlerts=function(){
  try{
    const s=JSON.parse(localStorage.getItem("sambrix_renewal_alerts"))||{};
    SaaS.renewalAlerts={
      policy:{...SaaS.renewalAlerts.policy,...(s.policy||{})},
      contacts:s.contacts||[]
    };
  }catch{}
};

SaaS.saveRenewalAlerts=function(){
  localStorage.setItem("sambrix_renewal_alerts",JSON.stringify(SaaS.renewalAlerts));
};

SaaS.renewalDueDate=function(businessId){
  const last=[...SaaS.billingOps?.payments||[]].reverse().find(p=>p.businessId===businessId);
  const sub=SaaS.billingSubscriptionFor?.(businessId);
  return last?.nextDue||sub?.nextDue||sub?.renewalDate||sub?.endsAt||"";
};

SaaS.renewalAlertFor=function(businessId){
  const dueRaw=SaaS.renewalDueDate(businessId);
  if(!dueRaw)return null;

  const due=new Date(dueRaw+"T23:59:59");
  const now=new Date();
  const days=Math.ceil((due-now)/86400000);
  const first=Number(SaaS.renewalAlerts.policy.firstAlertDays||30);
  const priority=Number(SaaS.renewalAlerts.policy.priorityDays||7);

  let bucket="";
  if(days<0)bucket="Vencido";
  else if(days<=priority)bucket="7 días";
  else if(days<=first)bucket="30 días";
  else return null;

  const b=SaaS.db.businesses.find(x=>x.id===businessId);
  const contacted=SaaS.renewalAlerts.contacts.some(c=>c.businessId===businessId&&c.dueDate===dueRaw);

  return {
    businessId,
    businessName:b?.name||businessId,
    dueDate:dueRaw,
    days,
    bucket,
    contacted
  };
};

SaaS.markRenewalContacted=function(businessId,dueDate){
  const exists=SaaS.renewalAlerts.contacts.find(c=>c.businessId===businessId&&c.dueDate===dueDate);
  if(exists){
    exists.contactedAt=new Date().toISOString();
    exists.by=window.FirebaseBridge?.user?.email||"SuperAdmin";
  }else{
    SaaS.renewalAlerts.contacts.push({
      id:"renewal_contact_"+SaaS.uid(),
      businessId,
      dueDate,
      contactedAt:new Date().toISOString(),
      by:window.FirebaseBridge?.user?.email||"SuperAdmin"
    });
  }
  SaaS.saveRenewalAlerts();
  SaaS.audit?.("BILLING","Seguimiento de renovación registrado",{businessId,dueDate},businessId);
  SaaS.renderRenewalAlerts();
};

SaaS.saveRenewalAlertPolicy=function(){
  SaaS.renewalAlerts.policy.firstAlertDays=Math.max(7,Math.min(90,Number(document.getElementById("renewalFirstAlertDays").value||30)));
  SaaS.renewalAlerts.policy.priorityDays=Math.max(1,Math.min(30,Number(document.getElementById("renewalPriorityDays").value||7)));
  if(SaaS.renewalAlerts.policy.priorityDays>SaaS.renewalAlerts.policy.firstAlertDays){
    SaaS.renewalAlerts.policy.priorityDays=SaaS.renewalAlerts.policy.firstAlertDays;
  }
  SaaS.saveRenewalAlerts();
  SaaS.audit?.("BILLING","Ventanas de alerta de renovación actualizadas",SaaS.renewalAlerts.policy,"");
  SaaS.renderRenewalAlerts();
  window.App?.toast?.("Alertas actualizadas");
};

SaaS.renderRenewalAlerts=function(){
  const box=document.getElementById("renewalAlertList");if(!box)return;

  document.getElementById("renewalFirstAlertDays").value=SaaS.renewalAlerts.policy.firstAlertDays||30;
  document.getElementById("renewalPriorityDays").value=SaaS.renewalAlerts.policy.priorityDays||7;

  const filter=document.getElementById("renewalPriorityFilter")?.value||"";
  const alerts=(SaaS.db.businesses||[])
    .map(b=>SaaS.renewalAlertFor(b.id))
    .filter(Boolean)
    .sort((a,b)=>a.days-b.days);

  const visible=alerts.filter(a=>!filter||a.bucket===filter);

  document.getElementById("renewal30Count").textContent=alerts.filter(a=>a.days>=0&&a.days<=30).length;
  document.getElementById("renewal7Count").textContent=alerts.filter(a=>a.days>=0&&a.days<=7).length;
  document.getElementById("renewalOverdueCount").textContent=alerts.filter(a=>a.days<0).length;
  document.getElementById("renewalContactedCount").textContent=alerts.filter(a=>a.contacted).length;

  box.innerHTML=visible.map(a=>{
    const cls=a.days<0?"overdue":a.days<=Number(SaaS.renewalAlerts.policy.priorityDays||7)?"soon":"";
    const dayText=a.days<0?`${Math.abs(a.days)} día(s) vencido`:a.days===0?"vence hoy":`vence en ${a.days} día(s)`;
    return `<div class="row renewal-row ${cls} ${a.contacted?"renewal-contacted":""}">
      <div style="flex:1">
        <strong>${a.businessName}</strong>
        <small>${a.bucket} · ${a.dueDate} · ${dayText}</small>
        <div class="renewal-meta">${a.contacted?"Contacto registrado para este vencimiento":"Todavía no hay contacto registrado"}</div>
      </div>
      <div class="manage-actions">
        <span class="status ${a.contacted?"ok":""}">${a.contacted?"Contactado":"Pendiente"}</span>
        <button class="btn secondary tiny" onclick="SaaS.markRenewalContacted('${a.businessId}','${a.dueDate}')">${a.contacted?"Actualizar contacto":"Marcar contacto"}</button>
      </div>
    </div>`;
  }).join("")||'<div class="muted">No hay renovaciones con este filtro.</div>';

  document.getElementById("renewalContactHistory").innerHTML=[...SaaS.renewalAlerts.contacts].reverse().slice(0,30).map(c=>{
    const b=SaaS.db.businesses.find(x=>x.id===c.businessId);
    return `<div class="row renewal-row">
      <div><strong>${b?.name||c.businessId}</strong><small>Vencimiento ${c.dueDate} · contacto ${new Date(c.contactedAt).toLocaleString()} · ${c.by}</small></div>
    </div>`;
  }).join("")||'<div class="muted">Todavía no hay seguimientos registrados.</div>';

  const overdue=alerts.filter(a=>a.days<0&&!a.contacted).length;
  const urgent=alerts.filter(a=>a.days>=0&&a.days<=Number(SaaS.renewalAlerts.policy.priorityDays||7)&&!a.contacted).length;
  const result=document.getElementById("renewalAlertResult");

  if(overdue){
    result.className="launch-result blocked";
    result.innerHTML=`<span class="tag">ACCIÓN REQUERIDA</span><h2>${overdue} renovación(es) vencida(s) sin seguimiento</h2><p>Conviene contactar al negocio y registrar la gestión antes de decidir cualquier suspensión.</p>`;
  }else if(urgent){
    result.className="launch-result";
    result.innerHTML=`<span class="tag">PRÓXIMOS VENCIMIENTOS</span><h2>${urgent} renovación(es) prioritarias</h2><p>Están dentro de la ventana de ${SaaS.renewalAlerts.policy.priorityDays} días y aún no tienen contacto registrado.</p>`;
  }else{
    result.className="launch-result ready";
    result.innerHTML='<span class="tag">CONTROLADO</span><h2>Sin renovaciones urgentes sin seguimiento</h2><p>Las alertas actuales están atendidas o todavía fuera de la ventana prioritaria.</p>';
  }
};

SaaS.refreshRenewalAlerts=function(){
  SaaS.renderRenewalAlerts();
  SaaS.audit?.("BILLING","Alertas de renovación revisadas",{},"");
};

const oldRenderAll_191=SaaS.renderAll;
SaaS.renderAll=function(){
  oldRenderAll_191();
  SaaS.renderRenewalAlerts();
};
