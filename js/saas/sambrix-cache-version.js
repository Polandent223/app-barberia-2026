SaaS.cacheVersionState=SaaS.cacheVersionState||{
  cacheNames:[],
  serviceWorkers:[],
  lastChecked:null
};

SaaS.inspectCacheVersion=async function(){
  const state={cacheNames:[],serviceWorkers:[],lastChecked:new Date().toISOString()};
  try{
    if("caches" in window)state.cacheNames=await caches.keys();
  }catch{}
  try{
    if("serviceWorker" in navigator){
      const regs=await navigator.serviceWorker.getRegistrations();
      state.serviceWorkers=regs.map(r=>({
        scope:r.scope,
        active:r.active?.scriptURL||"",
        waiting:r.waiting?.scriptURL||"",
        installing:r.installing?.scriptURL||""
      }));
    }
  }catch{}
  SaaS.cacheVersionState=state;
  SaaS.renderCacheVersion();
  SaaS.audit?.("SYSTEM","Caché y versión del dispositivo revisados",{
    caches:state.cacheNames.length,
    serviceWorkers:state.serviceWorkers.length,
    version:SaaS.releaseCandidate?.version||""
  },"");
};

SaaS.clearAppCache=async function(){
  if(!confirm("¿Limpiar caché del navegador asociada a esta aplicación? Esto no borra los datos Firebase."))return;
  let removed=0;
  try{
    if("caches" in window){
      const names=await caches.keys();
      for(const name of names){
        if(await caches.delete(name))removed++;
      }
    }
  }catch(e){
    console.warn("No se pudo limpiar Cache Storage",e);
  }

  try{
    if("serviceWorker" in navigator){
      const regs=await navigator.serviceWorker.getRegistrations();
      for(const r of regs)await r.update();
    }
  }catch{}

  SaaS.audit?.("SYSTEM","Caché de aplicación limpiada",{removed},"");
  window.App?.toast?.(`Caché limpiada: ${removed} almacenamiento(s)`);
  setTimeout(()=>location.reload(),500);
};

SaaS.cacheVersionChecks=function(){
  const version=SaaS.releaseCandidate?.version||"";
  const frozen=!!SaaS.releaseCandidate?.frozen;
  const sw=SaaS.cacheVersionState.serviceWorkers||[];
  const cachesList=SaaS.cacheVersionState.cacheNames||[];
  const online=navigator.onLine;

  return [
    {name:"Versión candidata",status:version?"pass":"warn",detail:version||"No hay versión candidata identificada."},
    {name:"Candidato congelado",status:frozen?"pass":"warn",detail:frozen?"La versión de prueba está congelada.":"El candidato aún puede cambiar."},
    {name:"Service Worker",status:sw.length?"warn":"pass",detail:sw.length?`${sw.length} registro(s) detectado(s); pueden conservar recursos antiguos si no se actualizan.`:"No se detecta Service Worker activo."},
    {name:"Cache Storage",status:cachesList.length?"warn":"pass",detail:cachesList.length?`${cachesList.length} caché(s): ${cachesList.join(", ")}`:"Sin Cache Storage detectado."},
    {name:"Conectividad",status:online?"pass":"warn",detail:online?"Navegador online.":"Navegador offline; no se puede verificar una versión recién publicada."}
  ];
};

SaaS.renderCacheVersion=function(){
  const box=document.getElementById("cacheVersionChecks");if(!box)return;
  const checks=SaaS.cacheVersionChecks();
  const sw=(SaaS.cacheVersionState.serviceWorkers||[]).length;
  const cacheCount=(SaaS.cacheVersionState.cacheNames||[]).length;
  const fail=checks.filter(x=>x.status==="fail").length;
  const warn=checks.filter(x=>x.status==="warn").length;

  document.getElementById("cacheLocalVersion").textContent=SaaS.releaseCandidate?.version||"—";
  document.getElementById("cacheServiceWorkerState").textContent=sw?`${sw} ACTIVO`:"NO";
  document.getElementById("cacheStorageCount").textContent=cacheCount;
  document.getElementById("cacheVersionState").textContent=fail?"ERROR":warn?"REVISAR":"OK";

  box.innerHTML=checks.map(x=>`<div class="row cache-check ${x.status}">
    <div class="diag-mark">${x.status==="pass"?"✓":x.status==="warn"?"!":"×"}</div>
    <div><strong>${x.name}</strong><small>${x.detail}</small></div>
  </div>`).join("");

  const result=document.getElementById("cacheVersionResult");
  if(fail){
    result.className="launch-result blocked";
    result.innerHTML='<span class="tag">BLOQUEO</span><h2>Hay un problema de versión/caché</h2><p>Corrige antes de seguir probando el candidato.</p>';
  }else if(sw||cacheCount){
    result.className="launch-result";
    result.innerHTML='<span class="tag">ATENCIÓN</span><h2>El navegador puede conservar una versión anterior</h2><p>Después de cada deploy verifica el número de versión y limpia caché si un dispositivo no se actualiza.</p>';
  }else{
    result.className="launch-result ready";
    result.innerHTML='<span class="tag">LIMPIO</span><h2>Sin caché persistente detectada</h2><p>El dispositivo no muestra señales locales de PWA/caché que puedan ocultar una actualización.</p>';
  }
};

const oldRenderAll_183=SaaS.renderAll;
SaaS.renderAll=function(){
  oldRenderAll_183();
  SaaS.renderCacheVersion();
};
