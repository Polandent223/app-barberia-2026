SaaS.firebaseRuleRoles=[
  {role:"superadmin",platform:true,ownBusiness:true,otherBusiness:true,publicWrite:true,resolveBookings:true},
  {role:"owner",platform:false,ownBusiness:true,otherBusiness:false,publicWrite:true,resolveBookings:true},
  {role:"admin",platform:false,ownBusiness:true,otherBusiness:false,publicWrite:true,resolveBookings:true},
  {role:"manager",platform:false,ownBusiness:true,otherBusiness:false,publicWrite:true,resolveBookings:true},
  {role:"reception",platform:false,ownBusiness:true,otherBusiness:false,publicWrite:false,resolveBookings:true},
  {role:"cashier",platform:false,ownBusiness:true,otherBusiness:false,publicWrite:false,resolveBookings:false},
  {role:"barber",platform:false,ownBusiness:true,otherBusiness:false,publicWrite:false,resolveBookings:false}
];

SaaS.firebaseRulesChecks=function(){
  const businesses=SaaS.db.businesses||[];
  const businessIdsUnique=new Set(businesses.map(b=>b.id)).size===businesses.length;
  const allHaveIds=businesses.every(b=>!!b.id);
  const authReady=typeof SaaS.resolveFirebaseSession==="function";
  const rolesReady=typeof SaaS.currentSecurityRole==="function";
  const publicBooking=typeof SaaS.approvePublicBooking==="function";

  return [
    {name:"businessId único",status:businessIdsUnique&&allHaveIds?"pass":"fail",detail:businessIdsUnique&&allHaveIds?"Todos los negocios tienen ID único.":"Hay IDs faltantes o repetidos."},
    {name:"Autenticación por sesión",status:authReady?"pass":"fail",detail:authReady?"Resolver de sesión cargado.":"No se detecta resolver de sesión."},
    {name:"Roles internos",status:rolesReady?"pass":"fail",detail:rolesReady?"Matriz de roles disponible.":"No se detecta control de roles."},
    {name:"Reservas públicas",status:publicBooking?"pass":"warn",detail:publicBooking?"Flujo público/privado detectado.":"Flujo público no detectado."},
    {name:"Reglas desplegadas",status:"warn",detail:"Las plantillas están incluidas, pero deben publicarse y probarse en Firebase antes de considerarlas activas."}
  ];
};

SaaS.renderFirebaseRules=function(){
  const matrix=document.getElementById("firebaseRulesMatrix");if(!matrix)return;

  document.getElementById("rulesRoleCount").textContent=SaaS.firebaseRuleRoles.length;
  document.getElementById("rulesTenantCount").textContent=(SaaS.db.businesses||[]).length;

  const yes=v=>`<span class="permission-chip ${v?"yes":"no"}">${v?"Sí":"No"}</span>`;
  matrix.innerHTML=`<table class="sambrix-table">
    <thead><tr><th>Rol</th><th>Plataforma</th><th>Su negocio</th><th>Otros negocios</th><th>Editar público</th><th>Resolver reservas</th></tr></thead>
    <tbody>${SaaS.firebaseRuleRoles.map(r=>`<tr><td><strong>${r.role}</strong></td><td>${yes(r.platform)}</td><td>${yes(r.ownBusiness)}</td><td>${yes(r.otherBusiness)}</td><td>${yes(r.publicWrite)}</td><td>${yes(r.resolveBookings)}</td></tr>`).join("")}</tbody>
  </table>`;

  const checks=SaaS.firebaseRulesChecks();
  document.getElementById("firebaseRulesChecks").innerHTML=checks.map(c=>`<div class="row rules-check ${c.status}">
    <div class="diag-mark">${c.status==="pass"?"✓":c.status==="warn"?"!":"×"}</div>
    <div><strong>${c.name}</strong><small>${c.detail}</small></div>
  </div>`).join("");

  const fail=checks.filter(x=>x.status==="fail").length;
  const warn=checks.filter(x=>x.status==="warn").length;
  const result=document.getElementById("firebaseRulesResult");

  if(fail){
    result.className="launch-result blocked";
    result.innerHTML=`<span class="tag">CORREGIR</span><h2>${fail} problema(s) de aislamiento</h2><p>No publicar reglas hasta corregirlos.</p>`;
  }else{
    result.className="launch-result";
    result.innerHTML=`<span class="tag">BASE PREPARADA</span><h2>Matriz y plantillas listas</h2><p>${warn} punto(s) requieren prueba real. Las reglas todavía deben desplegarse en Firebase y probarse con cuentas reales.</p>`;
  }
};

SaaS.refreshFirebaseRules=function(){
  SaaS.renderFirebaseRules();
  SaaS.audit?.("SECURITY","Matriz de reglas Firebase revisada",{
    roles:SaaS.firebaseRuleRoles.length,
    businesses:(SaaS.db.businesses||[]).length
  },"");
};

const oldRenderAll_168=SaaS.renderAll;
SaaS.renderAll=function(){
  oldRenderAll_168();
  SaaS.renderFirebaseRules();
};
