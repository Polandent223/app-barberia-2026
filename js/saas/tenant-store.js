
SaaS.TENANT_PREFIX="hc_tenant_state_";

SaaS.blankBusinessState=function(business){
  const A=window.App;
  const base=A?.clone?A.clone(A.seed):JSON.parse(JSON.stringify(A?.seed||{}));

  // A tenant nuevo NO hereda datos operativos de la barbería original.
  base.users=Array.isArray(base.users)?base.users:[];
  base.business=base.business||{};
  base.business.name=business?.name||"Nuevo negocio";
  base.business.open=base.business.open||"09:00";
  base.business.close=base.business.close||"18:00";
  base.business.currency=base.business.currency||"$";
  base.business.language=base.business.language||"es";
  base.business.whatsapp="";
  base.business.address=business?.branches?.[0]?.address||"";
  base.business.pointsPerService=10;

  base.business.clientApp={
    brandName:business?.brand?.name||business?.name||"Nuevo negocio",
    heroTitle:"Reserva con nosotros",
    heroSubtitle:"Selecciona el servicio, profesional y horario disponible.",
    theme:"light",
    primary:business?.brand?.primaryColor||"#c89a4b",
    secondary:"#111111",
    logo:"",
    background:"",
    whatsapp:"",
    instagram:"",
    tiktok:"",
    facebook:"",
    promotions:[],
    barberPhotos:{}
  };

  // Todos los datos de operación nacen vacíos por negocio.
  base.barbers=[];
  base.services=[];
  base.clients=[];
  base.appointments=[];
  base.cash=[];
  base.products=[];
  base.stockMoves=[];
  base.sales=[];
  base.approvalRequests=[];
  base.auditLog=[];
  base.clientRequests=[];
  base.clientActivity=[];
  base.shopOrders=[];
  base.employees=[];
  base.attendance=[];
  base.absences=[];

  base.meta={
    businessId:business?.id||"",
    branchId:business?.branches?.[0]?.id||"",
    businessType:business?.type||"",
    tenantInitialized:true,
    tenantTemplate:"clean-20.14"
  };

  return base;
};

SaaS.tenantKey=id=>SaaS.TENANT_PREFIX+id;

SaaS.saveTenantState=function(businessId,state){
  if(!businessId||!state)return;
  localStorage.setItem(SaaS.tenantKey(businessId),JSON.stringify(state));
};

SaaS.loadTenantState=function(businessId){
  const raw=localStorage.getItem(SaaS.tenantKey(businessId));
  if(raw){try{return JSON.parse(raw)}catch{}}
  const b=SaaS.db.businesses.find(x=>x.id===businessId);
  return SaaS.blankBusinessState(b);
};

SaaS.bootstrapFirstTenant=function(){
  const A=window.App;if(!A?.db)return;
  const b=SaaS.db.businesses[0];if(!b)return;
  const key=SaaS.tenantKey(b.id);
  if(!localStorage.getItem(key)){
    A.db.meta=A.db.meta||{};
    A.db.meta.businessId=b.id;
    A.db.meta.branchId=b.branches?.[0]?.id||"";
    SaaS.saveTenantState(b.id,A.db);
  }
};


SaaS.reconcileTenantIsolation=function(businessId){
  const b=SaaS.db.businesses.find(x=>x.id===businessId);
  if(!b || b.id==="business-main")return false;

  const key=SaaS.tenantKey(b.id);
  let state=null;
  try{
    const raw=localStorage.getItem(key);
    state=raw?JSON.parse(raw):null;
  }catch{}

  if(!state){
    SaaS.saveTenantState(b.id,SaaS.blankBusinessState(b));
    return true;
  }

  state.meta=state.meta||{};
  state.business=state.business||{};

  // 20.14: remove only the unmistakable records from the original barber demo.
  // This keeps real tenant data intact while preventing a new business from
  // inheriting services, products or staff from Los Hermanos Camejo.
  if(state.meta.tenantTemplate!=="clean-20.14") {
    const legacyServices=new Set(["s1|Corte clásico","s2|Degradado","s3|Corte + barba"]);
    const legacyProducts=new Set(["p1|Gel fijador","p2|Hojillas"]);
    const legacyBarbers=new Set(["b1|Barbero 1","b2|Barbero 2"]);
    const legacyClients=new Set(["c1|Cliente demo"]);
    state.services=(state.services||[]).filter(x=>!legacyServices.has(`${x.id}|${x.name}`));
    state.products=(state.products||[]).filter(x=>!legacyProducts.has(`${x.id}|${x.name}`));
    state.barbers=(state.barbers||[]).filter(x=>!legacyBarbers.has(`${x.id}|${x.name}`));
    state.clients=(state.clients||[]).filter(x=>!legacyClients.has(`${x.id}|${x.name}`));
    state.meta.tenantTemplate="clean-20.14";
  }

  // Detect only unmistakable contamination from the legacy seed.
  const legacyBrand=String(state.business?.clientApp?.brandName||"")==="Los Hermanos Camejo";
  const legacyName=String(state.business?.name||"")==="Barbería Los Hermanos Camejo";
  const hasRealActivity=
    (state.appointments||[]).length>0 ||
    (state.cash||[]).length>0 ||
    (state.sales||[]).length>0 ||
    (state.clientRequests||[]).length>0 ||
    (state.shopOrders||[]).length>0;

  if((legacyBrand||legacyName) && !hasRealActivity){
    const clean=SaaS.blankBusinessState(b);

    // Preserve any explicit tenant-specific configuration already entered.
    clean.business.open=state.business.open||clean.business.open;
    clean.business.close=state.business.close||clean.business.close;
    clean.business.currency=state.business.currency||clean.business.currency;
    clean.business.language=state.business.language||clean.business.language;

    SaaS.saveTenantState(b.id,clean);
    return true;
  }

  // Even when preserving data, force identity to the selected business.
  state.meta.businessId=b.id;
  state.meta.branchId=b.branches?.[0]?.id||state.meta.branchId||"";
  state.meta.businessType=b.type||"";
  state.business.name=b.name;
  state.business.clientApp=state.business.clientApp||{};
  if(!state.business.clientApp.brandName || legacyBrand){
    state.business.clientApp.brandName=b.brand?.name||b.name;
  }
  SaaS.saveTenantState(b.id,state);
  return false;
};

SaaS.switchTenant=function(businessId,opts={}){
  const A=window.App;if(!A?.db)return false;
  const current=SaaS.currentBusiness();
  if(current?.id) SaaS.saveTenantState(current.id,A.db);

  const target=SaaS.db.businesses.find(b=>b.id===businessId);
  if(!target)return false;

  const branchId=opts.branchId||target.branches?.[0]?.id||"";

  // Repair any legacy seed contamination before this tenant is loaded.
  SaaS.reconcileTenantIsolation?.(target.id);

  SaaS.setContext({
    businessId:target.id,
    branchId,
    support:!!opts.support,
    previous:opts.previous||null
  });

  A.db=SaaS.loadTenantState(target.id);
  A.db.meta=A.db.meta||{};
  A.db.meta.businessId=target.id;
  A.db.meta.branchId=branchId;
  A.db.meta.businessType=target.type||"";
  A.db.meta.tenantLoadedAt=new Date().toISOString();
  A.db.business=A.db.business||{};
  A.db.business.name=target.name;
  A.db.business.clientApp=A.db.business.clientApp||{};
  A.db.business.clientApp.brandName=target.brand?.name||target.name;

  A.ensurePermissionsData?.();
  A.ensureStaff?.();
  localStorage.setItem(A.KEY,JSON.stringify(A.db));
  A.renderAll?.();
  SaaS.renderSupportBanner?.();
  return true;
};

SaaS.installTenantPersistence=function(){
  const A=window.App;if(!A||A.__tenantStatePersist)return;
  const old=A.persist?.bind(A);
  if(!old)return;
  A.persist=function(){
    const ctx=SaaS.getContext();
    if(ctx.businessId) SaaS.saveTenantState(ctx.businessId,A.db);
    return old();
  };
  A.__tenantStatePersist=true;
};
