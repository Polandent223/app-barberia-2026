SaaS.privacySystem=SaaS.privacySystem||{
  requests:[],
  policy:{retentionDays:365,auditExports:true,doubleConfirm:true}
};

SaaS.loadPrivacySystem=function(){
  try{
    const saved=JSON.parse(localStorage.getItem("sambrix_privacy_system"))||{};
    SaaS.privacySystem={
      requests:saved.requests||[],
      policy:{...SaaS.privacySystem.policy,...(saved.policy||{})}
    };
  }catch{}
};

SaaS.savePrivacySystem=function(){
  localStorage.setItem("sambrix_privacy_system",JSON.stringify(SaaS.privacySystem));
};

SaaS.openPrivacyRequestModal=function(){
  const sel=document.getElementById("privacyBusiness");
  sel.innerHTML='<option value="">Plataforma general</option>'+(SaaS.db.businesses||[]).map(b=>`<option value="${b.id}">${b.name}</option>`).join("");
  const ctx=SaaS.getContext?.();
  if(ctx?.businessId)sel.value=ctx.businessId;
  document.getElementById("privacyRequestType").value="Exportación";
  document.getElementById("privacySubjectName").value="";
  document.getElementById("privacySubjectId").value="";
  document.getElementById("privacyRequestDetail").value="";
  document.getElementById("privacyRequestModal")?.classList.add("open");
};

SaaS.closePrivacyRequestModal=function(){
  document.getElementById("privacyRequestModal")?.classList.remove("open");
};

SaaS.createPrivacyRequest=function(){
  const subject=document.getElementById("privacySubjectName").value.trim();
  if(!subject)return alert("Escribe el nombre de la persona o cliente.");

  const businessId=document.getElementById("privacyBusiness").value;
  const business=SaaS.db.businesses.find(b=>b.id===businessId);
  const req={
    id:"privacy_"+SaaS.uid(),
    businessId,
    businessName:business?.name||"Plataforma",
    type:document.getElementById("privacyRequestType").value,
    subjectName:subject,
    subjectId:document.getElementById("privacySubjectId").value.trim(),
    detail:document.getElementById("privacyRequestDetail").value.trim(),
    status:"Abierta",
    createdAt:new Date().toISOString(),
    createdBy:window.FirebaseBridge?.user?.email||"SuperAdmin"
  };

  SaaS.privacySystem.requests.push(req);
  SaaS.savePrivacySystem();
  SaaS.audit?.("PRIVACY","Solicitud de datos creada",{id:req.id,type:req.type,subject:req.subjectName},businessId);
  SaaS.closePrivacyRequestModal();
  SaaS.renderPrivacyCenter();
  window.App?.toast?.("Solicitud registrada");
};

SaaS.updatePrivacyStatus=function(id,status){
  const r=SaaS.privacySystem.requests.find(x=>x.id===id);if(!r)return;
  if(r.type==="Eliminación"&&status==="Completada"&&SaaS.privacySystem.policy.doubleConfirm){
    if(!confirm("Esta solicitud implica eliminación. ¿Confirmas que la verificación y el respaldo ya fueron realizados?"))return;
  }
  r.status=status;
  r.updatedAt=new Date().toISOString();
  if(status==="Completada")r.completedAt=r.updatedAt;
  SaaS.savePrivacySystem();
  SaaS.audit?.("PRIVACY","Estado de solicitud actualizado",{id,status,type:r.type},r.businessId);
  SaaS.renderPrivacyCenter();
};

SaaS.exportPrivacySubject=function(id){
  const r=SaaS.privacySystem.requests.find(x=>x.id===id);if(!r)return;
  const tenant=r.businessId?SaaS.loadTenantState?.(r.businessId)||{}:{};
  const needle=(r.subjectId||r.subjectName||"").toLowerCase();
  const payload={
    request:r,
    matches:{}
  };
  ["clients","appointments","sales"].forEach(k=>{
    payload.matches[k]=(tenant[k]||[]).filter(x=>JSON.stringify(x).toLowerCase().includes(needle));
  });
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=`SAMBRIX_privacy_${r.id}.json`;
  a.click();
  URL.revokeObjectURL(a.href);

  if(SaaS.privacySystem.policy.auditExports){
    SaaS.audit?.("PRIVACY","Exportación de datos realizada",{requestId:r.id,subject:r.subjectName},r.businessId);
  }
};

SaaS.savePrivacyPolicy=function(){
  SaaS.privacySystem.policy.retentionDays=Math.max(30,Math.min(3650,Number(document.getElementById("privacyRetentionDays").value||365)));
  SaaS.privacySystem.policy.auditExports=!!document.getElementById("privacyAuditExports").checked;
  SaaS.privacySystem.policy.doubleConfirm=!!document.getElementById("privacyDoubleConfirm").checked;
  SaaS.savePrivacySystem();
  SaaS.audit?.("PRIVACY","Política de privacidad actualizada",SaaS.privacySystem.policy,"");
  SaaS.renderPrivacyCenter();
  window.App?.toast?.("Política guardada");
};

SaaS.renderPrivacyCenter=function(){
  const box=document.getElementById("privacyRequestList");if(!box)return;
  const p=SaaS.privacySystem.policy;
  document.getElementById("privacyRetentionDays").value=p.retentionDays||365;
  document.getElementById("privacyAuditExports").checked=p.auditExports!==false;
  document.getElementById("privacyDoubleConfirm").checked=p.doubleConfirm!==false;

  const status=document.getElementById("privacyStatusFilter")?.value||"";
  const rows=SaaS.privacySystem.requests.filter(r=>!status||r.status===status);

  document.getElementById("privacyExportCount").textContent=SaaS.privacySystem.requests.filter(r=>r.type==="Exportación").length;
  document.getElementById("privacyCorrectionCount").textContent=SaaS.privacySystem.requests.filter(r=>r.type==="Corrección").length;
  document.getElementById("privacyDeleteCount").textContent=SaaS.privacySystem.requests.filter(r=>r.type==="Eliminación").length;
  document.getElementById("privacyOpenCount").textContent=SaaS.privacySystem.requests.filter(r=>!["Completada","Rechazada"].includes(r.status)).length;

  box.innerHTML=[...rows].reverse().map(r=>`<div class="row privacy-row ${r.type==="Eliminación"?"delete":""} ${r.status==="Completada"?"completed":""}">
    <div style="flex:1">
      <strong>${r.type}: ${r.subjectName}</strong>
      <small>${r.businessName} · ${r.status} · ${new Date(r.createdAt).toLocaleString()}</small>
      <div class="runtime-meta">${r.subjectId||"Sin identificador"} ${r.detail?`· ${r.detail}`:""}</div>
    </div>
    <div class="manage-actions">
      ${r.type==="Exportación"?`<button class="btn secondary tiny" onclick="SaaS.exportPrivacySubject('${r.id}')">Exportar</button>`:""}
      <select onchange="SaaS.updatePrivacyStatus('${r.id}',this.value)">
        <option ${r.status==="Abierta"?"selected":""}>Abierta</option>
        <option ${r.status==="En proceso"?"selected":""}>En proceso</option>
        <option ${r.status==="Completada"?"selected":""}>Completada</option>
        <option ${r.status==="Rechazada"?"selected":""}>Rechazada</option>
      </select>
    </div>
  </div>`).join("")||'<div class="muted">No hay solicitudes con este filtro.</div>';

  const open=SaaS.privacySystem.requests.filter(r=>!["Completada","Rechazada"].includes(r.status)).length;
  const result=document.getElementById("privacyResult");
  if(open){
    result.className="launch-result";
    result.innerHTML=`<span class="tag">SEGUIMIENTO</span><h2>${open} solicitud(es) abierta(s)</h2><p>Requieren revisión antes de considerarlas cerradas.</p>`;
  }else{
    result.className="launch-result ready";
    result.innerHTML='<span class="tag">CONTROLADO</span><h2>Sin solicitudes pendientes</h2><p>El historial y la política de retención permanecen disponibles.</p>';
  }
};

const oldRenderAll_179=SaaS.renderAll;
SaaS.renderAll=function(){
  oldRenderAll_179();
  SaaS.renderPrivacyCenter();
};
