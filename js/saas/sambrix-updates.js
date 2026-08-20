SaaS.updateSystem=SaaS.updateSystem||{
  releases:[],
  businessChannels:{},
  history:[]
};

SaaS.loadUpdateSystem=function(){
  try{
    const saved=JSON.parse(localStorage.getItem("sambrix_update_system"))||{};
    SaaS.updateSystem={
      releases:saved.releases||[],
      businessChannels:saved.businessChannels||{},
      history:saved.history||[]
    };
  }catch{}
};

SaaS.saveUpdateSystem=function(){
  localStorage.setItem("sambrix_update_system",JSON.stringify(SaaS.updateSystem));
};

SaaS.openUpdateReleaseModal=function(){
  document.getElementById("updateVersion").value="";
  document.getElementById("updateChannel").value="beta";
  document.getElementById("updateNotes").value="";
  document.getElementById("updateRollout").value="10";
  document.getElementById("updateReleaseModal")?.classList.add("open");
};

SaaS.closeUpdateReleaseModal=function(){
  document.getElementById("updateReleaseModal")?.classList.remove("open");
};

SaaS.createUpdateRelease=function(){
  const version=document.getElementById("updateVersion").value.trim();
  const channel=document.getElementById("updateChannel").value;
  const notes=document.getElementById("updateNotes").value.trim();
  const rollout=Math.max(0,Math.min(100,Number(document.getElementById("updateRollout").value||0)));

  if(!version)return alert("Escribe el número de versión.");
  if(SaaS.updateSystem.releases.some(r=>r.version===version))return alert("Esa versión ya existe.");

  const release={
    id:"upd_"+SaaS.uid(),
    version,channel,notes,rollout,
    createdAt:new Date().toISOString(),
    createdBy:window.FirebaseBridge?.user?.email||"SuperAdmin",
    active:true
  };

  SaaS.updateSystem.releases.push(release);
  SaaS.updateSystem.history.push({
    id:"hist_"+SaaS.uid(),
    type:"deploy",
    version,channel,
    createdAt:new Date().toISOString(),
    by:release.createdBy,
    note:`Release creado con rollout ${rollout}%`
  });

  SaaS.saveUpdateSystem();
  SaaS.audit?.("SYSTEM","Actualización creada",{version,channel,rollout},"");
  SaaS.closeUpdateReleaseModal();
  SaaS.renderUpdateCenter();
  window.App?.toast?.(`Versión ${version} creada`);
};

SaaS.setBusinessUpdateChannel=function(businessId,channel){
  SaaS.updateSystem.businessChannels[businessId]=channel;
  SaaS.saveUpdateSystem();
  SaaS.audit?.("SYSTEM","Canal de actualización cambiado",{businessId,channel},businessId);
  SaaS.renderUpdateCenter();
};

SaaS.latestRelease=function(channel){
  return [...SaaS.updateSystem.releases]
    .filter(r=>r.channel===channel&&r.active!==false)
    .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))[0]||null;
};

SaaS.businessTargetVersion=function(businessId){
  const channel=SaaS.updateSystem.businessChannels[businessId]||"stable";
  return SaaS.latestRelease(channel)?.version||"—";
};

SaaS.promoteRelease=function(id){
  const r=SaaS.updateSystem.releases.find(x=>x.id===id);if(!r)return;
  if(r.channel==="stable")return;
  if(!confirm(`¿Promover v${r.version} a canal estable?`))return;
  r.channel="stable";r.rollout=100;
  SaaS.updateSystem.history.push({
    id:"hist_"+SaaS.uid(),type:"deploy",version:r.version,channel:"stable",
    createdAt:new Date().toISOString(),
    by:window.FirebaseBridge?.user?.email||"SuperAdmin",
    note:"Promovida de beta a estable"
  });
  SaaS.saveUpdateSystem();SaaS.audit?.("SYSTEM","Versión promovida a estable",{version:r.version},"");SaaS.renderUpdateCenter();
};

SaaS.rollbackTo=function(version){
  const r=SaaS.updateSystem.releases.find(x=>x.version===version);if(!r)return;
  if(!confirm(`¿Registrar rollback hacia v${version}?`))return;
  SaaS.updateSystem.releases.forEach(x=>{if(x.channel==="stable")x.active=false});
  r.channel="stable";r.active=true;r.rollout=100;
  SaaS.updateSystem.history.push({
    id:"hist_"+SaaS.uid(),type:"rollback",version,channel:"stable",
    createdAt:new Date().toISOString(),
    by:window.FirebaseBridge?.user?.email||"SuperAdmin",
    note:"Rollback manual registrado"
  });
  SaaS.saveUpdateSystem();SaaS.audit?.("SYSTEM","Rollback registrado",{version},"");SaaS.renderUpdateCenter();
  window.App?.toast?.(`Rollback a v${version} registrado`);
};

SaaS.renderUpdateCenter=function(){
  const releases=document.getElementById("updateReleaseList");if(!releases)return;
  const stable=SaaS.latestRelease("stable"),beta=SaaS.latestRelease("beta");
  const bs=SaaS.db.businesses||[];

  document.getElementById("updateStableVersion").textContent=stable?.version||"—";
  document.getElementById("updateBetaVersion").textContent=beta?.version||"—";
  document.getElementById("updateBetaBusinessCount").textContent=bs.filter(b=>(SaaS.updateSystem.businessChannels[b.id]||"stable")==="beta").length;
  document.getElementById("updateRollbackCount").textContent=SaaS.updateSystem.history.filter(h=>h.type==="rollback").length;

  releases.innerHTML=[...SaaS.updateSystem.releases].reverse().map(r=>`<div class="row update-release ${r.channel}">
    <div style="flex:1">
      <strong class="update-version">v${r.version}</strong>
      <small>${r.notes||"Sin notas"} · ${new Date(r.createdAt).toLocaleString()}</small>
    </div>
    <span class="update-channel ${r.channel}">${r.channel}</span>
    <strong>${r.rollout}%</strong>
    <div class="manage-actions">
      ${r.channel==="beta"?`<button class="btn primary tiny" onclick="SaaS.promoteRelease('${r.id}')">Promover</button>`:""}
      <button class="btn secondary tiny" onclick="SaaS.rollbackTo('${r.version}')">Rollback</button>
    </div>
  </div>`).join("")||'<div class="muted">Todavía no hay actualizaciones registradas.</div>';

  document.getElementById("updateBusinessList").innerHTML=bs.map(b=>{
    const channel=SaaS.updateSystem.businessChannels[b.id]||"stable";
    return `<div class="row">
      <div style="flex:1"><strong>${b.name}</strong><small>Versión objetivo: ${SaaS.businessTargetVersion(b.id)}</small></div>
      <select onchange="SaaS.setBusinessUpdateChannel('${b.id}',this.value)">
        <option value="stable" ${channel==="stable"?"selected":""}>Estable</option>
        <option value="beta" ${channel==="beta"?"selected":""}>Beta</option>
      </select>
    </div>`;
  }).join("")||'<div class="muted">No hay negocios.</div>';

  document.getElementById("updateHistoryList").innerHTML=[...SaaS.updateSystem.history].reverse().map(h=>`<div class="row update-history ${h.type}">
    <div><strong>${h.type==="rollback"?"Rollback":"Despliegue"} · v${h.version}</strong><small>${new Date(h.createdAt).toLocaleString()} · ${h.by}</small><div class="release-note">${h.note||""}</div></div>
    <span class="status ${h.type==="rollback"?"":"ok"}">${h.channel}</span>
  </div>`).join("")||'<div class="muted">Sin historial.</div>';

  const result=document.getElementById("updateResult");
  if(!stable){
    result.className="launch-result";
    result.innerHTML='<span class="tag">SIN VERSIÓN ESTABLE</span><h2>Registra una versión estable</h2><p>Los negocios no deben depender solo del canal beta.</p>';
  }else if(beta){
    result.className="launch-result";
    result.innerHTML='<span class="tag">BETA ACTIVA</span><h2>Hay una versión en prueba</h2><p>Usa unos pocos tenants antes de promoverla a estable.</p>';
  }else{
    result.className="launch-result ready";
    result.innerHTML='<span class="tag">ESTABLE</span><h2>Todos los negocios apuntan a una versión estable</h2><p>No hay beta activa en este momento.</p>';
  }
};

const oldRenderAll_166=SaaS.renderAll;
SaaS.renderAll=function(){
  oldRenderAll_166();
  SaaS.renderUpdateCenter();
};
