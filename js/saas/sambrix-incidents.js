SaaS.incidents=SaaS.incidents||[];
SaaS.loadIncidents=function(){try{SaaS.incidents=JSON.parse(localStorage.getItem("sambrix_incidents"))||[]}catch{SaaS.incidents=[]}};
SaaS.saveIncidents=function(){localStorage.setItem("sambrix_incidents",JSON.stringify(SaaS.incidents))};
SaaS.openIncidentModal=function(){
 const sel=document.getElementById("incidentBusiness");
 sel.innerHTML='<option value="">Plataforma general</option>'+(SaaS.db.businesses||[]).map(b=>`<option value="${b.id}">${b.name}</option>`).join("");
 document.getElementById("incidentTitle").value="";document.getElementById("incidentDescription").value="";
 document.getElementById("incidentOwner").value=window.FirebaseBridge?.user?.email||"SuperAdmin";
 document.getElementById("incidentModal").classList.add("open");
};
SaaS.closeIncidentModal=function(){document.getElementById("incidentModal")?.classList.remove("open")};
SaaS.createIncident=function(){
 const title=document.getElementById("incidentTitle").value.trim();if(!title)return alert("Escribe el título del incidente.");
 const i={id:"inc_"+SaaS.uid(),businessId:document.getElementById("incidentBusiness").value,title,priority:document.getElementById("incidentPriority").value,description:document.getElementById("incidentDescription").value.trim(),owner:document.getElementById("incidentOwner").value.trim()||"SuperAdmin",status:"Abierto",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
 SaaS.incidents.push(i);SaaS.saveIncidents();SaaS.audit?.("SUPPORT","Incidente creado",{title:i.title,priority:i.priority},i.businessId);SaaS.closeIncidentModal();SaaS.renderIncidents();window.App?.toast?.("Incidente registrado");
};
SaaS.updateIncidentStatus=function(id,status){
 const i=SaaS.incidents.find(x=>x.id===id);if(!i)return;i.status=status;i.updatedAt=new Date().toISOString();if(status==="Resuelto")i.resolvedAt=i.updatedAt;
 SaaS.saveIncidents();SaaS.audit?.("SUPPORT","Estado de incidente actualizado",{incident:id,status},i.businessId);SaaS.renderIncidents();
};
SaaS.renderIncidents=function(){
 const box=document.getElementById("incidentList");if(!box)return;
 const q=(document.getElementById("incidentSearch")?.value||"").toLowerCase(),f=document.getElementById("incidentStatusFilter")?.value||"";
 const rows=SaaS.incidents.filter(i=>(!f||i.status===f)&&(!q||`${i.title} ${i.description} ${i.owner}`.toLowerCase().includes(q)));
 document.getElementById("incidentOpenCount").textContent=SaaS.incidents.filter(i=>i.status!=="Resuelto").length;
 document.getElementById("incidentCriticalCount").textContent=SaaS.incidents.filter(i=>i.status!=="Resuelto"&&i.priority==="Crítica").length;
 document.getElementById("incidentResolvedCount").textContent=SaaS.incidents.filter(i=>i.status==="Resuelto").length;
 const last=[...SaaS.incidents].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))[0];
 document.getElementById("incidentLastDate").textContent=last?new Date(last.createdAt).toLocaleDateString():"—";
 box.innerHTML=[...rows].reverse().map(i=>{const b=SaaS.db.businesses.find(x=>x.id===i.businessId);return `<div class="row incident-row ${i.priority==="Crítica"?"critical":""} ${i.status==="Resuelto"?"resolved":""}"><div style="flex:1"><strong>${i.title}</strong><small>${b?.name||"Plataforma"} · ${i.owner} · ${new Date(i.createdAt).toLocaleString()}</small><div class="incident-priority">${i.priority} · ${i.status}</div></div><select onchange="SaaS.updateIncidentStatus('${i.id}',this.value)"><option ${i.status==="Abierto"?"selected":""}>Abierto</option><option ${i.status==="En progreso"?"selected":""}>En progreso</option><option ${i.status==="Resuelto"?"selected":""}>Resuelto</option></select></div>`}).join("")||'<div class="muted">No hay incidentes con estos filtros.</div>';
};
const oldRenderAll_163=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_163();SaaS.renderIncidents()};
