
/* ===== FASE 20.8 — ACTIVACIÓN Y ENTREGA SEGURA ===== */

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
  return {active:false,status:"pending",label:"Pendiente de activación"};
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
        :"La capacitación/aceptación no está completa.";
      b.deliveredAt="";
      b.deliveredBy="";
      b.deliveryStatus="Requiere revisión";
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
  {id:"owner",label:"Dueño y correo",ok:!!(b.owner&&b.ownerEmail)},
  {id:"ownerAccess",label:"Acceso real del propietario",ok:access.active,critical:true,detail:access.label},
  {id:"branch",label:"Sucursal principal",ok:!!b.branches?.length},
  {id:"plan",label:"Plan SAMBRIX",ok:!!b.planId},
  {id:"brand",label:"Marca del negocio",ok:!!b.brand?.name},
  {id:"services",label:"Servicios configurados",ok:(tenant.services||[]).length>0},
  {id:"staff",label:"Profesional/personal configurado",ok:(tenant.barbers||tenant.employees||[]).length>0},
  {id:"license",label:"Licencia habilitada",ok:!!license&&!license.blocked},
  {id:"training",label:"Capacitación y aceptación",ok:training.complete,critical:true,detail:training.started?`${training.pct}% completado`:"No iniciada"}
 ];

 const pct=Math.round(checks.filter(x=>x.ok).length/checks.length*100);
 const criticalOk=checks.filter(x=>x.critical).every(x=>x.ok);
 const ready=pct===100&&criticalOk;

 return {
   checks,pct,ready,
   delivered:!!b.deliveredAt&&ready,
   access,
   training,
   reviewRequired:b.deliveryStatus==="Requiere revisión"
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
   const state=s.reviewRequired?"Requiere revisión":
     s.delivered?"Entregado":
     !s.access.active?"Acceso del propietario pendiente":
     !s.training.complete?"Capacitación pendiente":
     s.ready?"Listo para entregar":"Configuración pendiente";

   const action=s.delivered?"Ver entrega":s.ready?"Entregar":"Revisar";

   return `<div class="row activation-row ${s.delivered?"delivered":s.ready?"ready":s.reviewRequired?"review":""}">
     <div style="flex:1">
       <strong>${b.name}</strong>
       <small>${b.owner||"Sin dueño"} · ${state}</small>
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
       <i>${c.ok?"✓":"!"}</i>
       <div>
         <strong>${c.label}${c.critical?" · crítico":""}</strong>
         <small>${c.ok?"Completado":(c.detail||"Pendiente")}</small>
       </div>
     </div>
   </div>`).join("");

 document.getElementById("activationOwnerAccess").innerHTML=`
   <div class="row"><span>Dueño</span><strong>${b.owner||"—"}</strong></div>
   <div class="row"><span>Correo</span><strong>${b.ownerEmail||"—"}</strong></div>
   <div class="row"><span>Acceso</span><strong>${s.access.label}</strong></div>
   <div class="row"><span>Capacitación</span><strong>${s.training.complete?"Completa":s.training.started?s.training.pct+"%":"No iniciada"}</strong></div>
   <div class="row"><span>Plan</span><strong>${SaaS.getPlan(b.planId)?.name||"—"}</strong></div>
   <div class="row"><span>Estado</span><strong>${s.delivered?"Entregado":s.ready?"Listo":"Pendiente"}</strong></div>
   <div class="row"><span>Gestión de acceso</span><button class="btn secondary tiny" type="button" onclick="SaaS.openOwnerAccessSetup('${b.id}')">${s.access.active?"Restablecer acceso":"Configurar acceso"}</button></div>`;

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
   return alert("No se puede entregar: el propietario todavía no tiene un acceso activo.");
 }
 if(!s.training.complete){
   return alert("No se puede entregar: la capacitación y aceptación del propietario no están completas.");
 }
 if(!s.ready){
   const pending=s.checks.filter(x=>!x.ok).map(x=>x.label).join(", ");
   return alert(`Todavía faltan configuraciones: ${pending}`);
 }
 if(!confirm(`¿Confirmar que ${b.name} fue probado, capacitado y entregado al propietario?`))return;

 b.deliveredAt=new Date().toISOString();
 b.deliveredBy=window.FirebaseBridge?.user?.email||SaaS.session?.user?.email||"SuperAdmin";
 b.deliveryStatus="Entregado";
 b.deliveryReviewReason="";
 b.status="Activo";

 SaaS.save();
 SaaS.audit?.("BUSINESS","Negocio entregado al dueño",{
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
