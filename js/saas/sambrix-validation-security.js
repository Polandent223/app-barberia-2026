SaaS.validationSecurity=SaaS.validationSecurity||{auto:[],manual:{}};

SaaS.VALIDATION_MANUAL_STEPS=[
 {id:"empty_required",title:"Campos obligatorios vacíos",detail:"Intentar guardar cliente, cita y negocio sin datos críticos; SAMBRIX debe impedirlo."},
 {id:"invalid_email",title:"Correo inválido",detail:"Probar un correo mal formado y confirmar que no se guarde como válido."},
 {id:"invalid_phone",title:"Teléfono extraño",detail:"Probar letras/símbolos excesivos y revisar cómo responde el formulario."},
 {id:"long_text",title:"Texto excesivamente largo",detail:"Pegar contenido muy largo en notas/nombres y comprobar que la interfaz no se rompa."},
 {id:"html_script",title:"HTML / script como texto",detail:"Escribir etiquetas como <script> en un campo y confirmar que se muestren como texto, no se ejecuten."}
];

SaaS.loadValidationSecurity=function(){
 try{
  const saved=JSON.parse(localStorage.getItem("sambrix_validation_security"))||{};
  SaaS.validationSecurity={auto:saved.auto||[],manual:saved.manual||{}};
 }catch{}
};

SaaS.saveValidationSecurity=function(){
 localStorage.setItem("sambrix_validation_security",JSON.stringify(SaaS.validationSecurity));
};

SaaS.runValidationSecurity=function(){
 const forms=[...document.querySelectorAll("form")];
 const inputs=[...document.querySelectorAll("input,textarea,select")].filter(x=>x.type!=="hidden");
 const emailInputs=inputs.filter(x=>x.type==="email"||/email|correo/i.test(`${x.id} ${x.name||""} ${x.placeholder||""}`));
 const phoneInputs=inputs.filter(x=>/phone|telefono|teléfono/i.test(`${x.id} ${x.name||""} ${x.placeholder||""}`));
 const textInputs=inputs.filter(x=>["text","email","tel","search","url",""].includes(x.type||"")||x.tagName==="TEXTAREA");

 const noMax=textInputs.filter(x=>x.tagName==="TEXTAREA"||x.type==="text").filter(x=>!x.maxLength||x.maxLength<0);
 const noAutocomplete=emailInputs.filter(x=>!x.autocomplete);
 const dangerousInline=[...document.querySelectorAll("[onclick],[onchange],[oninput]")].length;
 const passwordInputs=inputs.filter(x=>x.type==="password");
 const passwordNoAutocomplete=passwordInputs.filter(x=>!x.autocomplete);

 SaaS.validationSecurity.auto=[
   {name:"Formularios detectados",status:"pass",detail:`${forms.length} formulario(s) y ${inputs.length} control(es) revisados.`},
   {name:"Campos de texto sin maxLength",status:noMax.length>20?"warn":"pass",detail:`${noMax.length} campo(s) sin límite explícito.`},
   {name:"Campos email",status:emailInputs.length?"pass":"warn",detail:`${emailInputs.length} campo(s) de correo detectados.`},
   {name:"Campos email sin autocomplete",status:noAutocomplete.length>5?"warn":"pass",detail:`${noAutocomplete.length} campo(s) sin autocomplete definido.`},
   {name:"Campos teléfono",status:phoneInputs.length?"pass":"warn",detail:`${phoneInputs.length} campo(s) relacionados con teléfono.`},
   {name:"Contraseñas",status:passwordNoAutocomplete.length?"warn":"pass",detail:passwordNoAutocomplete.length?`${passwordNoAutocomplete.length} campo(s) password sin autocomplete.`:"Sin advertencias básicas detectadas."},
   {name:"Handlers inline",status:dangerousInline>100?"warn":"pass",detail:`${dangerousInline} handler(s) inline encontrados. No es un fallo por sí solo, pero conviene minimizarlo.`}
 ];

 SaaS.saveValidationSecurity();
 SaaS.renderValidationSecurity();
 SaaS.audit?.("QA","Validación de entradas revisada",{
   warnings:SaaS.validationSecurity.auto.filter(x=>x.status==="warn").length
 },"");
};

SaaS.toggleValidationManual=function(e){
 const c=e.target;
 if(!c.matches(".validationManualCheck"))return;
 SaaS.validationSecurity.manual[c.dataset.step]=c.checked;
 SaaS.saveValidationSecurity();
 SaaS.renderValidationSecurity();
};

SaaS.renderValidationSecurity=function(){
 const autoBox=document.getElementById("validationAutoList");
 if(!autoBox)return;

 const auto=SaaS.validationSecurity.auto||[];
 const steps=SaaS.VALIDATION_MANUAL_STEPS;
 const done=steps.filter(s=>SaaS.validationSecurity.manual?.[s.id]).length;
 const weak=auto.filter(x=>x.status==="warn").length;
 const fail=auto.filter(x=>x.status==="fail").length;

 document.getElementById("validationFormCount").textContent=document.querySelectorAll("form").length;
 document.getElementById("validationWeakCount").textContent=weak;
 document.getElementById("validationRiskCount").textContent=fail;
 document.getElementById("validationState").textContent=fail?"ERROR":weak?"REVISAR":auto.length?"OK":"—";

 autoBox.innerHTML=auto.length?auto.map(x=>`<div class="row validation-row ${x.status}">
   <div class="diag-mark">${x.status==="pass"?"✓":x.status==="warn"?"!":"×"}</div>
   <div><strong>${x.name}</strong><small>${x.detail}</small></div>
 </div>`).join(""):'<div class="muted">Ejecuta la revisión automática.</div>';

 document.getElementById("validationManualList").innerHTML=steps.map((s,i)=>`<label class="row validation-row ${SaaS.validationSecurity.manual?.[s.id]?"":"warn"}">
   <div class="wizard-check">
    <input type="checkbox" class="validationManualCheck" data-step="${s.id}" ${SaaS.validationSecurity.manual?.[s.id]?"checked":""}>
    <div><strong>${i+1}. ${s.title}</strong><small>${s.detail}</small></div>
   </div>
   <span class="status ${SaaS.validationSecurity.manual?.[s.id]?"ok":""}">${SaaS.validationSecurity.manual?.[s.id]?"OK":"Pendiente"}</span>
 </label>`).join("");

 const result=document.getElementById("validationSecurityResult");
 if(fail){
   result.className="launch-result blocked";
   result.innerHTML=`<span class="tag">CORREGIR</span><h2>${fail} problema(s) crítico(s)</h2><p>No aprobar el candidato hasta resolverlos.</p>`;
 }else if(!auto.length){
   result.className="launch-result";
   result.innerHTML='<span class="tag">PENDIENTE</span><h2>Ejecuta la revisión</h2><p>Después se completan las pruebas manuales de entradas inválidas.</p>';
 }else if(done<steps.length){
   result.className="launch-result";
   result.innerHTML=`<span class="tag">BASE REVISADA</span><h2>Sin bloqueos críticos automáticos</h2><p>Faltan ${steps.length-done} prueba(s) manual(es) de validación.</p>`;
 }else{
   result.className="launch-result ready";
   result.innerHTML='<span class="tag">VALIDADO</span><h2>Entradas y comportamiento básico revisados</h2><p>Los escenarios manuales fueron confirmados durante la prueba.</p>';
 }
};

const oldRenderAll_178=SaaS.renderAll;
SaaS.renderAll=function(){
 oldRenderAll_178();
 SaaS.renderValidationSecurity();
};
