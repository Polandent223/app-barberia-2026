SaaS.recoveryPlan=SaaS.recoveryPlan||{prepared:false,preparedAt:null,manual:{}};

SaaS.RECOVERY_STEPS=[
 {id:"freeze",title:"Detener cambios",detail:"No seguir publicando mientras se investiga el fallo."},
 {id:"identify",title:"Identificar versión afectada",detail:"Registrar candidato, hora y síntoma exacto."},
 {id:"backup",title:"Confirmar respaldo",detail:"Verificar snapshot/exportación antes de tocar datos."},
 {id:"rollback",title:"Restaurar versión estable",detail:"Volver al último candidato conocido como estable mediante el mecanismo de Hosting/Git."},
 {id:"verify",title:"Smoke test después del rollback",detail:"Login, tenant, cita, cliente, reserva pública y aislamiento."},
 {id:"document",title:"Registrar incidente",detail:"Guardar causa, solución y prevención para que no se repita."}
];

SaaS.RECOVERY_MANUAL=[
 {id:"hosting",title:"Rollback de Hosting comprobado",detail:"Confirmar en el entorno real que sabemos restaurar una versión anterior."},
 {id:"database",title:"Restauración de datos comprobada",detail:"Confirmar procedimiento de recuperación de datos sin mezclar tenants."},
 {id:"second_device",title:"Segundo dispositivo verificado",detail:"Después del rollback ambos dispositivos deben mostrar la misma versión."},
 {id:"permissions",title:"Permisos después de restaurar",detail:"SuperAdmin, dueño y personal conservan solo sus accesos permitidos."}
];

SaaS.loadRecoveryPlan=function(){
 try{
  const s=JSON.parse(localStorage.getItem("sambrix_recovery_plan"))||{};
  SaaS.recoveryPlan={...SaaS.recoveryPlan,...s,manual:s.manual||{}};
 }catch{}
};
SaaS.saveRecoveryPlan=function(){localStorage.setItem("sambrix_recovery_plan",JSON.stringify(SaaS.recoveryPlan));};

SaaS.prepareRecoveryPlan=function(){
 SaaS.recoveryPlan.prepared=true;
 SaaS.recoveryPlan.preparedAt=new Date().toISOString();
 SaaS.recoveryPlan.version=SaaS.releaseCandidate?.version||"sin-version";
 SaaS.saveRecoveryPlan();
 SaaS.audit?.("SYSTEM","Plan de recuperación preparado",{version:SaaS.recoveryPlan.version},"");
 SaaS.renderRecoveryPlan();
};

SaaS.toggleRecoveryManual=function(e){
 const c=e.target;if(!c.matches(".recoveryManualCheck"))return;
 SaaS.recoveryPlan.manual[c.dataset.step]=c.checked;
 SaaS.saveRecoveryPlan();SaaS.renderRecoveryPlan();
};

SaaS.renderRecoveryPlan=function(){
 const box=document.getElementById("recoverySteps");if(!box)return;
 const snapshots=SaaS.migrationSnapshots||[];
 const hasBackup=snapshots.length>0;
 const prepared=!!SaaS.recoveryPlan.prepared;
 const steps=SaaS.RECOVERY_STEPS;
 const manual=SaaS.RECOVERY_MANUAL;
 const done=manual.filter(x=>SaaS.recoveryPlan.manual?.[x.id]).length;

 document.getElementById("recoveryVersion").textContent=SaaS.releaseCandidate?.version||"—";
 document.getElementById("recoveryBackupState").textContent=hasBackup?"DISPONIBLE":"PENDIENTE";
 document.getElementById("recoveryRollbackState").textContent=prepared?"PREPARADO":"PENDIENTE";
 document.getElementById("recoveryState").textContent=!hasBackup?"REVISAR":prepared?"LISTO":"PENDIENTE";

 box.innerHTML=steps.map((x,i)=>`<div class="row recovery-row ${(!hasBackup&&x.id==="backup")?"warn":""}">
   <div class="diag-mark">${i+1}</div><div><strong>${x.title}</strong><small>${x.detail}</small></div>
 </div>`).join("");

 document.getElementById("recoveryManual").innerHTML=manual.map((x,i)=>`<label class="row recovery-row ${SaaS.recoveryPlan.manual?.[x.id]?"":"warn"}">
   <div class="wizard-check"><input type="checkbox" class="recoveryManualCheck" data-step="${x.id}" ${SaaS.recoveryPlan.manual?.[x.id]?"checked":""}>
   <div><strong>${i+1}. ${x.title}</strong><small>${x.detail}</small></div></div>
   <span class="status ${SaaS.recoveryPlan.manual?.[x.id]?"ok":""}">${SaaS.recoveryPlan.manual?.[x.id]?"OK":"Pendiente"}</span>
 </label>`).join("");

 const result=document.getElementById("recoveryResult");
 if(!hasBackup){
  result.className="launch-result blocked";
  result.innerHTML='<span class="tag">NO LISTO</span><h2>Falta respaldo verificable</h2><p>No debemos ensayar una restauración de datos sin un snapshot/exportación confirmado.</p>';
 }else if(!prepared||done<manual.length){
  result.className="launch-result";
  result.innerHTML=`<span class="tag">PREPARACIÓN</span><h2>Plan definido</h2><p>Faltan ${manual.length-done} prueba(s) reales de recuperación.</p>`;
 }else{
  result.className="launch-result ready";
  result.innerHTML='<span class="tag">RECUPERACIÓN VALIDADA</span><h2>Plan y simulacro completados</h2><p>Existe un procedimiento documentado para volver a una versión estable y verificarla.</p>';
 }
};

const oldRenderAll_184=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_184();SaaS.renderRecoveryPlan();};
