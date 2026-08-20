SaaS.globalAudit=SaaS.globalAudit||[];

SaaS.audit=function(type,action,detail={},businessId=""){
  SaaS.globalAudit.push({
    id:SaaS.uid(),
    type:type||"BUSINESS",
    action:action||"",
    businessId:businessId||SaaS.getContext()?.businessId||"",
    businessName:SaaS.db.businesses.find(b=>b.id===(businessId||SaaS.getContext()?.businessId))?.name||"",
    user:window.FirebaseBridge?.user?.email||"local",
    detail,
    at:new Date().toISOString()
  });
  if(SaaS.globalAudit.length>3000)SaaS.globalAudit=SaaS.globalAudit.slice(-3000);
  localStorage.setItem("sambrix_global_audit",JSON.stringify(SaaS.globalAudit));
};

SaaS.loadGlobalAudit=function(){
  try{SaaS.globalAudit=JSON.parse(localStorage.getItem("sambrix_global_audit"))||[]}catch{SaaS.globalAudit=[]}
  // Bring prior support audit into unified log once.
  const known=new Set(SaaS.globalAudit.map(x=>x.id));
  (SaaS.db.supportAudit||[]).forEach(x=>{
    if(!known.has("support-"+x.id)){
      SaaS.globalAudit.push({id:"support-"+x.id,type:"SUPPORT",action:x.action==="ENTER"?"Entrada modo soporte":"Salida modo soporte",businessId:x.businessId,businessName:x.businessName,user:"SuperAdmin",detail:{},at:x.at});
    }
  });
  localStorage.setItem("sambrix_global_audit",JSON.stringify(SaaS.globalAudit));
};

SaaS.buildAlerts=function(){
  const alerts=[];
  const now=new Date();

  (SaaS.db.businesses||[]).forEach(b=>{
    const label=SaaS.subscriptionLabel?.(b)||b.status;
    const days=SaaS.daysUntil?.(b.nextPayment);

    if(label==="Vencido"||b.status==="Suspendido"){
      alerts.push({id:"sub-"+b.id,severity:"critical",kind:"subscription",businessId:b.id,title:`${b.name}: suscripción ${label.toLowerCase()}`,detail:"El negocio requiere revisión de pago o reactivación.",action:"Abrir suscripción"});
    }else if(days!==null&&days>=0&&days<=7){
      alerts.push({id:"due-"+b.id,severity:"warning",kind:"payment",businessId:b.id,title:`${b.name}: vence en ${days} día(s)`,detail:`Próximo pago: ${b.nextPayment}`,action:"Revisar cobro"});
    }

    if(!b.ownerEmail){
      alerts.push({id:"mail-"+b.id,severity:"warning",kind:"security",businessId:b.id,title:`${b.name}: dueño sin correo`,detail:"Agrega un correo real para recuperación de acceso y soporte.",action:"Abrir negocio"});
    }

    if(!b.branches?.length){
      alerts.push({id:"branch-"+b.id,severity:"critical",kind:"business",businessId:b.id,title:`${b.name}: sin sucursal`,detail:"El negocio no tiene una sucursal principal configurada.",action:"Configurar"});
    }

    const tenantRaw=localStorage.getItem(SaaS.tenantKey?.(b.id)||"");
    if(!tenantRaw){
      alerts.push({id:"state-"+b.id,severity:"info",kind:"sync",businessId:b.id,title:`${b.name}: sin copia local en este dispositivo`,detail:"Puede ser normal si nunca abriste este negocio aquí.",action:"Revisar"});
    }
  });

  const recentSupport=(SaaS.db.supportAudit||[]).filter(x=>Date.now()-new Date(x.at).getTime()<24*3600000);
  if(recentSupport.length){
    alerts.push({id:"support-recent",severity:"info",kind:"support",title:`${recentSupport.length} acceso(s) de soporte en 24h`,detail:"Revisa la auditoría si necesitas verificar cambios realizados.",action:"Ver auditoría"});
  }

  if(!window.FirebaseBridge?.connected){
    alerts.push({id:"firebase-offline",severity:"warning",kind:"sync",title:"Firebase no conectado",detail:"La aplicación puede seguir localmente, pero la sincronización multi-dispositivo no está activa.",action:"Configuración"});
  }

  SaaS.alerts=alerts;
  return alerts;
};

SaaS.renderAlerts=function(){
  const box=document.getElementById("alertsList");if(!box)return;
  const all=SaaS.buildAlerts();
  const severity=document.getElementById("alertSeverityFilter")?.value||"";
  const list=all.filter(a=>!severity||a.severity===severity);

  const critical=all.filter(a=>a.severity==="critical").length;
  const payments=all.filter(a=>a.kind==="payment"||a.kind==="subscription").length;
  const sync=all.filter(a=>a.kind==="sync").length;
  const support=all.filter(a=>a.kind==="support").length;

  document.getElementById("alertsCritical")&&(document.getElementById("alertsCritical").textContent=critical);
  document.getElementById("alertsPayments")&&(document.getElementById("alertsPayments").textContent=payments);
  document.getElementById("alertsSync")&&(document.getElementById("alertsSync").textContent=sync);
  document.getElementById("alertsSupport")&&(document.getElementById("alertsSupport").textContent=support);
  document.getElementById("superAlertBadge")&&(document.getElementById("superAlertBadge").textContent=critical+payments+sync);

  box.innerHTML=list.map(a=>`<div class="row alert-row ${a.severity}">
    <div><div style="display:flex;gap:8px;align-items:center;margin-bottom:3px"><span class="alert-severity ${a.severity}">${a.severity}</span><strong>${a.title}</strong></div><small>${a.detail}</small></div>
    <button class="btn secondary tiny" onclick="SaaS.handleAlert('${a.id}')">${a.action}</button>
  </div>`).join("")||'<div class="muted">No hay alertas con este filtro.</div>';
};

SaaS.handleAlert=function(id){
  const a=(SaaS.alerts||[]).find(x=>x.id===id);if(!a)return;
  if(a.businessId&&["subscription","payment"].includes(a.kind)){SaaS.enterBusiness(a.businessId);window.App?.go?.("saasSubscriptions");return}
  if(a.businessId){SaaS.enterBusiness(a.businessId);return}
  if(a.kind==="support"){window.App?.go?.("saasAudit");return}
  if(a.kind==="sync"){window.App?.go?.("configuracion");return}
};

SaaS.renderGlobalAudit=function(){
  const box=document.getElementById("globalAuditTable");if(!box)return;
  const q=(document.getElementById("globalAuditSearch")?.value||"").toLowerCase().trim();
  const type=document.getElementById("auditTypeFilter")?.value||"";
  const list=[...(SaaS.globalAudit||[])].reverse().filter(x=>{
    const text=`${x.businessName||""} ${x.user||""} ${x.action||""} ${x.type||""}`.toLowerCase();
    return (!q||text.includes(q))&&(!type||x.type===type);
  });
  box.innerHTML=`<table class="sambrix-table"><thead><tr><th>Fecha</th><th>Tipo</th><th>Negocio</th><th>Usuario</th><th>Acción</th><th>Detalle</th></tr></thead><tbody>${list.map(x=>`<tr>
    <td><span class="audit-time">${new Date(x.at).toLocaleString()}</span></td>
    <td>${x.type}</td><td>${x.businessName||"Plataforma"}</td><td>${x.user||"—"}</td><td><span class="audit-action">${x.action}</span></td>
    <td>${Object.keys(x.detail||{}).length?JSON.stringify(x.detail):"—"}</td>
  </tr>`).join("")}</tbody></table>`;
};

SaaS.exportAuditCSV=function(){
  const rows=[["Fecha","Tipo","Negocio","Usuario","Acción","Detalle"]];
  [...(SaaS.globalAudit||[])].forEach(x=>rows.push([x.at,x.type,x.businessName||"",x.user||"",x.action||"",JSON.stringify(x.detail||{})]));
  const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`sambrix-auditoria-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(a.href);
};

SaaS.runHealthCheck=function(){
  const checks=[];
  const add=(name,status,detail)=>checks.push({name,status,detail});

  add("Firebase",window.FirebaseBridge?.connected?"ok":"warn",window.FirebaseBridge?.connected?"Conectado a Firebase Authentication.":"Trabajando sin conexión Firebase.");
  add("Tiempo real",window.FirebaseBridge?.realtime?"ok":"warn",window.FirebaseBridge?.realtime?"Sincronización en tiempo real activa.":"Tiempo real no activo en este dispositivo.");
  add("Catálogo de negocios",SaaS.db.businesses?.length?"ok":"bad",`${SaaS.db.businesses?.length||0} negocio(s) registrados.`);
  add("Planes",SaaS.db.plans?.length>=3?"ok":"warn",`${SaaS.db.plans?.length||0} plan(es) configurados.`);
  add("Contexto actual",SaaS.getContext()?.businessId?"ok":"bad",SaaS.getContext()?.businessId||"Sin businessId.");
  add("Sucursal actual",SaaS.getContext()?.branchId?"ok":"warn",SaaS.getContext()?.branchId||"Sin branchId.");

  const invalidBusinesses=(SaaS.db.businesses||[]).filter(b=>!b.id||!b.name||!b.branches?.length);
  add("Integridad de negocios",invalidBusinesses.length?"bad":"ok",invalidBusinesses.length?`${invalidBusinesses.length} negocio(s) incompletos.`:"Todos los negocios tienen estructura mínima.");

  const recommendations=[];
  checks.filter(c=>c.status!=="ok").forEach(c=>{
    if(c.name==="Firebase")recommendations.push("Conecta Firebase desde Configuración para sincronización multi-dispositivo.");
    else if(c.name==="Tiempo real")recommendations.push("Activa sincronización en tiempo real después de conectar Firebase.");
    else if(c.name==="Integridad de negocios")recommendations.push("Revisa negocios sin nombre, ID o sucursal principal.");
    else recommendations.push(`Revisar: ${c.name}.`);
  });
  if(!recommendations.length)recommendations.push("No se detectaron problemas importantes.");

  const box=document.getElementById("healthChecks");
  if(box)box.innerHTML=checks.map(c=>`<div class="row"><div><strong><span class="health-dot ${c.status}"></span>${c.name}</strong><small>${c.detail}</small></div><strong class="health-${c.status==="ok"?"ok":c.status==="warn"?"warn":"bad"}">${c.status==="ok"?"OK":c.status==="warn"?"REVISAR":"ERROR"}</strong></div>`).join("");

  const rec=document.getElementById("healthRecommendations");
  if(rec)rec.innerHTML=recommendations.map(x=>`<div class="row"><span>${x}</span></div>`).join("");

  document.getElementById("healthFirebase")&&(document.getElementById("healthFirebase").textContent=window.FirebaseBridge?.connected?"Online":"Local");
  document.getElementById("healthBusinesses")&&(document.getElementById("healthBusinesses").textContent=(SaaS.db.businesses||[]).length);
  document.getElementById("healthUsers")&&(document.getElementById("healthUsers").textContent=(window.FirebaseBridge?.user?1:0));
  const bad=checks.filter(c=>c.status==="bad").length,warn=checks.filter(c=>c.status==="warn").length;
  document.getElementById("healthOverall")&&(document.getElementById("healthOverall").textContent=bad?"Crítico":warn?"Atención":"Excelente");
  SaaS.audit("SYNC","Revisión de salud del sistema",{bad,warn});
};

const oldStartSupport_138=SaaS.startSupport;
SaaS.startSupport=function(id){SaaS.audit("SUPPORT","Entrada a modo soporte",{},id);return oldStartSupport_138(id)};
const oldExitSupport_138=SaaS.exitSupport;
SaaS.exitSupport=function(){const id=SaaS.getContext()?.businessId;SaaS.audit("SUPPORT","Salida de modo soporte",{},id);return oldExitSupport_138()};
const oldRenew_138=SaaS.renewBusiness;
SaaS.renewBusiness=function(id,months){SaaS.audit("SUBSCRIPTION",`Renovación ${months} mes(es)`,{months},id);return oldRenew_138(id,months)};
const oldSuspend_138=SaaS.suspendBusiness;
SaaS.suspendBusiness=function(id){const b=SaaS.db.businesses.find(x=>x.id===id);SaaS.audit("SUBSCRIPTION",b?.status==="Suspendido"?"Reactivación":"Suspensión",{},id);return oldSuspend_138(id)};

const oldRenderAll_138=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_138();SaaS.renderAlerts();SaaS.renderGlobalAudit()};
