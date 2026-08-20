SaaS.activationBusinessId="";

SaaS.activationStatus=function(b){
 const tenant=SaaS.loadTenantState?.(b.id)||{};
 const license=SaaS.licenseFor?.(b);
 const checks=[
  {id:"business",label:"Datos del negocio",ok:!!(b.name&&b.type)},
  {id:"owner",label:"Dueño y correo",ok:!!(b.owner&&b.ownerEmail)},
  {id:"branch",label:"Sucursal principal",ok:!!b.branches?.length},
  {id:"plan",label:"Plan SAMBRIX",ok:!!b.planId},
  {id:"brand",label:"Marca del negocio",ok:!!b.brand?.name},
  {id:"services",label:"Servicios configurados",ok:(tenant.services||[]).length>0},
  {id:"staff",label:"Profesional/personal configurado",ok:(tenant.barbers||tenant.employees||[]).length>0},
  {id:"license",label:"Licencia habilitada",ok:!!license&&!license.blocked}
 ];
 const pct=Math.round(checks.filter(x=>x.ok).length/checks.length*100);
 return {checks,pct,ready:pct===100,delivered:!!b.deliveredAt};
};
SaaS.renderActivation=function(){
 const box=document.getElementById("activationBusinessList");if(!box)return;
 const q=(document.getElementById("activationSearch")?.value||"").toLowerCase();
 const bs=(SaaS.db.businesses||[]).filter(b=>!q||`${b.name} ${b.owner||""}`.toLowerCase().includes(q));
 const states=bs.map(b=>[b,SaaS.activationStatus(b)]);
 const all=(SaaS.db.businesses||[]).map(b=>SaaS.activationStatus(b));
 document.getElementById("activationReadyCount").textContent=all.filter(x=>x.ready&&!x.delivered).length;
 document.getElementById("activationPendingCount").textContent=all.filter(x=>!x.ready).length;
 document.getElementById("activationDeliveredCount").textContent=all.filter(x=>x.delivered).length;
 document.getElementById("activationAverage").textContent=(all.length?Math.round(all.reduce((s,x)=>s+x.pct,0)/all.length):0)+"%";
 box.innerHTML=states.map(([b,s])=>`<div class="row activation-row ${s.delivered?"delivered":s.ready?"ready":""}"><div style="flex:1"><strong>${b.name}</strong><small>${b.owner||"Sin dueño"} · ${s.delivered?"Entregado":s.ready?"Listo para entregar":"Configuración pendiente"}</small><div class="activation-progress"><i style="width:${s.pct}%"></i></div></div><strong>${s.pct}%</strong><button class="btn ${s.ready?"primary":"secondary"} tiny" onclick="SaaS.openActivation('${b.id}')">${s.delivered?"Ver entrega":s.ready?"Entregar":"Revisar"}</button></div>`).join("");
};
SaaS.openActivation=function(id){
 const b=SaaS.db.businesses.find(x=>x.id===id);if(!b)return;
 SaaS.activationBusinessId=id;const s=SaaS.activationStatus(b);
 document.getElementById("activationModalTitle").textContent=b.name;
 document.getElementById("activationChecklist").innerHTML=s.checks.map(c=>`<div class="row"><div class="activation-check ${c.ok?"ok":""}"><i>${c.ok?"✓":"!"}</i><div><strong>${c.label}</strong><small>${c.ok?"Completado":"Pendiente"}</small></div></div></div>`).join("");
 document.getElementById("activationOwnerAccess").innerHTML=`<div class="row"><span>Dueño</span><strong>${b.owner||"—"}</strong></div><div class="row"><span>Correo</span><strong>${b.ownerEmail||"—"}</strong></div><div class="row"><span>Plan</span><strong>${SaaS.getPlan(b.planId)?.name||"—"}</strong></div><div class="row"><span>Estado</span><strong>${s.delivered?"Entregado":s.ready?"Listo":"Pendiente"}</strong></div>`;
 document.getElementById("activationDeliverBtn").disabled=!s.ready||s.delivered;
 document.getElementById("activationDeliverBtn").textContent=s.delivered?"Ya entregado":"Marcar como entregado";
 document.getElementById("activationModal")?.classList.add("open");
};
SaaS.closeActivation=function(){document.getElementById("activationModal")?.classList.remove("open")};
SaaS.previewActivation=function(){
 const id=SaaS.activationBusinessId;if(!id)return;
 SaaS.closeActivation();SaaS.enterSupportMode?.(id);
};
SaaS.deliverActivation=function(){
 const b=SaaS.db.businesses.find(x=>x.id===SaaS.activationBusinessId);if(!b)return;
 const s=SaaS.activationStatus(b);if(!s.ready)return alert("Todavía faltan configuraciones.");
 if(!confirm(`¿Confirmar que ${b.name} está listo y fue entregado al dueño?`))return;
 b.deliveredAt=new Date().toISOString();b.deliveredBy=window.FirebaseBridge?.user?.email||"SuperAdmin";b.status="Activo";
 SaaS.save();SaaS.audit?.("BUSINESS","Negocio entregado al dueño",{owner:b.owner,ownerEmail:b.ownerEmail},b.id);
 SaaS.pushNotification?.({type:"system",businessId:b.id,entityId:b.id,key:`activation:${b.id}`,title:"SAMBRIX activado",message:`${b.name} fue marcado como listo y entregado.`,action:"inicio"});
 SaaS.saveNotifications?.();SaaS.closeActivation();SaaS.renderAll();window.App?.toast?.("Negocio entregado");
};
const oldRenderAll_152=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_152();SaaS.renderActivation()};
