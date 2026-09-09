App.renderHome=function(){
  const a=App.db.appointments.filter(x=>x.date===App.today());
  App.byId("statAppointments").textContent=a.length;
  App.byId("statFinished").textContent=a.filter(x=>x.status==="Finalizada").length;
  App.byId("statSales").textContent=App.money(App.db.cash.filter(x=>x.date===App.today()&&x.type==="Ingreso").reduce((s,x)=>s+Number(x.amount),0));
  App.byId("statLowStock").textContent=App.db.products.filter(p=>p.stock<=p.min).length;
  App.byId("homeAppointments").innerHTML=a.map(x=>{const b=App.db.barbers.find(z=>z.id===x.barberId),photo=b?.photo||App.db.business.clientApp?.barberPhotos?.[x.barberId]||"";return `<div class="row home-appt-row">${photo?`<img class="mini-avatar" src="${photo}" alt="${b?.name||"Profesional"}">`:""}<div><strong>${x.time} · ${App.clientName(x.clientId)}</strong><small>${App.serviceName(x.serviceId)} · ${App.barberName(x.barberId)}</small></div></div>`}).join("")||'<div class="muted">Sin citas hoy.</div>';
  const team=App.db.barbers.slice(0,6).map(b=>{const photo=b.photo||App.db.business.clientApp?.barberPhotos?.[b.id]||"";return `<div class="home-team-person">${photo?`<img class="mini-avatar" src="${photo}" alt="${b.name}">`:""}<small>${b.name}</small></div>`}).join("");
  const hasInventory=window.SaaS?.featureAllowed?.("inventario")??true;
  App.byId("homeSummary").innerHTML=`<div class="row"><strong>Clientes</strong><strong>${App.db.clients.length}</strong></div><div class="row"><strong>${App.businessVocabulary?.().staff||"Profesionales"}</strong><strong>${App.db.barbers.length}</strong></div>${team?`<div class="home-team-strip">${team}</div>`:""}${hasInventory?`<div class="row"><strong>Productos</strong><strong>${App.db.products.length}</strong></div>`:""}`;
};


/* ===== FASE 20.13 — IDENTIDAD DINÁMICA DEL NEGOCIO ===== */
const oldRenderHome_2013=App.renderHome;
App.renderHome=function(){
  oldRenderHome_2013();
  const b=window.SaaS?.currentBusiness?.();
  const hero=document.querySelector("#inicio .owner-hero h1, #inicio .hero h1, #inicio h1");
  if(hero && b){
    hero.innerHTML=`${b.name}<br><span>Bajo control.</span>`;
  }
  const subtitle=document.querySelector("#inicio .owner-hero p, #inicio .hero p");
  if(subtitle && b){
    subtitle.textContent=`Panel principal · ${b.type||"Negocio"}`;
  }
};
App.sambrixBusinessHomeIdentity=true;

/* ===== FASE 20.25 — INICIO COHERENTE POR PLAN ===== */
App.openBasicReceipt=function(){
  const today=App.today();
  const completed=App.db.appointments.filter(a=>a.date===today&&["Completada","Completado","Finalizada","Finalizado"].includes(a.status));
  const last=completed.slice().sort((a,b)=>(b.time||"").localeCompare(a.time||""))[0];
  if(last && typeof App.printReceipt==="function")return App.printReceipt(last.id);
  App.toast("El comprobante se genera al completar/cobrar un servicio");
};

document.addEventListener("DOMContentLoaded",()=>{
  App.byId("homeReceiptBtn")?.addEventListener("click",()=>{
    if(window.SaaS?.featureAllowed?.("recibos"))App.go("recibos");
    else App.openBasicReceipt();
  });
});
