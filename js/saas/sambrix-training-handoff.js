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
 SaaS.trainingHandoff.items.push({
  id:"handoff_"+SaaS.uid(),businessId,businessName:b.name,
  trainer:document.getElementById("trainingHandoffTrainer").value.trim()||"SuperAdmin",
  owner:document.getElementById("trainingHandoffOwner").value.trim()||"Responsable del negocio",
  steps:{},createdAt:new Date().toISOString(),status:"En capacitación"
 });
 SaaS.saveTrainingHandoff();
 SaaS.audit?.("TRAINING","Entrega/capacitación iniciada",{business:b.name},businessId);
 SaaS.closeTrainingHandoff();SaaS.renderTrainingHandoff();
};

SaaS.toggleTrainingHandoff=function(e){
 const c=e.target;if(!c.matches(".trainingHandoffCheck"))return;
 const item=SaaS.trainingHandoff.items.find(x=>x.id===c.dataset.item);if(!item)return;
 item.steps[c.dataset.step]=c.checked;
 const done=SaaS.TRAINING_HANDOFF_STEPS.filter(s=>item.steps[s.id]).length;
 item.status=done===SaaS.TRAINING_HANDOFF_STEPS.length?"Entregado":"En capacitación";
 item.updatedAt=new Date().toISOString();
 if(item.status==="Entregado"&&!item.deliveredAt){
   item.deliveredAt=item.updatedAt;
   SaaS.audit?.("TRAINING","Negocio entregado al responsable",{business:item.businessName,owner:item.owner},item.businessId);
 }
 SaaS.saveTrainingHandoff();SaaS.renderTrainingHandoff();
};

SaaS.renderTrainingHandoff=function(){
 const box=document.getElementById("trainingHandoffList");if(!box)return;
 const items=SaaS.trainingHandoff.items||[],steps=SaaS.TRAINING_HANDOFF_STEPS,total=steps.length;
 const count=i=>steps.filter(s=>i.steps?.[s.id]).length;
 const complete=items.filter(i=>count(i)===total).length;
 const active=items.length-complete;
 const avg=items.length?Math.round(items.reduce((a,i)=>a+count(i)/total*100,0)/items.length):0;
 const criticalPending=items.reduce((n,i)=>n+steps.filter(s=>s.critical&&!i.steps?.[s.id]).length,0);

 document.getElementById("trainingActiveCount").textContent=active;
 document.getElementById("trainingDoneCount").textContent=complete;
 document.getElementById("trainingAverage").textContent=avg+"%";
 document.getElementById("trainingCriticalCount").textContent=criticalPending;

 box.innerHTML=[...items].reverse().map(i=>{
  const n=count(i),pct=Math.round(n/total*100);
  const crit=steps.filter(s=>s.critical&&!i.steps?.[s.id]).length;
  return `<div class="row training-row ${pct===100?"done":crit?"blocked":""}" style="display:block">
   <div style="display:flex;justify-content:space-between;gap:12px">
    <div><strong>${i.businessName}</strong><small>${i.owner} · Capacita: ${i.trainer}</small></div>
    <b>${pct}%</b>
   </div>
   <div class="training-progress"><span style="width:${pct}%"></span></div>
   <div class="training-steps">${steps.map(s=>`<label class="training-step">
    <input type="checkbox" class="trainingHandoffCheck" data-item="${i.id}" data-step="${s.id}" ${i.steps?.[s.id]?"checked":""}>
    <span><strong>${s.critical?"★ ":""}${s.title}</strong><small>${s.detail}</small></span>
   </label>`).join("")}</div>
  </div>`;
 }).join("")||'<div class="muted">Todavía no hay entregas registradas.</div>';

 const result=document.getElementById("trainingHandoffResult");
 if(criticalPending){
  result.className="launch-result blocked";
  result.innerHTML=`<span class="tag">NO ENTREGAR AÚN</span><h2>${criticalPending} control(es) crítico(s) pendientes</h2><p>El dueño debe dominar acceso, citas, permisos, reserva pública y aceptación antes de operar solo.</p>`;
 }else if(active){
  result.className="launch-result";
  result.innerHTML=`<span class="tag">CAPACITACIÓN</span><h2>${active} entrega(s) en progreso</h2><p>Los controles críticos están cubiertos; faltan temas complementarios.</p>`;
 }else if(complete){
  result.className="launch-result ready";
  result.innerHTML=`<span class="tag">ENTREGA COMPLETA</span><h2>${complete} negocio(s) entregados</h2><p>Los responsables completaron todo el recorrido de capacitación registrado.</p>`;
 }else{
  result.className="launch-result";
  result.innerHTML='<span class="tag">LISTO</span><h2>Preparado para capacitar</h2><p>Cuando activemos negocios reales, su entrega quedará documentada aquí.</p>';
 }
};

const oldRenderAll_188=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_188();SaaS.renderTrainingHandoff();};
