SaaS.finalReadinessSnapshot=function(){
  const staticOk=!!SaaS.staticAudit &&
    !(SaaS.staticAudit.duplicateIds||[]).length &&
    !(SaaS.staticAudit.missingRefs||[]).length &&
    !(SaaS.staticAudit.syntaxErrors||[]).length;

  const authReady=typeof SaaS.applyAuthGuard==="function" && SaaS.authSecurity?.requireFirebase!==false;
  const rulesReady=typeof SaaS.firebaseRulesChecks==="function";
  const deploymentReady=typeof SaaS.deploymentChecks==="function";
  const runtimeClean=(SaaS.runtimeDiagnostics?.errors||[]).length===0;
  const criticalBugs=(SaaS.bugReports||[]).filter(r=>r.status!=="Resuelto"&&r.severity==="Crítica").length;
  const criticalIncidents=(SaaS.incidents||[]).filter(r=>r.status!=="Resuelto"&&r.priority==="Crítica").length;
  const snapshotOk=!!(SaaS.migrationSnapshots||[]).length;
  const privacyReady=!!SaaS.privacySystem?.policy;
  const candidateFrozen=!!SaaS.releaseCandidate?.frozen;

  const syncDone=(SaaS.SYNC_MANUAL_STEPS||[]).length>0 &&
    SaaS.SYNC_MANUAL_STEPS.every(s=>SaaS.syncTest?.manual?.[s.id]);

  const integrityDone=(SaaS.INTEGRITY_MANUAL_STEPS||[]).length>0 &&
    SaaS.INTEGRITY_MANUAL_STEPS.every(s=>SaaS.dataIntegrity?.manual?.[s.id]);

  const performanceDone=(SaaS.PERFORMANCE_MANUAL_STEPS||[]).length>0 &&
    SaaS.PERFORMANCE_MANUAL_STEPS.every(s=>SaaS.performanceTest?.manual?.[s.id]);

  const compatibilityDone=(SaaS.COMPATIBILITY_MANUAL_STEPS||[]).length>0 &&
    SaaS.COMPATIBILITY_MANUAL_STEPS.every(s=>SaaS.compatibilityTest?.manual?.[s.id]);

  const validationDone=(SaaS.VALIDATION_MANUAL_STEPS||[]).length>0 &&
    SaaS.VALIDATION_MANUAL_STEPS.every(s=>SaaS.validationSecurity?.manual?.[s.id]);

  const smokeDone=(SaaS.SMOKE_MANUAL_STEPS||[]).length>0 &&
    SaaS.SMOKE_MANUAL_STEPS.every(s=>SaaS.smokeTest?.manual?.[s.id]);

  const finalWizardDone=(SaaS.FINAL_WIZARD_STEPS||[]).length>0 &&
    SaaS.FINAL_WIZARD_STEPS.every(s=>SaaS.finalWizard?.[s.id]);

  const platform=[
    {name:"Auditoría técnica",status:staticOk?"pass":"fail",detail:staticOk?"Sin errores estáticos conocidos.":"Hay problemas de estructura por corregir."},
    {name:"Autenticación protegida",status:authReady?"pass":"fail",detail:authReady?"Firebase Auth exigido para áreas protegidas.":"El guard de autenticación no está listo."},
    {name:"Reglas Firebase preparadas",status:rulesReady?"pass":"warn",detail:rulesReady?"Plantillas/matriz disponibles; despliegue real aún debe probarse.":"No se detecta módulo de reglas."},
    {name:"Candidato congelado",status:candidateFrozen?"pass":"warn",detail:candidateFrozen?SaaS.releaseCandidate.version:"Todavía no se congeló un candidato."},
    {name:"Snapshot previo",status:snapshotOk?"pass":"warn",detail:snapshotOk?"Existe respaldo local de configuración.":"Conviene crear snapshot antes de probar/publicar."},
    {name:"Errores runtime",status:runtimeClean?"pass":"warn",detail:runtimeClean?"Sin errores registrados en la sesión.":`${(SaaS.runtimeDiagnostics?.errors||[]).length} error(es) runtime registrados.`},
    {name:"Errores QA críticos",status:criticalBugs===0?"pass":"fail",detail:criticalBugs?`${criticalBugs} error(es) crítico(s) abiertos.`:"Sin errores QA críticos abiertos."},
    {name:"Incidentes críticos",status:criticalIncidents===0?"pass":"fail",detail:criticalIncidents?`${criticalIncidents} incidente(s) crítico(s) activos.`:"Sin incidentes críticos activos."},
    {name:"Privacidad",status:privacyReady?"pass":"warn",detail:privacyReady?"Política y solicitudes disponibles.":"Centro de privacidad no cargado."},
    {name:"Despliegue",status:deploymentReady?"pass":"warn",detail:deploymentReady?"Checklist de Hosting disponible.":"Centro de despliegue no disponible."}
  ];

  const manual=[
    {name:"Smoke test post-deploy",status:smokeDone?"pass":"warn",detail:smokeDone?"Completado.":"Pendiente hasta publicar y probar."},
    {name:"Sincronización entre dispositivos",status:syncDone?"pass":"warn",detail:syncDone?"Cinco escenarios confirmados.":"Pendiente de prueba real."},
    {name:"Persistencia de datos",status:integrityDone?"pass":"warn",detail:integrityDone?"Persistencia manual confirmada.":"Pendiente de recarga/login/segundo dispositivo."},
    {name:"Rendimiento",status:performanceDone?"pass":"warn",detail:performanceDone?"Pruebas manuales completadas.":"Pendiente de dispositivo/red/concurrencia."},
    {name:"Compatibilidad",status:compatibilityDone?"pass":"warn",detail:compatibilityDone?"Dispositivos y teclado revisados.":"Pendiente de pruebas reales."},
    {name:"Validación de entradas",status:validationDone?"pass":"warn",detail:validationDone?"Escenarios inválidos comprobados.":"Pendiente de pruebas manuales."},
    {name:"Recorrido final",status:finalWizardDone?"pass":"warn",detail:finalWizardDone?"Checklist final completo.":"Pendiente de aceptación manual."}
  ];

  return {platform,manual};
};

SaaS.renderFinalReadiness=function(){
  const platformBox=document.getElementById("readinessPlatformList");if(!platformBox)return;
  const snap=SaaS.finalReadinessSnapshot();
  const all=[...snap.platform,...snap.manual];
  const pass=all.filter(x=>x.status==="pass").length;
  const warn=all.filter(x=>x.status==="warn").length;
  const fail=all.filter(x=>x.status==="fail").length;
  const score=Math.round((pass+warn*.45)/all.length*100);

  document.getElementById("readinessScore").textContent=score+"%";
  document.getElementById("readinessPassCount").textContent=pass;
  document.getElementById("readinessPendingCount").textContent=warn;
  document.getElementById("readinessFailCount").textContent=fail;

  const row=x=>`<div class="row readiness-row ${x.status}">
    <div class="diag-mark">${x.status==="pass"?"✓":x.status==="warn"?"!":"×"}</div>
    <div><strong>${x.name}</strong><small>${x.detail}</small></div>
  </div>`;

  platformBox.innerHTML=snap.platform.map(row).join("");
  document.getElementById("readinessManualList").innerHTML=snap.manual.map(row).join("");

  const result=document.getElementById("readinessResult");
  if(fail){
    result.className="launch-result blocked";
    result.innerHTML=`<span class="tag">NO LISTO</span><h2>${fail} bloqueo(s) crítico(s)</h2><p>No debemos comenzar la validación final hasta corregirlos.</p>`;
  }else if(warn){
    result.className="launch-result";
    result.innerHTML=`<span class="tag">LISTO PARA PRUEBAS REALES</span><h2>${score}% preparado</h2><p>No hay bloqueos críticos. Quedan ${warn} controles que solo pueden completarse con Firebase, Hosting y dispositivos reales.</p>`;
  }else{
    result.className="launch-result ready";
    result.innerHTML='<span class="tag">TODO APROBADO</span><h2>SAMBRIX completó todos los controles</h2><p>La aplicación puede pasar a certificación y producción según el flujo definido.</p>';
  }
};

SaaS.refreshFinalReadiness=function(){
  SaaS.renderFinalReadiness();
  SaaS.audit?.("SYSTEM","Preparación final recalculada",{},"");
};

const oldRenderAll_180=SaaS.renderAll;
SaaS.renderAll=function(){
  oldRenderAll_180();
  SaaS.renderFinalReadiness();
};
