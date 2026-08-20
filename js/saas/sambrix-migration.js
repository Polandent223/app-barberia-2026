SaaS.migrationSnapshots=SaaS.migrationSnapshots||[];
SaaS.loadMigrationSnapshots=function(){try{SaaS.migrationSnapshots=JSON.parse(localStorage.getItem("sambrix_migration_snapshots"))||[]}catch{SaaS.migrationSnapshots=[]}};
SaaS.saveMigrationSnapshots=function(){localStorage.setItem("sambrix_migration_snapshots",JSON.stringify(SaaS.migrationSnapshots))};

SaaS.snapshotPayload=function(){
 return {
  schema:"SAMBRIX-SNAPSHOT-1",
  createdAt:new Date().toISOString(),
  businesses:SaaS.db?.businesses||[],
  plans:SaaS.db?.plans||[],
  subscriptions:SaaS.db?.subscriptions||[],
  productionConfig:SaaS.productionConfig||{},
  releases:SaaS.releases||[],
  certifications:SaaS.certifications||[]
 };
};
SaaS.snapshotHash=function(payload){
 const s=JSON.stringify(payload);let h=2166136261;
 for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}
 return ("00000000"+(h>>>0).toString(16)).slice(-8).toUpperCase();
};
SaaS.createMigrationSnapshot=function(){
 const payload=SaaS.snapshotPayload(),hash=SaaS.snapshotHash(payload);
 const snap={id:"snap_"+SaaS.uid(),code:"SNAP-"+Date.now(),createdAt:payload.createdAt,createdBy:window.FirebaseBridge?.user?.email||"SuperAdmin",hash,businessCount:payload.businesses.length,payload};
 SaaS.migrationSnapshots.push(snap);
 if(SaaS.migrationSnapshots.length>10)SaaS.migrationSnapshots=SaaS.migrationSnapshots.slice(-10);
 SaaS.saveMigrationSnapshots();SaaS.audit?.("SYSTEM","Snapshot previo a migración creado",{code:snap.code,hash,businesses:snap.businessCount},"");
 SaaS.renderMigrationCenter();window.App?.toast?.("Snapshot creado");
};
SaaS.verifySnapshot=function(snap){return !!snap&&SaaS.snapshotHash(snap.payload)===snap.hash};
SaaS.renderMigrationCenter=function(){
 const box=document.getElementById("migrationScopeList");if(!box)return;
 const latest=SaaS.migrationSnapshots[SaaS.migrationSnapshots.length-1],valid=latest?SaaS.verifySnapshot(latest):false;
 document.getElementById("migrationBusinessCount").textContent=(SaaS.db.businesses||[]).length;
 document.getElementById("migrationSnapshotCount").textContent=SaaS.migrationSnapshots.length;
 document.getElementById("migrationLastBackup").textContent=latest?new Date(latest.createdAt).toLocaleDateString():"—";
 document.getElementById("migrationIntegrity").textContent=latest?(valid?"OK":"ERROR"):"—";
 const scope=[
  ["Negocios y configuración",(SaaS.db.businesses||[]).length+" negocio(s)"],
  ["Planes SaaS",(SaaS.db.plans||[]).length+" plan(es)"],
  ["Suscripciones",(SaaS.db.subscriptions||[]).length+" registro(s)"],
  ["Releases",(SaaS.releases||[]).length+" versión(es)"],
  ["Certificaciones",(SaaS.certifications||[]).length+" certificación(es)"],
  ["Configuración de producción",SaaS.productionConfig?.environment||"test"]
 ];
 box.innerHTML=scope.map(x=>`<div class="row migration-row"><div><strong>${x[0]}</strong><small>${x[1]}</small></div><span class="status ok">Incluido</span></div>`).join("");
 document.getElementById("migrationHistoryList").innerHTML=[...SaaS.migrationSnapshots].reverse().map(s=>`<div class="row migration-history"><div><strong class="snapshot-code">${s.code}</strong><small>${new Date(s.createdAt).toLocaleString()} · ${s.businessCount} negocio(s) · hash ${s.hash}</small></div><span class="status ${SaaS.verifySnapshot(s)?"ok":""}">${SaaS.verifySnapshot(s)?"Íntegro":"Error"}</span></div>`).join("")||'<div class="muted">Todavía no hay snapshots.</div>';
 const r=document.getElementById("migrationResult");
 if(!latest){r.className="launch-result";r.innerHTML='<span class="tag">PENDIENTE</span><h2>Crea un snapshot antes de publicar</h2><p>Este respaldo protege la configuración central del SaaS. No sustituye un backup real del servidor Firebase.</p>'}
 else if(!valid){r.className="launch-result blocked";r.innerHTML='<span class="tag">ERROR</span><h2>El último snapshot no supera integridad</h2><p>Crea uno nuevo antes de continuar.</p>'}
 else{r.className="launch-result ready";r.innerHTML='<span class="tag">PROTEGIDO</span><h2>Snapshot local verificado</h2><p>Existe un punto de recuperación de configuración. Antes de producción también debe existir respaldo real de Firebase.</p>'}
};
const oldRenderAll_161=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_161();SaaS.renderMigrationCenter()};
