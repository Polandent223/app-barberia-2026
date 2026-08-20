SaaS.continuityState=function(){
 const latest=SaaS.migrationSnapshots?.[SaaS.migrationSnapshots.length-1];
 const snapshotOk=latest?!!SaaS.verifySnapshot?.(latest):false;
 const firebase=!!window.FirebaseBridge;
 const audit=typeof SaaS.audit==="function";
 const incidents=Array.isArray(SaaS.incidents);
 const support=typeof SaaS.enterSupportMode==="function";
 const critical=(SaaS.incidents||[]).filter(i=>i.priority==="Crítica"&&i.status!=="Resuelto").length;
 const checks=[
  {name:"Snapshot de configuración",ok:snapshotOk,detail:snapshotOk?"Existe un snapshot íntegro.":"Crea un snapshot actualizado."},
  {name:"Firebase Bridge",ok:firebase,detail:firebase?"Bridge disponible.":"No se detecta conexión Firebase."},
  {name:"Auditoría",ok:audit,detail:audit?"Registro operativo disponible.":"Auditoría no disponible."},
  {name:"Centro de incidentes",ok:incidents,detail:"Seguimiento de fallas disponible."},
  {name:"Modo soporte",ok:support,detail:support?"Puedes entrar a revisar un tenant.":"Modo soporte no disponible."}
 ];
 return {checks,critical,snapshotOk,firebase};
};
SaaS.renderContinuity=function(){
 const box=document.getElementById("continuityPlanList");if(!box)return;
 const s=SaaS.continuityState(),ok=s.checks.filter(x=>x.ok).length,pct=Math.round(ok/s.checks.length*100);
 document.getElementById("continuitySnapshot").textContent=s.snapshotOk?"OK":"NO";
 document.getElementById("continuityCritical").textContent=s.critical;
 document.getElementById("continuityFirebase").textContent=s.firebase?"OK":"NO";
 document.getElementById("continuityScore").textContent=pct+"%";
 box.innerHTML=s.checks.map(x=>`<div class="row continuity-row ${x.ok?"":"pending"}"><div class="diag-mark">${x.ok?"✓":"!"}</div><div><strong>${x.name}</strong><small>${x.detail}</small></div></div>`).join("");
 const r=document.getElementById("continuityResult");
 if(!s.snapshotOk||!s.firebase){r.className="launch-result";r.innerHTML='<span class="tag">REVISAR</span><h2>Plan de recuperación incompleto</h2><p>Antes de producción necesitamos respaldo válido y conexión Firebase comprobada.</p>'}
 else if(s.critical){r.className="launch-result blocked";r.innerHTML=`<span class="tag">INCIDENTE ACTIVO</span><h2>${s.critical} incidente(s) crítico(s)</h2><p>Resuélvelos antes de una publicación o migración.</p>`}
 else{r.className="launch-result ready";r.innerHTML='<span class="tag">PREPARADO</span><h2>Controles básicos de continuidad disponibles</h2><p>El plan local está preparado; el backup real de Firebase debe verificarse por separado.</p>'}
};
SaaS.refreshContinuity=function(){SaaS.renderContinuity();SaaS.audit?.("SYSTEM","Plan de continuidad revisado",{},"")};
const oldRenderAll_164=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_164();SaaS.renderContinuity()};
