
SaaS.TENANT_PREFIX="hc_tenant_state_";

SaaS.blankBusinessState=function(business){
  const A=window.App;
  const base=A?.clone?A.clone(A.seed):JSON.parse(JSON.stringify(A?.seed||{}));
  base.business=base.business||{};
  base.business.name=business?.name||"Nuevo negocio";
  base.business.clientApp=base.business.clientApp||{};
  base.business.clientApp.brandName=business?.name||"Nuevo negocio";
  base.clients=[];
  base.appointments=[];
  base.cash=[];
  base.stockMoves=[];
  base.sales=[];
  base.approvalRequests=[];
  base.auditLog=[];
  base.clientRequests=[];
  base.clientActivity=[];
  base.shopOrders=[];
  base.attendance=[];
  base.absences=[];
  base.meta={businessId:business?.id||"",branchId:business?.branches?.[0]?.id||""};
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

SaaS.switchTenant=function(businessId,opts={}){
  const A=window.App;if(!A?.db)return false;
  const current=SaaS.currentBusiness();
  if(current?.id) SaaS.saveTenantState(current.id,A.db);

  const target=SaaS.db.businesses.find(b=>b.id===businessId);
  if(!target)return false;

  const branchId=opts.branchId||target.branches?.[0]?.id||"";
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
  A.db.business=A.db.business||{};
  A.db.business.name=target.name;

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
