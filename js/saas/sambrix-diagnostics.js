SaaS.diagnosticResults=[];

SaaS.runDiagnostics=function(){
 const tests=[];
 const add=(name,status,detail,group="platform")=>tests.push({name,status,detail,group});

 add("Firebase configurado",window.FirebaseBridge!==undefined?"pass":"fail",window.FirebaseBridge!==undefined?"Bridge Firebase detectado.":"No se detectó FirebaseBridge.");
 add("Autenticación por rol",typeof SaaS.resolveFirebaseSession==="function"?"pass":"fail","Resolución de sesión y roles.");
 add("Aislamiento multi-negocio",typeof SaaS.switchTenant==="function"&&typeof SaaS.loadTenantState==="function"?"pass":"fail","Tenant manager disponible.");
 add("Reglas de seguridad",typeof SaaS.can==="function"||typeof SaaS.currentSecurityRole==="function"?"pass":"warn","Control de permisos cargado.");
 add("Reservas públicas",!!window.NexoPublicCloud&&typeof SaaS.approvePublicBooking==="function"?"pass":"warn","SAMBRIX Client y bandeja de reservas.");
 add("Suscripciones",typeof SaaS.billingState==="function"?"pass":"fail","Motor de cobros y estados.");
 add("Licencias",typeof SaaS.licenseFor==="function"?"pass":"fail","Límites por plan.");
 add("Auditoría",typeof SaaS.audit==="function"?"pass":"fail","Registro de acciones críticas.");
 add("Respaldos",typeof SaaS.createBackup==="function"?"pass":"warn","Respaldo y restauración disponibles.");
 add("Soporte remoto",typeof SaaS.enterSupportMode==="function"?"pass":"warn","Modo soporte disponible.");
 add("Notificaciones",typeof SaaS.generateNotifications==="function"?"pass":"warn","Centro de avisos disponible.");

 (SaaS.db.businesses||[]).forEach(b=>{
   const a=SaaS.activationStatus?.(b);
   const lic=SaaS.licenseFor?.(b);
   add(b.name,a?.ready?"pass":"warn",a?.ready?"Configuración completa.":`Preparación ${a?.pct||0}%.`,"business");
   if(lic?.blocked)add(`${b.name} · licencia`,"warn",`Estado: ${lic.state}`,"business");
   const tenant=SaaS.loadTenantState?.(b.id)||{};
   const foreign=[...(tenant.clients||[]),...(tenant.appointments||[]),...(tenant.sales||[])].filter(x=>x.businessId&&x.businessId!==b.id);
   add(`${b.name} · aislamiento`,foreign.length?"fail":"pass",foreign.length?`${foreign.length} registro(s) apuntan a otro negocio.`:"Sin cruces detectados.","business");
 });

 SaaS.diagnosticResults=tests;SaaS.renderDiagnostics();
 SaaS.audit?.("SYSTEM","Diagnóstico de pre-lanzamiento ejecutado",{pass:tests.filter(x=>x.status==="pass").length,warn:tests.filter(x=>x.status==="warn").length,fail:tests.filter(x=>x.status==="fail").length},"");
};

SaaS.renderDiagnostics=function(){
 const tests=SaaS.diagnosticResults||[];
 const pass=tests.filter(x=>x.status==="pass").length,warn=tests.filter(x=>x.status==="warn").length,fail=tests.filter(x=>x.status==="fail").length,total=tests.length;
 const score=total?Math.round((pass+warn*.5)/total*100):0;
 document.getElementById("diagPassCount").textContent=pass;
 document.getElementById("diagWarnCount").textContent=warn;
 document.getElementById("diagFailCount").textContent=fail;
 document.getElementById("diagScore").textContent=score+"%";
 const row=t=>`<div class="row diag-row ${t.status}"><div class="diag-mark">${t.status==="pass"?"✓":t.status==="warn"?"!":"×"}</div><div><strong>${t.name}</strong><small>${t.detail}</small></div></div>`;
 document.getElementById("diagPlatformList").innerHTML=tests.filter(x=>x.group==="platform").map(row).join("")||'<div class="muted">Ejecuta el diagnóstico.</div>';
 document.getElementById("diagBusinessList").innerHTML=tests.filter(x=>x.group==="business").map(row).join("")||'<div class="muted">Ejecuta el diagnóstico.</div>';
 const r=document.getElementById("diagLaunchResult");
 if(!tests.length){r.className="launch-result";r.innerHTML="<h2>Diagnóstico pendiente</h2><p>Ejecuta la revisión antes de publicar.</p>";return}
 if(fail){r.className="launch-result blocked";r.innerHTML=`<span class="tag">NO PUBLICAR TODAVÍA</span><h2>${fail} error(es) crítico(s)</h2><p>Corrige los errores antes de pasar SAMBRIX a producción.</p>`}
 else if(warn){r.className="launch-result";r.innerHTML=`<span class="tag">CASI LISTO</span><h2>${score}% preparado</h2><p>No hay errores críticos, pero quedan ${warn} advertencia(s) por revisar.</p>`}
 else{r.className="launch-result ready";r.innerHTML=`<span class="tag">LISTO</span><h2>SAMBRIX preparado para lanzamiento</h2><p>Todos los controles automáticos fueron aprobados.</p>`}
};
