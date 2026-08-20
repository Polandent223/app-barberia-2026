
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
  if(document.getElementById("businessSlug"))document.getElementById("businessSlug").value=b.slug;
  if(document.getElementById("showPoweredBy"))document.getElementById("showPoweredBy").value=String(b.whiteLabel.showPoweredBy!==false);
  const premium=b.planId==="plan-premium";
  document.getElementById("whiteLabelPlanBadge")&&(document.getElementById("whiteLabelPlanBadge").textContent=premium?"Premium activo":"Requiere Premium");
  if(document.getElementById("showPoweredBy"))document.getElementById("showPoweredBy").disabled=!premium;
  const footer=document.getElementById("nexoPoweredBy");
  if(footer)footer.classList.toggle("white-label-hidden",premium&&b.whiteLabel.showPoweredBy===false);
};
SaaS.saveWhiteLabel=function(){
  const b=SaaS.currentBusiness();if(!b)return;
  const slug=SaaS.normalizeSlug(document.getElementById("businessSlug")?.value||b.name);
  if(SaaS.db.businesses.some(x=>x.id!==b.id&&x.slug===slug))return window.App?.toast?.("Ese slug ya está en uso");
  b.slug=slug||b.id;
  b.whiteLabel=b.whiteLabel||{};
  b.whiteLabel.showPoweredBy=b.planId==="plan-premium"?(document.getElementById("showPoweredBy").value==="true"):true;
  SaaS.save();SaaS.renderAll();SaaS.renderPublicLink?.();window.App?.toast?.("Marca blanca actualizada");
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
