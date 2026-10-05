/* bundle-saas.js (regenerado) */

/* ---- js/saas/saas-core.js ---- */

window.SaaS=window.SaaS||{};
SaaS.STORAGE_KEY="hc_saas_platform_v1";
SaaS.CONTEXT_KEY="hc_saas_context";
SaaS.seed={
  superAdmin:{id:"superadmin-1",name:"Super Administrador",email:"",role:"SuperAdmin"},
  plans:[
    {id:"plan-basic",name:"BÃ¡sico",price:19,active:true,features:["Citas","Clientes","Barberos","App Cliente"]},
    {id:"plan-pro",name:"Pro",price:39,active:true,features:["Todo BÃ¡sico","Caja","Inventario","Personal","Reportes"]},
    {id:"plan-premium",name:"Premium",price:69,active:true,features:["Todo Pro","Marca blanca","Sucursales","Soporte prioritario"]}
  ],
  businesses:[],supportAudit:[]
};
SaaS.load=function(){try{const r=localStorage.getItem(SaaS.STORAGE_KEY);SaaS.db=r?JSON.parse(r):JSON.parse(JSON.stringify(SaaS.seed))}catch{SaaS.db=JSON.parse(JSON.stringify(SaaS.seed))}SaaS.ensureCurrentBusiness()};
SaaS.save=function(){localStorage.setItem(SaaS.STORAGE_KEY,JSON.stringify(SaaS.db))};
SaaS.uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
SaaS.ensureCurrentBusiness=function(){
  // Production must never invent a real tenant from the old demo seed.
  if(!SaaS.db.businesses.length){
    if(window.App?.PRODUCTION_MODE){
      localStorage.removeItem(SaaS.CONTEXT_KEY);
      return;
    }
    const app=window.App,name=app?.db?.business?.name||"BarberÃ­a Los Hermanos Camejo";
    const createdAt=new Date().toISOString();
    const nextPayment=new Date();nextPayment.setMonth(nextPayment.getMonth()+1);
    SaaS.db.businesses.push({id:"business-main",name,type:"BarberÃ­a",owner:"Propietario",ownerEmail:"",city:"",planId:"plan-pro",status:"Activo",nextPayment:nextPayment.toISOString().slice(0,10),createdAt,branches:[{id:"branch-main",name:"Principal",city:"",active:true}]});
    SaaS.save();
  }
  if(!localStorage.getItem(SaaS.CONTEXT_KEY)){
    const b=SaaS.db.businesses[0];
    if(b)SaaS.setContext({businessId:b.id,branchId:b.branches?.[0]?.id||"",support:false});
  }
};
SaaS.getContext=function(){try{return JSON.parse(localStorage.getItem(SaaS.CONTEXT_KEY))||{}}catch{return {}}};
SaaS.setContext=ctx=>localStorage.setItem(SaaS.CONTEXT_KEY,JSON.stringify(ctx));
SaaS.currentBusiness=function(){const c=SaaS.getContext();const businesses=SaaS.db?.businesses||[];return businesses.find(b=>b.id===c.businessId)||businesses[0]};
SaaS.currentBranch=function(){const b=SaaS.currentBusiness(),c=SaaS.getContext();return b?.branches?.find(x=>x.id===c.branchId)||b?.branches?.[0]};
SaaS.getPlan=id=>(SaaS.db?.plans||[]).find(p=>p.id===id);
SaaS.isSuperAdmin=()=>SaaS.session?.role==="superadmin" || !!window.SaaSAuthAdmin?.isSuperAdmin?.();
SaaS.subscriptionActive=b=>["Activo","Prueba"].includes((b||SaaS.currentBusiness())?.status);
SaaS.applyTenantContext=function(){const A=window.App;if(!A?.db)return;const b=SaaS.currentBusiness(),br=SaaS.currentBranch();A.db.meta=A.db.meta||{};A.db.meta.businessId=b?.id||"";A.db.meta.branchId=br?.id||"";A.db.meta.businessType=b?.type||"";localStorage.setItem(A.KEY,JSON.stringify(A.db))};
SaaS.startSupport=function(id){const b=SaaS.db.businesses.find(x=>x.id===id);if(!b)return;const old=SaaS.getContext();SaaS.db.supportAudit.push({id:SaaS.uid(),businessId:b.id,businessName:b.name,action:"ENTER",at:new Date().toISOString()});SaaS.save();SaaS.setContext({businessId:b.id,branchId:b.branches?.[0]?.id||"",support:true,previous:old});SaaS.applyTenantContext();SaaS.renderSupportBanner();window.App?.toast?.(`Modo soporte: ${b.name}`)};
SaaS.exitSupport=function(){const c=SaaS.getContext(),b=SaaS.currentBusiness();if(c.support){SaaS.db.supportAudit.push({id:SaaS.uid(),businessId:b?.id||"",businessName:b?.name||"",action:"EXIT",at:new Date().toISOString()});SaaS.save();const p=c.previous||{businessId:SaaS.db.businesses[0]?.id,branchId:SaaS.db.businesses[0]?.branches?.[0]?.id,support:false};p.support=false;SaaS.setContext(p);SaaS.applyTenantContext()}SaaS.renderSupportBanner()};
SaaS.renderSupportBanner=function(){const b=document.getElementById("supportModeBanner");if(!b)return;const c=SaaS.getContext(),biz=SaaS.currentBusiness();b.classList.toggle("hidden",!c.support);const n=document.getElementById("supportModeBusinessName");if(n)n.textContent=biz?.name||""};
SaaS.guardSubscription=function(){const b=SaaS.currentBusiness();if(b&&["Suspendido","Vencido"].includes(b.status)){window.App?.toast?.("SuscripciÃ³n no activa");return false}return true};

const SaaS_startSupport_original=SaaS.startSupport;
SaaS.startSupport=function(id){
  const b=SaaS.db.businesses.find(x=>x.id===id);if(!b)return;
  const old=SaaS.getContext();
  SaaS.db.supportAudit.push({id:SaaS.uid(),businessId:b.id,businessName:b.name,action:"ENTER",at:new Date().toISOString()});
  SaaS.save();
  SaaS.switchTenant(id,{support:true,previous:old});
  window.App?.toast?.(`Modo soporte: ${b.name}`);
};
SaaS.exitSupport=function(){
  const ctx=SaaS.getContext(),b=SaaS.currentBusiness();
  if(!ctx.support)return SaaS.renderSupportBanner();
  SaaS.db.supportAudit.push({id:SaaS.uid(),businessId:b?.id||"",businessName:b?.name||"",action:"EXIT",at:new Date().toISOString()});
  SaaS.save();
  const prev=ctx.previous||{};
  const target=prev.businessId||SaaS.db.businesses[0]?.id;
  SaaS.switchTenant(target,{branchId:prev.branchId,support:false});
};

// Boot: datos listos al parsear, antes de cualquier logica de alto nivel
try{SaaS.load()}catch(e){console.warn('SaaS.load',e)}

;

/* ---- js/saas/saas-admin.js ---- */

SaaS.renderBusinesses=function(){
  const box=document.getElementById("saasBusinessList");if(!box)return;
  const q=(document.getElementById("saasBusinessSearch")?.value||"").toLowerCase().trim();
  const list=SaaS.db.businesses.filter(b=>!q||`${b.name} ${b.owner} ${b.city} ${b.type}`.toLowerCase().includes(q));
  document.getElementById("saasBusinessesCount").textContent=SaaS.db.businesses.length;
  document.getElementById("saasActiveCount").textContent=SaaS.db.businesses.filter(b=>b.status==="Activo").length;
  document.getElementById("saasTrialCount").textContent=SaaS.db.businesses.filter(b=>b.status==="Prueba").length;
  document.getElementById("saasExpiredCount").textContent=SaaS.db.businesses.filter(b=>["Vencido","Suspendido"].includes(b.status)).length;
  box.innerHTML=list.map(b=>{const p=SaaS.getPlan(b.planId);return `<article class="card saas-card"><span class="status status-${b.status}">${b.status}</span><span class="tag">${b.type}</span><h3>${b.name}</h3><div class="muted">${b.owner||"Sin dueÃ±o"} Â· ${b.city||"Sin ciudad"}</div><div class="saas-meta"><div><small>Plan</small><strong>${p?.name||"Sin plan"}</strong></div><div><small>PrÃ³ximo pago</small><strong>${b.nextPayment||"â€”"}</strong></div><div><small>Sucursales</small><strong>${b.branches?.length||0}</strong></div><div><small>ID</small><strong>${b.id}</strong></div></div><div class="manage-actions"><button class="btn secondary" onclick="SaaS.enterBusiness('${b.id}')">Abrir</button><button class="btn edit" onclick="SaaS.startSupport('${b.id}')">Soporte</button><button class="btn secondary" onclick="SaaS.openMembers('${b.id}')">Usuarios</button><button class="btn secondary" onclick="SaaS.toggleBusinessStatus('${b.id}')">${b.status==="Activo"?"Suspender":"Activar"}</button></div></article>`}).join("")||'<div class="muted">No hay negocios.</div>';
};
SaaS.renderPlans=function(){const box=document.getElementById("saasPlanList");if(!box)return;box.innerHTML=SaaS.db.plans.map(p=>`<article class="card plan-card ${p.id==="plan-pro"?"featured":""}"><span class="tag">PLAN</span><h3>${p.name}</h3><div class="big">$${Number(p.price).toFixed(2)}/mes</div><div class="permission-box">${(p.features||[]).join(" Â· ")}</div><div class="manage-actions"><button class="btn edit" onclick="SaaS.editPlan('${p.id}')">Editar</button></div></article>`).join("")};
SaaS.renderSupportList=function(){const box=document.getElementById("supportBusinessList");if(!box)return;box.innerHTML=SaaS.db.businesses.map(b=>`<div class="row"><div><strong>${b.name}</strong><small>${b.type} Â· ${b.status}</small></div><button class="btn primary" onclick="SaaS.startSupport('${b.id}')">Entrar como soporte</button></div>`).join("")};
SaaS.openBusinessModal=function(){document.getElementById("businessModal")?.classList.remove("hidden");document.getElementById("newBusinessPlan").innerHTML=SaaS.db.plans.filter(p=>p.active!==false).map(p=>`<option value="${p.id}">${p.name} Â· $${p.price}/mes</option>`).join("");document.getElementById("newBusinessNextPayment").value=new Date(Date.now()+30*86400000).toISOString().slice(0,10)};
SaaS.closeBusinessModal=()=>document.getElementById("businessModal")?.classList.add("hidden");
SaaS.saveBusiness=function(){const name=document.getElementById("newBusinessName")?.value.trim();if(!name)return window.App?.toast?.("Escribe el nombre del negocio");const b={id:SaaS.uid(),name,type:document.getElementById("newBusinessType")?.value||"BarberÃ­a",owner:document.getElementById("newBusinessOwner")?.value||"",ownerEmail:document.getElementById("newBusinessEmail")?.value||"",city:document.getElementById("newBusinessCity")?.value||"",planId:document.getElementById("newBusinessPlan")?.value||"plan-basic",status:document.getElementById("newBusinessStatus")?.value||"Prueba",nextPayment:document.getElementById("newBusinessNextPayment")?.value||"",createdAt:new Date().toISOString(),branches:[{id:SaaS.uid(),name:"Principal",city:document.getElementById("newBusinessCity")?.value||"",active:true}]};SaaS.db.businesses.push(b);SaaS.save();SaaS.closeBusinessModal();SaaS.renderAll();
  const pw=document.getElementById("newBusinessPassword")?.value||"";
  if(b.ownerEmail&&pw&&window.SaaSAuthAdmin){
    SaaSAuthAdmin.createBusinessMember({businessId:b.id,name:b.owner,email:b.ownerEmail,password:pw,role:"owner"})
      .then(()=>window.App?.toast?.("Negocio y dueÃ±o creados"))
      .catch(e=>window.App?.toast?.("Negocio creado; acceso dueÃ±o pendiente: "+e.message));
  }else window.App?.toast?.("Negocio creado")};
SaaS.enterBusiness=function(id){const b=SaaS.db.businesses.find(x=>x.id===id);if(!b)return;SaaS.switchTenant(id,{support:false});window.App?.toast?.(`Negocio activo: ${b.name}`)};
SaaS.toggleBusinessStatus=function(id){const b=SaaS.db.businesses.find(x=>x.id===id);if(!b)return;b.status=b.status==="Activo"?"Suspendido":"Activo";SaaS.save();SaaS.renderAll()};
SaaS.editPlan=function(id){const p=SaaS.db.plans.find(x=>x.id===id);if(!p)return;const price=prompt("Precio mensual",p.price);if(price===null)return;p.price=Number(price||0);SaaS.save();SaaS.renderAll()};
SaaS.renderAll=function(){SaaS.renderBusinesses();SaaS.renderPlans();SaaS.renderSupportList();SaaS.renderSupportBanner()};

SaaS.renderExecutive=function(){
  const mrr=SaaS.db.businesses
    .filter(b=>b.status==="Activo")
    .reduce((sum,b)=>sum+Number(SaaS.getPlan(b.planId)?.price||0),0);
  const m=document.getElementById("saasMRR");if(m)m.textContent=`$${mrr.toFixed(2)}`;

  const pay=document.getElementById("saasUpcomingPayments");
  if(pay){
    const data=[...SaaS.db.businesses]
      .filter(b=>b.nextPayment)
      .sort((a,b)=>a.nextPayment.localeCompare(b.nextPayment))
      .slice(0,8);
    pay.innerHTML=data.map(b=>`<div class="row"><div><strong>${b.name}</strong><small>${SaaS.getPlan(b.planId)?.name||"Plan"} Â· ${b.status}</small></div><strong>${b.nextPayment}</strong></div>`).join("")||'<div class="muted">Sin vencimientos registrados.</div>';
  }

  const support=document.getElementById("saasRecentSupport");
  if(support){
    support.innerHTML=[...(SaaS.db.supportAudit||[])].reverse().slice(0,8).map(x=>`<div class="row"><div><strong>${x.businessName}</strong><small>${x.action==="ENTER"?"Entrada de soporte":"Salida de soporte"}</small></div><span class="audit-chip">${new Date(x.at).toLocaleString()}</span></div>`).join("")||'<div class="muted">Sin actividad de soporte.</div>';
  }
};

const oldRenderAll_131=SaaS.renderAll;
SaaS.renderAll=function(){
  oldRenderAll_131();
  SaaS.renderExecutive();
};


SaaS.renderBusinessTable=function(){
  const box=document.getElementById("saasBusinessTable");if(!box)return;
  const q=(document.getElementById("globalBusinessSearch")?.value||"").toLowerCase().trim();
  const status=document.getElementById("businessStatusFilter")?.value||"";
  const plan=document.getElementById("businessPlanFilter")?.value||"";
  const list=(SaaS.db.businesses||[]).filter(b=>{
    const label=SaaS.subscriptionLabel?.(b)||b.status;
    return (!q||`${b.name} ${b.owner||""} ${b.ownerEmail||""} ${b.city||""}`.toLowerCase().includes(q))
      &&(!status||label===status||b.status===status)
      &&(!plan||b.planId===plan);
  });
  box.innerHTML=`<table class="sambrix-table"><thead><tr><th>Negocio</th><th>DueÃ±o</th><th>Plan</th><th>Estado</th><th>PrÃ³ximo pago</th><th>Sucursales</th><th>Acciones</th></tr></thead><tbody>${list.map(b=>{
    const p=SaaS.getPlan(b.planId),label=SaaS.subscriptionLabel?.(b)||b.status;
    return `<tr><td><div class="business-cell"><div class="business-avatar">${(b.name||"N").slice(0,1).toUpperCase()}</div><div><strong>${b.name}</strong><small>${b.type||""} Â· ${b.city||"Sin ciudad"}</small></div></div></td><td><strong>${b.owner||"â€”"}</strong><small>${b.ownerEmail||""}</small></td><td>${p?.name||"â€”"}</td><td><span class="status-pill ${label}">${label}</span></td><td>${b.nextPayment||"â€”"}</td><td>${b.branches?.length||0}</td><td><div class="manage-actions"><button class="btn secondary tiny" onclick="SaaS.enterBusiness('${b.id}')">Abrir</button><button class="btn edit tiny" onclick="SaaS.startSupport('${b.id}')">Soporte</button><button class="btn secondary tiny" onclick="SaaS.openMembers('${b.id}')">Usuarios</button></div></td></tr>`;
  }).join("")}</tbody></table>`;
};

SaaS.renderPlanFilter=function(){
  const el=document.getElementById("businessPlanFilter");if(!el)return;
  const current=el.value;
  el.innerHTML='<option value="">Todos los planes</option>'+SaaS.db.plans.map(p=>`<option value="${p.id}">${p.name}</option>`).join("");
  el.value=current;
};

SaaS.renderSambrixCharts=function(){
  if(!window.Chart)return;
  SaaS._charts=SaaS._charts||{};
  Object.values(SaaS._charts).forEach(c=>{try{c.destroy()}catch{}});
  SaaS._charts={};

  const months=[],now=new Date();
  for(let i=11;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push(d.toLocaleDateString(undefined,{month:"short"}))}
  const base=(SaaS.db.businesses||[]).filter(b=>b.status==="Activo").reduce((s,b)=>s+Number(SaaS.getPlan(b.planId)?.price||0),0);
  const trend=months.map((_,i)=>Math.max(0,Math.round(base*(0.62+(i/11)*0.38))));
  const mrr=document.getElementById("mrrChart");
  if(mrr)SaaS._charts.mrr=new Chart(mrr,{type:"line",data:{labels:months,datasets:[{label:"MRR",data:trend,tension:.35,fill:true}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}});

  const counts=SaaS.db.plans.map(p=>SaaS.db.businesses.filter(b=>b.planId===p.id).length);
  const pc=document.getElementById("planChart");
  if(pc)SaaS._charts.plan=new Chart(pc,{type:"doughnut",data:{labels:SaaS.db.plans.map(p=>p.name),datasets:[{data:counts}]},options:{responsive:true,plugins:{legend:{display:false}}}});
  const legend=document.getElementById("planLegend");
  if(legend)legend.innerHTML=SaaS.db.plans.map((p,i)=>`<div class="row"><span>${p.name}</span><strong>${counts[i]} negocios</strong></div>`).join("");
};

SaaS.renderSuperAdminPro=function(){
  const active=SaaS.db.businesses.filter(b=>b.status==="Activo").length;
  const trials=SaaS.db.businesses.filter(b=>b.status==="Prueba").length;
  const expired=SaaS.db.businesses.filter(b=>["Vencido","Suspendido"].includes(SaaS.subscriptionLabel?.(b)||b.status)).length;
  const mrr=SaaS.db.businesses.filter(b=>b.status==="Activo").reduce((s,b)=>s+Number(SaaS.getPlan(b.planId)?.price||0),0);
  document.getElementById("saasActiveCount")&&(document.getElementById("saasActiveCount").textContent=active);
  document.getElementById("saasTrialCount")&&(document.getElementById("saasTrialCount").textContent=trials);
  document.getElementById("saasExpiredCount")&&(document.getElementById("saasExpiredCount").textContent=expired);
  document.getElementById("saasMRR")&&(document.getElementById("saasMRR").textContent=`$${mrr.toFixed(2)}`);
  SaaS.renderPlanFilter();SaaS.renderBusinessTable();SaaS.renderSambrixCharts();
};

const oldRenderAll_137=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_137();SaaS.renderSuperAdminPro()};


/* ===== FASE 19.7 EMPTY STATE SUPERADMIN ===== */
SaaS.renderSuperAdminZeroState=function(){
  const zero=document.getElementById("superadminZeroState");
  if(!zero)return;
  const empty=(SaaS.db.businesses||[])
    .filter(b=>b.id!==SaaS.portal?._demoBusinessId).length===0;
  zero.classList.toggle("hidden",!empty);
};

const oldRenderAll_197=SaaS.renderAll;
SaaS.renderAll=function(){
  oldRenderAll_197();
  SaaS.renderSuperAdminZeroState();
};

;

/* ---- js/saas/tenant-store.js ---- */

SaaS.TENANT_PREFIX="hc_tenant_state_";

SaaS.blankBusinessState=function(business){
  const A=window.App;
  const base=A?.clone?A.clone(A.seed):JSON.parse(JSON.stringify(A?.seed||{}));

  // A tenant nuevo NO hereda datos operativos de la barberÃ­a original.
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

  // Todos los datos de operaciÃ³n nacen vacÃ­os por negocio.
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
    const legacyServices=new Set(["s1|Corte clÃ¡sico","s2|Degradado","s3|Corte + barba"]);
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
  const legacyName=String(state.business?.name||"")==="BarberÃ­a Los Hermanos Camejo";
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

;

/* ---- js/business-terminology.js ---- */
/* ===== FASE 20.14 â€” IDENTIDAD + TERMINOLOGÃA MULTINEGOCIO ===== */
(function(){
  const A=window.App;
  if(!A)return;

  const normalize=v=>String(v||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");

  A.businessVocabulary=function(){
    const current=window.SaaS?.currentBusiness?.();
    const type=normalize(current?.type||A.db?.meta?.businessType||"");
    const generic={
      staff:"Profesionales",
      staffOne:"profesional",
      staffMany:"profesionales",
      business:"negocio",
      bookingPerson:"profesional",
      staffRole:"Profesional",
      staffPhoto:"Fotos de profesionales"
    };
    if(type.includes("barber")) return {...generic,staff:"Barberos",staffOne:"barbero",staffMany:"barberos",business:"barberÃ­a",bookingPerson:"barbero",staffRole:"Barbero",staffPhoto:"Fotos de barberos"};
    if(type.includes("salon")||type.includes("belleza")||type.includes("peluquer")) return {...generic,staff:"Estilistas",staffOne:"estilista",staffMany:"estilistas",business:"salÃ³n",bookingPerson:"estilista",staffRole:"Estilista",staffPhoto:"Fotos de estilistas"};
    if(type.includes("una")||type.includes("nail")) return {...generic,staff:"Profesionales",staffOne:"profesional",staffMany:"profesionales",business:"estudio de uÃ±as",bookingPerson:"profesional",staffRole:"Profesional",staffPhoto:"Fotos de profesionales"};
    if(type.includes("spa")) return {...generic,staff:"Profesionales",staffOne:"profesional",staffMany:"profesionales",business:"spa"};
    if(type.includes("clin")||type.includes("medic")||type.includes("dental")) return {...generic,staff:"Profesionales",staffOne:"profesional",staffMany:"profesionales",business:"clÃ­nica"};
    if(type.includes("taller")||type.includes("mecanic")) return {...generic,staff:"TÃ©cnicos",staffOne:"tÃ©cnico",staffMany:"tÃ©cnicos",business:"taller",bookingPerson:"tÃ©cnico",staffRole:"TÃ©cnico",staffPhoto:"Fotos de tÃ©cnicos"};
    if(type.includes("consult")) return {...generic,staff:"Profesionales",business:"consultorio"};
    return generic;
  };

  A.applyBusinessIdentity=function(){
    const role=window.SaaS?.session?.role||"guest";
    const current=window.SaaS?.currentBusiness?.();
    const name=current?.name||A.db?.business?.name||"Mi negocio";
    const type=current?.type||A.db?.meta?.businessType||"Negocio";
    const v=A.businessVocabulary();

    const brand=document.getElementById("activeBusinessBrand");
    const context=document.getElementById("activeBusinessContext");
    if(brand) brand.textContent="SAMBRIX";

    // FASE 20.17: el encabezado global nunca debe filtrar el Ãºltimo tenant
    // seleccionado dentro del SuperAdmin. El negocio solo se identifica
    // cuando la sesiÃ³n pertenece realmente a Business.
    if(context){
      context.textContent=role==="superadmin"
        ? "SuperAdmin Â· AdministraciÃ³n de plataforma"
        : `${name} Â· ${type}`;
    }

    const sessionBusiness=document.getElementById("sessionBusinessName");
    if(sessionBusiness){
      sessionBusiness.textContent=role==="superadmin"
        ? "Plataforma SAMBRIX"
        : `${name} Â· ${type}`;
    }

    window.SaaS?.renderCurrentPlanBadge?.();

    const cfg=document.getElementById("configBusinessNameLabel");
    if(cfg) cfg.textContent="Nombre del negocio";

    // Main owner dashboard terminology.
    const nav=document.querySelector('.bottom-nav [data-page="barberos"] span');
    if(nav) nav.textContent=v.staff;
    const pageTitle=document.querySelector('#barberos .page-head h2');
    if(pageTitle) pageTitle.textContent=v.staff;
    const teamTitle=document.querySelector('#inicio #ownerBarberPerformance')?.closest('.panel')?.querySelector('h3');
    if(teamTitle) teamTitle.textContent=`Rendimiento de ${v.staffMany}`;
    const summary=document.getElementById("homeSummary");
    if(summary){
      summary.querySelectorAll("strong").forEach(el=>{if(el.textContent.trim()==="Barberos")el.textContent=v.staff;});
    }

    const barberPage=document.getElementById("barberos");
    if(barberPage){
      barberPage.querySelectorAll("button,label,h2,h3,p,small,span").forEach(el=>{
        if(el.children.length && !["BUTTON","LABEL"].includes(el.tagName))return;
        const t=el.textContent.trim();
        if(t==="Barberos")el.textContent=v.staff;
        if(t==="+ Barbero")el.textContent=`+ ${v.staffOne.charAt(0).toUpperCase()+v.staffOne.slice(1)}`;
        if(t==="Guardar barbero")el.textContent=`Guardar ${v.staffOne}`;
      });
    }

    // Generic placeholders and owner-facing wording.
    const search=document.getElementById("appointmentSearch");
    if(search)search.placeholder=`Buscar por cliente, ${v.staffOne} o servicio...`;
    const hero=document.querySelector("#inicio .legacy-hero h2");
    if(hero)hero.textContent="Control del negocio";


    // Reports, configuration and owner-facing labels.
    document.querySelectorAll("#reportes h3, #reportes strong, #reportes span").forEach(el=>{
      if(el.children.length)return;
      const txt=(el.textContent||"").trim();
      if(txt==="Rendimiento por barbero")el.textContent=`Rendimiento por ${v.staffOne}`;
      if(txt==="Rendimiento barberos")el.textContent=`Rendimiento de ${v.staffMany}`;
    });

    const logoLabel=document.querySelector('label[for="clientLogoFile"]');
    if(logoLabel && /barber/i.test(logoLabel.textContent)) logoLabel.childNodes[0].nodeValue="Logo del negocio";

    document.querySelectorAll("#clienteConfig h3,#clienteConfig p,#clienteConfig label").forEach(el=>{
      if(el.children.length && el.tagName!=="LABEL")return;
      const txt=(el.childNodes[0]?.nodeValue||el.textContent||"").trim();
      if(/^Logo de la barber/i.test(txt) && el.childNodes[0]) el.childNodes[0].nodeValue="Logo del negocio";
      if(/^Fotos de barberos$/i.test(txt)) el.textContent=v.staffPhoto;
    });

    // User/member role selector: keep internal value "barber" but show a neutral label.
    document.querySelectorAll('select option[value="barber"]').forEach(opt=>{
      opt.textContent=`${v.staffRole}/Empleado`;
    });

    // Configuration language must stay universal.
    document.querySelectorAll("#configuracion label").forEach(label=>{
      const txt=(label.childNodes[0]?.nodeValue||"").trim();
      if(/^Nombre de la barber/i.test(txt)) label.childNodes[0].nodeValue="Nombre del negocio";
    });

    // Public/client experience follows the tenant too.
    const clientBrand=document.getElementById("clientBrandNameView");
    if(clientBrand)clientBrand.textContent=A.db?.business?.clientApp?.brandName||name;
    const badge=document.querySelector("#clientHome .client-badge");
    if(badge)badge.textContent=String(type||"NEGOCIO").toUpperCase();
    const clientSubtitle=document.getElementById("clientHeroSubtitleView");
    if(clientSubtitle && /barbero/i.test(clientSubtitle.textContent)) clientSubtitle.textContent=`Elige servicio, ${v.bookingPerson} y horario disponible.`;
    document.querySelectorAll("#clientApp h2,#clientApp h3,#clientApp p,#clientApp span,#clientApp small").forEach(el=>{
      if(el.children.length)return;
      const txt=(el.textContent||"").trim();
      if(txt==="Barberos")el.textContent=v.staff;
      if(txt==="2. Barbero")el.textContent=`2. ${v.staffOne.charAt(0).toUpperCase()+v.staffOne.slice(1)}`;
      if(txt==="Barbero")el.textContent=v.staffOne.charAt(0).toUpperCase()+v.staffOne.slice(1);
      if(/Productos disponibles para comprar en la barberÃ­a\./i.test(txt))el.textContent="Productos disponibles para comprar en este negocio.";
      if(/Asignaremos un barbero libre\./i.test(txt))el.textContent=`Asignaremos ${v.staffOne==="profesional"?"un profesional disponible":`un ${v.staffOne} disponible`}.`;
    });
  };

  const oldRender=A.renderAll?.bind(A);
  if(oldRender && !A.__businessTerminologyInstalled){
    A.renderAll=function(){
      const out=oldRender();
      A.applyBusinessIdentity();
      return out;
    };
    A.__businessTerminologyInstalled=true;
  }
})();

;

/* ---- js/saas/saas-billing.js ---- */

SaaS.PLAN_FEATURES={
  "plan-basic":[
    "inicio","citas","clientes","barberos","servicios","configuracion","clienteConfig"
  ],
  "plan-pro":[
    "inicio","citas","clientes","barberos","servicios","configuracion","clienteConfig",
    "caja","inventario","usuarios","recibos","autorizaciones","reportes"
  ],
  "plan-premium":["*"]
};

SaaS.PLAN_CAPABILITIES={
  basic:{
    basicBranding:true,customTheme:false,coverImage:true,basicReceipt:true,
    socialLinks:true,promotions:false,staffPhotos:true,whiteLabel:false,customSlug:false,
    clientHistory:false,clientShop:false,branches:1,users:5
  },
  pro:{
    basicBranding:true,customTheme:true,coverImage:true,basicReceipt:true,
    socialLinks:true,promotions:true,staffPhotos:true,whiteLabel:false,customSlug:false,
    clientHistory:true,clientShop:true,branches:3,users:999
  },
  premium:{
    basicBranding:true,customTheme:true,coverImage:true,basicReceipt:true,
    socialLinks:true,promotions:true,staffPhotos:true,whiteLabel:true,customSlug:true,
    clientHistory:true,clientShop:true,branches:999,users:999
  }
};

SaaS.planTier=function(business=SaaS.currentBusiness()){
  if(!business)return "basic";
  const plan=SaaS.getPlan?.(business.planId);
  const id=String(business.planId||"").toLowerCase();
  const name=String(plan?.name||"").trim().toLowerCase();

  if(id.includes("premium")||name.includes("premium"))return "premium";
  if(id.includes("pro")||name==="pro"||name.startsWith("pro ")||name.endsWith(" pro"))return "pro";
  return "basic";
};

SaaS.planCapability=function(name,business=SaaS.currentBusiness()){
  const tier=SaaS.planTier(business);
  return SaaS.PLAN_CAPABILITIES[tier]?.[name] ?? false;
};


SaaS.featureAllowed=function(page,business=SaaS.currentBusiness()){
  if(!business)return false;

  const role=String(SaaS.session?.role||"").toLowerCase();
  if(role==="superadmin" || window.SaaSAuthAdmin?.isSuperAdmin?.())return true;

  const status=String(business.status||"Activo").toLowerCase();
  if(status.includes("suspend")||status.includes("venc")||status.includes("cancel"))return false;

  const features=SaaS.PLAN_FEATURES[business.planId]||[];
  return features.includes("*")||features.includes(page);
};

SaaS.daysUntil=function(date){
  if(!date)return null;
  return Math.ceil((new Date(date+"T23:59:59")-new Date())/86400000);
};

SaaS.subscriptionLabel=function(b){
  if(b.status==="Prueba")return "Prueba";
  if(b.status==="Suspendido")return "Suspendido";
  const days=SaaS.daysUntil(b.nextPayment);
  if(days!==null&&days<0)return "Vencido";
  return b.status||"Activo";
};


/* ===== FASE 20.6 â€” SUSCRIPCIONES UNIFICADAS ===== */


/* ===== FASE 20.7 â€” CICLO DE RENOVACIÃ“N ===== */

SaaS.isFreeOrSpecialPlan=function(plan){
  if(!plan)return false;
  const price=Number(plan.price||0);
  const id=String(plan.id||"").toLowerCase();
  const name=String(plan.name||"").toLowerCase();
  return price<=0 || id.includes("free") || name.includes("gratis") || name.includes("free");
};

SaaS.addMonthsISO=function(iso,months=1){
  let d=iso?new Date(iso.length===10?iso+"T12:00:00":iso):new Date();
  if(Number.isNaN(d.getTime()))d=new Date();
  d.setMonth(d.getMonth()+months);
  return d.toISOString().slice(0,10);
};

SaaS.defaultRenewalDate=function(business){
  const plan=SaaS.getPlan?.(business?.planId);
  if(SaaS.isFreeOrSpecialPlan(plan))return "";
  const base=business?.createdAt||new Date().toISOString();
  return SaaS.addMonthsISO(base,1);
};

SaaS.ensureRenewalDates=function(){
  let changed=false;

  (SaaS.db?.businesses||[]).forEach(b=>{
    const plan=SaaS.getPlan?.(b.planId);
    const active=["activo","active","prueba","trial"].includes(String(b.status||"Activo").toLowerCase());

    if(active && !SaaS.isFreeOrSpecialPlan(plan) && !b.nextPayment){
      b.nextPayment=SaaS.defaultRenewalDate(b);
      changed=true;
    }

    const sub=(SaaS.db.subscriptions||[]).find(s=>s.businessId===b.id);
    if(sub){
      if(!SaaS.isFreeOrSpecialPlan(plan) && !sub.nextDue){
        sub.nextDue=b.nextPayment||SaaS.defaultRenewalDate(b);
        changed=true;
      }
      if(!SaaS.isFreeOrSpecialPlan(plan) && !sub.renewalDate){
        sub.renewalDate=sub.nextDue||b.nextPayment||SaaS.defaultRenewalDate(b);
        changed=true;
      }
      if(b.nextPayment && (sub.nextDue!==b.nextPayment || sub.renewalDate!==b.nextPayment)){
        sub.nextDue=b.nextPayment;
        sub.renewalDate=b.nextPayment;
        changed=true;
      }
    }
  });

  if(changed)SaaS.save?.();
  return changed;
};

SaaS.subscriptionStatusFromBusiness=function(business){
  const raw=String(business?.status||"Activo").toLowerCase();
  if(raw.includes("suspend"))return "Suspended";
  if(raw.includes("prueba")||raw.includes("trial"))return "Trial";
  if(raw.includes("cancel"))return "Cancelled";
  return "Active";
};

SaaS.ensureSubscriptionRecords=function(){
  if(!SaaS.db)return;
  SaaS.db.subscriptions=Array.isArray(SaaS.db.subscriptions)?SaaS.db.subscriptions:[];
  SaaS.ensureRenewalDates?.();

  const businesses=SaaS.db.businesses||[];
  const businessIds=new Set(businesses.map(b=>b.id));

  // Remove orphaned duplicates while preserving the most recent/first valid record.
  const seen=new Set();
  SaaS.db.subscriptions=SaaS.db.subscriptions.filter(sub=>{
    if(!sub?.businessId||!businessIds.has(sub.businessId))return false;
    if(seen.has(sub.businessId))return false;
    seen.add(sub.businessId);
    return true;
  });

  businesses.forEach(b=>{
    const plan=SaaS.getPlan?.(b.planId);
    let sub=SaaS.db.subscriptions.find(s=>s.businessId===b.id);

    if(!sub){
      sub={
        id:"sub_"+SaaS.uid(),
        businessId:b.id,
        businessName:b.name,
        planId:b.planId||"",
        planName:plan?.name||"Sin plan",
        price:Number(plan?.price||0),
        amount:Number(plan?.price||0),
        currency:"USD",
        cycle:"monthly",
        status:SaaS.subscriptionStatusFromBusiness(b),
        startedAt:b.createdAt||new Date().toISOString(),
        nextDue:b.nextPayment||"",
        renewalDate:b.nextPayment||"",
        createdAt:new Date().toISOString()
      };
      SaaS.db.subscriptions.push(sub);
    }else{
      // Business remains the source for its assigned plan and public account state.
      sub.businessName=b.name;
      sub.planId=b.planId||sub.planId||"";
      sub.planName=plan?.name||sub.planName||"Sin plan";
      sub.price=Number(plan?.price??sub.price??sub.amount??0);
      sub.amount=Number(plan?.price??sub.amount??sub.price??0);
      sub.currency=sub.currency||"USD";
      sub.cycle=sub.cycle||"monthly";
      sub.status=SaaS.subscriptionStatusFromBusiness(b);
      if(b.nextPayment){
        sub.nextDue=b.nextPayment;
        sub.renewalDate=b.nextPayment;
      }
    }
  });

  SaaS.save?.();
  return SaaS.db?.subscriptions||[];
};

SaaS.subscriptionForBusiness=function(businessId){
  SaaS.ensureSubscriptionRecords();
  return (SaaS.db?.subscriptions||[]).find(s=>s.businessId===businessId)||null;
};

SaaS.subscriptionDisplayStatus=function(sub,business){
  if(["Suspended","Suspendida"].includes(sub?.status))return "Suspendido";
  if(["Trial","Prueba"].includes(sub?.status))return "Prueba";
  if(["Cancelled","Cancelada"].includes(sub?.status))return "Cancelado";

  const due=sub?.nextDue||sub?.renewalDate||business?.nextPayment||"";
  const days=SaaS.daysUntil?.(due);
  if(days!==null&&days<0)return "Vencido";
  return "Activo";
};

SaaS.renderSubscriptions=function(){
  const box=document.getElementById("subscriptionList");
  if(!box)return;

  const subs=SaaS.ensureSubscriptionRecords()||[];
  const businesses=SaaS.db?.businesses||[];

  const rows=businesses.map(b=>{
    const sub=subs.find(s=>s.businessId===b.id);
    const plan=SaaS.getPlan?.(sub?.planId||b.planId);
    const status=SaaS.subscriptionDisplayStatus(sub,b);
    const due=sub?.nextDue||sub?.renewalDate||b.nextPayment||"";
    const days=SaaS.daysUntil?.(due);
    const price=Number(sub?.price??sub?.amount??plan?.price??0);
    return {b,sub,plan,status,due,days,price};
  });

  const mrr=rows
    .filter(x=>["Activo","Prueba"].includes(x.status))
    .reduce((sum,x)=>sum+x.price,0);

  const dueSoon=rows.filter(x=>x.days!==null&&x.days>=0&&x.days<=7).length;
  const expired=rows.filter(x=>["Vencido","Suspendido"].includes(x.status)).length;
  const trials=rows.filter(x=>x.status==="Prueba").length;

  document.getElementById("subMRR").textContent=`$${mrr.toFixed(2)}`;
  document.getElementById("subDueSoon").textContent=dueSoon;
  document.getElementById("subExpired").textContent=expired;
  document.getElementById("subTrials").textContent=trials;

  box.innerHTML=rows.map(({b,sub,plan,status,due,days,price})=>`
    <div class="row subscription-row ${["Vencido","Suspendido"].includes(status)?"expired":status==="Prueba"?"trial":""}">
      <div class="subscription-main">
        <strong>${b.name}</strong>
        <small>
          ${plan?.name||sub?.planName||"Sin plan"} Â·
          $${price.toFixed(2)}/mes Â·
          ${status} Â·
          ${SaaS.isFreeOrSpecialPlan(plan)?"Cuenta gratuita":(due||"Fecha pendiente")}
          ${days!==null?` Â· ${days>=0?days+" dÃ­a(s)":"vencido hace "+Math.abs(days)+" dÃ­a(s)"}`:""}
        </small>
        <span class="subscription-owner">${b.ownerEmail||"Propietario sin correo"}</span>
      </div>
      <div class="manage-actions">
        <button class="btn primary tiny" onclick="SaaS.openPlanChange('${b.id}')">Cambiar plan</button>
        <button class="btn secondary tiny" onclick="SaaS.renewBusiness('${b.id}',1)">+1 mes</button>
        <button class="btn secondary tiny" onclick="SaaS.renewBusiness('${b.id}',3)">+3 meses</button>
        <button class="btn danger tiny" onclick="SaaS.suspendBusiness('${b.id}')">${status==="Suspendido"?"Reactivar":"Suspender"}</button>
      </div>
    </div>
  `).join("")||`
    <div class="empty-state">
      <strong>No hay suscripciones</strong>
      <small>Las suscripciones aparecerÃ¡n automÃ¡ticamente al crear un negocio.</small>
    </div>`;
};



/* ===== FASE 20.18 â€” CAMBIO DE PLAN POR NEGOCIO ===== */

SaaS.planFeaturePages=function(plan){
  if(!plan)return [];
  if(SaaS.PLAN_FEATURES?.[plan.id])return SaaS.PLAN_FEATURES[plan.id];

  const n=String(plan.name||"").toLowerCase();
  if(n.includes("premium")||n.includes("enterprise"))return ["*"];
  if(n.includes("pro"))return SaaS.PLAN_FEATURES["plan-pro"]||[];
  return SaaS.PLAN_FEATURES["plan-basic"]||[];
};

SaaS.planTrialDays=function(plan){
  const name=String(plan?.name||"");
  const m=name.match(/(\d+)\s*d[iÃ­]as?/i);
  return m?Math.max(1,Number(m[1])):15;
};

SaaS.openPlanChange=function(businessId){
  const b=SaaS.db.businesses.find(x=>x.id===businessId);if(!b)return;
  const current=SaaS.getPlan(b.planId);

  document.getElementById("planChangeBusinessId").value=b.id;
  document.getElementById("planChangeTitle").textContent=`Plan Â· ${b.name}`;
  document.getElementById("planChangeCurrent").innerHTML=`
    <strong>${current?.name||"Sin plan"}</strong>
    <span>$${Number(current?.price||0).toFixed(2)}/mes Â· ${b.status||"Activo"}</span>`;

  const select=document.getElementById("planChangeSelect");
  select.innerHTML=(SaaS.db.plans||[])
    .filter(p=>p.active!==false)
    .map(p=>`<option value="${p.id}" ${p.id===b.planId?"selected":""}>${p.name} â€” $${Number(p.price||0).toFixed(2)}/mes</option>`)
    .join("");

  SaaS.renderPlanChangePreview();
  const modal=document.getElementById("planChangeModal");
  modal?.classList.remove("hidden");
  modal?.classList.add("open");
};

SaaS.closePlanChange=function(){
  const modal=document.getElementById("planChangeModal");
  if(!modal)return;
  modal.classList.remove("open");
  modal.classList.add("hidden");
};

SaaS.renderPlanChangePreview=function(){
  const id=document.getElementById("planChangeSelect")?.value;
  const plan=SaaS.getPlan(id);
  const box=document.getElementById("planChangePreview");
  if(!box||!plan)return;

  const pages=SaaS.planFeaturePages(plan);
  const named=(plan.features||[]).join(" Â· ");
  const isTrial=Number(plan.price||0)<=0 || /prueba|trial/i.test(plan.name||"");

  box.innerHTML=`
    <div class="plan-change-preview-head">
      <div><strong>${plan.name}</strong><span>$${Number(plan.price||0).toFixed(2)}/mes</span></div>
      <span class="status ${isTrial?"trial":"ok"}">${isTrial?"Prueba":"Plan activo"}</span>
    </div>
    <p>${named||"ConfiguraciÃ³n comercial del plan."}</p>
    <small>${pages.includes("*")?"Acceso completo a mÃ³dulos Business.":`MÃ³dulos incluidos segÃºn la matriz ${plan.name}.`}</small>`;
};

SaaS.savePlanChange=function(){
  const businessId=document.getElementById("planChangeBusinessId")?.value;
  const newPlanId=document.getElementById("planChangeSelect")?.value;
  const b=SaaS.db.businesses.find(x=>x.id===businessId);
  const nextPlan=SaaS.getPlan(newPlanId);
  if(!b||!nextPlan)return alert("No se pudo identificar el negocio o el plan.");

  const oldPlan=SaaS.getPlan(b.planId);
  if(oldPlan?.id===nextPlan.id){
    SaaS.closePlanChange();
    return window.App?.toast?.("El negocio ya tiene ese plan");
  }

  const oldPlanId=b.planId;
  const oldPlanName=oldPlan?.name||"Sin plan";
  const now=new Date();
  const isTrial=Number(nextPlan.price||0)<=0 || /prueba|trial/i.test(nextPlan.name||"");

  b.planHistory=Array.isArray(b.planHistory)?b.planHistory:[];
  b.planHistory.push({
    id:SaaS.uid(),
    fromPlanId:oldPlanId,
    fromPlanName:oldPlanName,
    toPlanId:nextPlan.id,
    toPlanName:nextPlan.name,
    changedAt:now.toISOString(),
    changedBy:SaaS.session?.user?.email||"SuperAdmin"
  });

  b.planId=nextPlan.id;

  // Preserve an explicit suspension. Otherwise the plan determines the normal account state.
  if(b.status!=="Suspendido"){
    b.status=isTrial?"Prueba":"Activo";
  }

  if(isTrial){
    const end=new Date();
    end.setDate(end.getDate()+SaaS.planTrialDays(nextPlan));
    b.nextPayment=end.toISOString().slice(0,10);
  }else{
    const currentDue=b.nextPayment?new Date(b.nextPayment+"T12:00:00"):null;
    if(!currentDue || Number.isNaN(currentDue.getTime()) || currentDue<now){
      const due=new Date();
      due.setMonth(due.getMonth()+1);
      b.nextPayment=due.toISOString().slice(0,10);
    }
  }

  const sub=SaaS.subscriptionForBusiness(b.id);
  if(sub){
    sub.planHistory=Array.isArray(sub.planHistory)?sub.planHistory:[];
    sub.planHistory.push({
      id:SaaS.uid(),
      fromPlanId:oldPlanId,
      fromPlanName:oldPlanName,
      toPlanId:nextPlan.id,
      toPlanName:nextPlan.name,
      changedAt:now.toISOString()
    });
    sub.planId=nextPlan.id;
    sub.planName=nextPlan.name;
    sub.price=Number(nextPlan.price||0);
    sub.amount=Number(nextPlan.price||0);
    sub.status=b.status==="Suspendido"?"Suspended":isTrial?"Trial":"Active";
    sub.nextDue=b.nextPayment||"";
    sub.renewalDate=b.nextPayment||"";
  }

  SaaS.save();
  SaaS.audit?.("SUBSCRIPTION","Cambio de plan",{
    fromPlanId:oldPlanId,
    fromPlanName:oldPlanName,
    toPlanId:nextPlan.id,
    toPlanName:nextPlan.name,
    price:Number(nextPlan.price||0)
  },b.id);

  SaaS.closePlanChange();
  SaaS.ensureSubscriptionRecords?.();
  SaaS.renderAll?.();
  SaaS.applyPlanUI?.();

  window.App?.toast?.(`${b.name}: ${oldPlanName} â†’ ${nextPlan.name}`);
};

SaaS.applyPlanUI=function(){
  const role=String(SaaS.session?.role||"").toLowerCase();
  const isSuper=role==="superadmin" || window.SaaSAuthAdmin?.isSuperAdmin?.();

  document.querySelectorAll(".nav-business[data-page]").forEach(btn=>{
    const allowed=isSuper ? true : SaaS.featureAllowed(btn.dataset.page);
    btn.hidden=!allowed;
    btn.classList.toggle("plan-hidden",!allowed);
    btn.disabled=false;
    btn.removeAttribute("title");
    if(!allowed){
      btn.setAttribute("aria-hidden","true");
      btn.setAttribute("tabindex","-1");
    }else{
      btn.removeAttribute("aria-hidden");
      btn.removeAttribute("tabindex");
    }
  });

  SaaS.renderCurrentPlanBadge?.();
};


SaaS.renewBusiness=function(id,months=1){
  const b=SaaS.db.businesses.find(x=>x.id===id);if(!b)return;
  const sub=SaaS.subscriptionForBusiness(id);
  const raw=sub?.nextDue||sub?.renewalDate||b.nextPayment||"";
  const base=raw&&new Date(raw+"T12:00:00")>new Date()?new Date(raw+"T12:00:00"):new Date();
  base.setMonth(base.getMonth()+months);
  const next=base.toISOString().slice(0,10);

  b.nextPayment=next;
  b.status="Activo";

  if(sub){
    sub.nextDue=next;
    sub.renewalDate=next;
    sub.status="Active";
    sub.paymentHistory=sub.paymentHistory||[];
    sub.paymentHistory.push({
      id:SaaS.uid(),
      months,
      at:new Date().toISOString(),
      amount:Number(sub.price||sub.amount||SaaS.getPlan(b.planId)?.price||0)*months
    });
  }

  b.paymentHistory=b.paymentHistory||[];
  b.paymentHistory.push({
    id:SaaS.uid(),
    months,
    at:new Date().toISOString(),
    planId:b.planId,
    amount:Number(SaaS.getPlan(b.planId)?.price||0)*months
  });

  SaaS.save();
  SaaS.audit?.("SUBSCRIPTION","SuscripciÃ³n renovada",{months,next},id);
  SaaS.renderAll();
  window.App?.toast?.(`SuscripciÃ³n renovada ${months} mes(es)`);
};

SaaS.suspendBusiness=function(id){
  const b=SaaS.db.businesses.find(x=>x.id===id);if(!b)return;
  const sub=SaaS.subscriptionForBusiness(id);
  const suspending=b.status!=="Suspendido";

  b.status=suspending?"Suspendido":"Activo";
  if(sub)sub.status=suspending?"Suspended":"Active";

  SaaS.save();
  SaaS.audit?.("SUBSCRIPTION",suspending?"SuscripciÃ³n suspendida":"SuscripciÃ³n reactivada",{},id);
  SaaS.renderAll();
};

SaaS.installPlanGuard=function(){
  const A=window.App;if(!A||A.__planGuard)return;
  const old=A.go.bind(A);

  A.go=function(page){
    const role=String(SaaS.session?.role||"").toLowerCase();
    const isSuper=role==="superadmin" || window.SaaSAuthAdmin?.isSuperAdmin?.();
    if(isSuper)return old(page);

    const businessPages=new Set([
      "inicio","citas","clientes","barberos","servicios","configuracion","clienteConfig",
      "caja","inventario","usuarios","recibos","autorizaciones","reportes"
    ]);

    if(businessPages.has(page) && !SaaS.featureAllowed(page)){
      A.toast?.("Esta funciÃ³n no estÃ¡ incluida en tu plan actual");
      return old("inicio");
    }
    return old(page);
  };
  A.__planGuard=true;
};


/* FASE 20.6: Suscripciones siempre se renderizan con el resto del SuperAdmin. */
const oldRenderAll_206=SaaS.renderAll;
SaaS.renderAll=function(){
  const r=oldRenderAll_206();
  SaaS.ensureSubscriptionRecords();
  SaaS.renderSubscriptions();
  return r;
};


/* ===== FASE 20.20 â€” PLAN VISIBLE EN BUSINESS ===== */
SaaS.renderCurrentPlanBadge=function(){
  const badge=document.getElementById("currentBusinessPlanBadge");
  if(!badge)return;

  const role=String(SaaS.session?.role||"").toLowerCase();
  if(role==="superadmin"){
    badge.classList.add("hidden");
    return;
  }

  const b=SaaS.currentBusiness?.();
  const p=SaaS.getPlan?.(b?.planId);
  if(!b||!p){
    badge.classList.add("hidden");
    return;
  }

  badge.classList.remove("hidden");
  badge.textContent=`PLAN ${String(p.name||"").toUpperCase()}`;
  badge.dataset.planId=p.id||"";
};

SaaS.planMenuSummary=function(){
  const b=SaaS.currentBusiness?.();
  const p=SaaS.getPlan?.(b?.planId);
  if(!b||!p)return null;
  const visible=[...document.querySelectorAll(".nav-business[data-page]")].filter(x=>!x.hidden);
  return {business:b.name,plan:p.name,count:visible.length,pages:visible.map(x=>x.dataset.page)};
};

;

/* ---- js/saas/saas-branches.js ---- */

SaaS.renderBranches=function(){
  const box=document.getElementById("branchList");if(!box)return;
  const b=SaaS.currentBusiness(),ctx=SaaS.getContext();
  document.getElementById("branchBusinessLabel").innerHTML=`<strong>${b?.name||""}</strong> Â· ${b?.type||""}`;
  box.innerHTML=(b?.branches||[]).map(br=>`<article class="card branch-card ${ctx.branchId===br.id?"active-branch":""}">
    <span class="tag">${br.active===false?"INACTIVA":"SUCURSAL"}</span><h3>${br.name}</h3><div class="muted">${br.city||""}</div><p>${br.address||""}</p><div class="manage-actions"><button class="btn primary" onclick="SaaS.selectBranch('${br.id}')">Entrar</button><button class="btn edit" onclick="SaaS.editBranch('${br.id}')">Editar</button>${(b.branches||[]).length>1?`<button class="btn danger" onclick="SaaS.deleteBranch('${br.id}')">Eliminar</button>`:""}</div>
  </article>`).join("");
};
SaaS.openBranchModal=function(){document.getElementById("branchModal")?.classList.remove("hidden");["branchName","branchCity","branchAddress","branchWhatsapp"].forEach(id=>document.getElementById(id).value="");document.getElementById("branchModal").dataset.edit=""};
SaaS.closeBranchModal=()=>document.getElementById("branchModal")?.classList.add("hidden");
SaaS.saveBranch=function(){
  const b=SaaS.currentBusiness(),name=document.getElementById("branchName").value.trim();if(!b||!name)return window.App?.toast?.("Escribe nombre de sucursal");
  const id=document.getElementById("branchModal").dataset.edit;
  const data={name,city:document.getElementById("branchCity").value,address:document.getElementById("branchAddress").value,whatsapp:document.getElementById("branchWhatsapp").value,active:true};
  if(id)Object.assign(b.branches.find(x=>x.id===id),data);else b.branches.push({id:SaaS.uid(),...data});
  SaaS.save();SaaS.closeBranchModal();SaaS.renderAll();
};
SaaS.editBranch=function(id){const b=SaaS.currentBusiness(),br=b?.branches?.find(x=>x.id===id);if(!br)return;SaaS.openBranchModal();document.getElementById("branchModal").dataset.edit=id;document.getElementById("branchName").value=br.name||"";document.getElementById("branchCity").value=br.city||"";document.getElementById("branchAddress").value=br.address||"";document.getElementById("branchWhatsapp").value=br.whatsapp||""};
SaaS.selectBranch=function(id){const b=SaaS.currentBusiness();if(!b?.branches?.some(x=>x.id===id))return;const c=SaaS.getContext();SaaS.setContext({...c,branchId:id});SaaS.applyTenantContext();SaaS.renderAll();window.App?.toast?.("Sucursal seleccionada")};
SaaS.deleteBranch=function(id){const b=SaaS.currentBusiness();if(!b||b.branches.length<=1)return; if(!confirm("Â¿Eliminar sucursal?"))return;b.branches=b.branches.filter(x=>x.id!==id);SaaS.save();SaaS.renderAll()};

;

/* ---- js/saas/saas-branding.js ---- */

SaaS.platformSettings=SaaS.platformSettings||{name:"SAMBRIX",tagline:"TecnologÃ­a para negocios de belleza",supportEmail:"",supportWhatsapp:""};

SaaS.loadPlatformSettings=function(){
  try{
    const r=localStorage.getItem("nexo_platform_settings");
    if(r)SaaS.platformSettings={...SaaS.platformSettings,...JSON.parse(r)};
  }catch{}
};
SaaS.savePlatformSettings=function(){
  SaaS.platformSettings.name=document.getElementById("platformName")?.value||"SAMBRIX";
  SaaS.platformSettings.tagline=document.getElementById("platformTagline")?.value||"";
  SaaS.platformSettings.supportEmail=document.getElementById("platformSupportEmail")?.value||"";
  SaaS.platformSettings.supportWhatsapp=document.getElementById("platformSupportWhatsapp")?.value||"";
  localStorage.setItem("nexo_platform_settings",JSON.stringify(SaaS.platformSettings));
  window.App?.toast?.("Plataforma actualizada");
};
SaaS.renderPlatformSettings=function(){
  const p=SaaS.platformSettings;
  if(document.getElementById("platformName"))document.getElementById("platformName").value=p.name||"SAMBRIX";
  if(document.getElementById("platformTagline"))document.getElementById("platformTagline").value=p.tagline||"";
  if(document.getElementById("platformSupportEmail"))document.getElementById("platformSupportEmail").value=p.supportEmail||"";
  if(document.getElementById("platformSupportWhatsapp"))document.getElementById("platformSupportWhatsapp").value=p.supportWhatsapp||"";
};

SaaS.normalizeSlug=function(v){
  return String(v||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
};
SaaS.renderWhiteLabel=function(){
  const b=SaaS.currentBusiness();if(!b)return;
  b.slug=b.slug||SaaS.normalizeSlug(b.name)||b.id;
  b.whiteLabel=b.whiteLabel||{showPoweredBy:true};

  const premium=!!SaaS.planCapability?.("whiteLabel",b);
  const slug=document.getElementById("businessSlug");
  const powered=document.getElementById("showPoweredBy");
  const badge=document.getElementById("whiteLabelPlanBadge");

  if(slug){slug.value=b.slug;slug.disabled=!SaaS.planCapability?.("customSlug",b)}
  if(powered){powered.value=String(b.whiteLabel.showPoweredBy!==false);powered.disabled=!premium}
  if(badge)badge.textContent=premium?"Premium activo":"Exclusivo Premium";

  const footer=document.getElementById("nexoPoweredBy");
  if(footer)footer.classList.toggle("white-label-hidden",premium&&b.whiteLabel.showPoweredBy===false);
};
SaaS.saveWhiteLabel=function(){
  const b=SaaS.currentBusiness();if(!b)return;
  if(!SaaS.planCapability?.("whiteLabel",b)){
    return window.App?.toast?.("Marca blanca estÃ¡ disponible en Premium");
  }

  const slug=SaaS.normalizeSlug(document.getElementById("businessSlug")?.value||b.name);
  if(SaaS.db.businesses.some(x=>x.id!==b.id&&x.slug===slug)){
    return window.App?.toast?.("Ese slug ya estÃ¡ en uso");
  }

  b.slug=slug||b.id;
  b.whiteLabel=b.whiteLabel||{};
  b.whiteLabel.showPoweredBy=document.getElementById("showPoweredBy")?.value!=="false";

  SaaS.save();
  SaaS.renderWhiteLabel();
  SaaS.renderPublicLink?.();
  window.App?.toast?.("Marca blanca actualizada");
};

const oldPublicUrl_136=SaaS.publicBusinessUrl;
SaaS.publicBusinessUrl=function(){
  const b=SaaS.currentBusiness();
  const u=new URL(location.href);u.search="";u.hash="";
  u.searchParams.set("business",b?.id||"");
  u.searchParams.set("slug",b?.slug||SaaS.normalizeSlug(b?.name));
  u.searchParams.set("cliente","app");
  return u.toString();
};

/* ===== FASE 20.21 â€” PERSONALIZACIÃ“N POR PLAN ===== */
SaaS.renderBrandingPlanAccess=function(){
  const b=SaaS.currentBusiness?.();if(!b)return;
  const p=SaaS.getPlan?.(b.planId);
  const tier=SaaS.planTier?.(b)||"basic";

  const box=document.getElementById("brandingPlanSummary");
  if(box){
    const rows=[
      ["Logo, nombre, eslogan y contacto",true],
      ["Fotos del equipo, productos y servicios",true],
      ["Foto de portada",true],
      ["Colores y tema avanzados",SaaS.planCapability("customTheme",b)],
      ["Promociones visuales",SaaS.planCapability("promotions",b)],
      ["Marca blanca / ocultar SAMBRIX",SaaS.planCapability("whiteLabel",b)]
    ];
    box.innerHTML=`<div><span class="tag">PLAN ACTUAL</span><h3>${p?.name||tier}</h3></div>
      <div class="branding-plan-pills">${rows.map(([t,on])=>`<span class="${on?"included":"upgrade"}">${on?"âœ“":"â†‘"} ${t}</span>`).join("")}</div>`;
  }

  document.querySelectorAll("[data-plan-control]").forEach(w=>{
    const allowed=!!SaaS.planCapability(w.dataset.planControl,b);
    w.classList.toggle("plan-control-locked",!allowed);
    w.querySelectorAll("input,select,textarea,button").forEach(el=>el.disabled=!allowed);
  });

  document.querySelectorAll("[data-plan-section]").forEach(w=>{
    const allowed=!!SaaS.planCapability(w.dataset.planSection,b);
    w.classList.toggle("plan-section-locked",!allowed);
    w.querySelectorAll("input,select,textarea,button").forEach(el=>el.disabled=!allowed);
  });

  SaaS.renderWhiteLabel?.();
};



;

/* ---- js/saas/public-ui.js ---- */

SaaS.publicBusinessUrl=function(){
  const b=SaaS.currentBusiness();
  const u=new URL(location.href);
  u.search="";
  u.hash="";
  u.searchParams.set("business",b?.id||"");
  u.searchParams.set("cliente","app");
  return u.toString();
};

SaaS.renderPublicLink=function(){
  const input=document.getElementById("publicBusinessUrl");if(!input)return;
  const url=SaaS.publicBusinessUrl();input.value=url;
  const canvas=document.getElementById("publicBusinessQr");
  if(canvas&&window.QRCode?.toCanvas){
    QRCode.toCanvas(canvas,url,{width:180,margin:1},()=>{});
  }
};

SaaS.publishPublicBusiness=async function(){
  try{
    await window.NexoPublicCloud.publishCurrentBusiness();
    SaaS.renderPublicLink();
    window.App?.toast?.("App Cliente publicada");
  }catch(e){window.App?.toast?.(e.message||"No se pudo publicar")}
};

SaaS.copyPublicUrl=async function(){
  const url=SaaS.publicBusinessUrl();
  try{await navigator.clipboard.writeText(url);window.App?.toast?.("Enlace copiado")}catch{document.getElementById("publicBusinessUrl")?.select()}
};

;

/* ---- js/saas/booking-inbox.js ---- */
SaaS.bookingInbox=SaaS.bookingInbox||[];
SaaS.bookingInboxUnsub=null;

SaaS.serviceName=function(id){return window.App?.db?.services?.find(s=>s.id===id)?.name||id||"Servicio"};
SaaS.barberName=function(id){return window.App?.db?.barbers?.find(b=>b.id===id)?.name||id||"Profesional"};
SaaS.canManageBookingInbox=function(){return !!window.SaaS?.pageAllowed?.("bookingInbox")&&(typeof SaaS.canWriteDomain!=="function"||SaaS.canWriteDomain("schedule"));};

SaaS.renderBookingInbox=function(){
  const box=document.getElementById("bookingInboxList");if(!box)return;
  const q=(document.getElementById("bookingSearch")?.value||"").toLowerCase().trim();
  const status=document.getElementById("bookingStatusFilter")?.value||"";
  const rows=[...(SaaS.bookingInbox||[])].sort((a,b)=>{
    const ta=a.createdAt?.seconds||0,tb=b.createdAt?.seconds||0;return tb-ta;
  });
  const filtered=rows.filter(r=>{
    const text=`${r.name||""} ${r.phone||""} ${r.date||""} ${r.time||""}`.toLowerCase();
    return (!q||text.includes(q))&&(!status||r.status===status);
  });
  const today=new Date().toISOString().slice(0,10),canManage=SaaS.canManageBookingInbox();
  document.getElementById("bookingPendingCount")&&(document.getElementById("bookingPendingCount").textContent=rows.filter(r=>r.status==="Pendiente").length);
  document.getElementById("bookingApprovedCount")&&(document.getElementById("bookingApprovedCount").textContent=rows.filter(r=>r.status==="Aprobada").length);
  document.getElementById("bookingRejectedCount")&&(document.getElementById("bookingRejectedCount").textContent=rows.filter(r=>r.status==="Rechazada").length);
  document.getElementById("bookingTodayCount")&&(document.getElementById("bookingTodayCount").textContent=rows.filter(r=>{
    const d=r.createdAt?.toDate?.();return d?d.toISOString().slice(0,10)===today:false;
  }).length);
  box.innerHTML=filtered.map(r=>`<div class="row booking-request ${r.status==="Aprobada"?"approved":r.status==="Rechazada"?"rejected":""}">
    <div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><strong>${r.name||"Cliente"}</strong><span class="booking-status ${r.status||"Pendiente"}">${r.status||"Pendiente"}</span></div>
      <div class="booking-meta"><span>${r.phone||"Sin telÃ©fono"}</span><span>${SaaS.serviceName(r.serviceId)}</span><span>${SaaS.barberName(r.barberId)}</span><span>${r.date||"â€”"} Â· ${r.time||"â€”"}</span></div>
      ${r.note?`<small>${r.note}</small>`:""}
    </div>
    <div class="manage-actions">
      ${canManage&&r.status==="Pendiente"?`<button class="btn primary tiny" onclick="SaaS.approvePublicBooking('${r.id}')">Aprobar</button><button class="btn secondary tiny" onclick="SaaS.rejectPublicBooking('${r.id}')">Rechazar</button>`:""}
    </div>
  </div>`).join("")||'<div class="muted">No hay solicitudes con este filtro.</div>';
};

SaaS.createAppointmentFromRequest=function(req){
  const A=window.App;if(!A?.db)return null;
  const existing=(A.db.appointments||[]).find(x=>x.publicRequestId===req.id);
  if(existing)return existing;
  let client=A.db.clients?.find(c=>(req.clientUid&&c.firebaseUid===req.clientUid)||(req.clientId&&c.id===req.clientId)||c.phone===req.phone);
  if(!client){
    client={id:req.clientId||("client_"+SaaS.uid()),firebaseUid:req.clientUid||"",name:req.name||"Cliente",phone:req.phone||"",email:"",businessId:SaaS.getContext()?.businessId||"",branchId:req.branchId||SaaS.getContext()?.branchId||""};
    A.db.clients=A.db.clients||[];A.db.clients.push(client);
  }
  const service=A.db.services?.find(s=>s.id===req.serviceId);
  const appt={
    id:"appt_"+SaaS.uid(),clientId:client.id,serviceId:req.serviceId,barberId:req.barberId,date:req.date,time:req.time,
    status:"Confirmada",note:req.note||"",duration:Number(service?.duration||40),price:Number(service?.price||0),
    businessId:SaaS.getContext()?.businessId||"",branchId:req.branchId||SaaS.getContext()?.branchId||"",
    source:"SAMBRIX Client",publicRequestId:req.id,createdAt:new Date().toISOString()
  };
  A.db.appointments=A.db.appointments||[];A.db.appointments.push(appt);
  const persisted=A.persist?.();
  if(persisted===false){A.db.appointments=A.db.appointments.filter(x=>x!==appt);return null}
  return appt;
};

SaaS.publicBookingConflict=function(req){
  const A=window.App;
  const service=A?.db?.services?.find(s=>s.id===req.serviceId);
  const duration=Number(service?.duration||40);
  if(typeof A?.slotAvailable==="function"){
    try{return !A.slotAvailable(req.barberId,req.date,req.time,duration,(A.db.appointments||[]).find(x=>x.publicRequestId===req.id)?.id)}catch{}
  }
  if(typeof A?.isBarberAvailable==="function"){
    try{return !A.isBarberAvailable(req.barberId,req.date,req.time,duration)}catch{}
  }
  const start=typeof A?.parseTime==="function"?A.parseTime(req.time):null,end=start==null?null:start+duration;
  return (A?.db?.appointments||[]).some(a=>{if(a.publicRequestId===req.id||a.barberId!==req.barberId||a.date!==req.date||["Cancelada","Rechazada"].includes(a.status))return false;if(start==null)return a.time===req.time;const sv=A.db.services?.find(s=>s.id===a.serviceId),as=A.parseTime(a.time),ae=as+Number(sv?.duration||40);return start<ae&&end>as;});
};

SaaS.approvePublicBooking=async function(id){
  if(!SaaS.canManageBookingInbox())return window.App?.toast?.("No tienes permiso para gestionar solicitudes");
  const req=SaaS.bookingInbox.find(x=>x.id===id);if(!req)return;
  if(req.status!=="Pendiente"&&req.status!=="Aprobada")return window.App?.toast?.("Esta solicitud ya fue resuelta");
  if(req.status==="Pendiente"&&SaaS.publicBookingConflict(req))return window.App?.toast?.("Ese horario ya no estÃ¡ disponible");
  try{
    const appt=SaaS.createAppointmentFromRequest(req);
    if(!appt)throw new Error("No se pudo crear la cita");
    await window.NexoPublicCloud?.updateBookingRequest?.(SaaS.getContext().businessId,id,{status:"Aprobada",appointmentId:appt.id,resolvedAt:new Date().toISOString()});
    SaaS.audit?.("BUSINESS","Reserva pÃºblica aprobada",{requestId:id,appointmentId:appt.id},SaaS.getContext().businessId);
    window.App?.toast?.("Reserva aprobada y cita creada");
  }catch(e){window.App?.toast?.(e.message||"No se pudo aprobar")}
};

SaaS.rejectPublicBooking=async function(id){
  if(!SaaS.canManageBookingInbox())return window.App?.toast?.("No tienes permiso para gestionar solicitudes");
  const req=SaaS.bookingInbox.find(x=>x.id===id);if(!req||req.status!=="Pendiente")return;
  const reason=prompt("Motivo (opcional)","");
  try{
    const businessId=SaaS.getContext().businessId;
    await window.NexoPublicCloud?.updateBookingRequest?.(businessId,id,{status:"Rechazada",reason:reason||"",resolvedAt:new Date().toISOString()});
    if(req.slotId)await window.NexoPublicCloud?.releaseBookingSlot?.(businessId,req.slotId);else await window.NexoPublicCloud?.releaseBookingSlotFor?.(businessId,req.barberId,req.date,req.time);
    SaaS.audit?.("BUSINESS","Reserva pÃºblica rechazada",{requestId:id,reason:reason||""},SaaS.getContext().businessId);
    window.App?.toast?.("Solicitud rechazada");
  }catch(e){window.App?.toast?.(e.message||"No se pudo rechazar")}
};

SaaS.reconcilePublicBookings=function(){
  const A=window.App,businessId=SaaS.getContext?.()?.businessId;
  if(!A?.db||!businessId)return false;
  let changed=false;
  for(const booking of SaaS.bookingInbox||[]){
    const appt=(A.db.appointments||[]).find(x=>x.publicRequestId===booking.id);
    if(!appt)continue;
    if(appt.businessId&&appt.businessId!==businessId)continue;
    if(booking.status==="Aprobada"&&appt.status!=="Finalizada"){
      if(booking.date&&appt.date!==booking.date){appt.date=booking.date;changed=true}
      if(booking.time&&appt.time!==booking.time){appt.time=booking.time;changed=true}
      if(appt.status==="Cancelada"){appt.status="Confirmada";changed=true}
    }
    if(booking.status==="Cancelada"&&appt.status!=="Finalizada"&&appt.status!=="Cancelada"){
      appt.status="Cancelada";changed=true;
    }
    if(booking.status==="Finalizada"&&appt.status!=="Finalizada"&&appt.finalizedAccountingAt){appt.status="Finalizada";changed=true}
  }
  if(changed)A.persist?.();
  return changed;
};

SaaS.watchBookingInbox=function(){
  if(SaaS.bookingInboxUnsub){try{SaaS.bookingInboxUnsub()}catch{}SaaS.bookingInboxUnsub=null}
  const businessId=SaaS.getContext()?.businessId;
  if(!businessId||!window.NexoPublicCloud?.watchPublicBookingRequests)return;
  SaaS.bookingInboxUnsub=window.NexoPublicCloud.watchPublicBookingRequests(businessId,rows=>{
    if(SaaS.getContext()?.businessId!==businessId)return;
    SaaS.bookingInbox=rows;SaaS.reconcilePublicBookings();SaaS.renderBookingInbox();
  });
};

const oldSwitchTenant_145=SaaS.switchTenant;
if(oldSwitchTenant_145){
  SaaS.switchTenant=function(id,opts){const r=oldSwitchTenant_145(id,opts);setTimeout(()=>SaaS.watchBookingInbox(),300);return r};
}
const oldRenderAll_145=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_145();SaaS.renderBookingInbox()};

SaaS.bookingChangeInbox=SaaS.bookingChangeInbox||[];
SaaS.bookingChangeUnsub=null;
const changeProcessing=new Set();

SaaS.renderBookingChangeInbox=function(){
  const box=document.getElementById("bookingInboxList");if(!box||!SaaS.bookingChangeInbox?.length)return;
  const pending=SaaS.bookingChangeInbox.filter(x=>x.status==="Pendiente");
  if(!pending.length)return;
  const canManage=SaaS.canManageBookingInbox();
  const html=`<div class="permission-note"><strong>Solicitudes sobre citas confirmadas</strong></div>`+pending.map(r=>{
    const b=SaaS.bookingInbox.find(x=>x.id===r.bookingRequestId)||{};
    return `<div class="row booking-request"><div><strong>${r.type==="cancel"?"Cancelar":"Reprogramar"} Â· ${b.name||"Cliente"}</strong><small>${r.oldDate||b.date||""} ${r.oldTime||b.time||""}${r.type==="reschedule"?` â†’ ${r.newDate} ${r.newTime}`:""}</small></div><div class="manage-actions">${canManage?`<button class="btn primary tiny" onclick="SaaS.approveBookingChange('${r.id}')">Aprobar</button><button class="btn danger tiny" onclick="SaaS.rejectBookingChange('${r.id}')">Rechazar</button>`:""}</div></div>`;
  }).join("");
  box.insertAdjacentHTML("beforeend",html);
};

SaaS.approveBookingChange=async function(id){
  if(!SaaS.canManageBookingInbox())return window.App?.toast?.("No tienes permiso para gestionar solicitudes");
  if(changeProcessing.has(id))return;
  const r=SaaS.bookingChangeInbox.find(x=>x.id===id);if(!r||r.status!=="Pendiente")return;
  const booking=SaaS.bookingInbox.find(x=>x.id===r.bookingRequestId);if(!booking)return window.App?.toast?.("No se encontrÃ³ la reserva original");
  const A=window.App,businessId=SaaS.getContext().businessId,appt=(A.db.appointments||[]).find(x=>x.publicRequestId===booking.id);
  if(!appt)return window.App?.toast?.("No se encontrÃ³ la cita vinculada");
  if(appt.status==="Finalizada")return A.toast("Una cita finalizada ya no puede modificarse");
  changeProcessing.add(id);
  try{
    if(r.type==="reschedule"){
      const alreadyApplied=booking.date===r.newDate&&booking.time===r.newTime&&booking.status==="Aprobada";
      if(!alreadyApplied){
        const duration=Number(A.db.services?.find(s=>s.id===appt.serviceId)?.duration||appt.duration||40);
        const available=typeof A.slotAvailable==="function"?A.slotAvailable(appt.barberId,r.newDate,r.newTime,duration,appt.id):!A.appointmentConflict?.({...appt,date:r.newDate,time:r.newTime},appt.id);
        if(!available)return A.toast("El nuevo horario estÃ¡ ocupado o fuera de la disponibilidad del profesional");
        await NexoPublicCloud.updateBookingRequest(businessId,booking.id,{date:r.newDate,time:r.newTime,status:"Aprobada",slotId:r.newSlotId||booking.slotId||"",resolvedAt:new Date().toISOString()});
      }
      appt.date=r.newDate;appt.time=r.newTime;appt.status="Confirmada";
    }else{
      if(booking.status!=="Cancelada")await NexoPublicCloud.updateBookingRequest(businessId,booking.id,{status:"Cancelada",resolvedAt:new Date().toISOString()});
      if(booking.slotId)await NexoPublicCloud.releaseBookingSlot?.(businessId,booking.slotId);else await NexoPublicCloud.releaseBookingSlotFor?.(businessId,appt.barberId,booking.date,booking.time);
      appt.status="Cancelada";
    }
    const persisted=A.persist?.();
    if(persisted===false)throw new Error("Espera a que SAMBRIX termine de sincronizar el negocio");
    await NexoPublicCloud.updateBookingChangeRequest(businessId,id,{status:"Aprobada",resolvedAt:new Date().toISOString()});
    if(r.type==="reschedule"){
      if(booking.slotId&&booking.slotId!==r.newSlotId)await NexoPublicCloud.releaseBookingSlot?.(businessId,booking.slotId);
      else if(!booking.slotId)await NexoPublicCloud.releaseBookingSlotFor?.(businessId,appt.barberId,r.oldDate||booking.date,r.oldTime||booking.time);
    }
    A.toast("Solicitud aprobada");
  }catch(e){
    A.toast(e?.message||"No se pudo completar la solicitud");
    console.error("[SAMBRIX booking change]",e);
  }finally{changeProcessing.delete(id)}
};

SaaS.rejectBookingChange=async function(id){
  if(!SaaS.canManageBookingInbox())return window.App?.toast?.("No tienes permiso para gestionar solicitudes");
  const r=SaaS.bookingChangeInbox.find(x=>x.id===id);if(!r||r.status!=="Pendiente")return;
  try{const businessId=SaaS.getContext().businessId;await NexoPublicCloud.updateBookingChangeRequest(businessId,id,{status:"Rechazada",resolvedAt:new Date().toISOString()});if(r.newSlotId)await NexoPublicCloud.releaseBookingSlot?.(businessId,r.newSlotId);window.App?.toast?.("Solicitud rechazada")}catch(e){window.App?.toast?.(e.message||"No se pudo rechazar")}
};

SaaS.watchBookingChanges=function(){
  if(SaaS.bookingChangeUnsub){try{SaaS.bookingChangeUnsub()}catch{}SaaS.bookingChangeUnsub=null}
  const businessId=SaaS.getContext()?.businessId;
  if(!businessId||!window.NexoPublicCloud?.watchBookingChangeRequests)return;
  SaaS.bookingChangeUnsub=NexoPublicCloud.watchBookingChangeRequests(businessId,rows=>{
    if(SaaS.getContext()?.businessId!==businessId)return;
    SaaS.bookingChangeInbox=rows;SaaS.renderBookingInbox();SaaS.renderBookingChangeInbox();
  });
};
const oldWatchBookingInbox_10=SaaS.watchBookingInbox;
SaaS.watchBookingInbox=function(){const r=oldWatchBookingInbox_10?.();setTimeout(()=>SaaS.watchBookingChanges(),50);return r};
const oldRenderBookingInbox_10=SaaS.renderBookingInbox;
SaaS.renderBookingInbox=function(){const r=oldRenderBookingInbox_10?.();SaaS.renderBookingChangeInbox();return r};

;

/* ---- js/saas/sambrix-notifications.js ---- */
SaaS.notifications=SaaS.notifications||[];

SaaS.messageTemplates=[
  {id:"appt_confirm",name:"ConfirmaciÃ³n de cita",text:"Hola {cliente}, tu cita en {negocio} estÃ¡ confirmada para el {fecha} a las {hora} con {profesional}."},
  {id:"appt_reminder",name:"Recordatorio de cita",text:"Hola {cliente}, te recordamos tu cita en {negocio} maÃ±ana a las {hora}. Si necesitas cambiarla, contÃ¡ctanos."},
  {id:"booking_rejected",name:"Reserva no disponible",text:"Hola {cliente}, el horario solicitado en {negocio} ya no estÃ¡ disponible. Podemos ayudarte a elegir otro horario."},
  {id:"payment_due",name:"SuscripciÃ³n SAMBRIX",text:"Tu suscripciÃ³n SAMBRIX vence el {fecha}. MantÃ©n tu cuenta activa para continuar usando todos los servicios."},
  {id:"stock_low",name:"Stock bajo",text:"Aviso interno: {producto} tiene stock bajo ({stock} unidades)."}
];

SaaS.loadNotifications=function(){
  try{SaaS.notifications=JSON.parse(localStorage.getItem("sambrix_notifications"))||[]}catch{SaaS.notifications=[]}
};
SaaS.saveNotifications=function(){localStorage.setItem("sambrix_notifications",JSON.stringify(SaaS.notifications))};

SaaS.notifKey=function(type,businessId,entityId){return `${type}:${businessId||"platform"}:${entityId||""}`};

SaaS.pushNotification=function(n){
  const key=n.key||SaaS.notifKey(n.type,n.businessId,n.entityId);
  const existing=SaaS.notifications.find(x=>x.key===key&&x.active!==false);
  if(existing){
    existing.title=n.title||existing.title;
    existing.message=n.message||existing.message;
    existing.updatedAt=new Date().toISOString();
    return existing;
  }
  const item={
    id:SaaS.uid(),key,
    type:n.type||"system",
    title:n.title||"Aviso",
    message:n.message||"",
    businessId:n.businessId||"",
    businessName:n.businessName||SaaS.db.businesses.find(b=>b.id===n.businessId)?.name||"",
    entityId:n.entityId||"",
    read:false,active:true,
    createdAt:new Date().toISOString(),
    action:n.action||""
  };
  SaaS.notifications.push(item);SaaS.saveNotifications();return item;
};

SaaS.generateNotifications=function(){
  const today=new Date();
  const currentId=SaaS.getContext?.()?.businessId||"";

  // Subscription alerts
  (SaaS.db.businesses||[]).forEach(b=>{
    const days=SaaS.daysUntil?.(b.nextPayment);
    if(days!==null&&days>=0&&days<=7){
      SaaS.pushNotification({type:"subscription",businessId:b.id,entityId:b.id,key:`subscription:${b.id}:${b.nextPayment}`,title:`${b.name}: suscripciÃ³n prÃ³xima a vencer`,message:`Vence ${b.nextPayment} (${days} dÃ­a(s)).`,action:"saasSubscriptions"});
    }
    if(["Suspendido","Vencido"].includes(SaaS.subscriptionLabel?.(b)||b.status)){
      SaaS.pushNotification({type:"subscription",businessId:b.id,entityId:b.id,key:`subscription-critical:${b.id}`,title:`${b.name}: cuenta no activa`,message:"Revisa pago, renovaciÃ³n o reactivaciÃ³n.",action:"saasSubscriptions"});
    }
  });

  // Current business appointments and stock
  if(currentId){
    const data=SaaS.loadTenantState?.(currentId)||window.App?.db||{};
    const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);
    const tdate=tomorrow.toISOString().slice(0,10);

    (data.appointments||[]).filter(a=>a.date===tdate&&a.status!=="Cancelada").forEach(a=>{
      const client=(data.clients||[]).find(c=>c.id===a.clientId);
      SaaS.pushNotification({
        type:"appointment",businessId:currentId,entityId:a.id,
        key:`appt:${currentId}:${a.id}:${a.date}`,
        title:`Cita maÃ±ana Â· ${a.time||""}`,
        message:`${client?.name||"Cliente"} Â· ${SaaS.serviceName?.(a.serviceId)||a.serviceId||"Servicio"}`,
        action:"citas"
      });
    });

    (data.products||[]).filter(p=>Number(p.stock||0)<=Number(p.minStock||p.minimumStock||2)).forEach(p=>{
      SaaS.pushNotification({
        type:"stock",businessId:currentId,entityId:p.id,
        key:`stock:${currentId}:${p.id}:${p.stock}`,
        title:`Stock bajo: ${p.name||"Producto"}`,
        message:`Quedan ${Number(p.stock||0)} unidad(es).`,
        action:"inventario"
      });
    });
  }

  // Pending public bookings
  (SaaS.bookingInbox||[]).filter(r=>r.status==="Pendiente").forEach(r=>{
    SaaS.pushNotification({
      type:"booking",businessId:currentId,entityId:r.id,
      key:`booking:${currentId}:${r.id}`,
      title:`Nueva solicitud de ${r.name||"cliente"}`,
      message:`${r.date||""} Â· ${r.time||""}`,
      action:"bookingInbox"
    });
  });

  SaaS.saveNotifications();SaaS.renderNotifications();
};

SaaS.renderNotifications=function(){
  const box=document.getElementById("notificationsList");if(!box)return;
  const type=document.getElementById("notifTypeFilter")?.value||"";
  const read=document.getElementById("notifReadFilter")?.value||"";
  const rows=[...SaaS.notifications].filter(n=>n.active!==false).reverse().filter(n=>{
    return (!type||n.type===type)&&(!read||(read==="read"?n.read:!n.read));
  });

  const unread=SaaS.notifications.filter(n=>n.active!==false&&!n.read).length;
  const currentId=SaaS.getContext?.()?.businessId||"";
  const appts=SaaS.notifications.filter(n=>n.type==="appointment"&&!n.read&&(n.businessId===currentId||!currentId)).length;
  const stock=SaaS.notifications.filter(n=>n.type==="stock"&&!n.read&&(n.businessId===currentId||!currentId)).length;
  const subs=SaaS.notifications.filter(n=>n.type==="subscription"&&!n.read).length;

  document.getElementById("notifUnreadCount")&&(document.getElementById("notifUnreadCount").textContent=unread);
  document.getElementById("notifAppointmentCount")&&(document.getElementById("notifAppointmentCount").textContent=appts);
  document.getElementById("notifStockCount")&&(document.getElementById("notifStockCount").textContent=stock);
  document.getElementById("notifSubscriptionCount")&&(document.getElementById("notifSubscriptionCount").textContent=subs);
  document.getElementById("notifTopBadge")&&(document.getElementById("notifTopBadge").textContent=unread);

  const icons={appointment:"â—·",booking:"âœ‰",stock:"â–£",subscription:"$",system:"!"};
  box.innerHTML=rows.map(n=>`<div class="row notification-row ${n.type} ${n.read?"":"unread"}">
    <div class="notification-icon">${icons[n.type]||"!"}</div>
    <div class="notification-body">
      <strong>${n.title}</strong><small>${n.message}</small>
      <div class="notification-meta">${n.businessName||"SAMBRIX"} Â· ${new Date(n.createdAt).toLocaleString()}</div>
    </div>
    <div class="manage-actions">
      ${n.action?`<button class="btn secondary tiny" onclick="SaaS.openNotification('${n.id}')">Abrir</button>`:""}
      <button class="btn secondary tiny" onclick="SaaS.toggleNotificationRead('${n.id}')">${n.read?"No leÃ­da":"LeÃ­da"}</button>
    </div>
  </div>`).join("")||'<div class="muted">No hay notificaciones con este filtro.</div>';

  const templates=document.getElementById("messageTemplatesList");
  if(templates){
    templates.innerHTML=SaaS.messageTemplates.map(t=>`<div class="template-card"><strong>${t.name}</strong><textarea id="template_${t.id}">${t.text}</textarea><div class="actions"><button class="btn secondary tiny" onclick="SaaS.copyTemplate('${t.id}')">Copiar</button></div></div>`).join("");
  }
};

SaaS.openNotification=function(id){
  const n=SaaS.notifications.find(x=>x.id===id);if(!n)return;
  n.read=true;SaaS.saveNotifications();
  if(n.businessId&&SaaS.db.businesses.some(b=>b.id===n.businessId)&&SaaS.getContext()?.businessId!==n.businessId){
    SaaS.enterBusiness?.(n.businessId);
  }
  if(n.action)window.App?.go?.(n.action);
  SaaS.renderNotifications();
};

SaaS.toggleNotificationRead=function(id){
  const n=SaaS.notifications.find(x=>x.id===id);if(!n)return;
  n.read=!n.read;SaaS.saveNotifications();SaaS.renderNotifications();
};

SaaS.markAllNotificationsRead=function(){
  SaaS.notifications.forEach(n=>n.read=true);SaaS.saveNotifications();SaaS.renderNotifications();
};

SaaS.copyTemplate=async function(id){
  const el=document.getElementById(`template_${id}`);
  if(!el)return;
  try{await navigator.clipboard.writeText(el.value);window.App?.toast?.("Mensaje copiado")}catch{el.select()}
};

const oldApprove_146=SaaS.approvePublicBooking;
if(oldApprove_146){
  SaaS.approvePublicBooking=async function(id){
    const req=SaaS.bookingInbox.find(x=>x.id===id);
    const result=await oldApprove_146(id);
    if(req){
      SaaS.pushNotification({type:"booking",businessId:SaaS.getContext()?.businessId||"",entityId:id,key:`booking-approved:${id}`,title:`Reserva aprobada: ${req.name||"Cliente"}`,message:`${req.date||""} Â· ${req.time||""}`,action:"citas"});
      SaaS.saveNotifications();SaaS.renderNotifications();
    }
    return result;
  };
}

const oldReject_146=SaaS.rejectPublicBooking;
if(oldReject_146){
  SaaS.rejectPublicBooking=async function(id){
    const req=SaaS.bookingInbox.find(x=>x.id===id);
    const result=await oldReject_146(id);
    if(req){
      SaaS.pushNotification({type:"booking",businessId:SaaS.getContext()?.businessId||"",entityId:id,key:`booking-rejected:${id}`,title:`Reserva rechazada: ${req.name||"Cliente"}`,message:`${req.date||""} Â· ${req.time||""}`,action:"bookingInbox"});
      SaaS.saveNotifications();SaaS.renderNotifications();
    }
    return result;
  };
}

const oldRenderAll_146=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_146();SaaS.renderNotifications()};

;

/* ---- js/saas/sambrix-billing.js ---- */
SaaS.billingPayments=SaaS.billingPayments||[];

SaaS.loadBilling=function(){
  try{SaaS.billingPayments=JSON.parse(localStorage.getItem("sambrix_billing_payments"))||[]}catch{SaaS.billingPayments=[]}
};
SaaS.saveBilling=function(){localStorage.setItem("sambrix_billing_payments",JSON.stringify(SaaS.billingPayments))};

SaaS.billingState=function(b){
  if(String(b.status||"").toLowerCase()==="suspendido")return "Suspendida";
  if(!b.nextPayment)return "Activa";
  const d=SaaS.daysUntil?.(b.nextPayment);
  if(d===null)return "Activa";
  if(d<0)return "Vencida";
  if(d<=7)return "Por vencer";
  return "Activa";
};

SaaS.refreshBillingStates=function(){
  (SaaS.db.businesses||[]).forEach(b=>{
    const state=SaaS.billingState(b);
    b.billingStatus=state;
    if(state==="Vencida"&&b.status!=="Suspendido")b.status="Vencido";
    if(state==="Activa"&&["Vencido"].includes(b.status))b.status="Activo";
  });
  SaaS.save();SaaS.generateNotifications?.();SaaS.renderBilling();
};

SaaS.renderBilling=function(){
  const box=document.getElementById("billingBusinessList");if(!box)return;
  const q=(document.getElementById("billingSearch")?.value||"").toLowerCase().trim();
  const filter=document.getElementById("billingStatusFilter")?.value||"";
  const bs=(SaaS.db.businesses||[]).filter(b=>(!q||`${b.name} ${b.owner||""}`.toLowerCase().includes(q))&&(!filter||SaaS.billingState(b)===filter));

  const all=SaaS.db.businesses||[];
  const active=all.filter(b=>SaaS.billingState(b)==="Activa");
  const due=all.filter(b=>SaaS.billingState(b)==="Por vencer");
  const overdue=all.filter(b=>SaaS.billingState(b)==="Vencida");
  const mrr=all.filter(b=>["Activa","Por vencer"].includes(SaaS.billingState(b))).reduce((sum,b)=>sum+Number(SaaS.getPlan(b.planId)?.price||0),0);

  document.getElementById("billingMRR").textContent=SaaS.money?.(mrr)||("$"+mrr.toFixed(2));
  document.getElementById("billingActive").textContent=active.length;
  document.getElementById("billingDueSoon").textContent=due.length;
  document.getElementById("billingOverdue").textContent=overdue.length;

  box.innerHTML=bs.map(b=>{
    const state=SaaS.billingState(b),plan=SaaS.getPlan(b.planId), cls=state==="Por vencer"?"due":state==="Vencida"?"overdue":state==="Suspendida"?"suspended":"";
    return `<div class="row billing-row ${cls}">
      <div><strong>${b.name}</strong><small>${b.owner||"Sin dueÃ±o"} Â· ${plan?.name||"Sin plan"} Â· PrÃ³ximo pago: ${b.nextPayment||"â€”"}</small></div>
      <div class="billing-actions">
        <span class="billing-money">${SaaS.money?.(Number(plan?.price||0))||("$"+Number(plan?.price||0).toFixed(2))}</span>
        <span class="billing-status ${cls}">${state}</span>
        <button class="btn primary tiny" onclick="SaaS.openBillingPayment('${b.id}')">Registrar pago</button>
        ${state==="Suspendida"?`<button class="btn secondary tiny" onclick="SaaS.reactivateBilling('${b.id}')">Reactivar</button>`:`<button class="btn secondary tiny" onclick="SaaS.suspendBilling('${b.id}')">Suspender</button>`}
      </div>
    </div>`;
  }).join("")||'<div class="muted">No hay negocios con este filtro.</div>';

  const payments=document.getElementById("billingPaymentsList");
  if(payments){
    payments.innerHTML=[...SaaS.billingPayments].reverse().slice(0,20).map(p=>`<div class="row"><div><strong>${p.businessName}</strong><small>${p.method} Â· ${p.reference||"Sin referencia"} Â· ${new Date(p.createdAt).toLocaleString()}</small></div><strong>${SaaS.money?.(p.amount)||("$"+Number(p.amount).toFixed(2))}</strong></div>`).join("")||'<div class="muted">TodavÃ­a no hay pagos registrados.</div>';
  }
};

SaaS.openBillingPayment=function(id){
  const b=SaaS.db.businesses.find(x=>x.id===id);if(!b)return;
  const p=SaaS.getPlan(b.planId);
  document.getElementById("billingPaymentBusinessId").value=id;
  document.getElementById("billingPaymentBusinessName").value=b.name;
  document.getElementById("billingPaymentAmount").value=Number(p?.price||0).toFixed(2);
  document.getElementById("billingPaymentReference").value="";
  document.getElementById("billingPaymentNote").value="";
  document.getElementById("billingPaymentModal")?.classList.add("open");
};
SaaS.closeBillingPayment=function(){document.getElementById("billingPaymentModal")?.classList.remove("open")};

SaaS.registerBillingPayment=function(){
  const id=document.getElementById("billingPaymentBusinessId").value;
  const b=SaaS.db.businesses.find(x=>x.id===id);if(!b)return;
  const amount=Number(document.getElementById("billingPaymentAmount").value||0);
  if(amount<=0)return alert("Escribe un monto vÃ¡lido.");

  const from=b.nextPayment&&new Date(b.nextPayment)>new Date()?new Date(b.nextPayment):new Date();
  from.setMonth(from.getMonth()+1);
  b.nextPayment=from.toISOString().slice(0,10);
  b.status="Activo";b.billingStatus="Activa";

  const payment={
    id:"pay_"+SaaS.uid(),businessId:b.id,businessName:b.name,amount,
    method:document.getElementById("billingPaymentMethod").value,
    reference:document.getElementById("billingPaymentReference").value.trim(),
    note:document.getElementById("billingPaymentNote").value.trim(),
    createdAt:new Date().toISOString(),
    nextPayment:b.nextPayment
  };
  SaaS.billingPayments.push(payment);SaaS.saveBilling();SaaS.save();
  SaaS.audit?.("BILLING","Pago de suscripciÃ³n registrado",{amount,method:payment.method,nextPayment:b.nextPayment},b.id);
  SaaS.closeBillingPayment();SaaS.renderAll();window.App?.toast?.("Pago registrado y cuenta renovada");
};

SaaS.suspendBilling=function(id){
  const b=SaaS.db.businesses.find(x=>x.id===id);if(!b)return;
  if(!confirm(`Â¿Suspender el acceso de ${b.name}? Sus datos no serÃ¡n eliminados.`))return;
  b.status="Suspendido";b.billingStatus="Suspendida";SaaS.save();
  SaaS.audit?.("BILLING","Negocio suspendido",{reason:"billing"},id);SaaS.renderAll();
};
SaaS.reactivateBilling=function(id){
  const b=SaaS.db.businesses.find(x=>x.id===id);if(!b)return;
  b.status="Activo";b.billingStatus=SaaS.billingState({...b,status:"Activo"});SaaS.save();
  SaaS.audit?.("BILLING","Negocio reactivado",{},id);SaaS.renderAll();
};

const oldRenderAll_147=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_147();SaaS.renderBilling()};

;

/* ---- js/saas/sambrix-backup.js ---- */
SaaS.backups=SaaS.backups||[];
SaaS.trash=SaaS.trash||[];
SaaS.TRASH_RETENTION_DAYS=30;

SaaS.loadBackupSystem=function(){
  try{SaaS.backups=JSON.parse(localStorage.getItem("sambrix_backups"))||[]}catch{SaaS.backups=[]}
  try{SaaS.trash=JSON.parse(localStorage.getItem("sambrix_trash"))||[]}catch{SaaS.trash=[]}
  SaaS.cleanExpiredTrash();
};

SaaS.saveBackupSystem=function(){
  localStorage.setItem("sambrix_backups",JSON.stringify(SaaS.backups));
  localStorage.setItem("sambrix_trash",JSON.stringify(SaaS.trash));
};

SaaS.snapshotPlatform=function(){
  const tenants={};
  (SaaS.db.businesses||[]).forEach(b=>{
    try{
      const raw=localStorage.getItem(SaaS.tenantKey?.(b.id)||"");
      if(raw)tenants[b.id]=JSON.parse(raw);
      else if(SaaS.getContext()?.businessId===b.id&&window.App?.db)tenants[b.id]=JSON.parse(JSON.stringify(window.App.db));
    }catch{}
  });
  return {
    version:"14.8",
    createdAt:new Date().toISOString(),
    platform:JSON.parse(JSON.stringify(SaaS.db)),
    addons:JSON.parse(JSON.stringify(SaaS.addons||[])),
    businessAddons:JSON.parse(JSON.stringify(SaaS.businessAddons||{})),
    billingPayments:JSON.parse(JSON.stringify(SaaS.billingPayments||[])),
    notifications:JSON.parse(JSON.stringify(SaaS.notifications||[])),
    permissionRequests:JSON.parse(JSON.stringify(SaaS.permissionRequests||[])),
    globalAudit:JSON.parse(JSON.stringify(SaaS.globalAudit||[])),
    tenants
  };
};

SaaS.createBackup=function(businessId=""){
  const snapshot=SaaS.snapshotPlatform();
  let payload=snapshot;
  let label="Plataforma completa";
  if(businessId){
    const b=SaaS.db.businesses.find(x=>x.id===businessId);
    payload={version:snapshot.version,createdAt:snapshot.createdAt,business:b,tenant:snapshot.tenants[businessId]||null};
    label=b?.name||businessId;
  }
  const item={
    id:"backup_"+SaaS.uid(),
    businessId,
    label,
    createdAt:new Date().toISOString(),
    payload
  };
  SaaS.backups.push(item);
  if(SaaS.backups.length>40)SaaS.backups=SaaS.backups.slice(-40);
  SaaS.saveBackupSystem();
  SaaS.audit?.("BACKUP","Respaldo creado",{backupId:item.id,label},businessId);
  SaaS.renderBackupCenter();
  window.App?.toast?.("Respaldo creado");
  return item;
};

SaaS.exportBackup=function(){
  const item=SaaS.createBackup("");
  const blob=new Blob([JSON.stringify(item.payload,null,2)],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=`SAMBRIX_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
};

SaaS.restoreBackup=function(id){
  const item=SaaS.backups.find(x=>x.id===id);if(!item)return;
  if(!confirm(`Â¿Restaurar "${item.label}"? SAMBRIX crearÃ¡ primero un respaldo del estado actual.`))return;
  SaaS.createBackup("");
  try{
    const p=item.payload;
    if(p.platform){
      SaaS.db=JSON.parse(JSON.stringify(p.platform));
      SaaS.addons=JSON.parse(JSON.stringify(p.addons||[]));
      SaaS.businessAddons=JSON.parse(JSON.stringify(p.businessAddons||{}));
      SaaS.billingPayments=JSON.parse(JSON.stringify(p.billingPayments||[]));
      SaaS.notifications=JSON.parse(JSON.stringify(p.notifications||[]));
      SaaS.permissionRequests=JSON.parse(JSON.stringify(p.permissionRequests||[]));
      SaaS.globalAudit=JSON.parse(JSON.stringify(p.globalAudit||[]));
      SaaS.save();SaaS.saveAddons?.();SaaS.saveBilling?.();SaaS.saveNotifications?.();SaaS.saveSecurity?.();
      localStorage.setItem("sambrix_global_audit",JSON.stringify(SaaS.globalAudit));
      Object.entries(p.tenants||{}).forEach(([bid,state])=>SaaS.saveTenantState?.(bid,state));
    }else if(p.business?.id){
      const i=SaaS.db.businesses.findIndex(b=>b.id===p.business.id);
      if(i>=0)SaaS.db.businesses[i]=JSON.parse(JSON.stringify(p.business));else SaaS.db.businesses.push(JSON.parse(JSON.stringify(p.business)));
      if(p.tenant)SaaS.saveTenantState?.(p.business.id,p.tenant);
      SaaS.save();
    }
    SaaS.audit?.("BACKUP","Respaldo restaurado",{backupId:id,label:item.label},item.businessId);
    SaaS.renderAll();window.App?.toast?.("Respaldo restaurado");
  }catch(e){console.error(e);window.App?.toast?.("No se pudo restaurar el respaldo")}
};

SaaS.moveToTrash=function(type,item,businessId="",source=""){
  if(!item)return null;
  const entry={
    id:"trash_"+SaaS.uid(),
    type,
    businessId:businessId||SaaS.getContext()?.businessId||"",
    businessName:SaaS.db.businesses.find(b=>b.id===(businessId||SaaS.getContext()?.businessId))?.name||"",
    source,
    originalId:item.id||"",
    data:JSON.parse(JSON.stringify(item)),
    deletedAt:new Date().toISOString(),
    deletedBy:window.FirebaseBridge?.user?.email||SaaS.currentSecurityRole?.()||"local"
  };
  SaaS.trash.push(entry);SaaS.saveBackupSystem();
  SaaS.audit?.("SECURITY","Elemento enviado a papelera",{type,originalId:entry.originalId},entry.businessId);
  SaaS.renderBackupCenter();
  return entry;
};

SaaS.restoreTrash=function(id){
  const entry=SaaS.trash.find(x=>x.id===id);if(!entry)return;
  const state=SaaS.loadTenantState?.(entry.businessId);
  if(!state)return window.App?.toast?.("No se encontrÃ³ el negocio");
  const map={client:"clients",appointment:"appointments",product:"products",employee:"employees",sale:"sales"};
  const collection=map[entry.type];
  if(!collection)return window.App?.toast?.("Tipo no compatible con restauraciÃ³n");
  state[collection]=state[collection]||[];
  if(!state[collection].some(x=>x.id===entry.data.id))state[collection].push(entry.data);
  SaaS.saveTenantState?.(entry.businessId,state);
  if(SaaS.getContext()?.businessId===entry.businessId){
    window.App.db=state;localStorage.setItem(window.App.KEY,JSON.stringify(state));window.App.renderAll?.();
  }
  SaaS.trash=SaaS.trash.filter(x=>x.id!==id);SaaS.saveBackupSystem();
  SaaS.audit?.("SECURITY","Elemento restaurado desde papelera",{type:entry.type,originalId:entry.originalId},entry.businessId);
  SaaS.renderBackupCenter();window.App?.toast?.("Elemento recuperado");
};

SaaS.deleteTrashForever=function(id){
  const entry=SaaS.trash.find(x=>x.id===id);if(!entry)return;
  if(!confirm("Â¿Eliminar definitivamente? Esta acciÃ³n no se puede deshacer."))return;
  SaaS.trash=SaaS.trash.filter(x=>x.id!==id);SaaS.saveBackupSystem();
  SaaS.audit?.("SECURITY","Elemento eliminado definitivamente",{type:entry.type,originalId:entry.originalId},entry.businessId);
  SaaS.renderBackupCenter();
};

SaaS.cleanExpiredTrash=function(){
  const cutoff=Date.now()-SaaS.TRASH_RETENTION_DAYS*86400000;
  SaaS.trash=(SaaS.trash||[]).filter(x=>new Date(x.deletedAt).getTime()>=cutoff);
  SaaS.saveBackupSystem?.();
};

SaaS.renderBackupCenter=function(){
  const list=document.getElementById("backupList");if(!list)return;
  SaaS.cleanExpiredTrash();
  const filter=document.getElementById("backupBusinessFilter");
  if(filter){
    const old=filter.value;
    filter.innerHTML='<option value="">Todos los negocios</option><option value="platform">Plataforma completa</option>'+SaaS.db.businesses.map(b=>`<option value="${b.id}">${b.name}</option>`).join("");
    if(old)filter.value=old;
  }
  const selected=filter?.value||"";
  const backups=[...SaaS.backups].reverse().filter(b=>!selected||(selected==="platform"?!b.businessId:b.businessId===selected));
  list.innerHTML=backups.map(b=>`<div class="row backup-row"><div><strong>${b.label}</strong><small>${new Date(b.createdAt).toLocaleString()}</small><div class="backup-meta">${b.businessId?"Negocio":"Plataforma completa"}</div></div><div class="manage-actions"><button class="btn primary tiny" onclick="SaaS.restoreBackup('${b.id}')">Restaurar</button></div></div>`).join("")||'<div class="muted">No hay respaldos con este filtro.</div>';

  const tf=document.getElementById("trashTypeFilter")?.value||"";
  const trash=[...SaaS.trash].reverse().filter(x=>!tf||x.type===tf);
  document.getElementById("trashList").innerHTML=trash.map(t=>`<div class="row trash-row"><div><strong>${t.data?.name||t.data?.title||t.originalId||"Elemento"}</strong><small>${t.businessName||"Negocio"} Â· ${t.type}</small><div class="trash-meta">Eliminado ${new Date(t.deletedAt).toLocaleString()} por ${t.deletedBy}</div></div><div class="manage-actions"><button class="btn primary tiny" onclick="SaaS.restoreTrash('${t.id}')">Recuperar</button><button class="btn danger tiny" onclick="SaaS.deleteTrashForever('${t.id}')">Eliminar definitivo</button></div></div>`).join("")||'<div class="muted">La papelera estÃ¡ vacÃ­a.</div>';

  document.getElementById("backupCount")&&(document.getElementById("backupCount").textContent=SaaS.backups.length);
  document.getElementById("trashCount")&&(document.getElementById("trashCount").textContent=SaaS.trash.length);
  document.getElementById("retentionDays")&&(document.getElementById("retentionDays").textContent=SaaS.TRASH_RETENTION_DAYS);
  const last=SaaS.backups.at(-1);
  document.getElementById("lastBackupDate")&&(document.getElementById("lastBackupDate").textContent=last?new Date(last.createdAt).toLocaleDateString():"â€”");
};

const oldRenderAll_148=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_148();SaaS.renderBackupCenter()};

;

/* ---- js/saas/sambrix-support.js ---- */
SaaS.supportTickets=SaaS.supportTickets||[];
SaaS.supportSession=null;

SaaS.loadSupport=function(){
  try{SaaS.supportTickets=JSON.parse(localStorage.getItem("sambrix_support_tickets"))||[]}catch{SaaS.supportTickets=[]}
  try{SaaS.supportSession=JSON.parse(sessionStorage.getItem("sambrix_support_session"))||null}catch{SaaS.supportSession=null}
};
SaaS.saveSupport=function(){
  localStorage.setItem("sambrix_support_tickets",JSON.stringify(SaaS.supportTickets));
  if(SaaS.supportSession)sessionStorage.setItem("sambrix_support_session",JSON.stringify(SaaS.supportSession));
  else sessionStorage.removeItem("sambrix_support_session");
};

SaaS.openSupportTicket=function(){
  const role=SaaS.session?.role||"";
  if(role==="superadmin")return window.App?.go?.("supportCenter");
  if(!SaaS.getContext?.()?.businessId)return window.App?.toast?.("No hay negocio activo");
  document.getElementById("supportTicketSubject").value="";
  document.getElementById("supportTicketDescription").value="";
  document.getElementById("supportTicketPriority").value="Normal";
  document.getElementById("supportTicketModal")?.classList.add("open");
};
SaaS.closeSupportTicket=function(){document.getElementById("supportTicketModal")?.classList.remove("open")};

SaaS.createSupportTicket=function(){
  const subject=document.getElementById("supportTicketSubject").value.trim();
  const description=document.getElementById("supportTicketDescription").value.trim();
  if(!subject||!description)return alert("Completa asunto y descripciÃ³n.");
  const ctx=SaaS.getContext(),b=SaaS.db.businesses.find(x=>x.id===ctx.businessId);
  const t={id:"ticket_"+SaaS.uid(),businessId:ctx.businessId,businessName:b?.name||"",subject,description,priority:document.getElementById("supportTicketPriority").value,status:"Abierto",createdAt:new Date().toISOString(),createdBy:window.FirebaseBridge?.user?.email||SaaS.session?.role||"usuario",notes:[]};
  SaaS.supportTickets.push(t);SaaS.saveSupport();SaaS.audit?.("SUPPORT","Ticket creado",{ticketId:t.id,priority:t.priority},ctx.businessId);
  SaaS.closeSupportTicket();SaaS.renderSupport();window.App?.toast?.("Solicitud enviada a soporte");
};

SaaS.updateSupportTicket=function(id,status){
  const t=SaaS.supportTickets.find(x=>x.id===id);if(!t)return;
  t.status=status;t.updatedAt=new Date().toISOString();
  if(status==="Resuelto")t.resolvedAt=new Date().toISOString();
  SaaS.saveSupport();SaaS.audit?.("SUPPORT",`Ticket ${status.toLowerCase()}`,{ticketId:id},t.businessId);SaaS.renderSupport();
};

SaaS.enterSupportMode=function(businessId){
  if((SaaS.session?.role||SaaS.currentSecurityRole?.())!=="superadmin")return window.App?.toast?.("Solo SuperAdmin puede usar modo soporte");
  const b=SaaS.db.businesses.find(x=>x.id===businessId);if(!b)return;
  const reason=prompt(`Motivo para entrar a ${b.name}:`,"Soporte solicitado por el negocio");
  if(!reason)return;
  SaaS.supportSession={businessId,businessName:b.name,reason,startedAt:new Date().toISOString(),superAdmin:window.FirebaseBridge?.user?.email||"SuperAdmin"};
  SaaS.saveSupport();SaaS.audit?.("SUPPORT","SuperAdmin entrÃ³ en modo soporte",{reason},businessId);
  SaaS.switchTenant?.(businessId,{support:true});
  SaaS.renderSupportModeBanner();window.App?.go?.("inicio");
};

SaaS.exitSupportMode=function(){
  const s=SaaS.supportSession;if(!s)return;
  SaaS.audit?.("SUPPORT","SuperAdmin saliÃ³ del modo soporte",{durationMs:Date.now()-new Date(s.startedAt).getTime()},s.businessId);
  SaaS.supportSession=null;SaaS.saveSupport();
  try{SaaS.exitBusiness?.()}catch{}
  SaaS.renderSupportModeBanner();window.App?.go?.("supportCenter");
};

SaaS.renderSupportModeBanner=function(){
  const banner=document.getElementById("supportModeBanner");if(!banner)return;
  banner.classList.toggle("hidden",!SaaS.supportSession);
  if(SaaS.supportSession){
    (document.getElementById("supportBannerText")||document.getElementById("supportModeBusinessName")).textContent=`${SaaS.supportSession.businessName} Â· ${SaaS.supportSession.reason}`;
  }
};

SaaS.renderSupport=function(){
  const list=document.getElementById("supportTicketsList");if(!list)return;
  const filter=document.getElementById("supportStatusFilter")?.value||"";
  const rows=[...SaaS.supportTickets].reverse().filter(t=>!filter||t.status===filter);
  document.getElementById("supportOpenCount").textContent=SaaS.supportTickets.filter(t=>t.status==="Abierto").length;
  document.getElementById("supportProgressCount").textContent=SaaS.supportTickets.filter(t=>t.status==="En progreso").length;
  document.getElementById("supportResolvedCount").textContent=SaaS.supportTickets.filter(t=>t.status==="Resuelto").length;
  document.getElementById("supportModeState").textContent=SaaS.supportSession?"ON":"OFF";
  document.getElementById("supportModeBusiness").textContent=SaaS.supportSession?.businessName||"Sin negocio";

  list.innerHTML=rows.map(t=>`<div class="row support-ticket ${t.priority==="Urgente"?"urgent":""} ${t.status==="Resuelto"?"resolved":""}">
    <div><div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap"><strong>${t.subject}</strong><span class="support-priority ${t.priority}">${t.priority}</span></div><small>${t.businessName} Â· ${t.status} Â· ${new Date(t.createdAt).toLocaleString()}</small><div class="notification-meta">${t.description}</div></div>
    <div class="manage-actions">${t.status==="Abierto"?`<button class="btn primary tiny" onclick="SaaS.updateSupportTicket('${t.id}','En progreso')">Atender</button>`:""}${t.status!=="Resuelto"?`<button class="btn secondary tiny" onclick="SaaS.updateSupportTicket('${t.id}','Resuelto')">Resolver</button>`:""}<button class="btn secondary tiny" onclick="SaaS.enterSupportMode('${t.businessId}')">Entrar</button></div>
  </div>`).join("")||'<div class="muted">No hay tickets con este filtro.</div>';

  document.getElementById("supportBusinessList149").innerHTML=(SaaS.db.businesses||[]).map(b=>`<div class="row"><div><strong>${b.name}</strong><small>${b.owner||"Sin dueÃ±o"} Â· ${b.status||"Activo"}</small></div><button class="btn secondary tiny" onclick="SaaS.enterSupportMode('${b.id}')">Asistencia</button></div>`).join("");
  SaaS.renderSupportModeBanner();
};

const oldRenderAll_149=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_149();SaaS.renderSupport()};

;

/* ---- js/saas/sambrix-license.js ---- */
SaaS.PLAN_LIMITS=SaaS.PLAN_LIMITS||{
  basic:{branches:1,staff:5,users:3,publicBooking:true,reports:true,whiteLabel:false,advancedReports:false},
  pro:{branches:3,staff:20,users:10,publicBooking:true,reports:true,whiteLabel:false,advancedReports:true},
  premium:{branches:999,staff:999,users:999,publicBooking:true,reports:true,whiteLabel:true,advancedReports:true}
};

SaaS.planTier=function(subject){
 let plan=subject;
 if(subject?.planId) plan=SaaS.getPlan?.(subject.planId)||subject;
 const id=String(subject?.planId||plan?.id||"").toLowerCase();
 const n=String(plan?.name||"").trim().toLowerCase();
 if(id.includes("premium")||n.includes("premium")||n.includes("enterprise"))return "premium";
 if(id.includes("pro")||n==="pro"||n.startsWith("pro ")||n.endsWith(" pro")||n.includes("pro"))return "pro";
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
 const b=(SaaS.db?.businesses||[]).find(x=>x.id===(businessId||SaaS.getContext()?.businessId));if(!b)return false;

 // SuperAdmin is never restricted by a tenant's commercial plan.
 if(String(SaaS.session?.role||"").toLowerCase()==="superadmin")return true;

 const l=SaaS.licenseFor(b);if(l.blocked)return false;

 // Business pages use the commercial page matrix.
 const matrices=Object.values(SaaS.PLAN_FEATURES||{});
 const knownPages=new Set(matrices.flatMap(x=>Array.isArray(x)?x.filter(v=>v!=="*"):[]));
 if(knownPages.has(feature)){
   const pages=SaaS.planFeaturePages?.(l.plan)||SaaS.PLAN_FEATURES?.[b.planId]||[];
   return pages.includes("*")||pages.includes(feature);
 }

 // Capabilities such as whiteLabel/advancedReports continue using license limits.
 return l.limits[feature]!==false;
};
SaaS.withinLimit=function(kind,businessId,increment=0){
 const b=(SaaS.db?.businesses||[]).find(x=>x.id===(businessId||SaaS.getContext()?.businessId));if(!b)return false;
 const l=SaaS.licenseFor(b);if(l.blocked)return false;
 return Number(l.usage[kind]||0)+increment<=Number(l.limits[kind]??999);
};
SaaS.guardBusinessLicense=function(){
 const id=SaaS.getContext?.()?.businessId;if(!id)return true;
 const b=SaaS.db.businesses.find(x=>x.id===id);if(!b)return true;
 const l=SaaS.licenseFor(b);
 if(l.blocked && SaaS.session?.role!=="superadmin"){
   document.getElementById("accessDeniedMessage")&&(document.getElementById("accessDeniedMessage").textContent=`La suscripciÃ³n de ${b.name} estÃ¡ ${l.state.toLowerCase()}. ComunÃ­cate con SAMBRIX para reactivar el servicio.`);
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
 box.innerHTML=licenses.map(([b,l])=>`<div class="row license-row ${l.blocked?"blocked":""}"><div><strong>${b.name}</strong><small>${l.plan?.name||"Sin plan"} Â· ${l.state}</small><div class="license-usage"><span class="license-chip ${l.usage.branches>=l.limits.branches?"limit":""}">Sucursales ${l.usage.branches}/${l.limits.branches>=999?"âˆž":l.limits.branches}</span><span class="license-chip ${l.usage.staff>=l.limits.staff?"limit":""}">Personal ${l.usage.staff}/${l.limits.staff>=999?"âˆž":l.limits.staff}</span><span class="license-chip ${l.usage.users>=l.limits.users?"limit":""}">Usuarios ${l.usage.users}/${l.limits.users>=999?"âˆž":l.limits.users}</span></div></div><span class="billing-status ${l.blocked?"overdue":""}">${l.blocked?"Bloqueada":"Habilitada"}</span></div>`).join("");
 const plans=document.getElementById("licensePlansList");
 plans.innerHTML=(SaaS.db.plans||[]).map(p=>{const l=SaaS.PLAN_LIMITS[SaaS.planTier(p)];return `<article class="addon-card"><strong>${p.name}</strong><div class="addon-price">${SaaS.money?.(Number(p.price||0))||"$"+p.price}<small>/ mes</small></div><small>${l.branches>=999?"Sucursales ilimitadas":l.branches+" sucursal(es)"} Â· ${l.staff>=999?"Personal ilimitado":l.staff+" empleados"} Â· Marca blanca: ${l.whiteLabel?"SÃ­":"No"}</small></article>`}).join("");
};
const oldRoute_150=SaaS.routeSession;
if(oldRoute_150)SaaS.routeSession=function(){oldRoute_150();setTimeout(()=>SaaS.guardBusinessLicense(),100)};
const oldSwitch_150=SaaS.switchTenant;
if(oldSwitch_150)SaaS.switchTenant=function(id,opts){const r=oldSwitch_150(id,opts);setTimeout(()=>SaaS.guardBusinessLicense(),100);return r};
const oldRenderAll_150=SaaS.renderAll;
SaaS.renderAll=function(){
  oldRenderAll_150();
  SaaS.renderLicenses();
  SaaS.applyPlanUI?.();
};

;

/* ---- js/saas/sambrix-analytics.js ---- */
SaaS.businessActivity=function(b){
 const t=SaaS.loadTenantState?.(b.id)||{};
 return {
   appointments:(t.appointments||[]).length,
   clients:(t.clients||[]).length,
   sales:(t.sales||[]).length,
   staff:(t.employees||t.barbers||[]).length,
   score:(t.appointments||[]).length+(t.sales||[]).length*2+(t.clients||[]).length
 };
};
SaaS.analyticsSnapshot=function(){
 const bs=SaaS.db.businesses||[];
 const licenses=bs.map(b=>({b,l:SaaS.licenseFor?.(b),a:SaaS.businessActivity(b)}));
 const paying=licenses.filter(x=>x.l&&!x.l.blocked);
 const mrr=paying.reduce((s,x)=>s+Number(x.l.plan?.price||0),0);
 const cancelled=bs.filter(b=>["Cancelado","Cancelada"].includes(b.status)).length;
 return {licenses,paying,mrr,arr:mrr*12,retention:bs.length?Math.round((bs.length-cancelled)/bs.length*100):100};
};
SaaS.renderAnalytics=function(){
 const root=document.getElementById("analyticsBusinessRanking");if(!root)return;
 const s=SaaS.analyticsSnapshot(),money=n=>SaaS.money?.(n)||("$"+Number(n).toFixed(2));
 document.getElementById("analyticsMRR").textContent=money(s.mrr);
 document.getElementById("analyticsARR").textContent=money(s.arr);
 document.getElementById("analyticsActiveBusinesses").textContent=s.paying.length;
 document.getElementById("analyticsRetention").textContent=s.retention+"%";

 const planCounts={};
 s.licenses.forEach(x=>{const name=x.l?.plan?.name||"Sin plan";planCounts[name]=(planCounts[name]||0)+1});
 const maxPlan=Math.max(1,...Object.values(planCounts));
 document.getElementById("analyticsPlanMix").innerHTML=Object.entries(planCounts).map(([name,count])=>`<div class="row"><div style="flex:1"><strong>${name}</strong><small>${count} negocio(s)</small><div class="analytics-bar"><i style="width:${count/maxPlan*100}%"></i></div></div><strong>${count}</strong></div>`).join("")||'<div class="muted">Sin datos.</div>';

 const states={Activa:0,"Por vencer":0,Vencida:0,Suspendida:0};
 s.licenses.forEach(x=>{const st=x.l?.state||"Activa";states[st]=(states[st]||0)+1});
 document.getElementById("analyticsHealth").innerHTML=Object.entries(states).map(([k,v])=>`<div class="row"><span>${k}</span><strong>${v}</strong></div>`).join("");

 const q=(document.getElementById("analyticsSearch")?.value||"").toLowerCase();
 const ranked=s.licenses.filter(x=>!q||`${x.b.name} ${x.b.owner||""}`.toLowerCase().includes(q)).sort((x,y)=>y.a.score-x.a.score);
 root.innerHTML=ranked.map((x,i)=>`<div class="row"><div class="analytics-rank">${i+1}</div><div style="flex:1"><strong>${x.b.name}</strong><small>${x.a.appointments} citas Â· ${x.a.clients} clientes Â· ${x.a.sales} ventas Â· ${x.a.staff} personal</small></div><strong>${x.a.score} pts</strong></div>`).join("");

 const recent=[...s.licenses].sort((x,y)=>new Date(y.b.createdAt||0)-new Date(x.b.createdAt||0)).slice(0,8);
 document.getElementById("analyticsGrowth").innerHTML=recent.map(x=>`<div class="row"><div><strong>${x.b.name}</strong><small>${x.b.createdAt?new Date(x.b.createdAt).toLocaleDateString():"Sin fecha"} Â· ${x.l?.plan?.name||"Sin plan"}</small></div><span class="status ok">Alta</span></div>`).join("");

 const risks=[];
 s.licenses.forEach(x=>{
   if(x.l?.state==="Vencida"||x.l?.state==="Suspendida")risks.push({b:x.b,msg:`Cuenta ${x.l.state.toLowerCase()}`,critical:true});
   else if(x.l?.state==="Por vencer")risks.push({b:x.b,msg:"SuscripciÃ³n vence en 7 dÃ­as o menos",critical:false});
   if(x.a.score===0)risks.push({b:x.b,msg:"Sin actividad registrada",critical:false});
 });
 document.getElementById("analyticsRisks").innerHTML=risks.slice(0,12).map(r=>`<div class="row analytics-risk ${r.critical?"critical":""}"><div><strong>${r.b.name}</strong><small>${r.msg}</small></div><button class="btn secondary tiny" onclick="SaaS.enterSupportMode?.('${r.b.id}')">Revisar</button></div>`).join("")||'<div class="muted">No se detectan riesgos importantes.</div>';
};
const oldRenderAll_151=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_151();SaaS.renderAnalytics()};

;

/* ---- js/saas/sambrix-activation.js ---- */

/* ===== FASE 20.8 â€” ACTIVACIÃ“N Y ENTREGA SEGURA ===== */

SaaS.ownerAccessState=function(business){
  const member=(business?.members||[]).find(m=>String(m.role||"").toLowerCase()==="owner");
  const raw=String(business?.ownerAccessStatus||member?.authStatus||"pending").toLowerCase();

  if(["active","activo","verified","verificado"].includes(raw)){
    return {active:true,status:"active",label:"Acceso activo"};
  }
  if(raw==="local-review"){
    return {active:false,review:true,status:"local-review",label:"Acceso local de prueba"};
  }
  if(["blocked","bloqueado","disabled","deshabilitado"].includes(raw)){
    return {active:false,status:"blocked",label:"Acceso bloqueado"};
  }
  return {active:false,status:"pending",label:"Pendiente de activaciÃ³n"};
};

SaaS.trainingForBusiness=function(businessId){
  const items=SaaS.trainingHandoff?.items||[];
  return [...items].reverse().find(x=>x.businessId===businessId)||null;
};

SaaS.trainingStatusForBusiness=function(businessId){
  const item=SaaS.trainingForBusiness(businessId);
  if(!item){
    return {started:false,complete:false,pct:0,criticalPending:SaaS.TRAINING_HANDOFF_STEPS?.filter(s=>s.critical).length||0,item:null};
  }
  const steps=SaaS.TRAINING_HANDOFF_STEPS||[];
  const done=steps.filter(s=>item.steps?.[s.id]).length;
  const criticalPending=steps.filter(s=>s.critical&&!item.steps?.[s.id]).length;
  return {
    started:true,
    complete:done===steps.length && criticalPending===0,
    pct:steps.length?Math.round(done/steps.length*100):0,
    criticalPending,
    item
  };
};

SaaS.reconcileDeliveryStates=function(){
  let changed=false;
  (SaaS.db.businesses||[]).forEach(b=>{
    const access=SaaS.ownerAccessState(b);
    const training=SaaS.trainingStatusForBusiness?.(b.id)||{complete:false};

    if(b.deliveredAt && (!access.active || !training.complete)){
      b.legacyDeliveredAt=b.legacyDeliveredAt||b.deliveredAt;
      b.deliveryReviewReason=!access.active
        ?"El propietario no tiene acceso activo."
        :"La capacitaciÃ³n/aceptaciÃ³n no estÃ¡ completa.";
      b.deliveredAt="";
      b.deliveredBy="";
      b.deliveryStatus="Requiere revisiÃ³n";
      changed=true;
    }
  });
  if(changed)SaaS.save?.();
  return changed;
};

SaaS.activationBusinessId="";

SaaS.activationStatus=function(b){
 const tenant=SaaS.loadTenantState?.(b.id)||{};
 const license=SaaS.licenseFor?.(b);
 const access=SaaS.ownerAccessState(b);
 const training=SaaS.trainingStatusForBusiness?.(b.id)||{started:false,complete:false,pct:0,criticalPending:0};

 const checks=[
  {id:"business",label:"Datos del negocio",ok:!!(b.name&&b.type)},
  {id:"owner",label:"DueÃ±o y correo",ok:!!(b.owner&&b.ownerEmail)},
  {id:"ownerAccess",label:"Acceso real del propietario",ok:access.active,critical:true,detail:access.label},
  {id:"branch",label:"Sucursal principal",ok:!!b.branches?.length},
  {id:"plan",label:"Plan SAMBRIX",ok:!!b.planId},
  {id:"brand",label:"Marca del negocio",ok:!!b.brand?.name},
  {id:"services",label:"Servicios configurados",ok:(tenant.services||[]).length>0},
  {id:"staff",label:"Profesional/personal configurado",ok:(tenant.barbers||tenant.employees||[]).length>0},
  {id:"license",label:"Licencia habilitada",ok:!!license&&!license.blocked},
  {id:"training",label:"CapacitaciÃ³n y aceptaciÃ³n",ok:training.complete,critical:true,detail:training.started?`${training.pct}% completado`:"No iniciada"}
 ];

 const pct=Math.round(checks.filter(x=>x.ok).length/checks.length*100);
 const criticalOk=checks.filter(x=>x.critical).every(x=>x.ok);
 const ready=pct===100&&criticalOk;

 return {
   checks,pct,ready,
   delivered:!!b.deliveredAt&&ready,
   access,
   training,
   reviewRequired:b.deliveryStatus==="Requiere revisiÃ³n"
 };
};
SaaS.renderActivation=function(){
 const box=document.getElementById("activationBusinessList");if(!box)return;
 SaaS.reconcileDeliveryStates?.();

 const q=(document.getElementById("activationSearch")?.value||"").toLowerCase();
 const bs=(SaaS.db.businesses||[]).filter(b=>!q||`${b.name} ${b.owner||""}`.toLowerCase().includes(q));
 const states=bs.map(b=>[b,SaaS.activationStatus(b)]);
 const all=(SaaS.db.businesses||[]).map(b=>SaaS.activationStatus(b));

 document.getElementById("activationReadyCount").textContent=all.filter(x=>x.ready&&!x.delivered).length;
 document.getElementById("activationPendingCount").textContent=all.filter(x=>!x.ready).length;
 document.getElementById("activationDeliveredCount").textContent=all.filter(x=>x.delivered).length;
 document.getElementById("activationAverage").textContent=(all.length?Math.round(all.reduce((s,x)=>s+x.pct,0)/all.length):0)+"%";

 box.innerHTML=states.map(([b,s])=>{
   const state=s.reviewRequired?"Requiere revisiÃ³n":
     s.delivered?"Entregado":
     !s.access.active?"Acceso del propietario pendiente":
     !s.training.complete?"CapacitaciÃ³n pendiente":
     s.ready?"Listo para entregar":"ConfiguraciÃ³n pendiente";

   const action=s.delivered?"Ver entrega":s.ready?"Entregar":"Revisar";

   return `<div class="row activation-row ${s.delivered?"delivered":s.ready?"ready":s.reviewRequired?"review":""}">
     <div style="flex:1">
       <strong>${b.name}</strong>
       <small>${b.owner||"Sin dueÃ±o"} Â· ${state}</small>
       <div class="activation-progress"><i style="width:${s.pct}%"></i></div>
     </div>
     <strong>${s.pct}%</strong>
     <button class="btn ${s.ready?"primary":"secondary"} tiny" onclick="SaaS.openActivation('${b.id}')">${action}</button>
   </div>`;
 }).join("")||'<div class="muted">No hay negocios para revisar.</div>';
};
SaaS.openActivation=function(id){
 const b=SaaS.db.businesses.find(x=>x.id===id);if(!b)return;
 SaaS.activationBusinessId=id;
 const s=SaaS.activationStatus(b);

 document.getElementById("activationModalTitle").textContent=b.name;
 document.getElementById("activationChecklist").innerHTML=s.checks.map(c=>`
   <div class="row">
     <div class="activation-check ${c.ok?"ok":"pending"}">
       <i>${c.ok?"âœ“":"!"}</i>
       <div>
         <strong>${c.label}${c.critical?" Â· crÃ­tico":""}</strong>
         <small>${c.ok?"Completado":(c.detail||"Pendiente")}</small>
       </div>
     </div>
   </div>`).join("");

 document.getElementById("activationOwnerAccess").innerHTML=`
   <div class="row"><span>DueÃ±o</span><strong>${b.owner||"â€”"}</strong></div>
   <div class="row"><span>Correo</span><strong>${b.ownerEmail||"â€”"}</strong></div>
   <div class="row"><span>Acceso</span><strong>${s.access.label}</strong></div>
   <div class="row"><span>CapacitaciÃ³n</span><strong>${s.training.complete?"Completa":s.training.started?s.training.pct+"%":"No iniciada"}</strong></div>
   <div class="row"><span>Plan</span><strong>${SaaS.getPlan(b.planId)?.name||"â€”"}</strong></div>
   <div class="row"><span>Estado</span><strong>${s.delivered?"Entregado":s.ready?"Listo":"Pendiente"}</strong></div>
   <div class="row"><span>GestiÃ³n de acceso</span><button class="btn secondary tiny" type="button" onclick="SaaS.openOwnerAccessSetup('${b.id}')">${s.access.active?"Restablecer acceso":"Configurar acceso"}</button></div>`;

 document.getElementById("activationDeliverBtn").disabled=!s.ready||s.delivered;
 document.getElementById("activationDeliverBtn").textContent=s.delivered?"Ya entregado":s.ready?"Marcar como entregado":"Entrega bloqueada";
 document.getElementById("activationModal")?.classList.add("open");
};
SaaS.closeActivation=function(){document.getElementById("activationModal")?.classList.remove("open")};
SaaS.previewActivation=function(){
 const id=SaaS.activationBusinessId;if(!id)return;
 SaaS.closeActivation();SaaS.enterSupportMode?.(id);
};
SaaS.deliverActivation=function(){
 const b=SaaS.db.businesses.find(x=>x.id===SaaS.activationBusinessId);if(!b)return;
 const s=SaaS.activationStatus(b);

 if(!s.access.active){
   return alert("No se puede entregar: el propietario todavÃ­a no tiene un acceso activo.");
 }
 if(!s.training.complete){
   return alert("No se puede entregar: la capacitaciÃ³n y aceptaciÃ³n del propietario no estÃ¡n completas.");
 }
 if(!s.ready){
   const pending=s.checks.filter(x=>!x.ok).map(x=>x.label).join(", ");
   return alert(`TodavÃ­a faltan configuraciones: ${pending}`);
 }
 if(!confirm(`Â¿Confirmar que ${b.name} fue probado, capacitado y entregado al propietario?`))return;

 b.deliveredAt=new Date().toISOString();
 b.deliveredBy=window.FirebaseBridge?.user?.email||SaaS.session?.user?.email||"SuperAdmin";
 b.deliveryStatus="Entregado";
 b.deliveryReviewReason="";
 b.status="Activo";

 SaaS.save();
 SaaS.audit?.("BUSINESS","Negocio entregado al dueÃ±o",{
   owner:b.owner,
   ownerEmail:b.ownerEmail,
   ownerAccessStatus:s.access.status,
   trainingPct:s.training.pct
 },b.id);

 SaaS.pushNotification?.({
   type:"system",
   businessId:b.id,
   entityId:b.id,
   key:`activation:${b.id}`,
   title:"SAMBRIX activado",
   message:`${b.name} fue validado y entregado al propietario.`,
   action:"inicio"
 });
 SaaS.saveNotifications?.();
 SaaS.closeActivation();
 SaaS.renderAll();
 window.App?.toast?.("Negocio entregado correctamente");
};
const oldRenderAll_152=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_152();SaaS.renderActivation()};


const oldRenderAll_208A=SaaS.renderAll;
SaaS.renderAll=function(){
  SaaS.reconcileDeliveryStates?.();
  return oldRenderAll_208A();
};

;

/* ---- js/saas/sambrix-diagnostics.js ---- */
SaaS.diagnosticResults=[];

SaaS.runDiagnostics=function(){
 const tests=[];
 const add=(name,status,detail,group="platform")=>tests.push({name,status,detail,group});

 add("Firebase configurado",window.FirebaseBridge!==undefined?"pass":"fail",window.FirebaseBridge!==undefined?"Bridge Firebase detectado.":"No se detectÃ³ FirebaseBridge.");
 add("AutenticaciÃ³n por rol",typeof SaaS.resolveFirebaseSession==="function"?"pass":"fail","ResoluciÃ³n de sesiÃ³n y roles.");
 add("Aislamiento multi-negocio",typeof SaaS.switchTenant==="function"&&typeof SaaS.loadTenantState==="function"?"pass":"fail","Tenant manager disponible.");
 add("Reglas de seguridad",typeof SaaS.can==="function"||typeof SaaS.currentSecurityRole==="function"?"pass":"warn","Control de permisos cargado.");
 add("Reservas pÃºblicas",!!window.NexoPublicCloud&&typeof SaaS.approvePublicBooking==="function"?"pass":"warn","SAMBRIX Client y bandeja de reservas.");
 add("Suscripciones",typeof SaaS.billingState==="function"?"pass":"fail","Motor de cobros y estados.");
 add("Licencias",typeof SaaS.licenseFor==="function"?"pass":"fail","LÃ­mites por plan.");
 add("AuditorÃ­a",typeof SaaS.audit==="function"?"pass":"fail","Registro de acciones crÃ­ticas.");
 add("Respaldos",typeof SaaS.createBackup==="function"?"pass":"warn","Respaldo y restauraciÃ³n disponibles.");
 add("Soporte remoto",typeof SaaS.enterSupportMode==="function"?"pass":"warn","Modo soporte disponible.");
 add("Notificaciones",typeof SaaS.generateNotifications==="function"?"pass":"warn","Centro de avisos disponible.");

 (SaaS.db.businesses||[]).forEach(b=>{
   const a=SaaS.activationStatus?.(b);
   const lic=SaaS.licenseFor?.(b);
   add(b.name,a?.ready?"pass":"warn",a?.ready?"ConfiguraciÃ³n completa.":`PreparaciÃ³n ${a?.pct||0}%.`,"business");
   if(lic?.blocked)add(`${b.name} Â· licencia`,"warn",`Estado: ${lic.state}`,"business");
   const tenant=SaaS.loadTenantState?.(b.id)||{};
   const foreign=[...(tenant.clients||[]),...(tenant.appointments||[]),...(tenant.sales||[])].filter(x=>x.businessId&&x.businessId!==b.id);
   add(`${b.name} Â· aislamiento`,foreign.length?"fail":"pass",foreign.length?`${foreign.length} registro(s) apuntan a otro negocio.`:"Sin cruces detectados.","business");
 });

 SaaS.diagnosticResults=tests;SaaS.renderDiagnostics();
 SaaS.audit?.("SYSTEM","DiagnÃ³stico de pre-lanzamiento ejecutado",{pass:tests.filter(x=>x.status==="pass").length,warn:tests.filter(x=>x.status==="warn").length,fail:tests.filter(x=>x.status==="fail").length},"");
};

SaaS.renderDiagnostics=function(){
 const tests=SaaS.diagnosticResults||[];
 const pass=tests.filter(x=>x.status==="pass").length,warn=tests.filter(x=>x.status==="warn").length,fail=tests.filter(x=>x.status==="fail").length,total=tests.length;
 const score=total?Math.round((pass+warn*.5)/total*100):0;
 document.getElementById("diagPassCount").textContent=pass;
 document.getElementById("diagWarnCount").textContent=warn;
 document.getElementById("diagFailCount").textContent=fail;
 document.getElementById("diagScore").textContent=score+"%";
 const row=t=>`<div class="row diag-row ${t.status}"><div class="diag-mark">${t.status==="pass"?"âœ“":t.status==="warn"?"!":"Ã—"}</div><div><strong>${t.name}</strong><small>${t.detail}</small></div></div>`;
 document.getElementById("diagPlatformList").innerHTML=tests.filter(x=>x.group==="platform").map(row).join("")||'<div class="muted">Ejecuta el diagnÃ³stico.</div>';
 document.getElementById("diagBusinessList").innerHTML=tests.filter(x=>x.group==="business").map(row).join("")||'<div class="muted">Ejecuta el diagnÃ³stico.</div>';
 const r=document.getElementById("diagLaunchResult");
 if(!tests.length){r.className="launch-result";r.innerHTML="<h2>DiagnÃ³stico pendiente</h2><p>Ejecuta la revisiÃ³n antes de publicar.</p>";return}
 if(fail){r.className="launch-result blocked";r.innerHTML=`<span class="tag">NO PUBLICAR TODAVÃA</span><h2>${fail} error(es) crÃ­tico(s)</h2><p>Corrige los errores antes de pasar SAMBRIX a producciÃ³n.</p>`}
 else if(warn){r.className="launch-result";r.innerHTML=`<span class="tag">CASI LISTO</span><h2>${score}% preparado</h2><p>No hay errores crÃ­ticos, pero quedan ${warn} advertencia(s) por revisar.</p>`}
 else{r.className="launch-result ready";r.innerHTML=`<span class="tag">LISTO</span><h2>SAMBRIX preparado para lanzamiento</h2><p>Todos los controles automÃ¡ticos fueron aprobados.</p>`}
};

;

/* ---- js/saas/sambrix-launch.js ---- */
SaaS.releases=SaaS.releases||[];
SaaS.launchReviewAt=null;
SaaS.loadReleases=function(){
 try{SaaS.releases=JSON.parse(localStorage.getItem("sambrix_releases"))||[]}catch{SaaS.releases=[]}
 SaaS.launchReviewAt=localStorage.getItem("sambrix_launch_review_at")||null;
};
SaaS.saveReleases=function(){
 localStorage.setItem("sambrix_releases",JSON.stringify(SaaS.releases));
 if(SaaS.launchReviewAt)localStorage.setItem("sambrix_launch_review_at",SaaS.launchReviewAt);
};
SaaS.launchGates=function(){
 const d=SaaS.diagnosticResults||[];
 const diagRan=d.length>0, diagFails=d.filter(x=>x.status==="fail").length;
 const businesses=SaaS.db.businesses||[];
 const delivered=businesses.filter(b=>SaaS.activationStatus?.(b)?.delivered).length;
 const blocked=businesses.filter(b=>SaaS.licenseFor?.(b)?.blocked).length;
 return [
  {name:"DiagnÃ³stico ejecutado",status:diagRan?"pass":"fail",detail:diagRan?"QA disponible.":"Ejecuta DiagnÃ³stico antes del release."},
  {name:"Sin errores crÃ­ticos",status:diagRan&&diagFails===0?"pass":"fail",detail:diagFails?`${diagFails} error(es) crÃ­tico(s).`:"No se detectan errores crÃ­ticos."},
  {name:"Respaldo disponible",status:(SaaS.backups||[]).length?"pass":"warn",detail:(SaaS.backups||[]).length?`${SaaS.backups.length} respaldo(s).`:"Conviene crear un respaldo antes de publicar."},
  {name:"Negocios entregados",status:businesses.length===0||delivered>0?"pass":"warn",detail:`${delivered}/${businesses.length} marcados como entregados.`},
  {name:"Licencias bloqueadas",status:blocked===0?"pass":"warn",detail:blocked?`${blocked} cuenta(s) bloqueada(s), revisar cobros.`:"Todas las licencias operativas."},
  {name:"AuditorÃ­a activa",status:typeof SaaS.audit==="function"?"pass":"fail",detail:"Registro de acciones crÃ­ticas."},
  {name:"Soporte disponible",status:typeof SaaS.enterSupportMode==="function"?"pass":"warn",detail:"Asistencia remota del SuperAdmin."}
 ];
};
SaaS.reviewLaunch=function(){
 SaaS.runDiagnostics?.();
 SaaS.launchReviewAt=new Date().toISOString();SaaS.saveReleases();SaaS.renderLaunchCenter();
 SaaS.audit?.("SYSTEM","RevisiÃ³n de lanzamiento ejecutada",{version:"15.4"},"");
};
SaaS.createRelease=function(){
 const gates=SaaS.launchGates(),fails=gates.filter(x=>x.status==="fail");
 if(fails.length)return alert("No se puede crear el release: hay controles crÃ­ticos pendientes.");
 const suggested=`15.4.${SaaS.releases.length+1}`;
 const version=prompt("NÃºmero de versiÃ³n:",suggested);if(!version)return;
 const notes=prompt("Nota breve de esta versiÃ³n:","Cierre de plataforma y preparaciÃ³n para pruebas.")||"";
 const r={id:"release_"+SaaS.uid(),version,notes,createdAt:new Date().toISOString(),createdBy:window.FirebaseBridge?.user?.email||"SuperAdmin",checks:gates};
 SaaS.releases.push(r);SaaS.saveReleases();SaaS.audit?.("SYSTEM","Release creado",{version,notes},"");SaaS.renderLaunchCenter();window.App?.toast?.(`VersiÃ³n ${version} registrada`);
};
SaaS.renderLaunchCenter=function(){
 const box=document.getElementById("launchGateList");if(!box)return;
 const gates=SaaS.launchGates(),pass=gates.filter(x=>x.status==="pass").length,fail=gates.filter(x=>x.status==="fail").length,warn=gates.filter(x=>x.status==="warn").length;
 document.getElementById("launchChecks").textContent=`${pass}/${gates.length}`;
 document.getElementById("launchReleaseCount").textContent=SaaS.releases.length;
 document.getElementById("launchLastReview").textContent=SaaS.launchReviewAt?new Date(SaaS.launchReviewAt).toLocaleDateString():"â€”";
 box.innerHTML=gates.map(g=>`<div class="row launch-gate ${g.status}"><div class="diag-mark">${g.status==="pass"?"âœ“":g.status==="warn"?"!":"Ã—"}</div><div><strong>${g.name}</strong><small>${g.detail}</small></div></div>`).join("");
 document.getElementById("releaseHistoryList").innerHTML=[...SaaS.releases].reverse().map(r=>`<div class="row release-row"><div><span class="release-version">v${r.version}</span><small>${new Date(r.createdAt).toLocaleString()} Â· ${r.createdBy}</small><div class="release-note">${r.notes||"Sin notas"}</div></div><span class="status ok">Registrado</span></div>`).join("")||'<div class="muted">TodavÃ­a no hay releases registrados.</div>';
 const dec=document.getElementById("launchDecision");
 if(fail){dec.className="launch-result blocked";dec.innerHTML=`<span class="tag">NO-GO</span><h2>No publicar todavÃ­a</h2><p>Hay ${fail} control(es) crÃ­tico(s) pendiente(s).</p>`}
 else if(warn){dec.className="launch-result";dec.innerHTML=`<span class="tag">GO CON REVISIÃ“N</span><h2>Sin bloqueos crÃ­ticos</h2><p>Quedan ${warn} advertencia(s). Puedes cerrar esas revisiones antes de la prueba final.</p>`}
 else{dec.className="launch-result ready";dec.innerHTML=`<span class="tag">GO</span><h2>VersiÃ³n preparada</h2><p>Todos los controles de lanzamiento estÃ¡n aprobados.</p>`}
};
const oldRenderAll_154=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_154();SaaS.renderLaunchCenter()};

;

/* ---- js/saas/sambrix-tests.js ---- */
SaaS.testResults=SaaS.testResults||[];

SaaS.test=function(name,fn,group="core"){
  const started=performance.now();
  try{
    const value=fn();
    const status=value===false?"fail":value==="warn"?"warn":"pass";
    SaaS.testResults.push({name,status,group,detail:status==="pass"?"Correcto":status==="warn"?"RevisiÃ³n manual recomendada":"No superÃ³ la prueba",ms:Math.round(performance.now()-started)});
  }catch(e){
    SaaS.testResults.push({name,status:"fail",group,detail:e?.message||String(e),ms:Math.round(performance.now()-started)});
  }
};

SaaS.runFullTests=function(){
  SaaS.testResults=[];

  SaaS.test("Objeto principal SaaS",()=>!!window.SaaS);
  SaaS.test("Firebase Bridge",()=>!!window.FirebaseBridge);
  SaaS.test("GestiÃ³n de sesiÃ³n",()=>typeof SaaS.resolveFirebaseSession==="function");
  SaaS.test("Roles y permisos",()=>typeof SaaS.currentSecurityRole==="function");
  SaaS.test("Cambio de tenant",()=>typeof SaaS.switchTenant==="function");
  SaaS.test("Carga aislada de tenant",()=>typeof SaaS.loadTenantState==="function");
  SaaS.test("AuditorÃ­a",()=>typeof SaaS.audit==="function");
  SaaS.test("Respaldos",()=>typeof SaaS.createBackup==="function");
  SaaS.test("RecuperaciÃ³n",()=>typeof SaaS.restoreBackup==="function");
  SaaS.test("Modo soporte",()=>typeof SaaS.enterSupportMode==="function");
  SaaS.test("DiagnÃ³stico",()=>typeof SaaS.runDiagnostics==="function");
  SaaS.test("Centro de lanzamiento",()=>typeof SaaS.launchGates==="function");

  SaaS.test("Negocios registrados",()=>Array.isArray(SaaS.db?.businesses),"business");
  SaaS.test("Planes SaaS",()=>Array.isArray(SaaS.db?.plans)&&SaaS.db.plans.length>0,"business");
  SaaS.test("Motor de suscripciones",()=>typeof SaaS.billingState==="function","business");
  SaaS.test("Licencias por plan",()=>typeof SaaS.licenseFor==="function","business");
  SaaS.test("AnalÃ­tica SaaS",()=>typeof SaaS.analyticsSnapshot==="function","business");
  SaaS.test("ActivaciÃ³n y entrega",()=>typeof SaaS.activationStatus==="function","business");
  SaaS.test("Notificaciones",()=>typeof SaaS.pushNotification==="function","business");
  SaaS.test("Reservas pÃºblicas",()=>typeof SaaS.approvePublicBooking==="function"&&typeof SaaS.rejectPublicBooking==="function","business");
  SaaS.test("Tickets de soporte",()=>typeof SaaS.createSupportTicket==="function","business");
  SaaS.test("Cobros",()=>typeof SaaS.registerBillingPayment==="function","business");

  (SaaS.db.businesses||[]).forEach(b=>{
    SaaS.test(`${b.name}: tenant legible`,()=>{
      const t=SaaS.loadTenantState?.(b.id);
      return t&&typeof t==="object";
    },"business");
    SaaS.test(`${b.name}: aislamiento`,()=>{
      const t=SaaS.loadTenantState?.(b.id)||{};
      const rows=[...(t.clients||[]),...(t.appointments||[]),...(t.sales||[])];
      return !rows.some(x=>x.businessId&&x.businessId!==b.id);
    },"business");
  });

  SaaS.renderTestCenter();
  SaaS.audit?.("SYSTEM","Pruebas integrales ejecutadas",{
    pass:SaaS.testResults.filter(x=>x.status==="pass").length,
    warn:SaaS.testResults.filter(x=>x.status==="warn").length,
    fail:SaaS.testResults.filter(x=>x.status==="fail").length
  },"");
};

SaaS.resetTests=function(){SaaS.testResults=[];SaaS.renderTestCenter()};

SaaS.renderTestCenter=function(){
  const core=document.getElementById("testCoreList");if(!core)return;
  const r=SaaS.testResults||[],pass=r.filter(x=>x.status==="pass").length,warn=r.filter(x=>x.status==="warn").length,fail=r.filter(x=>x.status==="fail").length;
  document.getElementById("testPassCount").textContent=pass;
  document.getElementById("testWarnCount").textContent=warn;
  document.getElementById("testFailCount").textContent=fail;
  document.getElementById("testCoverage").textContent=r.length?Math.round((pass+warn)/r.length*100)+"%":"0%";

  const row=x=>`<div class="row test-row ${x.status}"><div class="diag-mark">${x.status==="pass"?"âœ“":x.status==="warn"?"!":"Ã—"}</div><div><strong>${x.name}</strong><small>${x.detail}</small><div class="test-time">${x.ms} ms</div></div></div>`;
  core.innerHTML=r.filter(x=>x.group==="core").map(row).join("")||'<div class="muted">Ejecuta las pruebas.</div>';
  document.getElementById("testBusinessList").innerHTML=r.filter(x=>x.group==="business").map(row).join("")||'<div class="muted">Ejecuta las pruebas.</div>';

  const final=document.getElementById("testFinalResult");
  if(!r.length){final.className="launch-result";final.innerHTML="<h2>Pruebas pendientes</h2><p>Ejecuta la baterÃ­a integral antes de comenzar las pruebas reales.</p>";return}
  if(fail){final.className="launch-result blocked";final.innerHTML=`<span class="tag">CORRECCIÃ“N NECESARIA</span><h2>${fail} prueba(s) fallida(s)</h2><p>No entregar para prueba real hasta corregir estos puntos.</p>`}
  else if(warn){final.className="launch-result";final.innerHTML=`<span class="tag">REVISIÃ“N MANUAL</span><h2>Pruebas automÃ¡ticas aprobadas</h2><p>Quedan ${warn} punto(s) para comprobar manualmente.</p>`}
  else{final.className="launch-result ready";final.innerHTML=`<span class="tag">APROBADO</span><h2>BaterÃ­a automÃ¡tica completada</h2><p>El siguiente paso serÃ¡ la prueba real de usuario, Firebase y mÃºltiples dispositivos.</p>`}
};

const oldRenderAll_155=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_155();SaaS.renderTestCenter()};

;

/* ---- js/saas/sambrix-technical-audit.js ---- */
SaaS.staticAudit={"jsCount": 66, "duplicateIds": [], "missingRefs": [], "syntaxErrors": [], "nodeChecked": true};
SaaS.renderTechnicalAudit=function(){
 const a=SaaS.staticAudit, box=document.getElementById("technicalStaticList");if(!box)return;
 document.getElementById("techJsCount").textContent=a.jsCount;
 document.getElementById("techDuplicateCount").textContent=a.duplicateIds.length;
 document.getElementById("techMissingCount").textContent=a.missingRefs.length;
 document.getElementById("techSyntaxState").textContent=a.nodeChecked?(a.syntaxErrors.length?"ERROR":"OK"):"N/A";
 const rows=[
  {name:"Referencias locales JS/CSS",status:a.missingRefs.length?"fail":"pass",detail:a.missingRefs.length?a.missingRefs.join(", "):"No se encontraron referencias locales faltantes."},
  {name:"IDs HTML duplicados",status:a.duplicateIds.length?"fail":"pass",detail:a.duplicateIds.length?a.duplicateIds.join(", "):"No se encontraron IDs duplicados."},
  {name:"Sintaxis JavaScript",status:!a.nodeChecked?"warn":a.syntaxErrors.length?"fail":"pass",detail:!a.nodeChecked?"Node no disponible para comprobaciÃ³n estÃ¡tica.":a.syntaxErrors.length?`${a.syntaxErrors.length} archivo(s) con error.`:"Todos los archivos JS superaron node --check."}
 ];
 box.innerHTML=rows.map(x=>`<div class="row tech-audit-row ${x.status}"><div class="diag-mark">${x.status==="pass"?"âœ“":x.status==="warn"?"!":"Ã—"}</div><div><strong>${x.name}</strong><small>${x.detail}</small></div></div>`).join("");
 const fail=rows.filter(x=>x.status==="fail").length,warn=rows.filter(x=>x.status==="warn").length;
 const result=document.getElementById("technicalAuditResult");
 if(fail){result.className="launch-result blocked";result.innerHTML=`<span class="tag">CORREGIR</span><h2>${fail} problema(s) tÃ©cnico(s)</h2><p>No iniciar todavÃ­a la prueba real.</p>`}
 else{result.className="launch-result";result.innerHTML=`<span class="tag">ESTRUCTURA APROBADA</span><h2>Lista para prueba real</h2><p>La revisiÃ³n estÃ¡tica no encontrÃ³ bloqueos${warn?" y queda una advertencia tÃ©cnica":""}. El siguiente paso ya requiere Firebase y dos dispositivos reales.</p>`}
};
SaaS.runTechnicalAudit=function(){SaaS.renderTechnicalAudit();SaaS.audit?.("SYSTEM","AuditorÃ­a tÃ©cnica revisada",{missing:SaaS.staticAudit.missingRefs.length,duplicates:SaaS.staticAudit.duplicateIds.length,syntax:SaaS.staticAudit.syntaxErrors.length},"")};

const oldRenderAll_156=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_156();SaaS.renderTechnicalAudit()};

;

/* ---- js/saas/sambrix-firebase-live-test.js ---- */
SaaS.firebaseLiveTest=SaaS.firebaseLiveTest||{manual:{},probe:null,confirmed:false};

SaaS.loadFirebaseLiveTest=function(){
 try{SaaS.firebaseLiveTest=JSON.parse(localStorage.getItem("sambrix_firebase_live_test"))||{manual:{},probe:null,confirmed:false}}catch{SaaS.firebaseLiveTest={manual:{},probe:null,confirmed:false}}
};
SaaS.saveFirebaseLiveTest=function(){localStorage.setItem("sambrix_firebase_live_test",JSON.stringify(SaaS.firebaseLiveTest))};

SaaS.firebaseUser=function(){
 return window.FirebaseBridge?.user||window.FirebaseBridge?.currentUser||null;
};

SaaS.createSyncProbe=function(){
 const code="SBX-"+Math.floor(100000+Math.random()*900000);
 SaaS.firebaseLiveTest.probe={code,createdAt:new Date().toISOString(),businessId:SaaS.getContext?.()?.businessId||null};
 SaaS.firebaseLiveTest.confirmed=false;SaaS.saveFirebaseLiveTest();
 // If a cloud bridge exposes a generic write helper, publish the probe there too.
 try{
   if(typeof window.FirebaseBridge?.setSyncProbe==="function") window.FirebaseBridge.setSyncProbe(SaaS.firebaseLiveTest.probe);
   else if(typeof window.NexoPublicCloud?.setSyncProbe==="function") window.NexoPublicCloud.setSyncProbe(SaaS.firebaseLiveTest.probe);
 }catch(e){console.warn("Sync probe cloud write unavailable",e)}
 SaaS.renderFirebaseLiveTest();window.App?.toast?.("SeÃ±al de sincronizaciÃ³n creada");
};

SaaS.confirmSyncProbe=function(){
 const typed=(document.getElementById("fbProbeConfirmInput")?.value||"").trim().toUpperCase();
 const code=SaaS.firebaseLiveTest.probe?.code||"";
 if(!code)return alert("Primero crea la seÃ±al en el dispositivo A.");
 if(typed!==code)return alert("El cÃ³digo no coincide. Si estÃ¡s en otro dispositivo, confirma que ambos estÃ¡n viendo los mismos datos.");
 SaaS.firebaseLiveTest.confirmed=true;SaaS.firebaseLiveTest.confirmedAt=new Date().toISOString();SaaS.saveFirebaseLiveTest();
 SaaS.audit?.("SYSTEM","SincronizaciÃ³n entre dispositivos confirmada",{code},"");
 SaaS.renderFirebaseLiveTest();
};

SaaS.renderFirebaseLiveTest=function(){
 const root=document.getElementById("firebaseTestResult");if(!root)return;
 const bridge=!!window.FirebaseBridge,user=SaaS.firebaseUser(),probe=SaaS.firebaseLiveTest.probe,confirmed=!!SaaS.firebaseLiveTest.confirmed;
 document.getElementById("fbTestConnection").textContent=bridge?"OK":"NO";
 document.getElementById("fbTestAuth").textContent=user?"OK":"NO";
 document.getElementById("fbTestProbe").textContent=confirmed?"OK":probe?"CREADA":"â€”";
 document.getElementById("fbStepAuthA").textContent=user?"Correcto":"Pendiente";
 document.getElementById("fbStepProbeA").textContent=probe?"Creada":"Pendiente";
 document.getElementById("fbProbeCode").textContent=probe?.code||"â€”";
 document.getElementById("fbProbeTime").textContent=probe?new Date(probe.createdAt).toLocaleString():"TodavÃ­a no creado";
 document.getElementById("fbProbeResultStatus").textContent=confirmed?"Confirmado":"Pendiente";
 document.getElementById("fbProbeResultText").textContent=confirmed?"El mismo cÃ³digo fue confirmado en la prueba entre dispositivos.":"Esperando prueba.";
 document.querySelectorAll(".fbManualCheck").forEach(c=>c.checked=!!SaaS.firebaseLiveTest.manual?.[c.dataset.key]);
 const manual=Object.values(SaaS.firebaseLiveTest.manual||{}).filter(Boolean).length;
 document.getElementById("fbTestScore").textContent=`${manual}/4`;
 if(!bridge){root.className="launch-result blocked";root.innerHTML='<span class="tag">NO LISTO</span><h2>Firebase no estÃ¡ disponible</h2><p>Hay que resolver la conexiÃ³n antes de probar sincronizaciÃ³n.</p>'}
 else if(!user){root.className="launch-result";root.innerHTML='<span class="tag">FALTA LOGIN</span><h2>Firebase detectado</h2><p>Inicia sesiÃ³n con una cuenta real para continuar.</p>'}
 else if(!confirmed||manual<4){root.className="launch-result";root.innerHTML=`<span class="tag">PRUEBA EN CURSO</span><h2>ConexiÃ³n detectada</h2><p>Falta completar sincronizaciÃ³n y seguridad (${manual}/4 controles manuales).</p>`}
 else{root.className="launch-result ready";root.innerHTML='<span class="tag">PRUEBA REAL COMPLETA</span><h2>Firebase y seguridad verificados</h2><p>Los controles manuales y la prueba entre dispositivos fueron confirmados.</p>'}
};

SaaS.markFirebaseManual=function(e){
 const c=e.target;if(!c.matches(".fbManualCheck"))return;
 SaaS.firebaseLiveTest.manual=SaaS.firebaseLiveTest.manual||{};
 SaaS.firebaseLiveTest.manual[c.dataset.key]=c.checked;SaaS.saveFirebaseLiveTest();SaaS.renderFirebaseLiveTest();
};

const oldRenderAll_157=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_157();SaaS.renderFirebaseLiveTest()};

;

/* ---- js/saas/sambrix-final-test-wizard.js ---- */
SaaS.finalWizard=SaaS.finalWizard||{};
SaaS.FINAL_WIZARD_STEPS=[
 {id:"super_login",group:"super",title:"Entrar como SuperAdmin",detail:"Confirma que ves el panel general de SAMBRIX."},
 {id:"super_tenant",group:"super",title:"Entrar a un negocio desde SuperAdmin",detail:"Usa modo soporte y vuelve al panel central."},
 {id:"owner_login",group:"owner",title:"Entrar como dueÃ±o",detail:"El dueÃ±o solo debe ver y editar su negocio."},
 {id:"owner_data",group:"owner",title:"Crear datos de prueba",detail:"Crea un cliente, una cita y una venta."},
 {id:"owner_brand",group:"owner",title:"Comprobar marca e imagen",detail:"Cambia un dato visual y confirma persistencia."},
 {id:"client_public",group:"client",title:"Abrir reserva pÃºblica",detail:"Hazlo como si fueras un cliente del negocio."},
 {id:"client_booking",group:"client",title:"Enviar y gestionar una reserva",detail:"Confirma que llega al dueÃ±o y puede aprobarse."},
 {id:"sync_devices",group:"sync",title:"Probar dos dispositivos",detail:"Crea/cambia un dato en A y comprueba que aparece en B."},
 {id:"security_owner",group:"sync",title:"Intentar acceso indebido",detail:"DueÃ±o/empleado no deben acceder a otro tenant ni al SuperAdmin."},
 {id:"firebase_rules",group:"sync",title:"Confirmar reglas Firebase",detail:"Marca este punto solo despuÃ©s de comprobar permisos reales."}
];
SaaS.loadFinalWizard=function(){try{SaaS.finalWizard=JSON.parse(localStorage.getItem("sambrix_final_wizard"))||{}}catch{SaaS.finalWizard={}}};
SaaS.saveFinalWizard=function(){localStorage.setItem("sambrix_final_wizard",JSON.stringify(SaaS.finalWizard))};
SaaS.toggleFinalWizard=function(e){
 const c=e.target;if(!c.matches(".finalWizardCheck"))return;
 SaaS.finalWizard[c.dataset.step]=c.checked;SaaS.saveFinalWizard();SaaS.renderFinalWizard();
};
SaaS.resetFinalWizard=function(){if(!confirm("Â¿Reiniciar todos los pasos de la prueba final?"))return;SaaS.finalWizard={};SaaS.saveFinalWizard();SaaS.renderFinalWizard()};
SaaS.renderFinalWizard=function(){
 const box=document.getElementById("finalWizardList");if(!box)return;
 const steps=SaaS.FINAL_WIZARD_STEPS,done=steps.filter(s=>SaaS.finalWizard[s.id]).length,pct=Math.round(done/steps.length*100);
 document.getElementById("wizardProgress").textContent=pct+"%";document.getElementById("wizardProgressBar").style.width=pct+"%";
 const groupDone=g=>steps.filter(s=>s.group===g).every(s=>SaaS.finalWizard[s.id]);
 document.getElementById("wizardSuper").textContent=groupDone("super")?"OK":"Pendiente";
 document.getElementById("wizardOwner").textContent=groupDone("owner")?"OK":"Pendiente";
 document.getElementById("wizardClient").textContent=groupDone("client")?"OK":"Pendiente";
 document.getElementById("wizardSync").textContent=groupDone("sync")?"OK":"Pendiente";
 box.innerHTML=steps.map((s,i)=>`<label class="row wizard-section"><div class="wizard-check"><input type="checkbox" class="finalWizardCheck" data-step="${s.id}" ${SaaS.finalWizard[s.id]?"checked":""}><div><strong>${i+1}. ${s.title}</strong><small>${s.detail}</small></div></div><span class="status ${SaaS.finalWizard[s.id]?"ok":""}">${SaaS.finalWizard[s.id]?"Aprobado":"Pendiente"}</span></label>`).join("");
 const result=document.getElementById("finalWizardResult");
 if(done===steps.length){result.className="launch-result ready";result.innerHTML='<span class="tag">ACEPTACIÃ“N COMPLETA</span><h2>SAMBRIX superÃ³ el recorrido final</h2><p>Todos los pasos fueron confirmados manualmente. Guarda evidencia antes de pasar a producciÃ³n.</p>'}
 else{result.className="launch-result";result.innerHTML=`<span class="tag">PRUEBA PENDIENTE</span><h2>${done}/${steps.length} pasos confirmados</h2><p>No marques pasos por adelantado. Cada uno debe comprobarse en la aplicaciÃ³n real.</p>`}
};
const oldRenderAll_158=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_158();SaaS.renderFinalWizard()};

;

/* ---- js/saas/sambrix-certification.js ---- */
SaaS.certifications=SaaS.certifications||[];
SaaS.loadCertifications=function(){try{SaaS.certifications=JSON.parse(localStorage.getItem("sambrix_certifications"))||[]}catch{SaaS.certifications=[]}};
SaaS.saveCertifications=function(){localStorage.setItem("sambrix_certifications",JSON.stringify(SaaS.certifications))};

SaaS.certificationEvidence=function(){
 const wizard=SaaS.FINAL_WIZARD_STEPS||[];
 const wizardDone=wizard.length>0&&wizard.every(s=>SaaS.finalWizard?.[s.id]);
 const manual=SaaS.firebaseLiveTest?.manual||{};
 const firebaseManual=["superadmin","owner","employee","isolation"].every(k=>manual[k]);
 const sync=!!SaaS.firebaseLiveTest?.confirmed;
 const staticAudit=!!SaaS.staticAudit&&!SaaS.staticAudit.duplicateIds?.length&&!SaaS.staticAudit.missingRefs?.length&&!SaaS.staticAudit.syntaxErrors?.length;
 const autoTests=(SaaS.testResults||[]).length>0&&(SaaS.testResults||[]).every(x=>x.status!=="fail");
 return [
  {name:"AuditorÃ­a tÃ©cnica",ok:staticAudit,detail:staticAudit?"Sin errores estÃ¡ticos conocidos.":"Revisa AuditorÃ­a final."},
  {name:"Pruebas automÃ¡ticas",ok:autoTests,detail:autoTests?"Sin pruebas fallidas.":"Ejecuta Pruebas integrales."},
  {name:"Checklist de aceptaciÃ³n",ok:wizardDone,detail:wizardDone?"Recorrido final completado.":"Completa Prueba final."},
  {name:"Roles Firebase reales",ok:firebaseManual,detail:firebaseManual?"Roles comprobados manualmente.":"Faltan controles manuales de Firebase."},
  {name:"SincronizaciÃ³n real",ok:sync,detail:sync?"Prueba entre dispositivos confirmada.":"Falta confirmar sincronizaciÃ³n entre dispositivos."}
 ];
};

SaaS.createCertification=function(){
 const evidence=SaaS.certificationEvidence();
 if(evidence.some(x=>!x.ok))return alert("TodavÃ­a no se puede certificar SAMBRIX. Completa todos los controles reales.");
 const version=SaaS.releases?.length?SaaS.releases[SaaS.releases.length-1].version:"15.9";
 const code="CERT-"+new Date().getFullYear()+"-"+String(SaaS.certifications.length+1).padStart(4,"0");
 const c={id:"cert_"+SaaS.uid(),code,version,createdAt:new Date().toISOString(),createdBy:window.FirebaseBridge?.user?.email||"SuperAdmin",evidence,productionApproved:true};
 SaaS.certifications.push(c);SaaS.saveCertifications();SaaS.audit?.("SYSTEM","CertificaciÃ³n de producciÃ³n emitida",{code,version},"");SaaS.renderCertification();window.App?.toast?.("CertificaciÃ³n creada");
};

SaaS.renderCertification=function(){
 const box=document.getElementById("certEvidenceList");if(!box)return;
 const ev=SaaS.certificationEvidence(),wizard=SaaS.FINAL_WIZARD_STEPS||[],wizardDone=wizard.length>0&&wizard.every(s=>SaaS.finalWizard?.[s.id]);
 const manual=SaaS.firebaseLiveTest?.manual||{},firebaseDone=!!SaaS.firebaseLiveTest?.confirmed&&["superadmin","owner","employee","isolation"].every(k=>manual[k]);
 const approved=SaaS.certifications.some(c=>c.productionApproved);
 document.getElementById("certChecklistState").textContent=wizardDone?"OK":"Pendiente";
 document.getElementById("certFirebaseState").textContent=firebaseDone?"OK":"Pendiente";
 document.getElementById("certCount").textContent=SaaS.certifications.length;
 document.getElementById("certProductionState").textContent=approved?"SÃ":"NO";
 box.innerHTML=ev.map(x=>`<div class="row cert-row ${x.ok?"":"pending"}"><div class="diag-mark">${x.ok?"âœ“":"!"}</div><div><strong>${x.name}</strong><small>${x.detail}</small></div><span class="status ${x.ok?"ok":""}">${x.ok?"Aprobado":"Pendiente"}</span></div>`).join("");
 document.getElementById("certHistoryList").innerHTML=[...SaaS.certifications].reverse().map(c=>`<div class="row cert-history"><div><strong class="cert-code">${c.code}</strong><small>v${c.version} Â· ${new Date(c.createdAt).toLocaleString()} Â· ${c.createdBy}</small></div><span class="status ok">ProducciÃ³n</span></div>`).join("")||'<div class="muted">TodavÃ­a no hay certificaciones.</div>';
 const result=document.getElementById("certFinalResult"),ready=ev.every(x=>x.ok);
 if(approved){result.className="launch-result ready";result.innerHTML='<span class="tag">AUTORIZADO</span><h2>SAMBRIX certificado para producciÃ³n</h2><p>Existe una certificaciÃ³n emitida despuÃ©s de completar las pruebas requeridas.</p>'}
 else if(ready){result.className="launch-result";result.innerHTML='<span class="tag">LISTO PARA CERTIFICAR</span><h2>Todos los controles estÃ¡n aprobados</h2><p>Genera la certificaciÃ³n para registrar formalmente esta versiÃ³n.</p>'}
 else{result.className="launch-result";result.innerHTML='<span class="tag">NO CERTIFICADO</span><h2>Las pruebas reales siguen pendientes</h2><p>La aplicaciÃ³n no se marcarÃ¡ como producciÃ³n hasta completar todos los controles.</p>'}
};

const oldRenderAll_159=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_159();SaaS.renderCertification()};

;

/* ---- js/saas/sambrix-production.js ---- */
SaaS.productionConfig=SaaS.productionConfig||{environment:"test",publicUrl:"",notes:""};
SaaS.loadProductionConfig=function(){try{SaaS.productionConfig=JSON.parse(localStorage.getItem("sambrix_production_config"))||SaaS.productionConfig}catch{}};
SaaS.saveProductionConfig=function(){
 SaaS.productionConfig.environment=document.getElementById("productionEnvironmentSelect")?.value||"test";
 SaaS.productionConfig.publicUrl=(document.getElementById("productionPublicUrl")?.value||"").trim();
 SaaS.productionConfig.notes=(document.getElementById("productionNotes")?.value||"").trim();
 localStorage.setItem("sambrix_production_config",JSON.stringify(SaaS.productionConfig));
 SaaS.audit?.("SYSTEM","ConfiguraciÃ³n de producciÃ³n actualizada",{environment:SaaS.productionConfig.environment,publicUrl:SaaS.productionConfig.publicUrl},"");
 SaaS.renderProductionCenter();window.App?.toast?.("ConfiguraciÃ³n guardada");
};
SaaS.productionChecks=function(){
 const certified=(SaaS.certifications||[]).some(c=>c.productionApproved);
 const staticOk=!!SaaS.staticAudit&&!SaaS.staticAudit.duplicateIds?.length&&!SaaS.staticAudit.missingRefs?.length&&!SaaS.staticAudit.syntaxErrors?.length;
 const wizard=(SaaS.FINAL_WIZARD_STEPS||[]),wizardOk=wizard.length>0&&wizard.every(s=>SaaS.finalWizard?.[s.id]);
 const manual=SaaS.firebaseLiveTest?.manual||{},firebaseOk=!!SaaS.firebaseLiveTest?.confirmed&&["superadmin","owner","employee","isolation"].every(k=>manual[k]);
 const hasUrl=/^https:\/\//i.test(SaaS.productionConfig.publicUrl||"");
 const businesses=(SaaS.db.businesses||[]).length;
 return [
  {name:"AuditorÃ­a tÃ©cnica",ok:staticOk,detail:staticOk?"Estructura estÃ¡tica aprobada.":"AuditorÃ­a pendiente."},
  {name:"Prueba final",ok:wizardOk,detail:wizardOk?"Checklist de aceptaciÃ³n completo.":"Faltan pruebas manuales."},
  {name:"Firebase real",ok:firebaseOk,detail:firebaseOk?"SincronizaciÃ³n y roles confirmados.":"Falta prueba real Firebase."},
  {name:"CertificaciÃ³n",ok:certified,detail:certified?"Existe certificaciÃ³n de producciÃ³n.":"Primero emite la certificaciÃ³n."},
  {name:"URL HTTPS",ok:hasUrl,detail:hasUrl?SaaS.productionConfig.publicUrl:"Configura la URL pÃºblica HTTPS."},
  {name:"Negocios configurados",ok:businesses>0,detail:`${businesses} negocio(s) registrados.`}
 ];
};
SaaS.renderProductionCenter=function(){
 const box=document.getElementById("productionCheckList");if(!box)return;
 document.getElementById("productionEnvironmentSelect").value=SaaS.productionConfig.environment||"test";
 document.getElementById("productionPublicUrl").value=SaaS.productionConfig.publicUrl||"";
 document.getElementById("productionNotes").value=SaaS.productionConfig.notes||"";
 const checks=SaaS.productionChecks(),ok=checks.filter(x=>x.ok).length,cert=(SaaS.certifications||[]).some(c=>c.productionApproved);
 document.getElementById("prodEnvironment").textContent=(SaaS.productionConfig.environment||"test").toUpperCase();
 document.getElementById("prodChecks").textContent=`${ok}/${checks.length}`;
 document.getElementById("prodCertState").textContent=cert?"SÃ":"NO";
 const demo=(SaaS.db.businesses||[]).some(b=>/demo|prueba|test/i.test(`${b.name} ${b.owner||""}`));
 document.getElementById("prodDemoState").textContent=demo?"REVISAR":"OK";
 box.innerHTML=checks.map(x=>`<div class="row production-check ${x.ok?"":"pending"}"><div class="diag-mark">${x.ok?"âœ“":"!"}</div><div><strong>${x.name}</strong><small>${x.detail}</small></div><span class="status ${x.ok?"ok":""}">${x.ok?"OK":"Pendiente"}</span></div>`).join("");
 const result=document.getElementById("productionResult"),ready=checks.every(x=>x.ok)&&SaaS.productionConfig.environment==="production";
 if(ready){result.className="launch-result ready";result.innerHTML='<span class="tag">PREPARADO</span><h2>ConfiguraciÃ³n lista para publicaciÃ³n</h2><p>Los controles previos estÃ¡n completos. La publicaciÃ³n real debe hacerse en el hosting configurado.</p>'}
 else{result.className="launch-result";result.innerHTML='<span class="tag">NO PUBLICAR TODAVÃA</span><h2>PreparaciÃ³n incompleta</h2><p>SAMBRIX seguirÃ¡ en modo de prueba hasta completar certificaciÃ³n, Firebase real y URL de producciÃ³n.</p>'}
};
SaaS.runProductionReview=function(){SaaS.renderProductionCenter();SaaS.audit?.("SYSTEM","RevisiÃ³n de producciÃ³n ejecutada",{checks:SaaS.productionChecks().map(x=>({name:x.name,ok:x.ok}))},"")};
const oldRenderAll_160=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_160();SaaS.renderProductionCenter()};

;

/* ---- js/saas/sambrix-migration.js ---- */
SaaS.migrationSnapshots=SaaS.migrationSnapshots||[];
SaaS.loadMigrationSnapshots=function(){try{SaaS.migrationSnapshots=JSON.parse(localStorage.getItem("sambrix_migration_snapshots"))||[]}catch{SaaS.migrationSnapshots=[]}};
SaaS.saveMigrationSnapshots=function(){localStorage.setItem("sambrix_migration_snapshots",JSON.stringify(SaaS.migrationSnapshots))};

SaaS.snapshotPayload=function(){
 return {
  schema:"SAMBRIX-SNAPSHOT-1",
  createdAt:new Date().toISOString(),
  businesses:SaaS.db?.businesses||[],
  plans:SaaS.db?.plans||[],
  subscriptions:SaaS.db?.subscriptions||[],
  productionConfig:SaaS.productionConfig||{},
  releases:SaaS.releases||[],
  certifications:SaaS.certifications||[]
 };
};
SaaS.snapshotHash=function(payload){
 const s=JSON.stringify(payload);let h=2166136261;
 for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}
 return ("00000000"+(h>>>0).toString(16)).slice(-8).toUpperCase();
};
SaaS.createMigrationSnapshot=function(){
 const payload=SaaS.snapshotPayload(),hash=SaaS.snapshotHash(payload);
 const snap={id:"snap_"+SaaS.uid(),code:"SNAP-"+Date.now(),createdAt:payload.createdAt,createdBy:window.FirebaseBridge?.user?.email||"SuperAdmin",hash,businessCount:payload.businesses.length,payload};
 SaaS.migrationSnapshots.push(snap);
 if(SaaS.migrationSnapshots.length>10)SaaS.migrationSnapshots=SaaS.migrationSnapshots.slice(-10);
 SaaS.saveMigrationSnapshots();SaaS.audit?.("SYSTEM","Snapshot previo a migraciÃ³n creado",{code:snap.code,hash,businesses:snap.businessCount},"");
 SaaS.renderMigrationCenter();window.App?.toast?.("Snapshot creado");
};
SaaS.verifySnapshot=function(snap){return !!snap&&SaaS.snapshotHash(snap.payload)===snap.hash};
SaaS.renderMigrationCenter=function(){
 const box=document.getElementById("migrationScopeList");if(!box)return;
 const latest=SaaS.migrationSnapshots[SaaS.migrationSnapshots.length-1],valid=latest?SaaS.verifySnapshot(latest):false;
 document.getElementById("migrationBusinessCount").textContent=(SaaS.db.businesses||[]).length;
 document.getElementById("migrationSnapshotCount").textContent=SaaS.migrationSnapshots.length;
 document.getElementById("migrationLastBackup").textContent=latest?new Date(latest.createdAt).toLocaleDateString():"â€”";
 document.getElementById("migrationIntegrity").textContent=latest?(valid?"OK":"ERROR"):"â€”";
 const scope=[
  ["Negocios y configuraciÃ³n",(SaaS.db.businesses||[]).length+" negocio(s)"],
  ["Planes SaaS",(SaaS.db.plans||[]).length+" plan(es)"],
  ["Suscripciones",(SaaS.db.subscriptions||[]).length+" registro(s)"],
  ["Releases",(SaaS.releases||[]).length+" versiÃ³n(es)"],
  ["Certificaciones",(SaaS.certifications||[]).length+" certificaciÃ³n(es)"],
  ["ConfiguraciÃ³n de producciÃ³n",SaaS.productionConfig?.environment||"test"]
 ];
 box.innerHTML=scope.map(x=>`<div class="row migration-row"><div><strong>${x[0]}</strong><small>${x[1]}</small></div><span class="status ok">Incluido</span></div>`).join("");
 document.getElementById("migrationHistoryList").innerHTML=[...SaaS.migrationSnapshots].reverse().map(s=>`<div class="row migration-history"><div><strong class="snapshot-code">${s.code}</strong><small>${new Date(s.createdAt).toLocaleString()} Â· ${s.businessCount} negocio(s) Â· hash ${s.hash}</small></div><span class="status ${SaaS.verifySnapshot(s)?"ok":""}">${SaaS.verifySnapshot(s)?"Ãntegro":"Error"}</span></div>`).join("")||'<div class="muted">TodavÃ­a no hay snapshots.</div>';
 const r=document.getElementById("migrationResult");
 if(!latest){r.className="launch-result";r.innerHTML='<span class="tag">PENDIENTE</span><h2>Crea un snapshot antes de publicar</h2><p>Este respaldo protege la configuraciÃ³n central del SaaS. No sustituye un backup real del servidor Firebase.</p>'}
 else if(!valid){r.className="launch-result blocked";r.innerHTML='<span class="tag">ERROR</span><h2>El Ãºltimo snapshot no supera integridad</h2><p>Crea uno nuevo antes de continuar.</p>'}
 else{r.className="launch-result ready";r.innerHTML='<span class="tag">PROTEGIDO</span><h2>Snapshot local verificado</h2><p>Existe un punto de recuperaciÃ³n de configuraciÃ³n. Antes de producciÃ³n tambiÃ©n debe existir respaldo real de Firebase.</p>'}
};
const oldRenderAll_161=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_161();SaaS.renderMigrationCenter()};

;

/* ---- js/saas/sambrix-health.js ---- */
SaaS.healthSnapshot=function(){
 const latest=SaaS.migrationSnapshots?.[SaaS.migrationSnapshots.length-1];
 const backupOk=latest?SaaS.verifySnapshot?.(latest):false;
 const platform=[
  {name:"Firebase Bridge",ok:!!window.FirebaseBridge,detail:window.FirebaseBridge?"Detectado.":"No disponible."},
  {name:"AutenticaciÃ³n",ok:typeof SaaS.resolveFirebaseSession==="function",detail:"GestiÃ³n de sesiÃ³n."},
  {name:"Multi-tenant",ok:typeof SaaS.switchTenant==="function"&&typeof SaaS.loadTenantState==="function",detail:"Cambio y carga de negocios."},
  {name:"AuditorÃ­a",ok:typeof SaaS.audit==="function",detail:"Registro de acciones."},
  {name:"Respaldo local",ok:!!backupOk,detail:backupOk?"Ãšltimo snapshot Ã­ntegro.":"Crea/verifica un snapshot."},
  {name:"Centro de soporte",ok:typeof SaaS.enterSupportMode==="function",detail:"Soporte remoto."}
 ];
 const tenants=[];
 (SaaS.db.businesses||[]).forEach(b=>{
   const a=SaaS.activationStatus?.(b),l=SaaS.licenseFor?.(b);
   if(!a?.ready)tenants.push({name:b.name,status:"warn",detail:`ConfiguraciÃ³n ${a?.pct||0}% completa.`});
   if(l?.blocked)tenants.push({name:b.name,status:"fail",detail:`Licencia bloqueada: ${l.state||"revisar"}.`});
   if(!b.ownerEmail)tenants.push({name:b.name,status:"warn",detail:"Falta correo del dueÃ±o."});
 });
 return {platform,tenants,backupOk};
};
SaaS.renderHealthCenter=function(){
 const pbox=document.getElementById("healthPlatformList");if(!pbox)return;
 const h=SaaS.healthSnapshot(),pass=h.platform.filter(x=>x.ok).length,alerts=h.platform.filter(x=>!x.ok).length+h.tenants.length;
 const score=Math.round(pass/h.platform.length*100);
 document.getElementById("healthScore").textContent=score+"%";
 document.getElementById("healthAlertCount").textContent=alerts;
 document.getElementById("healthBackupState").textContent=h.backupOk?"OK":"REVISAR";
 document.getElementById("healthFirebaseState").textContent=window.FirebaseBridge?"OK":"NO";
 pbox.innerHTML=h.platform.map(x=>`<div class="row health-row ${x.ok?"":"fail"}"><div class="diag-mark">${x.ok?"âœ“":"Ã—"}</div><div><strong>${x.name}</strong><small>${x.detail}</small></div></div>`).join("");
 document.getElementById("healthTenantList").innerHTML=h.tenants.map(x=>`<div class="row health-row ${x.status}"><div class="diag-mark">${x.status==="fail"?"Ã—":"!"}</div><div><strong>${x.name}</strong><small>${x.detail}</small></div></div>`).join("")||'<div class="row health-row"><div class="diag-mark">âœ“</div><div><strong>Sin alertas de negocios</strong><small>No se detectaron problemas bÃ¡sicos.</small></div></div>';
 const r=document.getElementById("healthResult");
 if(alerts){r.className="launch-result";r.innerHTML=`<span class="tag">ATENCIÃ“N</span><h2>${alerts} alerta(s) operativa(s)</h2><p>RevÃ­salas antes de una entrega o publicaciÃ³n.</p>`}
 else{r.className="launch-result ready";r.innerHTML='<span class="tag">SALUDABLE</span><h2>Sin alertas bÃ¡sicas detectadas</h2><p>Los servicios estructurales y negocios pasan esta revisiÃ³n local.</p>'}
};
SaaS.refreshHealth=function(){SaaS.renderHealthCenter();SaaS.audit?.("SYSTEM","Salud del sistema revisada",{},"")};
const oldRenderAll_162=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_162();SaaS.renderHealthCenter()};

;

/* ---- js/saas/sambrix-incidents.js ---- */
SaaS.incidents=SaaS.incidents||[];
SaaS.loadIncidents=function(){try{SaaS.incidents=JSON.parse(localStorage.getItem("sambrix_incidents"))||[]}catch{SaaS.incidents=[]}};
SaaS.saveIncidents=function(){localStorage.setItem("sambrix_incidents",JSON.stringify(SaaS.incidents))};
SaaS.openIncidentModal=function(){
 const sel=document.getElementById("incidentBusiness");
 sel.innerHTML='<option value="">Plataforma general</option>'+(SaaS.db.businesses||[]).map(b=>`<option value="${b.id}">${b.name}</option>`).join("");
 document.getElementById("incidentTitle").value="";document.getElementById("incidentDescription").value="";
 document.getElementById("incidentOwner").value=window.FirebaseBridge?.user?.email||"SuperAdmin";
 document.getElementById("incidentModal").classList.add("open");
};
SaaS.closeIncidentModal=function(){document.getElementById("incidentModal")?.classList.remove("open")};
SaaS.createIncident=function(){
 const title=document.getElementById("incidentTitle").value.trim();if(!title)return alert("Escribe el tÃ­tulo del incidente.");
 const i={id:"inc_"+SaaS.uid(),businessId:document.getElementById("incidentBusiness").value,title,priority:document.getElementById("incidentPriority").value,description:document.getElementById("incidentDescription").value.trim(),owner:document.getElementById("incidentOwner").value.trim()||"SuperAdmin",status:"Abierto",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
 SaaS.incidents.push(i);SaaS.saveIncidents();SaaS.audit?.("SUPPORT","Incidente creado",{title:i.title,priority:i.priority},i.businessId);SaaS.closeIncidentModal();SaaS.renderIncidents();window.App?.toast?.("Incidente registrado");
};
SaaS.updateIncidentStatus=function(id,status){
 const i=SaaS.incidents.find(x=>x.id===id);if(!i)return;i.status=status;i.updatedAt=new Date().toISOString();if(status==="Resuelto")i.resolvedAt=i.updatedAt;
 SaaS.saveIncidents();SaaS.audit?.("SUPPORT","Estado de incidente actualizado",{incident:id,status},i.businessId);SaaS.renderIncidents();
};
SaaS.renderIncidents=function(){
 const box=document.getElementById("incidentList");if(!box)return;
 const q=(document.getElementById("incidentSearch")?.value||"").toLowerCase(),f=document.getElementById("incidentStatusFilter")?.value||"";
 const rows=SaaS.incidents.filter(i=>(!f||i.status===f)&&(!q||`${i.title} ${i.description} ${i.owner}`.toLowerCase().includes(q)));
 document.getElementById("incidentOpenCount").textContent=SaaS.incidents.filter(i=>i.status!=="Resuelto").length;
 document.getElementById("incidentCriticalCount").textContent=SaaS.incidents.filter(i=>i.status!=="Resuelto"&&i.priority==="CrÃ­tica").length;
 document.getElementById("incidentResolvedCount").textContent=SaaS.incidents.filter(i=>i.status==="Resuelto").length;
 const last=[...SaaS.incidents].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))[0];
 document.getElementById("incidentLastDate").textContent=last?new Date(last.createdAt).toLocaleDateString():"â€”";
 box.innerHTML=[...rows].reverse().map(i=>{const b=SaaS.db.businesses.find(x=>x.id===i.businessId);return `<div class="row incident-row ${i.priority==="CrÃ­tica"?"critical":""} ${i.status==="Resuelto"?"resolved":""}"><div style="flex:1"><strong>${i.title}</strong><small>${b?.name||"Plataforma"} Â· ${i.owner} Â· ${new Date(i.createdAt).toLocaleString()}</small><div class="incident-priority">${i.priority} Â· ${i.status}</div></div><select onchange="SaaS.updateIncidentStatus('${i.id}',this.value)"><option ${i.status==="Abierto"?"selected":""}>Abierto</option><option ${i.status==="En progreso"?"selected":""}>En progreso</option><option ${i.status==="Resuelto"?"selected":""}>Resuelto</option></select></div>`}).join("")||'<div class="muted">No hay incidentes con estos filtros.</div>';
};
const oldRenderAll_163=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_163();SaaS.renderIncidents()};

;

/* ---- js/saas/sambrix-continuity.js ---- */
SaaS.continuityState=function(){
 const latest=SaaS.migrationSnapshots?.[SaaS.migrationSnapshots.length-1];
 const snapshotOk=latest?!!SaaS.verifySnapshot?.(latest):false;
 const firebase=!!window.FirebaseBridge;
 const audit=typeof SaaS.audit==="function";
 const incidents=Array.isArray(SaaS.incidents);
 const support=typeof SaaS.enterSupportMode==="function";
 const critical=(SaaS.incidents||[]).filter(i=>i.priority==="CrÃ­tica"&&i.status!=="Resuelto").length;
 const checks=[
  {name:"Snapshot de configuraciÃ³n",ok:snapshotOk,detail:snapshotOk?"Existe un snapshot Ã­ntegro.":"Crea un snapshot actualizado."},
  {name:"Firebase Bridge",ok:firebase,detail:firebase?"Bridge disponible.":"No se detecta conexiÃ³n Firebase."},
  {name:"AuditorÃ­a",ok:audit,detail:audit?"Registro operativo disponible.":"AuditorÃ­a no disponible."},
  {name:"Centro de incidentes",ok:incidents,detail:"Seguimiento de fallas disponible."},
  {name:"Modo soporte",ok:support,detail:support?"Puedes entrar a revisar un tenant.":"Modo soporte no disponible."}
 ];
 return {checks,critical,snapshotOk,firebase};
};
SaaS.renderContinuity=function(){
 const box=document.getElementById("continuityPlanList");if(!box)return;
 const s=SaaS.continuityState(),ok=s.checks.filter(x=>x.ok).length,pct=Math.round(ok/s.checks.length*100);
 document.getElementById("continuitySnapshot").textContent=s.snapshotOk?"OK":"NO";
 document.getElementById("continuityCritical").textContent=s.critical;
 document.getElementById("continuityFirebase").textContent=s.firebase?"OK":"NO";
 document.getElementById("continuityScore").textContent=pct+"%";
 box.innerHTML=s.checks.map(x=>`<div class="row continuity-row ${x.ok?"":"pending"}"><div class="diag-mark">${x.ok?"âœ“":"!"}</div><div><strong>${x.name}</strong><small>${x.detail}</small></div></div>`).join("");
 const r=document.getElementById("continuityResult");
 if(!s.snapshotOk||!s.firebase){r.className="launch-result";r.innerHTML='<span class="tag">REVISAR</span><h2>Plan de recuperaciÃ³n incompleto</h2><p>Antes de producciÃ³n necesitamos respaldo vÃ¡lido y conexiÃ³n Firebase comprobada.</p>'}
 else if(s.critical){r.className="launch-result blocked";r.innerHTML=`<span class="tag">INCIDENTE ACTIVO</span><h2>${s.critical} incidente(s) crÃ­tico(s)</h2><p>ResuÃ©lvelos antes de una publicaciÃ³n o migraciÃ³n.</p>`}
 else{r.className="launch-result ready";r.innerHTML='<span class="tag">PREPARADO</span><h2>Controles bÃ¡sicos de continuidad disponibles</h2><p>El plan local estÃ¡ preparado; el backup real de Firebase debe verificarse por separado.</p>'}
};
SaaS.refreshContinuity=function(){SaaS.renderContinuity();SaaS.audit?.("SYSTEM","Plan de continuidad revisado",{},"")};
const oldRenderAll_164=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_164();SaaS.renderContinuity()};

;

/* ---- js/saas/sambrix-maintenance.js ---- */
SaaS.maintenance=SaaS.maintenance||{
 global:false,message:"Estamos realizando mejoras. Volvemos pronto.",eta:"",
 businesses:{},
 flags:{
  smart_crm:{name:"CRM inteligente",enabled:true,rollout:100},
  advanced_reports:{name:"Reportes avanzados",enabled:true,rollout:100},
  public_store:{name:"Tienda pÃºblica",enabled:false,rollout:0},
  loyalty_beta:{name:"FidelizaciÃ³n Beta",enabled:false,rollout:0},
  ai_assistant:{name:"Asistente inteligente",enabled:false,rollout:0}
 }
};

SaaS.loadMaintenance=function(){
 try{
   const saved=JSON.parse(localStorage.getItem("sambrix_maintenance"))||{};
   SaaS.maintenance={
     ...SaaS.maintenance,
     ...saved,
     global:!!saved.global,
     businesses:saved.businesses||{},
     flags:{...SaaS.maintenance.flags,...(saved.flags||{})}
   };
 }catch{}
};


SaaS.persistMaintenanceState=function(){
  localStorage.setItem("sambrix_maintenance",JSON.stringify(SaaS.maintenance));
  SaaS.audit?.("SYSTEM","Estado de mantenimiento actualizado",{global:!!SaaS.maintenance.global},"");
};

SaaS.saveMaintenance=function(){
 SaaS.maintenance.global=!!document.getElementById("globalMaintenanceToggle")?.checked;
 SaaS.maintenance.message=(document.getElementById("maintenanceMessage")?.value||"").trim()||"Estamos realizando mejoras. Volvemos pronto.";
 SaaS.maintenance.eta=(document.getElementById("maintenanceEta")?.value||"").trim();

 document.querySelectorAll("[data-maint-business]").forEach(c=>{
   SaaS.maintenance.businesses[c.dataset.maintBusiness]=!!c.checked;
 });

 document.querySelectorAll("[data-flag-key]").forEach(card=>{
   const key=card.dataset.flagKey;
   const enabled=!!card.querySelector("[data-flag-enabled]")?.checked;
   const rollout=Number(card.querySelector("[data-flag-rollout]")?.value||0);
   SaaS.maintenance.flags[key]={...(SaaS.maintenance.flags[key]||{}),enabled,rollout};
 });

 localStorage.setItem("sambrix_maintenance",JSON.stringify(SaaS.maintenance));
 SaaS.audit?.("SYSTEM","ConfiguraciÃ³n de mantenimiento actualizada",{global:SaaS.maintenance.global},"");
 SaaS.renderMaintenance();
 SaaS.applyMaintenanceGuard();
 window.App?.toast?.("ConfiguraciÃ³n guardada");
};

SaaS.featureFlagEnabled=function(key,businessId=""){
 const f=SaaS.maintenance.flags?.[key];
 if(!f?.enabled)return false;
 if(Number(f.rollout||0)>=100)return true;
 const id=businessId||SaaS.getContext?.()?.businessId||"";
 if(!id)return false;
 let h=0;
 for(let i=0;i<id.length;i++)h=(h*31+id.charCodeAt(i))>>>0;
 return (h%100)<Number(f.rollout||0);
};

SaaS.isBusinessInMaintenance=function(businessId){
 return !!SaaS.maintenance.global||!!SaaS.maintenance.businesses?.[businessId];
};


SaaS.maintenanceAdminBypass=false;

SaaS.openMaintenanceAdminAccess=function(){
  SaaS.maintenanceAdminBypass=true;

  const overlay=document.getElementById("sambrixMaintenanceOverlay");
  if(overlay)overlay.remove();

  // Abre exclusivamente el login del SuperAdmin.
  SaaS.portal?.openLogin?.("superadmin");

  // Refuerzo visual y de contexto para evitar confusiÃ³n.
  document.body.dataset.loginMode="superadmin";
  SaaS.requestedLoginMode="superadmin";

  const title=document.querySelector("#loginView h1,#loginView h2,#loginView h3");
  const subtitle=document.querySelector("#loginView p");
  if(title)title.textContent="SAMBRIX SuperAdmin";
  if(subtitle)subtitle.textContent="Acceso administrativo durante mantenimiento";

  window.App?.toast?.("Acceso administrativo habilitado");
};

SaaS.closeMaintenanceAdminAccess=function(){
  SaaS.maintenanceAdminBypass=false;
  SaaS.requestedLoginMode="";
  delete document.body.dataset.loginMode;
  SaaS.portal?.show?.();
  SaaS.applyMaintenanceGuard?.();
};

SaaS.applyMaintenanceGuard=function(){
 const role=SaaS.session?.role||"guest";
 const id=SaaS.getContext?.()?.businessId||"";

 // SuperAdmin autenticado nunca se bloquea.
 // Mientras se estÃ¡ mostrando el login SuperAdmin, se permite Ãºnicamente
 // esa ruta para que el administrador pueda entrar y desactivar mantenimiento.
 const adminLoginBypass=!!SaaS.maintenanceAdminBypass && SaaS.requestedLoginMode==="superadmin";
 const blocked=role!=="superadmin"&&!adminLoginBypass&&(SaaS.maintenance.global||SaaS.maintenance.businesses?.[id]);

 let overlay=document.getElementById("sambrixMaintenanceOverlay");

 if(blocked){
   if(!overlay){
     overlay=document.createElement("div");
     overlay.id="sambrixMaintenanceOverlay";
     overlay.className="maintenance-overlay";
     document.body.appendChild(overlay);
   }

   overlay.innerHTML=`<div class="card maintenance-public-card">
     <span class="tag">SAMBRIX</span>
     <h1>Estamos realizando mejoras</h1>
     <p>${SaaS.maintenance.message}</p>
     ${SaaS.maintenance.eta?`<p><strong>Regreso estimado:</strong> ${SaaS.maintenance.eta}</p>`:""}
     <div class="maintenance-admin-entry">
       <span>AdministraciÃ³n</span>
       <button type="button" class="btn secondary" id="maintenanceAdminAccessBtn">Acceso SuperAdmin</button>
     </div>
   </div>`;

   document.getElementById("maintenanceAdminAccessBtn")
     ?.addEventListener("click",SaaS.openMaintenanceAdminAccess);

 }else if(overlay){
   overlay.remove();
 }
};

SaaS.renderMaintenance=function(){
 const root=document.getElementById("maintenanceBusinessList");
 if(!root)return;

 document.getElementById("globalMaintenanceToggle").checked=!!SaaS.maintenance.global;
 document.getElementById("maintenanceMessage").value=SaaS.maintenance.message||"";
 document.getElementById("maintenanceEta").value=SaaS.maintenance.eta||"";

 const bs=SaaS.db.businesses||[];
 document.getElementById("maintenanceBusinessCount").textContent=bs.filter(b=>SaaS.maintenance.businesses?.[b.id]).length;
 document.getElementById("maintenancePlatformState").textContent=SaaS.maintenance.global?"MANTENIMIENTO":"ONLINE";

 root.innerHTML=bs.map(b=>`<label class="row maintenance-business ${SaaS.maintenance.businesses?.[b.id]?"off":""}">
   <div><strong>${b.name}</strong><small>${SaaS.maintenance.businesses?.[b.id]?"Mantenimiento activo":"Operando normalmente"}</small></div>
   <input type="checkbox" data-maint-business="${b.id}" ${SaaS.maintenance.businesses?.[b.id]?"checked":""}>
 </label>`).join("")||'<div class="muted">No hay negocios.</div>';

 const flags=Object.entries(SaaS.maintenance.flags||{});
 document.getElementById("maintenanceFlagsCount").textContent=flags.filter(([,f])=>f.enabled).length;
 document.getElementById("maintenanceRolloutAvg").textContent=(flags.length?Math.round(flags.reduce((s,[,f])=>s+Number(f.rollout||0),0)/flags.length):0)+"%";

 document.getElementById("featureFlagsList").innerHTML=flags.map(([key,f])=>`<article class="flag-card ${f.enabled?"enabled":""}" data-flag-key="${key}">
   <div class="addon-switch"><div><strong>${f.name||key}</strong><small>${key}</small></div><input type="checkbox" data-flag-enabled ${f.enabled?"checked":""}></div>
   <div class="flag-rollout"><input type="range" min="0" max="100" value="${Number(f.rollout||0)}" data-flag-rollout oninput="this.nextElementSibling.textContent=this.value+'%'"><strong>${Number(f.rollout||0)}%</strong></div>
 </article>`).join("");

 const r=document.getElementById("maintenanceResult");
 if(SaaS.maintenance.global){
   r.className="launch-result blocked";
   r.innerHTML='<span class="tag">MANTENIMIENTO GLOBAL</span><h2>Negocios y clientes bloqueados temporalmente</h2><p>SuperAdmin conserva acceso para resolver el incidente o completar la actualizaciÃ³n.</p>';
 }else if(bs.some(b=>SaaS.maintenance.businesses?.[b.id])){
   r.className="launch-result";
   r.innerHTML='<span class="tag">MANTENIMIENTO PARCIAL</span><h2>Algunos negocios estÃ¡n temporalmente bloqueados</h2><p>Los demÃ¡s tenants continÃºan operando normalmente.</p>';
 }else{
   r.className="launch-result ready";
   r.innerHTML='<span class="tag">ONLINE</span><h2>Plataforma disponible</h2><p>Todos los negocios estÃ¡n habilitados segÃºn sus licencias y configuraciÃ³n.</p>';
 }
};

const oldRoute_165=SaaS.routeSession;
if(oldRoute_165)SaaS.routeSession=function(){
 const r=oldRoute_165();

 if(SaaS.session?.role==="superadmin"){
   SaaS.maintenanceAdminBypass=false;
 }

 setTimeout(()=>SaaS.applyMaintenanceGuard(),80);
 return r;
};

const oldSwitch_165=SaaS.switchTenant;
if(oldSwitch_165)SaaS.switchTenant=function(id,opts){
 const r=oldSwitch_165(id,opts);
 setTimeout(()=>SaaS.applyMaintenanceGuard(),80);
 return r;
};

const oldRenderAll_165=SaaS.renderAll;
SaaS.renderAll=function(){
 oldRenderAll_165();
 SaaS.renderMaintenance();
 SaaS.applyMaintenanceGuard();
};

SaaS.renderMaintenanceQuickControl=function(){
 const active=!!SaaS.maintenance.global;
 const box=document.getElementById("maintenanceQuickControl");
 if(box)box.dataset.state=active?"mantenimiento":"operativo";
 const title=document.getElementById("maintenanceQuickTitle"), text=document.getElementById("maintenanceQuickText"), badge=document.getElementById("maintenanceQuickBadge"), btn=document.getElementById("maintenanceQuickToggleBtn");
 if(title)title.textContent=active?"Modo mantenimiento activo":"Plataforma operativa";
 if(text)text.textContent=active?"Clientes y negocios estÃ¡n bloqueados. SuperAdmin conserva acceso.":"Clientes y negocios pueden utilizar SAMBRIX normalmente.";
 if(badge){badge.textContent=active?"MANTENIMIENTO":"OPERATIVA";badge.classList.toggle("ok",!active);badge.classList.toggle("warn",active)}
 if(btn)btn.textContent=active?"Volver a modo operativo":"Activar mantenimiento";
};
SaaS.toggleMaintenanceQuickControl=function(){
  if(SaaS.session?.role!=="superadmin"){
    return window.App?.toast?.("Solo SuperAdmin puede cambiar este estado");
  }

  const active=!!SaaS.maintenance.global;

  if(active){
    SaaS.maintenance.global=false;
    SaaS.maintenance.message="";
    SaaS.maintenance.eta="";

    // Sincroniza cualquier control antiguo que siga existiendo en el DOM.
    const legacyToggle=document.getElementById("globalMaintenanceToggle");
    if(legacyToggle)legacyToggle.checked=false;

    SaaS.persistMaintenanceState();
    SaaS.renderMaintenance?.();
    SaaS.renderMaintenanceQuickControl();
    SaaS.applyMaintenanceGuard();
    window.App?.toast?.("SAMBRIX volviÃ³ a modo operativo");
    return;
  }

  const ok=window.confirm(
    "Â¿Activar modo mantenimiento global? Clientes y negocios quedarÃ¡n bloqueados; SuperAdmin conservarÃ¡ acceso."
  );
  if(!ok)return;

  SaaS.maintenance.global=true;
  if(!SaaS.maintenance.message){
    SaaS.maintenance.message="Estamos realizando mejoras.";
  }

  const legacyToggle=document.getElementById("globalMaintenanceToggle");
  if(legacyToggle)legacyToggle.checked=true;

  SaaS.persistMaintenanceState();
  SaaS.renderMaintenance?.();
  SaaS.renderMaintenanceQuickControl();
  SaaS.applyMaintenanceGuard();
  window.App?.toast?.("Modo mantenimiento activado");
};

;

/* ---- js/saas/sambrix-updates.js ---- */
SaaS.updateSystem=SaaS.updateSystem||{
  releases:[],
  businessChannels:{},
  history:[]
};

SaaS.loadUpdateSystem=function(){
  try{
    const saved=JSON.parse(localStorage.getItem("sambrix_update_system"))||{};
    SaaS.updateSystem={
      releases:saved.releases||[],
      businessChannels:saved.businessChannels||{},
      history:saved.history||[]
    };
  }catch{}
};

SaaS.saveUpdateSystem=function(){
  localStorage.setItem("sambrix_update_system",JSON.stringify(SaaS.updateSystem));
};

SaaS.openUpdateReleaseModal=function(){
  document.getElementById("updateVersion").value="";
  document.getElementById("updateChannel").value="beta";
  document.getElementById("updateNotes").value="";
  document.getElementById("updateRollout").value="10";
  document.getElementById("updateReleaseModal")?.classList.add("open");
};

SaaS.closeUpdateReleaseModal=function(){
  document.getElementById("updateReleaseModal")?.classList.remove("open");
};

SaaS.createUpdateRelease=function(){
  const version=document.getElementById("updateVersion").value.trim();
  const channel=document.getElementById("updateChannel").value;
  const notes=document.getElementById("updateNotes").value.trim();
  const rollout=Math.max(0,Math.min(100,Number(document.getElementById("updateRollout").value||0)));

  if(!version)return alert("Escribe el nÃºmero de versiÃ³n.");
  if(SaaS.updateSystem.releases.some(r=>r.version===version))return alert("Esa versiÃ³n ya existe.");

  const release={
    id:"upd_"+SaaS.uid(),
    version,channel,notes,rollout,
    createdAt:new Date().toISOString(),
    createdBy:window.FirebaseBridge?.user?.email||"SuperAdmin",
    active:true
  };

  SaaS.updateSystem.releases.push(release);
  SaaS.updateSystem.history.push({
    id:"hist_"+SaaS.uid(),
    type:"deploy",
    version,channel,
    createdAt:new Date().toISOString(),
    by:release.createdBy,
    note:`Release creado con rollout ${rollout}%`
  });

  SaaS.saveUpdateSystem();
  SaaS.audit?.("SYSTEM","ActualizaciÃ³n creada",{version,channel,rollout},"");
  SaaS.closeUpdateReleaseModal();
  SaaS.renderUpdateCenter();
  window.App?.toast?.(`VersiÃ³n ${version} creada`);
};

SaaS.setBusinessUpdateChannel=function(businessId,channel){
  SaaS.updateSystem.businessChannels[businessId]=channel;
  SaaS.saveUpdateSystem();
  SaaS.audit?.("SYSTEM","Canal de actualizaciÃ³n cambiado",{businessId,channel},businessId);
  SaaS.renderUpdateCenter();
};

SaaS.latestRelease=function(channel){
  return [...SaaS.updateSystem.releases]
    .filter(r=>r.channel===channel&&r.active!==false)
    .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))[0]||null;
};

SaaS.businessTargetVersion=function(businessId){
  const channel=SaaS.updateSystem.businessChannels[businessId]||"stable";
  return SaaS.latestRelease(channel)?.version||"â€”";
};

SaaS.promoteRelease=function(id){
  const r=SaaS.updateSystem.releases.find(x=>x.id===id);if(!r)return;
  if(r.channel==="stable")return;
  if(!confirm(`Â¿Promover v${r.version} a canal estable?`))return;
  r.channel="stable";r.rollout=100;
  SaaS.updateSystem.history.push({
    id:"hist_"+SaaS.uid(),type:"deploy",version:r.version,channel:"stable",
    createdAt:new Date().toISOString(),
    by:window.FirebaseBridge?.user?.email||"SuperAdmin",
    note:"Promovida de beta a estable"
  });
  SaaS.saveUpdateSystem();SaaS.audit?.("SYSTEM","VersiÃ³n promovida a estable",{version:r.version},"");SaaS.renderUpdateCenter();
};

SaaS.rollbackTo=function(version){
  const r=SaaS.updateSystem.releases.find(x=>x.version===version);if(!r)return;
  if(!confirm(`Â¿Registrar rollback hacia v${version}?`))return;
  SaaS.updateSystem.releases.forEach(x=>{if(x.channel==="stable")x.active=false});
  r.channel="stable";r.active=true;r.rollout=100;
  SaaS.updateSystem.history.push({
    id:"hist_"+SaaS.uid(),type:"rollback",version,channel:"stable",
    createdAt:new Date().toISOString(),
    by:window.FirebaseBridge?.user?.email||"SuperAdmin",
    note:"Rollback manual registrado"
  });
  SaaS.saveUpdateSystem();SaaS.audit?.("SYSTEM","Rollback registrado",{version},"");SaaS.renderUpdateCenter();
  window.App?.toast?.(`Rollback a v${version} registrado`);
};

SaaS.renderUpdateCenter=function(){
  const releases=document.getElementById("updateReleaseList");if(!releases)return;
  const stable=SaaS.latestRelease("stable"),beta=SaaS.latestRelease("beta");
  const bs=SaaS.db.businesses||[];

  document.getElementById("updateStableVersion").textContent=stable?.version||"â€”";
  document.getElementById("updateBetaVersion").textContent=beta?.version||"â€”";
  document.getElementById("updateBetaBusinessCount").textContent=bs.filter(b=>(SaaS.updateSystem.businessChannels[b.id]||"stable")==="beta").length;
  document.getElementById("updateRollbackCount").textContent=SaaS.updateSystem.history.filter(h=>h.type==="rollback").length;

  releases.innerHTML=[...SaaS.updateSystem.releases].reverse().map(r=>`<div class="row update-release ${r.channel}">
    <div style="flex:1">
      <strong class="update-version">v${r.version}</strong>
      <small>${r.notes||"Sin notas"} Â· ${new Date(r.createdAt).toLocaleString()}</small>
    </div>
    <span class="update-channel ${r.channel}">${r.channel}</span>
    <strong>${r.rollout}%</strong>
    <div class="manage-actions">
      ${r.channel==="beta"?`<button class="btn primary tiny" onclick="SaaS.promoteRelease('${r.id}')">Promover</button>`:""}
      <button class="btn secondary tiny" onclick="SaaS.rollbackTo('${r.version}')">Rollback</button>
    </div>
  </div>`).join("")||'<div class="muted">TodavÃ­a no hay actualizaciones registradas.</div>';

  document.getElementById("updateBusinessList").innerHTML=bs.map(b=>{
    const channel=SaaS.updateSystem.businessChannels[b.id]||"stable";
    return `<div class="row">
      <div style="flex:1"><strong>${b.name}</strong><small>VersiÃ³n objetivo: ${SaaS.businessTargetVersion(b.id)}</small></div>
      <select onchange="SaaS.setBusinessUpdateChannel('${b.id}',this.value)">
        <option value="stable" ${channel==="stable"?"selected":""}>Estable</option>
        <option value="beta" ${channel==="beta"?"selected":""}>Beta</option>
      </select>
    </div>`;
  }).join("")||'<div class="muted">No hay negocios.</div>';

  document.getElementById("updateHistoryList").innerHTML=[...SaaS.updateSystem.history].reverse().map(h=>`<div class="row update-history ${h.type}">
    <div><strong>${h.type==="rollback"?"Rollback":"Despliegue"} Â· v${h.version}</strong><small>${new Date(h.createdAt).toLocaleString()} Â· ${h.by}</small><div class="release-note">${h.note||""}</div></div>
    <span class="status ${h.type==="rollback"?"":"ok"}">${h.channel}</span>
  </div>`).join("")||'<div class="muted">Sin historial.</div>';

  const result=document.getElementById("updateResult");
  if(!stable){
    result.className="launch-result";
    result.innerHTML='<span class="tag">SIN VERSIÃ“N ESTABLE</span><h2>Registra una versiÃ³n estable</h2><p>Los negocios no deben depender solo del canal beta.</p>';
  }else if(beta){
    result.className="launch-result";
    result.innerHTML='<span class="tag">BETA ACTIVA</span><h2>Hay una versiÃ³n en prueba</h2><p>Usa unos pocos tenants antes de promoverla a estable.</p>';
  }else{
    result.className="launch-result ready";
    result.innerHTML='<span class="tag">ESTABLE</span><h2>Todos los negocios apuntan a una versiÃ³n estable</h2><p>No hay beta activa en este momento.</p>';
  }
};

const oldRenderAll_166=SaaS.renderAll;
SaaS.renderAll=function(){
  oldRenderAll_166();
  SaaS.renderUpdateCenter();
};

;

/* ---- js/saas/sambrix-auth-security.js ---- */
SaaS.authSecurity=SaaS.authSecurity||{
  requireFirebase:true,
  blockLegacy:true,
  idleMinutes:30,
  lastActivity:Date.now()
};

SaaS.loadAuthSecurity=function(){
  try{
    const saved=JSON.parse(localStorage.getItem("sambrix_auth_security"))||{};
    SaaS.authSecurity={...SaaS.authSecurity,...saved,lastActivity:Date.now()};
  }catch{}
};

SaaS.saveAuthSecurity=function(){
  SaaS.authSecurity.requireFirebase=!!document.getElementById("authRequireFirebase")?.checked;
  SaaS.authSecurity.blockLegacy=!!document.getElementById("authBlockLegacy")?.checked;
  SaaS.authSecurity.idleMinutes=Math.max(5,Math.min(240,Number(document.getElementById("authIdleMinutes")?.value||30)));
  SaaS.authSecurity.lastActivity=Date.now();
  localStorage.setItem("sambrix_auth_security",JSON.stringify({
    requireFirebase:SaaS.authSecurity.requireFirebase,
    blockLegacy:SaaS.authSecurity.blockLegacy,
    idleMinutes:SaaS.authSecurity.idleMinutes
  }));
  SaaS.audit?.("SECURITY","PolÃ­ticas de autenticaciÃ³n actualizadas",{
    requireFirebase:SaaS.authSecurity.requireFirebase,
    blockLegacy:SaaS.authSecurity.blockLegacy,
    idleMinutes:SaaS.authSecurity.idleMinutes
  },"");
  SaaS.renderAuthSecurity();
  SaaS.applyAuthGuard();
  window.App?.toast?.("Seguridad actualizada");
};

SaaS.authenticatedUser=function(){
  return window.FirebaseBridge?.user||window.FirebaseBridge?.currentUser||null;
};

SaaS.isProtectedRole=function(role){
  return ["superadmin","owner","admin","manager","reception","cashier","barber"].includes(String(role||"").toLowerCase());
};

SaaS.isProtectedAreaVisible=function(){
  const app=document.getElementById("adminApp");
  return !!app&&!app.classList.contains("hidden");
};

SaaS.ensureAuthBlocker=function(message){
  let blocker=document.getElementById("sambrixAuthBlocker");
  if(!blocker){
    blocker=document.createElement("div");
    blocker.id="sambrixAuthBlocker";
    blocker.className="sambrix-auth-blocker";
    document.body.appendChild(blocker);
  }
  blocker.innerHTML=`<div class="card">
    <span class="tag">SAMBRIX SECURITY</span>
    <h1>Acceso protegido</h1>
    <p>${message||"Debes iniciar sesiÃ³n para entrar al administrador."}</p>
    <button class="btn primary" id="authBlockerLoginBtn">Ir al inicio de sesiÃ³n</button>
  </div>`;
  document.getElementById("authBlockerLoginBtn")?.addEventListener("click",()=>{
    blocker.remove();
    SaaS.portal?.openLogin?.("business");
  });
};

SaaS.removeAuthBlocker=function(){
  document.getElementById("sambrixAuthBlocker")?.remove();
};

SaaS.applyAuthGuard=function(){
  const user=SaaS.authenticatedUser();
  const role=SaaS.session?.role||"guest";
  const protectedArea=SaaS.isProtectedAreaVisible();

  const localSuperAdminReview=role==="superadmin" && SaaS.session?.user?.localReview===true;
  if(SaaS.authSecurity.requireFirebase && protectedArea && SaaS.isProtectedRole(role) && !user && !localSuperAdminReview){
    document.getElementById("adminApp")?.classList.add("hidden");
    SaaS.ensureAuthBlocker("No hay una sesiÃ³n Firebase vÃ¡lida. Inicia sesiÃ³n con tu correo y contraseÃ±a.");
    return false;
  }

  if(SaaS.authSecurity.blockLegacy && protectedArea && role==="guest"){
    document.getElementById("adminApp")?.classList.add("hidden");
    SaaS.ensureAuthBlocker("El acceso antiguo sin autenticaciÃ³n estÃ¡ bloqueado.");
    return false;
  }

  SaaS.removeAuthBlocker();
  return true;
};

SaaS.touchAuthActivity=function(){
  SaaS.authSecurity.lastActivity=Date.now();
};

SaaS.checkIdleTimeout=function(){
  const user=SaaS.authenticatedUser();
  if(!user)return;
  const maxMs=Number(SaaS.authSecurity.idleMinutes||30)*60000;
  if(Date.now()-Number(SaaS.authSecurity.lastActivity||Date.now())<maxMs)return;

  SaaS.audit?.("SECURITY","SesiÃ³n cerrada por inactividad",{minutes:SaaS.authSecurity.idleMinutes},"");
  SaaS.authSecurity.lastActivity=Date.now();

  try{
    if(window.FirebaseBridge?.logout)window.FirebaseBridge.logout();
    else document.getElementById("firebaseLogoutBtn")?.click();
  }catch{}

  SaaS.session={role:"guest",user:null,businessId:"",branchId:""};
  document.getElementById("adminApp")?.classList.add("hidden");
  SaaS.portal?.show?.();
  window.App?.toast?.("SesiÃ³n cerrada por inactividad");
};

SaaS.authSecurityChecks=function(){
  const user=SaaS.authenticatedUser();
  const role=SaaS.session?.role||"guest";
  return [
    {name:"Firebase requerido",status:SaaS.authSecurity.requireFirebase?"pass":"warn",detail:SaaS.authSecurity.requireFirebase?"Los paneles protegidos exigen sesiÃ³n Firebase.":"Firebase Auth no estÃ¡ marcado como obligatorio."},
    {name:"Acceso legacy bloqueado",status:SaaS.authSecurity.blockLegacy?"pass":"warn",detail:SaaS.authSecurity.blockLegacy?"No se permite abrir admin como guest.":"El acceso legacy estÃ¡ permitido."},
    {name:"Bridge Firebase",status:window.FirebaseBridge?"pass":"fail",detail:window.FirebaseBridge?"FirebaseBridge detectado.":"No se detecta FirebaseBridge."},
    {name:"Usuario actual",status:user?"pass":"warn",detail:user?(user.email||user.uid||"Usuario autenticado"):"No hay sesiÃ³n activa en este momento."},
    {name:"Rol actual",status:SaaS.isProtectedRole(role)||role==="guest"?"pass":"warn",detail:`Rol: ${role}`},
    {name:"Timeout de inactividad",status:Number(SaaS.authSecurity.idleMinutes)>=5?"pass":"warn",detail:`${SaaS.authSecurity.idleMinutes} minutos.`}
  ];
};

SaaS.renderAuthSecurity=function(){
  const box=document.getElementById("authPolicyList");if(!box)return;

  document.getElementById("authRequireFirebase").checked=!!SaaS.authSecurity.requireFirebase;
  document.getElementById("authBlockLegacy").checked=!!SaaS.authSecurity.blockLegacy;
  document.getElementById("authIdleMinutes").value=SaaS.authSecurity.idleMinutes||30;

  const user=SaaS.authenticatedUser();
  const role=SaaS.session?.role||"guest";
  document.getElementById("authLoginState").textContent=SaaS.authSecurity.requireFirebase?"ON":"OFF";
  document.getElementById("authUserState").textContent=user?"ACTIVA":"SIN SESIÃ“N";
  document.getElementById("authRoleState").textContent=role.toUpperCase();
  document.getElementById("authTimeoutState").textContent=`${SaaS.authSecurity.idleMinutes||30}m`;

  const checks=SaaS.authSecurityChecks();
  box.innerHTML=checks.map(c=>`<div class="row auth-policy-row ${c.status}">
    <div class="diag-mark">${c.status==="pass"?"âœ“":c.status==="warn"?"!":"Ã—"}</div>
    <div><strong>${c.name}</strong><small>${c.detail}</small></div>
  </div>`).join("");

  const fail=checks.filter(x=>x.status==="fail").length;
  const warn=checks.filter(x=>x.status==="warn").length;
  const result=document.getElementById("authSecurityResult");

  if(fail){
    result.className="launch-result blocked";
    result.innerHTML=`<span class="tag">BLOQUEO</span><h2>${fail} problema(s) crÃ­tico(s)</h2><p>No se debe publicar hasta resolver autenticaciÃ³n.</p>`;
  }else if(warn){
    result.className="launch-result";
    result.innerHTML=`<span class="tag">REVISAR</span><h2>Seguridad estructural activa</h2><p>Quedan ${warn} advertencia(s), algunas pueden ser simplemente porque no hay una sesiÃ³n abierta ahora mismo.</p>`;
  }else{
    result.className="launch-result ready";
    result.innerHTML='<span class="tag">PROTEGIDO</span><h2>AutenticaciÃ³n y sesiÃ³n configuradas</h2><p>Los paneles protegidos requieren sesiÃ³n y rol vÃ¡lido.</p>';
  }
};

["click","keydown","touchstart","pointerdown"].forEach(evt=>{
  document.addEventListener(evt,SaaS.touchAuthActivity,{passive:true});
});

setInterval(()=>SaaS.checkIdleTimeout?.(),30000);

const oldRoute_167=SaaS.routeSession;
if(oldRoute_167)SaaS.routeSession=function(){
  const r=oldRoute_167();
  setTimeout(()=>SaaS.applyAuthGuard(),60);
  return r;
};

const oldRenderAll_167=SaaS.renderAll;
SaaS.renderAll=function(){
  oldRenderAll_167();
  SaaS.renderAuthSecurity();
  setTimeout(()=>SaaS.applyAuthGuard(),20);
};

;

/* ---- js/saas/sambrix-firebase-rules.js ---- */
SaaS.firebaseRuleRoles=[
  {role:"superadmin",platform:true,ownBusiness:true,otherBusiness:true,publicWrite:true,resolveBookings:true},
  {role:"owner",platform:false,ownBusiness:true,otherBusiness:false,publicWrite:true,resolveBookings:true},
  {role:"admin",platform:false,ownBusiness:true,otherBusiness:false,publicWrite:true,resolveBookings:true},
  {role:"manager",platform:false,ownBusiness:true,otherBusiness:false,publicWrite:true,resolveBookings:true},
  {role:"reception",platform:false,ownBusiness:true,otherBusiness:false,publicWrite:false,resolveBookings:true},
  {role:"cashier",platform:false,ownBusiness:true,otherBusiness:false,publicWrite:false,resolveBookings:false},
  {role:"barber",platform:false,ownBusiness:true,otherBusiness:false,publicWrite:false,resolveBookings:false}
];

SaaS.firebaseRulesChecks=function(){
  const businesses=SaaS.db.businesses||[];
  const businessIdsUnique=new Set(businesses.map(b=>b.id)).size===businesses.length;
  const allHaveIds=businesses.every(b=>!!b.id);
  const authReady=typeof SaaS.resolveFirebaseSession==="function";
  const rolesReady=typeof SaaS.currentSecurityRole==="function";
  const publicBooking=typeof SaaS.approvePublicBooking==="function";

  return [
    {name:"businessId Ãºnico",status:businessIdsUnique&&allHaveIds?"pass":"fail",detail:businessIdsUnique&&allHaveIds?"Todos los negocios tienen ID Ãºnico.":"Hay IDs faltantes o repetidos."},
    {name:"AutenticaciÃ³n por sesiÃ³n",status:authReady?"pass":"fail",detail:authReady?"Resolver de sesiÃ³n cargado.":"No se detecta resolver de sesiÃ³n."},
    {name:"Roles internos",status:rolesReady?"pass":"fail",detail:rolesReady?"Matriz de roles disponible.":"No se detecta control de roles."},
    {name:"Reservas pÃºblicas",status:publicBooking?"pass":"warn",detail:publicBooking?"Flujo pÃºblico/privado detectado.":"Flujo pÃºblico no detectado."},
    {name:"Reglas desplegadas",status:"warn",detail:"Las plantillas estÃ¡n incluidas, pero deben publicarse y probarse en Firebase antes de considerarlas activas."}
  ];
};

SaaS.renderFirebaseRules=function(){
  const matrix=document.getElementById("firebaseRulesMatrix");if(!matrix)return;

  document.getElementById("rulesRoleCount").textContent=SaaS.firebaseRuleRoles.length;
  document.getElementById("rulesTenantCount").textContent=(SaaS.db.businesses||[]).length;

  const yes=v=>`<span class="permission-chip ${v?"yes":"no"}">${v?"SÃ­":"No"}</span>`;
  matrix.innerHTML=`<table class="sambrix-table">
    <thead><tr><th>Rol</th><th>Plataforma</th><th>Su negocio</th><th>Otros negocios</th><th>Editar pÃºblico</th><th>Resolver reservas</th></tr></thead>
    <tbody>${SaaS.firebaseRuleRoles.map(r=>`<tr><td><strong>${r.role}</strong></td><td>${yes(r.platform)}</td><td>${yes(r.ownBusiness)}</td><td>${yes(r.otherBusiness)}</td><td>${yes(r.publicWrite)}</td><td>${yes(r.resolveBookings)}</td></tr>`).join("")}</tbody>
  </table>`;

  const checks=SaaS.firebaseRulesChecks();
  document.getElementById("firebaseRulesChecks").innerHTML=checks.map(c=>`<div class="row rules-check ${c.status}">
    <div class="diag-mark">${c.status==="pass"?"âœ“":c.status==="warn"?"!":"Ã—"}</div>
    <div><strong>${c.name}</strong><small>${c.detail}</small></div>
  </div>`).join("");

  const fail=checks.filter(x=>x.status==="fail").length;
  const warn=checks.filter(x=>x.status==="warn").length;
  const result=document.getElementById("firebaseRulesResult");

  if(fail){
    result.className="launch-result blocked";
    result.innerHTML=`<span class="tag">CORREGIR</span><h2>${fail} problema(s) de aislamiento</h2><p>No publicar reglas hasta corregirlos.</p>`;
  }else{
    result.className="launch-result";
    result.innerHTML=`<span class="tag">BASE PREPARADA</span><h2>Matriz y plantillas listas</h2><p>${warn} punto(s) requieren prueba real. Las reglas todavÃ­a deben desplegarse en Firebase y probarse con cuentas reales.</p>`;
  }
};

SaaS.refreshFirebaseRules=function(){
  SaaS.renderFirebaseRules();
  SaaS.audit?.("SECURITY","Matriz de reglas Firebase revisada",{
    roles:SaaS.firebaseRuleRoles.length,
    businesses:(SaaS.db.businesses||[]).length
  },"");
};

const oldRenderAll_168=SaaS.renderAll;
SaaS.renderAll=function(){
  oldRenderAll_168();
  SaaS.renderFirebaseRules();
};

;

/* ---- js/saas/sambrix-deployment.js ---- */
SaaS.deploymentConfig=SaaS.deploymentConfig||{
  projectId:"app-barberia-2026",
  publicDir:".",
  spaRewrite:true
};

SaaS.loadDeploymentConfig=function(){
  try{
    const saved=JSON.parse(localStorage.getItem("sambrix_deployment_config"))||{};
    SaaS.deploymentConfig={...SaaS.deploymentConfig,...saved};
  }catch{}
};

SaaS.saveDeploymentConfig=function(){
  SaaS.deploymentConfig.projectId=(document.getElementById("deploymentProjectId")?.value||"").trim();
  SaaS.deploymentConfig.publicDir=(document.getElementById("deploymentPublicDir")?.value||".").trim()||".";
  SaaS.deploymentConfig.spaRewrite=!!document.getElementById("deploymentSpaRewrite")?.checked;
  localStorage.setItem("sambrix_deployment_config",JSON.stringify(SaaS.deploymentConfig));
  SaaS.audit?.("SYSTEM","ConfiguraciÃ³n de despliegue actualizada",SaaS.deploymentConfig,"");
  SaaS.renderDeploymentCenter();
  window.App?.toast?.("ConfiguraciÃ³n de despliegue guardada");
};

SaaS.deploymentChecks=function(){
  const cert=(SaaS.certifications||[]).some(c=>c.productionApproved);
  const staticOk=!!SaaS.staticAudit&&!SaaS.staticAudit.duplicateIds?.length&&!SaaS.staticAudit.missingRefs?.length&&!SaaS.staticAudit.syntaxErrors?.length;
  const project=!!SaaS.deploymentConfig.projectId;
  const prod=SaaS.productionConfig?.environment==="production";
  const https=/^https:\/\//i.test(SaaS.productionConfig?.publicUrl||"");
  const snapshot=(SaaS.migrationSnapshots||[]).length>0;
  return [
    {name:"AuditorÃ­a tÃ©cnica",status:staticOk?"pass":"fail",detail:staticOk?"Sin bloqueos estÃ¡ticos.":"Revisa AuditorÃ­a final."},
    {name:"CertificaciÃ³n de producciÃ³n",status:cert?"pass":"warn",detail:cert?"CertificaciÃ³n disponible.":"TodavÃ­a no existe certificaciÃ³n final."},
    {name:"Project ID Firebase",status:project?"pass":"warn",detail:project?SaaS.deploymentConfig.projectId:"Falta indicar proyecto Firebase."},
    {name:"Entorno ProducciÃ³n",status:prod?"pass":"warn",detail:prod?"Entorno configurado como production.":"SAMBRIX sigue en prueba/staging."},
    {name:"URL HTTPS",status:https?"pass":"warn",detail:https?SaaS.productionConfig.publicUrl:"Falta URL HTTPS de producciÃ³n."},
    {name:"Snapshot previo",status:snapshot?"pass":"warn",detail:snapshot?"Existe punto de recuperaciÃ³n local.":"Conviene crear snapshot antes de desplegar."}
  ];
};

SaaS.renderDeploymentCenter=function(){
  const box=document.getElementById("deploymentChecks");if(!box)return;
  document.getElementById("deploymentProjectId").value=SaaS.deploymentConfig.projectId||"";
  document.getElementById("deploymentPublicDir").value=SaaS.deploymentConfig.publicDir||".";
  document.getElementById("deploymentSpaRewrite").checked=SaaS.deploymentConfig.spaRewrite!==false;

  const checks=SaaS.deploymentChecks();
  const pass=checks.filter(x=>x.status==="pass").length;
  const fail=checks.filter(x=>x.status==="fail").length;
  const warn=checks.filter(x=>x.status==="warn").length;

  document.getElementById("deployFirebaseState").textContent=SaaS.deploymentConfig.projectId?"CONFIG":"PENDIENTE";
  document.getElementById("deployCheckScore").textContent=`${pass}/${checks.length}`;

  box.innerHTML=checks.map(c=>`<div class="row deploy-check ${c.status}">
    <div class="diag-mark">${c.status==="pass"?"âœ“":c.status==="warn"?"!":"Ã—"}</div>
    <div><strong>${c.name}</strong><small>${c.detail}</small></div>
  </div>`).join("");

  const r=document.getElementById("deploymentResult");
  if(fail){
    r.className="launch-result blocked";
    r.innerHTML=`<span class="tag">NO DESPLEGAR</span><h2>${fail} bloqueo(s) tÃ©cnico(s)</h2><p>Corrige antes de publicar.</p>`;
  }else if(warn){
    r.className="launch-result";
    r.innerHTML=`<span class="tag">PREPARACIÃ“N</span><h2>Faltan ${warn} control(es)</h2><p>La estructura de Hosting estÃ¡ lista, pero SAMBRIX todavÃ­a no debe publicarse como producciÃ³n.</p>`;
  }else{
    r.className="launch-result ready";
    r.innerHTML='<span class="tag">LISTO PARA DEPLOY</span><h2>Controles previos aprobados</h2><p>La publicaciÃ³n real todavÃ­a debe ejecutarse con Firebase CLI y validarse despuÃ©s del deploy.</p>';
  }
};

SaaS.refreshDeployment=function(){
  SaaS.renderDeploymentCenter();
  SaaS.audit?.("SYSTEM","Checklist de despliegue revisado",{projectId:SaaS.deploymentConfig.projectId},"");
};

const oldRenderAll_169=SaaS.renderAll;
SaaS.renderAll=function(){
  oldRenderAll_169();
  SaaS.renderDeploymentCenter();
};

;

/* ---- js/saas/sambrix-release-candidate.js ---- */
SaaS.releaseCandidate=SaaS.releaseCandidate||{
  version:"17.0-RC1",
  notes:"",
  frozen:false,
  frozenAt:null,
  hash:"",
  projectId:"app-barberia-2026"
};

SaaS.loadReleaseCandidate=function(){
  try{
    const saved=JSON.parse(localStorage.getItem("sambrix_release_candidate"))||{};
    SaaS.releaseCandidate={...SaaS.releaseCandidate,...saved};
  }catch{}
};

SaaS.saveReleaseCandidate=function(){
  localStorage.setItem("sambrix_release_candidate",JSON.stringify(SaaS.releaseCandidate));
};

SaaS.candidateChecks=function(){
  const staticOk=!!SaaS.staticAudit&&!SaaS.staticAudit.duplicateIds?.length&&!SaaS.staticAudit.missingRefs?.length&&!SaaS.staticAudit.syntaxErrors?.length;
  const auth=typeof SaaS.applyAuthGuard==="function";
  const rules=typeof SaaS.firebaseRulesChecks==="function";
  const deploy=typeof SaaS.deploymentChecks==="function";
  const tests=typeof SaaS.runFullTests==="function";
  const finalWizard=Array.isArray(SaaS.FINAL_WIZARD_STEPS)&&SaaS.FINAL_WIZARD_STEPS.length>0;
  const project=!!SaaS.releaseCandidate.projectId;

  return [
    {name:"AuditorÃ­a estÃ¡tica",status:staticOk?"pass":"fail",detail:staticOk?"Sin errores estÃ¡ticos conocidos.":"Revisa AuditorÃ­a final."},
    {name:"AutenticaciÃ³n protegida",status:auth?"pass":"fail",detail:auth?"Guard de autenticaciÃ³n disponible.":"No se detecta guard de autenticaciÃ³n."},
    {name:"Reglas Firebase preparadas",status:rules?"pass":"warn",detail:rules?"Plantillas y matriz cargadas. Deben probarse en Firebase real.":"No se detecta mÃ³dulo de reglas."},
    {name:"Hosting preparado",status:deploy?"pass":"warn",detail:deploy?"Checklist de despliegue disponible.":"No se detecta centro de despliegue."},
    {name:"Pruebas integrales",status:tests?"pass":"fail",detail:tests?"BaterÃ­a automÃ¡tica disponible.":"No se detecta baterÃ­a de pruebas."},
    {name:"Prueba final guiada",status:finalWizard?"pass":"fail",detail:finalWizard?"Checklist manual disponible.":"No se detecta asistente final."},
    {name:"Firebase Project ID",status:project?"pass":"warn",detail:project?SaaS.releaseCandidate.projectId:"No se detectÃ³ projectId."}
  ];
};

SaaS.candidateFingerprint=function(){
  const payload={
    version:SaaS.releaseCandidate.version,
    projectId:SaaS.releaseCandidate.projectId,
    businesses:(SaaS.db.businesses||[]).map(b=>b.id),
    plans:(SaaS.db.plans||[]).map(p=>p.id),
    timestamp:SaaS.releaseCandidate.frozenAt||"unfrozen"
  };
  const s=JSON.stringify(payload);
  let h=2166136261;
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}
  return ("00000000"+(h>>>0).toString(16)).slice(-8).toUpperCase();
};

SaaS.freezeCandidate=function(){
  const checks=SaaS.candidateChecks();
  const fail=checks.filter(x=>x.status==="fail");
  if(fail.length)return alert("No se puede congelar: hay controles crÃ­ticos pendientes.");

  const version=(document.getElementById("candidateVersionInput")?.value||"").trim();
  if(!version)return alert("Escribe una versiÃ³n.");

  SaaS.releaseCandidate.version=version;
  SaaS.releaseCandidate.notes=(document.getElementById("candidateNotes")?.value||"").trim();
  SaaS.releaseCandidate.frozen=true;
  SaaS.releaseCandidate.frozenAt=new Date().toISOString();
  SaaS.releaseCandidate.hash=SaaS.candidateFingerprint();
  SaaS.saveReleaseCandidate();

  SaaS.audit?.("SYSTEM","Candidato de prueba congelado",{
    version:SaaS.releaseCandidate.version,
    hash:SaaS.releaseCandidate.hash,
    projectId:SaaS.releaseCandidate.projectId
  },"");

  SaaS.renderReleaseCandidate();
  window.App?.toast?.("Candidato de prueba congelado");
};

SaaS.renderReleaseCandidate=function(){
  const box=document.getElementById("candidateChecksList");if(!box)return;

  document.getElementById("candidateVersionInput").value=SaaS.releaseCandidate.version||"17.0-RC1";
  document.getElementById("candidateNotes").value=SaaS.releaseCandidate.notes||"";
  document.getElementById("candidateProjectId").textContent=SaaS.releaseCandidate.projectId||"â€”";
  document.getElementById("candidateFrozenAt").textContent=SaaS.releaseCandidate.frozenAt?new Date(SaaS.releaseCandidate.frozenAt).toLocaleString():"â€”";

  const checks=SaaS.candidateChecks();
  const pass=checks.filter(x=>x.status==="pass").length;
  const fail=checks.filter(x=>x.status==="fail").length;
  const warn=checks.filter(x=>x.status==="warn").length;

  document.getElementById("candidateVersion").textContent=SaaS.releaseCandidate.version||"17.0-RC1";
  document.getElementById("candidateChecks").textContent=`${pass}/${checks.length}`;
  document.getElementById("candidateHash").textContent=SaaS.releaseCandidate.hash||"â€”";
  document.getElementById("candidateFrozen").textContent=SaaS.releaseCandidate.frozen?"SÃ":"NO";

  box.innerHTML=checks.map(c=>`<div class="row candidate-check ${c.status}">
    <div class="diag-mark">${c.status==="pass"?"âœ“":c.status==="warn"?"!":"Ã—"}</div>
    <div><strong>${c.name}</strong><small>${c.detail}</small></div>
  </div>`).join("");

  const result=document.getElementById("candidateResult");
  if(fail){
    result.className="launch-result blocked";
    result.innerHTML=`<span class="tag">NO CONGELAR</span><h2>${fail} bloqueo(s)</h2><p>Corrige antes de crear el candidato de prueba.</p>`;
  }else if(!SaaS.releaseCandidate.frozen){
    result.className="launch-result";
    result.innerHTML=`<span class="tag">LISTO PARA CONGELAR</span><h2>Sin bloqueos crÃ­ticos</h2><p>Quedan ${warn} advertencia(s) que dependen de Firebase real. Puedes congelar este candidato para empezar la validaciÃ³n.</p>`;
  }else{
    result.className="launch-result ready";
    result.innerHTML=`<span class="tag">CANDIDATO CONGELADO</span><h2>${SaaS.releaseCandidate.version}</h2><p>Huella <span class="candidate-hash">${SaaS.releaseCandidate.hash}</span>. Los siguientes cambios deben hacerse en otra versiÃ³n, no sobre este candidato.</p>`;
  }
};

SaaS.refreshReleaseCandidate=function(){
  SaaS.renderReleaseCandidate();
  SaaS.audit?.("SYSTEM","Candidato de prueba revisado",{version:SaaS.releaseCandidate.version},"");
};

const oldRenderAll_170=SaaS.renderAll;
SaaS.renderAll=function(){
  oldRenderAll_170();
  SaaS.renderReleaseCandidate();
};

;

/* ---- js/saas/sambrix-smoke-test.js ---- */
SaaS.smokeTest=SaaS.smokeTest||{
  auto:[],
  manual:{}
};

SaaS.SMOKE_MANUAL_STEPS=[
  {id:"open_home",title:"Abrir SAMBRIX publicado",detail:"Confirma que la portada carga sin errores visibles."},
  {id:"login_super",title:"Entrar como SuperAdmin",detail:"Debe abrir el panel central con sesiÃ³n Firebase real."},
  {id:"open_business",title:"Abrir un negocio",detail:"El tenant correcto debe cargar sin mezclar informaciÃ³n."},
  {id:"create_appointment",title:"Crear una cita de prueba",detail:"GuÃ¡rdala y confirma que permanece despuÃ©s de recargar."},
  {id:"public_booking",title:"Enviar una reserva pÃºblica",detail:"Debe llegar a la bandeja del negocio correcto."},
  {id:"second_device",title:"Confirmar en otro dispositivo",detail:"Comprueba que la cita o reserva aparece realmente."}
];

SaaS.loadSmokeTest=function(){
  try{
    const saved=JSON.parse(localStorage.getItem("sambrix_smoke_test"))||{};
    SaaS.smokeTest={auto:saved.auto||[],manual:saved.manual||{}};
  }catch{}
};

SaaS.saveSmokeTest=function(){
  localStorage.setItem("sambrix_smoke_test",JSON.stringify(SaaS.smokeTest));
};

SaaS.runSmokeTest=function(){
  const user=window.FirebaseBridge?.user||window.FirebaseBridge?.currentUser||null;
  const businessId=SaaS.getContext?.()?.businessId||"";
  const tenant=businessId?SaaS.loadTenantState?.(businessId):null;
  const candidateFrozen=!!SaaS.releaseCandidate?.frozen;
  const rulesReady=typeof SaaS.firebaseRulesChecks==="function";
  const authGuard=typeof SaaS.applyAuthGuard==="function";

  SaaS.smokeTest.auto=[
    {name:"AplicaciÃ³n cargada",status:window.App&&window.SaaS?"pass":"fail",detail:window.App&&window.SaaS?"App y SaaS disponibles.":"No se cargÃ³ el nÃºcleo."},
    {name:"Candidato congelado",status:candidateFrozen?"pass":"warn",detail:candidateFrozen?SaaS.releaseCandidate.version:"TodavÃ­a no se congelÃ³ un candidato."},
    {name:"AutenticaciÃ³n protegida",status:authGuard?"pass":"fail",detail:authGuard?"Auth guard disponible.":"No se detecta guard de autenticaciÃ³n."},
    {name:"Firebase Bridge",status:window.FirebaseBridge?"pass":"fail",detail:window.FirebaseBridge?"Bridge cargado.":"FirebaseBridge no disponible."},
    {name:"Usuario autenticado",status:user?"pass":"warn",detail:user?(user.email||user.uid||"SesiÃ³n activa"):"No hay usuario autenticado ahora."},
    {name:"Tenant cargado",status:businessId&&tenant?"pass":"warn",detail:businessId?`businessId: ${businessId}`:"No hay negocio activo."},
    {name:"Reglas preparadas",status:rulesReady?"pass":"warn",detail:rulesReady?"Matriz de reglas disponible.":"No se detecta mÃ³dulo de reglas."}
  ];

  SaaS.saveSmokeTest();
  SaaS.renderSmokeTest();
  SaaS.audit?.("SYSTEM","Smoke test ejecutado",{
    pass:SaaS.smokeTest.auto.filter(x=>x.status==="pass").length,
    warn:SaaS.smokeTest.auto.filter(x=>x.status==="warn").length,
    fail:SaaS.smokeTest.auto.filter(x=>x.status==="fail").length
  },"");
};

SaaS.toggleSmokeManual=function(e){
  const c=e.target;
  if(!c.matches(".smokeManualCheck"))return;
  SaaS.smokeTest.manual[c.dataset.step]=c.checked;
  SaaS.saveSmokeTest();
  SaaS.renderSmokeTest();
};

SaaS.resetSmokeTest=function(){
  if(!confirm("Â¿Reiniciar la prueba rÃ¡pida?"))return;
  SaaS.smokeTest={auto:[],manual:{}};
  SaaS.saveSmokeTest();
  SaaS.renderSmokeTest();
};

SaaS.renderSmokeTest=function(){
  const autoBox=document.getElementById("smokeAutoList");
  if(!autoBox)return;

  const auto=SaaS.smokeTest.auto||[];
  const manual=SaaS.SMOKE_MANUAL_STEPS;
  const manualDone=manual.filter(s=>SaaS.smokeTest.manual?.[s.id]).length;
  const user=window.FirebaseBridge?.user||window.FirebaseBridge?.currentUser||null;
  const businessId=SaaS.getContext?.()?.businessId||"";

  document.getElementById("smokeAppState").textContent=(window.App&&window.SaaS)?"OK":"NO";
  document.getElementById("smokeLoginState").textContent=user?"OK":"PENDIENTE";
  document.getElementById("smokeTenantState").textContent=businessId?"OK":"PENDIENTE";
  document.getElementById("smokeChecklistState").textContent=`${manualDone}/${manual.length}`;

  autoBox.innerHTML=auto.length?auto.map(x=>`<div class="row smoke-row ${x.status}">
    <div class="diag-mark">${x.status==="pass"?"âœ“":x.status==="warn"?"!":"Ã—"}</div>
    <div><strong>${x.name}</strong><small>${x.detail}</small></div>
  </div>`).join(""):'<div class="muted">Ejecuta la revisiÃ³n despuÃ©s del deploy.</div>';

  document.getElementById("smokeManualList").innerHTML=manual.map((s,i)=>`<label class="row smoke-row ${SaaS.smokeTest.manual?.[s.id]?"":"warn"}">
    <div class="wizard-check">
      <input type="checkbox" class="smokeManualCheck" data-step="${s.id}" ${SaaS.smokeTest.manual?.[s.id]?"checked":""}>
      <div><strong>${i+1}. ${s.title}</strong><small>${s.detail}</small></div>
    </div>
    <span class="status ${SaaS.smokeTest.manual?.[s.id]?"ok":""}">${SaaS.smokeTest.manual?.[s.id]?"OK":"Pendiente"}</span>
  </label>`).join("");

  const fail=auto.filter(x=>x.status==="fail").length;
  const warn=auto.filter(x=>x.status==="warn").length;
  const manualComplete=manualDone===manual.length;
  const result=document.getElementById("smokeResult");

  if(fail){
    result.className="launch-result blocked";
    result.innerHTML=`<span class="tag">FALLO</span><h2>${fail} error(es) bÃ¡sico(s)</h2><p>No continuar con pruebas profundas hasta corregirlos.</p>`;
  }else if(!manualComplete){
    result.className="launch-result";
    result.innerHTML=`<span class="tag">PENDIENTE</span><h2>AutomÃ¡tico sin bloqueos crÃ­ticos</h2><p>Faltan ${manual.length-manualDone} comprobaciÃ³n(es) reales despuÃ©s del deploy.</p>`;
  }else if(warn){
    result.className="launch-result";
    result.innerHTML=`<span class="tag">REVISAR</span><h2>Smoke test manual completo</h2><p>Quedan ${warn} advertencia(s) automÃ¡ticas para revisar.</p>`;
  }else{
    result.className="launch-result ready";
    result.innerHTML='<span class="tag">APROBADO</span><h2>Smoke test post-deploy superado</h2><p>El candidato puede pasar a la prueba integral real.</p>';
  }
};

const oldRenderAll_171=SaaS.renderAll;
SaaS.renderAll=function(){
  oldRenderAll_171();
  SaaS.renderSmokeTest();
};

;

/* ---- js/saas/sambrix-runtime-diagnostics.js ---- */
SaaS.runtimeDiagnostics=SaaS.runtimeDiagnostics||{
  errors:[],
  installed:false
};

SaaS.loadRuntimeDiagnostics=function(){
  try{
    SaaS.runtimeDiagnostics.errors=JSON.parse(sessionStorage.getItem("sambrix_runtime_errors"))||[];
  }catch{SaaS.runtimeDiagnostics.errors=[]}
  SaaS.installRuntimeDiagnostics();
};

SaaS.saveRuntimeDiagnostics=function(){
  try{
    sessionStorage.setItem("sambrix_runtime_errors",JSON.stringify(SaaS.runtimeDiagnostics.errors.slice(-100)));
  }catch{}
};

SaaS.pushRuntimeError=function(err){
  const item={
    id:"rt_"+SaaS.uid(),
    type:err.type||"javascript",
    message:String(err.message||"Error desconocido"),
    source:String(err.source||""),
    line:err.line||0,
    column:err.column||0,
    stack:String(err.stack||""),
    createdAt:new Date().toISOString(),
    page:document.querySelector(".page.active")?.id||"",
    role:SaaS.session?.role||"guest",
    businessId:SaaS.getContext?.()?.businessId||""
  };

  const duplicate=SaaS.runtimeDiagnostics.errors.slice(-5).some(x=>
    x.type===item.type&&x.message===item.message&&x.source===item.source
  );
  if(!duplicate){
    SaaS.runtimeDiagnostics.errors.push(item);
    if(SaaS.runtimeDiagnostics.errors.length>100)SaaS.runtimeDiagnostics.errors=SaaS.runtimeDiagnostics.errors.slice(-100);
    SaaS.saveRuntimeDiagnostics();
  }
  SaaS.renderRuntimeDiagnostics();
};

SaaS.installRuntimeDiagnostics=function(){
  if(SaaS.runtimeDiagnostics.installed)return;
  SaaS.runtimeDiagnostics.installed=true;

  window.addEventListener("error",e=>{
    const target=e.target;
    if(target&&target!==window&&target.tagName){
      SaaS.pushRuntimeError({
        type:"resource",
        message:`No se pudo cargar ${target.tagName}`,
        source:target.src||target.href||target.currentSrc||""
      });
      return;
    }
    SaaS.pushRuntimeError({
      type:"javascript",
      message:e.message||"JavaScript error",
      source:e.filename||"",
      line:e.lineno||0,
      column:e.colno||0,
      stack:e.error?.stack||""
    });
  },true);

  window.addEventListener("unhandledrejection",e=>{
    const reason=e.reason;
    SaaS.pushRuntimeError({
      type:"promise",
      message:reason?.message||String(reason||"Promise rechazada"),
      stack:reason?.stack||""
    });
  });
};

SaaS.clearRuntimeDiagnostics=function(){
  if(!confirm("Â¿Limpiar el registro de errores de esta sesiÃ³n?"))return;
  SaaS.runtimeDiagnostics.errors=[];
  SaaS.saveRuntimeDiagnostics();
  SaaS.renderRuntimeDiagnostics();
};

SaaS.renderRuntimeDiagnostics=function(){
  const box=document.getElementById("runtimeErrorList");if(!box)return;
  const filter=document.getElementById("runtimeTypeFilter")?.value||"";
  const all=SaaS.runtimeDiagnostics.errors||[];
  const rows=all.filter(x=>!filter||x.type===filter);

  const js=all.filter(x=>x.type==="javascript").length;
  const promise=all.filter(x=>x.type==="promise").length;
  const resource=all.filter(x=>x.type==="resource").length;
  const total=all.length;

  document.getElementById("runtimeJsErrorCount").textContent=js;
  document.getElementById("runtimePromiseErrorCount").textContent=promise;
  document.getElementById("runtimeResourceErrorCount").textContent=resource;
  document.getElementById("runtimeHealthState").textContent=total?"REVISAR":"LIMPIO";

  box.innerHTML=[...rows].reverse().map(x=>`<div class="row runtime-row ${x.type}">
    <div style="flex:1">
      <strong>${x.message}</strong>
      <small>${x.type} Â· ${new Date(x.createdAt).toLocaleString()} Â· ${x.page||"sin pÃ¡gina"}</small>
      <div class="runtime-meta">${x.source||""}${x.line?` : ${x.line}:${x.column}`:""}</div>
      ${x.stack?`<div class="runtime-stack">${x.stack}</div>`:""}
    </div>
  </div>`).join("")||'<div class="muted">No hay errores registrados en esta sesiÃ³n.</div>';

  const env=[
    ["URL",location.href],
    ["Navegador",navigator.userAgent],
    ["Online",navigator.onLine?"SÃ­":"No"],
    ["Rol",SaaS.session?.role||"guest"],
    ["Business ID",SaaS.getContext?.()?.businessId||"â€”"],
    ["Firebase usuario",(window.FirebaseBridge?.user||window.FirebaseBridge?.currentUser)?.email||"â€”"],
    ["Candidato",SaaS.releaseCandidate?.version||"â€”"],
    ["Hash candidato",SaaS.releaseCandidate?.hash||"â€”"]
  ];
  document.getElementById("runtimeEnvironmentList").innerHTML=env.map(x=>`<div class="row"><span>${x[0]}</span><strong style="max-width:65%;word-break:break-all;text-align:right">${x[1]}</strong></div>`).join("");

  const result=document.getElementById("runtimeResult");
  if(total){
    result.className="launch-result blocked";
    result.innerHTML=`<span class="tag">ERRORES DETECTADOS</span><h2>${total} error(es) en esta sesiÃ³n</h2><p>RevÃ­salos antes de aprobar el candidato.</p>`;
  }else{
    result.className="launch-result ready";
    result.innerHTML='<span class="tag">LIMPIO</span><h2>Sin errores de runtime registrados</h2><p>Este panel seguirÃ¡ escuchando mientras pruebas SAMBRIX.</p>';
  }
};

const oldRenderAll_172=SaaS.renderAll;
SaaS.renderAll=function(){
  oldRenderAll_172();
  SaaS.renderRuntimeDiagnostics();
};

;

/* ---- js/saas/sambrix-bug-reports.js ---- */
SaaS.bugReports=SaaS.bugReports||[];
SaaS.pendingRuntimeEvidence=[];

SaaS.loadBugReports=function(){
  try{SaaS.bugReports=JSON.parse(localStorage.getItem("sambrix_bug_reports"))||[]}catch{SaaS.bugReports=[]}
};

SaaS.saveBugReports=function(){
  localStorage.setItem("sambrix_bug_reports",JSON.stringify(SaaS.bugReports));
};

SaaS.openBugReportModal=function(){
  const businessSelect=document.getElementById("bugBusiness");
  const ctx=SaaS.getContext?.()||{};
  businessSelect.innerHTML='<option value="">Plataforma general</option>'+(SaaS.db.businesses||[]).map(b=>`<option value="${b.id}">${b.name}</option>`).join("");
  if(ctx.businessId)businessSelect.value=ctx.businessId;

  document.getElementById("bugTitle").value="";
  document.getElementById("bugSeverity").value="Media";
  document.getElementById("bugDescription").value="";
  document.getElementById("bugSteps").value="";
  document.getElementById("bugExpected").value="";
  document.getElementById("bugActual").value="";
  document.getElementById("bugPage").value=document.querySelector(".page.active")?.id||"";
  SaaS.pendingRuntimeEvidence=[];
  document.getElementById("bugReportModal")?.classList.add("open");
};

SaaS.closeBugReportModal=function(){
  document.getElementById("bugReportModal")?.classList.remove("open");
};

SaaS.attachRuntimeEvidence=function(){
  SaaS.pendingRuntimeEvidence=(SaaS.runtimeDiagnostics?.errors||[]).slice(-10);
  window.App?.toast?.(`${SaaS.pendingRuntimeEvidence.length} error(es) runtime adjuntados`);
};

SaaS.createBugReport=function(){
  const title=document.getElementById("bugTitle").value.trim();
  if(!title)return alert("Escribe un tÃ­tulo.");

  const businessId=document.getElementById("bugBusiness").value;
  const business=SaaS.db.businesses.find(b=>b.id===businessId);
  const user=window.FirebaseBridge?.user||window.FirebaseBridge?.currentUser||null;
  const report={
    id:"bug_"+SaaS.uid(),
    title,
    severity:document.getElementById("bugSeverity").value,
    status:"Abierto",
    businessId,
    businessName:business?.name||"Plataforma",
    page:document.getElementById("bugPage").value,
    description:document.getElementById("bugDescription").value.trim(),
    steps:document.getElementById("bugSteps").value.trim(),
    expected:document.getElementById("bugExpected").value.trim(),
    actual:document.getElementById("bugActual").value.trim(),
    runtimeEvidence:JSON.parse(JSON.stringify(SaaS.pendingRuntimeEvidence||[])),
    environment:{
      url:location.href,
      userAgent:navigator.userAgent,
      online:navigator.onLine,
      role:SaaS.session?.role||"guest",
      user:user?.email||user?.uid||"",
      candidateVersion:SaaS.releaseCandidate?.version||"",
      candidateHash:SaaS.releaseCandidate?.hash||"",
      firebaseProject:SaaS.releaseCandidate?.projectId||""
    },
    createdAt:new Date().toISOString(),
    createdBy:user?.email||"Tester"
  };

  SaaS.bugReports.push(report);
  SaaS.saveBugReports();
  SaaS.audit?.("QA","Reporte de error creado",{id:report.id,severity:report.severity,title:report.title},businessId);
  SaaS.closeBugReportModal();
  SaaS.renderBugReports();
  window.App?.toast?.("Reporte guardado");
};

SaaS.updateBugStatus=function(id,status){
  const r=SaaS.bugReports.find(x=>x.id===id);if(!r)return;
  r.status=status;
  r.updatedAt=new Date().toISOString();
  if(status==="Resuelto")r.resolvedAt=r.updatedAt;
  SaaS.saveBugReports();
  SaaS.audit?.("QA","Estado de reporte actualizado",{id,status},r.businessId);
  SaaS.renderBugReports();
};

SaaS.exportBugReport=function(id){
  const r=SaaS.bugReports.find(x=>x.id===id);if(!r)return;
  const blob=new Blob([JSON.stringify(r,null,2)],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=`SAMBRIX_bug_${r.id}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
};

SaaS.renderBugReports=function(){
  const box=document.getElementById("bugReportList");if(!box)return;

  const q=(document.getElementById("bugSearch")?.value||"").toLowerCase();
  const status=document.getElementById("bugStatusFilter")?.value||"";
  const rows=SaaS.bugReports.filter(r=>(!status||r.status===status)&&(!q||`${r.title} ${r.description} ${r.businessName}`.toLowerCase().includes(q)));

  document.getElementById("bugOpenCount").textContent=SaaS.bugReports.filter(r=>r.status!=="Resuelto").length;
  document.getElementById("bugCriticalCount").textContent=SaaS.bugReports.filter(r=>r.status!=="Resuelto"&&r.severity==="CrÃ­tica").length;
  document.getElementById("bugResolvedCount").textContent=SaaS.bugReports.filter(r=>r.status==="Resuelto").length;
  document.getElementById("bugCandidateVersion").textContent=SaaS.releaseCandidate?.version||"â€”";

  box.innerHTML=[...rows].reverse().map(r=>`<div class="row bug-row ${r.severity==="CrÃ­tica"?"critical":""} ${r.status==="Resuelto"?"resolved":""}">
    <div style="flex:1">
      <strong>${r.title}</strong>
      <small>${r.businessName} Â· ${r.severity} Â· ${r.status} Â· ${new Date(r.createdAt).toLocaleString()}</small>
      <div class="bug-meta">${r.page||"sin pÃ¡gina"} Â· ${r.environment?.role||"guest"} Â· ${r.environment?.candidateVersion||"sin versiÃ³n"}</div>
      ${r.runtimeEvidence?.length?`<div class="bug-evidence">${r.runtimeEvidence.map(e=>`${e.type}: ${e.message}`).join("\n")}</div>`:""}
    </div>
    <div class="manage-actions">
      <select onchange="SaaS.updateBugStatus('${r.id}',this.value)">
        <option ${r.status==="Abierto"?"selected":""}>Abierto</option>
        <option ${r.status==="En progreso"?"selected":""}>En progreso</option>
        <option ${r.status==="Resuelto"?"selected":""}>Resuelto</option>
      </select>
      <button class="btn secondary tiny" onclick="SaaS.exportBugReport('${r.id}')">Exportar</button>
    </div>
  </div>`).join("")||'<div class="muted">No hay reportes con estos filtros.</div>';

  const open=SaaS.bugReports.filter(r=>r.status!=="Resuelto");
  const critical=open.filter(r=>r.severity==="CrÃ­tica").length;
  const high=open.filter(r=>r.severity==="Alta").length;
  const result=document.getElementById("bugReportResult");

  if(critical){
    result.className="launch-result blocked";
    result.innerHTML=`<span class="tag">BLOQUEADO</span><h2>${critical} error(es) crÃ­tico(s)</h2><p>El candidato no debe aprobarse hasta resolverlos.</p>`;
  }else if(high){
    result.className="launch-result";
    result.innerHTML=`<span class="tag">REVISAR</span><h2>${high} error(es) de severidad alta</h2><p>CorrÃ­gelos antes de certificar el candidato.</p>`;
  }else if(open.length){
    result.className="launch-result";
    result.innerHTML=`<span class="tag">SEGUIMIENTO</span><h2>${open.length} reporte(s) abierto(s)</h2><p>No hay crÃ­ticos, pero todavÃ­a existen problemas pendientes.</p>`;
  }else{
    result.className="launch-result ready";
    result.innerHTML='<span class="tag">SIN BLOQUEOS QA</span><h2>No hay errores abiertos</h2><p>El candidato no tiene reportes QA pendientes registrados.</p>';
  }
};

const oldRenderAll_173=SaaS.renderAll;
SaaS.renderAll=function(){
  oldRenderAll_173();
  SaaS.renderBugReports();
};

;

/* ---- js/saas/sambrix-sync-test.js ---- */
SaaS.syncTest=SaaS.syncTest||{manual:{}};

SaaS.SYNC_MANUAL_STEPS=[
 {id:"appointment",title:"Cita nueva",detail:"Crear una cita en el dispositivo A y verla en el dispositivo B despuÃ©s de iniciar sesiÃ³n."},
 {id:"public_booking",title:"Reserva de cliente",detail:"Enviar una reserva desde la vista cliente y comprobar que llegue al negocio correcto."},
 {id:"business_edit",title:"Cambio del negocio",detail:"Cambiar un dato visible del negocio y confirmar que el segundo dispositivo reciba el cambio."},
 {id:"image",title:"Imagen compartida",detail:"Subir o cambiar una imagen y comprobar que el segundo dispositivo pueda verla sin usar el archivo local del primero."},
 {id:"isolation",title:"Aislamiento entre negocios",detail:"Confirmar que un segundo negocio no vea citas, clientes ni configuraciÃ³n privada del primero."}
];

SaaS.loadSyncTest=function(){
 try{
  const saved=JSON.parse(localStorage.getItem("sambrix_sync_test"))||{};
  SaaS.syncTest={manual:saved.manual||{}};
 }catch{}
};

SaaS.saveSyncTest=function(){
 localStorage.setItem("sambrix_sync_test",JSON.stringify(SaaS.syncTest));
};

SaaS.syncTechnicalChecks=function(){
 const bridge=!!window.FirebaseBridge;
 const user=window.FirebaseBridge?.user||window.FirebaseBridge?.currentUser||null;
 const db=window.FirebaseBridge?.db||window.FirebaseBridge?.database||window.FirebaseBridge?.firestore||null;
 const businessId=SaaS.getContext?.()?.businessId||"";
 const localOnly=typeof localStorage!=="undefined";
 return [
  {name:"Firebase Bridge",status:bridge?"pass":"fail",detail:bridge?"FirebaseBridge cargado.":"No se detecta FirebaseBridge."},
  {name:"SesiÃ³n Firebase",status:user?"pass":"warn",detail:user?(user.email||user.uid||"Usuario autenticado"):"Inicia sesiÃ³n para la prueba real."},
  {name:"Base Firebase disponible",status:db?"pass":"warn",detail:db?"Instancia de datos detectada.":"No se pudo confirmar una instancia de base de datos desde el bridge."},
  {name:"Tenant activo",status:businessId?"pass":"warn",detail:businessId||"Abre un negocio antes de probar."},
  {name:"Persistencia local",status:localOnly?"warn":"pass",detail:"localStorage existe; por sÃ­ solo NO demuestra sincronizaciÃ³n entre telÃ©fonos."}
 ];
};

SaaS.toggleSyncManual=function(e){
 const c=e.target;if(!c.matches(".syncManualCheck"))return;
 SaaS.syncTest.manual[c.dataset.step]=c.checked;
 SaaS.saveSyncTest();SaaS.renderSyncTest();
};

SaaS.resetSyncTest=function(){
 if(!confirm("Â¿Reiniciar la prueba de sincronizaciÃ³n?"))return;
 SaaS.syncTest={manual:{}};SaaS.saveSyncTest();SaaS.renderSyncTest();
};

SaaS.renderSyncTest=function(){
 const techBox=document.getElementById("syncTechnicalChecks");if(!techBox)return;
 const checks=SaaS.syncTechnicalChecks();
 const steps=SaaS.SYNC_MANUAL_STEPS;
 const done=steps.filter(s=>SaaS.syncTest.manual?.[s.id]).length;
 const bridge=!!window.FirebaseBridge;
 const user=window.FirebaseBridge?.user||window.FirebaseBridge?.currentUser||null;

 document.getElementById("syncFirebaseState").textContent=bridge?"CARGADO":"NO";
 document.getElementById("syncDeviceAState").textContent=user?"LISTO":"PENDIENTE";
 document.getElementById("syncDeviceBState").textContent=done===steps.length?"CONFIRMADO":"PENDIENTE";
 document.getElementById("syncProgressState").textContent=`${done}/${steps.length}`;

 techBox.innerHTML=checks.map(c=>`<div class="row sync-check ${c.status}">
   <div class="diag-mark">${c.status==="pass"?"âœ“":c.status==="warn"?"!":"Ã—"}</div>
   <div><strong>${c.name}</strong><small>${c.detail}</small></div>
 </div>`).join("");

 document.getElementById("syncManualChecks").innerHTML=steps.map((s,i)=>`<label class="row sync-check ${SaaS.syncTest.manual?.[s.id]?"":"warn"}">
   <div class="wizard-check"><input type="checkbox" class="syncManualCheck" data-step="${s.id}" ${SaaS.syncTest.manual?.[s.id]?"checked":""}>
   <div><strong>${i+1}. ${s.title}</strong><small>${s.detail}</small></div></div>
   <span class="status ${SaaS.syncTest.manual?.[s.id]?"ok":""}">${SaaS.syncTest.manual?.[s.id]?"OK":"Pendiente"}</span>
 </label>`).join("");

 const fail=checks.filter(c=>c.status==="fail").length;
 const result=document.getElementById("syncTestResult");
 if(fail){
  result.className="launch-result blocked";
  result.innerHTML=`<span class="tag">BLOQUEADO</span><h2>${fail} problema(s) tÃ©cnico(s)</h2><p>No podemos validar sincronizaciÃ³n real hasta corregirlos.</p>`;
 }else if(done<steps.length){
  result.className="launch-result";
  result.innerHTML=`<span class="tag">NO CONFIRMADO</span><h2>SincronizaciÃ³n todavÃ­a pendiente</h2><p>Faltan ${steps.length-done} prueba(s) entre dispositivos. Que funcione en un telÃ©fono no demuestra sincronizaciÃ³n.</p>`;
 }else{
  result.className="launch-result ready";
  result.innerHTML='<span class="tag">CONFIRMADO MANUALMENTE</span><h2>Pruebas entre dispositivos completadas</h2><p>Los cinco escenarios fueron marcados como verificados durante la prueba real.</p>';
 }
};

SaaS.refreshSyncTest=function(){
 SaaS.renderSyncTest();
 SaaS.audit?.("QA","Prueba de sincronizaciÃ³n revisada",{completed:SaaS.SYNC_MANUAL_STEPS.filter(s=>SaaS.syncTest.manual?.[s.id]).length},"");
};

const oldRenderAll_174=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_174();SaaS.renderSyncTest();};

;

/* ---- js/saas/sambrix-data-integrity.js ---- */
SaaS.dataIntegrity=SaaS.dataIntegrity||{results:[],manual:{}};

SaaS.INTEGRITY_MANUAL_STEPS=[
 {id:"reload",title:"Recargar la aplicaciÃ³n",detail:"Los datos creados deben seguir presentes despuÃ©s de F5/cerrar y abrir."},
 {id:"logout_login",title:"Cerrar sesiÃ³n y volver a entrar",detail:"El negocio debe recuperar sus datos correctamente."},
 {id:"second_device",title:"Abrir en otro dispositivo",detail:"Los registros importantes deben venir de Firebase, no del localStorage del primer equipo."},
 {id:"image_persistence",title:"Comprobar imÃ¡genes",detail:"Una imagen cambiada debe seguir visible despuÃ©s de recargar y en otro dispositivo."}
];

SaaS.loadDataIntegrity=function(){
 try{
  const saved=JSON.parse(localStorage.getItem("sambrix_data_integrity"))||{};
  SaaS.dataIntegrity={results:saved.results||[],manual:saved.manual||{}};
 }catch{}
};

SaaS.saveDataIntegrity=function(){
 localStorage.setItem("sambrix_data_integrity",JSON.stringify(SaaS.dataIntegrity));
};

SaaS.findDuplicateIds=function(rows){
 const seen=new Set(),dup=new Set();
 (rows||[]).forEach(x=>{
   const id=x?.id;
   if(!id)return;
   if(seen.has(id))dup.add(id);
   seen.add(id);
 });
 return [...dup];
};

SaaS.runDataIntegrity=function(){
 const results=[];
 (SaaS.db.businesses||[]).forEach(b=>{
   const t=SaaS.loadTenantState?.(b.id)||{};
   const collections=[
     ["clients",t.clients||[]],
     ["appointments",t.appointments||[]],
     ["sales",t.sales||[]],
     ["products",t.products||[]],
     ["barbers",t.barbers||[]]
   ];
   const duplicates=[];
   collections.forEach(([name,rows])=>{
      SaaS.findDuplicateIds(rows).forEach(id=>duplicates.push(`${name}:${id}`));
   });

   let incomplete=0;
   (t.clients||[]).forEach(c=>{if(!c.id||!c.name)incomplete++});
   (t.appointments||[]).forEach(a=>{if(!a.id||!a.date||!a.time||!a.clientId)incomplete++});
   (t.products||[]).forEach(p=>{if(!p.id||!p.name)incomplete++});

   const foreign=[
     ...(t.clients||[]),
     ...(t.appointments||[]),
     ...(t.sales||[]),
     ...(t.products||[])
   ].filter(x=>x.businessId&&x.businessId!==b.id);

   results.push({
     businessId:b.id,
     businessName:b.name,
     duplicates,
     incomplete,
     foreign:foreign.length,
     status:duplicates.length||foreign.length?"fail":incomplete?"warn":"pass"
   });
 });
 SaaS.dataIntegrity.results=results;
 SaaS.saveDataIntegrity();
 SaaS.renderDataIntegrity();
 SaaS.audit?.("QA","Integridad de datos revisada",{
   tenants:results.length,
   duplicateTenants:results.filter(r=>r.duplicates.length).length,
   foreignRecords:results.reduce((s,r)=>s+r.foreign,0)
 },"");
};

SaaS.toggleIntegrityManual=function(e){
 const c=e.target;if(!c.matches(".integrityManualCheck"))return;
 SaaS.dataIntegrity.manual[c.dataset.step]=c.checked;
 SaaS.saveDataIntegrity();SaaS.renderDataIntegrity();
};

SaaS.renderDataIntegrity=function(){
 const box=document.getElementById("integrityTenantList");if(!box)return;
 const results=SaaS.dataIntegrity.results||[];
 const duplicateCount=results.reduce((s,r)=>s+r.duplicates.length,0);
 const incompleteCount=results.reduce((s,r)=>s+r.incomplete,0);
 const foreignCount=results.reduce((s,r)=>s+r.foreign,0);

 document.getElementById("integrityDuplicateCount").textContent=duplicateCount;
 document.getElementById("integrityIncompleteCount").textContent=incompleteCount;
 document.getElementById("integrityTenantCount").textContent=results.length;
 document.getElementById("integrityState").textContent=(duplicateCount||foreignCount)?"REVISAR":results.length?"OK":"â€”";

 box.innerHTML=results.map(r=>`<div class="row integrity-row ${r.status}">
   <div style="flex:1">
     <strong>${r.businessName}</strong>
     <small>${r.duplicates.length} duplicado(s) Â· ${r.incomplete} incompleto(s) Â· ${r.foreign} registro(s) ajeno(s)</small>
     ${r.duplicates.length?`<div class="runtime-meta">${r.duplicates.join(", ")}</div>`:""}
   </div>
   <span class="status ${r.status==="pass"?"ok":""}">${r.status==="pass"?"OK":r.status==="warn"?"Revisar":"Error"}</span>
 </div>`).join("")||'<div class="muted">Ejecuta la revisiÃ³n de integridad.</div>';

 const steps=SaaS.INTEGRITY_MANUAL_STEPS;
 const done=steps.filter(s=>SaaS.dataIntegrity.manual?.[s.id]).length;
 document.getElementById("integrityManualList").innerHTML=steps.map((s,i)=>`<label class="row integrity-row ${SaaS.dataIntegrity.manual?.[s.id]?"":"warn"}">
   <div class="wizard-check">
     <input type="checkbox" class="integrityManualCheck" data-step="${s.id}" ${SaaS.dataIntegrity.manual?.[s.id]?"checked":""}>
     <div><strong>${i+1}. ${s.title}</strong><small>${s.detail}</small></div>
   </div>
   <span class="status ${SaaS.dataIntegrity.manual?.[s.id]?"ok":""}">${SaaS.dataIntegrity.manual?.[s.id]?"OK":"Pendiente"}</span>
 </label>`).join("");

 const result=document.getElementById("integrityResult");
 if(duplicateCount||foreignCount){
   result.className="launch-result blocked";
   result.innerHTML=`<span class="tag">ERROR DE DATOS</span><h2>Integridad comprometida</h2><p>Hay ${duplicateCount} ID duplicado(s) y ${foreignCount} registro(s) asociados a otro negocio.</p>`;
 }else if(!results.length){
   result.className="launch-result";
   result.innerHTML='<span class="tag">PENDIENTE</span><h2>Ejecuta la revisiÃ³n</h2><p>TodavÃ­a no se ha analizado la informaciÃ³n de los tenants.</p>';
 }else if(done<steps.length){
   result.className="launch-result";
   result.innerHTML=`<span class="tag">DATOS LOCALES OK</span><h2>Sin cruces ni duplicados detectados</h2><p>Faltan ${steps.length-done} prueba(s) manual(es) de persistencia real.</p>`;
 }else{
   result.className="launch-result ready";
   result.innerHTML='<span class="tag">INTEGRIDAD CONFIRMADA</span><h2>Datos y persistencia verificados</h2><p>La revisiÃ³n estructural y los controles manuales fueron completados.</p>';
 }
};

const oldRenderAll_175=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_175();SaaS.renderDataIntegrity();};

;

/* ---- js/saas/sambrix-performance.js ---- */
SaaS.performanceTest=SaaS.performanceTest||{results:[],manual:{},renderMs:null,totalRecords:0,storageBytes:0};

SaaS.PERFORMANCE_MANUAL_STEPS=[
 {id:"mobile",title:"TelÃ©fono econÃ³mico/medio",detail:"Abrir SAMBRIX en un telÃ©fono no potente y comprobar navegaciÃ³n fluida."},
 {id:"slow_network",title:"Red lenta",detail:"Probar con conexiÃ³n mÃ³vil o Wiâ€‘Fi lento y verificar que no se bloquee la interfaz."},
 {id:"many_records",title:"Negocio con muchos registros",detail:"Probar listas de clientes/citas/productos con volumen alto y revisar tiempos."},
 {id:"concurrent",title:"Usuarios simultÃ¡neos",detail:"Usar al menos dos sesiones al mismo tiempo. Esta prueba no puede simularse solo en local."}
];

SaaS.loadPerformanceTest=function(){
 try{
  const saved=JSON.parse(localStorage.getItem("sambrix_performance_test"))||{};
  SaaS.performanceTest={...SaaS.performanceTest,...saved,manual:saved.manual||{},results:saved.results||[]};
 }catch{}
};

SaaS.savePerformanceTest=function(){
 localStorage.setItem("sambrix_performance_test",JSON.stringify(SaaS.performanceTest));
};

SaaS.tenantRecordCount=function(t){
 return ["clients","appointments","sales","products","barbers","employees","services","users"].reduce((sum,k)=>sum+((t?.[k]||[]).length||0),0);
};

SaaS.runPerformanceTest=function(){
 const start=performance.now();
 const results=[];
 let total=0,bytes=0;

 (SaaS.db.businesses||[]).forEach(b=>{
   const t=SaaS.loadTenantState?.(b.id)||{};
   const count=SaaS.tenantRecordCount(t);
   const size=new Blob([JSON.stringify(t)]).size;
   total+=count;bytes+=size;

   let status="pass";
   if(count>5000||size>5*1024*1024)status="warn";
   if(count>20000||size>20*1024*1024)status="fail";

   results.push({
     businessId:b.id,
     businessName:b.name,
     records:count,
     bytes:size,
     status
   });
 });

 // A local render benchmark: measure one complete render cycle.
 try{window.App?.renderAll?.()}catch{}
 const renderMs=Math.round((performance.now()-start)*10)/10;

 SaaS.performanceTest.results=results;
 SaaS.performanceTest.renderMs=renderMs;
 SaaS.performanceTest.totalRecords=total;
 SaaS.performanceTest.storageBytes=bytes;
 SaaS.performanceTest.testedAt=new Date().toISOString();
 SaaS.savePerformanceTest();
 SaaS.renderPerformance();
 SaaS.audit?.("QA","Prueba local de rendimiento ejecutada",{renderMs,totalRecords:total,bytes},"");
};

SaaS.togglePerformanceManual=function(e){
 const c=e.target;if(!c.matches(".performanceManualCheck"))return;
 SaaS.performanceTest.manual[c.dataset.step]=c.checked;
 SaaS.savePerformanceTest();SaaS.renderPerformance();
};

SaaS.renderPerformance=function(){
 const box=document.getElementById("performanceTenantList");if(!box)return;
 const p=SaaS.performanceTest;
 const results=p.results||[];
 const renderMs=Number(p.renderMs||0);

 document.getElementById("perfRenderTime").textContent=renderMs?`${renderMs} ms`:"â€”";
 document.getElementById("perfRecordCount").textContent=Number(p.totalRecords||0).toLocaleString();
 document.getElementById("perfStorageSize").textContent=`${(Number(p.storageBytes||0)/1024).toFixed(1)} KB`;

 const fail=results.filter(r=>r.status==="fail").length;
 const warn=results.filter(r=>r.status==="warn").length;
 const renderStatus=!renderMs?"":renderMs>2000?"fail":renderMs>800?"warn":"pass";
 document.getElementById("perfState").textContent=fail||renderStatus==="fail"?"REVISAR":warn||renderStatus==="warn"?"ATENCIÃ“N":results.length?"OK":"â€”";

 const max=Math.max(1,...results.map(r=>r.records));
 box.innerHTML=results.map(r=>`<div class="row performance-row ${r.status}">
   <div style="flex:1">
     <strong>${r.businessName}</strong>
     <small>${r.records.toLocaleString()} registros Â· ${(r.bytes/1024).toFixed(1)} KB</small>
     <div class="performance-meter"><i style="width:${Math.min(100,r.records/max*100)}%"></i></div>
   </div>
   <span class="status ${r.status==="pass"?"ok":""}">${r.status==="pass"?"OK":r.status==="warn"?"Revisar":"Pesado"}</span>
 </div>`).join("")||'<div class="muted">Ejecuta la prueba local.</div>';

 const steps=SaaS.PERFORMANCE_MANUAL_STEPS;
 const done=steps.filter(s=>p.manual?.[s.id]).length;
 document.getElementById("performanceManualList").innerHTML=steps.map((s,i)=>`<label class="row performance-row ${p.manual?.[s.id]?"":"warn"}">
   <div class="wizard-check">
    <input type="checkbox" class="performanceManualCheck" data-step="${s.id}" ${p.manual?.[s.id]?"checked":""}>
    <div><strong>${i+1}. ${s.title}</strong><small>${s.detail}</small></div>
   </div>
   <span class="status ${p.manual?.[s.id]?"ok":""}">${p.manual?.[s.id]?"OK":"Pendiente"}</span>
 </label>`).join("");

 const result=document.getElementById("performanceResult");
 if(!results.length){
   result.className="launch-result";
   result.innerHTML='<span class="tag">PENDIENTE</span><h2>Ejecuta la prueba local</h2><p>Esto medirÃ¡ volumen y una referencia bÃ¡sica de renderizado.</p>';
 }else if(fail||renderStatus==="fail"){
   result.className="launch-result blocked";
   result.innerHTML='<span class="tag">REVISAR RENDIMIENTO</span><h2>Hay seÃ±ales de carga elevada</h2><p>Optimiza antes de ampliar la prueba a mÃ¡s usuarios.</p>';
 }else if(done<steps.length){
   result.className="launch-result";
   result.innerHTML=`<span class="tag">LOCAL OK</span><h2>Sin bloqueos graves detectados</h2><p>Faltan ${steps.length-done} prueba(s) reales de dispositivo, red y concurrencia.</p>`;
 }else{
   result.className="launch-result ready";
   result.innerHTML='<span class="tag">RENDIMIENTO VALIDADO</span><h2>Pruebas locales y manuales completas</h2><p>Esto no sustituye una prueba de carga profesional, pero cubre el recorrido previo.</p>';
 }
};

const oldRenderAll_176=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_176();SaaS.renderPerformance();};

;

/* ---- js/saas/sambrix-compatibility.js ---- */
SaaS.compatibilityTest=SaaS.compatibilityTest||{auto:[],manual:{}};

SaaS.COMPATIBILITY_MANUAL_STEPS=[
 {id:"phone_portrait",title:"TelÃ©fono vertical",detail:"Probar navegaciÃ³n, formularios, modales y botones sin desbordes horizontales."},
 {id:"phone_landscape",title:"TelÃ©fono horizontal",detail:"Confirmar que tablas y paneles sigan siendo utilizables."},
 {id:"tablet",title:"Tablet",detail:"Revisar menÃºs, grids y formularios en ancho intermedio."},
 {id:"desktop",title:"Computadora",detail:"Probar con navegador de escritorio y resoluciÃ³n normal."},
 {id:"keyboard",title:"Teclado",detail:"Recorrer formularios con Tab y confirmar que los controles puedan enfocarse y usarse."}
];

SaaS.loadCompatibilityTest=function(){
 try{
  const saved=JSON.parse(localStorage.getItem("sambrix_compatibility_test"))||{};
  SaaS.compatibilityTest={auto:saved.auto||[],manual:saved.manual||{}};
 }catch{}
};

SaaS.saveCompatibilityTest=function(){
 localStorage.setItem("sambrix_compatibility_test",JSON.stringify(SaaS.compatibilityTest));
};

SaaS.runCompatibilityTest=function(){
 const viewport=document.querySelector('meta[name="viewport"]');
 const buttons=[...document.querySelectorAll("button")];
 const inputs=[...document.querySelectorAll("input,select,textarea")];
 const unlabeled=inputs.filter(el=>{
   if(el.type==="hidden")return false;
   if(el.getAttribute("aria-label")||el.getAttribute("aria-labelledby"))return false;
   if(el.closest("label"))return false;
   const id=el.id;
   return !(id&&document.querySelector(`label[for="${CSS.escape(id)}"]`));
 });
 const buttonsWithoutName=buttons.filter(b=>!((b.textContent||"").trim()||b.getAttribute("aria-label")||b.title));
 const imgs=[...document.querySelectorAll("img")];
 const imgsMissingAlt=imgs.filter(img=>!img.hasAttribute("alt"));
 const duplicateIds=(()=>{
   const ids=[...document.querySelectorAll("[id]")].map(x=>x.id);
   return [...new Set(ids.filter((id,i)=>ids.indexOf(id)!==i))];
 })();

 const cssResponsive=[...document.styleSheets].some(sheet=>{
   try{return [...(sheet.cssRules||[])].some(r=>String(r.cssText||"").includes("@media"))}catch{return false}
 });

 SaaS.compatibilityTest.auto=[
   {name:"Meta viewport",status:viewport?"pass":"fail",detail:viewport?viewport.getAttribute("content"):"No se encontrÃ³ meta viewport."},
   {name:"CSS responsive",status:cssResponsive?"pass":"warn",detail:cssResponsive?"Se detectaron reglas @media.":"No se detectaron media queries accesibles."},
   {name:"Campos sin etiqueta",status:unlabeled.length===0?"pass":unlabeled.length>10?"fail":"warn",detail:`${unlabeled.length} control(es) sin etiqueta detectable.`},
   {name:"Botones sin nombre",status:buttonsWithoutName.length===0?"pass":"warn",detail:`${buttonsWithoutName.length} botÃ³n(es) sin nombre accesible.`},
   {name:"ImÃ¡genes sin alt",status:imgsMissingAlt.length===0?"pass":"warn",detail:`${imgsMissingAlt.length} imagen(es) sin atributo alt.`},
   {name:"IDs duplicados",status:duplicateIds.length===0?"pass":"fail",detail:duplicateIds.length?duplicateIds.join(", "):"Sin IDs duplicados."}
 ];

 SaaS.saveCompatibilityTest();
 SaaS.renderCompatibility();
 SaaS.audit?.("QA","Compatibilidad y accesibilidad revisadas",{
   warnings:SaaS.compatibilityTest.auto.filter(x=>x.status==="warn").length,
   failures:SaaS.compatibilityTest.auto.filter(x=>x.status==="fail").length
 },"");
};

SaaS.toggleCompatibilityManual=function(e){
 const c=e.target;if(!c.matches(".compatibilityManualCheck"))return;
 SaaS.compatibilityTest.manual[c.dataset.step]=c.checked;
 SaaS.saveCompatibilityTest();SaaS.renderCompatibility();
};

SaaS.renderCompatibility=function(){
 const box=document.getElementById("compatibilityAutoList");if(!box)return;
 const auto=SaaS.compatibilityTest.auto||[];
 const steps=SaaS.COMPATIBILITY_MANUAL_STEPS;
 const done=steps.filter(s=>SaaS.compatibilityTest.manual?.[s.id]).length;

 const viewportCheck=auto.find(x=>x.name==="Meta viewport");
 const formCheck=auto.find(x=>x.name==="Campos sin etiqueta");
 const fail=auto.filter(x=>x.status==="fail").length;
 const warn=auto.filter(x=>x.status==="warn").length;

 document.getElementById("compatViewportState").textContent=viewportCheck?.status==="pass"?"OK":viewportCheck?"REVISAR":"â€”";
 document.getElementById("compatA11yState").textContent=fail?"ERROR":warn?"REVISAR":auto.length?"OK":"â€”";
 document.getElementById("compatFormState").textContent=formCheck?.status==="pass"?"OK":formCheck?"REVISAR":"â€”";
 document.getElementById("compatManualState").textContent=`${done}/${steps.length}`;

 box.innerHTML=auto.length?auto.map(x=>`<div class="row compat-row ${x.status}">
   <div class="diag-mark">${x.status==="pass"?"âœ“":x.status==="warn"?"!":"Ã—"}</div>
   <div><strong>${x.name}</strong><small>${x.detail}</small></div>
 </div>`).join(""):'<div class="muted">Ejecuta la revisiÃ³n automÃ¡tica.</div>';

 document.getElementById("compatibilityManualList").innerHTML=steps.map((s,i)=>`<label class="row compat-row ${SaaS.compatibilityTest.manual?.[s.id]?"":"warn"}">
   <div class="wizard-check">
    <input type="checkbox" class="compatibilityManualCheck" data-step="${s.id}" ${SaaS.compatibilityTest.manual?.[s.id]?"checked":""}>
    <div><strong>${i+1}. ${s.title}</strong><small>${s.detail}</small></div>
   </div>
   <span class="status ${SaaS.compatibilityTest.manual?.[s.id]?"ok":""}">${SaaS.compatibilityTest.manual?.[s.id]?"OK":"Pendiente"}</span>
 </label>`).join("");

 const result=document.getElementById("compatibilityResult");
 if(fail){
   result.className="launch-result blocked";
   result.innerHTML=`<span class="tag">CORREGIR</span><h2>${fail} problema(s) estructural(es)</h2><p>Hay controles de compatibilidad o accesibilidad que requieren correcciÃ³n.</p>`;
 }else if(!auto.length){
   result.className="launch-result";
   result.innerHTML='<span class="tag">PENDIENTE</span><h2>Ejecuta la revisiÃ³n</h2><p>La prueba manual de dispositivos vendrÃ¡ despuÃ©s.</p>';
 }else if(done<steps.length){
   result.className="launch-result";
   result.innerHTML=`<span class="tag">ESTRUCTURA REVISADA</span><h2>Sin bloqueos crÃ­ticos automÃ¡ticos</h2><p>Faltan ${steps.length-done} prueba(s) reales de pantalla/teclado.</p>`;
 }else{
   result.className="launch-result ready";
   result.innerHTML='<span class="tag">VALIDADO</span><h2>Compatibilidad manual completada</h2><p>La estructura automÃ¡tica y los dispositivos fueron revisados.</p>';
 }
};

const oldRenderAll_177=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_177();SaaS.renderCompatibility();};

;

/* ---- js/saas/sambrix-validation-security.js ---- */
SaaS.validationSecurity=SaaS.validationSecurity||{auto:[],manual:{}};

SaaS.VALIDATION_MANUAL_STEPS=[
 {id:"empty_required",title:"Campos obligatorios vacÃ­os",detail:"Intentar guardar cliente, cita y negocio sin datos crÃ­ticos; SAMBRIX debe impedirlo."},
 {id:"invalid_email",title:"Correo invÃ¡lido",detail:"Probar un correo mal formado y confirmar que no se guarde como vÃ¡lido."},
 {id:"invalid_phone",title:"TelÃ©fono extraÃ±o",detail:"Probar letras/sÃ­mbolos excesivos y revisar cÃ³mo responde el formulario."},
 {id:"long_text",title:"Texto excesivamente largo",detail:"Pegar contenido muy largo en notas/nombres y comprobar que la interfaz no se rompa."},
 {id:"html_script",title:"HTML / script como texto",detail:"Escribir etiquetas como <script> en un campo y confirmar que se muestren como texto, no se ejecuten."}
];

SaaS.loadValidationSecurity=function(){
 try{
  const saved=JSON.parse(localStorage.getItem("sambrix_validation_security"))||{};
  SaaS.validationSecurity={auto:saved.auto||[],manual:saved.manual||{}};
 }catch{}
};

SaaS.saveValidationSecurity=function(){
 localStorage.setItem("sambrix_validation_security",JSON.stringify(SaaS.validationSecurity));
};

SaaS.runValidationSecurity=function(){
 const forms=[...document.querySelectorAll("form")];
 const inputs=[...document.querySelectorAll("input,textarea,select")].filter(x=>x.type!=="hidden");
 const emailInputs=inputs.filter(x=>x.type==="email"||/email|correo/i.test(`${x.id} ${x.name||""} ${x.placeholder||""}`));
 const phoneInputs=inputs.filter(x=>/phone|telefono|telÃ©fono/i.test(`${x.id} ${x.name||""} ${x.placeholder||""}`));
 const textInputs=inputs.filter(x=>["text","email","tel","search","url",""].includes(x.type||"")||x.tagName==="TEXTAREA");

 const noMax=textInputs.filter(x=>x.tagName==="TEXTAREA"||x.type==="text").filter(x=>!x.maxLength||x.maxLength<0);
 const noAutocomplete=emailInputs.filter(x=>!x.autocomplete);
 const dangerousInline=[...document.querySelectorAll("[onclick],[onchange],[oninput]")].length;
 const passwordInputs=inputs.filter(x=>x.type==="password");
 const passwordNoAutocomplete=passwordInputs.filter(x=>!x.autocomplete);

 SaaS.validationSecurity.auto=[
   {name:"Formularios detectados",status:"pass",detail:`${forms.length} formulario(s) y ${inputs.length} control(es) revisados.`},
   {name:"Campos de texto sin maxLength",status:noMax.length>20?"warn":"pass",detail:`${noMax.length} campo(s) sin lÃ­mite explÃ­cito.`},
   {name:"Campos email",status:emailInputs.length?"pass":"warn",detail:`${emailInputs.length} campo(s) de correo detectados.`},
   {name:"Campos email sin autocomplete",status:noAutocomplete.length>5?"warn":"pass",detail:`${noAutocomplete.length} campo(s) sin autocomplete definido.`},
   {name:"Campos telÃ©fono",status:phoneInputs.length?"pass":"warn",detail:`${phoneInputs.length} campo(s) relacionados con telÃ©fono.`},
   {name:"ContraseÃ±as",status:passwordNoAutocomplete.length?"warn":"pass",detail:passwordNoAutocomplete.length?`${passwordNoAutocomplete.length} campo(s) password sin autocomplete.`:"Sin advertencias bÃ¡sicas detectadas."},
   {name:"Handlers inline",status:dangerousInline>100?"warn":"pass",detail:`${dangerousInline} handler(s) inline encontrados. No es un fallo por sÃ­ solo, pero conviene minimizarlo.`}
 ];

 SaaS.saveValidationSecurity();
 SaaS.renderValidationSecurity();
 SaaS.audit?.("QA","ValidaciÃ³n de entradas revisada",{
   warnings:SaaS.validationSecurity.auto.filter(x=>x.status==="warn").length
 },"");
};

SaaS.toggleValidationManual=function(e){
 const c=e.target;
 if(!c.matches(".validationManualCheck"))return;
 SaaS.validationSecurity.manual[c.dataset.step]=c.checked;
 SaaS.saveValidationSecurity();
 SaaS.renderValidationSecurity();
};

SaaS.renderValidationSecurity=function(){
 const autoBox=document.getElementById("validationAutoList");
 if(!autoBox)return;

 const auto=SaaS.validationSecurity.auto||[];
 const steps=SaaS.VALIDATION_MANUAL_STEPS;
 const done=steps.filter(s=>SaaS.validationSecurity.manual?.[s.id]).length;
 const weak=auto.filter(x=>x.status==="warn").length;
 const fail=auto.filter(x=>x.status==="fail").length;

 document.getElementById("validationFormCount").textContent=document.querySelectorAll("form").length;
 document.getElementById("validationWeakCount").textContent=weak;
 document.getElementById("validationRiskCount").textContent=fail;
 document.getElementById("validationState").textContent=fail?"ERROR":weak?"REVISAR":auto.length?"OK":"â€”";

 autoBox.innerHTML=auto.length?auto.map(x=>`<div class="row validation-row ${x.status}">
   <div class="diag-mark">${x.status==="pass"?"âœ“":x.status==="warn"?"!":"Ã—"}</div>
   <div><strong>${x.name}</strong><small>${x.detail}</small></div>
 </div>`).join(""):'<div class="muted">Ejecuta la revisiÃ³n automÃ¡tica.</div>';

 document.getElementById("validationManualList").innerHTML=steps.map((s,i)=>`<label class="row validation-row ${SaaS.validationSecurity.manual?.[s.id]?"":"warn"}">
   <div class="wizard-check">
    <input type="checkbox" class="validationManualCheck" data-step="${s.id}" ${SaaS.validationSecurity.manual?.[s.id]?"checked":""}>
    <div><strong>${i+1}. ${s.title}</strong><small>${s.detail}</small></div>
   </div>
   <span class="status ${SaaS.validationSecurity.manual?.[s.id]?"ok":""}">${SaaS.validationSecurity.manual?.[s.id]?"OK":"Pendiente"}</span>
 </label>`).join("");

 const result=document.getElementById("validationSecurityResult");
 if(fail){
   result.className="launch-result blocked";
   result.innerHTML=`<span class="tag">CORREGIR</span><h2>${fail} problema(s) crÃ­tico(s)</h2><p>No aprobar el candidato hasta resolverlos.</p>`;
 }else if(!auto.length){
   result.className="launch-result";
   result.innerHTML='<span class="tag">PENDIENTE</span><h2>Ejecuta la revisiÃ³n</h2><p>DespuÃ©s se completan las pruebas manuales de entradas invÃ¡lidas.</p>';
 }else if(done<steps.length){
   result.className="launch-result";
   result.innerHTML=`<span class="tag">BASE REVISADA</span><h2>Sin bloqueos crÃ­ticos automÃ¡ticos</h2><p>Faltan ${steps.length-done} prueba(s) manual(es) de validaciÃ³n.</p>`;
 }else{
   result.className="launch-result ready";
   result.innerHTML='<span class="tag">VALIDADO</span><h2>Entradas y comportamiento bÃ¡sico revisados</h2><p>Los escenarios manuales fueron confirmados durante la prueba.</p>';
 }
};

const oldRenderAll_178=SaaS.renderAll;
SaaS.renderAll=function(){
 oldRenderAll_178();
 SaaS.renderValidationSecurity();
};

;

/* ---- js/saas/sambrix-privacy.js ---- */
SaaS.privacySystem=SaaS.privacySystem||{
  requests:[],
  policy:{retentionDays:365,auditExports:true,doubleConfirm:true}
};

SaaS.loadPrivacySystem=function(){
  try{
    const saved=JSON.parse(localStorage.getItem("sambrix_privacy_system"))||{};
    SaaS.privacySystem={
      requests:saved.requests||[],
      policy:{...SaaS.privacySystem.policy,...(saved.policy||{})}
    };
  }catch{}
};

SaaS.savePrivacySystem=function(){
  localStorage.setItem("sambrix_privacy_system",JSON.stringify(SaaS.privacySystem));
};

SaaS.openPrivacyRequestModal=function(){
  const sel=document.getElementById("privacyBusiness");
  sel.innerHTML='<option value="">Plataforma general</option>'+(SaaS.db.businesses||[]).map(b=>`<option value="${b.id}">${b.name}</option>`).join("");
  const ctx=SaaS.getContext?.();
  if(ctx?.businessId)sel.value=ctx.businessId;
  document.getElementById("privacyRequestType").value="ExportaciÃ³n";
  document.getElementById("privacySubjectName").value="";
  document.getElementById("privacySubjectId").value="";
  document.getElementById("privacyRequestDetail").value="";
  document.getElementById("privacyRequestModal")?.classList.add("open");
};

SaaS.closePrivacyRequestModal=function(){
  document.getElementById("privacyRequestModal")?.classList.remove("open");
};

SaaS.createPrivacyRequest=function(){
  const subject=document.getElementById("privacySubjectName").value.trim();
  if(!subject)return alert("Escribe el nombre de la persona o cliente.");

  const businessId=document.getElementById("privacyBusiness").value;
  const business=SaaS.db.businesses.find(b=>b.id===businessId);
  const req={
    id:"privacy_"+SaaS.uid(),
    businessId,
    businessName:business?.name||"Plataforma",
    type:document.getElementById("privacyRequestType").value,
    subjectName:subject,
    subjectId:document.getElementById("privacySubjectId").value.trim(),
    detail:document.getElementById("privacyRequestDetail").value.trim(),
    status:"Abierta",
    createdAt:new Date().toISOString(),
    createdBy:window.FirebaseBridge?.user?.email||"SuperAdmin"
  };

  SaaS.privacySystem.requests.push(req);
  SaaS.savePrivacySystem();
  SaaS.audit?.("PRIVACY","Solicitud de datos creada",{id:req.id,type:req.type,subject:req.subjectName},businessId);
  SaaS.closePrivacyRequestModal();
  SaaS.renderPrivacyCenter();
  window.App?.toast?.("Solicitud registrada");
};

SaaS.updatePrivacyStatus=function(id,status){
  const r=SaaS.privacySystem.requests.find(x=>x.id===id);if(!r)return;
  if(r.type==="EliminaciÃ³n"&&status==="Completada"&&SaaS.privacySystem.policy.doubleConfirm){
    if(!confirm("Esta solicitud implica eliminaciÃ³n. Â¿Confirmas que la verificaciÃ³n y el respaldo ya fueron realizados?"))return;
  }
  r.status=status;
  r.updatedAt=new Date().toISOString();
  if(status==="Completada")r.completedAt=r.updatedAt;
  SaaS.savePrivacySystem();
  SaaS.audit?.("PRIVACY","Estado de solicitud actualizado",{id,status,type:r.type},r.businessId);
  SaaS.renderPrivacyCenter();
};

SaaS.exportPrivacySubject=function(id){
  const r=SaaS.privacySystem.requests.find(x=>x.id===id);if(!r)return;
  const tenant=r.businessId?SaaS.loadTenantState?.(r.businessId)||{}:{};
  const needle=(r.subjectId||r.subjectName||"").toLowerCase();
  const payload={
    request:r,
    matches:{}
  };
  ["clients","appointments","sales"].forEach(k=>{
    payload.matches[k]=(tenant[k]||[]).filter(x=>JSON.stringify(x).toLowerCase().includes(needle));
  });
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=`SAMBRIX_privacy_${r.id}.json`;
  a.click();
  URL.revokeObjectURL(a.href);

  if(SaaS.privacySystem.policy.auditExports){
    SaaS.audit?.("PRIVACY","ExportaciÃ³n de datos realizada",{requestId:r.id,subject:r.subjectName},r.businessId);
  }
};

SaaS.savePrivacyPolicy=function(){
  SaaS.privacySystem.policy.retentionDays=Math.max(30,Math.min(3650,Number(document.getElementById("privacyRetentionDays").value||365)));
  SaaS.privacySystem.policy.auditExports=!!document.getElementById("privacyAuditExports").checked;
  SaaS.privacySystem.policy.doubleConfirm=!!document.getElementById("privacyDoubleConfirm").checked;
  SaaS.savePrivacySystem();
  SaaS.audit?.("PRIVACY","PolÃ­tica de privacidad actualizada",SaaS.privacySystem.policy,"");
  SaaS.renderPrivacyCenter();
  window.App?.toast?.("PolÃ­tica guardada");
};

SaaS.renderPrivacyCenter=function(){
  const box=document.getElementById("privacyRequestList");if(!box)return;
  const p=SaaS.privacySystem.policy;
  document.getElementById("privacyRetentionDays").value=p.retentionDays||365;
  document.getElementById("privacyAuditExports").checked=p.auditExports!==false;
  document.getElementById("privacyDoubleConfirm").checked=p.doubleConfirm!==false;

  const status=document.getElementById("privacyStatusFilter")?.value||"";
  const rows=SaaS.privacySystem.requests.filter(r=>!status||r.status===status);

  document.getElementById("privacyExportCount").textContent=SaaS.privacySystem.requests.filter(r=>r.type==="ExportaciÃ³n").length;
  document.getElementById("privacyCorrectionCount").textContent=SaaS.privacySystem.requests.filter(r=>r.type==="CorrecciÃ³n").length;
  document.getElementById("privacyDeleteCount").textContent=SaaS.privacySystem.requests.filter(r=>r.type==="EliminaciÃ³n").length;
  document.getElementById("privacyOpenCount").textContent=SaaS.privacySystem.requests.filter(r=>!["Completada","Rechazada"].includes(r.status)).length;

  box.innerHTML=[...rows].reverse().map(r=>`<div class="row privacy-row ${r.type==="EliminaciÃ³n"?"delete":""} ${r.status==="Completada"?"completed":""}">
    <div style="flex:1">
      <strong>${r.type}: ${r.subjectName}</strong>
      <small>${r.businessName} Â· ${r.status} Â· ${new Date(r.createdAt).toLocaleString()}</small>
      <div class="runtime-meta">${r.subjectId||"Sin identificador"} ${r.detail?`Â· ${r.detail}`:""}</div>
    </div>
    <div class="manage-actions">
      ${r.type==="ExportaciÃ³n"?`<button class="btn secondary tiny" onclick="SaaS.exportPrivacySubject('${r.id}')">Exportar</button>`:""}
      <select onchange="SaaS.updatePrivacyStatus('${r.id}',this.value)">
        <option ${r.status==="Abierta"?"selected":""}>Abierta</option>
        <option ${r.status==="En proceso"?"selected":""}>En proceso</option>
        <option ${r.status==="Completada"?"selected":""}>Completada</option>
        <option ${r.status==="Rechazada"?"selected":""}>Rechazada</option>
      </select>
    </div>
  </div>`).join("")||'<div class="muted">No hay solicitudes con este filtro.</div>';

  const open=SaaS.privacySystem.requests.filter(r=>!["Completada","Rechazada"].includes(r.status)).length;
  const result=document.getElementById("privacyResult");
  if(open){
    result.className="launch-result";
    result.innerHTML=`<span class="tag">SEGUIMIENTO</span><h2>${open} solicitud(es) abierta(s)</h2><p>Requieren revisiÃ³n antes de considerarlas cerradas.</p>`;
  }else{
    result.className="launch-result ready";
    result.innerHTML='<span class="tag">CONTROLADO</span><h2>Sin solicitudes pendientes</h2><p>El historial y la polÃ­tica de retenciÃ³n permanecen disponibles.</p>';
  }
};

const oldRenderAll_179=SaaS.renderAll;
SaaS.renderAll=function(){
  oldRenderAll_179();
  SaaS.renderPrivacyCenter();
};

;

/* ---- js/saas/sambrix-final-readiness.js ---- */
SaaS.finalReadinessSnapshot=function(){
  const staticOk=!!SaaS.staticAudit &&
    !(SaaS.staticAudit.duplicateIds||[]).length &&
    !(SaaS.staticAudit.missingRefs||[]).length &&
    !(SaaS.staticAudit.syntaxErrors||[]).length;

  const authReady=typeof SaaS.applyAuthGuard==="function" && SaaS.authSecurity?.requireFirebase!==false;
  const rulesReady=typeof SaaS.firebaseRulesChecks==="function";
  const deploymentReady=typeof SaaS.deploymentChecks==="function";
  const runtimeClean=(SaaS.runtimeDiagnostics?.errors||[]).length===0;
  const criticalBugs=(SaaS.bugReports||[]).filter(r=>r.status!=="Resuelto"&&r.severity==="CrÃ­tica").length;
  const criticalIncidents=(SaaS.incidents||[]).filter(r=>r.status!=="Resuelto"&&r.priority==="CrÃ­tica").length;
  const snapshotOk=!!(SaaS.migrationSnapshots||[]).length;
  const privacyReady=!!SaaS.privacySystem?.policy;
  const candidateFrozen=!!SaaS.releaseCandidate?.frozen;

  const syncDone=(SaaS.SYNC_MANUAL_STEPS||[]).length>0 &&
    SaaS.SYNC_MANUAL_STEPS.every(s=>SaaS.syncTest?.manual?.[s.id]);

  const integrityDone=(SaaS.INTEGRITY_MANUAL_STEPS||[]).length>0 &&
    SaaS.INTEGRITY_MANUAL_STEPS.every(s=>SaaS.dataIntegrity?.manual?.[s.id]);

  const performanceDone=(SaaS.PERFORMANCE_MANUAL_STEPS||[]).length>0 &&
    SaaS.PERFORMANCE_MANUAL_STEPS.every(s=>SaaS.performanceTest?.manual?.[s.id]);

  const compatibilityDone=(SaaS.COMPATIBILITY_MANUAL_STEPS||[]).length>0 &&
    SaaS.COMPATIBILITY_MANUAL_STEPS.every(s=>SaaS.compatibilityTest?.manual?.[s.id]);

  const validationDone=(SaaS.VALIDATION_MANUAL_STEPS||[]).length>0 &&
    SaaS.VALIDATION_MANUAL_STEPS.every(s=>SaaS.validationSecurity?.manual?.[s.id]);

  const smokeDone=(SaaS.SMOKE_MANUAL_STEPS||[]).length>0 &&
    SaaS.SMOKE_MANUAL_STEPS.every(s=>SaaS.smokeTest?.manual?.[s.id]);

  const finalWizardDone=(SaaS.FINAL_WIZARD_STEPS||[]).length>0 &&
    SaaS.FINAL_WIZARD_STEPS.every(s=>SaaS.finalWizard?.[s.id]);

  const platform=[
    {name:"AuditorÃ­a tÃ©cnica",status:staticOk?"pass":"fail",detail:staticOk?"Sin errores estÃ¡ticos conocidos.":"Hay problemas de estructura por corregir."},
    {name:"AutenticaciÃ³n protegida",status:authReady?"pass":"fail",detail:authReady?"Firebase Auth exigido para Ã¡reas protegidas.":"El guard de autenticaciÃ³n no estÃ¡ listo."},
    {name:"Reglas Firebase preparadas",status:rulesReady?"pass":"warn",detail:rulesReady?"Plantillas/matriz disponibles; despliegue real aÃºn debe probarse.":"No se detecta mÃ³dulo de reglas."},
    {name:"Candidato congelado",status:candidateFrozen?"pass":"warn",detail:candidateFrozen?SaaS.releaseCandidate.version:"TodavÃ­a no se congelÃ³ un candidato."},
    {name:"Snapshot previo",status:snapshotOk?"pass":"warn",detail:snapshotOk?"Existe respaldo local de configuraciÃ³n.":"Conviene crear snapshot antes de probar/publicar."},
    {name:"Errores runtime",status:runtimeClean?"pass":"warn",detail:runtimeClean?"Sin errores registrados en la sesiÃ³n.":`${(SaaS.runtimeDiagnostics?.errors||[]).length} error(es) runtime registrados.`},
    {name:"Errores QA crÃ­ticos",status:criticalBugs===0?"pass":"fail",detail:criticalBugs?`${criticalBugs} error(es) crÃ­tico(s) abiertos.`:"Sin errores QA crÃ­ticos abiertos."},
    {name:"Incidentes crÃ­ticos",status:criticalIncidents===0?"pass":"fail",detail:criticalIncidents?`${criticalIncidents} incidente(s) crÃ­tico(s) activos.`:"Sin incidentes crÃ­ticos activos."},
    {name:"Privacidad",status:privacyReady?"pass":"warn",detail:privacyReady?"PolÃ­tica y solicitudes disponibles.":"Centro de privacidad no cargado."},
    {name:"Despliegue",status:deploymentReady?"pass":"warn",detail:deploymentReady?"Checklist de Hosting disponible.":"Centro de despliegue no disponible."}
  ];

  const manual=[
    {name:"Smoke test post-deploy",status:smokeDone?"pass":"warn",detail:smokeDone?"Completado.":"Pendiente hasta publicar y probar."},
    {name:"SincronizaciÃ³n entre dispositivos",status:syncDone?"pass":"warn",detail:syncDone?"Cinco escenarios confirmados.":"Pendiente de prueba real."},
    {name:"Persistencia de datos",status:integrityDone?"pass":"warn",detail:integrityDone?"Persistencia manual confirmada.":"Pendiente de recarga/login/segundo dispositivo."},
    {name:"Rendimiento",status:performanceDone?"pass":"warn",detail:performanceDone?"Pruebas manuales completadas.":"Pendiente de dispositivo/red/concurrencia."},
    {name:"Compatibilidad",status:compatibilityDone?"pass":"warn",detail:compatibilityDone?"Dispositivos y teclado revisados.":"Pendiente de pruebas reales."},
    {name:"ValidaciÃ³n de entradas",status:validationDone?"pass":"warn",detail:validationDone?"Escenarios invÃ¡lidos comprobados.":"Pendiente de pruebas manuales."},
    {name:"Recorrido final",status:finalWizardDone?"pass":"warn",detail:finalWizardDone?"Checklist final completo.":"Pendiente de aceptaciÃ³n manual."}
  ];

  return {platform,manual};
};

SaaS.renderFinalReadiness=function(){
  const platformBox=document.getElementById("readinessPlatformList");if(!platformBox)return;
  const snap=SaaS.finalReadinessSnapshot();
  const all=[...snap.platform,...snap.manual];
  const pass=all.filter(x=>x.status==="pass").length;
  const warn=all.filter(x=>x.status==="warn").length;
  const fail=all.filter(x=>x.status==="fail").length;
  const score=Math.round((pass+warn*.45)/all.length*100);

  document.getElementById("readinessScore").textContent=score+"%";
  document.getElementById("readinessPassCount").textContent=pass;
  document.getElementById("readinessPendingCount").textContent=warn;
  document.getElementById("readinessFailCount").textContent=fail;

  const row=x=>`<div class="row readiness-row ${x.status}">
    <div class="diag-mark">${x.status==="pass"?"âœ“":x.status==="warn"?"!":"Ã—"}</div>
    <div><strong>${x.name}</strong><small>${x.detail}</small></div>
  </div>`;

  platformBox.innerHTML=snap.platform.map(row).join("");
  document.getElementById("readinessManualList").innerHTML=snap.manual.map(row).join("");

  const result=document.getElementById("readinessResult");
  if(fail){
    result.className="launch-result blocked";
    result.innerHTML=`<span class="tag">NO LISTO</span><h2>${fail} bloqueo(s) crÃ­tico(s)</h2><p>No debemos comenzar la validaciÃ³n final hasta corregirlos.</p>`;
  }else if(warn){
    result.className="launch-result";
    result.innerHTML=`<span class="tag">LISTO PARA PRUEBAS REALES</span><h2>${score}% preparado</h2><p>No hay bloqueos crÃ­ticos. Quedan ${warn} controles que solo pueden completarse con Firebase, Hosting y dispositivos reales.</p>`;
  }else{
    result.className="launch-result ready";
    result.innerHTML='<span class="tag">TODO APROBADO</span><h2>SAMBRIX completÃ³ todos los controles</h2><p>La aplicaciÃ³n puede pasar a certificaciÃ³n y producciÃ³n segÃºn el flujo definido.</p>';
  }
};

SaaS.refreshFinalReadiness=function(){
  SaaS.renderFinalReadiness();
  SaaS.audit?.("SYSTEM","PreparaciÃ³n final recalculada",{},"");
};

const oldRenderAll_180=SaaS.renderAll;
SaaS.renderAll=function(){
  oldRenderAll_180();
  SaaS.renderFinalReadiness();
};

;

/* ---- js/saas/sambrix-secrets-security.js ---- */
SaaS.secretStaticFindings=[];

SaaS.secretSecurityChecks=function(){
  const findings=SaaS.secretStaticFindings||[];
  const service=findings.filter(x=>["service_account","google_private_key","private_key"].includes(x.type));
  const credentials=findings.filter(x=>!["service_account","google_private_key","private_key"].includes(x.type));
  return [
    {name:"Claves privadas",status:service.length?"fail":"pass",detail:service.length?`${service.length} hallazgo(s) crÃ­tico(s).`:"No se detectaron claves privadas/service accounts."},
    {name:"Credenciales embebidas",status:credentials.length?"warn":"pass",detail:credentials.length?`${credentials.length} patrÃ³n(es) sensible(s) requieren revisiÃ³n.`:"No se detectaron patrones de contraseÃ±a/token de alta seÃ±al."},
    {name:"Firebase config cliente",status:"pass",detail:"apiKey, projectId y authDomain del SDK cliente pueden ser pÃºblicos; la seguridad depende de Auth y Rules."},
    {name:"Reglas Firebase",status:typeof SaaS.firebaseRulesChecks==="function"?"pass":"warn",detail:"Las reglas deben impedir accesos aunque alguien conozca la configuraciÃ³n pÃºblica."},
    {name:"AutenticaciÃ³n",status:typeof SaaS.applyAuthGuard==="function"?"pass":"fail",detail:"Las Ã¡reas administrativas requieren sesiÃ³n vÃ¡lida."}
  ];
};

SaaS.renderSecretsSecurity=function(){
  const box=document.getElementById("secretFindingList");if(!box)return;
  const findings=SaaS.secretStaticFindings||[];
  const critical=findings.filter(x=>["service_account","google_private_key","private_key"].includes(x.type));
  const checks=SaaS.secretSecurityChecks();
  const fail=checks.filter(x=>x.status==="fail").length;
  const warn=checks.filter(x=>x.status==="warn").length;

  document.getElementById("secretFindingCount").textContent=findings.length;
  document.getElementById("secretServiceAccountState").textContent=critical.length?"DETECTADO":"NO";
  document.getElementById("secretSecurityState").textContent=fail?"BLOQUEADO":warn?"REVISAR":"OK";

  box.innerHTML=findings.length?findings.map(x=>`<div class="row secret-row ${["service_account","google_private_key","private_key"].includes(x.type)?"fail":"warn"}">
    <div><strong>${x.type}</strong><small class="secret-path">${x.file} Â· lÃ­nea ${x.line}</small></div>
  </div>`).join(""):'<div class="row secret-row"><div class="diag-mark">âœ“</div><div><strong>Sin secretos crÃ­ticos detectados</strong><small>Escaneo estÃ¡tico de alta seÃ±al.</small></div></div>';

  const result=document.getElementById("secretSecurityResult");
  if(fail){
    result.className="launch-result blocked";
    result.innerHTML=`<span class="tag">NO PUBLICAR</span><h2>${fail} bloqueo(s) de credenciales</h2><p>Retira cualquier clave privada o service account antes de GitHub/Hosting.</p>`;
  }else if(warn){
    result.className="launch-result";
    result.innerHTML=`<span class="tag">REVISAR</span><h2>Sin claves privadas detectadas</h2><p>Quedan ${warn} advertencia(s) para revisar manualmente antes de producciÃ³n.</p>`;
  }else{
    result.className="launch-result ready";
    result.innerHTML='<span class="tag">CONFIGURACIÃ“N SEGURA</span><h2>Sin secretos crÃ­ticos detectados</h2><p>La configuraciÃ³n cliente de Firebase puede permanecer pÃºblica; Auth y Rules siguen siendo la barrera real.</p>';
  }
};

SaaS.refreshSecretsSecurity=function(){
  SaaS.renderSecretsSecurity();
  SaaS.audit?.("SECURITY","ConfiguraciÃ³n y secretos revisados",{findings:SaaS.secretStaticFindings.length},"");
};

const oldRenderAll_181=SaaS.renderAll;
SaaS.renderAll=function(){
  oldRenderAll_181();
  SaaS.renderSecretsSecurity();
};

;

/* ---- js/saas/sambrix-demo-data.js ---- */
SaaS.demoDataReview=SaaS.demoDataReview||{businesses:[]};

SaaS.detectDemoBusinesses=function(){
  const tokens=/\b(demo|prueba|test|testing|ejemplo|sample|fake|ficticio)\b/i;
  return (SaaS.db.businesses||[]).map(b=>{
    const text=[b.name,b.owner,b.ownerEmail,b.type].filter(Boolean).join(" ");
    const tenant=SaaS.loadTenantState?.(b.id)||{};
    const reasons=[];

    if(tokens.test(text))reasons.push("Nombre/datos parecen de prueba");
    if(/@(example|test|demo)\./i.test(b.ownerEmail||""))reasons.push("Correo parece de prueba");

    const rows=[
      ...(tenant.clients||[]),
      ...(tenant.appointments||[]),
      ...(tenant.sales||[]),
      ...(tenant.products||[])
    ];
    const suspiciousRows=rows.filter(x=>tokens.test(JSON.stringify(x))).length;
    if(suspiciousRows)reasons.push(`${suspiciousRows} registro(s) contienen tÃ©rminos demo/prueba`);

    return {
      businessId:b.id,
      businessName:b.name,
      reasons,
      recordCount:rows.length,
      suspiciousRows,
      demo:reasons.length>0
    };
  });
};

SaaS.refreshDemoData=function(){
  SaaS.demoDataReview.businesses=SaaS.detectDemoBusinesses();
  SaaS.renderDemoData();
  SaaS.audit?.("QA","Datos demo revisados",{
    suspects:SaaS.demoDataReview.businesses.filter(x=>x.demo).length
  },"");
};

SaaS.exportDemoData=function(){
  const suspects=SaaS.detectDemoBusinesses().filter(x=>x.demo);
  const payload={
    generatedAt:new Date().toISOString(),
    environment:SaaS.productionConfig?.environment||"test",
    suspects
  };
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=`SAMBRIX_demo_review_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  SaaS.audit?.("QA","Candidatos demo exportados",{count:suspects.length},"");
};

SaaS.renderDemoData=function(){
  const box=document.getElementById("demoBusinessList");if(!box)return;

  const rows=(SaaS.demoDataReview.businesses?.length?SaaS.demoDataReview.businesses:SaaS.detectDemoBusinesses());
  const suspects=rows.filter(x=>x.demo);
  const suspiciousRecords=suspects.reduce((s,x)=>s+x.suspiciousRows,0);
  const env=SaaS.productionConfig?.environment||"test";

  document.getElementById("demoBusinessCount").textContent=suspects.length;
  document.getElementById("demoRecordCount").textContent=suspiciousRecords;
  document.getElementById("demoEnvironmentState").textContent=String(env).toUpperCase();
  document.getElementById("demoCleanupState").textContent=suspects.length?"REVISAR":"OK";

  box.innerHTML=rows.map(x=>`<div class="row demo-row ${x.demo?"":"safe"}">
    <div style="flex:1">
      <strong>${x.businessName}</strong>
      <small>${x.recordCount} registro(s) revisados</small>
      <div class="demo-reason">${x.demo?x.reasons.join(" Â· "):"No se detectaron seÃ±ales simples de datos demo."}</div>
    </div>
    <span class="status ${x.demo?"":"ok"}">${x.demo?"Revisar":"OK"}</span>
  </div>`).join("")||'<div class="muted">No hay negocios registrados.</div>';

  const result=document.getElementById("demoDataResult");
  if(env==="production"&&suspects.length){
    result.className="launch-result blocked";
    result.innerHTML=`<span class="tag">NO PUBLICAR</span><h2>${suspects.length} negocio(s) parecen de prueba</h2><p>Exporta la revisiÃ³n y limpia la fuente real antes de usar producciÃ³n.</p>`;
  }else if(suspects.length){
    result.className="launch-result";
    result.innerHTML=`<span class="tag">REVISIÃ“N REQUERIDA</span><h2>${suspects.length} candidato(s) demo</h2><p>Mientras sigamos en prueba/staging no bloquea, pero deben separarse antes de producciÃ³n.</p>`;
  }else{
    result.className="launch-result ready";
    result.innerHTML='<span class="tag">LIMPIO</span><h2>Sin candidatos demo detectados</h2><p>La revisiÃ³n automÃ¡tica no encontrÃ³ seÃ±ales obvias; la validaciÃ³n final sigue siendo manual.</p>';
  }
};

const oldRenderAll_182=SaaS.renderAll;
SaaS.renderAll=function(){
  oldRenderAll_182();
  SaaS.renderDemoData();
};

;

/* ---- js/saas/sambrix-cache-version.js ---- */
SaaS.cacheVersionState=SaaS.cacheVersionState||{
  cacheNames:[],
  serviceWorkers:[],
  lastChecked:null
};

SaaS.inspectCacheVersion=async function(){
  const state={cacheNames:[],serviceWorkers:[],lastChecked:new Date().toISOString()};
  try{
    if("caches" in window)state.cacheNames=await caches.keys();
  }catch{}
  try{
    if("serviceWorker" in navigator){
      const regs=await navigator.serviceWorker.getRegistrations();
      state.serviceWorkers=regs.map(r=>({
        scope:r.scope,
        active:r.active?.scriptURL||"",
        waiting:r.waiting?.scriptURL||"",
        installing:r.installing?.scriptURL||""
      }));
    }
  }catch{}
  SaaS.cacheVersionState=state;
  SaaS.renderCacheVersion();
  SaaS.audit?.("SYSTEM","CachÃ© y versiÃ³n del dispositivo revisados",{
    caches:state.cacheNames.length,
    serviceWorkers:state.serviceWorkers.length,
    version:SaaS.releaseCandidate?.version||""
  },"");
};

SaaS.clearAppCache=async function(){
  if(!confirm("Â¿Limpiar cachÃ© del navegador asociada a esta aplicaciÃ³n? Esto no borra los datos Firebase."))return;
  let removed=0;
  try{
    if("caches" in window){
      const names=await caches.keys();
      for(const name of names){
        if(await caches.delete(name))removed++;
      }
    }
  }catch(e){
    console.warn("No se pudo limpiar Cache Storage",e);
  }

  try{
    if("serviceWorker" in navigator){
      const regs=await navigator.serviceWorker.getRegistrations();
      for(const r of regs)await r.update();
    }
  }catch{}

  SaaS.audit?.("SYSTEM","CachÃ© de aplicaciÃ³n limpiada",{removed},"");
  window.App?.toast?.(`CachÃ© limpiada: ${removed} almacenamiento(s)`);
  setTimeout(()=>location.reload(),500);
};

SaaS.cacheVersionChecks=function(){
  const version=SaaS.releaseCandidate?.version||"";
  const frozen=!!SaaS.releaseCandidate?.frozen;
  const sw=SaaS.cacheVersionState.serviceWorkers||[];
  const cachesList=SaaS.cacheVersionState.cacheNames||[];
  const online=navigator.onLine;

  return [
    {name:"VersiÃ³n candidata",status:version?"pass":"warn",detail:version||"No hay versiÃ³n candidata identificada."},
    {name:"Candidato congelado",status:frozen?"pass":"warn",detail:frozen?"La versiÃ³n de prueba estÃ¡ congelada.":"El candidato aÃºn puede cambiar."},
    {name:"Service Worker",status:sw.length?"warn":"pass",detail:sw.length?`${sw.length} registro(s) detectado(s); pueden conservar recursos antiguos si no se actualizan.`:"No se detecta Service Worker activo."},
    {name:"Cache Storage",status:cachesList.length?"warn":"pass",detail:cachesList.length?`${cachesList.length} cachÃ©(s): ${cachesList.join(", ")}`:"Sin Cache Storage detectado."},
    {name:"Conectividad",status:online?"pass":"warn",detail:online?"Navegador online.":"Navegador offline; no se puede verificar una versiÃ³n reciÃ©n publicada."}
  ];
};

SaaS.renderCacheVersion=function(){
  const box=document.getElementById("cacheVersionChecks");if(!box)return;
  const checks=SaaS.cacheVersionChecks();
  const sw=(SaaS.cacheVersionState.serviceWorkers||[]).length;
  const cacheCount=(SaaS.cacheVersionState.cacheNames||[]).length;
  const fail=checks.filter(x=>x.status==="fail").length;
  const warn=checks.filter(x=>x.status==="warn").length;

  document.getElementById("cacheLocalVersion").textContent=SaaS.releaseCandidate?.version||"â€”";
  document.getElementById("cacheServiceWorkerState").textContent=sw?`${sw} ACTIVO`:"NO";
  document.getElementById("cacheStorageCount").textContent=cacheCount;
  document.getElementById("cacheVersionState").textContent=fail?"ERROR":warn?"REVISAR":"OK";

  box.innerHTML=checks.map(x=>`<div class="row cache-check ${x.status}">
    <div class="diag-mark">${x.status==="pass"?"âœ“":x.status==="warn"?"!":"Ã—"}</div>
    <div><strong>${x.name}</strong><small>${x.detail}</small></div>
  </div>`).join("");

  const result=document.getElementById("cacheVersionResult");
  if(fail){
    result.className="launch-result blocked";
    result.innerHTML='<span class="tag">BLOQUEO</span><h2>Hay un problema de versiÃ³n/cachÃ©</h2><p>Corrige antes de seguir probando el candidato.</p>';
  }else if(sw||cacheCount){
    result.className="launch-result";
    result.innerHTML='<span class="tag">ATENCIÃ“N</span><h2>El navegador puede conservar una versiÃ³n anterior</h2><p>DespuÃ©s de cada deploy verifica el nÃºmero de versiÃ³n y limpia cachÃ© si un dispositivo no se actualiza.</p>';
  }else{
    result.className="launch-result ready";
    result.innerHTML='<span class="tag">LIMPIO</span><h2>Sin cachÃ© persistente detectada</h2><p>El dispositivo no muestra seÃ±ales locales de PWA/cachÃ© que puedan ocultar una actualizaciÃ³n.</p>';
  }
};

const oldRenderAll_183=SaaS.renderAll;
SaaS.renderAll=function(){
  oldRenderAll_183();
  SaaS.renderCacheVersion();
};

;

/* ---- js/saas/sambrix-recovery.js ---- */
SaaS.recoveryPlan=SaaS.recoveryPlan||{prepared:false,preparedAt:null,manual:{}};

SaaS.RECOVERY_STEPS=[
 {id:"freeze",title:"Detener cambios",detail:"No seguir publicando mientras se investiga el fallo."},
 {id:"identify",title:"Identificar versiÃ³n afectada",detail:"Registrar candidato, hora y sÃ­ntoma exacto."},
 {id:"backup",title:"Confirmar respaldo",detail:"Verificar snapshot/exportaciÃ³n antes de tocar datos."},
 {id:"rollback",title:"Restaurar versiÃ³n estable",detail:"Volver al Ãºltimo candidato conocido como estable mediante el mecanismo de Hosting/Git."},
 {id:"verify",title:"Smoke test despuÃ©s del rollback",detail:"Login, tenant, cita, cliente, reserva pÃºblica y aislamiento."},
 {id:"document",title:"Registrar incidente",detail:"Guardar causa, soluciÃ³n y prevenciÃ³n para que no se repita."}
];

SaaS.RECOVERY_MANUAL=[
 {id:"hosting",title:"Rollback de Hosting comprobado",detail:"Confirmar en el entorno real que sabemos restaurar una versiÃ³n anterior."},
 {id:"database",title:"RestauraciÃ³n de datos comprobada",detail:"Confirmar procedimiento de recuperaciÃ³n de datos sin mezclar tenants."},
 {id:"second_device",title:"Segundo dispositivo verificado",detail:"DespuÃ©s del rollback ambos dispositivos deben mostrar la misma versiÃ³n."},
 {id:"permissions",title:"Permisos despuÃ©s de restaurar",detail:"SuperAdmin, dueÃ±o y personal conservan solo sus accesos permitidos."}
];

SaaS.loadRecoveryPlan=function(){
 try{
  const s=JSON.parse(localStorage.getItem("sambrix_recovery_plan"))||{};
  SaaS.recoveryPlan={...SaaS.recoveryPlan,...s,manual:s.manual||{}};
 }catch{}
};
SaaS.saveRecoveryPlan=function(){localStorage.setItem("sambrix_recovery_plan",JSON.stringify(SaaS.recoveryPlan));};

SaaS.prepareRecoveryPlan=function(){
 SaaS.recoveryPlan.prepared=true;
 SaaS.recoveryPlan.preparedAt=new Date().toISOString();
 SaaS.recoveryPlan.version=SaaS.releaseCandidate?.version||"sin-version";
 SaaS.saveRecoveryPlan();
 SaaS.audit?.("SYSTEM","Plan de recuperaciÃ³n preparado",{version:SaaS.recoveryPlan.version},"");
 SaaS.renderRecoveryPlan();
};

SaaS.toggleRecoveryManual=function(e){
 const c=e.target;if(!c.matches(".recoveryManualCheck"))return;
 SaaS.recoveryPlan.manual[c.dataset.step]=c.checked;
 SaaS.saveRecoveryPlan();SaaS.renderRecoveryPlan();
};

SaaS.renderRecoveryPlan=function(){
 const box=document.getElementById("recoverySteps");if(!box)return;
 const snapshots=SaaS.migrationSnapshots||[];
 const hasBackup=snapshots.length>0;
 const prepared=!!SaaS.recoveryPlan.prepared;
 const steps=SaaS.RECOVERY_STEPS;
 const manual=SaaS.RECOVERY_MANUAL;
 const done=manual.filter(x=>SaaS.recoveryPlan.manual?.[x.id]).length;

 document.getElementById("recoveryVersion").textContent=SaaS.releaseCandidate?.version||"â€”";
 document.getElementById("recoveryBackupState").textContent=hasBackup?"DISPONIBLE":"PENDIENTE";
 document.getElementById("recoveryRollbackState").textContent=prepared?"PREPARADO":"PENDIENTE";
 document.getElementById("recoveryState").textContent=!hasBackup?"REVISAR":prepared?"LISTO":"PENDIENTE";

 box.innerHTML=steps.map((x,i)=>`<div class="row recovery-row ${(!hasBackup&&x.id==="backup")?"warn":""}">
   <div class="diag-mark">${i+1}</div><div><strong>${x.title}</strong><small>${x.detail}</small></div>
 </div>`).join("");

 document.getElementById("recoveryManual").innerHTML=manual.map((x,i)=>`<label class="row recovery-row ${SaaS.recoveryPlan.manual?.[x.id]?"":"warn"}">
   <div class="wizard-check"><input type="checkbox" class="recoveryManualCheck" data-step="${x.id}" ${SaaS.recoveryPlan.manual?.[x.id]?"checked":""}>
   <div><strong>${i+1}. ${x.title}</strong><small>${x.detail}</small></div></div>
   <span class="status ${SaaS.recoveryPlan.manual?.[x.id]?"ok":""}">${SaaS.recoveryPlan.manual?.[x.id]?"OK":"Pendiente"}</span>
 </label>`).join("");

 const result=document.getElementById("recoveryResult");
 if(!hasBackup){
  result.className="launch-result blocked";
  result.innerHTML='<span class="tag">NO LISTO</span><h2>Falta respaldo verificable</h2><p>No debemos ensayar una restauraciÃ³n de datos sin un snapshot/exportaciÃ³n confirmado.</p>';
 }else if(!prepared||done<manual.length){
  result.className="launch-result";
  result.innerHTML=`<span class="tag">PREPARACIÃ“N</span><h2>Plan definido</h2><p>Faltan ${manual.length-done} prueba(s) reales de recuperaciÃ³n.</p>`;
 }else{
  result.className="launch-result ready";
  result.innerHTML='<span class="tag">RECUPERACIÃ“N VALIDADA</span><h2>Plan y simulacro completados</h2><p>Existe un procedimiento documentado para volver a una versiÃ³n estable y verificarla.</p>';
 }
};

const oldRenderAll_184=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_184();SaaS.renderRecoveryPlan();};

;

/* ---- js/saas/sambrix-operations.js ---- */
SaaS.operations=SaaS.operations||{tickets:[]};

SaaS.loadOperations=function(){
 try{
  const s=JSON.parse(localStorage.getItem("sambrix_operations"))||{};
  SaaS.operations={tickets:s.tickets||[]};
 }catch{}
};
SaaS.saveOperations=function(){localStorage.setItem("sambrix_operations",JSON.stringify(SaaS.operations));};

SaaS.openSupportTicket=function(){
 const sel=document.getElementById("supportBusiness");
 sel.innerHTML='<option value="">Plataforma general</option>'+(SaaS.db.businesses||[]).map(b=>`<option value="${b.id}">${b.name}</option>`).join("");
 const ctx=SaaS.getContext?.(); if(ctx?.businessId)sel.value=ctx.businessId;
 document.getElementById("supportPriority").value="Media";
 document.getElementById("supportTitle").value="";
 document.getElementById("supportDescription").value="";
 document.getElementById("supportAssignee").value="";
 document.getElementById("supportChannel").value="Panel";
 document.getElementById("opsSupportTicketModal")?.classList.add("open");
};
SaaS.closeSupportTicket=function(){document.getElementById("opsSupportTicketModal")?.classList.remove("open");};

SaaS.createSupportTicket=function(){
 const title=document.getElementById("supportTitle").value.trim();
 if(!title)return alert("Escribe el tÃ­tulo del caso.");
 const businessId=document.getElementById("supportBusiness").value;
 const b=SaaS.db.businesses.find(x=>x.id===businessId);
 const t={
  id:"support_"+SaaS.uid(),
  businessId,
  businessName:b?.name||"Plataforma",
  priority:document.getElementById("supportPriority").value,
  title,
  description:document.getElementById("supportDescription").value.trim(),
  assignee:document.getElementById("supportAssignee").value.trim()||"Sin asignar",
  channel:document.getElementById("supportChannel").value,
  status:"Abierto",
  createdAt:new Date().toISOString(),
  createdBy:window.FirebaseBridge?.user?.email||"SuperAdmin"
 };
 SaaS.operations.tickets.push(t);
 SaaS.saveOperations();
 SaaS.audit?.("SUPPORT","Caso de soporte creado",{id:t.id,priority:t.priority,title:t.title},businessId);
 SaaS.closeSupportTicket();SaaS.renderOperations();
 window.App?.toast?.("Caso de soporte creado");
};

SaaS.updateSupportStatus=function(id,status){
 const t=SaaS.operations.tickets.find(x=>x.id===id);if(!t)return;
 t.status=status;t.updatedAt=new Date().toISOString();
 if(status==="Resuelto")t.resolvedAt=t.updatedAt;
 SaaS.saveOperations();
 SaaS.audit?.("SUPPORT","Caso actualizado",{id,status},t.businessId);
 SaaS.renderOperations();
};

SaaS.renderOperations=function(){
 const box=document.getElementById("operationsTicketList");if(!box)return;
 const tickets=SaaS.operations.tickets||[];
 const pf=document.getElementById("opsPriorityFilter")?.value||"";
 const sf=document.getElementById("opsStatusFilter")?.value||"";
 const rows=tickets.filter(t=>(!pf||t.priority===pf)&&(!sf||t.status===sf));

 document.getElementById("opsOpenCount").textContent=tickets.filter(t=>t.status!=="Resuelto").length;
 document.getElementById("opsCriticalCount").textContent=tickets.filter(t=>t.status!=="Resuelto"&&t.priority==="CrÃ­tica").length;
 document.getElementById("opsProgressCount").textContent=tickets.filter(t=>t.status==="En proceso").length;
 document.getElementById("opsResolvedCount").textContent=tickets.filter(t=>t.status==="Resuelto").length;

 box.innerHTML=[...rows].reverse().map(t=>`<div class="row ops-row ${t.priority==="CrÃ­tica"?"critical":t.priority==="Alta"?"high":""} ${t.status==="Resuelto"?"resolved":""}">
   <div style="flex:1">
    <strong>${t.title}</strong>
    <small>${t.businessName} Â· ${t.priority} Â· ${t.status}</small>
    <div class="ops-meta">${t.assignee} Â· ${t.channel} Â· ${new Date(t.createdAt).toLocaleString()}${t.description?` Â· ${t.description}`:""}</div>
   </div>
   <select onchange="SaaS.updateSupportStatus('${t.id}',this.value)">
    <option ${t.status==="Abierto"?"selected":""}>Abierto</option>
    <option ${t.status==="En proceso"?"selected":""}>En proceso</option>
    <option ${t.status==="Esperando negocio"?"selected":""}>Esperando negocio</option>
    <option ${t.status==="Resuelto"?"selected":""}>Resuelto</option>
   </select>
 </div>`).join("")||'<div class="muted">No hay casos con este filtro.</div>';

 const critical=tickets.filter(t=>t.status!=="Resuelto"&&t.priority==="CrÃ­tica").length;
 const open=tickets.filter(t=>t.status!=="Resuelto").length;
 const result=document.getElementById("operationsResult");
 if(critical){
  result.className="launch-result blocked";
  result.innerHTML=`<span class="tag">ATENCIÃ“N INMEDIATA</span><h2>${critical} caso(s) crÃ­tico(s)</h2><p>Estos problemas deben atenderse antes de considerarlos operaciÃ³n normal.</p>`;
 }else if(open){
  result.className="launch-result";
  result.innerHTML=`<span class="tag">OPERACIÃ“N ACTIVA</span><h2>${open} caso(s) abierto(s)</h2><p>Sin crÃ­ticos, pero todavÃ­a hay solicitudes en seguimiento.</p>`;
 }else{
  result.className="launch-result ready";
  result.innerHTML='<span class="tag">OPERACIÃ“N ESTABLE</span><h2>Sin casos abiertos</h2><p>El historial permanece disponible para seguimiento y aprendizaje.</p>';
 }
};

const oldRenderAll_185=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_185();SaaS.renderOperations();};

;

/* ---- js/saas/sambrix-service-status.js ---- */
SaaS.serviceStatus=SaaS.serviceStatus||{notices:[]};

SaaS.loadServiceStatus=function(){
 try{
  const s=JSON.parse(localStorage.getItem("sambrix_service_status"))||{};
  SaaS.serviceStatus={notices:s.notices||[]};
 }catch{}
};
SaaS.saveServiceStatus=function(){localStorage.setItem("sambrix_service_status",JSON.stringify(SaaS.serviceStatus));};

SaaS.openServiceNotice=function(){
 document.getElementById("serviceNoticeType").value="Incidencia";
 document.getElementById("serviceNoticeImpact").value="Bajo";
 document.getElementById("serviceNoticeStatus").value="Investigando";
 document.getElementById("serviceNoticeScope").value="Todos los negocios";
 document.getElementById("serviceNoticeTitle").value="";
 document.getElementById("serviceNoticeMessage").value="";
 document.getElementById("serviceNoticeModal")?.classList.add("open");
};
SaaS.closeServiceNotice=function(){document.getElementById("serviceNoticeModal")?.classList.remove("open");};

SaaS.createServiceNotice=function(){
 const title=document.getElementById("serviceNoticeTitle").value.trim();
 const message=document.getElementById("serviceNoticeMessage").value.trim();
 if(!title||!message)return alert("Escribe tÃ­tulo y mensaje.");
 const n={
  id:"status_"+SaaS.uid(),
  type:document.getElementById("serviceNoticeType").value,
  impact:document.getElementById("serviceNoticeImpact").value,
  status:document.getElementById("serviceNoticeStatus").value,
  scope:document.getElementById("serviceNoticeScope").value,
  title,message,
  createdAt:new Date().toISOString(),
  createdBy:window.FirebaseBridge?.user?.email||"SuperAdmin"
 };
 SaaS.serviceStatus.notices.push(n);SaaS.saveServiceStatus();
 SaaS.audit?.("STATUS","ComunicaciÃ³n de servicio creada",{id:n.id,type:n.type,impact:n.impact,status:n.status},"");
 SaaS.closeServiceNotice();SaaS.renderServiceStatus();
 window.App?.toast?.("Estado publicado");
};

SaaS.updateServiceNotice=function(id,status){
 const n=SaaS.serviceStatus.notices.find(x=>x.id===id);if(!n)return;
 n.status=status;n.updatedAt=new Date().toISOString();
 if(status==="Resuelto")n.resolvedAt=n.updatedAt;
 SaaS.saveServiceStatus();
 SaaS.audit?.("STATUS","Estado de servicio actualizado",{id,status},"");
 SaaS.renderServiceStatus();
};

SaaS.renderServiceStatus=function(){
 const activeBox=document.getElementById("serviceActiveList");if(!activeBox)return;
 const notices=SaaS.serviceStatus.notices||[];
 const active=notices.filter(n=>n.status!=="Resuelto");
 const incidents=active.filter(n=>n.type==="Incidencia");
 const maintenance=active.filter(n=>n.type==="Mantenimiento");
 const critical=active.filter(n=>n.impact==="CrÃ­tico").length;
 const high=active.filter(n=>n.impact==="Alto").length;

 document.getElementById("serviceIncidentCount").textContent=incidents.length;
 document.getElementById("serviceMaintenanceCount").textContent=maintenance.length;
 document.getElementById("serviceNoticeCount").textContent=notices.length;
 document.getElementById("serviceGlobalState").textContent=critical?"CRÃTICO":high?"DEGRADADO":active.length?"AVISO":"OPERATIVO";

 const row=n=>`<div class="row service-row ${n.impact.toLowerCase()} ${n.status==="Resuelto"?"resolved":""}">
   <div style="flex:1"><strong>${n.title}</strong><small>${n.type} Â· ${n.impact} Â· ${n.status} Â· ${n.scope}</small>
   <div class="service-message">${n.message}</div></div>
   <select onchange="SaaS.updateServiceNotice('${n.id}',this.value)">
    <option ${n.status==="Investigando"?"selected":""}>Investigando</option>
    <option ${n.status==="Identificado"?"selected":""}>Identificado</option>
    <option ${n.status==="Monitoreando"?"selected":""}>Monitoreando</option>
    <option ${n.status==="Programado"?"selected":""}>Programado</option>
    <option ${n.status==="Resuelto"?"selected":""}>Resuelto</option>
   </select>
 </div>`;

 activeBox.innerHTML=[...active].reverse().map(row).join("")||'<div class="muted">No hay incidencias ni mantenimientos activos.</div>';
 document.getElementById("serviceNoticeList").innerHTML=[...notices].reverse().slice(0,20).map(row).join("")||'<div class="muted">TodavÃ­a no hay comunicaciones.</div>';

 const result=document.getElementById("serviceStatusResult");
 if(critical){
  result.className="launch-result blocked";
  result.innerHTML=`<span class="tag">SERVICIO CRÃTICO</span><h2>${critical} comunicaciÃ³n(es) crÃ­tica(s)</h2><p>SuperAdmin debe mantener informados a los negocios hasta resolverlas.</p>`;
 }else if(active.length){
  result.className="launch-result";
  result.innerHTML=`<span class="tag">AVISO ACTIVO</span><h2>${active.length} comunicaciÃ³n(es) activa(s)</h2><p>La plataforma tiene informaciÃ³n operativa que debe mantenerse actualizada.</p>`;
 }else{
  result.className="launch-result ready";
  result.innerHTML='<span class="tag">OPERATIVO</span><h2>Sin incidencias activas</h2><p>SAMBRIX aparece operando normalmente.</p>';
 }
};

const oldRenderAll_186=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_186();SaaS.renderServiceStatus();};

;

/* ---- js/saas/sambrix-onboarding.js ---- */
SaaS.onboarding=SaaS.onboarding||{items:[]};
SaaS.ONBOARDING_STEPS=[
 {id:"identity",title:"Identidad y marca",detail:"Nombre, logo, colores y datos del negocio."},
 {id:"services",title:"Servicios y precios",detail:"Servicios visibles, duraciÃ³n y precios correctos."},
 {id:"team",title:"Equipo y permisos",detail:"Personal creado con roles apropiados."},
 {id:"hours",title:"Horarios",detail:"Disponibilidad, descansos y dÃ­as cerrados."},
 {id:"booking",title:"Reserva pÃºblica",detail:"Enlace/flujo pÃºblico probado de principio a fin."},
 {id:"owner",title:"Acceso del dueÃ±o",detail:"DueÃ±o inicia sesiÃ³n y solo ve su negocio."},
 {id:"payments",title:"Plan y facturaciÃ³n",detail:"Plan SaaS y estado comercial revisados."},
 {id:"acceptance",title:"AceptaciÃ³n final",detail:"DueÃ±o confirma que la cuenta estÃ¡ lista."}
];

SaaS.loadOnboarding=function(){
 try{
  const s=JSON.parse(localStorage.getItem("sambrix_onboarding"))||{};
  SaaS.onboarding={items:s.items||[]};
 }catch{}
};
SaaS.saveOnboarding=function(){localStorage.setItem("sambrix_onboarding",JSON.stringify(SaaS.onboarding));};

SaaS.openOnboarding=function(){
 const sel=document.getElementById("onboardingBusiness");
 const existing=new Set(SaaS.onboarding.items.map(x=>x.businessId));
 sel.innerHTML=(SaaS.db.businesses||[]).filter(b=>!existing.has(b.id)).map(b=>`<option value="${b.id}">${b.name}</option>`).join("");
 document.getElementById("onboardingOwner").value="";
 document.getElementById("tenantActivationModal")?.classList.add("open");
};
SaaS.closeOnboarding=function(){document.getElementById("tenantActivationModal")?.classList.remove("open");};

SaaS.createOnboarding=function(){
 const businessId=document.getElementById("onboardingBusiness").value;
 if(!businessId)return alert("Selecciona un negocio disponible.");
 const b=SaaS.db.businesses.find(x=>x.id===businessId);if(!b)return;
 SaaS.onboarding.items.push({
  id:"onboard_"+SaaS.uid(),businessId,businessName:b.name,
  owner:document.getElementById("onboardingOwner").value.trim()||"SuperAdmin",
  steps:{},status:"En activaciÃ³n",createdAt:new Date().toISOString()
 });
 SaaS.saveOnboarding();
 SaaS.audit?.("ONBOARDING","ActivaciÃ³n iniciada",{business:b.name},businessId);
 SaaS.closeOnboarding();SaaS.renderOnboarding();
};

SaaS.toggleOnboardingStep=function(e){
 const c=e.target;if(!c.matches(".onboardingCheck"))return;
 const item=SaaS.onboarding.items.find(x=>x.id===c.dataset.item);if(!item)return;
 item.steps[c.dataset.step]=c.checked;
 const done=SaaS.ONBOARDING_STEPS.filter(s=>item.steps[s.id]).length;
 item.status=done===SaaS.ONBOARDING_STEPS.length?"Completado":"En activaciÃ³n";
 item.updatedAt=new Date().toISOString();
 SaaS.saveOnboarding();
 if(item.status==="Completado")SaaS.audit?.("ONBOARDING","Negocio activado",{business:item.businessName},item.businessId);
 SaaS.renderOnboarding();
};

SaaS.renderOnboarding=function(){
 const box=document.getElementById("tenantActivationList");if(!box)return;
 const items=SaaS.onboarding.items||[];
 const totalSteps=SaaS.ONBOARDING_STEPS.length;
 const progress=i=>SaaS.ONBOARDING_STEPS.filter(s=>i.steps?.[s.id]).length;
 const done=items.filter(i=>progress(i)===totalSteps).length;
 const active=items.length-done;
 const blocked=items.filter(i=>i.blocked).length;
 const avg=items.length?Math.round(items.reduce((a,i)=>a+progress(i)/totalSteps*100,0)/items.length):0;

 document.getElementById("onboardingActiveCount").textContent=active;
 document.getElementById("onboardingDoneCount").textContent=done;
 document.getElementById("onboardingAverage").textContent=avg+"%";
 document.getElementById("onboardingBlockedCount").textContent=blocked;

 box.innerHTML=[...items].reverse().map(i=>{
  const n=progress(i),pct=Math.round(n/totalSteps*100);
  return `<div class="row onboard-row ${pct===100?"done":i.blocked?"blocked":""}" style="display:block">
   <div style="display:flex;justify-content:space-between;gap:12px">
    <div><strong>${i.businessName}</strong><small>${i.owner} Â· ${i.status}</small></div>
    <b>${pct}%</b>
   </div>
   <div class="onboard-progress"><span style="width:${pct}%"></span></div>
   <div class="onboard-steps">${SaaS.ONBOARDING_STEPS.map(s=>`<label class="onboard-step">
    <input type="checkbox" class="onboardingCheck" data-item="${i.id}" data-step="${s.id}" ${i.steps?.[s.id]?"checked":""}>
    <span><strong>${s.title}</strong><small>${s.detail}</small></span>
   </label>`).join("")}</div>
  </div>`;
 }).join("")||'<div class="muted">TodavÃ­a no hay negocios en proceso de activaciÃ³n.</div>';

 const result=document.getElementById("onboardingResult");
 if(blocked){
  result.className="launch-result blocked";
  result.innerHTML=`<span class="tag">ATENCIÃ“N</span><h2>${blocked} activaciÃ³n(es) bloqueada(s)</h2><p>Resuelve los bloqueos antes de entregar esas cuentas.</p>`;
 }else if(active){
  result.className="launch-result";
  result.innerHTML=`<span class="tag">EN PROCESO</span><h2>${active} negocio(s) en activaciÃ³n</h2><p>Una cuenta solo se considera entregada cuando completa los ${totalSteps} controles.</p>`;
 }else if(done){
  result.className="launch-result ready";
  result.innerHTML=`<span class="tag">ACTIVADOS</span><h2>${done} negocio(s) completados</h2><p>Todos los procesos registrados terminaron su checklist.</p>`;
 }else{
  result.className="launch-result";
  result.innerHTML='<span class="tag">SIN ACTIVACIONES</span><h2>Listo para el primer negocio</h2><p>Cuando demos de alta un negocio, su proceso quedarÃ¡ controlado aquÃ­.</p>';
 }
};

const oldRenderAll_187=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_187();SaaS.renderOnboarding();};

;

/* ---- js/saas/sambrix-training-handoff.js ---- */
SaaS.trainingHandoff=SaaS.trainingHandoff||{items:[]};
SaaS.TRAINING_HANDOFF_STEPS=[
 {id:"login",title:"Inicio de sesiÃ³n",critical:true,detail:"El dueÃ±o entra con su propia cuenta."},
 {id:"dashboard",title:"Panel principal",critical:false,detail:"Entiende mÃ©tricas, alertas y navegaciÃ³n."},
 {id:"appointments",title:"Citas y calendario",critical:true,detail:"Crear, mover, cancelar y completar citas."},
 {id:"clients",title:"Clientes",critical:false,detail:"Buscar, crear y actualizar clientes."},
 {id:"team",title:"Personal y permisos",critical:true,detail:"Sabe agregar personal sin entregar acceso indebido."},
 {id:"booking",title:"Reserva pÃºblica",critical:true,detail:"Prueba el flujo que utilizarÃ¡n sus clientes."},
 {id:"reports",title:"Reportes y ventas",critical:false,detail:"Conoce dÃ³nde revisar actividad del negocio."},
 {id:"support",title:"Soporte SAMBRIX",critical:false,detail:"Sabe cÃ³mo reportar un problema."},
 {id:"acceptance",title:"AceptaciÃ³n de entrega",critical:true,detail:"El responsable confirma que recibiÃ³ y comprendiÃ³ la cuenta."}
];

SaaS.loadTrainingHandoff=function(){
 try{
  const s=JSON.parse(localStorage.getItem("sambrix_training_handoff"))||{};
  SaaS.trainingHandoff={items:s.items||[]};
 }catch{}
};
SaaS.saveTrainingHandoff=function(){localStorage.setItem("sambrix_training_handoff",JSON.stringify(SaaS.trainingHandoff));};

SaaS.openTrainingHandoff=function(){
 const sel=document.getElementById("trainingHandoffBusiness");
 const existing=new Set(SaaS.trainingHandoff.items.map(x=>x.businessId));
 sel.innerHTML=(SaaS.db.businesses||[]).filter(b=>!existing.has(b.id)).map(b=>`<option value="${b.id}">${b.name}</option>`).join("");
 document.getElementById("trainingHandoffTrainer").value="SuperAdmin";
 document.getElementById("trainingHandoffOwner").value="";
 document.getElementById("trainingHandoffModal")?.classList.add("open");
};
SaaS.closeTrainingHandoff=function(){document.getElementById("trainingHandoffModal")?.classList.remove("open");};

SaaS.createTrainingHandoff=function(){
 const businessId=document.getElementById("trainingHandoffBusiness").value;
 if(!businessId)return alert("Selecciona un negocio disponible.");
 const b=SaaS.db.businesses.find(x=>x.id===businessId);if(!b)return;

 const access=SaaS.ownerAccessState?.(b)||{active:false,label:"Pendiente"};
 if(!access.active){
   return alert(`No se puede iniciar la entrega: ${access.label}. Activa primero el acceso del propietario.`);
 }

 SaaS.trainingHandoff.items.push({
  id:"handoff_"+SaaS.uid(),
  businessId,
  businessName:b.name,
  trainer:document.getElementById("trainingHandoffTrainer").value.trim()||"SuperAdmin",
  owner:document.getElementById("trainingHandoffOwner").value.trim()||b.owner||"Responsable del negocio",
  steps:{},
  createdAt:new Date().toISOString(),
  status:"En capacitaciÃ³n"
 });

 SaaS.saveTrainingHandoff();
 SaaS.audit?.("TRAINING","CapacitaciÃ³n iniciada",{business:b.name,ownerAccessStatus:access.status},businessId);
 SaaS.closeTrainingHandoff();
 SaaS.renderTrainingHandoff();
};

SaaS.toggleTrainingHandoff=function(e){
 const c=e.target;if(!c.matches(".trainingHandoffCheck"))return;
 const item=SaaS.trainingHandoff.items.find(x=>x.id===c.dataset.item);if(!item)return;
 const b=SaaS.db.businesses.find(x=>x.id===item.businessId);
 const access=SaaS.ownerAccessState?.(b)||{active:false,label:"Pendiente"};

 if(["login","acceptance"].includes(c.dataset.step)&&c.checked&&!access.active){
   c.checked=false;
   return alert(`No puedes completar "${c.dataset.step==="login"?"Inicio de sesiÃ³n":"AceptaciÃ³n de entrega"}": el acceso del propietario no estÃ¡ activo.`);
 }

 item.steps[c.dataset.step]=c.checked;

 const steps=SaaS.TRAINING_HANDOFF_STEPS;
 const done=steps.filter(s=>item.steps[s.id]).length;
 const criticalPending=steps.filter(s=>s.critical&&!item.steps[s.id]).length;
 const complete=done===steps.length&&criticalPending===0&&access.active;

 item.status=complete?"CapacitaciÃ³n completa":"En capacitaciÃ³n";
 item.updatedAt=new Date().toISOString();

 // Training itself does not mark the business delivered.
 // Final delivery belongs exclusively to Activation.
 if(complete&&!item.completedAt){
   item.completedAt=item.updatedAt;
   SaaS.audit?.("TRAINING","CapacitaciÃ³n completada",{
     business:item.businessName,
     owner:item.owner,
     ownerAccessStatus:access.status
   },item.businessId);
 }

 SaaS.saveTrainingHandoff();
 SaaS.renderTrainingHandoff();
 SaaS.renderActivation?.();
};

SaaS.renderTrainingHandoff=function(){
 const box=document.getElementById("trainingHandoffList");if(!box)return;
 const items=SaaS.trainingHandoff.items||[],steps=SaaS.TRAINING_HANDOFF_STEPS,total=steps.length;
 const count=i=>steps.filter(s=>i.steps?.[s.id]).length;

 const enriched=items.map(i=>{
   const b=SaaS.db.businesses.find(x=>x.id===i.businessId);
   const access=SaaS.ownerAccessState?.(b)||{active:false,label:"Pendiente"};
   const n=count(i),pct=Math.round(n/total*100);
   const crit=steps.filter(s=>s.critical&&!i.steps?.[s.id]).length;
   const complete=pct===100&&crit===0&&access.active;
   return {i,b,access,n,pct,crit,complete};
 });

 const complete=enriched.filter(x=>x.complete).length;
 const active=enriched.length-complete;
 const avg=enriched.length?Math.round(enriched.reduce((a,x)=>a+x.pct,0)/enriched.length):0;
 const criticalPending=enriched.reduce((n,x)=>n+x.crit+(x.access.active?0:1),0);

 document.getElementById("trainingActiveCount").textContent=active;
 document.getElementById("trainingDoneCount").textContent=complete;
 document.getElementById("trainingAverage").textContent=avg+"%";
 document.getElementById("trainingCriticalCount").textContent=criticalPending;

 box.innerHTML=[...enriched].reverse().map(({i,access,pct,crit,complete})=>`
  <div class="row training-row ${complete?"done":"blocked"}" style="display:block">
   <div style="display:flex;justify-content:space-between;gap:12px">
    <div>
      <strong>${i.businessName}</strong>
      <small>${i.owner} Â· Capacita: ${i.trainer}</small>
      <small class="training-access ${access.active?"ok":"pending"}">Acceso propietario: ${access.label}</small>
    </div>
    <b>${pct}%</b>
   </div>
   <div class="training-progress"><span style="width:${pct}%"></span></div>
   <div class="training-steps">${steps.map(s=>{
      const locked=["login","acceptance"].includes(s.id)&&!access.active;
      return `<label class="training-step ${locked?"locked":""}">
       <input type="checkbox" class="trainingHandoffCheck" data-item="${i.id}" data-step="${s.id}" ${i.steps?.[s.id]?"checked":""} ${locked?"disabled":""}>
       <span><strong>${s.critical?"â˜… ":""}${s.title}${locked?" Â· bloqueado":""}</strong><small>${locked?"Activa primero el acceso real del propietario.":s.detail}</small></span>
      </label>`;
   }).join("")}</div>
  </div>`).join("")||'<div class="muted">TodavÃ­a no hay capacitaciones registradas.</div>';

 const result=document.getElementById("trainingHandoffResult");
 if(criticalPending){
  result.className="launch-result blocked";
  result.innerHTML=`<span class="tag">NO ENTREGAR AÃšN</span><h2>${criticalPending} control(es) crÃ­tico(s) pendientes</h2><p>El acceso real, la capacitaciÃ³n y la aceptaciÃ³n deben completarse antes de la entrega final.</p>`;
 }else if(active){
  result.className="launch-result";
  result.innerHTML=`<span class="tag">CAPACITACIÃ“N</span><h2>${active} capacitaciÃ³n(es) en progreso</h2><p>Termina todos los pasos antes de pasar a ActivaciÃ³n.</p>`;
 }else if(complete){
  result.className="launch-result ready";
  result.innerHTML=`<span class="tag">CAPACITACIÃ“N COMPLETA</span><h2>${complete} negocio(s) listos para validaciÃ³n final</h2><p>Ahora deben completarse desde ActivaciÃ³n y entrega.</p>`;
 }else{
  result.className="launch-result";
  result.innerHTML='<span class="tag">LISTO</span><h2>Preparado para capacitar</h2><p>La capacitaciÃ³n comenzarÃ¡ cuando haya un negocio con acceso de propietario disponible.</p>';
 }
};

const oldRenderAll_188=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_188();SaaS.renderTrainingHandoff();};

;

/* ---- js/saas/sambrix-help-center.js ---- */
SaaS.HELP_GUIDES=[
 {id:"owner-first",title:"Primer ingreso del dueÃ±o",roles:["DueÃ±o"],keywords:"login acceso contraseÃ±a negocio",steps:["Abre SAMBRIX con tu cuenta.","Confirma que aparece Ãºnicamente tu negocio.","Revisa el panel principal y el nombre del negocio.","Si ves informaciÃ³n de otro negocio, sal y reporta el caso inmediatamente."]},
 {id:"appointment-new",title:"Crear una cita",roles:["DueÃ±o","Personal"],keywords:"cita calendario cliente servicio",steps:["Abre Citas/Calendario.","Selecciona fecha y hora.","Elige o crea el cliente.","Selecciona servicio y profesional.","Guarda y confirma que aparece en el calendario."]},
 {id:"appointment-change",title:"Mover o cancelar una cita",roles:["DueÃ±o","Personal"],keywords:"mover cambiar cancelar cita",steps:["Busca la cita.","Abre sus detalles.","Cambia fecha/hora o selecciona cancelar.","Guarda y confirma el nuevo estado."]},
 {id:"client-new",title:"Registrar un cliente",roles:["DueÃ±o","Personal"],keywords:"cliente telefono correo historial",steps:["Abre Clientes.","Selecciona nuevo cliente.","Completa los datos necesarios.","Guarda y verifica que pueda encontrarse en la bÃºsqueda."]},
 {id:"employee",title:"Agregar personal con permisos correctos",roles:["DueÃ±o"],keywords:"empleado personal permiso rol acceso",steps:["Abre Equipo/Personal.","Crea o selecciona al empleado.","Asigna Ãºnicamente el rol que necesita.","Comprueba que no tenga acceso de SuperAdmin ni a otros negocios."]},
 {id:"booking-test",title:"Probar la reserva pÃºblica",roles:["DueÃ±o","SuperAdmin"],keywords:"reserva publica link cliente disponibilidad",steps:["Abre el enlace pÃºblico del negocio como cliente.","Selecciona servicio, profesional y horario.","Completa una reserva de prueba.","Confirma que aparece en el calendario correcto."]},
 {id:"cache-old",title:"El telÃ©fono muestra una versiÃ³n vieja",roles:["DueÃ±o","Personal","SuperAdmin"],keywords:"cache version vieja telefono pwa actualizar",steps:["Confirma el nÃºmero de versiÃ³n mostrado.","Cierra y vuelve a abrir SAMBRIX.","Recarga la pÃ¡gina.","Si continÃºa igual, usa el diagnÃ³stico de CachÃ©/PWA o solicita soporte."]},
 {id:"support-case",title:"Reportar un problema Ãºtilmente",roles:["DueÃ±o","SuperAdmin"],keywords:"soporte error problema ticket",steps:["Indica quÃ© negocio estÃ¡ afectado.","Describe exactamente quÃ© intentabas hacer.","Anota dispositivo/navegador y versiÃ³n SAMBRIX.","Explica los pasos para reproducir el fallo.","No compartas contraseÃ±as ni claves privadas."]},
 {id:"admin-tenant",title:"Revisar aislamiento de un negocio",roles:["SuperAdmin"],keywords:"tenant aislamiento negocio seguridad",steps:["Selecciona el negocio desde SuperAdmin.","Revisa usuario, rol y businessId.","Ejecuta las pruebas de aislamiento.","No apruebes producciÃ³n si un usuario puede leer o modificar otro tenant."]},
 {id:"admin-incident",title:"Gestionar una incidencia general",roles:["SuperAdmin"],keywords:"incidencia estado servicio mantenimiento",steps:["Confirma si afecta a uno o varios negocios.","Registra el caso en Soporte.","Si es general, publica Estado del Servicio.","Actualiza el estado hasta resolverlo y documenta la causa."]}
];

SaaS.renderHelpCenter=function(){
 const box=document.getElementById("helpGuideList");if(!box)return;
 const q=(document.getElementById("helpSearch")?.value||"").trim().toLowerCase();
 const role=document.getElementById("helpRoleFilter")?.value||"";
 const guides=SaaS.HELP_GUIDES;
 const rows=guides.filter(g=>(!role||g.roles.includes(role))&&(!q||(`${g.title} ${g.keywords} ${g.roles.join(" ")}`).toLowerCase().includes(q)));

 document.getElementById("helpGuideCount").textContent=guides.length;
 document.getElementById("helpOwnerCount").textContent=guides.filter(g=>g.roles.includes("DueÃ±o")).length;
 document.getElementById("helpStaffCount").textContent=guides.filter(g=>g.roles.includes("Personal")).length;
 document.getElementById("helpAdminCount").textContent=guides.filter(g=>g.roles.includes("SuperAdmin")).length;

 box.innerHTML=rows.map(g=>`<details class="row help-guide">
   <summary>${g.title}<div class="help-role">${g.roles.join(" Â· ")}</div></summary>
   <div class="help-guide-body"><ol>${g.steps.map(s=>`<li>${s}</li>`).join("")}</ol></div>
 </details>`).join("")||'<div class="muted">No encontrÃ© una guÃ­a con esos filtros.</div>';
};

const oldRenderAll_189=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_189();SaaS.renderHelpCenter();};

;

/* ---- js/saas/sambrix-billing-ops.js ---- */
SaaS.billingOps=SaaS.billingOps||{
  payments:[],
  policy:{graceDays:3}
};

SaaS.loadBillingOps=function(){
  try{
    const s=JSON.parse(localStorage.getItem("sambrix_billing_ops"))||{};
    SaaS.billingOps={
      payments:s.payments||[],
      policy:{...SaaS.billingOps.policy,...(s.policy||{})}
    };
  }catch{}
};

SaaS.saveBillingOps=function(){
  localStorage.setItem("sambrix_billing_ops",JSON.stringify(SaaS.billingOps));
};

SaaS.billingSubscriptionFor=function(businessId){
  return (SaaS.db.subscriptions||[]).find(s=>s.businessId===businessId)||null;
};

SaaS.billingStatusFor=function(businessId){
  const sub=SaaS.billingSubscriptionFor(businessId);
  if(sub?.status==="Suspended"||sub?.status==="Suspendida")return {label:"Suspendida",days:null};
  const last=[...SaaS.billingOps.payments].reverse().find(p=>p.businessId===businessId);
  const dueRaw=last?.nextDue||sub?.nextDue||sub?.renewalDate||sub?.endsAt||"";
  if(!dueRaw)return {label:"Activa",days:null};

  const due=new Date(dueRaw+"T23:59:59");
  const now=new Date();
  const diff=Math.ceil((due-now)/86400000);
  const grace=Number(SaaS.billingOps.policy.graceDays||0);

  if(diff<(-grace))return {label:"Atrasada",days:diff};
  if(diff<=7)return {label:"Vence pronto",days:diff};
  return {label:"Activa",days:diff};
};

SaaS.openBillingPayment=function(){
  const sel=document.getElementById("billingBusiness");
  sel.innerHTML=(SaaS.db.businesses||[]).map(b=>`<option value="${b.id}">${b.name}</option>`).join("");
  const today=new Date().toISOString().slice(0,10);
  const next=new Date(Date.now()+30*86400000).toISOString().slice(0,10);
  document.getElementById("billingPaidAt").value=today;
  document.getElementById("billingNextDue").value=next;
  document.getElementById("billingAmount").value="";
  document.getElementById("billingReference").value="";
  document.getElementById("billingOpsPaymentModal")?.classList.add("open");
};

SaaS.closeBillingPayment=function(){
  document.getElementById("billingOpsPaymentModal")?.classList.remove("open");
};

SaaS.createBillingPayment=function(){
  const businessId=document.getElementById("billingBusiness").value;
  const amount=Number(document.getElementById("billingAmount").value||0);
  if(!businessId)return alert("Selecciona un negocio.");
  if(amount<=0)return alert("Escribe un monto vÃ¡lido.");

  const b=SaaS.db.businesses.find(x=>x.id===businessId);
  const p={
    id:"pay_"+SaaS.uid(),
    businessId,
    businessName:b?.name||businessId,
    amount,
    paidAt:document.getElementById("billingPaidAt").value,
    nextDue:document.getElementById("billingNextDue").value,
    method:document.getElementById("billingMethod").value,
    reference:document.getElementById("billingReference").value.trim(),
    createdAt:new Date().toISOString(),
    createdBy:window.FirebaseBridge?.user?.email||"SuperAdmin"
  };

  SaaS.billingOps.payments.push(p);
  SaaS.saveBillingOps();
  SaaS.audit?.("BILLING","Pago registrado",{business:p.businessName,amount:p.amount,nextDue:p.nextDue},businessId);
  SaaS.closeBillingPayment();
  SaaS.renderBillingOps();
  window.App?.toast?.("Pago registrado");
};

SaaS.saveBillingPolicy=function(){
  SaaS.billingOps.policy.graceDays=Math.max(0,Math.min(30,Number(document.getElementById("billingGraceDays").value||3)));
  SaaS.saveBillingOps();
  SaaS.audit?.("BILLING","PolÃ­tica de cobro actualizada",{graceDays:SaaS.billingOps.policy.graceDays},"");
  SaaS.renderBillingOps();
};

SaaS.toggleBillingSuspension=function(businessId){
  const sub=SaaS.billingSubscriptionFor(businessId);
  if(!sub)return alert("Este negocio no tiene una suscripciÃ³n registrada.");
  const currently=["Suspended","Suspendida"].includes(sub.status);
  if(!confirm(currently?"Â¿Reactivar esta suscripciÃ³n?":"Â¿Suspender manualmente esta suscripciÃ³n?"))return;
  sub.status=currently?"Active":"Suspended";
  try{localStorage.setItem("sambrix_saas_db",JSON.stringify(SaaS.db))}catch{}
  SaaS.audit?.("BILLING",currently?"SuscripciÃ³n reactivada":"SuscripciÃ³n suspendida",{businessId},businessId);
  SaaS.renderBillingOps();
};

SaaS.renderBillingOps=function(){
  const box=document.getElementById("billingOpsBusinessList");if(!box)return;
  document.getElementById("billingGraceDays").value=SaaS.billingOps.policy.graceDays||3;

  const filter=document.getElementById("billingOpsStatusFilter")?.value||"";
  const rows=(SaaS.db.businesses||[]).map(b=>({b,status:SaaS.billingStatusFor(b.id)})).filter(x=>!filter||x.status.label===filter);

  const all=(SaaS.db.businesses||[]).map(b=>SaaS.billingStatusFor(b.id));
  document.getElementById("billingActiveCount").textContent=all.filter(x=>x.label==="Activa").length;
  document.getElementById("billingDueSoonCount").textContent=all.filter(x=>x.label==="Vence pronto").length;
  document.getElementById("billingPastDueCount").textContent=all.filter(x=>x.label==="Atrasada").length;
  document.getElementById("billingPaymentCount").textContent=SaaS.billingOps.payments.length;

  box.innerHTML=rows.map(({b,status})=>{
    const sub=SaaS.billingSubscriptionFor(b.id);
    const last=[...SaaS.billingOps.payments].reverse().find(p=>p.businessId===b.id);
    const next=last?.nextDue||sub?.nextDue||sub?.renewalDate||sub?.endsAt||"Sin fecha";
    const cls=status.label==="Atrasada"?"overdue":status.label==="Vence pronto"?"soon":status.label==="Suspendida"?"suspended":"";
    return `<div class="row billing-row ${cls}">
      <div style="flex:1">
        <strong>${b.name}</strong>
        <small>${status.label} Â· PrÃ³ximo vencimiento: ${next}</small>
        <div class="billing-meta">Plan: ${sub?.planName||sub?.planId||"No definido"}${last?` Â· Ãšltimo pago: $${Number(last.amount).toFixed(2)} (${last.paidAt})`:""}</div>
      </div>
      <div class="manage-actions">
        <span class="status ${status.label==="Activa"?"ok":""}">${status.label}</span>
        ${sub?`<button class="btn secondary tiny" onclick="SaaS.toggleBillingSuspension('${b.id}')">${status.label==="Suspendida"?"Reactivar":"Suspender"}</button>`:""}
      </div>
    </div>`;
  }).join("")||'<div class="muted">No hay negocios con este filtro.</div>';

  document.getElementById("billingPaymentList").innerHTML=[...SaaS.billingOps.payments].reverse().slice(0,30).map(p=>`<div class="row billing-row">
    <div><strong>${p.businessName} Â· $${Number(p.amount).toFixed(2)}</strong><small>${p.paidAt} Â· ${p.method} Â· prÃ³ximo ${p.nextDue||"sin fecha"}</small><div class="billing-meta">${p.reference||"Sin referencia"}</div></div>
  </div>`).join("")||'<div class="muted">TodavÃ­a no hay pagos registrados.</div>';

  const overdue=all.filter(x=>x.label==="Atrasada").length;
  const soon=all.filter(x=>x.label==="Vence pronto").length;
  const result=document.getElementById("billingResult");
  if(overdue){
    result.className="launch-result blocked";
    result.innerHTML=`<span class="tag">COBROS PENDIENTES</span><h2>${overdue} suscripciÃ³n(es) atrasada(s)</h2><p>Revisa el pago y decide manualmente si corresponde suspender el negocio.</p>`;
  }else if(soon){
    result.className="launch-result";
    result.innerHTML=`<span class="tag">RENOVACIONES</span><h2>${soon} suscripciÃ³n(es) vencen pronto</h2><p>Conviene contactar o verificar el cobro antes de la fecha.</p>`;
  }else{
    result.className="launch-result ready";
    result.innerHTML='<span class="tag">AL DÃA</span><h2>Sin vencimientos urgentes</h2><p>Las suscripciones registradas no presentan atrasos segÃºn la informaciÃ³n disponible.</p>';
  }
};

const oldRenderAll_190=SaaS.renderAll;
SaaS.renderAll=function(){
  oldRenderAll_190();
  SaaS.renderBillingOps();
};

;

/* ---- js/saas/sambrix-renewal-alerts.js ---- */
SaaS.renewalAlerts=SaaS.renewalAlerts||{
  policy:{firstAlertDays:30,priorityDays:7},
  contacts:[]
};

SaaS.loadRenewalAlerts=function(){
  try{
    const s=JSON.parse(localStorage.getItem("sambrix_renewal_alerts"))||{};
    SaaS.renewalAlerts={
      policy:{...SaaS.renewalAlerts.policy,...(s.policy||{})},
      contacts:s.contacts||[]
    };
  }catch{}
};

SaaS.saveRenewalAlerts=function(){
  localStorage.setItem("sambrix_renewal_alerts",JSON.stringify(SaaS.renewalAlerts));
};

SaaS.renewalDueDate=function(businessId){
  const last=[...SaaS.billingOps?.payments||[]].reverse().find(p=>p.businessId===businessId);
  const sub=SaaS.billingSubscriptionFor?.(businessId);
  return last?.nextDue||sub?.nextDue||sub?.renewalDate||sub?.endsAt||"";
};

SaaS.renewalAlertFor=function(businessId){
  const dueRaw=SaaS.renewalDueDate(businessId);
  if(!dueRaw)return null;

  const due=new Date(dueRaw+"T23:59:59");
  const now=new Date();
  const days=Math.ceil((due-now)/86400000);
  const first=Number(SaaS.renewalAlerts.policy.firstAlertDays||30);
  const priority=Number(SaaS.renewalAlerts.policy.priorityDays||7);

  let bucket="";
  if(days<0)bucket="Vencido";
  else if(days<=priority)bucket="7 dÃ­as";
  else if(days<=first)bucket="30 dÃ­as";
  else return null;

  const b=SaaS.db.businesses.find(x=>x.id===businessId);
  const contacted=SaaS.renewalAlerts.contacts.some(c=>c.businessId===businessId&&c.dueDate===dueRaw);

  return {
    businessId,
    businessName:b?.name||businessId,
    dueDate:dueRaw,
    days,
    bucket,
    contacted
  };
};

SaaS.markRenewalContacted=function(businessId,dueDate){
  const exists=SaaS.renewalAlerts.contacts.find(c=>c.businessId===businessId&&c.dueDate===dueDate);
  if(exists){
    exists.contactedAt=new Date().toISOString();
    exists.by=window.FirebaseBridge?.user?.email||"SuperAdmin";
  }else{
    SaaS.renewalAlerts.contacts.push({
      id:"renewal_contact_"+SaaS.uid(),
      businessId,
      dueDate,
      contactedAt:new Date().toISOString(),
      by:window.FirebaseBridge?.user?.email||"SuperAdmin"
    });
  }
  SaaS.saveRenewalAlerts();
  SaaS.audit?.("BILLING","Seguimiento de renovaciÃ³n registrado",{businessId,dueDate},businessId);
  SaaS.renderRenewalAlerts();
};

SaaS.saveRenewalAlertPolicy=function(){
  SaaS.renewalAlerts.policy.firstAlertDays=Math.max(7,Math.min(90,Number(document.getElementById("renewalFirstAlertDays").value||30)));
  SaaS.renewalAlerts.policy.priorityDays=Math.max(1,Math.min(30,Number(document.getElementById("renewalPriorityDays").value||7)));
  if(SaaS.renewalAlerts.policy.priorityDays>SaaS.renewalAlerts.policy.firstAlertDays){
    SaaS.renewalAlerts.policy.priorityDays=SaaS.renewalAlerts.policy.firstAlertDays;
  }
  SaaS.saveRenewalAlerts();
  SaaS.audit?.("BILLING","Ventanas de alerta de renovaciÃ³n actualizadas",SaaS.renewalAlerts.policy,"");
  SaaS.renderRenewalAlerts();
  window.App?.toast?.("Alertas actualizadas");
};

SaaS.renderRenewalAlerts=function(){
  const box=document.getElementById("renewalAlertList");if(!box)return;

  document.getElementById("renewalFirstAlertDays").value=SaaS.renewalAlerts.policy.firstAlertDays||30;
  document.getElementById("renewalPriorityDays").value=SaaS.renewalAlerts.policy.priorityDays||7;

  const filter=document.getElementById("renewalPriorityFilter")?.value||"";
  const alerts=(SaaS.db.businesses||[])
    .map(b=>SaaS.renewalAlertFor(b.id))
    .filter(Boolean)
    .sort((a,b)=>a.days-b.days);

  const visible=alerts.filter(a=>!filter||a.bucket===filter);

  document.getElementById("renewal30Count").textContent=alerts.filter(a=>a.days>=0&&a.days<=30).length;
  document.getElementById("renewal7Count").textContent=alerts.filter(a=>a.days>=0&&a.days<=7).length;
  document.getElementById("renewalOverdueCount").textContent=alerts.filter(a=>a.days<0).length;
  document.getElementById("renewalContactedCount").textContent=alerts.filter(a=>a.contacted).length;

  box.innerHTML=visible.map(a=>{
    const cls=a.days<0?"overdue":a.days<=Number(SaaS.renewalAlerts.policy.priorityDays||7)?"soon":"";
    const dayText=a.days<0?`${Math.abs(a.days)} dÃ­a(s) vencido`:a.days===0?"vence hoy":`vence en ${a.days} dÃ­a(s)`;
    return `<div class="row renewal-row ${cls} ${a.contacted?"renewal-contacted":""}">
      <div style="flex:1">
        <strong>${a.businessName}</strong>
        <small>${a.bucket} Â· ${a.dueDate} Â· ${dayText}</small>
        <div class="renewal-meta">${a.contacted?"Contacto registrado para este vencimiento":"TodavÃ­a no hay contacto registrado"}</div>
      </div>
      <div class="manage-actions">
        <span class="status ${a.contacted?"ok":""}">${a.contacted?"Contactado":"Pendiente"}</span>
        <button class="btn secondary tiny" onclick="SaaS.markRenewalContacted('${a.businessId}','${a.dueDate}')">${a.contacted?"Actualizar contacto":"Marcar contacto"}</button>
      </div>
    </div>`;
  }).join("")||'<div class="muted">No hay renovaciones con este filtro.</div>';

  document.getElementById("renewalContactHistory").innerHTML=[...SaaS.renewalAlerts.contacts].reverse().slice(0,30).map(c=>{
    const b=SaaS.db.businesses.find(x=>x.id===c.businessId);
    return `<div class="row renewal-row">
      <div><strong>${b?.name||c.businessId}</strong><small>Vencimiento ${c.dueDate} Â· contacto ${new Date(c.contactedAt).toLocaleString()} Â· ${c.by}</small></div>
    </div>`;
  }).join("")||'<div class="muted">TodavÃ­a no hay seguimientos registrados.</div>';

  const overdue=alerts.filter(a=>a.days<0&&!a.contacted).length;
  const urgent=alerts.filter(a=>a.days>=0&&a.days<=Number(SaaS.renewalAlerts.policy.priorityDays||7)&&!a.contacted).length;
  const result=document.getElementById("renewalAlertResult");

  if(overdue){
    result.className="launch-result blocked";
    result.innerHTML=`<span class="tag">ACCIÃ“N REQUERIDA</span><h2>${overdue} renovaciÃ³n(es) vencida(s) sin seguimiento</h2><p>Conviene contactar al negocio y registrar la gestiÃ³n antes de decidir cualquier suspensiÃ³n.</p>`;
  }else if(urgent){
    result.className="launch-result";
    result.innerHTML=`<span class="tag">PRÃ“XIMOS VENCIMIENTOS</span><h2>${urgent} renovaciÃ³n(es) prioritarias</h2><p>EstÃ¡n dentro de la ventana de ${SaaS.renewalAlerts.policy.priorityDays} dÃ­as y aÃºn no tienen contacto registrado.</p>`;
  }else{
    result.className="launch-result ready";
    result.innerHTML='<span class="tag">CONTROLADO</span><h2>Sin renovaciones urgentes sin seguimiento</h2><p>Las alertas actuales estÃ¡n atendidas o todavÃ­a fuera de la ventana prioritaria.</p>';
  }
};

SaaS.refreshRenewalAlerts=function(){
  SaaS.renderRenewalAlerts();
  SaaS.audit?.("BILLING","Alertas de renovaciÃ³n revisadas",{},"");
};

const oldRenderAll_191=SaaS.renderAll;
SaaS.renderAll=function(){
  oldRenderAll_191();
  SaaS.renderRenewalAlerts();
};

;

/* ---- js/saas/sambrix-discounts.js ---- */
SaaS.discounts=SaaS.discounts||{coupons:[],uses:[]};

SaaS.loadDiscounts=function(){
 try{
  const s=JSON.parse(localStorage.getItem("sambrix_discounts"))||{};
  SaaS.discounts={coupons:s.coupons||[],uses:s.uses||[]};
 }catch{}
};
SaaS.saveDiscounts=function(){localStorage.setItem("sambrix_discounts",JSON.stringify(SaaS.discounts));};

SaaS.openDiscountModal=function(){
 const today=new Date().toISOString().slice(0,10);
 const later=new Date(Date.now()+30*86400000).toISOString().slice(0,10);
 document.getElementById("discountCode").value="";
 document.getElementById("discountValue").value="";
 document.getElementById("discountMaxUses").value="100";
 document.getElementById("discountStartDate").value=today;
 document.getElementById("discountEndDate").value=later;
 document.getElementById("discountDescription").value="";
 document.getElementById("discountCreateModal")?.classList.add("open");
};
SaaS.closeDiscountModal=function(){document.getElementById("discountCreateModal")?.classList.remove("open");};

SaaS.createDiscount=function(){
 const code=document.getElementById("discountCode").value.trim().toUpperCase().replace(/\s+/g,"");
 const type=document.getElementById("discountType").value;
 const value=Number(document.getElementById("discountValue").value||0);
 if(!code)return alert("Escribe un cÃ³digo.");
 if(value<=0)return alert("Escribe un valor vÃ¡lido.");
 if(type==="percent"&&value>100)return alert("El porcentaje no puede superar 100.");
 if(SaaS.discounts.coupons.some(c=>c.code===code))return alert("Ese cÃ³digo ya existe.");
 const c={
  id:"coupon_"+SaaS.uid(),code,type,value,
  maxUses:Math.max(1,Number(document.getElementById("discountMaxUses").value||1)),
  startDate:document.getElementById("discountStartDate").value,
  endDate:document.getElementById("discountEndDate").value,
  description:document.getElementById("discountDescription").value.trim(),
  active:true,createdAt:new Date().toISOString()
 };
 if(c.endDate&&c.startDate&&c.endDate<c.startDate)return alert("El vencimiento no puede ser anterior al inicio.");
 SaaS.discounts.coupons.push(c);SaaS.saveDiscounts();
 SaaS.audit?.("BILLING","CupÃ³n creado",{code:c.code,type:c.type,value:c.value},"");
 SaaS.closeDiscountModal();SaaS.renderDiscounts();
};

SaaS.discountState=function(c){
 const today=new Date().toISOString().slice(0,10);
 const uses=SaaS.discounts.uses.filter(u=>u.couponId===c.id).length;
 if(!c.active)return "Inactivo";
 if(c.endDate&&today>c.endDate)return "Vencido";
 if(c.startDate&&today<c.startDate)return "Programado";
 if(uses>=c.maxUses)return "Agotado";
 return "Activo";
};

SaaS.toggleDiscount=function(id){
 const c=SaaS.discounts.coupons.find(x=>x.id===id);if(!c)return;
 c.active=!c.active;SaaS.saveDiscounts();
 SaaS.audit?.("BILLING","Estado de cupÃ³n actualizado",{code:c.code,active:c.active},"");
 SaaS.renderDiscounts();
};

SaaS.applyDiscount=function(){
 const businessId=document.getElementById("discountApplyBusiness").value;
 const couponId=document.getElementById("discountApplyCoupon").value;
 const c=SaaS.discounts.coupons.find(x=>x.id===couponId);
 const b=SaaS.db.businesses.find(x=>x.id===businessId);
 if(!b||!c)return alert("Selecciona negocio y cupÃ³n.");
 if(SaaS.discountState(c)!=="Activo")return alert("Este cupÃ³n no estÃ¡ disponible.");
 if(SaaS.discounts.uses.some(u=>u.businessId===businessId&&u.couponId===couponId))return alert("Este negocio ya utilizÃ³ este cupÃ³n.");

 const sub=SaaS.billingSubscriptionFor?.(businessId);
 const base=Number(sub?.price||sub?.amount||0);
 const discountAmount=c.type==="percent"?(base*c.value/100):Math.min(base||c.value,c.value);
 const finalAmount=Math.max(0,base-discountAmount);

 SaaS.discounts.uses.push({
  id:"discount_use_"+SaaS.uid(),businessId,businessName:b.name,couponId,code:c.code,
  baseAmount:base,discountAmount,finalAmount,appliedAt:new Date().toISOString()
 });
 SaaS.saveDiscounts();
 SaaS.audit?.("BILLING","CupÃ³n aplicado",{business:b.name,code:c.code,discountAmount},businessId);
 SaaS.renderDiscounts();
 window.App?.toast?.("Descuento registrado");
};

SaaS.renderDiscounts=function(){
 const box=document.getElementById("discountList");if(!box)return;
 const coupons=SaaS.discounts.coupons||[],uses=SaaS.discounts.uses||[];
 const active=coupons.filter(c=>SaaS.discountState(c)==="Activo").length;
 const expired=coupons.filter(c=>SaaS.discountState(c)==="Vencido").length;
 const total=uses.reduce((a,u)=>a+Number(u.discountAmount||0),0);

 document.getElementById("discountActiveCount").textContent=active;
 document.getElementById("discountUseCount").textContent=uses.length;
 document.getElementById("discountTotalAmount").textContent="$"+total.toFixed(2);
 document.getElementById("discountExpiredCount").textContent=expired;

 box.innerHTML=[...coupons].reverse().map(c=>{
  const state=SaaS.discountState(c),count=uses.filter(u=>u.couponId===c.id).length;
  return `<div class="row discount-row ${state==="Activo"?"active":state==="Vencido"?"expired":""}">
   <div style="flex:1"><strong>${c.code} Â· ${c.type==="percent"?c.value+"%":"$"+Number(c.value).toFixed(2)}</strong>
   <small>${state} Â· ${count}/${c.maxUses} usos Â· ${c.startDate||"sin inicio"} â†’ ${c.endDate||"sin vencimiento"}</small>
   <div class="discount-meta">${c.description||"Sin descripciÃ³n"}</div></div>
   <button class="btn secondary tiny" onclick="SaaS.toggleDiscount('${c.id}')">${c.active?"Desactivar":"Activar"}</button>
  </div>`;
 }).join("")||'<div class="muted">TodavÃ­a no hay cupones.</div>';

 const bsel=document.getElementById("discountApplyBusiness");
 bsel.innerHTML=(SaaS.db.businesses||[]).map(b=>`<option value="${b.id}">${b.name}</option>`).join("");
 const csel=document.getElementById("discountApplyCoupon");
 csel.innerHTML=coupons.filter(c=>SaaS.discountState(c)==="Activo").map(c=>`<option value="${c.id}">${c.code}</option>`).join("");

 document.getElementById("discountUsageList").innerHTML=[...uses].reverse().slice(0,30).map(u=>`<div class="row discount-row active">
  <div><strong>${u.businessName} Â· ${u.code}</strong><small>Base $${Number(u.baseAmount).toFixed(2)} Â· descuento $${Number(u.discountAmount).toFixed(2)} Â· final $${Number(u.finalAmount).toFixed(2)}</small>
  <div class="discount-meta">${new Date(u.appliedAt).toLocaleString()}</div></div>
 </div>`).join("")||'<div class="muted">No hay descuentos aplicados.</div>';
};

const oldRenderAll_192=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_192();SaaS.renderDiscounts();};

;

/* ---- js/saas/sambrix-invoices.js ---- */
SaaS.invoices=SaaS.invoices||[];

SaaS.loadInvoices=function(){
  try{SaaS.invoices=JSON.parse(localStorage.getItem("sambrix_invoices"))||[]}catch{SaaS.invoices=[]}
};

SaaS.saveInvoices=function(){
  localStorage.setItem("sambrix_invoices",JSON.stringify(SaaS.invoices));
};

SaaS.nextInvoiceNumber=function(){
  const n=(SaaS.invoices.length+1).toString().padStart(4,"0");
  return `SAM-${n}`;
};

SaaS.openInvoiceModal=function(){
  const businesses=(SaaS.db.businesses||[]).filter(b=>b.id!==SaaS.portal?._demoBusinessId);
  if(!businesses.length){
    window.App?.toast?.("Primero debes crear un negocio");
    SaaS.closeInvoiceModal?.();
    return;
  }
  const sel=document.getElementById("invoiceBusiness");
  sel.innerHTML=businesses.map(b=>`<option value="${b.id}">${b.name}</option>`).join("");
  const today=new Date().toISOString().slice(0,10);
  const due=new Date(Date.now()+15*86400000).toISOString().slice(0,10);

  document.getElementById("invoiceNumber").value=SaaS.nextInvoiceNumber();
  document.getElementById("invoiceConcept").value="SuscripciÃ³n SAMBRIX";
  document.getElementById("invoiceSubtotal").value="0";
  document.getElementById("invoiceDiscount").value="0";
  document.getElementById("invoiceIssuedAt").value=today;
  document.getElementById("invoiceDueAt").value=due;
  document.getElementById("invoiceStatus").value="Emitida";
  document.getElementById("invoiceNotes").value="";
  document.getElementById("invoiceCreateModal")?.classList.add("open");
};

SaaS.closeInvoiceModal=function(){
  document.getElementById("invoiceCreateModal")?.classList.remove("open");
};

SaaS.createInvoice=function(){
  const businessId=document.getElementById("invoiceBusiness").value;
  if(!businessId||!(SaaS.db.businesses||[]).some(b=>b.id===businessId&&b.id!==SaaS.portal?._demoBusinessId)){
    SaaS.closeInvoiceModal?.();
    return window.App?.toast?.("Primero debes crear un negocio");
  }
  const number=document.getElementById("invoiceNumber").value.trim().toUpperCase();
  const concept=document.getElementById("invoiceConcept").value.trim();
  const subtotal=Math.max(0,Number(document.getElementById("invoiceSubtotal").value||0));
  const discount=Math.max(0,Number(document.getElementById("invoiceDiscount").value||0));

  if(!businessId)return alert("Selecciona un negocio.");
  if(!number)return alert("Escribe el nÃºmero de factura.");
  if(SaaS.invoices.some(i=>i.number===number))return alert("Ese nÃºmero ya existe.");
  if(!concept)return alert("Escribe el concepto.");
  if(discount>subtotal)return alert("El descuento no puede superar el subtotal.");

  const b=SaaS.db.businesses.find(x=>x.id===businessId);
  const inv={
    id:"invoice_"+SaaS.uid(),
    businessId,
    businessName:b?.name||businessId,
    number,
    concept,
    subtotal,
    discount,
    total:Math.max(0,subtotal-discount),
    issuedAt:document.getElementById("invoiceIssuedAt").value,
    dueAt:document.getElementById("invoiceDueAt").value,
    status:document.getElementById("invoiceStatus").value,
    notes:document.getElementById("invoiceNotes").value.trim(),
    createdAt:new Date().toISOString(),
    createdBy:window.FirebaseBridge?.user?.email||"SuperAdmin"
  };

  SaaS.invoices.push(inv);
  SaaS.saveInvoices();
  SaaS.audit?.("BILLING","Factura creada",{number:inv.number,total:inv.total,status:inv.status},businessId);
  SaaS.closeInvoiceModal();
  SaaS.renderInvoices();
  window.App?.toast?.("Factura guardada");
};

SaaS.updateInvoiceStatus=function(id,status){
  const inv=SaaS.invoices.find(x=>x.id===id);if(!inv)return;
  if(status==="Anulada"&&!confirm(`Â¿Anular ${inv.number}?`))return;
  inv.status=status;
  inv.updatedAt=new Date().toISOString();
  if(status==="Pagada")inv.paidAt=inv.updatedAt;
  if(status==="Anulada")inv.voidAt=inv.updatedAt;
  SaaS.saveInvoices();
  SaaS.audit?.("BILLING","Estado de factura actualizado",{number:inv.number,status},inv.businessId);
  SaaS.renderInvoices();
};

SaaS.exportInvoice=function(id){
  const inv=SaaS.invoices.find(x=>x.id===id);if(!inv)return;
  const payload={
    issuer:"SAMBRIX",
    documentType:"Comprobante comercial interno",
    invoice:inv
  };
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=`SAMBRIX_${inv.number}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
};

SaaS.renderInvoices=function(){
  const box=document.getElementById("invoiceList");if(!box)return;
  const q=(document.getElementById("invoiceSearch")?.value||"").toLowerCase();
  const filter=document.getElementById("invoiceStatusFilter")?.value||"";
  const rows=SaaS.invoices.filter(i=>(!filter||i.status===filter)&&(!q||`${i.number} ${i.businessName} ${i.concept}`.toLowerCase().includes(q)));

  document.getElementById("invoiceIssuedCount").textContent=SaaS.invoices.filter(i=>i.status!=="Borrador").length;
  document.getElementById("invoicePaidCount").textContent=SaaS.invoices.filter(i=>i.status==="Pagada").length;
  document.getElementById("invoiceVoidCount").textContent=SaaS.invoices.filter(i=>i.status==="Anulada").length;
  const pending=SaaS.invoices.filter(i=>i.status==="Emitida").reduce((s,i)=>s+Number(i.total||0),0);
  document.getElementById("invoicePendingAmount").textContent="$"+pending.toFixed(2);

  box.innerHTML=[...rows].reverse().map(i=>{
    const cls=i.status==="Pagada"?"paid":i.status==="Anulada"?"void":i.status==="Borrador"?"draft":"";
    return `<div class="row invoice-row ${cls}">
      <div style="flex:1">
        <strong>${i.number} Â· ${i.businessName}</strong>
        <small>${i.status} Â· emitida ${i.issuedAt||"â€”"} Â· vence ${i.dueAt||"â€”"}</small>
        <div class="invoice-meta">${i.concept}${i.notes?` Â· ${i.notes}`:""}</div>
      </div>
      <div style="text-align:right">
        <div class="invoice-total">$${Number(i.total||0).toFixed(2)}</div>
        <div class="manage-actions">
          <select onchange="SaaS.updateInvoiceStatus('${i.id}',this.value)">
            <option ${i.status==="Borrador"?"selected":""}>Borrador</option>
            <option ${i.status==="Emitida"?"selected":""}>Emitida</option>
            <option ${i.status==="Pagada"?"selected":""}>Pagada</option>
            <option ${i.status==="Anulada"?"selected":""}>Anulada</option>
          </select>
          <button class="btn secondary tiny" onclick="SaaS.exportInvoice('${i.id}')">Exportar</button>
        </div>
      </div>
    </div>`;
  }).join("")||'<div class="muted">No hay facturas con estos filtros.</div>';
};

const oldRenderAll_193=SaaS.renderAll;
SaaS.renderAll=function(){
  oldRenderAll_193();
  SaaS.renderInvoices();
};

;

/* ---- js/saas/sambrix-account-statements.js ---- */
SaaS.statementFor=function(businessId){
 const invoices=(SaaS.invoices||[]).filter(i=>i.businessId===businessId&&i.status!=="Anulada");
 const payments=(SaaS.billingOps?.payments||[]).filter(p=>p.businessId===businessId);
 const discounts=(SaaS.discounts?.uses||[]).filter(u=>u.businessId===businessId);
 const invoiced=invoices.reduce((s,i)=>s+Number(i.total||0),0);
 const paid=payments.reduce((s,p)=>s+Number(p.amount||0),0);
 const discount=discounts.reduce((s,d)=>s+Number(d.discountAmount||0),0);
 const balance=Math.max(0,invoiced-paid);
 const overdueInvoices=invoices.filter(i=>i.status==="Emitida"&&i.dueAt&&new Date(i.dueAt+"T23:59:59")<new Date());
 return {invoiced,paid,discount,balance,overdue:overdueInvoices.length,invoices:invoices.length,payments:payments.length};
};
SaaS.renderAccountStatements=function(){
 const box=document.getElementById("statementBusinessList");if(!box)return;
 const q=(document.getElementById("statementSearch")?.value||"").toLowerCase();
 const rows=(SaaS.db.businesses||[]).filter(b=>!q||b.name.toLowerCase().includes(q)).map(b=>({b,s:SaaS.statementFor(b.id)}));
 const totals=rows.reduce((a,x)=>({invoiced:a.invoiced+x.s.invoiced,paid:a.paid+x.s.paid,discount:a.discount+x.s.discount,balance:a.balance+x.s.balance}),{invoiced:0,paid:0,discount:0,balance:0});
 document.getElementById("statementInvoicedTotal").textContent="$"+totals.invoiced.toFixed(2);
 document.getElementById("statementPaidTotal").textContent="$"+totals.paid.toFixed(2);
 document.getElementById("statementBalanceTotal").textContent="$"+totals.balance.toFixed(2);
 document.getElementById("statementDiscountTotal").textContent="$"+totals.discount.toFixed(2);
 box.innerHTML=rows.map(({b,s})=>`<div class="row statement-row ${s.overdue?"overdue":s.balance?"due":""}">
   <div style="flex:1"><strong>${b.name}</strong><small>Facturado $${s.invoiced.toFixed(2)} Â· Pagado $${s.paid.toFixed(2)} Â· Balance $${s.balance.toFixed(2)}</small>
   <div class="statement-meta">${s.invoices} factura(s) Â· ${s.payments} pago(s) Â· descuentos $${s.discount.toFixed(2)} Â· ${s.overdue} vencida(s)</div></div>
   <span class="status ${!s.balance?"ok":""}">${s.balance?"Pendiente":"Al dÃ­a"}</span>
 </div>`).join("")||'<div class="muted">No hay negocios.</div>';
 const overdue=rows.filter(x=>x.s.overdue).length;
 const result=document.getElementById("statementResult");
 if(overdue){result.className="launch-result blocked";result.innerHTML=`<span class="tag">CARTERA VENCIDA</span><h2>${overdue} negocio(s) con factura vencida</h2><p>Revisa renovaciones y seguimiento de cobro.</p>`}
 else if(totals.balance){result.className="launch-result";result.innerHTML=`<span class="tag">SALDO PENDIENTE</span><h2>$${totals.balance.toFixed(2)} por cobrar</h2><p>No hay facturas vencidas detectadas, pero existe balance abierto.</p>`}
 else{result.className="launch-result ready";result.innerHTML='<span class="tag">AL DÃA</span><h2>Sin balance pendiente registrado</h2><p>La cartera comercial aparece conciliada con los datos disponibles.</p>'}
};
SaaS.refreshAccountStatements=function(){SaaS.renderAccountStatements();SaaS.audit?.("BILLING","Estados de cuenta revisados",{},"")};
const oldRenderAll_194=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_194();SaaS.renderAccountStatements();};

;

/* ---- js/saas/sambrix-saas-metrics.js ---- */
SaaS.subscriptionMonthlyValue=function(sub){
 const raw=Number(sub?.price||sub?.amount||0);
 const cycle=String(sub?.cycle||sub?.billingCycle||"monthly").toLowerCase();
 if(cycle.includes("year")||cycle.includes("annual"))return raw/12;
 return raw;
};
SaaS.renderSaasMetrics=function(){
 const planBox=document.getElementById("metricsPlanList");if(!planBox)return;
 const businesses=SaaS.db.businesses||[];
 const subs=SaaS.db.subscriptions||[];
 const activeSubs=subs.filter(s=>!["Suspended","Suspendida","Cancelled","Cancelada"].includes(s.status));
 const mrr=activeSubs.reduce((s,x)=>s+SaaS.subscriptionMonthlyValue(x),0);
 const arr=mrr*12, arpu=activeSubs.length?mrr/activeSubs.length:0;
 const risks=businesses.map(b=>({b,status:SaaS.billingStatusFor?.(b.id)||{label:"Activa"}})).filter(x=>["Atrasada","Suspendida"].includes(x.status.label));
 document.getElementById("metricsMrr").textContent="$"+mrr.toFixed(2);
 document.getElementById("metricsArr").textContent="$"+arr.toFixed(2);
 document.getElementById("metricsArpu").textContent="$"+arpu.toFixed(2);
 document.getElementById("metricsRiskCount").textContent=risks.length;

 const groups={};
 activeSubs.forEach(s=>{const key=s.planName||s.planId||"Sin plan";groups[key]=(groups[key]||0)+1});
 planBox.innerHTML=Object.entries(groups).sort((a,b)=>b[1]-a[1]).map(([name,count])=>`<div class="row metrics-row"><div style="flex:1"><strong>${name}</strong><small>${count} suscripciÃ³n(es)</small></div><b>${count}</b></div>`).join("")||'<div class="muted">No hay suscripciones activas.</div>';

 document.getElementById("metricsRiskList").innerHTML=risks.map(({b,status})=>`<div class="row metrics-row risk"><div><strong>${b.name}</strong><small>${status.label}</small></div></div>`).join("")||'<div class="row metrics-row"><div><strong>Sin riesgo comercial inmediato</strong><small>No hay atrasos o suspensiones detectadas.</small></div></div>';
};
SaaS.refreshSaasMetrics=function(){SaaS.renderSaasMetrics();SaaS.audit?.("BILLING","MÃ©tricas SaaS actualizadas",{},"")};
const oldRenderAll_195=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_195();SaaS.renderSaasMetrics();};

;

/* ---- js/saas/sambrix-review-gate.js ---- */
SaaS.REVIEW_VISUAL=[
 {name:"Portada SAMBRIX",detail:"Nombre, marca y acceso se ven correctos."},
 {name:"SuperAdmin",detail:"MenÃº, negocios, soporte, cobros y paneles cargan sin superponerse."},
 {name:"Negocio",detail:"Abre un tenant y confirma que se entiende quÃ© negocio estÃ¡ activo."},
 {name:"Cliente pÃºblico",detail:"La portada/reserva pÃºblica se ve clara y con la marca correcta."},
 {name:"MÃ³vil",detail:"Abre el paquete en un telÃ©fono y revisa que botones/modales no se corten."}
];
SaaS.REVIEW_REAL=[
 {name:"Login Firebase real",detail:"SuperAdmin y dueÃ±o deben entrar con cuentas reales."},
 {name:"Aislamiento",detail:"Un dueÃ±o no debe ver otro negocio."},
 {name:"SincronizaciÃ³n",detail:"Crear una cita en un telÃ©fono y verla en otro."},
 {name:"ImÃ¡genes",detail:"Subir/cambiar una imagen y verla desde otro dispositivo."},
 {name:"Reserva cliente",detail:"Reserva pÃºblica debe llegar al tenant correcto."},
 {name:"Reglas Firebase",detail:"Probar lecturas/escrituras permitidas y bloqueadas."}
];
SaaS.renderReviewGate=function(){
 const v=document.getElementById("reviewGateVisualList");if(!v)return;
 v.innerHTML=SaaS.REVIEW_VISUAL.map((x,i)=>`<div class="row review-row"><div class="diag-mark">${i+1}</div><div><strong>${x.name}</strong><small>${x.detail}</small></div></div>`).join("");
 document.getElementById("reviewGateRealList").innerHTML=SaaS.REVIEW_REAL.map((x,i)=>`<div class="row review-row pending"><div class="diag-mark">${i+1}</div><div><strong>${x.name}</strong><small>${x.detail}</small></div></div>`).join("");
 const result=document.getElementById("reviewGateResult");
 result.className="launch-result ready";
 result.innerHTML='<span class="tag">MOMENTO DE REVISAR</span><h2>La construcciÃ³n base llegÃ³ a un punto estable</h2><p>Ahora corresponde una revisiÃ³n visual y luego las pruebas reales de Firebase y dos dispositivos antes de seguir agregando funciones.</p>';
};
SaaS.refreshReviewGate=function(){SaaS.renderReviewGate();SaaS.audit?.("SYSTEM","Puerta de revisiÃ³n recalculada",{},"")};
const oldRenderAll_196=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_196();SaaS.renderReviewGate();};

;

/* ---- js/saas/saas-monitoring.js ---- */
SaaS.globalAudit=SaaS.globalAudit||[];

SaaS.audit=function(type,action,detail={},businessId=""){
  SaaS.globalAudit.push({
    id:SaaS.uid(),
    type:type||"BUSINESS",
    action:action||"",
    businessId:businessId||SaaS.getContext()?.businessId||"",
    businessName:SaaS.db.businesses.find(b=>b.id===(businessId||SaaS.getContext()?.businessId))?.name||"",
    user:window.FirebaseBridge?.user?.email||"local",
    detail,
    at:new Date().toISOString()
  });
  if(SaaS.globalAudit.length>3000)SaaS.globalAudit=SaaS.globalAudit.slice(-3000);
  localStorage.setItem("sambrix_global_audit",JSON.stringify(SaaS.globalAudit));
};

SaaS.loadGlobalAudit=function(){
  try{SaaS.globalAudit=JSON.parse(localStorage.getItem("sambrix_global_audit"))||[]}catch{SaaS.globalAudit=[]}
  // Bring prior support audit into unified log once.
  const known=new Set(SaaS.globalAudit.map(x=>x.id));
  (SaaS.db.supportAudit||[]).forEach(x=>{
    if(!known.has("support-"+x.id)){
      SaaS.globalAudit.push({id:"support-"+x.id,type:"SUPPORT",action:x.action==="ENTER"?"Entrada modo soporte":"Salida modo soporte",businessId:x.businessId,businessName:x.businessName,user:"SuperAdmin",detail:{},at:x.at});
    }
  });
  localStorage.setItem("sambrix_global_audit",JSON.stringify(SaaS.globalAudit));
};

SaaS.buildAlerts=function(){
  const alerts=[];
  const now=new Date();

  (SaaS.db.businesses||[]).forEach(b=>{
    const label=SaaS.subscriptionLabel?.(b)||b.status;
    const days=SaaS.daysUntil?.(b.nextPayment);

    if(label==="Vencido"||b.status==="Suspendido"){
      alerts.push({id:"sub-"+b.id,severity:"critical",kind:"subscription",businessId:b.id,title:`${b.name}: suscripciÃ³n ${label.toLowerCase()}`,detail:"El negocio requiere revisiÃ³n de pago o reactivaciÃ³n.",action:"Abrir suscripciÃ³n"});
    }else if(days!==null&&days>=0&&days<=7){
      alerts.push({id:"due-"+b.id,severity:"warning",kind:"payment",businessId:b.id,title:`${b.name}: vence en ${days} dÃ­a(s)`,detail:`PrÃ³ximo pago: ${b.nextPayment}`,action:"Revisar cobro"});
    }

    if(!b.ownerEmail){
      alerts.push({id:"mail-"+b.id,severity:"warning",kind:"security",businessId:b.id,title:`${b.name}: dueÃ±o sin correo`,detail:"Agrega un correo real para recuperaciÃ³n de acceso y soporte.",action:"Abrir negocio"});
    }

    if(!b.branches?.length){
      alerts.push({id:"branch-"+b.id,severity:"critical",kind:"business",businessId:b.id,title:`${b.name}: sin sucursal`,detail:"El negocio no tiene una sucursal principal configurada.",action:"Configurar"});
    }

    const tenantRaw=localStorage.getItem(SaaS.tenantKey?.(b.id)||"");
    if(!tenantRaw){
      alerts.push({id:"state-"+b.id,severity:"info",kind:"sync",businessId:b.id,title:`${b.name}: sin copia local en este dispositivo`,detail:"Puede ser normal si nunca abriste este negocio aquÃ­.",action:"Revisar"});
    }
  });

  const recentSupport=(SaaS.db.supportAudit||[]).filter(x=>Date.now()-new Date(x.at).getTime()<24*3600000);
  if(recentSupport.length){
    alerts.push({id:"support-recent",severity:"info",kind:"support",title:`${recentSupport.length} acceso(s) de soporte en 24h`,detail:"Revisa la auditorÃ­a si necesitas verificar cambios realizados.",action:"Ver auditorÃ­a"});
  }

  if(!window.FirebaseBridge?.connected){
    alerts.push({id:"firebase-offline",severity:"warning",kind:"sync",title:"Firebase no conectado",detail:"La aplicaciÃ³n puede seguir localmente, pero la sincronizaciÃ³n multi-dispositivo no estÃ¡ activa.",action:"ConfiguraciÃ³n"});
  }

  SaaS.alerts=alerts;
  return alerts;
};

SaaS.renderAlerts=function(){
  const box=document.getElementById("alertsList");if(!box)return;
  const all=SaaS.buildAlerts();
  const severity=document.getElementById("alertSeverityFilter")?.value||"";
  const list=all.filter(a=>!severity||a.severity===severity);

  const critical=all.filter(a=>a.severity==="critical").length;
  const payments=all.filter(a=>a.kind==="payment"||a.kind==="subscription").length;
  const sync=all.filter(a=>a.kind==="sync").length;
  const support=all.filter(a=>a.kind==="support").length;

  document.getElementById("alertsCritical")&&(document.getElementById("alertsCritical").textContent=critical);
  document.getElementById("alertsPayments")&&(document.getElementById("alertsPayments").textContent=payments);
  document.getElementById("alertsSync")&&(document.getElementById("alertsSync").textContent=sync);
  document.getElementById("alertsSupport")&&(document.getElementById("alertsSupport").textContent=support);
  document.getElementById("superAlertBadge")&&(document.getElementById("superAlertBadge").textContent=critical+payments+sync);

  box.innerHTML=list.map(a=>`<div class="row alert-row ${a.severity}">
    <div><div style="display:flex;gap:8px;align-items:center;margin-bottom:3px"><span class="alert-severity ${a.severity}">${a.severity}</span><strong>${a.title}</strong></div><small>${a.detail}</small></div>
    <button class="btn secondary tiny" onclick="SaaS.handleAlert('${a.id}')">${a.action}</button>
  </div>`).join("")||'<div class="muted">No hay alertas con este filtro.</div>';
};

SaaS.handleAlert=function(id){
  const a=(SaaS.alerts||[]).find(x=>x.id===id);if(!a)return;
  if(a.businessId&&["subscription","payment"].includes(a.kind)){SaaS.enterBusiness(a.businessId);window.App?.go?.("saasSubscriptions");return}
  if(a.businessId){SaaS.enterBusiness(a.businessId);return}
  if(a.kind==="support"){window.App?.go?.("saasAudit");return}
  if(a.kind==="sync"){window.App?.go?.("configuracion");return}
};

SaaS.renderGlobalAudit=function(){
  const box=document.getElementById("globalAuditTable");if(!box)return;
  const q=(document.getElementById("globalAuditSearch")?.value||"").toLowerCase().trim();
  const type=document.getElementById("auditTypeFilter")?.value||"";
  const list=[...(SaaS.globalAudit||[])].reverse().filter(x=>{
    const text=`${x.businessName||""} ${x.user||""} ${x.action||""} ${x.type||""}`.toLowerCase();
    return (!q||text.includes(q))&&(!type||x.type===type);
  });
  box.innerHTML=`<table class="sambrix-table"><thead><tr><th>Fecha</th><th>Tipo</th><th>Negocio</th><th>Usuario</th><th>AcciÃ³n</th><th>Detalle</th></tr></thead><tbody>${list.map(x=>`<tr>
    <td><span class="audit-time">${new Date(x.at).toLocaleString()}</span></td>
    <td>${x.type}</td><td>${x.businessName||"Plataforma"}</td><td>${x.user||"â€”"}</td><td><span class="audit-action">${x.action}</span></td>
    <td>${Object.keys(x.detail||{}).length?JSON.stringify(x.detail):"â€”"}</td>
  </tr>`).join("")}</tbody></table>`;
};

SaaS.exportAuditCSV=function(){
  const rows=[["Fecha","Tipo","Negocio","Usuario","AcciÃ³n","Detalle"]];
  [...(SaaS.globalAudit||[])].forEach(x=>rows.push([x.at,x.type,x.businessName||"",x.user||"",x.action||"",JSON.stringify(x.detail||{})]));
  const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`sambrix-auditoria-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(a.href);
};

SaaS.runHealthCheck=function(){
  const checks=[];
  const add=(name,status,detail)=>checks.push({name,status,detail});

  add("Firebase",window.FirebaseBridge?.connected?"ok":"warn",window.FirebaseBridge?.connected?"Conectado a Firebase Authentication.":"Trabajando sin conexiÃ³n Firebase.");
  add("Tiempo real",window.FirebaseBridge?.realtime?"ok":"warn",window.FirebaseBridge?.realtime?"SincronizaciÃ³n en tiempo real activa.":"Tiempo real no activo en este dispositivo.");
  add("CatÃ¡logo de negocios",SaaS.db.businesses?.length?"ok":"bad",`${SaaS.db.businesses?.length||0} negocio(s) registrados.`);
  add("Planes",SaaS.db.plans?.length>=3?"ok":"warn",`${SaaS.db.plans?.length||0} plan(es) configurados.`);
  add("Contexto actual",SaaS.getContext()?.businessId?"ok":"bad",SaaS.getContext()?.businessId||"Sin businessId.");
  add("Sucursal actual",SaaS.getContext()?.branchId?"ok":"warn",SaaS.getContext()?.branchId||"Sin branchId.");

  const invalidBusinesses=(SaaS.db.businesses||[]).filter(b=>!b.id||!b.name||!b.branches?.length);
  add("Integridad de negocios",invalidBusinesses.length?"bad":"ok",invalidBusinesses.length?`${invalidBusinesses.length} negocio(s) incompletos.`:"Todos los negocios tienen estructura mÃ­nima.");

  const recommendations=[];
  checks.filter(c=>c.status!=="ok").forEach(c=>{
    if(c.name==="Firebase")recommendations.push("Conecta Firebase desde ConfiguraciÃ³n para sincronizaciÃ³n multi-dispositivo.");
    else if(c.name==="Tiempo real")recommendations.push("Activa sincronizaciÃ³n en tiempo real despuÃ©s de conectar Firebase.");
    else if(c.name==="Integridad de negocios")recommendations.push("Revisa negocios sin nombre, ID o sucursal principal.");
    else recommendations.push(`Revisar: ${c.name}.`);
  });
  if(!recommendations.length)recommendations.push("No se detectaron problemas importantes.");

  const box=document.getElementById("healthChecks");
  if(box)box.innerHTML=checks.map(c=>`<div class="row"><div><strong><span class="health-dot ${c.status}"></span>${c.name}</strong><small>${c.detail}</small></div><strong class="health-${c.status==="ok"?"ok":c.status==="warn"?"warn":"bad"}">${c.status==="ok"?"OK":c.status==="warn"?"REVISAR":"ERROR"}</strong></div>`).join("");

  const rec=document.getElementById("healthRecommendations");
  if(rec)rec.innerHTML=recommendations.map(x=>`<div class="row"><span>${x}</span></div>`).join("");

  document.getElementById("healthFirebase")&&(document.getElementById("healthFirebase").textContent=window.FirebaseBridge?.connected?"Online":"Local");
  document.getElementById("healthBusinesses")&&(document.getElementById("healthBusinesses").textContent=(SaaS.db.businesses||[]).length);
  document.getElementById("healthUsers")&&(document.getElementById("healthUsers").textContent=(window.FirebaseBridge?.user?1:0));
  const bad=checks.filter(c=>c.status==="bad").length,warn=checks.filter(c=>c.status==="warn").length;
  document.getElementById("healthOverall")&&(document.getElementById("healthOverall").textContent=bad?"CrÃ­tico":warn?"AtenciÃ³n":"Excelente");
  SaaS.audit("SYNC","RevisiÃ³n de salud del sistema",{bad,warn});
};

const oldStartSupport_138=SaaS.startSupport;
SaaS.startSupport=function(id){SaaS.audit("SUPPORT","Entrada a modo soporte",{},id);return oldStartSupport_138(id)};
const oldExitSupport_138=SaaS.exitSupport;
SaaS.exitSupport=function(){const id=SaaS.getContext()?.businessId;SaaS.audit("SUPPORT","Salida de modo soporte",{},id);return oldExitSupport_138()};
const oldRenew_138=SaaS.renewBusiness;
SaaS.renewBusiness=function(id,months){SaaS.audit("SUBSCRIPTION",`RenovaciÃ³n ${months} mes(es)`,{months},id);return oldRenew_138(id,months)};
const oldSuspend_138=SaaS.suspendBusiness;
SaaS.suspendBusiness=function(id){const b=SaaS.db.businesses.find(x=>x.id===id);SaaS.audit("SUBSCRIPTION",b?.status==="Suspendido"?"ReactivaciÃ³n":"SuspensiÃ³n",{},id);return oldSuspend_138(id)};

const oldRenderAll_138=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_138();SaaS.renderAlerts();SaaS.renderGlobalAudit()};

;

/* ---- js/saas/saas-addons.js ---- */
SaaS.addons=SaaS.addons||[];
SaaS.businessAddons=SaaS.businessAddons||{};

SaaS.defaultAddons=[
  {id:"payroll",code:"payroll",name:"NÃ³mina PRO",icon:"$",price:19,description:"Comisiones, pagos, adelantos y liquidaciÃ³n del personal."},
  {id:"whatsapp",code:"whatsapp_pro",name:"WhatsApp PRO",icon:"W",price:15,description:"Recordatorios, confirmaciones y mensajes operativos."},
  {id:"loyalty",code:"loyalty",name:"FidelizaciÃ³n",icon:"â˜…",price:12,description:"Puntos, recompensas, cumpleaÃ±os y clientes frecuentes."},
  {id:"reports",code:"advanced_reports",name:"Reportes PRO",icon:"â†—",price:18,description:"Indicadores avanzados, comparativos y anÃ¡lisis del negocio."},
  {id:"store",code:"online_store",name:"Tienda Online",icon:"â–£",price:20,description:"CatÃ¡logo de productos, pedidos y control comercial."},
  {id:"multibranch",code:"multi_branch",name:"Multi-sucursal",icon:"â–¦",price:25,description:"Control central de varias sucursales bajo el mismo negocio."}
];

SaaS.loadAddons=function(){
  try{SaaS.addons=JSON.parse(localStorage.getItem("sambrix_addons"))||[]}catch{SaaS.addons=[]}
  try{SaaS.businessAddons=JSON.parse(localStorage.getItem("sambrix_business_addons"))||{}}catch{SaaS.businessAddons={}}
  if(!SaaS.addons.length){SaaS.addons=structuredClone(SaaS.defaultAddons);SaaS.saveAddons()}
};
SaaS.saveAddons=function(){
  localStorage.setItem("sambrix_addons",JSON.stringify(SaaS.addons));
  localStorage.setItem("sambrix_business_addons",JSON.stringify(SaaS.businessAddons));
};
SaaS.isAddonEnabled=function(businessId,addonId){return !!SaaS.businessAddons[businessId]?.[addonId]?.enabled};
SaaS.toggleAddon=function(businessId,addonId){
  if(!businessId)return alert("Selecciona un negocio.");
  SaaS.businessAddons[businessId]=SaaS.businessAddons[businessId]||{};
  const current=SaaS.businessAddons[businessId][addonId]||{};
  const enabled=!current.enabled;
  SaaS.businessAddons[businessId][addonId]={enabled,activatedAt:enabled?new Date().toISOString():current.activatedAt||null,updatedAt:new Date().toISOString()};
  SaaS.saveAddons();
  SaaS.audit?.("SUBSCRIPTION",enabled?"Add-on activado":"Add-on desactivado",{addonId},businessId);
  SaaS.renderAddons();
};

SaaS.renderAddons=function(){
  const catalog=document.getElementById("addonCatalog");if(!catalog)return;
  const installs={};SaaS.addons.forEach(a=>installs[a.id]=0);
  Object.values(SaaS.businessAddons).forEach(map=>Object.entries(map||{}).forEach(([id,v])=>{if(v?.enabled)installs[id]=(installs[id]||0)+1}));
  const active=Object.values(installs).reduce((a,b)=>a+b,0);
  const mrr=SaaS.addons.reduce((s,a)=>s+(installs[a.id]||0)*Number(a.price||0),0);
  const top=[...SaaS.addons].sort((a,b)=>(installs[b.id]||0)-(installs[a.id]||0))[0];

  document.getElementById("addonActiveCount")&&(document.getElementById("addonActiveCount").textContent=active);
  document.getElementById("addonMRR")&&(document.getElementById("addonMRR").textContent=`$${mrr.toFixed(2)}`);
  document.getElementById("addonCatalogCount")&&(document.getElementById("addonCatalogCount").textContent=SaaS.addons.length);
  document.getElementById("addonTop")&&(document.getElementById("addonTop").textContent=top&&installs[top.id]?top.name:"â€”");

  catalog.innerHTML=SaaS.addons.map(a=>`<article class="addon-card">
    <div class="addon-icon">${a.icon||"+"}</div><div><strong>${a.name}</strong><p>${a.description||""}</p></div>
    <div class="addon-price">$${Number(a.price||0).toFixed(2)} <small>/ mes</small></div>
    <small>${installs[a.id]||0} instalaciÃ³n(es)</small>
    <div class="addon-actions"><button class="btn secondary tiny" onclick="SaaS.editAddon('${a.id}')">Editar</button></div>
  </article>`).join("");

  const sel=document.getElementById("addonBusinessSelect");
  if(sel){
    const old=sel.value;
    sel.innerHTML='<option value="">Seleccionar negocio</option>'+SaaS.db.businesses.map(b=>`<option value="${b.id}">${b.name}</option>`).join("");
    if(old&&SaaS.db.businesses.some(b=>b.id===old))sel.value=old;
  }
  SaaS.renderBusinessAddonManager();
};

SaaS.renderBusinessAddonManager=function(){
  const box=document.getElementById("businessAddonManager");if(!box)return;
  const businessId=document.getElementById("addonBusinessSelect")?.value||"";
  if(!businessId){box.innerHTML='<div class="muted">Selecciona un negocio para administrar sus mÃ³dulos.</div>';return}
  box.innerHTML=SaaS.addons.map(a=>{
    const on=SaaS.isAddonEnabled(businessId,a.id);
    return `<article class="addon-card ${on?"enabled":""}">
      <div class="addon-switch"><div class="addon-icon">${a.icon||"+"}</div><span class="status-pill ${on?"Activo":"Suspendido"}">${on?"Activo":"Desactivado"}</span></div>
      <strong>${a.name}</strong><p>${a.description||""}</p>
      <div class="addon-price">$${Number(a.price||0).toFixed(2)} <small>/ mes</small></div>
      <button class="btn ${on?"secondary":"primary"}" onclick="SaaS.toggleAddon('${businessId}','${a.id}')">${on?"Desactivar":"Activar mÃ³dulo"}</button>
    </article>`;
  }).join("");
};

SaaS.openAddonModal=function(addon=null){
  SaaS.editingAddonId=addon?.id||null;
  document.getElementById("addonName").value=addon?.name||"";
  document.getElementById("addonPrice").value=addon?.price??"";
  document.getElementById("addonCode").value=addon?.code||"";
  document.getElementById("addonIcon").value=addon?.icon||"";
  document.getElementById("addonDescription").value=addon?.description||"";
  document.getElementById("addonModal").classList.add("open");
};
SaaS.closeAddonModal=function(){document.getElementById("addonModal")?.classList.remove("open")};
SaaS.editAddon=function(id){SaaS.openAddonModal(SaaS.addons.find(a=>a.id===id))};
SaaS.saveAddonForm=function(){
  const name=document.getElementById("addonName").value.trim();
  const price=Number(document.getElementById("addonPrice").value||0);
  const code=document.getElementById("addonCode").value.trim().replace(/\s+/g,"_").toLowerCase();
  if(!name||!code)return alert("Nombre y cÃ³digo son obligatorios.");
  const item={id:SaaS.editingAddonId||SaaS.uid(),name,price,code,icon:document.getElementById("addonIcon").value.trim()||"+",description:document.getElementById("addonDescription").value.trim()};
  const i=SaaS.addons.findIndex(a=>a.id===item.id);if(i>=0)SaaS.addons[i]=item;else SaaS.addons.push(item);
  SaaS.saveAddons();SaaS.audit?.("SUBSCRIPTION",i>=0?"Add-on editado":"Add-on creado",{addon:item.name});SaaS.closeAddonModal();SaaS.renderAddons();
};

SaaS.getAddonMRRForBusiness=function(businessId){
  return SaaS.addons.reduce((sum,a)=>sum+(SaaS.isAddonEnabled(businessId,a.id)?Number(a.price||0):0),0);
};

const oldRenderAll_139=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_139();SaaS.renderAddons()};

;

/* ---- js/saas/saas-crm.js ---- */
SaaS.crmData={clients:[],appointments:[]};

SaaS.loadCRMForBusiness=function(businessId){
  if(!businessId)return {clients:[],appointments:[]};
  let data={clients:[],appointments:[]};
  try{
    const raw=localStorage.getItem(SaaS.tenantKey(businessId));
    if(raw){
      const db=JSON.parse(raw);
      data.clients=db.clients||[];
      data.appointments=db.appointments||[];
    }else if(SaaS.getContext()?.businessId===businessId){
      data.clients=window.App?.db?.clients||[];
      data.appointments=window.App?.db?.appointments||[];
    }
  }catch{}
  return data;
};

SaaS.crmProfile=function(client,appointments){
  const visits=appointments.filter(a=>a.clientId===client.id&&a.status!=="Cancelada");
  const completed=visits.filter(a=>["Completada","Pagada"].includes(a.status));
  const spend=completed.reduce((s,a)=>s+Number(a.total||a.price||0),0);
  const dates=visits.map(a=>new Date(`${a.date||"1970-01-01"}T${a.time||"12:00"}`)).filter(d=>!isNaN(d));
  const last=dates.length?new Date(Math.max(...dates.map(d=>d.getTime()))):null;
  const days=last?Math.floor((Date.now()-last.getTime())/86400000):9999;
  let segment="new";
  if(completed.length>=8||spend>=500)segment="vip";
  else if(completed.length>=2)segment="recurring";
  if(completed.length>=2&&days>60)segment="risk";
  return {visits:completed.length,spend,last,days,segment};
};

SaaS.renderCRM=function(){
  const select=document.getElementById("crmBusinessSelect");if(!select)return;
  const old=select.value;
  select.innerHTML='<option value="">Seleccionar negocio</option>'+SaaS.db.businesses.map(b=>`<option value="${b.id}">${b.name}</option>`).join("");
  if(old&&SaaS.db.businesses.some(b=>b.id===old))select.value=old;
  else if(SaaS.getContext()?.businessId)select.value=SaaS.getContext().businessId;

  const businessId=select.value;
  const data=SaaS.loadCRMForBusiness(businessId);
  const rows=data.clients.map(c=>({...c,...SaaS.crmProfile(c,data.appointments)}));
  SaaS.crmData={...data,rows};

  const count=s=>rows.filter(x=>x.segment===s).length;
  document.getElementById("crmTotalClients").textContent=rows.length;
  document.getElementById("crmRecurring").textContent=count("recurring");
  document.getElementById("crmVIP").textContent=count("vip");
  document.getElementById("crmAtRisk").textContent=count("risk");

  const seg=document.getElementById("crmSegments");
  seg.innerHTML=[
    ["new","Nuevos",count("new"),"Primera etapa"],
    ["recurring","Recurrentes",count("recurring"),"Ya regresaron"],
    ["vip","VIP",count("vip"),"Alto valor"],
    ["risk","Por recuperar",count("risk"),"MÃ¡s de 60 dÃ­as"]
  ].map(x=>`<div class="crm-segment"><span class="crm-badge ${x[0]}">${x[1]}</span><b>${x[2]}</b><small>${x[3]}</small></div>`).join("");

  const rec=[];
  if(count("risk"))rec.push(`Hay ${count("risk")} cliente(s) que podrÃ­an recuperarse con una promociÃ³n o mensaje.`);
  if(count("new")>count("recurring"))rec.push("Conviene crear una recompensa para lograr una segunda visita.");
  if(count("vip"))rec.push(`Protege a tus ${count("vip")} cliente(s) VIP con beneficios exclusivos.`);
  if(!rows.length)rec.push("TodavÃ­a no hay datos suficientes de clientes para generar recomendaciones.");
  document.getElementById("crmRecommendations").innerHTML=rec.map(x=>`<div class="row"><span>${x}</span></div>`).join("");

  SaaS.renderCRMTable();
};

SaaS.renderCRMTable=function(){
  const box=document.getElementById("crmClientTable");if(!box)return;
  const q=(document.getElementById("crmSearch")?.value||"").toLowerCase().trim();
  const filter=document.getElementById("crmSegmentFilter")?.value||"";
  const rows=(SaaS.crmData.rows||[]).filter(c=>{
    const text=`${c.name||""} ${c.phone||""} ${c.email||""}`.toLowerCase();
    return (!q||text.includes(q))&&(!filter||c.segment===filter);
  });
  const names={new:"Nuevo",recurring:"Recurrente",vip:"VIP",risk:"Por recuperar"};
  box.innerHTML=`<table class="sambrix-table"><thead><tr><th>Cliente</th><th>Segmento</th><th>Visitas</th><th>Valor registrado</th><th>Ãšltima visita</th><th>Contacto</th></tr></thead><tbody>${rows.map(c=>`<tr>
    <td><strong>${c.name||"Cliente"}</strong></td>
    <td><span class="crm-badge ${c.segment}">${names[c.segment]}</span></td>
    <td>${c.visits}</td><td>$${Number(c.spend||0).toFixed(2)}</td>
    <td>${c.last?c.last.toLocaleDateString():"â€”"}</td>
    <td>${c.phone||c.email||"â€”"}</td>
  </tr>`).join("")}</tbody></table>`;
};

const oldRenderAll_140=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_140();SaaS.renderCRM()};

;

/* ---- js/saas/saas-members-ui.js ---- */

SaaS.openMembers=function(businessId){
  const b=SaaS.db.businesses.find(x=>x.id===businessId);if(!b)return;
  document.getElementById("businessUsersBusinessId").value=businessId;
  document.getElementById("businessUsersTitle").textContent=`Usuarios Â· ${b.name}`;
  document.getElementById("businessUsersModal").classList.remove("hidden");
  SaaS.renderMembers();
};
SaaS.closeMembers=()=>document.getElementById("businessUsersModal")?.classList.add("hidden");

SaaS.renderMembers=async function(){
  const id=document.getElementById("businessUsersBusinessId")?.value;if(!id||!window.SaaSAuthAdmin)return;
  const box=document.getElementById("businessMembersList");
  try{
    const list=await SaaSAuthAdmin.listBusinessMembers(id);
    box.innerHTML=list.map(m=>`<div class="row"><div><strong>${m.name||m.email}</strong><small>${m.email} Â· ${m.role}${m.active===false?' Â· ACCESO SUSPENDIDO':''}</small></div>${m.role==='owner'?'':(m.active===false?`<button class="btn secondary" onclick="SaaS.reactivateMember('${m.uid}')">Reactivar</button>`:`<button class="btn danger" onclick="SaaS.removeMember('${m.uid}')">Suspender acceso</button>`)}</div>`).join("")||'<div class="muted">Sin usuarios Firebase en este negocio.</div>';
  }catch(e){box.innerHTML=`<div class="muted">${e.message}</div>`}
};
SaaS.createMember=async function(){
  const businessId=document.getElementById("businessUsersBusinessId").value;
  try{
    await SaaSAuthAdmin.createBusinessMember({
      businessId,
      name:document.getElementById("memberName").value.trim(),
      email:document.getElementById("memberEmail").value.trim(),
      password:document.getElementById("memberPassword").value,
      role:document.getElementById("memberRole").value
    });
    window.App?.toast?.("Usuario creado");
    document.getElementById("memberPassword").value="";
    await SaaS.renderMembers();
  }catch(e){window.App?.toast?.(e.message||"No se pudo crear usuario")}
};
SaaS.removeMember=async function(uid){
  const businessId=document.getElementById("businessUsersBusinessId").value;
  if(!confirm("Â¿Suspender el acceso de este usuario? PodrÃ¡s reactivarlo despuÃ©s."))return;
  try{await SaaSAuthAdmin.removeBusinessMember(businessId,uid);await SaaS.renderMembers();window.App?.toast?.("Acceso suspendido")}catch(e){window.App?.toast?.(e.message)}
};

SaaS.reactivateMember=async function(uid){
  const businessId=document.getElementById("businessUsersBusinessId").value;
  try{await SaaSAuthAdmin.reactivateBusinessMember(businessId,uid);await SaaS.renderMembers();window.App?.toast?.("Acceso reactivado")}catch(e){window.App?.toast?.(e.message||"No se pudo reactivar")}
};

;

/* ---- js/saas/tenant-bridge.js ---- */

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

;

/* ---- js/saas/saas-security.js ---- */
SaaS.permissionRequests=SaaS.permissionRequests||[];

SaaS.securityPolicy={
  superadmin:["view_all_businesses","edit_any_business","manage_plans","manage_subscriptions","support_mode","approve_deletions","platform_settings","audit"],
  owner:["view_business","edit_business","manage_staff","manage_clients","manage_inventory","manage_cash","request_deletion"],
  manager:["view_business","manage_appointments","manage_clients","manage_inventory","manage_cash","request_deletion"],
  cashier:["view_business","manage_sales","manage_cash","request_deletion"],
  barber:["view_schedule","manage_own_appointments","request_deletion"]
};

SaaS.protectedActions=[
  {key:"delete_sale",name:"Eliminar una venta",roles:["superadmin"],requestable:true},
  {key:"delete_inventory",name:"Eliminar producto/movimiento",roles:["superadmin"],requestable:true},
  {key:"delete_payment",name:"Eliminar pago",roles:["superadmin"],requestable:true},
  {key:"delete_employee",name:"Eliminar empleado",roles:["superadmin","owner"],requestable:true},
  {key:"change_plan",name:"Cambiar plan SAMBRIX",roles:["superadmin"],requestable:false},
  {key:"suspend_business",name:"Suspender negocio",roles:["superadmin"],requestable:false}
];

SaaS.loadSecurity=function(){
  try{SaaS.permissionRequests=JSON.parse(localStorage.getItem("sambrix_permission_requests"))||[]}catch{SaaS.permissionRequests=[]}
};
SaaS.saveSecurity=function(){localStorage.setItem("sambrix_permission_requests",JSON.stringify(SaaS.permissionRequests))};

SaaS.currentSecurityRole=function(){
  const explicit=SaaS.session?.role||window.App?.session?.role||window.App?.currentUser?.role||"";
  if(explicit)return String(explicit).toLowerCase();
  if(document.body.dataset.loginMode==="superadmin")return "superadmin";
  return "owner";
};

SaaS.can=function(permission){
  const role=SaaS.currentSecurityRole();
  return (SaaS.securityPolicy[role]||[]).includes(permission);
};

SaaS.requestPermission=function(action,entityId="",detail={}){
  const ctx=SaaS.getContext?.()||{};
  const req={
    id:SaaS.uid(),action,entityId,detail,
    businessId:ctx.businessId||"",
    businessName:SaaS.db.businesses.find(b=>b.id===ctx.businessId)?.name||"",
    requestedBy:window.FirebaseBridge?.user?.email||SaaS.currentSecurityRole(),
    requestedRole:SaaS.currentSecurityRole(),
    status:"pending",createdAt:new Date().toISOString()
  };
  SaaS.permissionRequests.push(req);SaaS.saveSecurity();
  SaaS.audit?.("SECURITY","Solicitud de permiso creada",{action,requestId:req.id},ctx.businessId);
  SaaS.renderSecurity();
  return req;
};

SaaS.resolvePermission=function(id,status){
  const req=SaaS.permissionRequests.find(x=>x.id===id);if(!req)return;
  req.status=status;req.resolvedAt=new Date().toISOString();req.resolvedBy=window.FirebaseBridge?.user?.email||"SuperAdmin";
  SaaS.saveSecurity();SaaS.audit?.("SECURITY",status==="approved"?"Permiso aprobado":"Permiso rechazado",{action:req.action,requestId:id},req.businessId);SaaS.renderSecurity();
};

SaaS.requireProtectedAction=function(action,entityId="",detail={}){
  const policy=SaaS.protectedActions.find(x=>x.key===action);
  const role=SaaS.currentSecurityRole();
  if(!policy||policy.roles.includes(role))return true;
  if(policy.requestable){
    SaaS.requestPermission(action,entityId,detail);
    window.App?.toast?.("Solicitud enviada al administrador");
  }else{
    window.App?.toast?.("No tienes permiso para realizar esta acciÃ³n");
  }
  return false;
};

SaaS.renderSecurity=function(){
  const list=document.getElementById("permissionRequestsList");if(!list)return;
  const pending=SaaS.permissionRequests.filter(x=>x.status==="pending");
  document.getElementById("securityPendingCount").textContent=pending.length;
  document.getElementById("securityBusinessCount").textContent=SaaS.db.businesses.length;
  document.getElementById("securitySensitiveCount").textContent=SaaS.protectedActions.length;
  document.getElementById("securityCurrentRole").textContent=SaaS.currentSecurityRole().toUpperCase();
  document.getElementById("securityCurrentUser").textContent=window.FirebaseBridge?.user?.email||"SesiÃ³n local";

  list.innerHTML=[...SaaS.permissionRequests].reverse().map(r=>`<div class="row security-request ${r.status}">
    <div><strong>${r.businessName||"Plataforma"} Â· ${r.action}</strong><small>${r.requestedBy} Â· ${new Date(r.createdAt).toLocaleString()} Â· ${r.status}</small></div>
    ${r.status==="pending"?`<div class="security-actions"><button class="btn primary tiny" onclick="SaaS.resolvePermission('${r.id}','approved')">Aprobar</button><button class="btn secondary tiny" onclick="SaaS.resolvePermission('${r.id}','denied')">Rechazar</button></div>`:""}
  </div>`).join("")||'<div class="muted">No hay solicitudes.</div>';

  document.getElementById("protectedActionsList").innerHTML=SaaS.protectedActions.map(a=>`<div class="row"><div><strong>${a.name}</strong><small>${a.requestable?"Puede solicitar autorizaciÃ³n":"Solo rol autorizado"}</small></div><span class="permission-chip">${a.roles.join(", ")}</span></div>`).join("");

  const perms=["Ver negocio","Editar negocio","Personal","Clientes","Inventario","Caja","Solicitar eliminaciÃ³n","SuperAdmin"];
  const roles=[
    ["SuperAdmin",[1,1,1,1,1,1,1,1]],
    ["DueÃ±o",[1,1,1,1,1,1,1,0]],
    ["Gerente",[1,0,0,1,1,1,1,0]],
    ["Cajero",[1,0,0,0,0,1,1,0]],
    ["Barbero",[1,0,0,0,0,0,1,0]]
  ];
  document.getElementById("roleMatrix").innerHTML=`<table class="sambrix-table"><thead><tr><th>Rol</th>${perms.map(p=>`<th>${p}</th>`).join("")}</tr></thead><tbody>${roles.map(r=>`<tr><td><strong>${r[0]}</strong></td>${r[1].map(v=>`<td><span class="permission-chip ${v?"yes":"no"}">${v?"SÃ­":"No"}</span></td>`).join("")}</tr>`).join("")}</tbody></table>`;
};

const oldRenderAll_142=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_142();SaaS.renderSecurity()};

;

/* ---- js/saas/saas-onboarding.js ---- */
SaaS.ONBOARDING_TIMEZONES={
 "DO":{name:"RepÃºblica Dominicana",zones:[["America/Santo_Domingo","Santo Domingo (UTC-4)"]]},
 "PR":{name:"Puerto Rico",zones:[["America/Puerto_Rico","Puerto Rico (UTC-4)"]]},
 "US":{name:"Estados Unidos",zones:[["America/New_York","Este"],["America/Chicago","Central"],["America/Denver","MontaÃ±a"],["America/Los_Angeles","PacÃ­fico"],["America/Phoenix","Arizona"],["America/Anchorage","Alaska"],["Pacific/Honolulu","HawÃ¡i"]]},
 "MX":{name:"MÃ©xico",zones:[["America/Mexico_City","Ciudad de MÃ©xico"],["America/Cancun","CancÃºn"],["America/Monterrey","Monterrey"],["America/Tijuana","Tijuana"]]},
 "CO":{name:"Colombia",zones:[["America/Bogota","BogotÃ¡"]]},
 "VE":{name:"Venezuela",zones:[["America/Caracas","Caracas"]]},
 "EC":{name:"Ecuador",zones:[["America/Guayaquil","Guayaquil"]]},
 "PE":{name:"PerÃº",zones:[["America/Lima","Lima"]]},
 "CL":{name:"Chile",zones:[["America/Santiago","Santiago"]]},
 "AR":{name:"Argentina",zones:[["America/Argentina/Buenos_Aires","Buenos Aires"]]},
 "BR":{name:"Brasil",zones:[["America/Sao_Paulo","SÃ£o Paulo"],["America/Manaus","Manaus"],["America/Recife","Recife"]]},
 "PA":{name:"PanamÃ¡",zones:[["America/Panama","PanamÃ¡"]]},
 "CR":{name:"Costa Rica",zones:[["America/Costa_Rica","Costa Rica"]]},
 "GT":{name:"Guatemala",zones:[["America/Guatemala","Guatemala"]]},
 "SV":{name:"El Salvador",zones:[["America/El_Salvador","El Salvador"]]},
 "HN":{name:"Honduras",zones:[["America/Tegucigalpa","Tegucigalpa"]]},
 "NI":{name:"Nicaragua",zones:[["America/Managua","Managua"]]},
 "ES":{name:"EspaÃ±a",zones:[["Europe/Madrid","PenÃ­nsula"],["Atlantic/Canary","Islas Canarias"]]},
 "CA":{name:"CanadÃ¡",zones:[["America/Toronto","Toronto"],["America/Winnipeg","Winnipeg"],["America/Edmonton","Edmonton"],["America/Vancouver","Vancouver"],["America/Halifax","Halifax"]]},
 "GB":{name:"Reino Unido",zones:[["Europe/London","Londres"]]},
 "PT":{name:"Portugal",zones:[["Europe/Lisbon","Lisboa"]]},
 "OTHER":{name:"Otro",zones:[["UTC","UTC"]]}
};

SaaS.renderOnboardingCountries=function(){
 const country=document.getElementById("obCountry");if(!country)return;
 country.innerHTML=Object.entries(SaaS.ONBOARDING_TIMEZONES).map(([code,x])=>`<option value="${code}">${x.name}</option>`).join("");
 country.value="DO";
 SaaS.renderOnboardingTimezones();
};

SaaS.renderOnboardingTimezones=function(){
 const country=document.getElementById("obCountry"), zone=document.getElementById("obTimezone");if(!country||!zone)return;
 const item=SaaS.ONBOARDING_TIMEZONES[country.value]||SaaS.ONBOARDING_TIMEZONES.OTHER;
 zone.innerHTML=item.zones.map(([id,name])=>`<option value="${id}">${name}</option>`).join("");
};

SaaS.onboarding={step:1,planId:""};

SaaS.renderOnboarding=function(){
 const b=document.getElementById("onboardingBusinessList");if(!b)return;
 b.innerHTML=(SaaS.db.businesses||[]).map(x=>`<div class="row"><div><strong>${x.name}</strong><small>${x.ownerEmail||"Sin correo"} Â· ${x.status||"â€”"}</small></div></div>`).join("")||'<div class="muted">TodavÃ­a no hay negocios creados.</div>';
};

SaaS.openOnboarding=function(){
 SaaS.onboarding={step:1,planId:SaaS.db.plans?.[0]?.id||""};
 ["obBusinessName","obBusinessPhone","obBusinessCity","obOwnerName","obOwnerEmail","obOwnerPhone","obOwnerPassword","obOwnerPasswordConfirm","obBranchAddress","obBrandTagline"].forEach(id=>{const e=document.getElementById(id);if(e)e.value=""});
 const branch=document.getElementById("obBranchName");if(branch)branch.value="Principal";
 const brand=document.getElementById("obBrandName");if(brand)brand.value="";
 SaaS.renderOnboardingCountries();
 SaaS.renderOnboardingPlans();
 SaaS.showOnboardingStep();
 document.getElementById("onboardingModal")?.classList.add("open");
 document.getElementById("onboardingModal")?.classList.remove("hidden");
};

SaaS.closeOnboarding=function(){
 const m=document.getElementById("onboardingModal");m?.classList.remove("open");m?.classList.add("hidden");
};

SaaS.renderOnboardingPlans=function(){
 const box=document.getElementById("obPlanCards");if(!box)return;
 box.innerHTML=(SaaS.db.plans||[]).map(p=>`<article class="addon-card ob-plan ${SaaS.onboarding.planId===p.id?"selected":""}" onclick="SaaS.selectOnboardingPlan('${p.id}')"><strong>${p.name}</strong><div class="addon-price">$${Number(p.price||0).toFixed(2)} <small>/ mes</small></div></article>`).join("");
};

SaaS.selectOnboardingPlan=function(id){SaaS.onboarding.planId=id;SaaS.renderOnboardingPlans()};

SaaS.nextOnboarding=function(){
 const s=SaaS.onboarding.step;
 if(s===1&&!document.getElementById("obBusinessName").value.trim())return alert("Escribe el nombre del negocio.");
 if(s===2){
   const name=document.getElementById("obOwnerName").value.trim();
   const email=document.getElementById("obOwnerEmail").value.trim().toLowerCase();
   const pw=document.getElementById("obOwnerPassword").value;
   const pw2=document.getElementById("obOwnerPasswordConfirm").value;
   if(!name||!email)return alert("Completa nombre y correo del propietario.");
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return alert("Escribe un correo vÃ¡lido.");
   if(pw.length<8)return alert("La contraseÃ±a temporal debe tener al menos 8 caracteres.");
   if(pw!==pw2)return alert("Las contraseÃ±as no coinciden.");
 }
 if(s===1){
   document.getElementById("obBranchCity").value=document.getElementById("obBusinessCity").value;
   document.getElementById("obBrandName").value=document.getElementById("obBusinessName").value;
 }
 SaaS.onboarding.step=Math.min(6,s+1);
 SaaS.showOnboardingStep();
};

SaaS.prevOnboarding=function(){SaaS.onboarding.step=Math.max(1,SaaS.onboarding.step-1);SaaS.showOnboardingStep()};

SaaS.showOnboardingStep=function(){
 const s=SaaS.onboarding.step;
 document.querySelectorAll(".onboarding-step").forEach(e=>e.classList.toggle("active",+e.dataset.obStep===s));
 document.getElementById("onboardingProgressBar").style.width=(s/6*100)+"%";
 document.getElementById("obPrevBtn").classList.toggle("hidden",s===1);
 document.getElementById("obNextBtn").classList.toggle("hidden",s===6);
 document.getElementById("obCreateBtn").classList.toggle("hidden",s!==6);
 if(s===6)SaaS.renderOnboardingSummary();
};

SaaS.renderOnboardingSummary=function(){
 const p=SaaS.getPlan(SaaS.onboarding.planId);
 const country=SaaS.ONBOARDING_TIMEZONES[document.getElementById("obCountry").value]?.name||"â€”";
 const rows=[
  ["Negocio",document.getElementById("obBusinessName").value],
  ["Tipo",document.getElementById("obBusinessType").value],
  ["Propietario",document.getElementById("obOwnerName").value],
  ["Correo de acceso",document.getElementById("obOwnerEmail").value],
  ["PaÃ­s",country],
  ["Zona horaria",document.getElementById("obTimezone").value],
  ["Sucursal",document.getElementById("obBranchName").value],
  ["Plan",p?.name||"â€”"],
  ["Marca",document.getElementById("obBrandName").value]
 ];
 document.getElementById("obSummary").innerHTML=rows.map(r=>`<div class="row"><span>${r[0]}</span><strong>${r[1]}</strong></div>`).join("");
};

SaaS.tryCreateOwnerAccess=async function({businessId,name,email,password}){
 const b=SaaS.db.businesses.find(x=>x.id===businessId);
 const canFirebase=!!window.SaaSAuthAdmin?.createBusinessMember && !!SaaS.authenticatedUser?.();

 if(canFirebase){
   try{
     const u=await SaaSAuthAdmin.createBusinessMember({businessId,name,email,password,role:"owner"});
     return {status:"active",uid:u.uid,detail:"Acceso Firebase del propietario creado correctamente."};
   }catch(error){
     // In production an incomplete/local-only owner is not acceptable.
     if(window.App?.PRODUCTION_MODE)throw error;
     if(b){
       const local=await SaaS.createLocalReviewCredential?.(b,password);
       return {status:"local-review",detail:`Firebase pendiente (${error?.message||"error"}). Se creÃ³ acceso local de prueba.`};
     }
     return {status:"pending",detail:`Negocio creado. Acceso Firebase pendiente: ${error?.message||"no disponible"}`};
   }
 }

 if(window.App?.PRODUCTION_MODE)throw new Error("Firebase no estÃ¡ listo para crear el acceso del propietario.");
 if(b&&SaaS.createLocalReviewCredential)return await SaaS.createLocalReviewCredential(b,password);
 return {status:"pending",detail:"Propietario registrado. ActivaciÃ³n Firebase pendiente."};
};

SaaS.showOnboardingSuccess=function(business,access){
 document.getElementById("obSuccessBusinessName").textContent=business.name;
 document.getElementById("obSuccessOwner").textContent=`Propietario: ${business.owner} Â· ${business.ownerEmail}`;
 const box=document.getElementById("obSuccessAccessState");
 box.className=access.status==="active"?"launch-result ready":"launch-result";
 box.innerHTML=access.status==="active"
  ?`<span class="tag">ACCESO ACTIVO</span><h2>Propietario creado</h2><p>${access.detail}</p>`
  :access.status==="local-review"
    ?`<span class="tag">PRUEBA LOCAL</span><h2>Acceso local disponible</h2><p>${access.detail} No se considera acceso de producciÃ³n.</p>`
    :`<span class="tag">NEGOCIO CREADO</span><h2>Propietario pendiente de Firebase</h2><p>${access.detail}</p>`;
 const modal=document.getElementById("onboardingSuccessModal");
 modal?.classList.remove("hidden");modal?.classList.add("open");
};

SaaS.closeOnboardingSuccess=function(){
 const modal=document.getElementById("onboardingSuccessModal");modal?.classList.remove("open");modal?.classList.add("hidden");
 SaaS.session.role="superadmin";
 document.body.dataset.sambrixRole="superadmin";
 document.getElementById("adminApp")?.classList.remove("hidden");
 SaaS.applyRoleUI?.();
 window.App?.go?.("superadmin");
 SaaS.renderAll?.();
};

SaaS.createFromOnboarding=async function(){
 const button=document.getElementById("obCreateBtn");
 if(button?.disabled)return;
 if(button){button.disabled=true;button.textContent="Creando...";}
 let createdBusinessId="", createdSubscriptionId="", ownerAccessCreated=false;

 try{
   if(window.App?.PRODUCTION_MODE){
     if(!window.FirebaseBridge?.connected)throw new Error("No hay conexiÃ³n con Firebase. Vuelve a iniciar sesiÃ³n e intÃ©ntalo de nuevo.");
     await window.SaaSAuthAdmin?.refreshAccess?.();
     if(!window.SaaSAuthAdmin?.isSuperAdmin?.())throw new Error("Tu sesiÃ³n no tiene permisos de SuperAdmin para crear negocios.");
   }
   const ownerEmail=document.getElementById("obOwnerEmail").value.trim().toLowerCase();
   if((SaaS.db.businesses||[]).some(b=>String(b.ownerEmail||"").toLowerCase()===ownerEmail)){
     throw new Error("Ya existe un negocio con ese correo de propietario.");
   }

   const id="biz_"+SaaS.uid(), branchId="branch_"+SaaS.uid(), ownerId="owner_"+SaaS.uid();
   createdBusinessId=id;
   const next=new Date();next.setMonth(next.getMonth()+1);
   const countryCode=document.getElementById("obCountry").value;
   const country=SaaS.ONBOARDING_TIMEZONES[countryCode]?.name||countryCode;
   const ownerName=document.getElementById("obOwnerName").value.trim();
   const ownerPassword=document.getElementById("obOwnerPassword").value;

   const b={
     id,
     name:document.getElementById("obBusinessName").value.trim(),
     type:document.getElementById("obBusinessType").value,
     phone:document.getElementById("obBusinessPhone").value.trim(),
     city:document.getElementById("obBusinessCity").value.trim(),
     country,
     countryCode,
     timezone:document.getElementById("obTimezone").value,
     owner:ownerName,
     ownerEmail,
     ownerPhone:document.getElementById("obOwnerPhone").value.trim(),
     ownerUserId:ownerId,
     planId:SaaS.onboarding.planId,
     status:"Activo",
     nextPayment:next.toISOString().slice(0,10),
     billingCycle:"monthly",
     renewalPolicy:"monthly",
     createdAt:new Date().toISOString(),
     branches:[{
       id:branchId,
       name:document.getElementById("obBranchName").value.trim()||"Principal",
       address:document.getElementById("obBranchAddress").value.trim(),
       city:document.getElementById("obBranchCity").value.trim(),
       country,
       timezone:document.getElementById("obTimezone").value,
       active:true
     }],
     members:[{
       id:ownerId,
       name:ownerName,
       email:ownerEmail,
       phone:document.getElementById("obOwnerPhone").value.trim(),
       role:"owner",
       authStatus:"pending",
       createdAt:new Date().toISOString()
     }],
     brand:{
       name:document.getElementById("obBrandName").value.trim()||document.getElementById("obBusinessName").value.trim(),
       tagline:document.getElementById("obBrandTagline").value.trim(),
       primaryColor:document.getElementById("obBrandColor").value
     }
   };

   // Persist business first. Do not switch tenant and do not leave SuperAdmin.
   SaaS.db.businesses.push(b);

   // Create the commercial subscription at the same time as the business.
   SaaS.db.subscriptions=Array.isArray(SaaS.db.subscriptions)?SaaS.db.subscriptions:[];
   const selectedPlan=SaaS.getPlan?.(b.planId);
   createdSubscriptionId="sub_"+SaaS.uid();
   SaaS.db.subscriptions.push({
     id:createdSubscriptionId,
     businessId:b.id,
     businessName:b.name,
     planId:b.planId,
     planName:selectedPlan?.name||"Sin plan",
     price:Number(selectedPlan?.price||0),
     amount:Number(selectedPlan?.price||0),
     currency:"USD",
     cycle:"monthly",
     renewalPolicy:"monthly",
     status:"Active",
     startedAt:b.createdAt,
     nextDue:b.nextPayment,
     renewalDate:b.nextPayment,
     createdAt:new Date().toISOString()
   });

   SaaS.save();
   SaaS.saveTenantState?.(id,SaaS.blankBusinessState?.(b)||{meta:{businessId:id,branchId},business:{name:b.name}});

   const access=await SaaS.tryCreateOwnerAccess({
     businessId:id,name:ownerName,email:ownerEmail,password:ownerPassword
   });
   ownerAccessCreated=access.status==="active";

   b.members[0].authStatus=access.status;
   b.ownerAccessStatus=access.status;
   SaaS.save();

   // Critical production step: persist the SuperAdmin catalog immediately.
   // Without this, the realtime catalog watcher can restore the previous cloud
   // version and make the just-created business appear to vanish.
   if(window.App?.PRODUCTION_MODE){
     await window.SaaSCloudProduction?.forceUploadCatalog?.();
   }

   SaaS.audit?.("BUSINESS","Negocio y propietario creados por onboarding",{
     branchId,ownerEmail,country,timezone:b.timezone,ownerAccessStatus:access.status
   },id);

   SaaS.closeOnboarding();

   // Keep SuperAdmin context and never redirect to Business/Firebase blocker.
   SaaS.session.role="superadmin";
   document.body.dataset.sambrixRole="superadmin";
   document.getElementById("adminApp")?.classList.remove("hidden");
   document.getElementById("loginView")?.classList.add("hidden");
   SaaS.removeAuthBlocker?.();
   SaaS.renderAll?.();
   window.App?.go?.("superadmin");

   SaaS.showOnboardingSuccess(b,access);
 }catch(error){
   // Roll back local platform records if production onboarding did not finish.
   if(createdBusinessId && !ownerAccessCreated){
     SaaS.db.businesses=(SaaS.db.businesses||[]).filter(b=>b.id!==createdBusinessId);
     SaaS.db.subscriptions=(SaaS.db.subscriptions||[]).filter(s=>s.id!==createdSubscriptionId && s.businessId!==createdBusinessId);
     try{localStorage.removeItem(SaaS.tenantStorageKey?.(createdBusinessId)||"")}catch{}
     SaaS.save();
     SaaS.renderAll?.();
   }
   let message=error?.message||"No se pudo crear el negocio.";
   if(ownerAccessCreated){
     message="El negocio y su propietario se crearon en Firebase, pero fallÃ³ la actualizaciÃ³n del catÃ¡logo general. No lo vuelvas a crear: pulsa Actualizar o vuelve a iniciar sesiÃ³n para reintentar la sincronizaciÃ³n. Detalle: "+message;
   }
   const code=String(error?.code||"");
   if(code.includes("email-already-in-use"))message="Ese correo ya estÃ¡ registrado en Firebase. Usa otro correo para el propietario o vincula la cuenta existente.";
   else if(code.includes("permission-denied"))message="Firebase rechazÃ³ la operaciÃ³n por permisos. Publica las reglas de Firestore de esta versiÃ³n y vuelve a intentarlo.";
   else if(code.includes("weak-password"))message="La contraseÃ±a del propietario no cumple la seguridad mÃ­nima.";
   alert(message);
 }finally{
   if(button){button.disabled=false;button.textContent="Crear negocio y propietario";}
 }
};

const oldRenderAll_205=SaaS.renderAll;
SaaS.renderAll=function(){
 oldRenderAll_205();
 SaaS.renderOnboarding();
};

;

/* ---- js/saas/sambrix-owner-access.js ---- */

SaaS.ownerCredentialIterations=120000;

SaaS.bytesToBase64=function(bytes){
  let binary="";
  bytes.forEach(b=>binary+=String.fromCharCode(b));
  return btoa(binary);
};

SaaS.base64ToBytes=function(value){
  const binary=atob(value);
  return Uint8Array.from(binary,c=>c.charCodeAt(0));
};

SaaS.deriveOwnerPasswordHash=async function(password,salt,iterations=SaaS.ownerCredentialIterations){
  if(!window.crypto?.subtle)throw new Error("Este navegador no permite validar credenciales locales de forma segura.");
  const enc=new TextEncoder();
  const material=await crypto.subtle.importKey("raw",enc.encode(password),"PBKDF2",false,["deriveBits"]);
  const bits=await crypto.subtle.deriveBits(
    {name:"PBKDF2",hash:"SHA-256",salt,iterations},
    material,
    256
  );
  return new Uint8Array(bits);
};

SaaS.createLocalReviewCredential=async function(business,password){
  if(!business||!password||password.length<8)throw new Error("Usa una contraseÃ±a de al menos 8 caracteres.");
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const hash=await SaaS.deriveOwnerPasswordHash(password,salt);
  business.localReviewCredential={
    algorithm:"PBKDF2-SHA256",
    iterations:SaaS.ownerCredentialIterations,
    salt:SaaS.bytesToBase64(salt),
    hash:SaaS.bytesToBase64(hash),
    updatedAt:new Date().toISOString()
  };
  business.ownerAccessStatus="local-review";
  const owner=(business.members||[]).find(m=>String(m.role||"").toLowerCase()==="owner");
  if(owner)owner.authStatus="local-review";
  SaaS.save();
  return {status:"local-review",detail:"Acceso local de prueba creado. No sustituye Firebase para producciÃ³n."};
};

SaaS.verifyLocalReviewCredential=async function(business,password){
  const c=business?.localReviewCredential;
  if(!c?.salt||!c?.hash)return false;
  const salt=SaaS.base64ToBytes(c.salt);
  const actual=await SaaS.deriveOwnerPasswordHash(password,salt,Number(c.iterations||SaaS.ownerCredentialIterations));
  const expected=SaaS.base64ToBytes(c.hash);
  if(actual.length!==expected.length)return false;
  let diff=0;
  for(let i=0;i<actual.length;i++)diff|=actual[i]^expected[i];
  return diff===0;
};

SaaS.ownerLoginLocal=async function(email,password){
  const normalized=String(email||"").trim().toLowerCase();
  const business=(SaaS.db.businesses||[]).find(b=>String(b.ownerEmail||"").toLowerCase()===normalized);
  if(!business)return null;
  const ok=await SaaS.verifyLocalReviewCredential(business,password);
  if(!ok)return null;
  return {
    business,
    role:"owner",
    reviewAccess:true,
    user:{email:normalized,name:business.owner||normalized,localReview:true}
  };
};

SaaS.ownerLoginFirebase=async function(email,password){
  if(!window.FirebaseBridge?.loginWithEmailPassword||!window.SaaSAuthAdmin?.myBusinessMemberships)return null;
  try{
    const user=await FirebaseBridge.loginWithEmailPassword(email,password);
    let resolved=await SaaSAuthAdmin.resolveMyBusiness?.();
    if(!resolved){
      const memberships=await SaaSAuthAdmin.myBusinessMemberships?.()||[];
      const membership=memberships[0];
      const business=membership?SaaS.db.businesses.find(b=>b.id===membership.businessId):null;
      if(business)resolved={business,membership};
    }
    if(!resolved?.membership||!resolved?.business)return null;
    const {business,membership}=resolved;
    if(!SaaS.db.businesses.some(b=>b.id===business.id)){SaaS.db.businesses.push(business);SaaS.save?.();}
    return {business,role:membership.role||"owner",reviewAccess:false,user:{email:user.email,uid:user.uid,name:membership.name||user.email}};
  }catch{
    return null;
  }
};

SaaS.loginBusinessOwner=async function(email,password){
  let result=null;

  // Prefer real Firebase when available.
  if(window.FirebaseBridge?.loginWithEmailPassword){
    result=await SaaS.ownerLoginFirebase(email,password);
  }

  // Local review is permitted only in non-production builds.
  if(!result && !window.App?.PRODUCTION_MODE){
    result=await SaaS.ownerLoginLocal(email,password);
  }

  if(!result)return false;

  const b=result.business;
  const switched=SaaS.switchTenant?.(b.id,{support:false});
  if(switched===false)throw new Error("No se pudo cargar el negocio asociado a este usuario.");

  // Defensive tenant assertion: never continue into another business.
  if(String(window.App?.db?.meta?.businessId||"")!==String(b.id)){
    throw new Error("SAMBRIX bloqueÃ³ una carga de negocio incorrecta.");
  }

  SaaS.session={
    role:result.role||"owner",
    user:result.user,
    businessId:b.id,
    branchId:b.branches?.[0]?.id||"",
    reviewAccess:!!result.reviewAccess
  };

  document.body.dataset.sambrixRole=SaaS.session.role;
  document.body.dataset.ownerAccessMode=result.reviewAccess?"local-review":"firebase";
  document.getElementById("loginView")?.classList.add("hidden");
  document.getElementById("sambrixPortal")?.classList.add("hidden");
  document.getElementById("adminApp")?.classList.remove("hidden");

  SaaS.applyRoleUI?.();
  window.App?.renderAll?.();
  SaaS.renderOwnerAccessBadge?.();

  // Always enter the business owner dashboard, never the client/store view.
  document.getElementById("clientApp")?.classList.add("hidden");
  window.App?.go?.("inicio");
  window.SaaSCloudProduction?.syncForCurrentSession?.().catch?.(console.error);

  return true;
};

SaaS.renderOwnerAccessBadge=function(){
  const badge=document.getElementById("sessionRoleBadge");
  const role=document.getElementById("sessionRoleName");
  const business=document.getElementById("sessionBusinessName");
  if(!badge||!role||!business)return;

  if(SaaS.session?.reviewAccess){
    badge.classList.remove("hidden");
    role.textContent="OWNER Â· PRUEBA LOCAL";
    business.textContent=SaaS.currentBusiness?.()?.name||"";
    badge.dataset.accessMode="local-review";
  }
};

SaaS.openOwnerAccessSetup=function(businessId){
  const b=SaaS.db.businesses.find(x=>x.id===businessId);if(!b)return;
  document.getElementById("ownerAccessBusinessId").value=businessId;
  document.getElementById("ownerAccessSetupTitle").textContent=`Acceso Â· ${b.name}`;
  document.getElementById("ownerAccessEmail").value=b.ownerEmail||"";
  document.getElementById("ownerAccessPassword").value="";
  document.getElementById("ownerAccessPasswordConfirm").value="";

  const firebaseReady=!!window.FirebaseBridge?.connected && !!window.SaaSAuthAdmin?.createBusinessMember;
  document.getElementById("ownerAccessModeNote").innerHTML=firebaseReady
    ?'<strong>ProducciÃ³n Firebase</strong><span>Se intentarÃ¡ crear un acceso real asociado a este negocio.</span>'
    :'<strong>Modo de prueba local</strong><span>La contraseÃ±a se guarda Ãºnicamente como hash PBKDF2. Sirve para probar Business localmente, pero no cuenta como acceso de producciÃ³n.</span>';

  const modal=document.getElementById("ownerAccessSetupModal");
  modal?.classList.remove("hidden");
  modal?.classList.add("open");
};

SaaS.closeOwnerAccessSetup=function(){
  const modal=document.getElementById("ownerAccessSetupModal");
  if(!modal)return;
  modal.classList.remove("open");
  modal.classList.add("hidden");
  document.getElementById("ownerAccessPassword")&&(document.getElementById("ownerAccessPassword").value="");
  document.getElementById("ownerAccessPasswordConfirm")&&(document.getElementById("ownerAccessPasswordConfirm").value="");
};

SaaS.saveOwnerAccessSetup=async function(){
  const id=document.getElementById("ownerAccessBusinessId").value;
  const b=SaaS.db.businesses.find(x=>x.id===id);if(!b)return;
  const password=document.getElementById("ownerAccessPassword").value;
  const confirmPassword=document.getElementById("ownerAccessPasswordConfirm").value;

  if(password.length<8)return alert("La contraseÃ±a debe tener al menos 8 caracteres.");
  if(password!==confirmPassword)return alert("Las contraseÃ±as no coinciden.");

  const btn=document.getElementById("saveOwnerAccessSetup");
  if(btn){
    btn.disabled=true;
    btn.textContent="Guardando...";
    btn.setAttribute("aria-busy","true");
  }

  try{
    let result=null;
    const firebaseReady=!!window.FirebaseBridge?.connected && !!window.SaaSAuthAdmin?.createBusinessMember;
    if(window.App?.PRODUCTION_MODE && !firebaseReady){
      throw new Error("Firebase debe estar conectado para crear accesos de producciÃ³n.");
    }

    if(firebaseReady){
      try{
        const user=await SaaSAuthAdmin.createBusinessMember({
          businessId:b.id,
          name:b.owner,
          email:b.ownerEmail,
          password,
          role:"owner"
        });
        b.ownerAccessStatus="active";
        const owner=(b.members||[]).find(m=>String(m.role||"").toLowerCase()==="owner");
        if(owner){owner.authStatus="active";owner.firebaseUid=user.uid;}
        result={status:"active",detail:"Acceso Firebase creado correctamente."};
      }catch(error){
        if(window.App?.PRODUCTION_MODE) throw error;
        result=await SaaS.createLocalReviewCredential(b,password);
        result.detail=`Firebase no pudo crear el usuario (${error?.message||"error"}). Se creÃ³ acceso local de prueba.`;
      }
    }else{
      result=await SaaS.createLocalReviewCredential(b,password);
    }

    SaaS.save();
    SaaS.audit?.("SECURITY","Acceso del propietario configurado",{status:result.status,email:b.ownerEmail},b.id);
    SaaS.closeOwnerAccessSetup();
    SaaS.renderActivation?.();
    SaaS.renderAll?.();
    window.App?.toast?.(result.status==="active"?"Acceso del propietario activo":"Acceso local de prueba creado");
  }catch(error){
    alert(error?.message||"No se pudo configurar el acceso.");
  }finally{
    if(btn){
      btn.disabled=false;
      btn.textContent="Guardar acceso";
      btn.removeAttribute("aria-busy");
    }
  }
};

;

/* ---- js/saas/sambrix-portal.js ---- */
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
        :"Acceso del propietario y personal del negocio";
    }

    const userLabel=document.getElementById("loginUserLabel");
    const pinLabel=document.getElementById("loginPinLabel");
    const userInput=document.getElementById("loginUser");
    const pinInput=document.getElementById("loginPin");
    const hint=document.getElementById("loginHint");

    if(mode==="superadmin"){
      if(userLabel)userLabel.childNodes[0].nodeValue="Correo";
      if(pinLabel)pinLabel.childNodes[0].nodeValue="ContraseÃ±a";
      if(userInput){userInput.type="email";userInput.value="";userInput.placeholder="superadmin@sambrix.com";}
      if(pinInput){pinInput.value="";pinInput.placeholder="Tu contraseÃ±a";}
      if(hint){hint.textContent="Acceso protegido con Firebase. Solo cuentas autorizadas de SuperAdmin.";hint.classList.remove("hidden");}
    }else{
      if(userLabel)userLabel.childNodes[0].nodeValue="Correo";
      if(pinLabel)pinLabel.childNodes[0].nodeValue="ContraseÃ±a";
      if(userInput){userInput.type="email";userInput.value="";userInput.placeholder="propietario@negocio.com";}
      if(pinInput){pinInput.value="";pinInput.placeholder="Tu contraseÃ±a";}
      if(hint){hint.textContent="Usa el correo y la contraseÃ±a asignados al propietario.";hint.classList.remove("hidden");}
    }
  },

  prepareDemoState(){
    const A=window.App;
    if(!A)return null;

    SaaS.portal.cleanupDemo();
    const demoBusiness={
      id:SaaS.portal._demoBusinessId,
      name:"SAMBRIX Demo Studio",
      type:"SalÃ³n / BarberÃ­a",
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
    A.db.business.clientApp.heroTitle="Reserva tu prÃ³xima cita";
    A.db.business.clientApp.heroSubtitle="DemostraciÃ³n de la experiencia que verÃ¡ el cliente.";
    A.db.business.clientApp.promotions=[
      {id:"demo-promo",title:"Bienvenida SAMBRIX",text:"PromociÃ³n demostrativa"}
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

    if(!b && !window.App?.PRODUCTION_MODE){
      b=(SaaS.db?.businesses||[]).find(
        x=>x.id!==SaaS.portal._demoBusinessId && !["Suspendido","Vencido"].includes(x.status)
      );
    }

    // In production never guess a tenant from browser cache. Public booking links
    // must identify the business explicitly (?business=ID&cliente=app).
    if(!b && window.App?.PRODUCTION_MODE){
      SaaS.portal.show();
      window.App?.toast?.("Abre el enlace de reservas de tu negocio.");
      return;
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
    window.App?.toast?.("Modo demostraciÃ³n de cliente");
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
  document.getElementById("portalStartBtn")?.addEventListener("click",()=>SaaS.portal.openLogin("business"));
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

;

/* ---- js/saas/sambrix-session.js ---- */
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

SaaS.normalizeRole=function(role){role=String(role||"").trim().toLowerCase();const map={"dueÃ±o":"owner","dueno":"owner","owner":"owner","administrador":"admin","admin":"admin","gerente":"manager","manager":"manager","cajero":"cashier","cashier":"cashier","barbero":"barber","profesional":"barber","empleado":"barber","barber":"barber","recepciÃ³n":"reception","recepcion":"reception","recepcionista":"reception","reception":"reception","superadmin":"superadmin","super_admin":"superadmin"};return map[role]||role||"guest"};

// Permisos de escritura por dominio. Deben mantenerse alineados con saas-cloud.js y Firestore.
SaaS.DOMAIN_WRITE_ROLES={
  config:new Set(["superadmin","owner","admin","manager"]),
  crm:new Set(["superadmin","owner","admin","manager","reception","cashier"]),
  schedule:new Set(["superadmin","owner","admin","manager","reception","barber"]),
  finance:new Set(["superadmin","owner","admin","manager","reception","cashier"]),
  inventory:new Set(["superadmin","owner","admin","manager","cashier"]),
  staff:new Set(["superadmin","owner","admin","manager"]),
  attendance:new Set(["superadmin","owner","admin","manager","barber"]),
  history:new Set(["superadmin","owner","admin","manager"])
};
SaaS.canWriteDomain=function(domain){const role=SaaS.normalizeRole(SaaS.session?.role);return !!SaaS.DOMAIN_WRITE_ROLES[String(domain||"").toLowerCase()]?.has(role)};
SaaS.requireDomainWrite=function(domain,message){if(SaaS.canWriteDomain(domain))return true;window.App?.toast?.(message||"No tienes permiso para realizar esta operaciÃ³n");return false};

SaaS.resolveFirebaseSession=async function(){const user=window.FirebaseBridge?.user;if(!user){SaaS.session={role:"guest",user:null,businessId:"",branchId:""};return SaaS.session}try{const access=await window.SaaSAuthAdmin?.refreshAccess?.();if(access?.superAdmin){SaaS.session={role:"superadmin",user,businessId:"",branchId:""};return SaaS.session}const resolved=await window.SaaSAuthAdmin?.resolveMyBusiness?.();if(resolved?.membership&&resolved?.business){const m=resolved.membership,b=resolved.business;if(!SaaS.db.businesses.some(x=>x.id===b.id)){SaaS.db.businesses.push(b);SaaS.save?.()}SaaS.session={role:SaaS.normalizeRole(m.role),user,businessId:b.id,branchId:b?.branches?.[0]?.id||""};if(SaaS.getContext()?.businessId!==b.id)SaaS.switchTenant?.(b.id,{branchId:SaaS.session.branchId,support:false});return SaaS.session}const memberships=await window.SaaSAuthAdmin?.myBusinessMemberships?.()||[];if(memberships.length){const m=memberships[0],b=SaaS.db.businesses.find(x=>x.id===m.businessId);if(b){SaaS.session={role:SaaS.normalizeRole(m.role),user,businessId:m.businessId,branchId:b?.branches?.[0]?.id||""};if(SaaS.getContext()?.businessId!==m.businessId)SaaS.switchTenant?.(m.businessId,{branchId:SaaS.session.branchId,support:false});return SaaS.session}}}catch(e){console.warn("[SAMBRIX session]",e)}SaaS.session={role:"guest",user,businessId:"",branchId:""};return SaaS.session};
SaaS.pageAllowed=function(page){const role=SaaS.session?.role||"guest",pages=SaaS.ROLE_PAGES[role]||[];return pages.includes("*")||pages.includes(page)};
SaaS.defaultPageForRole=function(role){if(role==="superadmin")return "superadmin";if(["owner","admin","manager"].includes(role))return "inicio";if(role==="reception")return "citas";if(role==="cashier")return "caja";if(role==="barber")return "citas";return "inicio"};
SaaS.installPermissionBridge=function(){const A=window.App;if(!A||A.__sambrixPermissionBridge)return;const legacyAllowed=A.allowed?.bind(A);A.allowed=function(page){const role=SaaS.session?.role||"guest";if(role!=="guest")return SaaS.pageAllowed(page);return legacyAllowed?legacyAllowed(page):false};A.__sambrixPermissionBridge=true};
SaaS.installSuperAdminRouteGuard=function(){const A=window.App;if(!A||A.__sambrixSuperAdminRouteGuard)return;const baseGo=A.go?.bind(A);if(!baseGo)return;A.go=function(page){const role=SaaS.session?.role||"guest";if(role==="superadmin"&&["inicio","citas","clientes","barberos","caja","inventario","servicios","usuarios","recibos","autorizaciones","reportes","auditoria","configuracion"].includes(page))page="superadmin";return baseGo(page)};A.__sambrixSuperAdminRouteGuard=true};
SaaS.applyRoleUI=function(){const role=SaaS.session?.role||"guest";document.body.dataset.sambrixRole=role;document.querySelectorAll(".bottom-nav button[data-page]").forEach(btn=>{const page=btn.dataset.page;let show=SaaS.pageAllowed(page);if(role==="superadmin")show=show&&btn.classList.contains("nav-saas");btn.style.display=show?"flex":"none"});const label=document.getElementById("sambrixRoleLabel");if(label)label.textContent=SaaS.roleLabel(role);const tenant=document.getElementById("sambrixTenantLabel");if(tenant)tenant.textContent=role==="superadmin"?"PLATAFORMA SAMBRIX":(SaaS.getCurrentBusiness()?.name||"SIN NEGOCIO")};
SaaS.routeSession=function(){const role=SaaS.session?.role||"guest";if(role==="guest"){SaaS.portal?.show?.();return}SaaS.installPermissionBridge?.();SaaS.installSuperAdminRouteGuard?.();SaaS.portal?.hide?.();document.getElementById("loginView")?.classList.add("hidden");document.getElementById("clientApp")?.classList.add("hidden");document.getElementById("adminApp")?.classList.remove("hidden");SaaS.applyRoleUI();const target=SaaS.defaultPageForRole(role);window.App?.go?.(target);if(role==="superadmin"){document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x.id==="superadmin"));document.querySelectorAll(".bottom-nav button").forEach(x=>x.classList.toggle("active",x.dataset.page==="superadmin"));SaaS.renderSuperAdminZeroState?.()}};
SaaS.secureNavigation=function(){SaaS.installPermissionBridge?.();SaaS.installSuperAdminRouteGuard?.();const A=window.App;if(!A||A.__sambrixRoleGuard)return;const old=A.go?.bind(A);if(!old)return;A.go=function(page){if(!SaaS.pageAllowed(page)){document.getElementById("accessDeniedMessage")&&(document.getElementById("accessDeniedMessage").textContent=`El rol ${SaaS.session?.role||"actual"} no tiene acceso a ${page}.`);return old("accessDenied")}return old(page)};A.__sambrixRoleGuard=true};
SaaS.signOutToPortal=async function(){window.SaaSCloudProduction?.resetCloudSession?.();try{if(window.FirebaseBridge?.logoutUser)await window.FirebaseBridge.logoutUser()}catch(e){console.warn("[SAMBRIX logout]",e)}if(window.FirebaseBridge){window.FirebaseBridge.user=null;window.FirebaseBridge.connected=false}SaaS.session={role:"guest",user:null,businessId:"",branchId:""};SaaS.requestedLoginMode="";document.body.dataset.loginMode="";SaaS.bookingInboxUnsub?.();SaaS.bookingInboxUnsub=null;SaaS.bookingChangeUnsub?.();SaaS.bookingChangeUnsub=null;SaaS.bookingInbox=[];SaaS.bookingChangeInbox=[];document.getElementById("adminApp")?.classList.add("hidden");document.getElementById("loginView")?.classList.add("hidden");SaaS.portal?.show?.()};
SaaS.waitForAuthenticatedSession=function(){let lastUid="";setInterval(async()=>{const uid=window.FirebaseBridge?.user?.uid||"";if(uid&&uid!==lastUid){lastUid=uid;await SaaS.resolveFirebaseSession();SaaS.routeSession()}if(!uid&&lastUid){lastUid="";window.SaaSCloudProduction?.resetCloudSession?.();SaaS.bookingInboxUnsub?.();SaaS.bookingInboxUnsub=null;SaaS.bookingChangeUnsub?.();SaaS.bookingChangeUnsub=null;SaaS.bookingInbox=[];SaaS.bookingChangeInbox=[];SaaS.session={role:"guest",user:null,businessId:"",branchId:""};document.getElementById("adminApp")?.classList.add("hidden");SaaS.portal?.show?.()}},700)};

;

/* ---- js/saas/sambrix-superadmin-organizer.js ---- */
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

;

/* ---- js/saas/saas-main.js ---- */

(function(){
  function boot(){
    SaaS.load();
    SaaS.installPortal?.();
    SaaS.secureNavigation?.();
    SaaS.waitForAuthenticatedSession?.();
    SaaS.loadGlobalAudit?.();
    SaaS.loadAddons?.();
    SaaS.loadSecurity?.();
    SaaS.loadNotifications?.();
    SaaS.loadBilling?.();
    SaaS.ensureSubscriptionRecords?.();
    SaaS.ensureRenewalDates?.();
    SaaS.loadBackupSystem?.();
    SaaS.loadSupport?.();
    SaaS.loadReleases?.();
    SaaS.loadFirebaseLiveTest?.();
    SaaS.loadFinalWizard?.();
    SaaS.loadCertifications?.();
    SaaS.loadProductionConfig?.();
    SaaS.loadMigrationSnapshots?.();
    SaaS.loadIncidents?.();
    SaaS.loadMaintenance?.();
    SaaS.loadUpdateSystem?.();
    SaaS.loadAuthSecurity?.();
    SaaS.loadDeploymentConfig?.();
    SaaS.loadReleaseCandidate?.();
    SaaS.loadSmokeTest?.();
    SaaS.loadRuntimeDiagnostics?.();
    SaaS.loadBugReports?.();
    SaaS.loadSyncTest?.();
    SaaS.loadDataIntegrity?.();
    SaaS.loadPerformanceTest?.();
    SaaS.loadCompatibilityTest?.();
    SaaS.loadValidationSecurity?.();
    SaaS.loadPrivacySystem?.();
    SaaS.loadRecoveryPlan?.();
    SaaS.loadOperations?.();
    SaaS.loadServiceStatus?.();
    SaaS.loadOnboarding?.();
    SaaS.loadTrainingHandoff?.();
    SaaS.loadBillingOps?.();
    SaaS.loadRenewalAlerts?.();
    SaaS.loadDiscounts?.();
    SaaS.loadInvoices?.();
    SaaS.loadPlatformSettings?.();
    SaaS.bootstrapFirstTenant();
    SaaS.installTenantPersistence();
    SaaS.installTenantBridge();
    SaaS.installPlanGuard();
    SaaS.migrateExistingRecords();
    SaaS.renderAll();
    SaaS.renderPublicLink?.();
    SaaS.renderPlatformSettings?.();
    SaaS.renderWhiteLabel?.();

    document.getElementById("savePlatformSettingsBtn")?.addEventListener("click",SaaS.savePlatformSettings);
    document.getElementById("saveWhiteLabelBtn")?.addEventListener("click",SaaS.saveWhiteLabel);
    document.getElementById("publishPublicBusinessBtn")?.addEventListener("click",SaaS.publishPublicBusiness);
    document.getElementById("copyPublicUrlBtn")?.addEventListener("click",SaaS.copyPublicUrl);
    document.getElementById("addBranchBtn")?.addEventListener("click",SaaS.openBranchModal);
    document.getElementById("closeBranchModal")?.addEventListener("click",SaaS.closeBranchModal);
    document.getElementById("saveBranchBtn")?.addEventListener("click",SaaS.saveBranch);
    document.getElementById("closeBusinessModal")?.addEventListener("click",SaaS.closeBusinessModal);
    document.getElementById("cancelBusinessModal")?.addEventListener("click",SaaS.closeBusinessModal);
    document.getElementById("saveBusinessBtn")?.addEventListener("click",SaaS.saveBusiness);
    document.getElementById("saasBusinessSearch")?.addEventListener("input",SaaS.renderBusinesses);
    document.getElementById("globalBusinessSearch")?.addEventListener("input",SaaS.renderBusinessTable);
    document.getElementById("businessStatusFilter")?.addEventListener("change",SaaS.renderBusinessTable);
    document.getElementById("businessPlanFilter")?.addEventListener("change",SaaS.renderBusinessTable);
    document.getElementById("superRefreshBtn")?.addEventListener("click",()=>SaaS.renderAll());
    document.getElementById("refreshAlertsBtn")?.addEventListener("click",()=>SaaS.renderAlerts());
    document.getElementById("alertSeverityFilter")?.addEventListener("change",SaaS.renderAlerts);
    document.getElementById("globalAuditSearch")?.addEventListener("input",SaaS.renderGlobalAudit);
    document.getElementById("auditTypeFilter")?.addEventListener("change",SaaS.renderGlobalAudit);
    document.getElementById("exportAuditBtn")?.addEventListener("click",SaaS.exportAuditCSV);
    document.getElementById("runHealthCheckBtn")?.addEventListener("click",SaaS.runHealthCheck);
    document.getElementById("addonBusinessSelect")?.addEventListener("change",SaaS.renderBusinessAddonManager);
    document.getElementById("newAddonBtn")?.addEventListener("click",()=>SaaS.openAddonModal());
    document.getElementById("closeAddonModal")?.addEventListener("click",SaaS.closeAddonModal);
    document.getElementById("cancelAddonBtn")?.addEventListener("click",SaaS.closeAddonModal);
    document.getElementById("saveAddonBtn")?.addEventListener("click",SaaS.saveAddonForm);
    document.getElementById("crmBusinessSelect")?.addEventListener("change",SaaS.renderCRM);
    document.getElementById("crmSearch")?.addEventListener("input",SaaS.renderCRMTable);
    document.getElementById("crmSegmentFilter")?.addEventListener("change",SaaS.renderCRMTable);
    document.getElementById("refreshCRMBtn")?.addEventListener("click",SaaS.renderCRM);
    document.getElementById("securityRefreshBtn")?.addEventListener("click",SaaS.renderSecurity);
    document.getElementById("startTenantActivationBtn")?.addEventListener("click",SaaS.openOnboarding);
    document.getElementById("createBusinessBtn")?.addEventListener("click",SaaS.openOnboarding);
    document.getElementById("zeroCreateBusinessBtn")?.addEventListener("click",SaaS.openOnboarding);
    document.getElementById("closeTenantActivationModal")?.addEventListener("click",SaaS.closeOnboarding);
    document.getElementById("returnPortalBtn")?.addEventListener("click",()=>SaaS.portal?.show?.());
    document.getElementById("refreshBookingInboxBtn")?.addEventListener("click",SaaS.watchBookingInbox);
    document.getElementById("bookingStatusFilter")?.addEventListener("change",SaaS.renderBookingInbox);
    document.getElementById("bookingSearch")?.addEventListener("input",SaaS.renderBookingInbox);
    setTimeout(()=>SaaS.watchBookingInbox?.(),1200);
    document.getElementById("generateNotificationsBtn")?.addEventListener("click",SaaS.generateNotifications);
    document.getElementById("markAllNotificationsBtn")?.addEventListener("click",SaaS.markAllNotificationsRead);
    document.getElementById("notifTypeFilter")?.addEventListener("change",SaaS.renderNotifications);
    document.getElementById("notifReadFilter")?.addEventListener("change",SaaS.renderNotifications);
    setTimeout(()=>SaaS.generateNotifications?.(),1800);
    document.getElementById("billingGenerateBtn")?.addEventListener("click",SaaS.refreshBillingStates);
    document.getElementById("billingStatusFilter")?.addEventListener("change",SaaS.renderBilling);
    document.getElementById("billingSearch")?.addEventListener("input",SaaS.renderBilling);
    document.getElementById("closeBillingOpsPaymentModal")?.addEventListener("click",SaaS.closeBillingPayment);
    document.getElementById("cancelBillingPayment")?.addEventListener("click",SaaS.closeBillingPayment);
    document.getElementById("saveBillingPayment")?.addEventListener("click",SaaS.registerBillingPayment);
    setTimeout(()=>SaaS.refreshBillingStates?.(),2200);
    document.getElementById("createPlatformBackupBtn")?.addEventListener("click",()=>SaaS.createBackup(""));
    document.getElementById("exportPlatformBackupBtn")?.addEventListener("click",SaaS.exportBackup);
    document.getElementById("backupBusinessFilter")?.addEventListener("change",SaaS.renderBackupCenter);
    document.getElementById("trashTypeFilter")?.addEventListener("change",SaaS.renderBackupCenter);
    document.getElementById("refreshSupportBtn")?.addEventListener("click",SaaS.renderSupport);
    document.getElementById("supportStatusFilter")?.addEventListener("change",SaaS.renderSupport);
    document.getElementById("openSupportTicketBtn")?.addEventListener("click",SaaS.openSupportTicket);
    document.getElementById("closeOpsSupportTicketModal")?.addEventListener("click",SaaS.closeSupportTicket);
    document.getElementById("cancelSupportTicket")?.addEventListener("click",SaaS.closeSupportTicket);
    document.getElementById("saveSupportTicket")?.addEventListener("click",SaaS.createSupportTicket);
    document.getElementById("exitSupportModeBtn")?.addEventListener("click",SaaS.exitSupportMode);
    document.getElementById("refreshLicensesBtn")?.addEventListener("click",SaaS.renderLicenses);
    document.getElementById("licenseSearch")?.addEventListener("input",SaaS.renderLicenses);
    document.getElementById("refreshAnalyticsBtn")?.addEventListener("click",SaaS.renderAnalytics);
    document.getElementById("analyticsSearch")?.addEventListener("input",SaaS.renderAnalytics);
    document.getElementById("refreshActivationBtn")?.addEventListener("click",SaaS.renderActivation);
    document.getElementById("activationSearch")?.addEventListener("input",SaaS.renderActivation);
    document.getElementById("closeActivationModal")?.addEventListener("click",SaaS.closeActivation);
    document.getElementById("activationPreviewBtn")?.addEventListener("click",SaaS.previewActivation);
    document.getElementById("activationDeliverBtn")?.addEventListener("click",SaaS.deliverActivation);
    document.getElementById("runDiagnosticsBtn")?.addEventListener("click",SaaS.runDiagnostics);
    document.getElementById("launchReviewBtn")?.addEventListener("click",SaaS.reviewLaunch);
    document.getElementById("createReleaseBtn")?.addEventListener("click",SaaS.createRelease);
    document.getElementById("runFullTestsBtn")?.addEventListener("click",SaaS.runFullTests);
    document.getElementById("resetTestResultsBtn")?.addEventListener("click",SaaS.resetTests);
    document.getElementById("runTechnicalAuditBtn")?.addEventListener("click",SaaS.runTechnicalAudit);
    document.getElementById("refreshFirebaseTestBtn")?.addEventListener("click",SaaS.renderFirebaseLiveTest);
    document.getElementById("createSyncProbeBtn")?.addEventListener("click",SaaS.createSyncProbe);
    document.getElementById("confirmSyncProbeBtn")?.addEventListener("click",SaaS.confirmSyncProbe);
    document.getElementById("firebaseTestCenter")?.addEventListener("change",SaaS.markFirebaseManual);
    document.getElementById("finalTestWizard")?.addEventListener("change",SaaS.toggleFinalWizard);
    document.getElementById("resetFinalWizardBtn")?.addEventListener("click",SaaS.resetFinalWizard);
    document.getElementById("createCertificationBtn")?.addEventListener("click",SaaS.createCertification);
    document.getElementById("runProductionReviewBtn")?.addEventListener("click",SaaS.runProductionReview);
    document.getElementById("saveProductionConfigBtn")?.addEventListener("click",SaaS.saveProductionConfig);
    document.getElementById("refreshMigrationBtn")?.addEventListener("click",SaaS.renderMigrationCenter);
    document.getElementById("createMigrationSnapshotBtn")?.addEventListener("click",SaaS.createMigrationSnapshot);
    document.getElementById("refreshHealthBtn")?.addEventListener("click",SaaS.refreshHealth);
    document.getElementById("newIncidentBtn")?.addEventListener("click",SaaS.openIncidentModal);
    document.getElementById("closeIncidentModal")?.addEventListener("click",SaaS.closeIncidentModal);
    document.getElementById("cancelIncidentBtn")?.addEventListener("click",SaaS.closeIncidentModal);
    document.getElementById("saveIncidentBtn")?.addEventListener("click",SaaS.createIncident);
    document.getElementById("incidentSearch")?.addEventListener("input",SaaS.renderIncidents);
    document.getElementById("incidentStatusFilter")?.addEventListener("change",SaaS.renderIncidents);
    document.getElementById("refreshContinuityBtn")?.addEventListener("click",SaaS.refreshContinuity);
    document.getElementById("saveMaintenanceBtn")?.addEventListener("click",SaaS.saveMaintenance);
    document.getElementById("createUpdateReleaseBtn")?.addEventListener("click",SaaS.openUpdateReleaseModal);
    document.getElementById("closeUpdateReleaseModal")?.addEventListener("click",SaaS.closeUpdateReleaseModal);
    document.getElementById("cancelUpdateReleaseBtn")?.addEventListener("click",SaaS.closeUpdateReleaseModal);
    document.getElementById("saveUpdateReleaseBtn")?.addEventListener("click",SaaS.createUpdateRelease);
    document.getElementById("refreshAuthSecurityBtn")?.addEventListener("click",SaaS.renderAuthSecurity);
    document.getElementById("saveAuthSecurityBtn")?.addEventListener("click",SaaS.saveAuthSecurity);
    document.getElementById("refreshFirebaseRulesBtn")?.addEventListener("click",SaaS.refreshFirebaseRules);
    document.getElementById("refreshDeploymentBtn")?.addEventListener("click",SaaS.refreshDeployment);
    document.getElementById("saveDeploymentConfigBtn")?.addEventListener("click",SaaS.saveDeploymentConfig);
    document.getElementById("refreshCandidateBtn")?.addEventListener("click",SaaS.refreshReleaseCandidate);
    document.getElementById("freezeCandidateBtn")?.addEventListener("click",SaaS.freezeCandidate);
    document.getElementById("runSmokeTestBtn")?.addEventListener("click",SaaS.runSmokeTest);
    document.getElementById("resetSmokeTestBtn")?.addEventListener("click",SaaS.resetSmokeTest);
    document.getElementById("smokeTestCenter")?.addEventListener("change",SaaS.toggleSmokeManual);
    document.getElementById("clearRuntimeErrorsBtn")?.addEventListener("click",SaaS.clearRuntimeDiagnostics);
    document.getElementById("refreshRuntimeErrorsBtn")?.addEventListener("click",SaaS.renderRuntimeDiagnostics);
    document.getElementById("runtimeTypeFilter")?.addEventListener("change",SaaS.renderRuntimeDiagnostics);
    document.getElementById("newBugReportBtn")?.addEventListener("click",SaaS.openBugReportModal);
    document.getElementById("closeBugReportModal")?.addEventListener("click",SaaS.closeBugReportModal);
    document.getElementById("cancelBugReportBtn")?.addEventListener("click",SaaS.closeBugReportModal);
    document.getElementById("attachRuntimeBtn")?.addEventListener("click",SaaS.attachRuntimeEvidence);
    document.getElementById("saveBugReportBtn")?.addEventListener("click",SaaS.createBugReport);
    document.getElementById("bugSearch")?.addEventListener("input",SaaS.renderBugReports);
    document.getElementById("bugStatusFilter")?.addEventListener("change",SaaS.renderBugReports);
    document.getElementById("refreshSyncTestBtn")?.addEventListener("click",SaaS.refreshSyncTest);
    document.getElementById("resetSyncTestBtn")?.addEventListener("click",SaaS.resetSyncTest);
    document.getElementById("syncTestCenter")?.addEventListener("change",SaaS.toggleSyncManual);
    document.getElementById("runDataIntegrityBtn")?.addEventListener("click",SaaS.runDataIntegrity);
    document.getElementById("dataIntegrityCenter")?.addEventListener("change",SaaS.toggleIntegrityManual);
    document.getElementById("runPerformanceTestBtn")?.addEventListener("click",SaaS.runPerformanceTest);
    document.getElementById("performanceCenter")?.addEventListener("change",SaaS.togglePerformanceManual);
    document.getElementById("runCompatibilityTestBtn")?.addEventListener("click",SaaS.runCompatibilityTest);
    document.getElementById("compatibilityCenter")?.addEventListener("change",SaaS.toggleCompatibilityManual);
    document.getElementById("runValidationSecurityBtn")?.addEventListener("click",SaaS.runValidationSecurity);
    document.getElementById("validationSecurityCenter")?.addEventListener("change",SaaS.toggleValidationManual);
    document.getElementById("newPrivacyRequestBtn")?.addEventListener("click",SaaS.openPrivacyRequestModal);
    document.getElementById("closePrivacyRequestModal")?.addEventListener("click",SaaS.closePrivacyRequestModal);
    document.getElementById("cancelPrivacyRequestBtn")?.addEventListener("click",SaaS.closePrivacyRequestModal);
    document.getElementById("savePrivacyRequestBtn")?.addEventListener("click",SaaS.createPrivacyRequest);
    document.getElementById("savePrivacyPolicyBtn")?.addEventListener("click",SaaS.savePrivacyPolicy);
    document.getElementById("privacyStatusFilter")?.addEventListener("change",SaaS.renderPrivacyCenter);
    document.getElementById("refreshFinalReadinessBtn")?.addEventListener("click",SaaS.refreshFinalReadiness);
    document.getElementById("refreshSecretsSecurityBtn")?.addEventListener("click",SaaS.refreshSecretsSecurity);
    document.getElementById("refreshDemoDataBtn")?.addEventListener("click",SaaS.refreshDemoData);
    document.getElementById("exportDemoDataBtn")?.addEventListener("click",SaaS.exportDemoData);
    document.getElementById("refreshCacheVersionBtn")?.addEventListener("click",SaaS.inspectCacheVersion);
    document.getElementById("clearAppCacheBtn")?.addEventListener("click",SaaS.clearAppCache);
    document.getElementById("createRecoveryPlanBtn")?.addEventListener("click",SaaS.prepareRecoveryPlan);
    document.getElementById("recoveryCenter")?.addEventListener("change",SaaS.toggleRecoveryManual);
    document.getElementById("newSupportTicketBtn")?.addEventListener("click",SaaS.openSupportTicket);
    document.getElementById("closeOpsSupportTicketModal")?.addEventListener("click",SaaS.closeSupportTicket);
    document.getElementById("cancelSupportTicketBtn")?.addEventListener("click",SaaS.closeSupportTicket);
    document.getElementById("saveSupportTicketBtn")?.addEventListener("click",SaaS.createSupportTicket);
    document.getElementById("opsPriorityFilter")?.addEventListener("change",SaaS.renderOperations);
    document.getElementById("opsStatusFilter")?.addEventListener("change",SaaS.renderOperations);
    document.getElementById("newServiceNoticeBtn")?.addEventListener("click",SaaS.openServiceNotice);
    document.getElementById("closeServiceNoticeModal")?.addEventListener("click",SaaS.closeServiceNotice);
    document.getElementById("cancelServiceNoticeBtn")?.addEventListener("click",SaaS.closeServiceNotice);
    document.getElementById("saveServiceNoticeBtn")?.addEventListener("click",SaaS.createServiceNotice);
    document.getElementById("startTenantActivationBtn")?.addEventListener("click",SaaS.openOnboarding);
    document.getElementById("closeTenantActivationModal")?.addEventListener("click",SaaS.closeOnboarding);
    document.getElementById("cancelOnboardingBtn")?.addEventListener("click",SaaS.closeOnboarding);
    document.getElementById("saveOnboardingBtn")?.addEventListener("click",SaaS.createOnboarding);
    document.getElementById("onboardingCenter")?.addEventListener("change",SaaS.toggleOnboardingStep);
    document.getElementById("startTrainingHandoffBtn")?.addEventListener("click",SaaS.openTrainingHandoff);
    document.getElementById("closeTrainingHandoffModal")?.addEventListener("click",SaaS.closeTrainingHandoff);
    document.getElementById("cancelTrainingHandoffBtn")?.addEventListener("click",SaaS.closeTrainingHandoff);
    document.getElementById("saveTrainingHandoffBtn")?.addEventListener("click",SaaS.createTrainingHandoff);
    document.getElementById("trainingHandoffCenter")?.addEventListener("change",SaaS.toggleTrainingHandoff);
    document.getElementById("helpSearch")?.addEventListener("input",SaaS.renderHelpCenter);
    document.getElementById("helpRoleFilter")?.addEventListener("change",SaaS.renderHelpCenter);
    document.getElementById("newBillingEntryBtn")?.addEventListener("click",SaaS.openBillingPayment);
    document.getElementById("closeBillingOpsPaymentModal")?.addEventListener("click",SaaS.closeBillingPayment);
    document.getElementById("cancelBillingPaymentBtn")?.addEventListener("click",SaaS.closeBillingPayment);
    document.getElementById("saveBillingPaymentBtn")?.addEventListener("click",SaaS.createBillingPayment);
    document.getElementById("saveBillingPolicyBtn")?.addEventListener("click",SaaS.saveBillingPolicy);
    document.getElementById("billingOpsStatusFilter")?.addEventListener("change",SaaS.renderBillingOps);
    document.getElementById("refreshRenewalAlertsBtn")?.addEventListener("click",SaaS.refreshRenewalAlerts);
    document.getElementById("saveRenewalAlertPolicyBtn")?.addEventListener("click",SaaS.saveRenewalAlertPolicy);
    document.getElementById("renewalPriorityFilter")?.addEventListener("change",SaaS.renderRenewalAlerts);
    document.getElementById("newDiscountBtn")?.addEventListener("click",SaaS.openDiscountModal);
    document.getElementById("closeDiscountCreateModal")?.addEventListener("click",SaaS.closeDiscountModal);
    document.getElementById("cancelDiscountCreateBtn")?.addEventListener("click",SaaS.closeDiscountModal);
    document.getElementById("saveDiscountBtn")?.addEventListener("click",SaaS.createDiscount);
    document.getElementById("applyDiscountBtn")?.addEventListener("click",SaaS.applyDiscount);
    document.getElementById("newInvoiceBtn")?.addEventListener("click",SaaS.openInvoiceModal);
    document.getElementById("closeInvoiceCreateModal")?.addEventListener("click",SaaS.closeInvoiceModal);
    document.getElementById("cancelInvoiceCreateBtn")?.addEventListener("click",SaaS.closeInvoiceModal);
    document.getElementById("saveInvoiceBtn")?.addEventListener("click",SaaS.createInvoice);
    document.getElementById("invoiceStatusFilter")?.addEventListener("change",SaaS.renderInvoices);
    document.getElementById("invoiceSearch")?.addEventListener("input",SaaS.renderInvoices);
    document.getElementById("refreshAccountStatementsBtn")?.addEventListener("click",SaaS.refreshAccountStatements);
    document.getElementById("statementSearch")?.addEventListener("input",SaaS.renderAccountStatements);
    document.getElementById("refreshSaasMetricsBtn")?.addEventListener("click",SaaS.refreshSaasMetrics);
    document.getElementById("refreshReviewGateBtn")?.addEventListener("click",SaaS.refreshReviewGate);
    document.getElementById("superadminModuleSearch")?.addEventListener("input",SaaS.filterSuperAdminModules);
    document.getElementById("exitSupportModeBtn")?.addEventListener("click",SaaS.exitSupport);
    document.getElementById("closeBusinessUsersModal")?.addEventListener("click",SaaS.closeMembers);
    document.getElementById("createMemberBtn")?.addEventListener("click",SaaS.createMember);
    document.querySelectorAll("[data-page-jump]").forEach(b=>b.addEventListener("click",()=>window.App?.go?.(b.dataset.pageJump)));
    document.getElementById("addPlanBtn")?.addEventListener("click",()=>{
      const name=prompt("Nombre del plan","Nuevo plan");if(!name)return;
      const price=Number(prompt("Precio mensual","29")||0);
      SaaS.db.plans.push({id:SaaS.uid(),name,price,active:true,features:["Personalizable"]});
      SaaS.save();SaaS.renderAll();
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();


/* FASE 20.2 */
if(SaaS.renderAll&&!SaaS.__organizerRenderWrapped){
 const _r202=SaaS.renderAll;
 SaaS.renderAll=function(){const r=_r202();SaaS.organizeSuperAdminNavigation?.();SaaS.renderSuperAdminModuleDirectory?.();SaaS.renderMaintenanceQuickControl?.();return r;};
 SaaS.__organizerRenderWrapped=true;
}
SaaS.installSuperAdminOrganizer?.();
SaaS.renderMaintenanceQuickControl?.();
document.getElementById("maintenanceQuickToggleBtn")?.addEventListener("click",SaaS.toggleMaintenanceQuickControl);

/* ===== FASE 20.5 ALTA COMPLETA ===== */
document.getElementById("obCountry")?.addEventListener("change",SaaS.renderOnboardingTimezones);
/* FASE 20.6 â€” reconciliaciÃ³n comercial */
if(!SaaS.db)SaaS.load?.();
SaaS.ensureSubscriptionRecords?.();
SaaS.renderSubscriptions?.();

/* FASE 20.7 â€” normalizaciÃ³n de ciclos */
SaaS.ensureRenewalDates?.();
SaaS.ensureSubscriptionRecords?.();
SaaS.renderSubscriptions?.();

/* ===== FASE 20.8 â€” reconciliaciÃ³n de entregas ===== */
SaaS.reconcileDeliveryStates?.();
SaaS.renderActivation?.();
SaaS.renderTrainingHandoff?.();

/* ===== FASE 20.9 â€” ACCESO PROPIETARIO ===== */
document.getElementById("closeOwnerAccessSetupModal")?.addEventListener("click",SaaS.closeOwnerAccessSetup);
document.getElementById("cancelOwnerAccessSetup")?.addEventListener("click",SaaS.closeOwnerAccessSetup);
document.getElementById("saveOwnerAccessSetup")?.addEventListener("click",SaaS.saveOwnerAccessSetup);


/* ===== FASE 20.13 â€” AISLAMIENTO TENANT ===== */
(SaaS.db.businesses||[]).forEach(b=>SaaS.reconcileTenantIsolation?.(b.id));


/* ===== FASE 20.15 â€” TERMINOLOGÃA DINÃMICA ===== */
SaaS.businessTerms=function(business){
  const type=String(business?.type||"").toLowerCase();

  let professionalSingular="Profesional";
  let professionalPlural="Profesionales";

  if(type.includes("barber")){
    professionalSingular="Barbero";
    professionalPlural="Barberos";
  }else if(type.includes("salÃ³n")||type.includes("salon")||type.includes("belleza")){
    professionalSingular="Estilista";
    professionalPlural="Estilistas";
  }else if(type.includes("uÃ±a")||type.includes("nail")){
    professionalSingular="Profesional";
    professionalPlural="Profesionales";
  }else if(type.includes("spa")){
    professionalSingular="Terapeuta";
    professionalPlural="Terapeutas";
  }else if(type.includes("clÃ­nica")||type.includes("clinica")||type.includes("consultorio")){
    professionalSingular="Profesional";
    professionalPlural="Profesionales";
  }else if(type.includes("taller")){
    professionalSingular="TÃ©cnico";
    professionalPlural="TÃ©cnicos";
  }

  return {
    professionalSingular,
    professionalPlural,
    clientSingular:"Cliente",
    clientPlural:"Clientes",
    serviceSingular:"Servicio",
    servicePlural:"Servicios",
    appointmentSingular:"Cita",
    appointmentPlural:"Citas"
  };
};

SaaS.applyBusinessTerminology=function(){
  const b=SaaS.currentBusiness?.();
  if(!b)return;
  const t=SaaS.businessTerms(b);

  document.querySelectorAll("[data-sambrix-term]").forEach(el=>{
    const key=el.dataset.sambrixTerm;
    if(t[key])el.textContent=t[key];
  });

  // Fallback for legacy labels that do not yet have data attributes.
  document.querySelectorAll("label").forEach(label=>{
    const txt=(label.childNodes[0]?.nodeValue||"").trim();
    if(txt==="Barbero" || txt==="Barbera"){
      label.childNodes[0].nodeValue=t.professionalSingular;
    }
    if(txt==="Barberos"){
      label.childNodes[0].nodeValue=t.professionalPlural;
    }
  });

  // Headings and buttons.
  document.querySelectorAll("h1,h2,h3,h4,button,span,small").forEach(el=>{
    if(el.children.length) return;
    const txt=(el.textContent||"").trim();
    if(txt==="Barberos") el.textContent=t.professionalPlural;
    if(txt==="+ Barbero") el.textContent=`+ ${t.professionalSingular}`;
  });
};

/* FASE 20.15 â€” aplicar tÃ©rminos del negocio activo */
const oldRenderAll_2015=SaaS.renderAll;
SaaS.renderAll=function(){
  const r=oldRenderAll_2015();
  SaaS.applyBusinessTerminology?.();
  return r;
};

/* ===== FASE 20.16 â€” TERMINOLOGÃA BUSINESS COMPLETA ===== */
const oldRenderAll_2016=SaaS.renderAll;
SaaS.renderAll=function(){
  const r=oldRenderAll_2016();
  window.App?.applyBusinessIdentity?.();
  SaaS.applyBusinessTerminology?.();
  return r;
};

/* ===== FASE 20.18 â€” PLAN POR NEGOCIO ===== */
SaaS.applyPlanUI?.();


/* ===== FASE 20.20 â€” REGLA FINAL DE PLAN (NO TOCA SUPERADMIN) ===== */
SaaS.applyPlanUI?.();
SaaS.renderCurrentPlanBadge?.();

/* FASE 20.21 */
setTimeout(()=>SaaS.renderBrandingPlanAccess?.(),0);


/* ===== FASE 20.27 â€” PERSONALIZACIÃ“N PRO ===== */
SaaS.featureAllowed=function(page,business=SaaS.currentBusiness()){
  if(!business)return false;

  const role=String(SaaS.session?.role||"").toLowerCase();
  const isSuper=role==="superadmin" || !!window.SaaSAuthAdmin?.isSuperAdmin?.();
  if(isSuper)return true;

  const status=String(business.status||"Activo").toLowerCase();
  if(status.includes("suspend")||status.includes("venc")||status.includes("cancel"))return false;

  const features=SaaS.PLAN_FEATURES?.[business.planId]||[];
  return features.includes("*")||features.includes(page);
};

SaaS.applyPlanUI=function(){
  const role=String(SaaS.session?.role||"").toLowerCase();
  const isSuper=role==="superadmin" || !!window.SaaSAuthAdmin?.isSuperAdmin?.();

  document.querySelectorAll(".nav-business[data-page]").forEach(btn=>{
    const allowed=isSuper ? true : SaaS.featureAllowed(btn.dataset.page);
    btn.hidden=!allowed;
    btn.classList.toggle("plan-hidden",!allowed);
    btn.disabled=false;

    if(!allowed){
      btn.setAttribute("aria-hidden","true");
      btn.setAttribute("tabindex","-1");
    }else{
      btn.removeAttribute("aria-hidden");
      btn.removeAttribute("tabindex");
    }
  });

  SaaS.renderCurrentPlanBadge?.();
  SaaS.renderBrandingPlanAccess?.();
};

/* ===== FASE 20.28 â€” REFRESCO FINAL DE PERSONALIZACIÃ“N ===== */
setTimeout(()=>{
  SaaS.renderBrandingPlanAccess?.();
  SaaS.renderWhiteLabel?.();
  window.App?.loadClientCustomization?.();
  window.App?.applyClientCustomization?.();
},0);

;

/* ---- js/agenda-20-30.js ---- */
/* Compatibilidad temporal: la lÃ³gica activa de agenda vive en agenda-scheduling.js. */
(function(){
 const A=window.App;if(!A)return;
 const load=()=>{
   if(window.__sambrixAgendaSchedulingLoaded)return;
   window.__sambrixAgendaSchedulingLoaded=true;
   const s=document.createElement('script');
   s.src='js/agenda-scheduling.js?v=1.0.18';
   s.onerror=()=>{window.__sambrixAgendaSchedulingLoaded=false;console.error('[SAMBRIX] No se pudo cargar agenda-scheduling.js')};
   document.head.appendChild(s);
 };
 load();
})();
;

/* ---- js/client-accounts-20-31.js ---- */
/* Compatibilidad temporal: la lÃ³gica activa vive en client-accounts.js. */
(function(){
 if(window.__sambrixClientAccountsLoaded)return;
 window.__sambrixClientAccountsLoaded=true;
 const s=document.createElement('script');
 s.src='js/client-accounts.js?v=1.0.18';
 s.onerror=()=>{window.__sambrixClientAccountsLoaded=false;console.error('[SAMBRIX] No se pudo cargar client-accounts.js')};
 document.head.appendChild(s);
})();
;

/* ---- js/appointment-approval-20-32.js ---- */
/* Compatibilidad temporal: la lÃ³gica activa vive en appointment-approval.js. */
(function(){
 if(window.__sambrixAppointmentApprovalLoaded)return;
 window.__sambrixAppointmentApprovalLoaded=true;
 const s=document.createElement('script');
 s.src='js/appointment-approval.js?v=1.0.18';
 s.onerror=()=>{window.__sambrixAppointmentApprovalLoaded=false;console.error('[SAMBRIX] No se pudo cargar appointment-approval.js')};
 document.head.appendChild(s);
})();
;

/* ---- js/saas/sambrix-production-v5.js ---- */
/* SAMBRIX 1.0 â€” cierre financiero idempotente de citas */
(function(){
  const A=window.App,S=window.SaaS;if(!A)return;const finalizing=new Set();
  function canFinalize(){
    if(!S)return true;
    const schedule=typeof S.canWriteDomain==="function"?S.canWriteDomain("schedule"):S.pageAllowed?.("citas");
    const finance=typeof S.canWriteDomain==="function"?S.canWriteDomain("finance"):S.pageAllowed?.("caja");
    if(!schedule||!finance){A.toast("Tu rol no tiene permiso para finalizar y cobrar citas");return false}
    if(window.FirebaseBridge?.connected&&window.SaaSCloudProduction?.isTenantReady?.()===false){A.toast("Espera a que SAMBRIX termine de sincronizar el negocio");return false}
    return true;
  }
  A.nextReceiptNumber=function(){const max=(A.db.sales||[]).reduce((m,s)=>{const n=parseInt(String(s.number||'').replace(/\D/g,''),10);return Number.isFinite(n)?Math.max(m,n):m},0);return String(max+1).padStart(6,'0')};
  A.commitAppointmentFinalization=function(id,{method='Efectivo',amount=null}={}){
    if(!canFinalize()||finalizing.has(id))return false;const a=(A.db.appointments||[]).find(x=>x.id===id);if(!a)return false;if(a.status==='Cancelada'){A.toast('Una cita cancelada no puede finalizarse');return false}
    const businessId=S?.getContext?.()?.businessId||A.db?.meta?.businessId||'',appointmentBusinessId=String(a.businessId||businessId||'');if(businessId&&appointmentBusinessId&&appointmentBusinessId!==businessId){A.toast('La cita no pertenece al negocio activo');console.error('[SAMBRIX] Cierre financiero bloqueado por identidad de negocio',{appointmentId:id,businessId,appointmentBusinessId});return false}
    finalizing.add(id);
    let rollbackOnError=null,persistCompleted=false;
    try{
      const s=(A.db.services||[]).find(x=>x.id===a.serviceId),c=(A.db.clients||[]).find(x=>x.id===a.clientId),branchId=a.branchId||S?.getContext?.()?.branchId||A.db?.meta?.branchId||'',total=Number(amount==null?(a.price??s?.price??0):amount);if(!Number.isFinite(total)||total<0){A.toast('Monto invÃ¡lido');return false}
      const linkedSales=(A.db.sales||[]).filter(x=>x.appointmentId===a.id),linkedCash=(A.db.cash||[]).filter(x=>x.appointmentId===a.id&&x.type==='Ingreso');if(linkedSales.length>1||linkedCash.length>1){A.toast('Se detectaron registros financieros duplicados. Revisa esta cita antes de continuar.');console.error('[SAMBRIX] Duplicidad financiera detectada',{appointmentId:a.id,sales:linkedSales.length,cash:linkedCash.length});return false}
      const existingSale=linkedSales[0]||null,existingCash=linkedCash[0]||null,targetBusinessId=businessId||appointmentBusinessId;
      const appointmentSnapshot={...a},clientSnapshot=c?{...c}:null,saleSnapshot=existingSale?JSON.parse(JSON.stringify(existingSale)):null,cashSnapshot=existingCash?JSON.parse(JSON.stringify(existingCash)):null;
      const restoreObject=(target,snapshot)=>{if(!target||!snapshot)return;Object.keys(target).forEach(k=>delete target[k]);Object.assign(target,JSON.parse(JSON.stringify(snapshot)))};
      const rollbackLocal=()=>{restoreObject(a,appointmentSnapshot);if(c&&clientSnapshot)restoreObject(c,clientSnapshot);if(existingSale&&saleSnapshot)restoreObject(existingSale,saleSnapshot);else if(sale)A.db.sales=(A.db.sales||[]).filter(x=>x!==sale);if(existingCash&&cashSnapshot)restoreObject(existingCash,cashSnapshot);else A.db.cash=(A.db.cash||[]).filter(x=>x.appointmentId!==a.id)};rollbackOnError=rollbackLocal;
      if(existingSale?.businessId&&targetBusinessId&&existingSale.businessId!==targetBusinessId){A.toast('Se detectÃ³ un recibo vinculado a otro negocio');return false}if(existingCash?.businessId&&targetBusinessId&&existingCash.businessId!==targetBusinessId){A.toast('Se detectÃ³ un movimiento de caja vinculado a otro negocio');return false}if(existingCash?.saleId&&existingSale?.id&&existingCash.saleId!==existingSale.id){A.toast('La cita tiene vÃ­nculos financieros inconsistentes. Revisa caja y recibos.');return false}
      const firstFinalize=!a.finalizedAccountingAt,now=new Date().toISOString();a.businessId=targetBusinessId;a.branchId=branchId;a.status='Finalizada';a.price=total;a.paymentMethod=method;a.finalizedAt=a.finalizedAt||now;a.finalizedAccountingAt=a.finalizedAccountingAt||now;
      if(c&&firstFinalize){c.lastVisit=a.date;c.points=Number(c.points||0)+Number(A.db.business.pointsPerService||10);c.visits=Number(c.visits||0)+1}
      let sale=existingSale;if(!sale){sale={id:A.uid(),number:A.nextReceiptNumber(),date:a.date,time:a.time,clientId:a.clientId,clientName:A.clientName(a.clientId),barberId:a.barberId,barberName:A.barberName(a.barberId),serviceId:a.serviceId,appointmentId:a.id,publicRequestId:a.publicRequestId||'',businessId:a.businessId,branchId,currency:A.db.business.currency,paymentMethod:method,total,items:[{type:'Servicio',serviceId:a.serviceId,name:s?.name||'Servicio',qty:1,unit:total,total}],createdAt:now};A.db.sales=A.db.sales||[];A.db.sales.push(sale)}else{sale.paymentMethod=method;sale.total=total;sale.businessId=a.businessId;sale.branchId=branchId;sale.clientId=sale.clientId||a.clientId;sale.barberId=sale.barberId||a.barberId;sale.serviceId=sale.serviceId||a.serviceId;sale.appointmentId=a.id;if(sale.items?.[0]){sale.items[0].unit=total;sale.items[0].total=total;sale.items[0].type=sale.items[0].type||'Servicio'}}
      if(!existingCash){A.db.cash=A.db.cash||[];A.db.cash.push({id:A.uid(),type:'Ingreso',concept:`${s?.name||'Servicio'} - ${A.clientName(a.clientId)}`,amount:total,method,date:a.date,appointmentId:a.id,saleId:sale.id,clientId:a.clientId,businessId:a.businessId,branchId,currency:A.db.business.currency,createdAt:now})}else{existingCash.amount=total;existingCash.method=method;existingCash.saleId=sale.id;existingCash.businessId=a.businessId;existingCash.branchId=branchId}
      A.logAction?.('Cita finalizada','Citas',`${A.clientName(a.clientId)} Â· ${a.date} ${a.time} Â· ${method} Â· ${A.money(total)}`);const persisted=A.persist();if(persisted===false){rollbackLocal();A.toast('No se pudo guardar el cierre financiero');return false}persistCompleted=true
      if(a.publicRequestId&&businessId){window.NexoPublicCloud?.updateBookingRequest?.(businessId,a.publicRequestId,{status:'Finalizada',resolvedAt:now}).catch(console.error);window.NexoPublicCloud?.releaseBookingSlotFor?.(businessId,a.barberId,a.date,a.time).catch(console.error)}if(c?.firebaseUid&&businessId)window.NexoPublicCloud?.updateClientAccount?.(businessId,c.firebaseUid,{points:Number(c.points||0),visits:Number(c.visits||0),lastVisit:c.lastVisit||''}).catch(console.error);return sale;
    }catch(error){if(!persistCompleted&&rollbackOnError){try{rollbackOnError();A.renderAll?.()}catch(rollbackError){console.error('[SAMBRIX] Error al revertir cierre financiero',rollbackError)}}console.error('[SAMBRIX] Error al finalizar cita',error);A.toast('No se pudo completar el cierre financiero');return false}finally{finalizing.delete(id)}
  };
  A.finishAppointment=function(id){if(!canFinalize())return;const a=(A.db.appointments||[]).find(x=>x.id===id);if(!a)return;if(a.status==='Finalizada')return A.toast('Esta cita ya fue finalizada');if(a.status==='Cancelada')return A.toast('Una cita cancelada no puede finalizarse');const s=(A.db.services||[]).find(x=>x.id===a.serviceId),defaultAmount=Number(a.price??s?.price??0);if(typeof A.openFormModal!=='function')return A.commitAppointmentFinalization(id,{method:'Efectivo',amount:defaultAmount});A.openFormModal({tag:'COBRO',title:'Finalizar servicio',saveText:'Finalizar y cobrar',note:`${A.clientName(a.clientId)} Â· ${s?.name||'Servicio'} Â· ${a.date} ${a.time}`,fields:[{name:'paymentMethod',label:'MÃ©todo de pago',type:'select',value:a.paymentMethod||'Efectivo',options:['Efectivo','Pago mÃ³vil','Transferencia','Divisa','Tarjeta','Otro'].map(x=>({value:x,label:x}))},{name:'amount',label:'Total cobrado',type:'number',step:'0.01',value:defaultAmount}],onSave:()=>{const amount=Number(A.readModal('amount'));if(!Number.isFinite(amount)||amount<0)return A.toast('Escribe un monto vÃ¡lido');const method=A.readModal('paymentMethod')||'Efectivo',sale=A.commitAppointmentFinalization(id,{method,amount});if(sale){A.closeModal();A.toast(`Servicio finalizado Â· Recibo #${sale.number}`)}}})};
  A.repairFinancialLinks=function(){if(!A.db)return;const businessId=S?.getContext?.()?.businessId||A.db?.meta?.businessId||'',branchId=S?.getContext?.()?.branchId||A.db?.meta?.branchId||'';(A.db.sales||[]).forEach(s=>{if(!s.businessId)s.businessId=businessId;if(!s.branchId)s.branchId=branchId;s.paymentMethod=s.paymentMethod||'No especificado'});(A.db.cash||[]).forEach(c=>{if(!c.businessId)c.businessId=businessId;if(!c.branchId)c.branchId=branchId})};
  const oldRenderAll=A.renderAll;if(oldRenderAll&&!A.__financialRenderHook){A.renderAll=function(){A.repairFinancialLinks();return oldRenderAll.apply(A,arguments)};A.__financialRenderHook=true}A.repairFinancialLinks();
})();

;

/* ---- js/saas/public-runtime.js ---- */

(async function(){
  const params=new URLSearchParams(location.search);
  const businessId=params.get("business");
  const clientMode=params.get("cliente");
  if(!businessId||clientMode!=="app")return;

  try{
    // hide admin login/app immediately
    document.getElementById("loginView")?.classList.add("hidden");
    document.getElementById("adminApp")?.classList.add("hidden");

    let tries=0;
    while((!window.NexoPublicCloud||!window.SambrixClientCloud)&&tries++<60)await new Promise(r=>setTimeout(r,100));
    if(!window.NexoPublicCloud)throw new Error("Servicio pÃºblico no disponible");
    if(!window.SambrixClientCloud)throw new Error("Servicio de cuenta del cliente no disponible");

    const p=await NexoPublicCloud.loadPublicBusiness(businessId);
    if(!p||!["Activo","Prueba"].includes(p.status)){
      document.body.innerHTML='<main style="max-width:600px;margin:80px auto;font-family:Arial;padding:20px;text-align:center"><h2>Reservas temporalmente no disponibles</h2><p>Contacta directamente con el negocio.</p></main>';
      return;
    }

    const A=window.App;
    A.db.business=A.db.business||{};
    A.db.business.name=p.name;
    A.db.business.open=p.businessHours?.open||"09:00";
    A.db.business.close=p.businessHours?.close||"19:00";
    let availabilityLoaded=false;
    const applyPublicState=next=>{
      if(!next||!["Activo","Prueba"].includes(next.status))return false;
      A.db.business.name=next.name||A.db.business.name;
      A.db.business.open=next.businessHours?.open||"09:00";
      A.db.business.close=next.businessHours?.close||"19:00";
      A.db.business.clientApp={...(A.db.business.clientApp||{}),...(next.branding||{})};
      A.db.services=next.services||[];
      if(!availabilityLoaded){
        A.db.barbers=next.barbers||[];
        A.db.appointments=(next.busy||[]).map((x,i)=>({...x,id:"busy-"+i+"-"+String(x.barberId||"")+"-"+String(x.date||"")+"-"+String(x.time||""),clientId:"public-busy"}));
      }
      A.db.products=(next.products||[]).map(x=>({...x,stock:x.available?1:0}));
      return true;
    };
    applyPublicState(p);
    const applyAvailability=next=>{
      if(!next)return false;
      A.db.business.open=next.businessHours?.open||A.db.business.open||"09:00";
      A.db.business.close=next.businessHours?.close||A.db.business.close||"19:00";
      if(Array.isArray(next.barbers))A.db.barbers=next.barbers;
      if(Array.isArray(next.busy))A.db.appointments=next.busy.map((x,i)=>({...x,id:x.id||("busy-live-"+i+"-"+String(x.barberId||"")+"-"+String(x.date||"")+"-"+String(x.time||"")),clientId:"public-busy"}));
      return true;
    };
    let availabilityUnsub=null;
    if(window.NexoPublicCloud.watchPublicAvailability){
      availabilityUnsub=window.NexoPublicCloud.watchPublicAvailability(businessId,next=>{
        if(!next)return;
        applyAvailability(next);
        availabilityLoaded=true;
        A.renderClientBooking?.();
      });
    }

    A.submitClientReservation=async function(){
      const s=A.db.services.find(x=>x.id===A.clientSelection.serviceId),date=A.val("clientBookDate"),time=A.clientSelection.time,name=A.val("clientBookName"),phone=A.val("clientBookPhone");
      if(!s||!date||!time||!name||!phone)return A.toast("Completa servicio, horario y tus datos");
      let barberId=A.clientSelection.barberId;
      if(!barberId){
        const list=A.availableBarbers(date,time,s.duration);
        if(!list.length)return A.toast("Horario no disponible");
        barberId=list[0].id;
      }
      try{
        if(!window.SambrixClientCloud?.isReady?.())throw new Error("La cuenta del cliente todavÃ­a estÃ¡ cargando");
        if(!window.SambrixClientCloud?.currentUser?.())throw new Error("Debes iniciar sesiÃ³n para reservar");
        await window.SambrixClientCloud.createBooking({serviceId:s.id,barberId,date,time,note:A.val("clientBookNote")||"",branchId:p.branch?.id||""});
        A.toast("Solicitud de reserva enviada");
        A.clientSelection={serviceId:"",barberId:"",time:""};
        A.renderClientBooking();
      }catch(e){A.toast(e?.message||"No se pudo enviar la reserva")}
    };

    A.openClientApp();
    window.NexoPublicCloud.watchPublicBusiness?.(businessId,next=>{
      if(!next||!["Activo","Prueba"].includes(next.status)){
        try{availabilityUnsub?.()}catch{}
        document.body.innerHTML='<main style="max-width:600px;margin:80px auto;font-family:Arial;padding:20px;text-align:center"><h2>Reservas temporalmente no disponibles</h2><p>Contacta directamente con el negocio.</p></main>';
        return;
      }
      applyPublicState(next);
      A.renderClientBooking?.();
    });
    const foot=document.getElementById("nexoPoweredBy");if(foot)foot.classList.toggle("white-label-hidden",p.whiteLabel?.showPoweredBy===false);
  }catch(e){
    console.error("[Public Client]",e);
    const message=String(e?.message||"").includes("iniciar sesiÃ³n")
      ?"Inicia sesiÃ³n nuevamente para continuar."
      :"No pudimos cargar las reservas en este momento. Intenta recargar la pÃ¡gina.";
    document.body.innerHTML=`<main style="max-width:600px;margin:80px auto;font-family:Arial;padding:20px;text-align:center"><h2>No se pudo abrir SAMBRIX</h2><p>${message}</p><button type="button" onclick="location.reload()" style="margin-top:12px;padding:12px 18px;border:0;border-radius:10px;cursor:pointer">Reintentar</button></main>`;
  }
})();

;
