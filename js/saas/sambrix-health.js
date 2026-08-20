SaaS.healthSnapshot=function(){
 const latest=SaaS.migrationSnapshots?.[SaaS.migrationSnapshots.length-1];
 const backupOk=latest?SaaS.verifySnapshot?.(latest):false;
 const platform=[
  {name:"Firebase Bridge",ok:!!window.FirebaseBridge,detail:window.FirebaseBridge?"Detectado.":"No disponible."},
  {name:"Autenticación",ok:typeof SaaS.resolveFirebaseSession==="function",detail:"Gestión de sesión."},
  {name:"Multi-tenant",ok:typeof SaaS.switchTenant==="function"&&typeof SaaS.loadTenantState==="function",detail:"Cambio y carga de negocios."},
  {name:"Auditoría",ok:typeof SaaS.audit==="function",detail:"Registro de acciones."},
  {name:"Respaldo local",ok:!!backupOk,detail:backupOk?"Último snapshot íntegro.":"Crea/verifica un snapshot."},
  {name:"Centro de soporte",ok:typeof SaaS.enterSupportMode==="function",detail:"Soporte remoto."}
 ];
 const tenants=[];
 (SaaS.db.businesses||[]).forEach(b=>{
   const a=SaaS.activationStatus?.(b),l=SaaS.licenseFor?.(b);
   if(!a?.ready)tenants.push({name:b.name,status:"warn",detail:`Configuración ${a?.pct||0}% completa.`});
   if(l?.blocked)tenants.push({name:b.name,status:"fail",detail:`Licencia bloqueada: ${l.state||"revisar"}.`});
   if(!b.ownerEmail)tenants.push({name:b.name,status:"warn",detail:"Falta correo del dueño."});
 });
 return {platform,tenants,backupOk};
};
SaaS.renderHealthCenter=function(){
 const pbox=document.getElementById("healthPlatformList");if(!pbox)return;
 const h=SaaS.healthSnapshot(),pass=h.platform.filter(x=>x.ok).length,alerts=h.platform.filter(x=>!x.ok).length+h.tenants.length;
 const score=Math.round(pass/h.platform.length*100);
 document.getElementById("healthScore").textContent=score+"%";
 document.getElementById("healthAlertCount").textContent=alerts;
 document.getElementById("healthBackupState").textContent=h.backupOk?"OK":"REVISAR";
 document.getElementById("healthFirebaseState").textContent=window.FirebaseBridge?"OK":"NO";
 pbox.innerHTML=h.platform.map(x=>`<div class="row health-row ${x.ok?"":"fail"}"><div class="diag-mark">${x.ok?"✓":"×"}</div><div><strong>${x.name}</strong><small>${x.detail}</small></div></div>`).join("");
 document.getElementById("healthTenantList").innerHTML=h.tenants.map(x=>`<div class="row health-row ${x.status}"><div class="diag-mark">${x.status==="fail"?"×":"!"}</div><div><strong>${x.name}</strong><small>${x.detail}</small></div></div>`).join("")||'<div class="row health-row"><div class="diag-mark">✓</div><div><strong>Sin alertas de negocios</strong><small>No se detectaron problemas básicos.</small></div></div>';
 const r=document.getElementById("healthResult");
 if(alerts){r.className="launch-result";r.innerHTML=`<span class="tag">ATENCIÓN</span><h2>${alerts} alerta(s) operativa(s)</h2><p>Revísalas antes de una entrega o publicación.</p>`}
 else{r.className="launch-result ready";r.innerHTML='<span class="tag">SALUDABLE</span><h2>Sin alertas básicas detectadas</h2><p>Los servicios estructurales y negocios pasan esta revisión local.</p>'}
};
SaaS.refreshHealth=function(){SaaS.renderHealthCenter();SaaS.audit?.("SYSTEM","Salud del sistema revisada",{},"")};
const oldRenderAll_162=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_162();SaaS.renderHealthCenter()};
