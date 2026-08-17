App.renderHome=function(){
  const a=App.db.appointments.filter(x=>x.date===App.today());
  App.byId("statAppointments").textContent=a.length;
  App.byId("statFinished").textContent=a.filter(x=>x.status==="Finalizada").length;
  App.byId("statSales").textContent=App.money(App.db.cash.filter(x=>x.date===App.today()&&x.type==="Ingreso").reduce((s,x)=>s+Number(x.amount),0));
  App.byId("statLowStock").textContent=App.db.products.filter(p=>p.stock<=p.min).length;
  App.byId("homeAppointments").innerHTML=a.map(x=>`<div class="row"><div><strong>${x.time} · ${App.clientName(x.clientId)}</strong><small>${App.serviceName(x.serviceId)} · ${App.barberName(x.barberId)}</small></div></div>`).join("")||'<div class="muted">Sin citas hoy.</div>';
  App.byId("homeSummary").innerHTML=`<div class="row"><strong>Clientes</strong><strong>${App.db.clients.length}</strong></div><div class="row"><strong>Barberos</strong><strong>${App.db.barbers.length}</strong></div><div class="row"><strong>Productos</strong><strong>${App.db.products.length}</strong></div>`;
};
