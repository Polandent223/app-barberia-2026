SaaS.PLAN_LIMITS=SaaS.PLAN_LIMITS||{
  basic:{branches:1,staff:5,users:3,publicBooking:true,reports:true,whiteLabel:false,advancedReports:false},
  pro:{branches:3,staff:20,users:10,publicBooking:true,reports:true,whiteLabel:true,advancedReports:true},
  premium:{branches:999,staff:999,users:999,publicBooking:true,reports:true,whiteLabel:true,advancedReports:true}
};

SaaS.planTier=function(plan){
 const n=String(plan?.name||"").toLowerCase();
 if(n.includes("premium")||n.includes("enterprise"))return "premium";
 if(n.includes("pro"))return "pro";
 return "basic";
};
SaaS.licenseFor=function(b){
 const plan=SaaS.getPlan(b.planId),tier=SaaS.planTier(plan),limits=SaaS.PLAN_LIMITS[tier];
 const state=SaaS.billingState?.(b)||"Activa";
 const blocked=["Vencida","Suspendida"].includes(state);
 const tenant=SaaS.loadTenantState?.(b.id)||{};
 const branches=(b.branches||[]).length;
 const staff=(tenant.employees||tenant.barbers||[]).length;
 const users=(tenant.users||[]).length||1;
 return {plan,tier,limits,state,blocked,usage:{branches,staff,users}};
};
SaaS.featureAllowed=function(feature,businessId){
 const b=SaaS.db.businesses.find(x=>x.id===(businessId||SaaS.getContext()?.businessId));if(!b)return false;
 const l=SaaS.licenseFor(b);if(l.blocked)return false;
 return l.limits[feature]!==false;
};
SaaS.withinLimit=function(kind,businessId,increment=0){
 const b=SaaS.db.businesses.find(x=>x.id===(businessId||SaaS.getContext()?.businessId));if(!b)return false;
 const l=SaaS.licenseFor(b);if(l.blocked)return false;
 return Number(l.usage[kind]||0)+increment<=Number(l.limits[kind]??999);
};
SaaS.guardBusinessLicense=function(){
 const id=SaaS.getContext?.()?.businessId;if(!id)return true;
 const b=SaaS.db.businesses.find(x=>x.id===id);if(!b)return true;
 const l=SaaS.licenseFor(b);
 if(l.blocked && SaaS.session?.role!=="superadmin"){
   document.getElementById("accessDeniedMessage")&&(document.getElementById("accessDeniedMessage").textContent=`La suscripción de ${b.name} está ${l.state.toLowerCase()}. Comunícate con SAMBRIX para reactivar el servicio.`);
   window.App?.go?.("accessDenied");return false;
 }
 return true;
};
SaaS.renderLicenses=function(){
 const box=document.getElementById("licenseBusinessList");if(!box)return;
 const q=(document.getElementById("licenseSearch")?.value||"").toLowerCase();
 const bs=(SaaS.db.businesses||[]).filter(b=>!q||`${b.name} ${b.owner||""}`.toLowerCase().includes(q));
 const licenses=bs.map(b=>[b,SaaS.licenseFor(b)]);
 document.getElementById("licenseActiveCount").textContent=licenses.filter(x=>!x[1].blocked).length;
 document.getElementById("licenseBlockedCount").textContent=licenses.filter(x=>x[1].blocked).length;
 document.getElementById("licenseBranchCount").textContent=licenses.reduce((s,x)=>s+x[1].usage.branches,0);
 document.getElementById("licenseUserCount").textContent=licenses.reduce((s,x)=>s+x[1].usage.users,0);
 box.innerHTML=licenses.map(([b,l])=>`<div class="row license-row ${l.blocked?"blocked":""}"><div><strong>${b.name}</strong><small>${l.plan?.name||"Sin plan"} · ${l.state}</small><div class="license-usage"><span class="license-chip ${l.usage.branches>=l.limits.branches?"limit":""}">Sucursales ${l.usage.branches}/${l.limits.branches>=999?"∞":l.limits.branches}</span><span class="license-chip ${l.usage.staff>=l.limits.staff?"limit":""}">Personal ${l.usage.staff}/${l.limits.staff>=999?"∞":l.limits.staff}</span><span class="license-chip ${l.usage.users>=l.limits.users?"limit":""}">Usuarios ${l.usage.users}/${l.limits.users>=999?"∞":l.limits.users}</span></div></div><span class="billing-status ${l.blocked?"overdue":""}">${l.blocked?"Bloqueada":"Habilitada"}</span></div>`).join("");
 const plans=document.getElementById("licensePlansList");
 plans.innerHTML=(SaaS.db.plans||[]).map(p=>{const l=SaaS.PLAN_LIMITS[SaaS.planTier(p)];return `<article class="addon-card"><strong>${p.name}</strong><div class="addon-price">${SaaS.money?.(Number(p.price||0))||"$"+p.price}<small>/ mes</small></div><small>${l.branches>=999?"Sucursales ilimitadas":l.branches+" sucursal(es)"} · ${l.staff>=999?"Personal ilimitado":l.staff+" empleados"} · Marca blanca: ${l.whiteLabel?"Sí":"No"}</small></article>`}).join("");
};
const oldRoute_150=SaaS.routeSession;
if(oldRoute_150)SaaS.routeSession=function(){oldRoute_150();setTimeout(()=>SaaS.guardBusinessLicense(),100)};
const oldSwitch_150=SaaS.switchTenant;
if(oldSwitch_150)SaaS.switchTenant=function(id,opts){const r=oldSwitch_150(id,opts);setTimeout(()=>SaaS.guardBusinessLicense(),100);return r};
const oldRenderAll_150=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_150();SaaS.renderLicenses()};
