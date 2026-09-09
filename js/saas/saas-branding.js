
SaaS.platformSettings=SaaS.platformSettings||{name:"SAMBRIX",tagline:"Tecnología para negocios de belleza",supportEmail:"",supportWhatsapp:""};

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
    return window.App?.toast?.("Marca blanca está disponible en Premium");
  }

  const slug=SaaS.normalizeSlug(document.getElementById("businessSlug")?.value||b.name);
  if(SaaS.db.businesses.some(x=>x.id!==b.id&&x.slug===slug)){
    return window.App?.toast?.("Ese slug ya está en uso");
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

/* ===== FASE 20.21 — PERSONALIZACIÓN POR PLAN ===== */
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
      <div class="branding-plan-pills">${rows.map(([t,on])=>`<span class="${on?"included":"upgrade"}">${on?"✓":"↑"} ${t}</span>`).join("")}</div>`;
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


