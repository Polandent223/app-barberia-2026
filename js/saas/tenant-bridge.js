
SaaS.installTenantBridge=function(){
  const A=window.App;if(!A||A.__tenantBridge)return;
  SaaS.applyTenantContext();

  const oldPersist=A.persist?.bind(A);
  if(oldPersist){
    A.persist=function(){
      SaaS.applyTenantContext();
      return oldPersist();
    };
  }

  const oldGo=A.go?.bind(A);
  if(oldGo){
    A.go=function(page){
      if(!["superadmin","saasPlans","saasSupport","configuracion"].includes(page)&&!SaaS.guardSubscription())return;
      return oldGo(page);
    };
  }
  A.__tenantBridge=true;
};

SaaS.migrateExistingRecords=function(){
  const A=window.App;if(!A?.db)return;
  const c=SaaS.getContext(),bId=c.businessId,brId=c.branchId;
  ["clients","appointments","cash","products","stockMoves","sales","employees","attendance","absences","barbers","services","shopOrders","clientRequests","approvalRequests"].forEach(k=>{
    if(Array.isArray(A.db[k])){
      A.db[k]=A.db[k].map(x=>({...x,businessId:x.businessId||bId,branchId:x.branchId||brId}));
    }
  });
  localStorage.setItem(A.KEY,JSON.stringify(A.db));
};
