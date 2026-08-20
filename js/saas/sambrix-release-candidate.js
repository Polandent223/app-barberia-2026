SaaS.releaseCandidate=SaaS.releaseCandidate||{
  version:"17.0-RC1",
  notes:"",
  frozen:false,
  frozenAt:null,
  hash:"",
  projectId:"app-barberia-2026"
};

SaaS.loadReleaseCandidate=function(){
  try{
    const saved=JSON.parse(localStorage.getItem("sambrix_release_candidate"))||{};
    SaaS.releaseCandidate={...SaaS.releaseCandidate,...saved};
  }catch{}
};

SaaS.saveReleaseCandidate=function(){
  localStorage.setItem("sambrix_release_candidate",JSON.stringify(SaaS.releaseCandidate));
};

SaaS.candidateChecks=function(){
  const staticOk=!!SaaS.staticAudit&&!SaaS.staticAudit.duplicateIds?.length&&!SaaS.staticAudit.missingRefs?.length&&!SaaS.staticAudit.syntaxErrors?.length;
  const auth=typeof SaaS.applyAuthGuard==="function";
  const rules=typeof SaaS.firebaseRulesChecks==="function";
  const deploy=typeof SaaS.deploymentChecks==="function";
  const tests=typeof SaaS.runFullTests==="function";
  const finalWizard=Array.isArray(SaaS.FINAL_WIZARD_STEPS)&&SaaS.FINAL_WIZARD_STEPS.length>0;
  const project=!!SaaS.releaseCandidate.projectId;

  return [
    {name:"Auditoría estática",status:staticOk?"pass":"fail",detail:staticOk?"Sin errores estáticos conocidos.":"Revisa Auditoría final."},
    {name:"Autenticación protegida",status:auth?"pass":"fail",detail:auth?"Guard de autenticación disponible.":"No se detecta guard de autenticación."},
    {name:"Reglas Firebase preparadas",status:rules?"pass":"warn",detail:rules?"Plantillas y matriz cargadas. Deben probarse en Firebase real.":"No se detecta módulo de reglas."},
    {name:"Hosting preparado",status:deploy?"pass":"warn",detail:deploy?"Checklist de despliegue disponible.":"No se detecta centro de despliegue."},
    {name:"Pruebas integrales",status:tests?"pass":"fail",detail:tests?"Batería automática disponible.":"No se detecta batería de pruebas."},
    {name:"Prueba final guiada",status:finalWizard?"pass":"fail",detail:finalWizard?"Checklist manual disponible.":"No se detecta asistente final."},
    {name:"Firebase Project ID",status:project?"pass":"warn",detail:project?SaaS.releaseCandidate.projectId:"No se detectó projectId."}
  ];
};

SaaS.candidateFingerprint=function(){
  const payload={
    version:SaaS.releaseCandidate.version,
    projectId:SaaS.releaseCandidate.projectId,
    businesses:(SaaS.db.businesses||[]).map(b=>b.id),
    plans:(SaaS.db.plans||[]).map(p=>p.id),
    timestamp:SaaS.releaseCandidate.frozenAt||"unfrozen"
  };
  const s=JSON.stringify(payload);
  let h=2166136261;
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}
  return ("00000000"+(h>>>0).toString(16)).slice(-8).toUpperCase();
};

SaaS.freezeCandidate=function(){
  const checks=SaaS.candidateChecks();
  const fail=checks.filter(x=>x.status==="fail");
  if(fail.length)return alert("No se puede congelar: hay controles críticos pendientes.");

  const version=(document.getElementById("candidateVersionInput")?.value||"").trim();
  if(!version)return alert("Escribe una versión.");

  SaaS.releaseCandidate.version=version;
  SaaS.releaseCandidate.notes=(document.getElementById("candidateNotes")?.value||"").trim();
  SaaS.releaseCandidate.frozen=true;
  SaaS.releaseCandidate.frozenAt=new Date().toISOString();
  SaaS.releaseCandidate.hash=SaaS.candidateFingerprint();
  SaaS.saveReleaseCandidate();

  SaaS.audit?.("SYSTEM","Candidato de prueba congelado",{
    version:SaaS.releaseCandidate.version,
    hash:SaaS.releaseCandidate.hash,
    projectId:SaaS.releaseCandidate.projectId
  },"");

  SaaS.renderReleaseCandidate();
  window.App?.toast?.("Candidato de prueba congelado");
};

SaaS.renderReleaseCandidate=function(){
  const box=document.getElementById("candidateChecksList");if(!box)return;

  document.getElementById("candidateVersionInput").value=SaaS.releaseCandidate.version||"17.0-RC1";
  document.getElementById("candidateNotes").value=SaaS.releaseCandidate.notes||"";
  document.getElementById("candidateProjectId").textContent=SaaS.releaseCandidate.projectId||"—";
  document.getElementById("candidateFrozenAt").textContent=SaaS.releaseCandidate.frozenAt?new Date(SaaS.releaseCandidate.frozenAt).toLocaleString():"—";

  const checks=SaaS.candidateChecks();
  const pass=checks.filter(x=>x.status==="pass").length;
  const fail=checks.filter(x=>x.status==="fail").length;
  const warn=checks.filter(x=>x.status==="warn").length;

  document.getElementById("candidateVersion").textContent=SaaS.releaseCandidate.version||"17.0-RC1";
  document.getElementById("candidateChecks").textContent=`${pass}/${checks.length}`;
  document.getElementById("candidateHash").textContent=SaaS.releaseCandidate.hash||"—";
  document.getElementById("candidateFrozen").textContent=SaaS.releaseCandidate.frozen?"SÍ":"NO";

  box.innerHTML=checks.map(c=>`<div class="row candidate-check ${c.status}">
    <div class="diag-mark">${c.status==="pass"?"✓":c.status==="warn"?"!":"×"}</div>
    <div><strong>${c.name}</strong><small>${c.detail}</small></div>
  </div>`).join("");

  const result=document.getElementById("candidateResult");
  if(fail){
    result.className="launch-result blocked";
    result.innerHTML=`<span class="tag">NO CONGELAR</span><h2>${fail} bloqueo(s)</h2><p>Corrige antes de crear el candidato de prueba.</p>`;
  }else if(!SaaS.releaseCandidate.frozen){
    result.className="launch-result";
    result.innerHTML=`<span class="tag">LISTO PARA CONGELAR</span><h2>Sin bloqueos críticos</h2><p>Quedan ${warn} advertencia(s) que dependen de Firebase real. Puedes congelar este candidato para empezar la validación.</p>`;
  }else{
    result.className="launch-result ready";
    result.innerHTML=`<span class="tag">CANDIDATO CONGELADO</span><h2>${SaaS.releaseCandidate.version}</h2><p>Huella <span class="candidate-hash">${SaaS.releaseCandidate.hash}</span>. Los siguientes cambios deben hacerse en otra versión, no sobre este candidato.</p>`;
  }
};

SaaS.refreshReleaseCandidate=function(){
  SaaS.renderReleaseCandidate();
  SaaS.audit?.("SYSTEM","Candidato de prueba revisado",{version:SaaS.releaseCandidate.version},"");
};

const oldRenderAll_170=SaaS.renderAll;
SaaS.renderAll=function(){
  oldRenderAll_170();
  SaaS.renderReleaseCandidate();
};
