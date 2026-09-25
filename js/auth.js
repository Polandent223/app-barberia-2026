App.login = async function(){
  const mode=window.SaaS?.requestedLoginMode||document.body.dataset.loginMode||"business";

  if(mode==="business"&&window.SaaS){
    const email=App.val("loginUser").trim();
    const password=App.val("loginPin");
    if(!email||!password)return App.toast("Escribe correo y contraseña");

    const btn=App.byId("loginBtn");
    if(btn){btn.disabled=true;btn.textContent="Entrando...";}
    try{
      const ok=await SaaS.loginBusinessOwner?.(email,password);
      if(!ok)return App.toast("Correo o contraseña incorrectos");
      return;
    }finally{
      if(btn){btn.disabled=false;btn.textContent="Entrar";}
    }
  }

  if(mode==="superadmin"&&window.SaaS){
    const email=App.val("loginUser").trim();
    const password=App.val("loginPin");
    if(!email||!password)return App.toast("Escribe correo y contraseña");
    if(!window.FirebaseBridge?.loginWithEmailPassword)return App.toast("Firebase todavía no está disponible");
    const btn=App.byId("loginBtn");
    if(btn){btn.disabled=true;btn.textContent="Entrando...";}
    try{
      const authenticatedUser=await FirebaseBridge.loginWithEmailPassword(email,password);
      if(!authenticatedUser?.uid)throw new Error("Firebase no devolvió una sesión válida");
      const session=await SaaS.resolveFirebaseSession?.();
      if(session?.role!=="superadmin"){
        await FirebaseBridge.logoutUser?.();
        SaaS.session={role:"guest",user:null,businessId:"",branchId:""};
        return App.toast("Esta cuenta no tiene permiso de SuperAdmin");
      }
      SaaS.routeSession?.();
      return;
    }catch(error){
      console.error("[SAMBRIX superadmin login]",error);
      const code=String(error?.code||"");
      const msg=String(error?.message||"");
      if(msg.includes("Publica las reglas Firestore"))return App.toast(msg);
      if(["auth/invalid-credential","auth/wrong-password","auth/user-not-found"].includes(code))return App.toast("Correo o contraseña incorrectos");
      if(code==="auth/invalid-email")return App.toast("El correo no es válido");
      if(code==="auth/network-request-failed")return App.toast("No se pudo conectar con Firebase. Revisa Internet e inténtalo de nuevo");
      if(code==="auth/too-many-requests")return App.toast("Firebase bloqueó temporalmente nuevos intentos. Espera unos minutos");
      if(code==="auth/user-disabled")return App.toast("Esta cuenta está desactivada en Firebase");
      if(code==="permission-denied"||code==="firestore/permission-denied")return App.toast("La contraseña fue aceptada, pero Firestore rechazó el acceso");
      return App.toast("No se pudo iniciar sesión: "+(code||msg||"error desconocido"));
    }finally{
      if(btn){btn.disabled=false;btn.textContent="Entrar";}
    }
  }

  if(App.PRODUCTION_MODE)return App.toast("Este acceso local está desactivado en producción");
  const u=App.db.users.find(x=>x.login===App.val("loginUser")&&String(x.pin)===String(App.val("loginPin")));
  if(!u)return App.toast("Usuario o PIN incorrecto");
  if(mode==="superadmin"&&window.SaaS){
    localStorage.setItem(App.SESSION_KEY,u.id);
    SaaS.session={role:"superadmin",user:{email:"admin-local@sambrix",localReview:true},businessId:"",branchId:""};
    SaaS.installPermissionBridge?.();App.hide("loginView");App.show("adminApp");SaaS.applyRoleUI?.();App.renderAll();App.go("superadmin");SaaS.renderSuperAdminZeroState?.();return;
  }
  localStorage.setItem(App.SESSION_KEY,u.id);App.hide("loginView");App.show("adminApp");App.renderAll();
};


// Login bootstrap independiente: el acceso no debe depender de que main.js termine de cargar.
function bindSambrixLogin(){
  const btn=App.byId("loginBtn");
  if(btn&&!btn.dataset.sambrixLoginBound){
    btn.dataset.sambrixLoginBound="1";
    btn.addEventListener("click",e=>{e.preventDefault();App.login();});
  }
  ["loginUser","loginPin"].forEach(id=>{
    const el=App.byId(id);
    if(el&&!el.dataset.sambrixLoginBound){
      el.dataset.sambrixLoginBound="1";
      el.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();App.login();}});
    }
  });
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bindSambrixLogin);
else bindSambrixLogin();

App.logout = function(){
  localStorage.removeItem(App.SESSION_KEY);
  if(window.SaaS?.signOutToPortal){SaaS.signOutToPortal();return;}
  App.show("loginView");App.hide("adminApp");
};

App.applyRoleUI = function(){document.querySelectorAll(".bottom-nav button").forEach(b=>b.style.display=App.allowed(b.dataset.page)?"flex":"none")};

App.requestPasswordReset=async function(){
  const mode=window.SaaS?.requestedLoginMode||document.body.dataset.loginMode||"business";
  if(!["business","superadmin"].includes(mode))return App.toast("Recuperación no disponible para este acceso");
  const email=App.val("loginUser").trim();
  if(!email)return App.toast("Escribe primero tu correo");
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return App.toast("Escribe un correo válido");
  if(!window.FirebaseBridge?.sendPasswordReset)return App.toast("Firebase todavía no está disponible");
  const btn=App.byId("loginResetBtn");
  try{if(btn){btn.disabled=true;btn.textContent="Enviando...";}await FirebaseBridge.sendPasswordReset(email);App.toast("Te enviamos un enlace para cambiar la contraseña")}
  catch(error){console.error("[SAMBRIX password reset]",error);App.toast("Si el correo está registrado, recibirás el enlace de recuperación")}
  finally{if(btn){btn.disabled=false;btn.textContent="¿Olvidaste tu contraseña?";}}
};

function ensurePasswordResetButton(){
  if(App.byId("loginResetBtn"))return App.byId("loginResetBtn");
  const loginBtn=App.byId("loginBtn");
  if(!loginBtn)return null;
  const btn=document.createElement("button");
  btn.type="button";
  btn.id="loginResetBtn";
  btn.className="link login-reset-link";
  btn.textContent="¿Olvidaste tu contraseña?";
  btn.style.cssText="display:block;width:100%;margin:10px 0 4px;text-align:center";
  loginBtn.insertAdjacentElement("afterend",btn);
  return btn;
}

function loadProductionPatch(src,key,label){
  if(document.querySelector(`script[data-sambrix-patch="${key}"]`))return;
  const script=document.createElement("script");
  script.src=src;
  script.defer=true;
  script.dataset.sambrixPatch=key;
  script.onerror=()=>console.error(`[SAMBRIX] No se pudo cargar ${label}`);
  document.body.appendChild(script);
}

document.addEventListener("DOMContentLoaded",()=>{
  ensurePasswordResetButton()?.addEventListener("click",App.requestPasswordReset);
  loadProductionPatch("js/staff-production-patch.js","staff","el refuerzo de personal");
  loadProductionPatch("js/saas/session-production-guard.js","session","el refuerzo de sesión");
  loadProductionPatch("js/saas/production-action-guards.js","actions","las guardas finales de acciones");
});