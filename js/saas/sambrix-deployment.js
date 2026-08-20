SaaS.deploymentConfig=SaaS.deploymentConfig||{
  projectId:"app-barberia-2026",
  publicDir:".",
  spaRewrite:true
};

SaaS.loadDeploymentConfig=function(){
  try{
    const saved=JSON.parse(localStorage.getItem("sambrix_deployment_config"))||{};
    SaaS.deploymentConfig={...SaaS.deploymentConfig,...saved};
  }catch{}
};

SaaS.saveDeploymentConfig=function(){
  SaaS.deploymentConfig.projectId=(document.getElementById("deploymentProjectId")?.value||"").trim();
  SaaS.deploymentConfig.publicDir=(document.getElementById("deploymentPublicDir")?.value||".").trim()||".";
  SaaS.deploymentConfig.spaRewrite=!!document.getElementById("deploymentSpaRewrite")?.checked;
  localStorage.setItem("sambrix_deployment_config",JSON.stringify(SaaS.deploymentConfig));
  SaaS.audit?.("SYSTEM","Configuración de despliegue actualizada",SaaS.deploymentConfig,"");
  SaaS.renderDeploymentCenter();
  window.App?.toast?.("Configuración de despliegue guardada");
};

SaaS.deploymentChecks=function(){
  const cert=(SaaS.certifications||[]).some(c=>c.productionApproved);
  const staticOk=!!SaaS.staticAudit&&!SaaS.staticAudit.duplicateIds?.length&&!SaaS.staticAudit.missingRefs?.length&&!SaaS.staticAudit.syntaxErrors?.length;
  const project=!!SaaS.deploymentConfig.projectId;
  const prod=SaaS.productionConfig?.environment==="production";
  const https=/^https:\/\//i.test(SaaS.productionConfig?.publicUrl||"");
  const snapshot=(SaaS.migrationSnapshots||[]).length>0;
  return [
    {name:"Auditoría técnica",status:staticOk?"pass":"fail",detail:staticOk?"Sin bloqueos estáticos.":"Revisa Auditoría final."},
    {name:"Certificación de producción",status:cert?"pass":"warn",detail:cert?"Certificación disponible.":"Todavía no existe certificación final."},
    {name:"Project ID Firebase",status:project?"pass":"warn",detail:project?SaaS.deploymentConfig.projectId:"Falta indicar proyecto Firebase."},
    {name:"Entorno Producción",status:prod?"pass":"warn",detail:prod?"Entorno configurado como production.":"SAMBRIX sigue en prueba/staging."},
    {name:"URL HTTPS",status:https?"pass":"warn",detail:https?SaaS.productionConfig.publicUrl:"Falta URL HTTPS de producción."},
    {name:"Snapshot previo",status:snapshot?"pass":"warn",detail:snapshot?"Existe punto de recuperación local.":"Conviene crear snapshot antes de desplegar."}
  ];
};

SaaS.renderDeploymentCenter=function(){
  const box=document.getElementById("deploymentChecks");if(!box)return;
  document.getElementById("deploymentProjectId").value=SaaS.deploymentConfig.projectId||"";
  document.getElementById("deploymentPublicDir").value=SaaS.deploymentConfig.publicDir||".";
  document.getElementById("deploymentSpaRewrite").checked=SaaS.deploymentConfig.spaRewrite!==false;

  const checks=SaaS.deploymentChecks();
  const pass=checks.filter(x=>x.status==="pass").length;
  const fail=checks.filter(x=>x.status==="fail").length;
  const warn=checks.filter(x=>x.status==="warn").length;

  document.getElementById("deployFirebaseState").textContent=SaaS.deploymentConfig.projectId?"CONFIG":"PENDIENTE";
  document.getElementById("deployCheckScore").textContent=`${pass}/${checks.length}`;

  box.innerHTML=checks.map(c=>`<div class="row deploy-check ${c.status}">
    <div class="diag-mark">${c.status==="pass"?"✓":c.status==="warn"?"!":"×"}</div>
    <div><strong>${c.name}</strong><small>${c.detail}</small></div>
  </div>`).join("");

  const r=document.getElementById("deploymentResult");
  if(fail){
    r.className="launch-result blocked";
    r.innerHTML=`<span class="tag">NO DESPLEGAR</span><h2>${fail} bloqueo(s) técnico(s)</h2><p>Corrige antes de publicar.</p>`;
  }else if(warn){
    r.className="launch-result";
    r.innerHTML=`<span class="tag">PREPARACIÓN</span><h2>Faltan ${warn} control(es)</h2><p>La estructura de Hosting está lista, pero SAMBRIX todavía no debe publicarse como producción.</p>`;
  }else{
    r.className="launch-result ready";
    r.innerHTML='<span class="tag">LISTO PARA DEPLOY</span><h2>Controles previos aprobados</h2><p>La publicación real todavía debe ejecutarse con Firebase CLI y validarse después del deploy.</p>';
  }
};

SaaS.refreshDeployment=function(){
  SaaS.renderDeploymentCenter();
  SaaS.audit?.("SYSTEM","Checklist de despliegue revisado",{projectId:SaaS.deploymentConfig.projectId},"");
};

const oldRenderAll_169=SaaS.renderAll;
SaaS.renderAll=function(){
  oldRenderAll_169();
  SaaS.renderDeploymentCenter();
};
