SaaS.ONBOARDING_TIMEZONES={
 "DO":{name:"República Dominicana",zones:[["America/Santo_Domingo","Santo Domingo (UTC-4)"]]},
 "PR":{name:"Puerto Rico",zones:[["America/Puerto_Rico","Puerto Rico (UTC-4)"]]},
 "US":{name:"Estados Unidos",zones:[["America/New_York","Este"],["America/Chicago","Central"],["America/Denver","Montaña"],["America/Los_Angeles","Pacífico"],["America/Phoenix","Arizona"],["America/Anchorage","Alaska"],["Pacific/Honolulu","Hawái"]]},
 "MX":{name:"México",zones:[["America/Mexico_City","Ciudad de México"],["America/Cancun","Cancún"],["America/Monterrey","Monterrey"],["America/Tijuana","Tijuana"]]},
 "CO":{name:"Colombia",zones:[["America/Bogota","Bogotá"]]},
 "VE":{name:"Venezuela",zones:[["America/Caracas","Caracas"]]},
 "EC":{name:"Ecuador",zones:[["America/Guayaquil","Guayaquil"]]},
 "PE":{name:"Perú",zones:[["America/Lima","Lima"]]},
 "CL":{name:"Chile",zones:[["America/Santiago","Santiago"]]},
 "AR":{name:"Argentina",zones:[["America/Argentina/Buenos_Aires","Buenos Aires"]]},
 "BR":{name:"Brasil",zones:[["America/Sao_Paulo","São Paulo"],["America/Manaus","Manaus"],["America/Recife","Recife"]]},
 "PA":{name:"Panamá",zones:[["America/Panama","Panamá"]]},
 "CR":{name:"Costa Rica",zones:[["America/Costa_Rica","Costa Rica"]]},
 "GT":{name:"Guatemala",zones:[["America/Guatemala","Guatemala"]]},
 "SV":{name:"El Salvador",zones:[["America/El_Salvador","El Salvador"]]},
 "HN":{name:"Honduras",zones:[["America/Tegucigalpa","Tegucigalpa"]]},
 "NI":{name:"Nicaragua",zones:[["America/Managua","Managua"]]},
 "ES":{name:"España",zones:[["Europe/Madrid","Península"],["Atlantic/Canary","Islas Canarias"]]},
 "CA":{name:"Canadá",zones:[["America/Toronto","Toronto"],["America/Winnipeg","Winnipeg"],["America/Edmonton","Edmonton"],["America/Vancouver","Vancouver"],["America/Halifax","Halifax"]]},
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
 b.innerHTML=(SaaS.db.businesses||[]).map(x=>`<div class="row"><div><strong>${x.name}</strong><small>${x.ownerEmail||"Sin correo"} · ${x.status||"—"}</small></div></div>`).join("")||'<div class="muted">Todavía no hay negocios creados.</div>';
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
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return alert("Escribe un correo válido.");
   if(pw.length<8)return alert("La contraseña temporal debe tener al menos 8 caracteres.");
   if(pw!==pw2)return alert("Las contraseñas no coinciden.");
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
 const country=SaaS.ONBOARDING_TIMEZONES[document.getElementById("obCountry").value]?.name||"—";
 const rows=[
  ["Negocio",document.getElementById("obBusinessName").value],
  ["Tipo",document.getElementById("obBusinessType").value],
  ["Propietario",document.getElementById("obOwnerName").value],
  ["Correo de acceso",document.getElementById("obOwnerEmail").value],
  ["País",country],
  ["Zona horaria",document.getElementById("obTimezone").value],
  ["Sucursal",document.getElementById("obBranchName").value],
  ["Plan",p?.name||"—"],
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
     if(b){
       const local=await SaaS.createLocalReviewCredential?.(b,password);
       return {status:"local-review",detail:`Firebase pendiente (${error?.message||"error"}). Se creó acceso local de prueba.`};
     }
     return {status:"pending",detail:`Negocio creado. Acceso Firebase pendiente: ${error?.message||"no disponible"}`};
   }
 }

 if(b&&SaaS.createLocalReviewCredential){
   return await SaaS.createLocalReviewCredential(b,password);
 }

 return {status:"pending",detail:"Propietario registrado. Activación Firebase pendiente."};
};

SaaS.showOnboardingSuccess=function(business,access){
 document.getElementById("obSuccessBusinessName").textContent=business.name;
 document.getElementById("obSuccessOwner").textContent=`Propietario: ${business.owner} · ${business.ownerEmail}`;
 const box=document.getElementById("obSuccessAccessState");
 box.className=access.status==="active"?"launch-result ready":"launch-result";
 box.innerHTML=access.status==="active"
  ?`<span class="tag">ACCESO ACTIVO</span><h2>Propietario creado</h2><p>${access.detail}</p>`
  :access.status==="local-review"
    ?`<span class="tag">PRUEBA LOCAL</span><h2>Acceso local disponible</h2><p>${access.detail} No se considera acceso de producción.</p>`
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

 try{
   const ownerEmail=document.getElementById("obOwnerEmail").value.trim().toLowerCase();
   if((SaaS.db.businesses||[]).some(b=>String(b.ownerEmail||"").toLowerCase()===ownerEmail)){
     throw new Error("Ya existe un negocio con ese correo de propietario.");
   }

   const id="biz_"+SaaS.uid(), branchId="branch_"+SaaS.uid(), ownerId="owner_"+SaaS.uid();
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
   SaaS.db.subscriptions.push({
     id:"sub_"+SaaS.uid(),
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

   b.members[0].authStatus=access.status;
   b.ownerAccessStatus=access.status;
   SaaS.save();

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
   alert(error?.message||"No se pudo crear el negocio.");
 }finally{
   if(button){button.disabled=false;button.textContent="Crear negocio y propietario";}
 }
};

const oldRenderAll_205=SaaS.renderAll;
SaaS.renderAll=function(){
 oldRenderAll_205();
 SaaS.renderOnboarding();
};
