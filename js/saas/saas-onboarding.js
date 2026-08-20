
SaaS.onboarding={step:1,planId:""};
SaaS.businessReadiness=function(b){
 const c=[!!b.name,!!b.type,!!b.owner,!!b.ownerEmail,!!b.branches?.length,!!b.planId,!!b.brand?.name,!!b.branches?.[0]?.timezone];
 return Math.round(c.filter(Boolean).length/c.length*100);
};
SaaS.renderOnboarding=function(){
 const box=document.getElementById("onboardingBusinessList");if(!box)return;
 const bs=SaaS.db.businesses||[], rs=bs.map(SaaS.businessReadiness), ready=rs.filter(x=>x===100).length, avg=rs.length?Math.round(rs.reduce((a,b)=>a+b,0)/rs.length):0;
 document.getElementById("onboardBusinessCount").textContent=bs.length;document.getElementById("onboardReadyCount").textContent=ready;document.getElementById("onboardPendingCount").textContent=bs.length-ready;document.getElementById("onboardAverage").textContent=avg+"%";
 box.innerHTML=bs.map(b=>{const p=SaaS.businessReadiness(b);return `<div class="row"><div><strong>${b.name}</strong><small>${b.type||"Negocio"} · ${b.owner||"Sin dueño"} · ${SaaS.getPlan(b.planId)?.name||"Sin plan"}</small></div><div style="display:flex;align-items:center;gap:10px"><div class="onboarding-business-progress"><i style="width:${p}%"></i></div><strong>${p}%</strong></div></div>`}).join("")||'<div class="muted">Todavía no hay negocios.</div>';
};
SaaS.openOnboarding=function(){
 SaaS.onboarding={step:1,planId:SaaS.db.plans?.[0]?.id||""};SaaS.renderOnboardingPlans();SaaS.showOnboardingStep();document.getElementById("onboardingModal")?.classList.add("open");
};
SaaS.closeOnboarding=function(){document.getElementById("onboardingModal")?.classList.remove("open")};
SaaS.renderOnboardingPlans=function(){
 const box=document.getElementById("obPlanCards");if(!box)return;
 box.innerHTML=(SaaS.db.plans||[]).map(p=>`<article class="addon-card ob-plan ${SaaS.onboarding.planId===p.id?"selected":""}" onclick="SaaS.selectOnboardingPlan('${p.id}')"><strong>${p.name}</strong><div class="addon-price">$${Number(p.price||0).toFixed(2)} <small>/ mes</small></div></article>`).join("");
};
SaaS.selectOnboardingPlan=function(id){SaaS.onboarding.planId=id;SaaS.renderOnboardingPlans()};
SaaS.nextOnboarding=function(){
 const s=SaaS.onboarding.step;
 if(s===1&&!document.getElementById("obBusinessName").value.trim())return alert("Escribe el nombre del negocio.");
 if(s===2&&(!document.getElementById("obOwnerName").value.trim()||!document.getElementById("obOwnerEmail").value.trim()))return alert("Completa nombre y correo del dueño.");
 if(s===1){document.getElementById("obBranchCity").value=document.getElementById("obBusinessCity").value;document.getElementById("obBrandName").value=document.getElementById("obBusinessName").value}
 SaaS.onboarding.step=Math.min(6,s+1);SaaS.showOnboardingStep();
};
SaaS.prevOnboarding=function(){SaaS.onboarding.step=Math.max(1,SaaS.onboarding.step-1);SaaS.showOnboardingStep()};
SaaS.showOnboardingStep=function(){
 const s=SaaS.onboarding.step;document.querySelectorAll(".onboarding-step").forEach(e=>e.classList.toggle("active",+e.dataset.obStep===s));document.getElementById("onboardingProgressBar").style.width=(s/6*100)+"%";document.getElementById("obPrevBtn").classList.toggle("hidden",s===1);document.getElementById("obNextBtn").classList.toggle("hidden",s===6);document.getElementById("obCreateBtn").classList.toggle("hidden",s!==6);if(s===6)SaaS.renderOnboardingSummary();
};
SaaS.renderOnboardingSummary=function(){
 const p=SaaS.getPlan(SaaS.onboarding.planId), rows=[["Negocio",obBusinessName.value],["Tipo",obBusinessType.value],["Dueño",obOwnerName.value],["Correo",obOwnerEmail.value],["Sucursal",obBranchName.value],["Plan",p?.name||"—"],["Marca",obBrandName.value]];
 document.getElementById("obSummary").innerHTML=rows.map(r=>`<div class="row"><span>${r[0]}</span><strong>${r[1]}</strong></div>`).join("");
};
SaaS.createFromOnboarding=function(){
 const id="biz_"+SaaS.uid(), branchId="branch_"+SaaS.uid(), next=new Date();next.setMonth(next.getMonth()+1);
 const b={id,name:obBusinessName.value.trim(),type:obBusinessType.value,phone:obBusinessPhone.value.trim(),city:obBusinessCity.value.trim(),owner:obOwnerName.value.trim(),ownerEmail:obOwnerEmail.value.trim().toLowerCase(),ownerPhone:obOwnerPhone.value.trim(),planId:SaaS.onboarding.planId,status:"Activo",nextPayment:next.toISOString().slice(0,10),createdAt:new Date().toISOString(),branches:[{id:branchId,name:obBranchName.value.trim()||"Principal",address:obBranchAddress.value.trim(),city:obBranchCity.value.trim(),timezone:obTimezone.value}],brand:{name:obBrandName.value.trim()||obBusinessName.value.trim(),tagline:obBrandTagline.value.trim(),primaryColor:obBrandColor.value}};
 SaaS.db.businesses.push(b);SaaS.save();SaaS.audit?.("BUSINESS","Negocio creado por onboarding",{branchId},id);SaaS.closeOnboarding();SaaS.renderAll();window.App?.toast?.("Negocio SAMBRIX creado");
};
const oldRenderAll_143=SaaS.renderAll;SaaS.renderAll=function(){oldRenderAll_143();SaaS.renderOnboarding()};
