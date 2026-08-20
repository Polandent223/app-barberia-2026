SaaS.dataIntegrity=SaaS.dataIntegrity||{results:[],manual:{}};

SaaS.INTEGRITY_MANUAL_STEPS=[
 {id:"reload",title:"Recargar la aplicación",detail:"Los datos creados deben seguir presentes después de F5/cerrar y abrir."},
 {id:"logout_login",title:"Cerrar sesión y volver a entrar",detail:"El negocio debe recuperar sus datos correctamente."},
 {id:"second_device",title:"Abrir en otro dispositivo",detail:"Los registros importantes deben venir de Firebase, no del localStorage del primer equipo."},
 {id:"image_persistence",title:"Comprobar imágenes",detail:"Una imagen cambiada debe seguir visible después de recargar y en otro dispositivo."}
];

SaaS.loadDataIntegrity=function(){
 try{
  const saved=JSON.parse(localStorage.getItem("sambrix_data_integrity"))||{};
  SaaS.dataIntegrity={results:saved.results||[],manual:saved.manual||{}};
 }catch{}
};

SaaS.saveDataIntegrity=function(){
 localStorage.setItem("sambrix_data_integrity",JSON.stringify(SaaS.dataIntegrity));
};

SaaS.findDuplicateIds=function(rows){
 const seen=new Set(),dup=new Set();
 (rows||[]).forEach(x=>{
   const id=x?.id;
   if(!id)return;
   if(seen.has(id))dup.add(id);
   seen.add(id);
 });
 return [...dup];
};

SaaS.runDataIntegrity=function(){
 const results=[];
 (SaaS.db.businesses||[]).forEach(b=>{
   const t=SaaS.loadTenantState?.(b.id)||{};
   const collections=[
     ["clients",t.clients||[]],
     ["appointments",t.appointments||[]],
     ["sales",t.sales||[]],
     ["products",t.products||[]],
     ["barbers",t.barbers||[]]
   ];
   const duplicates=[];
   collections.forEach(([name,rows])=>{
      SaaS.findDuplicateIds(rows).forEach(id=>duplicates.push(`${name}:${id}`));
   });

   let incomplete=0;
   (t.clients||[]).forEach(c=>{if(!c.id||!c.name)incomplete++});
   (t.appointments||[]).forEach(a=>{if(!a.id||!a.date||!a.time||!a.clientId)incomplete++});
   (t.products||[]).forEach(p=>{if(!p.id||!p.name)incomplete++});

   const foreign=[
     ...(t.clients||[]),
     ...(t.appointments||[]),
     ...(t.sales||[]),
     ...(t.products||[])
   ].filter(x=>x.businessId&&x.businessId!==b.id);

   results.push({
     businessId:b.id,
     businessName:b.name,
     duplicates,
     incomplete,
     foreign:foreign.length,
     status:duplicates.length||foreign.length?"fail":incomplete?"warn":"pass"
   });
 });
 SaaS.dataIntegrity.results=results;
 SaaS.saveDataIntegrity();
 SaaS.renderDataIntegrity();
 SaaS.audit?.("QA","Integridad de datos revisada",{
   tenants:results.length,
   duplicateTenants:results.filter(r=>r.duplicates.length).length,
   foreignRecords:results.reduce((s,r)=>s+r.foreign,0)
 },"");
};

SaaS.toggleIntegrityManual=function(e){
 const c=e.target;if(!c.matches(".integrityManualCheck"))return;
 SaaS.dataIntegrity.manual[c.dataset.step]=c.checked;
 SaaS.saveDataIntegrity();SaaS.renderDataIntegrity();
};

SaaS.renderDataIntegrity=function(){
 const box=document.getElementById("integrityTenantList");if(!box)return;
 const results=SaaS.dataIntegrity.results||[];
 const duplicateCount=results.reduce((s,r)=>s+r.duplicates.length,0);
 const incompleteCount=results.reduce((s,r)=>s+r.incomplete,0);
 const foreignCount=results.reduce((s,r)=>s+r.foreign,0);

 document.getElementById("integrityDuplicateCount").textContent=duplicateCount;
 document.getElementById("integrityIncompleteCount").textContent=incompleteCount;
 document.getElementById("integrityTenantCount").textContent=results.length;
 document.getElementById("integrityState").textContent=(duplicateCount||foreignCount)?"REVISAR":results.length?"OK":"—";

 box.innerHTML=results.map(r=>`<div class="row integrity-row ${r.status}">
   <div style="flex:1">
     <strong>${r.businessName}</strong>
     <small>${r.duplicates.length} duplicado(s) · ${r.incomplete} incompleto(s) · ${r.foreign} registro(s) ajeno(s)</small>
     ${r.duplicates.length?`<div class="runtime-meta">${r.duplicates.join(", ")}</div>`:""}
   </div>
   <span class="status ${r.status==="pass"?"ok":""}">${r.status==="pass"?"OK":r.status==="warn"?"Revisar":"Error"}</span>
 </div>`).join("")||'<div class="muted">Ejecuta la revisión de integridad.</div>';

 const steps=SaaS.INTEGRITY_MANUAL_STEPS;
 const done=steps.filter(s=>SaaS.dataIntegrity.manual?.[s.id]).length;
 document.getElementById("integrityManualList").innerHTML=steps.map((s,i)=>`<label class="row integrity-row ${SaaS.dataIntegrity.manual?.[s.id]?"":"warn"}">
   <div class="wizard-check">
     <input type="checkbox" class="integrityManualCheck" data-step="${s.id}" ${SaaS.dataIntegrity.manual?.[s.id]?"checked":""}>
     <div><strong>${i+1}. ${s.title}</strong><small>${s.detail}</small></div>
   </div>
   <span class="status ${SaaS.dataIntegrity.manual?.[s.id]?"ok":""}">${SaaS.dataIntegrity.manual?.[s.id]?"OK":"Pendiente"}</span>
 </label>`).join("");

 const result=document.getElementById("integrityResult");
 if(duplicateCount||foreignCount){
   result.className="launch-result blocked";
   result.innerHTML=`<span class="tag">ERROR DE DATOS</span><h2>Integridad comprometida</h2><p>Hay ${duplicateCount} ID duplicado(s) y ${foreignCount} registro(s) asociados a otro negocio.</p>`;
 }else if(!results.length){
   result.className="launch-result";
   result.innerHTML='<span class="tag">PENDIENTE</span><h2>Ejecuta la revisión</h2><p>Todavía no se ha analizado la información de los tenants.</p>';
 }else if(done<steps.length){
   result.className="launch-result";
   result.innerHTML=`<span class="tag">DATOS LOCALES OK</span><h2>Sin cruces ni duplicados detectados</h2><p>Faltan ${steps.length-done} prueba(s) manual(es) de persistencia real.</p>`;
 }else{
   result.className="launch-result ready";
   result.innerHTML='<span class="tag">INTEGRIDAD CONFIRMADA</span><h2>Datos y persistencia verificados</h2><p>La revisión estructural y los controles manuales fueron completados.</p>';
 }
};

const oldRenderAll_175=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_175();SaaS.renderDataIntegrity();};
