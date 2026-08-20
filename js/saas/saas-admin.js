
SaaS.renderBusinesses=function(){
  const box=document.getElementById("saasBusinessList");if(!box)return;
  const q=(document.getElementById("saasBusinessSearch")?.value||"").toLowerCase().trim();
  const list=SaaS.db.businesses.filter(b=>!q||`${b.name} ${b.owner} ${b.city} ${b.type}`.toLowerCase().includes(q));
  document.getElementById("saasBusinessesCount").textContent=SaaS.db.businesses.length;
  document.getElementById("saasActiveCount").textContent=SaaS.db.businesses.filter(b=>b.status==="Activo").length;
  document.getElementById("saasTrialCount").textContent=SaaS.db.businesses.filter(b=>b.status==="Prueba").length;
  document.getElementById("saasExpiredCount").textContent=SaaS.db.businesses.filter(b=>["Vencido","Suspendido"].includes(b.status)).length;
  box.innerHTML=list.map(b=>{const p=SaaS.getPlan(b.planId);return `<article class="card saas-card"><span class="status status-${b.status}">${b.status}</span><span class="tag">${b.type}</span><h3>${b.name}</h3><div class="muted">${b.owner||"Sin dueño"} · ${b.city||"Sin ciudad"}</div><div class="saas-meta"><div><small>Plan</small><strong>${p?.name||"Sin plan"}</strong></div><div><small>Próximo pago</small><strong>${b.nextPayment||"—"}</strong></div><div><small>Sucursales</small><strong>${b.branches?.length||0}</strong></div><div><small>ID</small><strong>${b.id}</strong></div></div><div class="manage-actions"><button class="btn secondary" onclick="SaaS.enterBusiness('${b.id}')">Abrir</button><button class="btn edit" onclick="SaaS.startSupport('${b.id}')">Soporte</button><button class="btn secondary" onclick="SaaS.openMembers('${b.id}')">Usuarios</button><button class="btn secondary" onclick="SaaS.toggleBusinessStatus('${b.id}')">${b.status==="Activo"?"Suspender":"Activar"}</button></div></article>`}).join("")||'<div class="muted">No hay negocios.</div>';
};
SaaS.renderPlans=function(){const box=document.getElementById("saasPlanList");if(!box)return;box.innerHTML=SaaS.db.plans.map(p=>`<article class="card plan-card ${p.id==="plan-pro"?"featured":""}"><span class="tag">PLAN</span><h3>${p.name}</h3><div class="big">$${Number(p.price).toFixed(2)}/mes</div><div class="permission-box">${(p.features||[]).join(" · ")}</div><div class="manage-actions"><button class="btn edit" onclick="SaaS.editPlan('${p.id}')">Editar</button></div></article>`).join("")};
SaaS.renderSupportList=function(){const box=document.getElementById("supportBusinessList");if(!box)return;box.innerHTML=SaaS.db.businesses.map(b=>`<div class="row"><div><strong>${b.name}</strong><small>${b.type} · ${b.status}</small></div><button class="btn primary" onclick="SaaS.startSupport('${b.id}')">Entrar como soporte</button></div>`).join("")};
SaaS.openBusinessModal=function(){document.getElementById("businessModal")?.classList.remove("hidden");document.getElementById("newBusinessPlan").innerHTML=SaaS.db.plans.filter(p=>p.active!==false).map(p=>`<option value="${p.id}">${p.name} · $${p.price}/mes</option>`).join("");document.getElementById("newBusinessNextPayment").value=new Date(Date.now()+30*86400000).toISOString().slice(0,10)};
SaaS.closeBusinessModal=()=>document.getElementById("businessModal")?.classList.add("hidden");
SaaS.saveBusiness=function(){const name=document.getElementById("newBusinessName")?.value.trim();if(!name)return window.App?.toast?.("Escribe el nombre del negocio");const b={id:SaaS.uid(),name,type:document.getElementById("newBusinessType")?.value||"Barbería",owner:document.getElementById("newBusinessOwner")?.value||"",ownerEmail:document.getElementById("newBusinessEmail")?.value||"",city:document.getElementById("newBusinessCity")?.value||"",planId:document.getElementById("newBusinessPlan")?.value||"plan-basic",status:document.getElementById("newBusinessStatus")?.value||"Prueba",nextPayment:document.getElementById("newBusinessNextPayment")?.value||"",createdAt:new Date().toISOString(),branches:[{id:SaaS.uid(),name:"Principal",city:document.getElementById("newBusinessCity")?.value||"",active:true}]};SaaS.db.businesses.push(b);SaaS.save();SaaS.closeBusinessModal();SaaS.renderAll();
  const pw=document.getElementById("newBusinessPassword")?.value||"";
  if(b.ownerEmail&&pw&&window.SaaSAuthAdmin){
    SaaSAuthAdmin.createBusinessMember({businessId:b.id,name:b.owner,email:b.ownerEmail,password:pw,role:"owner"})
      .then(()=>window.App?.toast?.("Negocio y dueño creados"))
      .catch(e=>window.App?.toast?.("Negocio creado; acceso dueño pendiente: "+e.message));
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
    pay.innerHTML=data.map(b=>`<div class="row"><div><strong>${b.name}</strong><small>${SaaS.getPlan(b.planId)?.name||"Plan"} · ${b.status}</small></div><strong>${b.nextPayment}</strong></div>`).join("")||'<div class="muted">Sin vencimientos registrados.</div>';
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
  box.innerHTML=`<table class="sambrix-table"><thead><tr><th>Negocio</th><th>Dueño</th><th>Plan</th><th>Estado</th><th>Próximo pago</th><th>Sucursales</th><th>Acciones</th></tr></thead><tbody>${list.map(b=>{
    const p=SaaS.getPlan(b.planId),label=SaaS.subscriptionLabel?.(b)||b.status;
    return `<tr><td><div class="business-cell"><div class="business-avatar">${(b.name||"N").slice(0,1).toUpperCase()}</div><div><strong>${b.name}</strong><small>${b.type||""} · ${b.city||"Sin ciudad"}</small></div></div></td><td><strong>${b.owner||"—"}</strong><small>${b.ownerEmail||""}</small></td><td>${p?.name||"—"}</td><td><span class="status-pill ${label}">${label}</span></td><td>${b.nextPayment||"—"}</td><td>${b.branches?.length||0}</td><td><div class="manage-actions"><button class="btn secondary tiny" onclick="SaaS.enterBusiness('${b.id}')">Abrir</button><button class="btn edit tiny" onclick="SaaS.startSupport('${b.id}')">Soporte</button><button class="btn secondary tiny" onclick="SaaS.openMembers('${b.id}')">Usuarios</button></div></td></tr>`;
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
