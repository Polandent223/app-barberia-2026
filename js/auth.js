App.login = function(){
  const u=App.db.users.find(x=>x.login===App.val("loginUser")&&String(x.pin)===String(App.val("loginPin")));
  if(!u)return App.toast("Usuario o PIN incorrecto");

  const mode=window.SaaS?.requestedLoginMode||document.body.dataset.loginMode||"business";

  if(mode==="superadmin"&&window.SaaS){
    localStorage.setItem(App.SESSION_KEY,u.id);
    SaaS.session={role:"superadmin",user:{email:"admin-local@sambrix"},businessId:"",branchId:""};
    App.hide("loginView");
    App.show("adminApp");
    SaaS.applyRoleUI?.();
    App.renderAll();
    App.go("superadmin");
    SaaS.renderSuperAdminZeroState?.();
    return;
  }

  if(mode==="business"&&window.SaaS){
    const business=(SaaS.db?.businesses||[]).find(b=>b.id!==SaaS.portal?._demoBusinessId);
    if(!business){
      App.toast("Primero el SuperAdmin debe crear un negocio");
      return;
    }
    localStorage.setItem(App.SESSION_KEY,u.id);
    SaaS.switchTenant?.(business.id,{support:false});
    SaaS.session={
      role:"owner",
      user:{email:business.ownerEmail||"owner-local@sambrix"},
      businessId:business.id,
      branchId:business.branches?.[0]?.id||""
    };
    App.hide("loginView");
    App.show("adminApp");
    SaaS.applyRoleUI?.();
    App.renderAll();
    App.go("inicio");
    return;
  }

  localStorage.setItem(App.SESSION_KEY,u.id);
  App.hide("loginView");
  App.show("adminApp");
  App.renderAll();
};

App.logout = function(){
  localStorage.removeItem(App.SESSION_KEY);
  if(window.SaaS?.signOutToPortal){
    SaaS.signOutToPortal();
    return;
  }
  App.show("loginView");
  App.hide("adminApp");
};

App.applyRoleUI = function(){
  document.querySelectorAll(".bottom-nav button").forEach(b=>b.style.display=App.allowed(b.dataset.page)?"flex":"none");
};
