SaaS.certifications=SaaS.certifications||[];
SaaS.loadCertifications=function(){try{SaaS.certifications=JSON.parse(localStorage.getItem("sambrix_certifications"))||[]}catch{SaaS.certifications=[]}};
SaaS.saveCertifications=function(){localStorage.setItem("sambrix_certifications",JSON.stringify(SaaS.certifications))};

SaaS.certificationEvidence=function(){
 const wizard=SaaS.FINAL_WIZARD_STEPS||[];
 const wizardDone=wizard.length>0&&wizard.every(s=>SaaS.finalWizard?.[s.id]);
 const manual=SaaS.firebaseLiveTest?.manual||{};
 const firebaseManual=["superadmin","owner","employee","isolation"].every(k=>manual[k]);
 const sync=!!SaaS.firebaseLiveTest?.confirmed;
 const staticAudit=!!SaaS.staticAudit&&!SaaS.staticAudit.duplicateIds?.length&&!SaaS.staticAudit.missingRefs?.length&&!SaaS.staticAudit.syntaxErrors?.length;
 const autoTests=(SaaS.testResults||[]).length>0&&(SaaS.testResults||[]).every(x=>x.status!=="fail");
 return [
  {name:"Auditoría técnica",ok:staticAudit,detail:staticAudit?"Sin errores estáticos conocidos.":"Revisa Auditoría final."},
  {name:"Pruebas automáticas",ok:autoTests,detail:autoTests?"Sin pruebas fallidas.":"Ejecuta Pruebas integrales."},
  {name:"Checklist de aceptación",ok:wizardDone,detail:wizardDone?"Recorrido final completado.":"Completa Prueba final."},
  {name:"Roles Firebase reales",ok:firebaseManual,detail:firebaseManual?"Roles comprobados manualmente.":"Faltan controles manuales de Firebase."},
  {name:"Sincronización real",ok:sync,detail:sync?"Prueba entre dispositivos confirmada.":"Falta confirmar sincronización entre dispositivos."}
 ];
};

SaaS.createCertification=function(){
 const evidence=SaaS.certificationEvidence();
 if(evidence.some(x=>!x.ok))return alert("Todavía no se puede certificar SAMBRIX. Completa todos los controles reales.");
 const version=SaaS.releases?.length?SaaS.releases[SaaS.releases.length-1].version:"15.9";
 const code="CERT-"+new Date().getFullYear()+"-"+String(SaaS.certifications.length+1).padStart(4,"0");
 const c={id:"cert_"+SaaS.uid(),code,version,createdAt:new Date().toISOString(),createdBy:window.FirebaseBridge?.user?.email||"SuperAdmin",evidence,productionApproved:true};
 SaaS.certifications.push(c);SaaS.saveCertifications();SaaS.audit?.("SYSTEM","Certificación de producción emitida",{code,version},"");SaaS.renderCertification();window.App?.toast?.("Certificación creada");
};

SaaS.renderCertification=function(){
 const box=document.getElementById("certEvidenceList");if(!box)return;
 const ev=SaaS.certificationEvidence(),wizard=SaaS.FINAL_WIZARD_STEPS||[],wizardDone=wizard.length>0&&wizard.every(s=>SaaS.finalWizard?.[s.id]);
 const manual=SaaS.firebaseLiveTest?.manual||{},firebaseDone=!!SaaS.firebaseLiveTest?.confirmed&&["superadmin","owner","employee","isolation"].every(k=>manual[k]);
 const approved=SaaS.certifications.some(c=>c.productionApproved);
 document.getElementById("certChecklistState").textContent=wizardDone?"OK":"Pendiente";
 document.getElementById("certFirebaseState").textContent=firebaseDone?"OK":"Pendiente";
 document.getElementById("certCount").textContent=SaaS.certifications.length;
 document.getElementById("certProductionState").textContent=approved?"SÍ":"NO";
 box.innerHTML=ev.map(x=>`<div class="row cert-row ${x.ok?"":"pending"}"><div class="diag-mark">${x.ok?"✓":"!"}</div><div><strong>${x.name}</strong><small>${x.detail}</small></div><span class="status ${x.ok?"ok":""}">${x.ok?"Aprobado":"Pendiente"}</span></div>`).join("");
 document.getElementById("certHistoryList").innerHTML=[...SaaS.certifications].reverse().map(c=>`<div class="row cert-history"><div><strong class="cert-code">${c.code}</strong><small>v${c.version} · ${new Date(c.createdAt).toLocaleString()} · ${c.createdBy}</small></div><span class="status ok">Producción</span></div>`).join("")||'<div class="muted">Todavía no hay certificaciones.</div>';
 const result=document.getElementById("certFinalResult"),ready=ev.every(x=>x.ok);
 if(approved){result.className="launch-result ready";result.innerHTML='<span class="tag">AUTORIZADO</span><h2>SAMBRIX certificado para producción</h2><p>Existe una certificación emitida después de completar las pruebas requeridas.</p>'}
 else if(ready){result.className="launch-result";result.innerHTML='<span class="tag">LISTO PARA CERTIFICAR</span><h2>Todos los controles están aprobados</h2><p>Genera la certificación para registrar formalmente esta versión.</p>'}
 else{result.className="launch-result";result.innerHTML='<span class="tag">NO CERTIFICADO</span><h2>Las pruebas reales siguen pendientes</h2><p>La aplicación no se marcará como producción hasta completar todos los controles.</p>'}
};

const oldRenderAll_159=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_159();SaaS.renderCertification()};
