App.logAction=function(action,module,detail=""){
  const u=App.currentUser();
  App.db.auditLog=App.db.auditLog||[];
  App.db.auditLog.push({id:App.uid(),at:new Date().toISOString(),user:u?.name||u?.login||"Sistema",role:u?.role||"",action,module,detail});
  if(App.db.auditLog.length>1500)App.db.auditLog=App.db.auditLog.slice(-1500);
};

App.renderReports=function(){
  if(!App.byId("reportRevenue"))return;
  const from=App.val("reportFrom")||"0000-01-01",to=App.val("reportTo")||"9999-12-31";
  const sales=App.db.sales.filter(s=>s.date>=from&&s.date<=to);
  const revenue=sales.reduce((a,s)=>a+Number(s.total||0),0);
  App.byId("reportRevenue").textContent=App.money(revenue);
  App.byId("reportServices").textContent=sales.reduce((a,s)=>a+(s.items||[]).reduce((q,i)=>q+Number(i.qty||1),0),0);
  App.byId("reportClients").textContent=new Set(sales.map(s=>s.clientName)).size;
  App.byId("reportAverage").textContent=App.money(sales.length?revenue/sales.length:0);

  const bp={};sales.forEach(s=>bp[s.barberName]=(bp[s.barberName]||0)+Number(s.total||0));
  App.byId("reportBarbers").innerHTML=Object.entries(bp).sort((a,b)=>b[1]-a[1]).map(([n,v],i)=>`<div class="row"><div><strong>${i+1}. ${n}</strong><small>Ingresos generados</small></div><strong>${App.money(v)}</strong></div>`).join("")||'<div class="muted">Sin datos.</div>';

  const sp={};sales.forEach(s=>(s.items||[]).forEach(i=>sp[i.name]=(sp[i.name]||0)+Number(i.qty||1)));
  App.byId("reportTopServices").innerHTML=Object.entries(sp).sort((a,b)=>b[1]-a[1]).map(([n,v],i)=>`<div class="row"><div><strong>${i+1}. ${n}</strong><small>Servicios realizados</small></div><strong>${v}</strong></div>`).join("")||'<div class="muted">Sin datos.</div>';
};

App.renderAudit=function(){
  if(!App.byId("auditList"))return;
  const q=(App.val("auditSearch")||"").toLowerCase();
  const data=(App.db.auditLog||[]).slice().reverse().filter(x=>!q||`${x.user} ${x.role} ${x.action} ${x.module} ${x.detail}`.toLowerCase().includes(q));
  App.byId("auditList").innerHTML=data.slice(0,300).map(x=>`<div class="row"><div><strong>${x.action}</strong><small>${x.user} · ${x.role} · ${x.module}<br>${x.detail||""}</small></div><div><span class="audit-chip">${new Date(x.at).toLocaleString()}</span></div></div>`).join("")||'<div class="muted">Sin acciones registradas.</div>';
};

App.loadConfig=function(){
  if(!App.byId("configBusinessName"))return;
  const b=App.db.business;
  App.byId("configBusinessName").value=b.name||"";
  App.byId("configWhatsapp").value=b.whatsapp||"";
  App.byId("configAddress").value=b.address||"";
  App.byId("configOpen").value=b.open||"09:00";
  App.byId("configClose").value=b.close||"19:00";
  App.byId("configPoints").value=b.pointsPerService||10;
};
App.saveConfig=function(){
  const b=App.db.business;
  b.name=App.val("configBusinessName")||b.name;b.whatsapp=App.val("configWhatsapp");b.address=App.val("configAddress");b.open=App.val("configOpen")||b.open;b.close=App.val("configClose")||b.close;b.pointsPerService=Number(App.val("configPoints")||10);
  App.logAction("Configuración actualizada","Configuración",b.name);
  localStorage.setItem(App.KEY,JSON.stringify(App.db));App.renderAll();App.toast("Configuración guardada");
};

App.exportBackup=function(){
  App.logAction("Respaldo descargado","Seguridad","Copia JSON completa");
  localStorage.setItem(App.KEY,JSON.stringify(App.db));
  const blob=new Blob([JSON.stringify(App.db,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`barberia_respaldo_${App.today()}.json`;a.click();URL.revokeObjectURL(a.href);
};
App.importBackup=function(file){
  if(!file)return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      const data=JSON.parse(r.result);
      if(!data.users||!data.business||!data.clients)throw new Error("Formato inválido");
      App.confirmAction("Restaurar respaldo","Esto reemplazará la información actual.",()=>{
        App.db=data;App.ensurePermissionsData();App.logAction("Respaldo restaurado","Seguridad",file.name);localStorage.setItem(App.KEY,JSON.stringify(App.db));location.reload();
      });
    }catch(e){App.toast("El archivo no es un respaldo válido")}
  };r.readAsText(file);
};

App.printReceipt=function(id){
  const s=App.db.sales.find(x=>x.id===id);if(!s)return;
  const b=App.db.business;
  const w=window.open("","_blank","width=480,height=720");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Recibo ${s.number}</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#171717}.brand{text-align:center;border-bottom:2px solid #171717;padding-bottom:14px}.brand h1{font-size:23px;margin:0}.muted{color:#666;font-size:12px}.row{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid #ddd}.total{font-size:20px;font-weight:800}.footer{text-align:center;margin-top:25px;font-size:12px}</style></head><body><div class="brand"><h1>${b.name}</h1><div class="muted">${b.address||""} ${b.whatsapp?("· "+b.whatsapp):""}</div></div><h3>Recibo #${s.number}</h3><div class="muted">${s.date} ${s.time}</div><p><strong>Cliente:</strong> ${s.clientName}<br><strong>Barbero:</strong> ${s.barberName}</p>${s.items.map(i=>`<div class="row"><span>${i.qty} × ${i.name}</span><strong>${s.currency}${Number(i.total).toFixed(2)}</strong></div>`).join("")}<div class="row total"><span>Total</span><span>${s.currency}${Number(s.total).toFixed(2)}</span></div><div class="footer">Gracias por preferirnos.</div><script>window.onload=()=>window.print()<\/script></body></html>`);
  w.document.close();
  App.logAction("Recibo impreso","Recibos",`#${s.number}`);
  localStorage.setItem(App.KEY,JSON.stringify(App.db));
};
