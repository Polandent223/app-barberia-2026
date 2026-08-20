SaaS.maintenance=SaaS.maintenance||{
 global:false,message:"Estamos realizando mejoras. Volvemos pronto.",eta:"",
 businesses:{},
 flags:{
  smart_crm:{name:"CRM inteligente",enabled:true,rollout:100},
  advanced_reports:{name:"Reportes avanzados",enabled:true,rollout:100},
  public_store:{name:"Tienda pública",enabled:false,rollout:0},
  loyalty_beta:{name:"Fidelización Beta",enabled:false,rollout:0},
  ai_assistant:{name:"Asistente inteligente",enabled:false,rollout:0}
 }
};

SaaS.loadMaintenance=function(){
 try{
   const saved=JSON.parse(localStorage.getItem("sambrix_maintenance"))||{};
   SaaS.maintenance={...SaaS.maintenance,...saved,businesses:saved.businesses||{},flags:{...SaaS.maintenance.flags,...(saved.flags||{})}};
 }catch{}
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
 SaaS.audit?.("SYSTEM","Configuración de mantenimiento actualizada",{global:SaaS.maintenance.global},"");
 SaaS.renderMaintenance();
 SaaS.applyMaintenanceGuard();
 window.App?.toast?.("Configuración guardada");
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

SaaS.applyMaintenanceGuard=function(){
 const role=SaaS.session?.role||"guest";
 const id=SaaS.getContext?.()?.businessId||"";
 const blocked=role!=="superadmin"&&(SaaS.maintenance.global||SaaS.maintenance.businesses?.[id]);

 let overlay=document.getElementById("sambrixMaintenanceOverlay");
 if(blocked){
   if(!overlay){
     overlay=document.createElement("div");
     overlay.id="sambrixMaintenanceOverlay";
     overlay.className="maintenance-overlay";
     document.body.appendChild(overlay);
   }
   overlay.innerHTML=`<div class="card"><span class="tag">SAMBRIX</span><h1>Estamos realizando mejoras</h1><p>${SaaS.maintenance.message}</p>${SaaS.maintenance.eta?`<p><strong>Regreso estimado:</strong> ${SaaS.maintenance.eta}</p>`:""}</div>`;
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
   r.innerHTML='<span class="tag">MANTENIMIENTO GLOBAL</span><h2>Negocios y clientes bloqueados temporalmente</h2><p>SuperAdmin conserva acceso para resolver el incidente o completar la actualización.</p>';
 }else if(bs.some(b=>SaaS.maintenance.businesses?.[b.id])){
   r.className="launch-result";
   r.innerHTML='<span class="tag">MANTENIMIENTO PARCIAL</span><h2>Algunos negocios están temporalmente bloqueados</h2><p>Los demás tenants continúan operando normalmente.</p>';
 }else{
   r.className="launch-result ready";
   r.innerHTML='<span class="tag">ONLINE</span><h2>Plataforma disponible</h2><p>Todos los negocios están habilitados según sus licencias y configuración.</p>';
 }
};

const oldRoute_165=SaaS.routeSession;
if(oldRoute_165)SaaS.routeSession=function(){
 const r=oldRoute_165();
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
