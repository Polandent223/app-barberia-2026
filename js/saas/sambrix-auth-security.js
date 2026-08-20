SaaS.authSecurity=SaaS.authSecurity||{
  requireFirebase:true,
  blockLegacy:true,
  idleMinutes:30,
  lastActivity:Date.now()
};

SaaS.loadAuthSecurity=function(){
  try{
    const saved=JSON.parse(localStorage.getItem("sambrix_auth_security"))||{};
    SaaS.authSecurity={...SaaS.authSecurity,...saved,lastActivity:Date.now()};
  }catch{}
};

SaaS.saveAuthSecurity=function(){
  SaaS.authSecurity.requireFirebase=!!document.getElementById("authRequireFirebase")?.checked;
  SaaS.authSecurity.blockLegacy=!!document.getElementById("authBlockLegacy")?.checked;
  SaaS.authSecurity.idleMinutes=Math.max(5,Math.min(240,Number(document.getElementById("authIdleMinutes")?.value||30)));
  SaaS.authSecurity.lastActivity=Date.now();
  localStorage.setItem("sambrix_auth_security",JSON.stringify({
    requireFirebase:SaaS.authSecurity.requireFirebase,
    blockLegacy:SaaS.authSecurity.blockLegacy,
    idleMinutes:SaaS.authSecurity.idleMinutes
  }));
  SaaS.audit?.("SECURITY","Políticas de autenticación actualizadas",{
    requireFirebase:SaaS.authSecurity.requireFirebase,
    blockLegacy:SaaS.authSecurity.blockLegacy,
    idleMinutes:SaaS.authSecurity.idleMinutes
  },"");
  SaaS.renderAuthSecurity();
  SaaS.applyAuthGuard();
  window.App?.toast?.("Seguridad actualizada");
};

SaaS.authenticatedUser=function(){
  return window.FirebaseBridge?.user||window.FirebaseBridge?.currentUser||null;
};

SaaS.isProtectedRole=function(role){
  return ["superadmin","owner","admin","manager","reception","cashier","barber"].includes(String(role||"").toLowerCase());
};

SaaS.isProtectedAreaVisible=function(){
  const app=document.getElementById("adminApp");
  return !!app&&!app.classList.contains("hidden");
};

SaaS.ensureAuthBlocker=function(message){
  let blocker=document.getElementById("sambrixAuthBlocker");
  if(!blocker){
    blocker=document.createElement("div");
    blocker.id="sambrixAuthBlocker";
    blocker.className="sambrix-auth-blocker";
    document.body.appendChild(blocker);
  }
  blocker.innerHTML=`<div class="card">
    <span class="tag">SAMBRIX SECURITY</span>
    <h1>Acceso protegido</h1>
    <p>${message||"Debes iniciar sesión para entrar al administrador."}</p>
    <button class="btn primary" id="authBlockerLoginBtn">Ir al inicio de sesión</button>
  </div>`;
  document.getElementById("authBlockerLoginBtn")?.addEventListener("click",()=>{
    blocker.remove();
    SaaS.portal?.openLogin?.("business");
  });
};

SaaS.removeAuthBlocker=function(){
  document.getElementById("sambrixAuthBlocker")?.remove();
};

SaaS.applyAuthGuard=function(){
  const user=SaaS.authenticatedUser();
  const role=SaaS.session?.role||"guest";
  const protectedArea=SaaS.isProtectedAreaVisible();

  if(SaaS.authSecurity.requireFirebase && protectedArea && SaaS.isProtectedRole(role) && !user){
    document.getElementById("adminApp")?.classList.add("hidden");
    SaaS.ensureAuthBlocker("No hay una sesión Firebase válida. Inicia sesión con tu correo y contraseña.");
    return false;
  }

  if(SaaS.authSecurity.blockLegacy && protectedArea && role==="guest"){
    document.getElementById("adminApp")?.classList.add("hidden");
    SaaS.ensureAuthBlocker("El acceso antiguo sin autenticación está bloqueado.");
    return false;
  }

  SaaS.removeAuthBlocker();
  return true;
};

SaaS.touchAuthActivity=function(){
  SaaS.authSecurity.lastActivity=Date.now();
};

SaaS.checkIdleTimeout=function(){
  const user=SaaS.authenticatedUser();
  if(!user)return;
  const maxMs=Number(SaaS.authSecurity.idleMinutes||30)*60000;
  if(Date.now()-Number(SaaS.authSecurity.lastActivity||Date.now())<maxMs)return;

  SaaS.audit?.("SECURITY","Sesión cerrada por inactividad",{minutes:SaaS.authSecurity.idleMinutes},"");
  SaaS.authSecurity.lastActivity=Date.now();

  try{
    if(window.FirebaseBridge?.logout)window.FirebaseBridge.logout();
    else document.getElementById("firebaseLogoutBtn")?.click();
  }catch{}

  SaaS.session={role:"guest",user:null,businessId:"",branchId:""};
  document.getElementById("adminApp")?.classList.add("hidden");
  SaaS.portal?.show?.();
  window.App?.toast?.("Sesión cerrada por inactividad");
};

SaaS.authSecurityChecks=function(){
  const user=SaaS.authenticatedUser();
  const role=SaaS.session?.role||"guest";
  return [
    {name:"Firebase requerido",status:SaaS.authSecurity.requireFirebase?"pass":"warn",detail:SaaS.authSecurity.requireFirebase?"Los paneles protegidos exigen sesión Firebase.":"Firebase Auth no está marcado como obligatorio."},
    {name:"Acceso legacy bloqueado",status:SaaS.authSecurity.blockLegacy?"pass":"warn",detail:SaaS.authSecurity.blockLegacy?"No se permite abrir admin como guest.":"El acceso legacy está permitido."},
    {name:"Bridge Firebase",status:window.FirebaseBridge?"pass":"fail",detail:window.FirebaseBridge?"FirebaseBridge detectado.":"No se detecta FirebaseBridge."},
    {name:"Usuario actual",status:user?"pass":"warn",detail:user?(user.email||user.uid||"Usuario autenticado"):"No hay sesión activa en este momento."},
    {name:"Rol actual",status:SaaS.isProtectedRole(role)||role==="guest"?"pass":"warn",detail:`Rol: ${role}`},
    {name:"Timeout de inactividad",status:Number(SaaS.authSecurity.idleMinutes)>=5?"pass":"warn",detail:`${SaaS.authSecurity.idleMinutes} minutos.`}
  ];
};

SaaS.renderAuthSecurity=function(){
  const box=document.getElementById("authPolicyList");if(!box)return;

  document.getElementById("authRequireFirebase").checked=!!SaaS.authSecurity.requireFirebase;
  document.getElementById("authBlockLegacy").checked=!!SaaS.authSecurity.blockLegacy;
  document.getElementById("authIdleMinutes").value=SaaS.authSecurity.idleMinutes||30;

  const user=SaaS.authenticatedUser();
  const role=SaaS.session?.role||"guest";
  document.getElementById("authLoginState").textContent=SaaS.authSecurity.requireFirebase?"ON":"OFF";
  document.getElementById("authUserState").textContent=user?"ACTIVA":"SIN SESIÓN";
  document.getElementById("authRoleState").textContent=role.toUpperCase();
  document.getElementById("authTimeoutState").textContent=`${SaaS.authSecurity.idleMinutes||30}m`;

  const checks=SaaS.authSecurityChecks();
  box.innerHTML=checks.map(c=>`<div class="row auth-policy-row ${c.status}">
    <div class="diag-mark">${c.status==="pass"?"✓":c.status==="warn"?"!":"×"}</div>
    <div><strong>${c.name}</strong><small>${c.detail}</small></div>
  </div>`).join("");

  const fail=checks.filter(x=>x.status==="fail").length;
  const warn=checks.filter(x=>x.status==="warn").length;
  const result=document.getElementById("authSecurityResult");

  if(fail){
    result.className="launch-result blocked";
    result.innerHTML=`<span class="tag">BLOQUEO</span><h2>${fail} problema(s) crítico(s)</h2><p>No se debe publicar hasta resolver autenticación.</p>`;
  }else if(warn){
    result.className="launch-result";
    result.innerHTML=`<span class="tag">REVISAR</span><h2>Seguridad estructural activa</h2><p>Quedan ${warn} advertencia(s), algunas pueden ser simplemente porque no hay una sesión abierta ahora mismo.</p>`;
  }else{
    result.className="launch-result ready";
    result.innerHTML='<span class="tag">PROTEGIDO</span><h2>Autenticación y sesión configuradas</h2><p>Los paneles protegidos requieren sesión y rol válido.</p>';
  }
};

["click","keydown","touchstart","pointerdown"].forEach(evt=>{
  document.addEventListener(evt,SaaS.touchAuthActivity,{passive:true});
});

setInterval(()=>SaaS.checkIdleTimeout?.(),30000);

const oldRoute_167=SaaS.routeSession;
if(oldRoute_167)SaaS.routeSession=function(){
  const r=oldRoute_167();
  setTimeout(()=>SaaS.applyAuthGuard(),60);
  return r;
};

const oldRenderAll_167=SaaS.renderAll;
SaaS.renderAll=function(){
  oldRenderAll_167();
  SaaS.renderAuthSecurity();
  setTimeout(()=>SaaS.applyAuthGuard(),20);
};
