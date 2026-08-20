SaaS.operations=SaaS.operations||{tickets:[]};

SaaS.loadOperations=function(){
 try{
  const s=JSON.parse(localStorage.getItem("sambrix_operations"))||{};
  SaaS.operations={tickets:s.tickets||[]};
 }catch{}
};
SaaS.saveOperations=function(){localStorage.setItem("sambrix_operations",JSON.stringify(SaaS.operations));};

SaaS.openSupportTicket=function(){
 const sel=document.getElementById("supportBusiness");
 sel.innerHTML='<option value="">Plataforma general</option>'+(SaaS.db.businesses||[]).map(b=>`<option value="${b.id}">${b.name}</option>`).join("");
 const ctx=SaaS.getContext?.(); if(ctx?.businessId)sel.value=ctx.businessId;
 document.getElementById("supportPriority").value="Media";
 document.getElementById("supportTitle").value="";
 document.getElementById("supportDescription").value="";
 document.getElementById("supportAssignee").value="";
 document.getElementById("supportChannel").value="Panel";
 document.getElementById("opsSupportTicketModal")?.classList.add("open");
};
SaaS.closeSupportTicket=function(){document.getElementById("opsSupportTicketModal")?.classList.remove("open");};

SaaS.createSupportTicket=function(){
 const title=document.getElementById("supportTitle").value.trim();
 if(!title)return alert("Escribe el título del caso.");
 const businessId=document.getElementById("supportBusiness").value;
 const b=SaaS.db.businesses.find(x=>x.id===businessId);
 const t={
  id:"support_"+SaaS.uid(),
  businessId,
  businessName:b?.name||"Plataforma",
  priority:document.getElementById("supportPriority").value,
  title,
  description:document.getElementById("supportDescription").value.trim(),
  assignee:document.getElementById("supportAssignee").value.trim()||"Sin asignar",
  channel:document.getElementById("supportChannel").value,
  status:"Abierto",
  createdAt:new Date().toISOString(),
  createdBy:window.FirebaseBridge?.user?.email||"SuperAdmin"
 };
 SaaS.operations.tickets.push(t);
 SaaS.saveOperations();
 SaaS.audit?.("SUPPORT","Caso de soporte creado",{id:t.id,priority:t.priority,title:t.title},businessId);
 SaaS.closeSupportTicket();SaaS.renderOperations();
 window.App?.toast?.("Caso de soporte creado");
};

SaaS.updateSupportStatus=function(id,status){
 const t=SaaS.operations.tickets.find(x=>x.id===id);if(!t)return;
 t.status=status;t.updatedAt=new Date().toISOString();
 if(status==="Resuelto")t.resolvedAt=t.updatedAt;
 SaaS.saveOperations();
 SaaS.audit?.("SUPPORT","Caso actualizado",{id,status},t.businessId);
 SaaS.renderOperations();
};

SaaS.renderOperations=function(){
 const box=document.getElementById("operationsTicketList");if(!box)return;
 const tickets=SaaS.operations.tickets||[];
 const pf=document.getElementById("opsPriorityFilter")?.value||"";
 const sf=document.getElementById("opsStatusFilter")?.value||"";
 const rows=tickets.filter(t=>(!pf||t.priority===pf)&&(!sf||t.status===sf));

 document.getElementById("opsOpenCount").textContent=tickets.filter(t=>t.status!=="Resuelto").length;
 document.getElementById("opsCriticalCount").textContent=tickets.filter(t=>t.status!=="Resuelto"&&t.priority==="Crítica").length;
 document.getElementById("opsProgressCount").textContent=tickets.filter(t=>t.status==="En proceso").length;
 document.getElementById("opsResolvedCount").textContent=tickets.filter(t=>t.status==="Resuelto").length;

 box.innerHTML=[...rows].reverse().map(t=>`<div class="row ops-row ${t.priority==="Crítica"?"critical":t.priority==="Alta"?"high":""} ${t.status==="Resuelto"?"resolved":""}">
   <div style="flex:1">
    <strong>${t.title}</strong>
    <small>${t.businessName} · ${t.priority} · ${t.status}</small>
    <div class="ops-meta">${t.assignee} · ${t.channel} · ${new Date(t.createdAt).toLocaleString()}${t.description?` · ${t.description}`:""}</div>
   </div>
   <select onchange="SaaS.updateSupportStatus('${t.id}',this.value)">
    <option ${t.status==="Abierto"?"selected":""}>Abierto</option>
    <option ${t.status==="En proceso"?"selected":""}>En proceso</option>
    <option ${t.status==="Esperando negocio"?"selected":""}>Esperando negocio</option>
    <option ${t.status==="Resuelto"?"selected":""}>Resuelto</option>
   </select>
 </div>`).join("")||'<div class="muted">No hay casos con este filtro.</div>';

 const critical=tickets.filter(t=>t.status!=="Resuelto"&&t.priority==="Crítica").length;
 const open=tickets.filter(t=>t.status!=="Resuelto").length;
 const result=document.getElementById("operationsResult");
 if(critical){
  result.className="launch-result blocked";
  result.innerHTML=`<span class="tag">ATENCIÓN INMEDIATA</span><h2>${critical} caso(s) crítico(s)</h2><p>Estos problemas deben atenderse antes de considerarlos operación normal.</p>`;
 }else if(open){
  result.className="launch-result";
  result.innerHTML=`<span class="tag">OPERACIÓN ACTIVA</span><h2>${open} caso(s) abierto(s)</h2><p>Sin críticos, pero todavía hay solicitudes en seguimiento.</p>`;
 }else{
  result.className="launch-result ready";
  result.innerHTML='<span class="tag">OPERACIÓN ESTABLE</span><h2>Sin casos abiertos</h2><p>El historial permanece disponible para seguimiento y aprendizaje.</p>';
 }
};

const oldRenderAll_185=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_185();SaaS.renderOperations();};
