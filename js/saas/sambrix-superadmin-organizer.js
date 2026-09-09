SaaS.SUPERADMIN_PRIMARY_PAGES=new Set([
  "superadmin",
  "saasSubscriptions",
  "billingOperationsCenter",
  "operationsCenter",
  "saasSecurity",
  "saasMetricsCenter",
  "reviewGateCenter"
]);

SaaS.organizeSuperAdminNavigation=function(){
  document.querySelectorAll(".bottom-nav .nav-saas[data-page]").forEach(btn=>{
    btn.classList.toggle(
      "nav-secondary",
      !SaaS.SUPERADMIN_PRIMARY_PAGES.has(btn.dataset.page)
    );
  });
};

SaaS.filterSuperAdminModules=function(){
  const q=(document.getElementById("superadminModuleSearch")?.value||"")
    .trim()
    .toLowerCase();

  document.querySelectorAll("#superadminModuleDirectory .super-module-card").forEach(card=>{
    const hay=(card.dataset.search||"").toLowerCase();
    card.classList.toggle("hidden-by-search",!!q&&!hay.includes(q));
  });

  document.querySelectorAll("#superadminModuleDirectory .module-group").forEach(group=>{
    const any=[...group.querySelectorAll(".super-module-card")]
      .some(card=>!card.classList.contains("hidden-by-search"));
    group.classList.toggle("hidden-by-search",!!q&&!any);
  });
};

SaaS.installSuperAdminOrganizer=function(){
  SaaS.organizeSuperAdminNavigation();
};
