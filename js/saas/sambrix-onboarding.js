SaaS.onboarding=SaaS.onboarding||{items:[]};
SaaS.ONBOARDING_STEPS=[
 {id:"identity",title:"Identidad y marca",detail:"Nombre, logo, colores y datos del negocio."},
 {id:"services",title:"Servicios y precios",detail:"Servicios visibles, duración y precios correctos."},
 {id:"team",title:"Equipo y permisos",detail:"Personal creado con roles apropiados."},
 {id:"hours",title:"Horarios",detail:"Disponibilidad, descansos y días cerrados."},
 {id:"booking",title:"Reserva pública",detail:"Enlace/flujo público probado de principio a fin."},
 {id:"owner",title:"Acceso del dueño",detail:"Dueño inicia sesión y solo ve su negocio."},
 {id:"payments",title:"Plan y facturación",detail:"Plan SaaS y estado comercial revisados."},
 {id:"acceptance",title:"Aceptación final",detail:"Dueño confirma que la cuenta está lista."}
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
  steps:{},status:"En activación",createdAt:new Date().toISOString()
 });
 SaaS.saveOnboarding();
 SaaS.audit?.("ONBOARDING","Activación iniciada",{business:b.name},businessId);
 SaaS.closeOnboarding();SaaS.renderOnboarding();
};

SaaS.toggleOnboardingStep=function(e){
 const c=e.target;if(!c.matches(".onboardingCheck"))return;
 const item=SaaS.onboarding.items.find(x=>x.id===c.dataset.item);if(!item)return;
 item.steps[c.dataset.step]=c.checked;
 const done=SaaS.ONBOARDING_STEPS.filter(s=>item.steps[s.id]).length;
 item.status=done===SaaS.ONBOARDING_STEPS.length?"Completado":"En activación";
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
    <div><strong>${i.businessName}</strong><small>${i.owner} · ${i.status}</small></div>
    <b>${pct}%</b>
   </div>
   <div class="onboard-progress"><span style="width:${pct}%"></span></div>
   <div class="onboard-steps">${SaaS.ONBOARDING_STEPS.map(s=>`<label class="onboard-step">
    <input type="checkbox" class="onboardingCheck" data-item="${i.id}" data-step="${s.id}" ${i.steps?.[s.id]?"checked":""}>
    <span><strong>${s.title}</strong><small>${s.detail}</small></span>
   </label>`).join("")}</div>
  </div>`;
 }).join("")||'<div class="muted">Todavía no hay negocios en proceso de activación.</div>';

 const result=document.getElementById("onboardingResult");
 if(blocked){
  result.className="launch-result blocked";
  result.innerHTML=`<span class="tag">ATENCIÓN</span><h2>${blocked} activación(es) bloqueada(s)</h2><p>Resuelve los bloqueos antes de entregar esas cuentas.</p>`;
 }else if(active){
  result.className="launch-result";
  result.innerHTML=`<span class="tag">EN PROCESO</span><h2>${active} negocio(s) en activación</h2><p>Una cuenta solo se considera entregada cuando completa los ${totalSteps} controles.</p>`;
 }else if(done){
  result.className="launch-result ready";
  result.innerHTML=`<span class="tag">ACTIVADOS</span><h2>${done} negocio(s) completados</h2><p>Todos los procesos registrados terminaron su checklist.</p>`;
 }else{
  result.className="launch-result";
  result.innerHTML='<span class="tag">SIN ACTIVACIONES</span><h2>Listo para el primer negocio</h2><p>Cuando demos de alta un negocio, su proceso quedará controlado aquí.</p>';
 }
};

const oldRenderAll_187=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_187();SaaS.renderOnboarding();};
