SaaS.runtimeDiagnostics=SaaS.runtimeDiagnostics||{
  errors:[],
  installed:false
};

SaaS.loadRuntimeDiagnostics=function(){
  try{
    SaaS.runtimeDiagnostics.errors=JSON.parse(sessionStorage.getItem("sambrix_runtime_errors"))||[];
  }catch{SaaS.runtimeDiagnostics.errors=[]}
  SaaS.installRuntimeDiagnostics();
};

SaaS.saveRuntimeDiagnostics=function(){
  try{
    sessionStorage.setItem("sambrix_runtime_errors",JSON.stringify(SaaS.runtimeDiagnostics.errors.slice(-100)));
  }catch{}
};

SaaS.pushRuntimeError=function(err){
  const item={
    id:"rt_"+SaaS.uid(),
    type:err.type||"javascript",
    message:String(err.message||"Error desconocido"),
    source:String(err.source||""),
    line:err.line||0,
    column:err.column||0,
    stack:String(err.stack||""),
    createdAt:new Date().toISOString(),
    page:document.querySelector(".page.active")?.id||"",
    role:SaaS.session?.role||"guest",
    businessId:SaaS.getContext?.()?.businessId||""
  };

  const duplicate=SaaS.runtimeDiagnostics.errors.slice(-5).some(x=>
    x.type===item.type&&x.message===item.message&&x.source===item.source
  );
  if(!duplicate){
    SaaS.runtimeDiagnostics.errors.push(item);
    if(SaaS.runtimeDiagnostics.errors.length>100)SaaS.runtimeDiagnostics.errors=SaaS.runtimeDiagnostics.errors.slice(-100);
    SaaS.saveRuntimeDiagnostics();
  }
  SaaS.renderRuntimeDiagnostics();
};

SaaS.installRuntimeDiagnostics=function(){
  if(SaaS.runtimeDiagnostics.installed)return;
  SaaS.runtimeDiagnostics.installed=true;

  window.addEventListener("error",e=>{
    const target=e.target;
    if(target&&target!==window&&target.tagName){
      SaaS.pushRuntimeError({
        type:"resource",
        message:`No se pudo cargar ${target.tagName}`,
        source:target.src||target.href||target.currentSrc||""
      });
      return;
    }
    SaaS.pushRuntimeError({
      type:"javascript",
      message:e.message||"JavaScript error",
      source:e.filename||"",
      line:e.lineno||0,
      column:e.colno||0,
      stack:e.error?.stack||""
    });
  },true);

  window.addEventListener("unhandledrejection",e=>{
    const reason=e.reason;
    SaaS.pushRuntimeError({
      type:"promise",
      message:reason?.message||String(reason||"Promise rechazada"),
      stack:reason?.stack||""
    });
  });
};

SaaS.clearRuntimeDiagnostics=function(){
  if(!confirm("¿Limpiar el registro de errores de esta sesión?"))return;
  SaaS.runtimeDiagnostics.errors=[];
  SaaS.saveRuntimeDiagnostics();
  SaaS.renderRuntimeDiagnostics();
};

SaaS.renderRuntimeDiagnostics=function(){
  const box=document.getElementById("runtimeErrorList");if(!box)return;
  const filter=document.getElementById("runtimeTypeFilter")?.value||"";
  const all=SaaS.runtimeDiagnostics.errors||[];
  const rows=all.filter(x=>!filter||x.type===filter);

  const js=all.filter(x=>x.type==="javascript").length;
  const promise=all.filter(x=>x.type==="promise").length;
  const resource=all.filter(x=>x.type==="resource").length;
  const total=all.length;

  document.getElementById("runtimeJsErrorCount").textContent=js;
  document.getElementById("runtimePromiseErrorCount").textContent=promise;
  document.getElementById("runtimeResourceErrorCount").textContent=resource;
  document.getElementById("runtimeHealthState").textContent=total?"REVISAR":"LIMPIO";

  box.innerHTML=[...rows].reverse().map(x=>`<div class="row runtime-row ${x.type}">
    <div style="flex:1">
      <strong>${x.message}</strong>
      <small>${x.type} · ${new Date(x.createdAt).toLocaleString()} · ${x.page||"sin página"}</small>
      <div class="runtime-meta">${x.source||""}${x.line?` : ${x.line}:${x.column}`:""}</div>
      ${x.stack?`<div class="runtime-stack">${x.stack}</div>`:""}
    </div>
  </div>`).join("")||'<div class="muted">No hay errores registrados en esta sesión.</div>';

  const env=[
    ["URL",location.href],
    ["Navegador",navigator.userAgent],
    ["Online",navigator.onLine?"Sí":"No"],
    ["Rol",SaaS.session?.role||"guest"],
    ["Business ID",SaaS.getContext?.()?.businessId||"—"],
    ["Firebase usuario",(window.FirebaseBridge?.user||window.FirebaseBridge?.currentUser)?.email||"—"],
    ["Candidato",SaaS.releaseCandidate?.version||"—"],
    ["Hash candidato",SaaS.releaseCandidate?.hash||"—"]
  ];
  document.getElementById("runtimeEnvironmentList").innerHTML=env.map(x=>`<div class="row"><span>${x[0]}</span><strong style="max-width:65%;word-break:break-all;text-align:right">${x[1]}</strong></div>`).join("");

  const result=document.getElementById("runtimeResult");
  if(total){
    result.className="launch-result blocked";
    result.innerHTML=`<span class="tag">ERRORES DETECTADOS</span><h2>${total} error(es) en esta sesión</h2><p>Revísalos antes de aprobar el candidato.</p>`;
  }else{
    result.className="launch-result ready";
    result.innerHTML='<span class="tag">LIMPIO</span><h2>Sin errores de runtime registrados</h2><p>Este panel seguirá escuchando mientras pruebas SAMBRIX.</p>';
  }
};

const oldRenderAll_172=SaaS.renderAll;
SaaS.renderAll=function(){
  oldRenderAll_172();
  SaaS.renderRuntimeDiagnostics();
};
