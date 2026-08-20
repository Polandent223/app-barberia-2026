SaaS.testResults=SaaS.testResults||[];

SaaS.test=function(name,fn,group="core"){
  const started=performance.now();
  try{
    const value=fn();
    const status=value===false?"fail":value==="warn"?"warn":"pass";
    SaaS.testResults.push({name,status,group,detail:status==="pass"?"Correcto":status==="warn"?"Revisión manual recomendada":"No superó la prueba",ms:Math.round(performance.now()-started)});
  }catch(e){
    SaaS.testResults.push({name,status:"fail",group,detail:e?.message||String(e),ms:Math.round(performance.now()-started)});
  }
};

SaaS.runFullTests=function(){
  SaaS.testResults=[];

  SaaS.test("Objeto principal SaaS",()=>!!window.SaaS);
  SaaS.test("Firebase Bridge",()=>!!window.FirebaseBridge);
  SaaS.test("Gestión de sesión",()=>typeof SaaS.resolveFirebaseSession==="function");
  SaaS.test("Roles y permisos",()=>typeof SaaS.currentSecurityRole==="function");
  SaaS.test("Cambio de tenant",()=>typeof SaaS.switchTenant==="function");
  SaaS.test("Carga aislada de tenant",()=>typeof SaaS.loadTenantState==="function");
  SaaS.test("Auditoría",()=>typeof SaaS.audit==="function");
  SaaS.test("Respaldos",()=>typeof SaaS.createBackup==="function");
  SaaS.test("Recuperación",()=>typeof SaaS.restoreBackup==="function");
  SaaS.test("Modo soporte",()=>typeof SaaS.enterSupportMode==="function");
  SaaS.test("Diagnóstico",()=>typeof SaaS.runDiagnostics==="function");
  SaaS.test("Centro de lanzamiento",()=>typeof SaaS.launchGates==="function");

  SaaS.test("Negocios registrados",()=>Array.isArray(SaaS.db?.businesses),"business");
  SaaS.test("Planes SaaS",()=>Array.isArray(SaaS.db?.plans)&&SaaS.db.plans.length>0,"business");
  SaaS.test("Motor de suscripciones",()=>typeof SaaS.billingState==="function","business");
  SaaS.test("Licencias por plan",()=>typeof SaaS.licenseFor==="function","business");
  SaaS.test("Analítica SaaS",()=>typeof SaaS.analyticsSnapshot==="function","business");
  SaaS.test("Activación y entrega",()=>typeof SaaS.activationStatus==="function","business");
  SaaS.test("Notificaciones",()=>typeof SaaS.pushNotification==="function","business");
  SaaS.test("Reservas públicas",()=>typeof SaaS.approvePublicBooking==="function"&&typeof SaaS.rejectPublicBooking==="function","business");
  SaaS.test("Tickets de soporte",()=>typeof SaaS.createSupportTicket==="function","business");
  SaaS.test("Cobros",()=>typeof SaaS.registerBillingPayment==="function","business");

  (SaaS.db.businesses||[]).forEach(b=>{
    SaaS.test(`${b.name}: tenant legible`,()=>{
      const t=SaaS.loadTenantState?.(b.id);
      return t&&typeof t==="object";
    },"business");
    SaaS.test(`${b.name}: aislamiento`,()=>{
      const t=SaaS.loadTenantState?.(b.id)||{};
      const rows=[...(t.clients||[]),...(t.appointments||[]),...(t.sales||[])];
      return !rows.some(x=>x.businessId&&x.businessId!==b.id);
    },"business");
  });

  SaaS.renderTestCenter();
  SaaS.audit?.("SYSTEM","Pruebas integrales ejecutadas",{
    pass:SaaS.testResults.filter(x=>x.status==="pass").length,
    warn:SaaS.testResults.filter(x=>x.status==="warn").length,
    fail:SaaS.testResults.filter(x=>x.status==="fail").length
  },"");
};

SaaS.resetTests=function(){SaaS.testResults=[];SaaS.renderTestCenter()};

SaaS.renderTestCenter=function(){
  const core=document.getElementById("testCoreList");if(!core)return;
  const r=SaaS.testResults||[],pass=r.filter(x=>x.status==="pass").length,warn=r.filter(x=>x.status==="warn").length,fail=r.filter(x=>x.status==="fail").length;
  document.getElementById("testPassCount").textContent=pass;
  document.getElementById("testWarnCount").textContent=warn;
  document.getElementById("testFailCount").textContent=fail;
  document.getElementById("testCoverage").textContent=r.length?Math.round((pass+warn)/r.length*100)+"%":"0%";

  const row=x=>`<div class="row test-row ${x.status}"><div class="diag-mark">${x.status==="pass"?"✓":x.status==="warn"?"!":"×"}</div><div><strong>${x.name}</strong><small>${x.detail}</small><div class="test-time">${x.ms} ms</div></div></div>`;
  core.innerHTML=r.filter(x=>x.group==="core").map(row).join("")||'<div class="muted">Ejecuta las pruebas.</div>';
  document.getElementById("testBusinessList").innerHTML=r.filter(x=>x.group==="business").map(row).join("")||'<div class="muted">Ejecuta las pruebas.</div>';

  const final=document.getElementById("testFinalResult");
  if(!r.length){final.className="launch-result";final.innerHTML="<h2>Pruebas pendientes</h2><p>Ejecuta la batería integral antes de comenzar las pruebas reales.</p>";return}
  if(fail){final.className="launch-result blocked";final.innerHTML=`<span class="tag">CORRECCIÓN NECESARIA</span><h2>${fail} prueba(s) fallida(s)</h2><p>No entregar para prueba real hasta corregir estos puntos.</p>`}
  else if(warn){final.className="launch-result";final.innerHTML=`<span class="tag">REVISIÓN MANUAL</span><h2>Pruebas automáticas aprobadas</h2><p>Quedan ${warn} punto(s) para comprobar manualmente.</p>`}
  else{final.className="launch-result ready";final.innerHTML=`<span class="tag">APROBADO</span><h2>Batería automática completada</h2><p>El siguiente paso será la prueba real de usuario, Firebase y múltiples dispositivos.</p>`}
};

const oldRenderAll_155=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_155();SaaS.renderTestCenter()};
