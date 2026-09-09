SaaS.trainingHandoff=SaaS.trainingHandoff||{items:[]};
SaaS.TRAINING_HANDOFF_STEPS=[
 {id:"login",title:"Inicio de sesión",critical:true,detail:"El dueño entra con su propia cuenta."},
 {id:"dashboard",title:"Panel principal",critical:false,detail:"Entiende métricas, alertas y navegación."},
 {id:"appointments",title:"Citas y calendario",critical:true,detail:"Crear, mover, cancelar y completar citas."},
 {id:"clients",title:"Clientes",critical:false,detail:"Buscar, crear y actualizar clientes."},
 {id:"team",title:"Personal y permisos",critical:true,detail:"Sabe agregar personal sin entregar acceso indebido."},
 {id:"booking",title:"Reserva pública",critical:true,detail:"Prueba el flujo que utilizarán sus clientes."},
 {id:"reports",title:"Reportes y ventas",critical:false,detail:"Conoce dónde revisar actividad del negocio."},
 {id:"support",title:"Soporte SAMBRIX",critical:false,detail:"Sabe cómo reportar un problema."},
 {id:"acceptance",title:"Aceptación de entrega",critical:true,detail:"El responsable confirma que recibió y comprendió la cuenta."}
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
  status:"En capacitación"
 });

 SaaS.saveTrainingHandoff();
 SaaS.audit?.("TRAINING","Capacitación iniciada",{business:b.name,ownerAccessStatus:access.status},businessId);
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
   return alert(`No puedes completar "${c.dataset.step==="login"?"Inicio de sesión":"Aceptación de entrega"}": el acceso del propietario no está activo.`);
 }

 item.steps[c.dataset.step]=c.checked;

 const steps=SaaS.TRAINING_HANDOFF_STEPS;
 const done=steps.filter(s=>item.steps[s.id]).length;
 const criticalPending=steps.filter(s=>s.critical&&!item.steps[s.id]).length;
 const complete=done===steps.length&&criticalPending===0&&access.active;

 item.status=complete?"Capacitación completa":"En capacitación";
 item.updatedAt=new Date().toISOString();

 // Training itself does not mark the business delivered.
 // Final delivery belongs exclusively to Activation.
 if(complete&&!item.completedAt){
   item.completedAt=item.updatedAt;
   SaaS.audit?.("TRAINING","Capacitación completada",{
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
      <small>${i.owner} · Capacita: ${i.trainer}</small>
      <small class="training-access ${access.active?"ok":"pending"}">Acceso propietario: ${access.label}</small>
    </div>
    <b>${pct}%</b>
   </div>
   <div class="training-progress"><span style="width:${pct}%"></span></div>
   <div class="training-steps">${steps.map(s=>{
      const locked=["login","acceptance"].includes(s.id)&&!access.active;
      return `<label class="training-step ${locked?"locked":""}">
       <input type="checkbox" class="trainingHandoffCheck" data-item="${i.id}" data-step="${s.id}" ${i.steps?.[s.id]?"checked":""} ${locked?"disabled":""}>
       <span><strong>${s.critical?"★ ":""}${s.title}${locked?" · bloqueado":""}</strong><small>${locked?"Activa primero el acceso real del propietario.":s.detail}</small></span>
      </label>`;
   }).join("")}</div>
  </div>`).join("")||'<div class="muted">Todavía no hay capacitaciones registradas.</div>';

 const result=document.getElementById("trainingHandoffResult");
 if(criticalPending){
  result.className="launch-result blocked";
  result.innerHTML=`<span class="tag">NO ENTREGAR AÚN</span><h2>${criticalPending} control(es) crítico(s) pendientes</h2><p>El acceso real, la capacitación y la aceptación deben completarse antes de la entrega final.</p>`;
 }else if(active){
  result.className="launch-result";
  result.innerHTML=`<span class="tag">CAPACITACIÓN</span><h2>${active} capacitación(es) en progreso</h2><p>Termina todos los pasos antes de pasar a Activación.</p>`;
 }else if(complete){
  result.className="launch-result ready";
  result.innerHTML=`<span class="tag">CAPACITACIÓN COMPLETA</span><h2>${complete} negocio(s) listos para validación final</h2><p>Ahora deben completarse desde Activación y entrega.</p>`;
 }else{
  result.className="launch-result";
  result.innerHTML='<span class="tag">LISTO</span><h2>Preparado para capacitar</h2><p>La capacitación comenzará cuando haya un negocio con acceso de propietario disponible.</p>';
 }
};

const oldRenderAll_188=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_188();SaaS.renderTrainingHandoff();};
