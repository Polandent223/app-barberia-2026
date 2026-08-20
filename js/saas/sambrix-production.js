SaaS.productionConfig=SaaS.productionConfig||{environment:"test",publicUrl:"",notes:""};
SaaS.loadProductionConfig=function(){try{SaaS.productionConfig=JSON.parse(localStorage.getItem("sambrix_production_config"))||SaaS.productionConfig}catch{}};
SaaS.saveProductionConfig=function(){
 SaaS.productionConfig.environment=document.getElementById("productionEnvironmentSelect")?.value||"test";
 SaaS.productionConfig.publicUrl=(document.getElementById("productionPublicUrl")?.value||"").trim();
 SaaS.productionConfig.notes=(document.getElementById("productionNotes")?.value||"").trim();
 localStorage.setItem("sambrix_production_config",JSON.stringify(SaaS.productionConfig));
 SaaS.audit?.("SYSTEM","Configuración de producción actualizada",{environment:SaaS.productionConfig.environment,publicUrl:SaaS.productionConfig.publicUrl},"");
 SaaS.renderProductionCenter();window.App?.toast?.("Configuración guardada");
};
SaaS.productionChecks=function(){
 const certified=(SaaS.certifications||[]).some(c=>c.productionApproved);
 const staticOk=!!SaaS.staticAudit&&!SaaS.staticAudit.duplicateIds?.length&&!SaaS.staticAudit.missingRefs?.length&&!SaaS.staticAudit.syntaxErrors?.length;
 const wizard=(SaaS.FINAL_WIZARD_STEPS||[]),wizardOk=wizard.length>0&&wizard.every(s=>SaaS.finalWizard?.[s.id]);
 const manual=SaaS.firebaseLiveTest?.manual||{},firebaseOk=!!SaaS.firebaseLiveTest?.confirmed&&["superadmin","owner","employee","isolation"].every(k=>manual[k]);
 const hasUrl=/^https:\/\//i.test(SaaS.productionConfig.publicUrl||"");
 const businesses=(SaaS.db.businesses||[]).length;
 return [
  {name:"Auditoría técnica",ok:staticOk,detail:staticOk?"Estructura estática aprobada.":"Auditoría pendiente."},
  {name:"Prueba final",ok:wizardOk,detail:wizardOk?"Checklist de aceptación completo.":"Faltan pruebas manuales."},
  {name:"Firebase real",ok:firebaseOk,detail:firebaseOk?"Sincronización y roles confirmados.":"Falta prueba real Firebase."},
  {name:"Certificación",ok:certified,detail:certified?"Existe certificación de producción.":"Primero emite la certificación."},
  {name:"URL HTTPS",ok:hasUrl,detail:hasUrl?SaaS.productionConfig.publicUrl:"Configura la URL pública HTTPS."},
  {name:"Negocios configurados",ok:businesses>0,detail:`${businesses} negocio(s) registrados.`}
 ];
};
SaaS.renderProductionCenter=function(){
 const box=document.getElementById("productionCheckList");if(!box)return;
 document.getElementById("productionEnvironmentSelect").value=SaaS.productionConfig.environment||"test";
 document.getElementById("productionPublicUrl").value=SaaS.productionConfig.publicUrl||"";
 document.getElementById("productionNotes").value=SaaS.productionConfig.notes||"";
 const checks=SaaS.productionChecks(),ok=checks.filter(x=>x.ok).length,cert=(SaaS.certifications||[]).some(c=>c.productionApproved);
 document.getElementById("prodEnvironment").textContent=(SaaS.productionConfig.environment||"test").toUpperCase();
 document.getElementById("prodChecks").textContent=`${ok}/${checks.length}`;
 document.getElementById("prodCertState").textContent=cert?"SÍ":"NO";
 const demo=(SaaS.db.businesses||[]).some(b=>/demo|prueba|test/i.test(`${b.name} ${b.owner||""}`));
 document.getElementById("prodDemoState").textContent=demo?"REVISAR":"OK";
 box.innerHTML=checks.map(x=>`<div class="row production-check ${x.ok?"":"pending"}"><div class="diag-mark">${x.ok?"✓":"!"}</div><div><strong>${x.name}</strong><small>${x.detail}</small></div><span class="status ${x.ok?"ok":""}">${x.ok?"OK":"Pendiente"}</span></div>`).join("");
 const result=document.getElementById("productionResult"),ready=checks.every(x=>x.ok)&&SaaS.productionConfig.environment==="production";
 if(ready){result.className="launch-result ready";result.innerHTML='<span class="tag">PREPARADO</span><h2>Configuración lista para publicación</h2><p>Los controles previos están completos. La publicación real debe hacerse en el hosting configurado.</p>'}
 else{result.className="launch-result";result.innerHTML='<span class="tag">NO PUBLICAR TODAVÍA</span><h2>Preparación incompleta</h2><p>SAMBRIX seguirá en modo de prueba hasta completar certificación, Firebase real y URL de producción.</p>'}
};
SaaS.runProductionReview=function(){SaaS.renderProductionCenter();SaaS.audit?.("SYSTEM","Revisión de producción ejecutada",{checks:SaaS.productionChecks().map(x=>({name:x.name,ok:x.ok}))},"")};
const oldRenderAll_160=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_160();SaaS.renderProductionCenter()};
