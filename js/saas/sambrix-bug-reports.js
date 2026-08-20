SaaS.bugReports=SaaS.bugReports||[];
SaaS.pendingRuntimeEvidence=[];

SaaS.loadBugReports=function(){
  try{SaaS.bugReports=JSON.parse(localStorage.getItem("sambrix_bug_reports"))||[]}catch{SaaS.bugReports=[]}
};

SaaS.saveBugReports=function(){
  localStorage.setItem("sambrix_bug_reports",JSON.stringify(SaaS.bugReports));
};

SaaS.openBugReportModal=function(){
  const businessSelect=document.getElementById("bugBusiness");
  const ctx=SaaS.getContext?.()||{};
  businessSelect.innerHTML='<option value="">Plataforma general</option>'+(SaaS.db.businesses||[]).map(b=>`<option value="${b.id}">${b.name}</option>`).join("");
  if(ctx.businessId)businessSelect.value=ctx.businessId;

  document.getElementById("bugTitle").value="";
  document.getElementById("bugSeverity").value="Media";
  document.getElementById("bugDescription").value="";
  document.getElementById("bugSteps").value="";
  document.getElementById("bugExpected").value="";
  document.getElementById("bugActual").value="";
  document.getElementById("bugPage").value=document.querySelector(".page.active")?.id||"";
  SaaS.pendingRuntimeEvidence=[];
  document.getElementById("bugReportModal")?.classList.add("open");
};

SaaS.closeBugReportModal=function(){
  document.getElementById("bugReportModal")?.classList.remove("open");
};

SaaS.attachRuntimeEvidence=function(){
  SaaS.pendingRuntimeEvidence=(SaaS.runtimeDiagnostics?.errors||[]).slice(-10);
  window.App?.toast?.(`${SaaS.pendingRuntimeEvidence.length} error(es) runtime adjuntados`);
};

SaaS.createBugReport=function(){
  const title=document.getElementById("bugTitle").value.trim();
  if(!title)return alert("Escribe un título.");

  const businessId=document.getElementById("bugBusiness").value;
  const business=SaaS.db.businesses.find(b=>b.id===businessId);
  const user=window.FirebaseBridge?.user||window.FirebaseBridge?.currentUser||null;
  const report={
    id:"bug_"+SaaS.uid(),
    title,
    severity:document.getElementById("bugSeverity").value,
    status:"Abierto",
    businessId,
    businessName:business?.name||"Plataforma",
    page:document.getElementById("bugPage").value,
    description:document.getElementById("bugDescription").value.trim(),
    steps:document.getElementById("bugSteps").value.trim(),
    expected:document.getElementById("bugExpected").value.trim(),
    actual:document.getElementById("bugActual").value.trim(),
    runtimeEvidence:JSON.parse(JSON.stringify(SaaS.pendingRuntimeEvidence||[])),
    environment:{
      url:location.href,
      userAgent:navigator.userAgent,
      online:navigator.onLine,
      role:SaaS.session?.role||"guest",
      user:user?.email||user?.uid||"",
      candidateVersion:SaaS.releaseCandidate?.version||"",
      candidateHash:SaaS.releaseCandidate?.hash||"",
      firebaseProject:SaaS.releaseCandidate?.projectId||""
    },
    createdAt:new Date().toISOString(),
    createdBy:user?.email||"Tester"
  };

  SaaS.bugReports.push(report);
  SaaS.saveBugReports();
  SaaS.audit?.("QA","Reporte de error creado",{id:report.id,severity:report.severity,title:report.title},businessId);
  SaaS.closeBugReportModal();
  SaaS.renderBugReports();
  window.App?.toast?.("Reporte guardado");
};

SaaS.updateBugStatus=function(id,status){
  const r=SaaS.bugReports.find(x=>x.id===id);if(!r)return;
  r.status=status;
  r.updatedAt=new Date().toISOString();
  if(status==="Resuelto")r.resolvedAt=r.updatedAt;
  SaaS.saveBugReports();
  SaaS.audit?.("QA","Estado de reporte actualizado",{id,status},r.businessId);
  SaaS.renderBugReports();
};

SaaS.exportBugReport=function(id){
  const r=SaaS.bugReports.find(x=>x.id===id);if(!r)return;
  const blob=new Blob([JSON.stringify(r,null,2)],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=`SAMBRIX_bug_${r.id}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
};

SaaS.renderBugReports=function(){
  const box=document.getElementById("bugReportList");if(!box)return;

  const q=(document.getElementById("bugSearch")?.value||"").toLowerCase();
  const status=document.getElementById("bugStatusFilter")?.value||"";
  const rows=SaaS.bugReports.filter(r=>(!status||r.status===status)&&(!q||`${r.title} ${r.description} ${r.businessName}`.toLowerCase().includes(q)));

  document.getElementById("bugOpenCount").textContent=SaaS.bugReports.filter(r=>r.status!=="Resuelto").length;
  document.getElementById("bugCriticalCount").textContent=SaaS.bugReports.filter(r=>r.status!=="Resuelto"&&r.severity==="Crítica").length;
  document.getElementById("bugResolvedCount").textContent=SaaS.bugReports.filter(r=>r.status==="Resuelto").length;
  document.getElementById("bugCandidateVersion").textContent=SaaS.releaseCandidate?.version||"—";

  box.innerHTML=[...rows].reverse().map(r=>`<div class="row bug-row ${r.severity==="Crítica"?"critical":""} ${r.status==="Resuelto"?"resolved":""}">
    <div style="flex:1">
      <strong>${r.title}</strong>
      <small>${r.businessName} · ${r.severity} · ${r.status} · ${new Date(r.createdAt).toLocaleString()}</small>
      <div class="bug-meta">${r.page||"sin página"} · ${r.environment?.role||"guest"} · ${r.environment?.candidateVersion||"sin versión"}</div>
      ${r.runtimeEvidence?.length?`<div class="bug-evidence">${r.runtimeEvidence.map(e=>`${e.type}: ${e.message}`).join("\n")}</div>`:""}
    </div>
    <div class="manage-actions">
      <select onchange="SaaS.updateBugStatus('${r.id}',this.value)">
        <option ${r.status==="Abierto"?"selected":""}>Abierto</option>
        <option ${r.status==="En progreso"?"selected":""}>En progreso</option>
        <option ${r.status==="Resuelto"?"selected":""}>Resuelto</option>
      </select>
      <button class="btn secondary tiny" onclick="SaaS.exportBugReport('${r.id}')">Exportar</button>
    </div>
  </div>`).join("")||'<div class="muted">No hay reportes con estos filtros.</div>';

  const open=SaaS.bugReports.filter(r=>r.status!=="Resuelto");
  const critical=open.filter(r=>r.severity==="Crítica").length;
  const high=open.filter(r=>r.severity==="Alta").length;
  const result=document.getElementById("bugReportResult");

  if(critical){
    result.className="launch-result blocked";
    result.innerHTML=`<span class="tag">BLOQUEADO</span><h2>${critical} error(es) crítico(s)</h2><p>El candidato no debe aprobarse hasta resolverlos.</p>`;
  }else if(high){
    result.className="launch-result";
    result.innerHTML=`<span class="tag">REVISAR</span><h2>${high} error(es) de severidad alta</h2><p>Corrígelos antes de certificar el candidato.</p>`;
  }else if(open.length){
    result.className="launch-result";
    result.innerHTML=`<span class="tag">SEGUIMIENTO</span><h2>${open.length} reporte(s) abierto(s)</h2><p>No hay críticos, pero todavía existen problemas pendientes.</p>`;
  }else{
    result.className="launch-result ready";
    result.innerHTML='<span class="tag">SIN BLOQUEOS QA</span><h2>No hay errores abiertos</h2><p>El candidato no tiene reportes QA pendientes registrados.</p>';
  }
};

const oldRenderAll_173=SaaS.renderAll;
SaaS.renderAll=function(){
  oldRenderAll_173();
  SaaS.renderBugReports();
};
