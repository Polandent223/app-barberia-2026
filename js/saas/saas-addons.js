SaaS.addons=SaaS.addons||[];
SaaS.businessAddons=SaaS.businessAddons||{};

SaaS.defaultAddons=[
  {id:"payroll",code:"payroll",name:"Nómina PRO",icon:"$",price:19,description:"Comisiones, pagos, adelantos y liquidación del personal."},
  {id:"whatsapp",code:"whatsapp_pro",name:"WhatsApp PRO",icon:"W",price:15,description:"Recordatorios, confirmaciones y mensajes operativos."},
  {id:"loyalty",code:"loyalty",name:"Fidelización",icon:"★",price:12,description:"Puntos, recompensas, cumpleaños y clientes frecuentes."},
  {id:"reports",code:"advanced_reports",name:"Reportes PRO",icon:"↗",price:18,description:"Indicadores avanzados, comparativos y análisis del negocio."},
  {id:"store",code:"online_store",name:"Tienda Online",icon:"▣",price:20,description:"Catálogo de productos, pedidos y control comercial."},
  {id:"multibranch",code:"multi_branch",name:"Multi-sucursal",icon:"▦",price:25,description:"Control central de varias sucursales bajo el mismo negocio."}
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
  document.getElementById("addonTop")&&(document.getElementById("addonTop").textContent=top&&installs[top.id]?top.name:"—");

  catalog.innerHTML=SaaS.addons.map(a=>`<article class="addon-card">
    <div class="addon-icon">${a.icon||"+"}</div><div><strong>${a.name}</strong><p>${a.description||""}</p></div>
    <div class="addon-price">$${Number(a.price||0).toFixed(2)} <small>/ mes</small></div>
    <small>${installs[a.id]||0} instalación(es)</small>
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
  if(!businessId){box.innerHTML='<div class="muted">Selecciona un negocio para administrar sus módulos.</div>';return}
  box.innerHTML=SaaS.addons.map(a=>{
    const on=SaaS.isAddonEnabled(businessId,a.id);
    return `<article class="addon-card ${on?"enabled":""}">
      <div class="addon-switch"><div class="addon-icon">${a.icon||"+"}</div><span class="status-pill ${on?"Activo":"Suspendido"}">${on?"Activo":"Desactivado"}</span></div>
      <strong>${a.name}</strong><p>${a.description||""}</p>
      <div class="addon-price">$${Number(a.price||0).toFixed(2)} <small>/ mes</small></div>
      <button class="btn ${on?"secondary":"primary"}" onclick="SaaS.toggleAddon('${businessId}','${a.id}')">${on?"Desactivar":"Activar módulo"}</button>
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
  if(!name||!code)return alert("Nombre y código son obligatorios.");
  const item={id:SaaS.editingAddonId||SaaS.uid(),name,price,code,icon:document.getElementById("addonIcon").value.trim()||"+",description:document.getElementById("addonDescription").value.trim()};
  const i=SaaS.addons.findIndex(a=>a.id===item.id);if(i>=0)SaaS.addons[i]=item;else SaaS.addons.push(item);
  SaaS.saveAddons();SaaS.audit?.("SUBSCRIPTION",i>=0?"Add-on editado":"Add-on creado",{addon:item.name});SaaS.closeAddonModal();SaaS.renderAddons();
};

SaaS.getAddonMRRForBusiness=function(businessId){
  return SaaS.addons.reduce((sum,a)=>sum+(SaaS.isAddonEnabled(businessId,a.id)?Number(a.price||0):0),0);
};

const oldRenderAll_139=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_139();SaaS.renderAddons()};
