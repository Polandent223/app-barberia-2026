SaaS.crmData={clients:[],appointments:[]};

SaaS.loadCRMForBusiness=function(businessId){
  if(!businessId)return {clients:[],appointments:[]};
  let data={clients:[],appointments:[]};
  try{
    const raw=localStorage.getItem(SaaS.tenantKey(businessId));
    if(raw){
      const db=JSON.parse(raw);
      data.clients=db.clients||[];
      data.appointments=db.appointments||[];
    }else if(SaaS.getContext()?.businessId===businessId){
      data.clients=window.App?.db?.clients||[];
      data.appointments=window.App?.db?.appointments||[];
    }
  }catch{}
  return data;
};

SaaS.crmProfile=function(client,appointments){
  const visits=appointments.filter(a=>a.clientId===client.id&&a.status!=="Cancelada");
  const completed=visits.filter(a=>["Completada","Pagada"].includes(a.status));
  const spend=completed.reduce((s,a)=>s+Number(a.total||a.price||0),0);
  const dates=visits.map(a=>new Date(`${a.date||"1970-01-01"}T${a.time||"12:00"}`)).filter(d=>!isNaN(d));
  const last=dates.length?new Date(Math.max(...dates.map(d=>d.getTime()))):null;
  const days=last?Math.floor((Date.now()-last.getTime())/86400000):9999;
  let segment="new";
  if(completed.length>=8||spend>=500)segment="vip";
  else if(completed.length>=2)segment="recurring";
  if(completed.length>=2&&days>60)segment="risk";
  return {visits:completed.length,spend,last,days,segment};
};

SaaS.renderCRM=function(){
  const select=document.getElementById("crmBusinessSelect");if(!select)return;
  const old=select.value;
  select.innerHTML='<option value="">Seleccionar negocio</option>'+SaaS.db.businesses.map(b=>`<option value="${b.id}">${b.name}</option>`).join("");
  if(old&&SaaS.db.businesses.some(b=>b.id===old))select.value=old;
  else if(SaaS.getContext()?.businessId)select.value=SaaS.getContext().businessId;

  const businessId=select.value;
  const data=SaaS.loadCRMForBusiness(businessId);
  const rows=data.clients.map(c=>({...c,...SaaS.crmProfile(c,data.appointments)}));
  SaaS.crmData={...data,rows};

  const count=s=>rows.filter(x=>x.segment===s).length;
  document.getElementById("crmTotalClients").textContent=rows.length;
  document.getElementById("crmRecurring").textContent=count("recurring");
  document.getElementById("crmVIP").textContent=count("vip");
  document.getElementById("crmAtRisk").textContent=count("risk");

  const seg=document.getElementById("crmSegments");
  seg.innerHTML=[
    ["new","Nuevos",count("new"),"Primera etapa"],
    ["recurring","Recurrentes",count("recurring"),"Ya regresaron"],
    ["vip","VIP",count("vip"),"Alto valor"],
    ["risk","Por recuperar",count("risk"),"Más de 60 días"]
  ].map(x=>`<div class="crm-segment"><span class="crm-badge ${x[0]}">${x[1]}</span><b>${x[2]}</b><small>${x[3]}</small></div>`).join("");

  const rec=[];
  if(count("risk"))rec.push(`Hay ${count("risk")} cliente(s) que podrían recuperarse con una promoción o mensaje.`);
  if(count("new")>count("recurring"))rec.push("Conviene crear una recompensa para lograr una segunda visita.");
  if(count("vip"))rec.push(`Protege a tus ${count("vip")} cliente(s) VIP con beneficios exclusivos.`);
  if(!rows.length)rec.push("Todavía no hay datos suficientes de clientes para generar recomendaciones.");
  document.getElementById("crmRecommendations").innerHTML=rec.map(x=>`<div class="row"><span>${x}</span></div>`).join("");

  SaaS.renderCRMTable();
};

SaaS.renderCRMTable=function(){
  const box=document.getElementById("crmClientTable");if(!box)return;
  const q=(document.getElementById("crmSearch")?.value||"").toLowerCase().trim();
  const filter=document.getElementById("crmSegmentFilter")?.value||"";
  const rows=(SaaS.crmData.rows||[]).filter(c=>{
    const text=`${c.name||""} ${c.phone||""} ${c.email||""}`.toLowerCase();
    return (!q||text.includes(q))&&(!filter||c.segment===filter);
  });
  const names={new:"Nuevo",recurring:"Recurrente",vip:"VIP",risk:"Por recuperar"};
  box.innerHTML=`<table class="sambrix-table"><thead><tr><th>Cliente</th><th>Segmento</th><th>Visitas</th><th>Valor registrado</th><th>Última visita</th><th>Contacto</th></tr></thead><tbody>${rows.map(c=>`<tr>
    <td><strong>${c.name||"Cliente"}</strong></td>
    <td><span class="crm-badge ${c.segment}">${names[c.segment]}</span></td>
    <td>${c.visits}</td><td>$${Number(c.spend||0).toFixed(2)}</td>
    <td>${c.last?c.last.toLocaleDateString():"—"}</td>
    <td>${c.phone||c.email||"—"}</td>
  </tr>`).join("")}</tbody></table>`;
};

const oldRenderAll_140=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_140();SaaS.renderCRM()};
