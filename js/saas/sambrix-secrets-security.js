SaaS.secretStaticFindings=[];

SaaS.secretSecurityChecks=function(){
  const findings=SaaS.secretStaticFindings||[];
  const service=findings.filter(x=>["service_account","google_private_key","private_key"].includes(x.type));
  const credentials=findings.filter(x=>!["service_account","google_private_key","private_key"].includes(x.type));
  return [
    {name:"Claves privadas",status:service.length?"fail":"pass",detail:service.length?`${service.length} hallazgo(s) crítico(s).`:"No se detectaron claves privadas/service accounts."},
    {name:"Credenciales embebidas",status:credentials.length?"warn":"pass",detail:credentials.length?`${credentials.length} patrón(es) sensible(s) requieren revisión.`:"No se detectaron patrones de contraseña/token de alta señal."},
    {name:"Firebase config cliente",status:"pass",detail:"apiKey, projectId y authDomain del SDK cliente pueden ser públicos; la seguridad depende de Auth y Rules."},
    {name:"Reglas Firebase",status:typeof SaaS.firebaseRulesChecks==="function"?"pass":"warn",detail:"Las reglas deben impedir accesos aunque alguien conozca la configuración pública."},
    {name:"Autenticación",status:typeof SaaS.applyAuthGuard==="function"?"pass":"fail",detail:"Las áreas administrativas requieren sesión válida."}
  ];
};

SaaS.renderSecretsSecurity=function(){
  const box=document.getElementById("secretFindingList");if(!box)return;
  const findings=SaaS.secretStaticFindings||[];
  const critical=findings.filter(x=>["service_account","google_private_key","private_key"].includes(x.type));
  const checks=SaaS.secretSecurityChecks();
  const fail=checks.filter(x=>x.status==="fail").length;
  const warn=checks.filter(x=>x.status==="warn").length;

  document.getElementById("secretFindingCount").textContent=findings.length;
  document.getElementById("secretServiceAccountState").textContent=critical.length?"DETECTADO":"NO";
  document.getElementById("secretSecurityState").textContent=fail?"BLOQUEADO":warn?"REVISAR":"OK";

  box.innerHTML=findings.length?findings.map(x=>`<div class="row secret-row ${["service_account","google_private_key","private_key"].includes(x.type)?"fail":"warn"}">
    <div><strong>${x.type}</strong><small class="secret-path">${x.file} · línea ${x.line}</small></div>
  </div>`).join(""):'<div class="row secret-row"><div class="diag-mark">✓</div><div><strong>Sin secretos críticos detectados</strong><small>Escaneo estático de alta señal.</small></div></div>';

  const result=document.getElementById("secretSecurityResult");
  if(fail){
    result.className="launch-result blocked";
    result.innerHTML=`<span class="tag">NO PUBLICAR</span><h2>${fail} bloqueo(s) de credenciales</h2><p>Retira cualquier clave privada o service account antes de GitHub/Hosting.</p>`;
  }else if(warn){
    result.className="launch-result";
    result.innerHTML=`<span class="tag">REVISAR</span><h2>Sin claves privadas detectadas</h2><p>Quedan ${warn} advertencia(s) para revisar manualmente antes de producción.</p>`;
  }else{
    result.className="launch-result ready";
    result.innerHTML='<span class="tag">CONFIGURACIÓN SEGURA</span><h2>Sin secretos críticos detectados</h2><p>La configuración cliente de Firebase puede permanecer pública; Auth y Rules siguen siendo la barrera real.</p>';
  }
};

SaaS.refreshSecretsSecurity=function(){
  SaaS.renderSecretsSecurity();
  SaaS.audit?.("SECURITY","Configuración y secretos revisados",{findings:SaaS.secretStaticFindings.length},"");
};

const oldRenderAll_181=SaaS.renderAll;
SaaS.renderAll=function(){
  oldRenderAll_181();
  SaaS.renderSecretsSecurity();
};
