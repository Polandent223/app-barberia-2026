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

    const resolved=await window.SaaSAuthAdmin?.resolveMyBusiness?.();
    if(resolved?.membership&&resolved?.business){
      const m=resolved.membership,b=resolved.business;
      if(!SaaS.db.businesses.some(x=>x.id===b.id)){
        SaaS.db.businesses.push(b);
        SaaS.save?.();
      }
      SaaS.session={role:SaaS.normalizeRole(m.role),user,businessId:b.id,branchId:b?.branches?.[0]?.id||""};
      if(SaaS.getContext()?.businessId!==b.id)SaaS.switchTenant?.(b.id,{branchId:SaaS.session.branchId,support:false});
      return SaaS.session;
    }

    const memberships=await window.SaaSAuthAdmin?.myBusinessMemberships?.()||[];
    if(memberships.length){
      const m=memberships[0];
      const b=SaaS.db.businesses.find(x=>x.id===m.businessId);
      if(b){
        SaaS.session={role:SaaS.normalizeRole(m.role),user,businessId:m.businessId,branchId:b?.branches?.[0]?.id||""};
        if(SaaS.getContext()?.businessId!==m.businessId)SaaS.switchTenant?.(m.businessId,{branchId:SaaS.session.branchId,support:false});
        return SaaS.session;
      }
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

SaaS.installPermissionBridge=function(){
  const A=window.App;
  if(!A||A.__sambrixPermissionBridge)return;
  const legacyAllowed=A.allowed?.bind(A);
  A.allowed=function(page){
    const role=SaaS.session?.role||"guest";
    if(role!=="guest")return SaaS.pageAllowed(page);
    return legacyAllowed?legacyAllowed(page):false;
  };
  A.__sambrixPermissionBridge=true;
};

SaaS.installSuperAdminRouteGuard=function(){
  const A=window.App;
  if(!A||A.__sambrixSuperAdminRouteGuard)return;
  const baseGo=A.go?.bind(A);
  if(!baseGo)return;
  A.go=function(page){
    const role=SaaS.session?.role||"guest";
    if(role==="superadmin" && ["inicio","citas","clientes","barberos","caja","inventario","servicios","usuarios","recibos","autorizaciones","reportes","auditoria","configuracion"].includes(page))page="superadmin";
    return baseGo(page);
  };
  A.__sambrixSuperAdminRouteGuard=true;
};

SaaS.applyRoleUI=function(){
  const role=SaaS.session?.role||"guest";
  document.body.dataset.sambrixRole=role;
  document.querySelectorAll(".bottom-nav button[data-page]").forEach(btn=>{
    const page=btn.dataset.page;
    let show=SaaS.pageAllowed(page);
    if(role==="superadmin")show=show && btn.classList.contains("nav-saas");
    else if(["owner","admin","manager","staff"].includes(role))show=show && btn.classList.contains("nav-business");
    btn.style.display=show?"flex":"none";
  });
  const label=document.getElementById("sambrixRoleLabel");
  if(label)label.textContent=SaaS.roleLabel(role);
  const tenant=document.getElementById("sambrixTenantLabel");
  if(tenant)tenant.textContent=role==="superadmin"?"PLATAFORMA SAMBRIX":(SaaS.getCurrentBusiness()?.name||"SIN NEGOCIO");
};

SaaS.routeSession=function(){
  const role=SaaS.session?.role||"guest";
  if(role==="guest"){
    SaaS.portal?.show?.();
    return;
  }
  SaaS.installPermissionBridge?.();
  SaaS.installSuperAdminRouteGuard?.();
  SaaS.portal?.hide?.();
  document.getElementById("loginView")?.classList.add("hidden");
  document.getElementById("clientApp")?.classList.add("hidden");
  document.getElementById("adminApp")?.classList.remove("hidden");
  SaaS.applyRoleUI();
  const target=SaaS.defaultPageForRole(role);
  window.App?.go?.(target);
  if(role==="superadmin"){
    document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x.id==="superadmin"));
    document.querySelectorAll(".bottom-nav button").forEach(x=>x.classList.toggle("active",x.dataset.page==="superadmin"));
    SaaS.renderSuperAdminZeroState?.();
  }
};

SaaS.secureNavigation=function(){
  SaaS.installPermissionBridge?.();
  SaaS.installSuperAdminRouteGuard?.();
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
  window.SaaSCloudProduction?.resetCloudSession?.();
  try{
    if(window.FirebaseBridge?.connected){
      const btn=document.getElementById("firebaseLogoutBtn");
      if(btn)btn.click();
    }
  }catch{}
  SaaS.session={role:"guest",user:null,businessId:"",branchId:""};
  SaaS.bookingInboxUnsub?.();SaaS.bookingInboxUnsub=null;
  SaaS.bookingChangeUnsub?.();SaaS.bookingChangeUnsub=null;
  SaaS.bookingInbox=[];SaaS.bookingChangeInbox=[];
  document.getElementById("adminApp")?.classList.add("hidden");
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
      window.SaaSCloudProduction?.resetCloudSession?.();
      SaaS.bookingInboxUnsub?.();SaaS.bookingInboxUnsub=null;
      SaaS.bookingChangeUnsub?.();SaaS.bookingChangeUnsub=null;
      SaaS.bookingInbox=[];SaaS.bookingChangeInbox=[];
      SaaS.session={role:"guest",user:null,businessId:"",branchId:""};
      document.getElementById("adminApp")?.classList.add("hidden");
      SaaS.portal?.show?.();
    }
  },700);
};
