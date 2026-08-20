SaaS.releases=SaaS.releases||[];
SaaS.launchReviewAt=null;
SaaS.loadReleases=function(){
 try{SaaS.releases=JSON.parse(localStorage.getItem("sambrix_releases"))||[]}catch{SaaS.releases=[]}
 SaaS.launchReviewAt=localStorage.getItem("sambrix_launch_review_at")||null;
};
SaaS.saveReleases=function(){
 localStorage.setItem("sambrix_releases",JSON.stringify(SaaS.releases));
 if(SaaS.launchReviewAt)localStorage.setItem("sambrix_launch_review_at",SaaS.launchReviewAt);
};
SaaS.launchGates=function(){
 const d=SaaS.diagnosticResults||[];
 const diagRan=d.length>0, diagFails=d.filter(x=>x.status==="fail").length;
 const businesses=SaaS.db.businesses||[];
 const delivered=businesses.filter(b=>SaaS.activationStatus?.(b)?.delivered).length;
 const blocked=businesses.filter(b=>SaaS.licenseFor?.(b)?.blocked).length;
 return [
  {name:"Diagnóstico ejecutado",status:diagRan?"pass":"fail",detail:diagRan?"QA disponible.":"Ejecuta Diagnóstico antes del release."},
  {name:"Sin errores críticos",status:diagRan&&diagFails===0?"pass":"fail",detail:diagFails?`${diagFails} error(es) crítico(s).`:"No se detectan errores críticos."},
  {name:"Respaldo disponible",status:(SaaS.backups||[]).length?"pass":"warn",detail:(SaaS.backups||[]).length?`${SaaS.backups.length} respaldo(s).`:"Conviene crear un respaldo antes de publicar."},
  {name:"Negocios entregados",status:businesses.length===0||delivered>0?"pass":"warn",detail:`${delivered}/${businesses.length} marcados como entregados.`},
  {name:"Licencias bloqueadas",status:blocked===0?"pass":"warn",detail:blocked?`${blocked} cuenta(s) bloqueada(s), revisar cobros.`:"Todas las licencias operativas."},
  {name:"Auditoría activa",status:typeof SaaS.audit==="function"?"pass":"fail",detail:"Registro de acciones críticas."},
  {name:"Soporte disponible",status:typeof SaaS.enterSupportMode==="function"?"pass":"warn",detail:"Asistencia remota del SuperAdmin."}
 ];
};
SaaS.reviewLaunch=function(){
 SaaS.runDiagnostics?.();
 SaaS.launchReviewAt=new Date().toISOString();SaaS.saveReleases();SaaS.renderLaunchCenter();
 SaaS.audit?.("SYSTEM","Revisión de lanzamiento ejecutada",{version:"15.4"},"");
};
SaaS.createRelease=function(){
 const gates=SaaS.launchGates(),fails=gates.filter(x=>x.status==="fail");
 if(fails.length)return alert("No se puede crear el release: hay controles críticos pendientes.");
 const suggested=`15.4.${SaaS.releases.length+1}`;
 const version=prompt("Número de versión:",suggested);if(!version)return;
 const notes=prompt("Nota breve de esta versión:","Cierre de plataforma y preparación para pruebas.")||"";
 const r={id:"release_"+SaaS.uid(),version,notes,createdAt:new Date().toISOString(),createdBy:window.FirebaseBridge?.user?.email||"SuperAdmin",checks:gates};
 SaaS.releases.push(r);SaaS.saveReleases();SaaS.audit?.("SYSTEM","Release creado",{version,notes},"");SaaS.renderLaunchCenter();window.App?.toast?.(`Versión ${version} registrada`);
};
SaaS.renderLaunchCenter=function(){
 const box=document.getElementById("launchGateList");if(!box)return;
 const gates=SaaS.launchGates(),pass=gates.filter(x=>x.status==="pass").length,fail=gates.filter(x=>x.status==="fail").length,warn=gates.filter(x=>x.status==="warn").length;
 document.getElementById("launchChecks").textContent=`${pass}/${gates.length}`;
 document.getElementById("launchReleaseCount").textContent=SaaS.releases.length;
 document.getElementById("launchLastReview").textContent=SaaS.launchReviewAt?new Date(SaaS.launchReviewAt).toLocaleDateString():"—";
 box.innerHTML=gates.map(g=>`<div class="row launch-gate ${g.status}"><div class="diag-mark">${g.status==="pass"?"✓":g.status==="warn"?"!":"×"}</div><div><strong>${g.name}</strong><small>${g.detail}</small></div></div>`).join("");
 document.getElementById("releaseHistoryList").innerHTML=[...SaaS.releases].reverse().map(r=>`<div class="row release-row"><div><span class="release-version">v${r.version}</span><small>${new Date(r.createdAt).toLocaleString()} · ${r.createdBy}</small><div class="release-note">${r.notes||"Sin notas"}</div></div><span class="status ok">Registrado</span></div>`).join("")||'<div class="muted">Todavía no hay releases registrados.</div>';
 const dec=document.getElementById("launchDecision");
 if(fail){dec.className="launch-result blocked";dec.innerHTML=`<span class="tag">NO-GO</span><h2>No publicar todavía</h2><p>Hay ${fail} control(es) crítico(s) pendiente(s).</p>`}
 else if(warn){dec.className="launch-result";dec.innerHTML=`<span class="tag">GO CON REVISIÓN</span><h2>Sin bloqueos críticos</h2><p>Quedan ${warn} advertencia(s). Puedes cerrar esas revisiones antes de la prueba final.</p>`}
 else{dec.className="launch-result ready";dec.innerHTML=`<span class="tag">GO</span><h2>Versión preparada</h2><p>Todos los controles de lanzamiento están aprobados.</p>`}
};
const oldRenderAll_154=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_154();SaaS.renderLaunchCenter()};
