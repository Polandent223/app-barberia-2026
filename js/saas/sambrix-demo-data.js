SaaS.demoDataReview=SaaS.demoDataReview||{businesses:[]};

SaaS.detectDemoBusinesses=function(){
  const tokens=/\b(demo|prueba|test|testing|ejemplo|sample|fake|ficticio)\b/i;
  return (SaaS.db.businesses||[]).map(b=>{
    const text=[b.name,b.owner,b.ownerEmail,b.type].filter(Boolean).join(" ");
    const tenant=SaaS.loadTenantState?.(b.id)||{};
    const reasons=[];

    if(tokens.test(text))reasons.push("Nombre/datos parecen de prueba");
    if(/@(example|test|demo)\./i.test(b.ownerEmail||""))reasons.push("Correo parece de prueba");

    const rows=[
      ...(tenant.clients||[]),
      ...(tenant.appointments||[]),
      ...(tenant.sales||[]),
      ...(tenant.products||[])
    ];
    const suspiciousRows=rows.filter(x=>tokens.test(JSON.stringify(x))).length;
    if(suspiciousRows)reasons.push(`${suspiciousRows} registro(s) contienen términos demo/prueba`);

    return {
      businessId:b.id,
      businessName:b.name,
      reasons,
      recordCount:rows.length,
      suspiciousRows,
      demo:reasons.length>0
    };
  });
};

SaaS.refreshDemoData=function(){
  SaaS.demoDataReview.businesses=SaaS.detectDemoBusinesses();
  SaaS.renderDemoData();
  SaaS.audit?.("QA","Datos demo revisados",{
    suspects:SaaS.demoDataReview.businesses.filter(x=>x.demo).length
  },"");
};

SaaS.exportDemoData=function(){
  const suspects=SaaS.detectDemoBusinesses().filter(x=>x.demo);
  const payload={
    generatedAt:new Date().toISOString(),
    environment:SaaS.productionConfig?.environment||"test",
    suspects
  };
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=`SAMBRIX_demo_review_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  SaaS.audit?.("QA","Candidatos demo exportados",{count:suspects.length},"");
};

SaaS.renderDemoData=function(){
  const box=document.getElementById("demoBusinessList");if(!box)return;

  const rows=(SaaS.demoDataReview.businesses?.length?SaaS.demoDataReview.businesses:SaaS.detectDemoBusinesses());
  const suspects=rows.filter(x=>x.demo);
  const suspiciousRecords=suspects.reduce((s,x)=>s+x.suspiciousRows,0);
  const env=SaaS.productionConfig?.environment||"test";

  document.getElementById("demoBusinessCount").textContent=suspects.length;
  document.getElementById("demoRecordCount").textContent=suspiciousRecords;
  document.getElementById("demoEnvironmentState").textContent=String(env).toUpperCase();
  document.getElementById("demoCleanupState").textContent=suspects.length?"REVISAR":"OK";

  box.innerHTML=rows.map(x=>`<div class="row demo-row ${x.demo?"":"safe"}">
    <div style="flex:1">
      <strong>${x.businessName}</strong>
      <small>${x.recordCount} registro(s) revisados</small>
      <div class="demo-reason">${x.demo?x.reasons.join(" · "):"No se detectaron señales simples de datos demo."}</div>
    </div>
    <span class="status ${x.demo?"":"ok"}">${x.demo?"Revisar":"OK"}</span>
  </div>`).join("")||'<div class="muted">No hay negocios registrados.</div>';

  const result=document.getElementById("demoDataResult");
  if(env==="production"&&suspects.length){
    result.className="launch-result blocked";
    result.innerHTML=`<span class="tag">NO PUBLICAR</span><h2>${suspects.length} negocio(s) parecen de prueba</h2><p>Exporta la revisión y limpia la fuente real antes de usar producción.</p>`;
  }else if(suspects.length){
    result.className="launch-result";
    result.innerHTML=`<span class="tag">REVISIÓN REQUERIDA</span><h2>${suspects.length} candidato(s) demo</h2><p>Mientras sigamos en prueba/staging no bloquea, pero deben separarse antes de producción.</p>`;
  }else{
    result.className="launch-result ready";
    result.innerHTML='<span class="tag">LIMPIO</span><h2>Sin candidatos demo detectados</h2><p>La revisión automática no encontró señales obvias; la validación final sigue siendo manual.</p>';
  }
};

const oldRenderAll_182=SaaS.renderAll;
SaaS.renderAll=function(){
  oldRenderAll_182();
  SaaS.renderDemoData();
};
