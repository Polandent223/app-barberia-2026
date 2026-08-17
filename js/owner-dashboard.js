App.renderOwnerDashboard=function(){
  if(!App.byId("ownerMonthSales"))return;
  const month=App.today().slice(0,7);
  const monthSales=App.db.sales.filter(s=>s.date.startsWith(month)).reduce((sum,s)=>sum+Number(s.total||0),0);
  const monthServices=App.db.sales.filter(s=>s.date.startsWith(month)).reduce((sum,s)=>sum+(s.items||[]).filter(i=>i.name).reduce((q,i)=>q+Number(i.qty||1),0),0);
  const todayAppts=App.db.appointments.filter(a=>a.date===App.today()&&a.status!=="Cancelada").sort((a,b)=>a.time.localeCompare(b.time));
  const todayRevenue=App.db.cash.filter(c=>c.date===App.today()&&c.type==="Ingreso").reduce((s,c)=>s+Number(c.amount||0),0);
  const now=new Date().toTimeString().slice(0,5);
  const next=todayAppts.find(a=>a.time>=now&&a.status!=="Finalizada");

  App.byId("ownerMonthSales").textContent=App.money(monthSales);
  App.byId("ownerMonthServices").textContent=`${monthServices} servicios realizados`;
  App.byId("ownerTodayAppointments").textContent=todayAppts.length;
  App.byId("ownerNextAppointment").textContent=next?`${next.time} · ${App.clientName(next.clientId)}`:"Sin próximas citas";
  App.byId("ownerTodayRevenue").textContent=App.money(todayRevenue);
  App.byId("ownerTodayTransactions").textContent=`${App.db.cash.filter(c=>c.date===App.today()).length} movimientos`;
  App.byId("ownerClients").textContent=App.db.clients.length;
  App.byId("ownerVipClients").textContent=`${App.db.clients.filter(c=>(c.visits||0)>=8||(c.points||0)>=100).length} VIP`;
  App.byId("ownerLowStock").textContent=App.db.products.filter(p=>Number(p.stock)<=Number(p.min)).length;

  App.byId("ownerUpcomingAppointments").innerHTML=todayAppts.slice(0,6).map(a=>`
    <div class="row"><div><strong>${a.time} · ${App.clientName(a.clientId)}</strong><small>${App.serviceName(a.serviceId)} · ${App.barberName(a.barberId)}</small></div><span class="client-badge">${a.status}</span></div>`).join("")||'<div class="muted">Sin citas para hoy.</div>';

  const perf=App.db.barbers.map(b=>{
    const sales=App.db.sales.filter(s=>s.date.startsWith(month)&&s.barberName===b.name).reduce((sum,s)=>sum+Number(s.total||0),0);
    return {b,sales};
  }).sort((a,b)=>b.sales-a.sales);
  const max=Math.max(1,...perf.map(x=>x.sales));
  App.byId("ownerBarberPerformance").innerHTML=perf.map(x=>`
    <div class="row"><div style="width:100%"><strong>${x.b.name}</strong><small>${App.money(x.sales)} este mes</small><div class="progress"><span style="width:${Math.min(100,x.sales/max*100)}%"></span></div></div></div>`).join("")||'<div class="muted">Sin datos.</div>';

  const svc={};
  App.db.sales.filter(s=>s.date.startsWith(month)).forEach(s=>(s.items||[]).forEach(i=>svc[i.name]=(svc[i.name]||0)+Number(i.qty||1)));
  App.byId("ownerTopServices").innerHTML=Object.entries(svc).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,count],i)=>`
    <div class="row"><div><strong>${i+1}. ${name}</strong><small>${count} vendidos</small></div><strong>${count}</strong></div>`).join("")||'<div class="muted">Aún no hay ventas este mes.</div>';

  const alerts=[];
  App.db.products.filter(p=>Number(p.stock)<=Number(p.min)).forEach(p=>alerts.push({critical:Number(p.stock)<=0,text:`${p.name}: ${p.stock} unidades`}));
  App.db.appointments.filter(a=>a.date===App.today()&&a.status==="Pendiente").forEach(a=>alerts.push({critical:false,text:`Cita pendiente ${a.time} · ${App.clientName(a.clientId)}`}));
  App.byId("ownerAlerts").innerHTML=alerts.map(a=>`<div class="row alert-row ${a.critical?"critical":""}"><strong>${a.text}</strong></div>`).join("")||'<div class="muted">Todo bajo control.</div>';
};
