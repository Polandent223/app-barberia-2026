SaaS.session=SaaS.session||{role:"guest",user:null,businessId:"",branchId:""};

SaaS.ROLE_PAGES={
  superadmin:["*"],
  owner:["inicio","citas","clientes","barberos","caja","inventario","servicios","recibos","reportes","clienteConfig","personal","asistencia","horariosPersonal","rendimientoPersonal","historialPersonal","ausenciasPersonal","nominaPersonal","reservas","bookingInbox","branches","configuracion","notificationsHub"],
  admin:["inicio","citas","clientes","barberos","caja","inventario","servicios","recibos","reportes","clienteConfig","personal","asistencia","horariosPersonal","rendimientoPersonal","historialPersonal","ausenciasPersonal","nominaPersonal","reservas","bookingInbox","branches","notificationsHub"],
  manager:["inicio","citas","clientes","barberos","caja","inventario","servicios","recibos","reportes","reservas","bookingInbox","personal","asistencia","notificationsHub"],
  reception:["inicio","citas","clientes","barberos","caja","recibos","reservas","bookingInbox","notificationsHub"],
  cashier:["inicio","caja","clientes","recibos","inventario"],
  barber:["inicio","citas","clientes","reservas","asistencia"],
  client:[]
};

SaaS.normalizeRole=function(role){
  role=String(role||"").toLowerCase();
  const map={"dueño":"owner","administrador":"admin","gerente":"manager","cajero":"cashier","barbero":"barber","empleado":"barber","recepción":"reception","recepcion":"reception","superadmin":"superadmin","super_admin":"superadmin"};
  return map[role]||role||"guest";
};

SaaS.resolveFirebaseSession=async function(){
  const user=window.FirebaseBridge?.user;
  if(!user){SaaS.session={role:"guest",user:null,businessId:"",branchId:""};return SaaS.session}

  try{
    const access=await window.SaaSAuthAdmin?.refreshAccess?.();
    if(access?.superAdmin){
      SaaS.session={role:"superadmin",user,businessId:"",branchId:""};
      return SaaS.session;
    }

    const memberships=await window.SaaSAuthAdmin?.myBusinessMemberships?.()||[];
    if(memberships.length){
      const currentCtx=SaaS.getContext?.()||{};
      const m=memberships.find(x=>x.businessId===currentCtx.businessId)||memberships[0];
      const b=SaaS.db.businesses.find(x=>x.id===m.businessId);
      SaaS.session={
        role:SaaS.normalizeRole(m.role),
        user,
        businessId:m.businessId,
        branchId:b?.branches?.[0]?.id||""
      };
      if(SaaS.getContext()?.businessId!==m.businessId)SaaS.switchTenant?.(m.businessId,{branchId:SaaS.session.branchId,support:false});
      return SaaS.session;
    }
  }catch(e){console.warn("[SAMBRIX session]",e)}

  SaaS.session={role:"guest",user,businessId:"",branchId:""};
  return SaaS.session;
};

SaaS.pageAllowed=function(page){
  const role=SaaS.session?.role||"guest";
  const pages=SaaS.ROLE_PAGES[role]||[];
  return pages.includes("*")||pages.includes(page);
};

SaaS.defaultPageForRole=function(role){
  if(role==="superadmin")return "superadmin";
  if(["owner","admin","manager"].includes(role))return "inicio";
  if(role==="reception")return "citas";
  if(role==="cashier")return "caja";
  if(role==="barber")return "citas";
  return "inicio";
};

SaaS.applyRoleUI=function(){
  const role=SaaS.session?.role||"guest";
  document.body.dataset.sambrixRole=role;

  document.querySelectorAll("[data-page]").forEach(btn=>{
    const page=btn.dataset.page;
    const allowed=SaaS.pageAllowed(page);
    btn.classList.toggle("hidden",!allowed);
  });

  const badge=document.getElementById("sessionRoleBadge");
  if(badge){
    badge.classList.toggle("hidden",role==="guest");
    document.getElementById("sessionRoleName").textContent=role.toUpperCase();
    const b=SaaS.db.businesses.find(x=>x.id===SaaS.session.businessId);
    document.getElementById("sessionBusinessName").textContent=role==="superadmin"?"Plataforma SAMBRIX":(b?.name||"");
  }
};

SaaS.routeSession=function(){
  const role=SaaS.session?.role||"guest";
  if(role==="guest"){
    SaaS.portal?.show?.();
    return;
  }
  SaaS.portal?.hide?.();
  document.getElementById("loginView")?.classList.add("hidden");
  document.getElementById("adminApp")?.classList.remove("hidden");
  SaaS.applyRoleUI();
  window.App?.go?.(SaaS.defaultPageForRole(role));
};

SaaS.secureNavigation=function(){
  const A=window.App;if(!A||A.__sambrixRoleGuard)return;
  const old=A.go?.bind(A);if(!old)return;
  A.go=function(page){
    if(!SaaS.pageAllowed(page)){
      document.getElementById("accessDeniedMessage")&&(document.getElementById("accessDeniedMessage").textContent=`El rol ${SaaS.session?.role||"actual"} no tiene acceso a ${page}.`);
      return old("accessDenied");
    }
    return old(page);
  };
  A.__sambrixRoleGuard=true;
};

SaaS.signOutToPortal=async function(){
  try{
    if(window.FirebaseBridge?.connected){
      const btn=document.getElementById("firebaseLogoutBtn");
      if(btn)btn.click();
    }
  }catch{}
  SaaS.session={role:"guest",user:null,businessId:"",branchId:""};
  SaaS.portal?.show?.();
};

SaaS.waitForAuthenticatedSession=function(){
  let lastUid="";
  setInterval(async()=>{
    const uid=window.FirebaseBridge?.user?.uid||"";
    if(uid&&uid!==lastUid){
      lastUid=uid;
      await SaaS.resolveFirebaseSession();
      SaaS.routeSession();
    }
    if(!uid&&lastUid){
      lastUid="";
      SaaS.session={role:"guest",user:null,businessId:"",branchId:""};
      SaaS.portal?.show?.();
    }
  },700);
};
