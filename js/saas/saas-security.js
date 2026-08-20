SaaS.permissionRequests=SaaS.permissionRequests||[];

SaaS.securityPolicy={
  superadmin:["view_all_businesses","edit_any_business","manage_plans","manage_subscriptions","support_mode","approve_deletions","platform_settings","audit"],
  owner:["view_business","edit_business","manage_staff","manage_clients","manage_inventory","manage_cash","request_deletion"],
  manager:["view_business","manage_appointments","manage_clients","manage_inventory","manage_cash","request_deletion"],
  cashier:["view_business","manage_sales","manage_cash","request_deletion"],
  barber:["view_schedule","manage_own_appointments","request_deletion"]
};

SaaS.protectedActions=[
  {key:"delete_sale",name:"Eliminar una venta",roles:["superadmin"],requestable:true},
  {key:"delete_inventory",name:"Eliminar producto/movimiento",roles:["superadmin"],requestable:true},
  {key:"delete_payment",name:"Eliminar pago",roles:["superadmin"],requestable:true},
  {key:"delete_employee",name:"Eliminar empleado",roles:["superadmin","owner"],requestable:true},
  {key:"change_plan",name:"Cambiar plan SAMBRIX",roles:["superadmin"],requestable:false},
  {key:"suspend_business",name:"Suspender negocio",roles:["superadmin"],requestable:false}
];

SaaS.loadSecurity=function(){
  try{SaaS.permissionRequests=JSON.parse(localStorage.getItem("sambrix_permission_requests"))||[]}catch{SaaS.permissionRequests=[]}
};
SaaS.saveSecurity=function(){localStorage.setItem("sambrix_permission_requests",JSON.stringify(SaaS.permissionRequests))};

SaaS.currentSecurityRole=function(){
  const explicit=SaaS.session?.role||window.App?.session?.role||window.App?.currentUser?.role||"";
  if(explicit)return String(explicit).toLowerCase();
  if(document.body.dataset.loginMode==="superadmin")return "superadmin";
  return "owner";
};

SaaS.can=function(permission){
  const role=SaaS.currentSecurityRole();
  return (SaaS.securityPolicy[role]||[]).includes(permission);
};

SaaS.requestPermission=function(action,entityId="",detail={}){
  const ctx=SaaS.getContext?.()||{};
  const req={
    id:SaaS.uid(),action,entityId,detail,
    businessId:ctx.businessId||"",
    businessName:SaaS.db.businesses.find(b=>b.id===ctx.businessId)?.name||"",
    requestedBy:window.FirebaseBridge?.user?.email||SaaS.currentSecurityRole(),
    requestedRole:SaaS.currentSecurityRole(),
    status:"pending",createdAt:new Date().toISOString()
  };
  SaaS.permissionRequests.push(req);SaaS.saveSecurity();
  SaaS.audit?.("SECURITY","Solicitud de permiso creada",{action,requestId:req.id},ctx.businessId);
  SaaS.renderSecurity();
  return req;
};

SaaS.resolvePermission=function(id,status){
  const req=SaaS.permissionRequests.find(x=>x.id===id);if(!req)return;
  req.status=status;req.resolvedAt=new Date().toISOString();req.resolvedBy=window.FirebaseBridge?.user?.email||"SuperAdmin";
  SaaS.saveSecurity();SaaS.audit?.("SECURITY",status==="approved"?"Permiso aprobado":"Permiso rechazado",{action:req.action,requestId:id},req.businessId);SaaS.renderSecurity();
};

SaaS.requireProtectedAction=function(action,entityId="",detail={}){
  const policy=SaaS.protectedActions.find(x=>x.key===action);
  const role=SaaS.currentSecurityRole();
  if(!policy||policy.roles.includes(role))return true;
  if(policy.requestable){
    SaaS.requestPermission(action,entityId,detail);
    window.App?.toast?.("Solicitud enviada al administrador");
  }else{
    window.App?.toast?.("No tienes permiso para realizar esta acción");
  }
  return false;
};

SaaS.renderSecurity=function(){
  const list=document.getElementById("permissionRequestsList");if(!list)return;
  const pending=SaaS.permissionRequests.filter(x=>x.status==="pending");
  document.getElementById("securityPendingCount").textContent=pending.length;
  document.getElementById("securityBusinessCount").textContent=SaaS.db.businesses.length;
  document.getElementById("securitySensitiveCount").textContent=SaaS.protectedActions.length;
  document.getElementById("securityCurrentRole").textContent=SaaS.currentSecurityRole().toUpperCase();
  document.getElementById("securityCurrentUser").textContent=window.FirebaseBridge?.user?.email||"Sesión local";

  list.innerHTML=[...SaaS.permissionRequests].reverse().map(r=>`<div class="row security-request ${r.status}">
    <div><strong>${r.businessName||"Plataforma"} · ${r.action}</strong><small>${r.requestedBy} · ${new Date(r.createdAt).toLocaleString()} · ${r.status}</small></div>
    ${r.status==="pending"?`<div class="security-actions"><button class="btn primary tiny" onclick="SaaS.resolvePermission('${r.id}','approved')">Aprobar</button><button class="btn secondary tiny" onclick="SaaS.resolvePermission('${r.id}','denied')">Rechazar</button></div>`:""}
  </div>`).join("")||'<div class="muted">No hay solicitudes.</div>';

  document.getElementById("protectedActionsList").innerHTML=SaaS.protectedActions.map(a=>`<div class="row"><div><strong>${a.name}</strong><small>${a.requestable?"Puede solicitar autorización":"Solo rol autorizado"}</small></div><span class="permission-chip">${a.roles.join(", ")}</span></div>`).join("");

  const perms=["Ver negocio","Editar negocio","Personal","Clientes","Inventario","Caja","Solicitar eliminación","SuperAdmin"];
  const roles=[
    ["SuperAdmin",[1,1,1,1,1,1,1,1]],
    ["Dueño",[1,1,1,1,1,1,1,0]],
    ["Gerente",[1,0,0,1,1,1,1,0]],
    ["Cajero",[1,0,0,0,0,1,1,0]],
    ["Barbero",[1,0,0,0,0,0,1,0]]
  ];
  document.getElementById("roleMatrix").innerHTML=`<table class="sambrix-table"><thead><tr><th>Rol</th>${perms.map(p=>`<th>${p}</th>`).join("")}</tr></thead><tbody>${roles.map(r=>`<tr><td><strong>${r[0]}</strong></td>${r[1].map(v=>`<td><span class="permission-chip ${v?"yes":"no"}">${v?"Sí":"No"}</span></td>`).join("")}</tr>`).join("")}</tbody></table>`;
};

const oldRenderAll_142=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_142();SaaS.renderSecurity()};
