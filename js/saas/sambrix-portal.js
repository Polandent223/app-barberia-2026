SaaS.portal={
  _demoBusinessId:"__sambrix_demo__",

  cleanupDemo(){
    if(!SaaS.db?.businesses)return;
    SaaS.db.businesses=SaaS.db.businesses.filter(b=>b.id!==SaaS.portal._demoBusinessId);
  },

  show(){
    SaaS.portal.cleanupDemo();
    document.getElementById("sambrixPortal")?.classList.remove("hidden");
    document.getElementById("loginView")?.classList.add("hidden");
    document.getElementById("adminApp")?.classList.add("hidden");
    document.getElementById("clientApp")?.classList.add("hidden");
    SaaS.requestedLoginMode="";
  },

  hide(){
    document.getElementById("sambrixPortal")?.classList.add("hidden");
  },

  openLogin(mode="business"){
    SaaS.portal.hide();
    const login=document.getElementById("loginView");
    if(login)login.classList.remove("hidden");
    document.body.dataset.loginMode=mode;
    SaaS.requestedLoginMode=mode;

    const title=document.querySelector("#loginView h1,#loginView h2,#loginView h3");
    const subtitle=document.querySelector("#loginView p");
    if(title){
      title.textContent=mode==="superadmin"?"SAMBRIX SuperAdmin":"SAMBRIX Business";
    }
    if(subtitle){
      subtitle.textContent=mode==="superadmin"
        ?"Centro de control de toda la plataforma"
        :"Acceso del dueño y personal del negocio";
    }
  },

  prepareDemoState(){
    const A=window.App;
    if(!A)return null;

    SaaS.portal.cleanupDemo();
    const demoBusiness={
      id:SaaS.portal._demoBusinessId,
      name:"SAMBRIX Demo Studio",
      type:"Salón / Barbería",
      owner:"Usuario Demo",
      ownerEmail:"demo@sambrix.local",
      city:"Demo",
      planId:SaaS.db?.plans?.[0]?.id||"plan-basic",
      status:"Prueba",
      nextPayment:"",
      branches:[{id:"demo-main",name:"Principal",city:"Demo",active:true}],
      _temporaryDemo:true
    };
    SaaS.db.businesses.push(demoBusiness);

    A.db=A.clone(A.seed);
    A.db.business.name="SAMBRIX Demo Studio";
    A.db.business.clientApp.brandName="SAMBRIX Demo Studio";
    A.db.business.clientApp.heroTitle="Reserva tu próxima cita";
    A.db.business.clientApp.heroSubtitle="Demostración de la experiencia que verá el cliente.";
    A.db.business.clientApp.promotions=[
      {id:"demo-promo",title:"Bienvenida SAMBRIX",text:"Promoción demostrativa"}
    ];
    A.db.meta={businessId:demoBusiness.id,branchId:"demo-main",demo:true};
    A.ensurePermissionsData?.();
    A.ensureStaff?.();
    return demoBusiness;
  },

  openClient(){
    const params=new URLSearchParams(location.search);
    const requested=params.get("business");
    let b=requested?SaaS.db?.businesses?.find(x=>x.id===requested):null;

    if(!b){
      b=(SaaS.db?.businesses||[]).find(
        x=>x.id!==SaaS.portal._demoBusinessId && !["Suspendido","Vencido"].includes(x.status)
      );
    }

    SaaS.portal.hide();
    document.getElementById("loginView")?.classList.add("hidden");
    document.getElementById("adminApp")?.classList.add("hidden");

    if(b){
      SaaS.switchTenant?.(b.id,{support:false});
      window.App?.openClientApp?.();
      window.App?.toast?.(`Reservas: ${b.name}`);
      return;
    }

    SaaS.portal.prepareDemoState();
    window.App?.renderAll?.();
    window.App?.openClientApp?.();
    window.App?.toast?.("Modo demostración de cliente");
  },

  demo(){
    const b=SaaS.portal.prepareDemoState();
    if(!b)return;

    SaaS.portal.hide();
    document.getElementById("loginView")?.classList.add("hidden");
    document.getElementById("clientApp")?.classList.add("hidden");
    document.getElementById("adminApp")?.classList.remove("hidden");

    SaaS.session={role:"owner",user:{email:"demo@sambrix.local"},businessId:b.id,branchId:"demo-main"};
    SaaS.applyRoleUI?.();
    window.App?.renderAll?.();
    window.App?.go?.("inicio");
    window.App?.toast?.("SAMBRIX Demo Studio");
  }
};

SaaS.installPortal=function(){
  const params=new URLSearchParams(location.search);

  if(params.get("business")&&params.get("cliente")==="app"){
    document.getElementById("sambrixPortal")?.classList.add("hidden");
    setTimeout(()=>SaaS.portal.openClient(),0);
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
