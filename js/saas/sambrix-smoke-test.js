SaaS.smokeTest=SaaS.smokeTest||{
  auto:[],
  manual:{}
};

SaaS.SMOKE_MANUAL_STEPS=[
  {id:"open_home",title:"Abrir SAMBRIX publicado",detail:"Confirma que la portada carga sin errores visibles."},
  {id:"login_super",title:"Entrar como SuperAdmin",detail:"Debe abrir el panel central con sesión Firebase real."},
  {id:"open_business",title:"Abrir un negocio",detail:"El tenant correcto debe cargar sin mezclar información."},
  {id:"create_appointment",title:"Crear una cita de prueba",detail:"Guárdala y confirma que permanece después de recargar."},
  {id:"public_booking",title:"Enviar una reserva pública",detail:"Debe llegar a la bandeja del negocio correcto."},
  {id:"second_device",title:"Confirmar en otro dispositivo",detail:"Comprueba que la cita o reserva aparece realmente."}
];

SaaS.loadSmokeTest=function(){
  try{
    const saved=JSON.parse(localStorage.getItem("sambrix_smoke_test"))||{};
    SaaS.smokeTest={auto:saved.auto||[],manual:saved.manual||{}};
  }catch{}
};

SaaS.saveSmokeTest=function(){
  localStorage.setItem("sambrix_smoke_test",JSON.stringify(SaaS.smokeTest));
};

SaaS.runSmokeTest=function(){
  const user=window.FirebaseBridge?.user||window.FirebaseBridge?.currentUser||null;
  const businessId=SaaS.getContext?.()?.businessId||"";
  const tenant=businessId?SaaS.loadTenantState?.(businessId):null;
  const candidateFrozen=!!SaaS.releaseCandidate?.frozen;
  const rulesReady=typeof SaaS.firebaseRulesChecks==="function";
  const authGuard=typeof SaaS.applyAuthGuard==="function";

  SaaS.smokeTest.auto=[
    {name:"Aplicación cargada",status:window.App&&window.SaaS?"pass":"fail",detail:window.App&&window.SaaS?"App y SaaS disponibles.":"No se cargó el núcleo."},
    {name:"Candidato congelado",status:candidateFrozen?"pass":"warn",detail:candidateFrozen?SaaS.releaseCandidate.version:"Todavía no se congeló un candidato."},
    {name:"Autenticación protegida",status:authGuard?"pass":"fail",detail:authGuard?"Auth guard disponible.":"No se detecta guard de autenticación."},
    {name:"Firebase Bridge",status:window.FirebaseBridge?"pass":"fail",detail:window.FirebaseBridge?"Bridge cargado.":"FirebaseBridge no disponible."},
    {name:"Usuario autenticado",status:user?"pass":"warn",detail:user?(user.email||user.uid||"Sesión activa"):"No hay usuario autenticado ahora."},
    {name:"Tenant cargado",status:businessId&&tenant?"pass":"warn",detail:businessId?`businessId: ${businessId}`:"No hay negocio activo."},
    {name:"Reglas preparadas",status:rulesReady?"pass":"warn",detail:rulesReady?"Matriz de reglas disponible.":"No se detecta módulo de reglas."}
  ];

  SaaS.saveSmokeTest();
  SaaS.renderSmokeTest();
  SaaS.audit?.("SYSTEM","Smoke test ejecutado",{
    pass:SaaS.smokeTest.auto.filter(x=>x.status==="pass").length,
    warn:SaaS.smokeTest.auto.filter(x=>x.status==="warn").length,
    fail:SaaS.smokeTest.auto.filter(x=>x.status==="fail").length
  },"");
};

SaaS.toggleSmokeManual=function(e){
  const c=e.target;
  if(!c.matches(".smokeManualCheck"))return;
  SaaS.smokeTest.manual[c.dataset.step]=c.checked;
  SaaS.saveSmokeTest();
  SaaS.renderSmokeTest();
};

SaaS.resetSmokeTest=function(){
  if(!confirm("¿Reiniciar la prueba rápida?"))return;
  SaaS.smokeTest={auto:[],manual:{}};
  SaaS.saveSmokeTest();
  SaaS.renderSmokeTest();
};

SaaS.renderSmokeTest=function(){
  const autoBox=document.getElementById("smokeAutoList");
  if(!autoBox)return;

  const auto=SaaS.smokeTest.auto||[];
  const manual=SaaS.SMOKE_MANUAL_STEPS;
  const manualDone=manual.filter(s=>SaaS.smokeTest.manual?.[s.id]).length;
  const user=window.FirebaseBridge?.user||window.FirebaseBridge?.currentUser||null;
  const businessId=SaaS.getContext?.()?.businessId||"";

  document.getElementById("smokeAppState").textContent=(window.App&&window.SaaS)?"OK":"NO";
  document.getElementById("smokeLoginState").textContent=user?"OK":"PENDIENTE";
  document.getElementById("smokeTenantState").textContent=businessId?"OK":"PENDIENTE";
  document.getElementById("smokeChecklistState").textContent=`${manualDone}/${manual.length}`;

  autoBox.innerHTML=auto.length?auto.map(x=>`<div class="row smoke-row ${x.status}">
    <div class="diag-mark">${x.status==="pass"?"✓":x.status==="warn"?"!":"×"}</div>
    <div><strong>${x.name}</strong><small>${x.detail}</small></div>
  </div>`).join(""):'<div class="muted">Ejecuta la revisión después del deploy.</div>';

  document.getElementById("smokeManualList").innerHTML=manual.map((s,i)=>`<label class="row smoke-row ${SaaS.smokeTest.manual?.[s.id]?"":"warn"}">
    <div class="wizard-check">
      <input type="checkbox" class="smokeManualCheck" data-step="${s.id}" ${SaaS.smokeTest.manual?.[s.id]?"checked":""}>
      <div><strong>${i+1}. ${s.title}</strong><small>${s.detail}</small></div>
    </div>
    <span class="status ${SaaS.smokeTest.manual?.[s.id]?"ok":""}">${SaaS.smokeTest.manual?.[s.id]?"OK":"Pendiente"}</span>
  </label>`).join("");

  const fail=auto.filter(x=>x.status==="fail").length;
  const warn=auto.filter(x=>x.status==="warn").length;
  const manualComplete=manualDone===manual.length;
  const result=document.getElementById("smokeResult");

  if(fail){
    result.className="launch-result blocked";
    result.innerHTML=`<span class="tag">FALLO</span><h2>${fail} error(es) básico(s)</h2><p>No continuar con pruebas profundas hasta corregirlos.</p>`;
  }else if(!manualComplete){
    result.className="launch-result";
    result.innerHTML=`<span class="tag">PENDIENTE</span><h2>Automático sin bloqueos críticos</h2><p>Faltan ${manual.length-manualDone} comprobación(es) reales después del deploy.</p>`;
  }else if(warn){
    result.className="launch-result";
    result.innerHTML=`<span class="tag">REVISAR</span><h2>Smoke test manual completo</h2><p>Quedan ${warn} advertencia(s) automáticas para revisar.</p>`;
  }else{
    result.className="launch-result ready";
    result.innerHTML='<span class="tag">APROBADO</span><h2>Smoke test post-deploy superado</h2><p>El candidato puede pasar a la prueba integral real.</p>';
  }
};

const oldRenderAll_171=SaaS.renderAll;
SaaS.renderAll=function(){
  oldRenderAll_171();
  SaaS.renderSmokeTest();
};
