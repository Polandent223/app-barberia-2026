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
      await FirebaseBridge.loginWithEmailPassword(email,password);
      await new Promise(r=>setTimeout(r,0));
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
      return App.toast("Correo o contraseña incorrectos");
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

function loadStaffProductionPatch(){
  if(document.querySelector('script[data-sambrix-staff-patch]'))return;
  const script=document.createElement("script");
  script.src="js/staff-production-patch.js";
  script.defer=true;
  script.dataset.sambrixStaffPatch="1";
  script.onerror=()=>console.error("[SAMBRIX] No se pudo cargar el refuerzo de personal");
  document.body.appendChild(script);
}

document.addEventListener("DOMContentLoaded",()=>{
  ensurePasswordResetButton()?.addEventListener("click",App.requestPasswordReset);
  loadStaffProductionPatch();
});
