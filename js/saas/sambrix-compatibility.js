SaaS.compatibilityTest=SaaS.compatibilityTest||{auto:[],manual:{}};

SaaS.COMPATIBILITY_MANUAL_STEPS=[
 {id:"phone_portrait",title:"Teléfono vertical",detail:"Probar navegación, formularios, modales y botones sin desbordes horizontales."},
 {id:"phone_landscape",title:"Teléfono horizontal",detail:"Confirmar que tablas y paneles sigan siendo utilizables."},
 {id:"tablet",title:"Tablet",detail:"Revisar menús, grids y formularios en ancho intermedio."},
 {id:"desktop",title:"Computadora",detail:"Probar con navegador de escritorio y resolución normal."},
 {id:"keyboard",title:"Teclado",detail:"Recorrer formularios con Tab y confirmar que los controles puedan enfocarse y usarse."}
];

SaaS.loadCompatibilityTest=function(){
 try{
  const saved=JSON.parse(localStorage.getItem("sambrix_compatibility_test"))||{};
  SaaS.compatibilityTest={auto:saved.auto||[],manual:saved.manual||{}};
 }catch{}
};

SaaS.saveCompatibilityTest=function(){
 localStorage.setItem("sambrix_compatibility_test",JSON.stringify(SaaS.compatibilityTest));
};

SaaS.runCompatibilityTest=function(){
 const viewport=document.querySelector('meta[name="viewport"]');
 const buttons=[...document.querySelectorAll("button")];
 const inputs=[...document.querySelectorAll("input,select,textarea")];
 const unlabeled=inputs.filter(el=>{
   if(el.type==="hidden")return false;
   if(el.getAttribute("aria-label")||el.getAttribute("aria-labelledby"))return false;
   if(el.closest("label"))return false;
   const id=el.id;
   return !(id&&document.querySelector(`label[for="${CSS.escape(id)}"]`));
 });
 const buttonsWithoutName=buttons.filter(b=>!((b.textContent||"").trim()||b.getAttribute("aria-label")||b.title));
 const imgs=[...document.querySelectorAll("img")];
 const imgsMissingAlt=imgs.filter(img=>!img.hasAttribute("alt"));
 const duplicateIds=(()=>{
   const ids=[...document.querySelectorAll("[id]")].map(x=>x.id);
   return [...new Set(ids.filter((id,i)=>ids.indexOf(id)!==i))];
 })();

 const cssResponsive=[...document.styleSheets].some(sheet=>{
   try{return [...(sheet.cssRules||[])].some(r=>String(r.cssText||"").includes("@media"))}catch{return false}
 });

 SaaS.compatibilityTest.auto=[
   {name:"Meta viewport",status:viewport?"pass":"fail",detail:viewport?viewport.getAttribute("content"):"No se encontró meta viewport."},
   {name:"CSS responsive",status:cssResponsive?"pass":"warn",detail:cssResponsive?"Se detectaron reglas @media.":"No se detectaron media queries accesibles."},
   {name:"Campos sin etiqueta",status:unlabeled.length===0?"pass":unlabeled.length>10?"fail":"warn",detail:`${unlabeled.length} control(es) sin etiqueta detectable.`},
   {name:"Botones sin nombre",status:buttonsWithoutName.length===0?"pass":"warn",detail:`${buttonsWithoutName.length} botón(es) sin nombre accesible.`},
   {name:"Imágenes sin alt",status:imgsMissingAlt.length===0?"pass":"warn",detail:`${imgsMissingAlt.length} imagen(es) sin atributo alt.`},
   {name:"IDs duplicados",status:duplicateIds.length===0?"pass":"fail",detail:duplicateIds.length?duplicateIds.join(", "):"Sin IDs duplicados."}
 ];

 SaaS.saveCompatibilityTest();
 SaaS.renderCompatibility();
 SaaS.audit?.("QA","Compatibilidad y accesibilidad revisadas",{
   warnings:SaaS.compatibilityTest.auto.filter(x=>x.status==="warn").length,
   failures:SaaS.compatibilityTest.auto.filter(x=>x.status==="fail").length
 },"");
};

SaaS.toggleCompatibilityManual=function(e){
 const c=e.target;if(!c.matches(".compatibilityManualCheck"))return;
 SaaS.compatibilityTest.manual[c.dataset.step]=c.checked;
 SaaS.saveCompatibilityTest();SaaS.renderCompatibility();
};

SaaS.renderCompatibility=function(){
 const box=document.getElementById("compatibilityAutoList");if(!box)return;
 const auto=SaaS.compatibilityTest.auto||[];
 const steps=SaaS.COMPATIBILITY_MANUAL_STEPS;
 const done=steps.filter(s=>SaaS.compatibilityTest.manual?.[s.id]).length;

 const viewportCheck=auto.find(x=>x.name==="Meta viewport");
 const formCheck=auto.find(x=>x.name==="Campos sin etiqueta");
 const fail=auto.filter(x=>x.status==="fail").length;
 const warn=auto.filter(x=>x.status==="warn").length;

 document.getElementById("compatViewportState").textContent=viewportCheck?.status==="pass"?"OK":viewportCheck?"REVISAR":"—";
 document.getElementById("compatA11yState").textContent=fail?"ERROR":warn?"REVISAR":auto.length?"OK":"—";
 document.getElementById("compatFormState").textContent=formCheck?.status==="pass"?"OK":formCheck?"REVISAR":"—";
 document.getElementById("compatManualState").textContent=`${done}/${steps.length}`;

 box.innerHTML=auto.length?auto.map(x=>`<div class="row compat-row ${x.status}">
   <div class="diag-mark">${x.status==="pass"?"✓":x.status==="warn"?"!":"×"}</div>
   <div><strong>${x.name}</strong><small>${x.detail}</small></div>
 </div>`).join(""):'<div class="muted">Ejecuta la revisión automática.</div>';

 document.getElementById("compatibilityManualList").innerHTML=steps.map((s,i)=>`<label class="row compat-row ${SaaS.compatibilityTest.manual?.[s.id]?"":"warn"}">
   <div class="wizard-check">
    <input type="checkbox" class="compatibilityManualCheck" data-step="${s.id}" ${SaaS.compatibilityTest.manual?.[s.id]?"checked":""}>
    <div><strong>${i+1}. ${s.title}</strong><small>${s.detail}</small></div>
   </div>
   <span class="status ${SaaS.compatibilityTest.manual?.[s.id]?"ok":""}">${SaaS.compatibilityTest.manual?.[s.id]?"OK":"Pendiente"}</span>
 </label>`).join("");

 const result=document.getElementById("compatibilityResult");
 if(fail){
   result.className="launch-result blocked";
   result.innerHTML=`<span class="tag">CORREGIR</span><h2>${fail} problema(s) estructural(es)</h2><p>Hay controles de compatibilidad o accesibilidad que requieren corrección.</p>`;
 }else if(!auto.length){
   result.className="launch-result";
   result.innerHTML='<span class="tag">PENDIENTE</span><h2>Ejecuta la revisión</h2><p>La prueba manual de dispositivos vendrá después.</p>';
 }else if(done<steps.length){
   result.className="launch-result";
   result.innerHTML=`<span class="tag">ESTRUCTURA REVISADA</span><h2>Sin bloqueos críticos automáticos</h2><p>Faltan ${steps.length-done} prueba(s) reales de pantalla/teclado.</p>`;
 }else{
   result.className="launch-result ready";
   result.innerHTML='<span class="tag">VALIDADO</span><h2>Compatibilidad manual completada</h2><p>La estructura automática y los dispositivos fueron revisados.</p>';
 }
};

const oldRenderAll_177=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_177();SaaS.renderCompatibility();};
