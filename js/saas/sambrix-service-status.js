SaaS.serviceStatus=SaaS.serviceStatus||{notices:[]};

SaaS.loadServiceStatus=function(){
 try{
  const s=JSON.parse(localStorage.getItem("sambrix_service_status"))||{};
  SaaS.serviceStatus={notices:s.notices||[]};
 }catch{}
};
SaaS.saveServiceStatus=function(){localStorage.setItem("sambrix_service_status",JSON.stringify(SaaS.serviceStatus));};

SaaS.openServiceNotice=function(){
 document.getElementById("serviceNoticeType").value="Incidencia";
 document.getElementById("serviceNoticeImpact").value="Bajo";
 document.getElementById("serviceNoticeStatus").value="Investigando";
 document.getElementById("serviceNoticeScope").value="Todos los negocios";
 document.getElementById("serviceNoticeTitle").value="";
 document.getElementById("serviceNoticeMessage").value="";
 document.getElementById("serviceNoticeModal")?.classList.add("open");
};
SaaS.closeServiceNotice=function(){document.getElementById("serviceNoticeModal")?.classList.remove("open");};

SaaS.createServiceNotice=function(){
 const title=document.getElementById("serviceNoticeTitle").value.trim();
 const message=document.getElementById("serviceNoticeMessage").value.trim();
 if(!title||!message)return alert("Escribe título y mensaje.");
 const n={
  id:"status_"+SaaS.uid(),
  type:document.getElementById("serviceNoticeType").value,
  impact:document.getElementById("serviceNoticeImpact").value,
  status:document.getElementById("serviceNoticeStatus").value,
  scope:document.getElementById("serviceNoticeScope").value,
  title,message,
  createdAt:new Date().toISOString(),
  createdBy:window.FirebaseBridge?.user?.email||"SuperAdmin"
 };
 SaaS.serviceStatus.notices.push(n);SaaS.saveServiceStatus();
 SaaS.audit?.("STATUS","Comunicación de servicio creada",{id:n.id,type:n.type,impact:n.impact,status:n.status},"");
 SaaS.closeServiceNotice();SaaS.renderServiceStatus();
 window.App?.toast?.("Estado publicado");
};

SaaS.updateServiceNotice=function(id,status){
 const n=SaaS.serviceStatus.notices.find(x=>x.id===id);if(!n)return;
 n.status=status;n.updatedAt=new Date().toISOString();
 if(status==="Resuelto")n.resolvedAt=n.updatedAt;
 SaaS.saveServiceStatus();
 SaaS.audit?.("STATUS","Estado de servicio actualizado",{id,status},"");
 SaaS.renderServiceStatus();
};

SaaS.renderServiceStatus=function(){
 const activeBox=document.getElementById("serviceActiveList");if(!activeBox)return;
 const notices=SaaS.serviceStatus.notices||[];
 const active=notices.filter(n=>n.status!=="Resuelto");
 const incidents=active.filter(n=>n.type==="Incidencia");
 const maintenance=active.filter(n=>n.type==="Mantenimiento");
 const critical=active.filter(n=>n.impact==="Crítico").length;
 const high=active.filter(n=>n.impact==="Alto").length;

 document.getElementById("serviceIncidentCount").textContent=incidents.length;
 document.getElementById("serviceMaintenanceCount").textContent=maintenance.length;
 document.getElementById("serviceNoticeCount").textContent=notices.length;
 document.getElementById("serviceGlobalState").textContent=critical?"CRÍTICO":high?"DEGRADADO":active.length?"AVISO":"OPERATIVO";

 const row=n=>`<div class="row service-row ${n.impact.toLowerCase()} ${n.status==="Resuelto"?"resolved":""}">
   <div style="flex:1"><strong>${n.title}</strong><small>${n.type} · ${n.impact} · ${n.status} · ${n.scope}</small>
   <div class="service-message">${n.message}</div></div>
   <select onchange="SaaS.updateServiceNotice('${n.id}',this.value)">
    <option ${n.status==="Investigando"?"selected":""}>Investigando</option>
    <option ${n.status==="Identificado"?"selected":""}>Identificado</option>
    <option ${n.status==="Monitoreando"?"selected":""}>Monitoreando</option>
    <option ${n.status==="Programado"?"selected":""}>Programado</option>
    <option ${n.status==="Resuelto"?"selected":""}>Resuelto</option>
   </select>
 </div>`;

 activeBox.innerHTML=[...active].reverse().map(row).join("")||'<div class="muted">No hay incidencias ni mantenimientos activos.</div>';
 document.getElementById("serviceNoticeList").innerHTML=[...notices].reverse().slice(0,20).map(row).join("")||'<div class="muted">Todavía no hay comunicaciones.</div>';

 const result=document.getElementById("serviceStatusResult");
 if(critical){
  result.className="launch-result blocked";
  result.innerHTML=`<span class="tag">SERVICIO CRÍTICO</span><h2>${critical} comunicación(es) crítica(s)</h2><p>SuperAdmin debe mantener informados a los negocios hasta resolverlas.</p>`;
 }else if(active.length){
  result.className="launch-result";
  result.innerHTML=`<span class="tag">AVISO ACTIVO</span><h2>${active.length} comunicación(es) activa(s)</h2><p>La plataforma tiene información operativa que debe mantenerse actualizada.</p>`;
 }else{
  result.className="launch-result ready";
  result.innerHTML='<span class="tag">OPERATIVO</span><h2>Sin incidencias activas</h2><p>SAMBRIX aparece operando normalmente.</p>';
 }
};

const oldRenderAll_186=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_186();SaaS.renderServiceStatus();};
