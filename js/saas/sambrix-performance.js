SaaS.performanceTest=SaaS.performanceTest||{results:[],manual:{},renderMs:null,totalRecords:0,storageBytes:0};

SaaS.PERFORMANCE_MANUAL_STEPS=[
 {id:"mobile",title:"Teléfono económico/medio",detail:"Abrir SAMBRIX en un teléfono no potente y comprobar navegación fluida."},
 {id:"slow_network",title:"Red lenta",detail:"Probar con conexión móvil o Wi‑Fi lento y verificar que no se bloquee la interfaz."},
 {id:"many_records",title:"Negocio con muchos registros",detail:"Probar listas de clientes/citas/productos con volumen alto y revisar tiempos."},
 {id:"concurrent",title:"Usuarios simultáneos",detail:"Usar al menos dos sesiones al mismo tiempo. Esta prueba no puede simularse solo en local."}
];

SaaS.loadPerformanceTest=function(){
 try{
  const saved=JSON.parse(localStorage.getItem("sambrix_performance_test"))||{};
  SaaS.performanceTest={...SaaS.performanceTest,...saved,manual:saved.manual||{},results:saved.results||[]};
 }catch{}
};

SaaS.savePerformanceTest=function(){
 localStorage.setItem("sambrix_performance_test",JSON.stringify(SaaS.performanceTest));
};

SaaS.tenantRecordCount=function(t){
 return ["clients","appointments","sales","products","barbers","employees","services","users"].reduce((sum,k)=>sum+((t?.[k]||[]).length||0),0);
};

SaaS.runPerformanceTest=function(){
 const start=performance.now();
 const results=[];
 let total=0,bytes=0;

 (SaaS.db.businesses||[]).forEach(b=>{
   const t=SaaS.loadTenantState?.(b.id)||{};
   const count=SaaS.tenantRecordCount(t);
   const size=new Blob([JSON.stringify(t)]).size;
   total+=count;bytes+=size;

   let status="pass";
   if(count>5000||size>5*1024*1024)status="warn";
   if(count>20000||size>20*1024*1024)status="fail";

   results.push({
     businessId:b.id,
     businessName:b.name,
     records:count,
     bytes:size,
     status
   });
 });

 // A local render benchmark: measure one complete render cycle.
 try{window.App?.renderAll?.()}catch{}
 const renderMs=Math.round((performance.now()-start)*10)/10;

 SaaS.performanceTest.results=results;
 SaaS.performanceTest.renderMs=renderMs;
 SaaS.performanceTest.totalRecords=total;
 SaaS.performanceTest.storageBytes=bytes;
 SaaS.performanceTest.testedAt=new Date().toISOString();
 SaaS.savePerformanceTest();
 SaaS.renderPerformance();
 SaaS.audit?.("QA","Prueba local de rendimiento ejecutada",{renderMs,totalRecords:total,bytes},"");
};

SaaS.togglePerformanceManual=function(e){
 const c=e.target;if(!c.matches(".performanceManualCheck"))return;
 SaaS.performanceTest.manual[c.dataset.step]=c.checked;
 SaaS.savePerformanceTest();SaaS.renderPerformance();
};

SaaS.renderPerformance=function(){
 const box=document.getElementById("performanceTenantList");if(!box)return;
 const p=SaaS.performanceTest;
 const results=p.results||[];
 const renderMs=Number(p.renderMs||0);

 document.getElementById("perfRenderTime").textContent=renderMs?`${renderMs} ms`:"—";
 document.getElementById("perfRecordCount").textContent=Number(p.totalRecords||0).toLocaleString();
 document.getElementById("perfStorageSize").textContent=`${(Number(p.storageBytes||0)/1024).toFixed(1)} KB`;

 const fail=results.filter(r=>r.status==="fail").length;
 const warn=results.filter(r=>r.status==="warn").length;
 const renderStatus=!renderMs?"":renderMs>2000?"fail":renderMs>800?"warn":"pass";
 document.getElementById("perfState").textContent=fail||renderStatus==="fail"?"REVISAR":warn||renderStatus==="warn"?"ATENCIÓN":results.length?"OK":"—";

 const max=Math.max(1,...results.map(r=>r.records));
 box.innerHTML=results.map(r=>`<div class="row performance-row ${r.status}">
   <div style="flex:1">
     <strong>${r.businessName}</strong>
     <small>${r.records.toLocaleString()} registros · ${(r.bytes/1024).toFixed(1)} KB</small>
     <div class="performance-meter"><i style="width:${Math.min(100,r.records/max*100)}%"></i></div>
   </div>
   <span class="status ${r.status==="pass"?"ok":""}">${r.status==="pass"?"OK":r.status==="warn"?"Revisar":"Pesado"}</span>
 </div>`).join("")||'<div class="muted">Ejecuta la prueba local.</div>';

 const steps=SaaS.PERFORMANCE_MANUAL_STEPS;
 const done=steps.filter(s=>p.manual?.[s.id]).length;
 document.getElementById("performanceManualList").innerHTML=steps.map((s,i)=>`<label class="row performance-row ${p.manual?.[s.id]?"":"warn"}">
   <div class="wizard-check">
    <input type="checkbox" class="performanceManualCheck" data-step="${s.id}" ${p.manual?.[s.id]?"checked":""}>
    <div><strong>${i+1}. ${s.title}</strong><small>${s.detail}</small></div>
   </div>
   <span class="status ${p.manual?.[s.id]?"ok":""}">${p.manual?.[s.id]?"OK":"Pendiente"}</span>
 </label>`).join("");

 const result=document.getElementById("performanceResult");
 if(!results.length){
   result.className="launch-result";
   result.innerHTML='<span class="tag">PENDIENTE</span><h2>Ejecuta la prueba local</h2><p>Esto medirá volumen y una referencia básica de renderizado.</p>';
 }else if(fail||renderStatus==="fail"){
   result.className="launch-result blocked";
   result.innerHTML='<span class="tag">REVISAR RENDIMIENTO</span><h2>Hay señales de carga elevada</h2><p>Optimiza antes de ampliar la prueba a más usuarios.</p>';
 }else if(done<steps.length){
   result.className="launch-result";
   result.innerHTML=`<span class="tag">LOCAL OK</span><h2>Sin bloqueos graves detectados</h2><p>Faltan ${steps.length-done} prueba(s) reales de dispositivo, red y concurrencia.</p>`;
 }else{
   result.className="launch-result ready";
   result.innerHTML='<span class="tag">RENDIMIENTO VALIDADO</span><h2>Pruebas locales y manuales completas</h2><p>Esto no sustituye una prueba de carga profesional, pero cubre el recorrido previo.</p>';
 }
};

const oldRenderAll_176=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_176();SaaS.renderPerformance();};
