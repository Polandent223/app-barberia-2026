SaaS.staticAudit={"jsCount": 66, "duplicateIds": [], "missingRefs": [], "syntaxErrors": [], "nodeChecked": true};
SaaS.renderTechnicalAudit=function(){
 const a=SaaS.staticAudit, box=document.getElementById("technicalStaticList");if(!box)return;
 document.getElementById("techJsCount").textContent=a.jsCount;
 document.getElementById("techDuplicateCount").textContent=a.duplicateIds.length;
 document.getElementById("techMissingCount").textContent=a.missingRefs.length;
 document.getElementById("techSyntaxState").textContent=a.nodeChecked?(a.syntaxErrors.length?"ERROR":"OK"):"N/A";
 const rows=[
  {name:"Referencias locales JS/CSS",status:a.missingRefs.length?"fail":"pass",detail:a.missingRefs.length?a.missingRefs.join(", "):"No se encontraron referencias locales faltantes."},
  {name:"IDs HTML duplicados",status:a.duplicateIds.length?"fail":"pass",detail:a.duplicateIds.length?a.duplicateIds.join(", "):"No se encontraron IDs duplicados."},
  {name:"Sintaxis JavaScript",status:!a.nodeChecked?"warn":a.syntaxErrors.length?"fail":"pass",detail:!a.nodeChecked?"Node no disponible para comprobación estática.":a.syntaxErrors.length?`${a.syntaxErrors.length} archivo(s) con error.`:"Todos los archivos JS superaron node --check."}
 ];
 box.innerHTML=rows.map(x=>`<div class="row tech-audit-row ${x.status}"><div class="diag-mark">${x.status==="pass"?"✓":x.status==="warn"?"!":"×"}</div><div><strong>${x.name}</strong><small>${x.detail}</small></div></div>`).join("");
 const fail=rows.filter(x=>x.status==="fail").length,warn=rows.filter(x=>x.status==="warn").length;
 const result=document.getElementById("technicalAuditResult");
 if(fail){result.className="launch-result blocked";result.innerHTML=`<span class="tag">CORREGIR</span><h2>${fail} problema(s) técnico(s)</h2><p>No iniciar todavía la prueba real.</p>`}
 else{result.className="launch-result";result.innerHTML=`<span class="tag">ESTRUCTURA APROBADA</span><h2>Lista para prueba real</h2><p>La revisión estática no encontró bloqueos${warn?" y queda una advertencia técnica":""}. El siguiente paso ya requiere Firebase y dos dispositivos reales.</p>`}
};
SaaS.runTechnicalAudit=function(){SaaS.renderTechnicalAudit();SaaS.audit?.("SYSTEM","Auditoría técnica revisada",{missing:SaaS.staticAudit.missingRefs.length,duplicates:SaaS.staticAudit.duplicateIds.length,syntax:SaaS.staticAudit.syntaxErrors.length},"")};

const oldRenderAll_156=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_156();SaaS.renderTechnicalAudit()};
