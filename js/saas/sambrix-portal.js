SaaS.portal={
  show(){
    document.getElementById("sambrixPortal")?.classList.remove("hidden");
    document.getElementById("loginView")?.classList.add("hidden");
    document.getElementById("adminApp")?.classList.add("hidden");
  },
  hide(){
    document.getElementById("sambrixPortal")?.classList.add("hidden");
  },
  openLogin(mode="business"){
    SaaS.portal.hide();
    const login=document.getElementById("loginView");
    if(login)login.classList.remove("hidden");
    document.body.dataset.loginMode=mode;
    window.SaaS&&(SaaS.requestedLoginMode=mode);
    const title=document.querySelector("#loginView h1,#loginView h2,#loginView h3");
    if(title){
      if(mode==="superadmin")title.textContent="SAMBRIX SuperAdmin";
      else title.textContent="SAMBRIX Business";
    }
  },
  openClient(){
    const params=new URLSearchParams(location.search);
    if(params.get("business")){
      SaaS.portal.hide();
      window.App?.openClientApp?.();
    }else{
      document.getElementById("portalAccessGrid")?.scrollIntoView({behavior:"smooth"});
      window.App?.toast?.("Abre el enlace o QR del negocio para reservar");
    }
  },
  demo(){
    const b=SaaS.db?.businesses?.[0];
    SaaS.portal.hide();
    document.getElementById("adminApp")?.classList.remove("hidden");
    if(b){
      SaaS.switchTenant?.(b.id,{support:false});
      window.App?.go?.("superadmin");
    }
  }
};

SaaS.installPortal=function(){
  const params=new URLSearchParams(location.search);
  // Public client URLs bypass the main portal.
  if(params.get("business")&&params.get("cliente")==="app"){
    document.getElementById("sambrixPortal")?.classList.add("hidden");
    return;
  }
  SaaS.portal.show();

  document.getElementById("portalLoginBtn")?.addEventListener("click",()=>SaaS.portal.openLogin("business"));
  document.getElementById("portalStartBtn")?.addEventListener("click",()=>document.getElementById("portalAccessGrid")?.scrollIntoView({behavior:"smooth"}));
  document.getElementById("portalClientBtn")?.addEventListener("click",SaaS.portal.openClient);
  document.getElementById("portalDemoBtn")?.addEventListener("click",SaaS.portal.demo);

  document.querySelectorAll("[data-portal-role]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const role=btn.dataset.portalRole;
      if(role==="client")SaaS.portal.openClient();
      else SaaS.portal.openLogin(role);
    });
  });
};
