SaaS.backups=SaaS.backups||[];
SaaS.trash=SaaS.trash||[];
SaaS.TRASH_RETENTION_DAYS=30;

SaaS.loadBackupSystem=function(){
  try{SaaS.backups=JSON.parse(localStorage.getItem("sambrix_backups"))||[]}catch{SaaS.backups=[]}
  try{SaaS.trash=JSON.parse(localStorage.getItem("sambrix_trash"))||[]}catch{SaaS.trash=[]}
  SaaS.cleanExpiredTrash();
};

SaaS.saveBackupSystem=function(){
  localStorage.setItem("sambrix_backups",JSON.stringify(SaaS.backups));
  localStorage.setItem("sambrix_trash",JSON.stringify(SaaS.trash));
};

SaaS.snapshotPlatform=function(){
  const tenants={};
  (SaaS.db.businesses||[]).forEach(b=>{
    try{
      const raw=localStorage.getItem(SaaS.tenantKey?.(b.id)||"");
      if(raw)tenants[b.id]=JSON.parse(raw);
      else if(SaaS.getContext()?.businessId===b.id&&window.App?.db)tenants[b.id]=JSON.parse(JSON.stringify(window.App.db));
    }catch{}
  });
  return {
    version:"14.8",
    createdAt:new Date().toISOString(),
    platform:JSON.parse(JSON.stringify(SaaS.db)),
    addons:JSON.parse(JSON.stringify(SaaS.addons||[])),
    businessAddons:JSON.parse(JSON.stringify(SaaS.businessAddons||{})),
    billingPayments:JSON.parse(JSON.stringify(SaaS.billingPayments||[])),
    notifications:JSON.parse(JSON.stringify(SaaS.notifications||[])),
    permissionRequests:JSON.parse(JSON.stringify(SaaS.permissionRequests||[])),
    globalAudit:JSON.parse(JSON.stringify(SaaS.globalAudit||[])),
    tenants
  };
};

SaaS.createBackup=function(businessId=""){
  const snapshot=SaaS.snapshotPlatform();
  let payload=snapshot;
  let label="Plataforma completa";
  if(businessId){
    const b=SaaS.db.businesses.find(x=>x.id===businessId);
    payload={version:snapshot.version,createdAt:snapshot.createdAt,business:b,tenant:snapshot.tenants[businessId]||null};
    label=b?.name||businessId;
  }
  const item={
    id:"backup_"+SaaS.uid(),
    businessId,
    label,
    createdAt:new Date().toISOString(),
    payload
  };
  SaaS.backups.push(item);
  if(SaaS.backups.length>40)SaaS.backups=SaaS.backups.slice(-40);
  SaaS.saveBackupSystem();
  SaaS.audit?.("BACKUP","Respaldo creado",{backupId:item.id,label},businessId);
  SaaS.renderBackupCenter();
  window.App?.toast?.("Respaldo creado");
  return item;
};

SaaS.exportBackup=function(){
  const item=SaaS.createBackup("");
  const blob=new Blob([JSON.stringify(item.payload,null,2)],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=`SAMBRIX_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
};

SaaS.restoreBackup=function(id){
  const item=SaaS.backups.find(x=>x.id===id);if(!item)return;
  if(!confirm(`¿Restaurar "${item.label}"? SAMBRIX creará primero un respaldo del estado actual.`))return;
  SaaS.createBackup("");
  try{
    const p=item.payload;
    if(p.platform){
      SaaS.db=JSON.parse(JSON.stringify(p.platform));
      SaaS.addons=JSON.parse(JSON.stringify(p.addons||[]));
      SaaS.businessAddons=JSON.parse(JSON.stringify(p.businessAddons||{}));
      SaaS.billingPayments=JSON.parse(JSON.stringify(p.billingPayments||[]));
      SaaS.notifications=JSON.parse(JSON.stringify(p.notifications||[]));
      SaaS.permissionRequests=JSON.parse(JSON.stringify(p.permissionRequests||[]));
      SaaS.globalAudit=JSON.parse(JSON.stringify(p.globalAudit||[]));
      SaaS.save();SaaS.saveAddons?.();SaaS.saveBilling?.();SaaS.saveNotifications?.();SaaS.saveSecurity?.();
      localStorage.setItem("sambrix_global_audit",JSON.stringify(SaaS.globalAudit));
      Object.entries(p.tenants||{}).forEach(([bid,state])=>SaaS.saveTenantState?.(bid,state));
    }else if(p.business?.id){
      const i=SaaS.db.businesses.findIndex(b=>b.id===p.business.id);
      if(i>=0)SaaS.db.businesses[i]=JSON.parse(JSON.stringify(p.business));else SaaS.db.businesses.push(JSON.parse(JSON.stringify(p.business)));
      if(p.tenant)SaaS.saveTenantState?.(p.business.id,p.tenant);
      SaaS.save();
    }
    SaaS.audit?.("BACKUP","Respaldo restaurado",{backupId:id,label:item.label},item.businessId);
    SaaS.renderAll();window.App?.toast?.("Respaldo restaurado");
  }catch(e){console.error(e);window.App?.toast?.("No se pudo restaurar el respaldo")}
};

SaaS.moveToTrash=function(type,item,businessId="",source=""){
  if(!item)return null;
  const entry={
    id:"trash_"+SaaS.uid(),
    type,
    businessId:businessId||SaaS.getContext()?.businessId||"",
    businessName:SaaS.db.businesses.find(b=>b.id===(businessId||SaaS.getContext()?.businessId))?.name||"",
    source,
    originalId:item.id||"",
    data:JSON.parse(JSON.stringify(item)),
    deletedAt:new Date().toISOString(),
    deletedBy:window.FirebaseBridge?.user?.email||SaaS.currentSecurityRole?.()||"local"
  };
  SaaS.trash.push(entry);SaaS.saveBackupSystem();
  SaaS.audit?.("SECURITY","Elemento enviado a papelera",{type,originalId:entry.originalId},entry.businessId);
  SaaS.renderBackupCenter();
  return entry;
};

SaaS.restoreTrash=function(id){
  const entry=SaaS.trash.find(x=>x.id===id);if(!entry)return;
  const state=SaaS.loadTenantState?.(entry.businessId);
  if(!state)return window.App?.toast?.("No se encontró el negocio");
  const map={client:"clients",appointment:"appointments",product:"products",employee:"employees",sale:"sales"};
  const collection=map[entry.type];
  if(!collection)return window.App?.toast?.("Tipo no compatible con restauración");
  state[collection]=state[collection]||[];
  if(!state[collection].some(x=>x.id===entry.data.id))state[collection].push(entry.data);
  SaaS.saveTenantState?.(entry.businessId,state);
  if(SaaS.getContext()?.businessId===entry.businessId){
    window.App.db=state;localStorage.setItem(window.App.KEY,JSON.stringify(state));window.App.renderAll?.();
  }
  SaaS.trash=SaaS.trash.filter(x=>x.id!==id);SaaS.saveBackupSystem();
  SaaS.audit?.("SECURITY","Elemento restaurado desde papelera",{type:entry.type,originalId:entry.originalId},entry.businessId);
  SaaS.renderBackupCenter();window.App?.toast?.("Elemento recuperado");
};

SaaS.deleteTrashForever=function(id){
  const entry=SaaS.trash.find(x=>x.id===id);if(!entry)return;
  if(!confirm("¿Eliminar definitivamente? Esta acción no se puede deshacer."))return;
  SaaS.trash=SaaS.trash.filter(x=>x.id!==id);SaaS.saveBackupSystem();
  SaaS.audit?.("SECURITY","Elemento eliminado definitivamente",{type:entry.type,originalId:entry.originalId},entry.businessId);
  SaaS.renderBackupCenter();
};

SaaS.cleanExpiredTrash=function(){
  const cutoff=Date.now()-SaaS.TRASH_RETENTION_DAYS*86400000;
  SaaS.trash=(SaaS.trash||[]).filter(x=>new Date(x.deletedAt).getTime()>=cutoff);
  SaaS.saveBackupSystem?.();
};

SaaS.renderBackupCenter=function(){
  const list=document.getElementById("backupList");if(!list)return;
  SaaS.cleanExpiredTrash();
  const filter=document.getElementById("backupBusinessFilter");
  if(filter){
    const old=filter.value;
    filter.innerHTML='<option value="">Todos los negocios</option><option value="platform">Plataforma completa</option>'+SaaS.db.businesses.map(b=>`<option value="${b.id}">${b.name}</option>`).join("");
    if(old)filter.value=old;
  }
  const selected=filter?.value||"";
  const backups=[...SaaS.backups].reverse().filter(b=>!selected||(selected==="platform"?!b.businessId:b.businessId===selected));
  list.innerHTML=backups.map(b=>`<div class="row backup-row"><div><strong>${b.label}</strong><small>${new Date(b.createdAt).toLocaleString()}</small><div class="backup-meta">${b.businessId?"Negocio":"Plataforma completa"}</div></div><div class="manage-actions"><button class="btn primary tiny" onclick="SaaS.restoreBackup('${b.id}')">Restaurar</button></div></div>`).join("")||'<div class="muted">No hay respaldos con este filtro.</div>';

  const tf=document.getElementById("trashTypeFilter")?.value||"";
  const trash=[...SaaS.trash].reverse().filter(x=>!tf||x.type===tf);
  document.getElementById("trashList").innerHTML=trash.map(t=>`<div class="row trash-row"><div><strong>${t.data?.name||t.data?.title||t.originalId||"Elemento"}</strong><small>${t.businessName||"Negocio"} · ${t.type}</small><div class="trash-meta">Eliminado ${new Date(t.deletedAt).toLocaleString()} por ${t.deletedBy}</div></div><div class="manage-actions"><button class="btn primary tiny" onclick="SaaS.restoreTrash('${t.id}')">Recuperar</button><button class="btn danger tiny" onclick="SaaS.deleteTrashForever('${t.id}')">Eliminar definitivo</button></div></div>`).join("")||'<div class="muted">La papelera está vacía.</div>';

  document.getElementById("backupCount")&&(document.getElementById("backupCount").textContent=SaaS.backups.length);
  document.getElementById("trashCount")&&(document.getElementById("trashCount").textContent=SaaS.trash.length);
  document.getElementById("retentionDays")&&(document.getElementById("retentionDays").textContent=SaaS.TRASH_RETENTION_DAYS);
  const last=SaaS.backups.at(-1);
  document.getElementById("lastBackupDate")&&(document.getElementById("lastBackupDate").textContent=last?new Date(last.createdAt).toLocaleDateString():"—");
};

const oldRenderAll_148=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_148();SaaS.renderBackupCenter()};
