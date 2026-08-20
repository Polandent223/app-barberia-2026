App.clientCart=[];
App.clientSelection={serviceId:"",barberId:"",time:""};
App.parseTime=t=>{const [h,m]=t.split(":").map(Number);return h*60+m};
App.fmtTime=n=>`${String(Math.floor(n/60)).padStart(2,"0")}:${String(n%60).padStart(2,"0")}`;
App.slotAvailable=function(barberId,date,time,duration){
  const start=App.parseTime(time),open=App.parseTime(App.db.business.open),close=App.parseTime(App.db.business.close);
  if(start<open||start+duration>close)return false;
  return !App.db.appointments.some(a=>{if(a.barberId!==barberId||a.date!==date||a.status==="Cancelada")return false;const s=App.db.services.find(x=>x.id===a.serviceId);const as=App.parseTime(a.time),ad=Number(s?.duration||40);return start<as+ad&&start+duration>as});
};
App.availableBarbers=(date,time,duration)=>App.db.barbers.filter(b=>App.slotAvailable(b.id,date,time,duration));
App.openClientApp=()=>{App.show("clientApp");App.renderClientApp()};
App.closeClientApp=()=>App.hide("clientApp");
App.clientGo=function(page){document.querySelectorAll(".client-page").forEach(x=>x.classList.toggle("active",x.id===page));document.querySelectorAll(".client-bottom button").forEach(x=>x.classList.toggle("active",x.dataset.clientPage===page));if(page==="clientBook")App.renderClientBooking();if(page==="clientShop")App.renderClientShop()};
App.selectClientService=id=>{App.clientSelection.serviceId=id;App.clientSelection.time="";App.renderClientBooking();const s=App.db.services.find(x=>x.id===id);App.toast(`Servicio seleccionado: ${s?.name||''}`)};
App.selectClientBarber=id=>{App.clientSelection.barberId=id;App.clientSelection.time="";App.renderClientBooking();App.toast(id?`Barbero seleccionado: ${App.barberName(id)}`:'Cualquier barbero disponible')};
App.selectClientTime=t=>{App.clientSelection.time=t;App.renderClientSlots()};
App.renderClientApp=function(){
  App.byId("clientServicesHome").innerHTML=App.db.services.map(s=>`<article class="client-service"><h3>${s.name}</h3><div class="muted">${s.duration} min</div><div class="big">${App.money(s.price)}</div></article>`).join("");
  const photos=App.db.business.clientApp.barberPhotos||{};App.byId("clientBarbersHome").innerHTML=App.db.barbers.map(b=>`<article class="client-barber"><img src="${photos[b.id]||""}" style="width:100%;height:150px;object-fit:cover;border-radius:13px;margin-bottom:8px"><h3>${b.name}</h3><div class="muted">Disponible por horario</div></article>`).join("");
  if(!App.val("clientBookDate"))App.byId("clientBookDate").value=App.today();App.renderClientBooking();App.renderClientShop();App.applyClientCustomization();
};
App.renderClientBooking=function(){
  const selectedService=App.db.services.find(s=>s.id===App.clientSelection.serviceId);
  const selectedBarber=App.clientSelection.barberId?App.db.barbers.find(b=>b.id===App.clientSelection.barberId):null;

  App.byId("clientServicePicker").innerHTML=App.db.services.map(s=>`
    <article class="client-service choice-card ${App.clientSelection.serviceId===s.id?"selected":""}" onclick="App.selectClientService('${s.id}')">
      <h3>${s.name}</h3><div class="muted">${s.duration} min</div><div class="big">${App.money(s.price)}</div>
      <button class="btn ${App.clientSelection.serviceId===s.id?"selected-btn":"secondary"}" type="button">${App.clientSelection.serviceId===s.id?"Elegido":"Elegir"}</button>
    </article>`).join("");

  App.byId("clientBarberPicker").innerHTML=`
    <article class="client-barber choice-card ${App.clientSelection.barberId===""?"selected":""}" onclick="App.selectClientBarber('')">
      <h3>Cualquiera disponible</h3><div class="muted">Asignaremos un barbero libre.</div>
      <button class="btn ${App.clientSelection.barberId===""?"selected-btn":"secondary"}" type="button">${App.clientSelection.barberId===""?"Elegido":"Elegir"}</button>
    </article>`+
    App.db.barbers.map(b=>`
    <article class="client-barber choice-card ${App.clientSelection.barberId===b.id?"selected":""}" onclick="App.selectClientBarber('${b.id}')">
      <h3>${b.name}</h3><div class="muted">Ver horarios disponibles.</div>
      <button class="btn ${App.clientSelection.barberId===b.id?"selected-btn":"secondary"}" type="button">${App.clientSelection.barberId===b.id?"Elegido":"Elegir"}</button>
    </article>`).join("");

  let summary=[];
  if(selectedService)summary.push(`Servicio: <strong>${selectedService.name}</strong>`);
  summary.push(`Barbero: <strong>${selectedBarber?selectedBarber.name:"Cualquiera disponible"}</strong>`);
  if(App.clientSelection.time)summary.push(`Hora: <strong>${App.clientSelection.time}</strong>`);
  const existing=document.getElementById("clientSelectionSummary");
  if(existing)existing.remove();
  App.byId("clientBarberPicker").insertAdjacentHTML("afterend",`<div id="clientSelectionSummary" class="selection-summary">${summary.join(" · ")}</div>`);

  App.renderClientSlots();
  App.renderClientBookingSummary();
};
App.renderClientSlots=function(){
  if(!App.clientSelection.serviceId){App.byId("clientSlots").innerHTML='<div class="muted">Primero elige un servicio.</div>';return}
  const s=App.db.services.find(x=>x.id===App.clientSelection.serviceId),date=App.val("clientBookDate")||App.today(),open=App.parseTime(App.db.business.open),close=App.parseTime(App.db.business.close),slots=[];
  for(let n=open;n+Number(s.duration)<=close;n+=30){const t=App.fmtTime(n);const ok=App.clientSelection.barberId?App.slotAvailable(App.clientSelection.barberId,date,t,s.duration):App.availableBarbers(date,t,s.duration).length>0;if(ok)slots.push(t)}
  App.byId("clientSlots").innerHTML=slots.length?slots.map(t=>`<button class="slot ${App.clientSelection.time===t?"selected":""}" onclick="App.selectClientTime('${t}')">${t}</button>`).join(""):'<div class="muted">No hay horarios disponibles.</div>';
};
App.submitClientReservation=function(){
  const s=App.db.services.find(x=>x.id===App.clientSelection.serviceId),date=App.val("clientBookDate"),time=App.clientSelection.time,name=App.val("clientBookName"),phone=App.val("clientBookPhone");
  if(!s||!date||!time||!name||!phone)return App.toast("Completa servicio, horario y tus datos");
  let barberId=App.clientSelection.barberId;if(!barberId){const list=App.availableBarbers(date,time,s.duration);if(!list.length)return App.toast("Horario no disponible");barberId=list[0].id}
  let c=App.db.clients.find(x=>(x.phone||"").replace(/\D/g,"")===phone.replace(/\D/g,""));if(!c){c={id:App.uid(),name,phone,birthday:"",frequency:20,style:App.val("clientBookNote"),points:0,visits:0,lastVisit:""};App.db.clients.push(c)}
  App.db.appointments.push({id:App.uid(),clientId:c.id,barberId,serviceId:s.id,date,time,status:"Confirmada"});App.persist();App.clientSelection={serviceId:"",barberId:"",time:""};App.clientGo("clientAppointments");App.byId("clientLookupPhone").value=phone;App.lookupClientAppointments();
};
App.lookupClientAppointments=function(){const phone=App.val("clientLookupPhone").replace(/\D/g,""),c=App.db.clients.find(x=>(x.phone||"").replace(/\D/g,"")===phone);App.byId("clientAppointmentsList").innerHTML=c?App.db.appointments.filter(a=>a.clientId===c.id).map(a=>`<div class="row"><strong>${a.date} ${a.time}</strong><small>${App.serviceName(a.serviceId)} · ${App.barberName(a.barberId)}</small></div>`).join(""):'<div class="muted">No encontrado.</div>'};
App.lookupClientProfile=function(){const phone=App.val("clientProfilePhone").replace(/\D/g,""),c=App.db.clients.find(x=>(x.phone||"").replace(/\D/g,"")===phone);App.byId("clientProfileData").innerHTML=c?`<div class="stats"><article><span>Visitas</span><b>${c.visits||0}</b></article><article><span>Puntos</span><b>${c.points||0}</b></article></div>`:'<div class="muted">No encontrado.</div>'};
App.renderClientShop=function(){App.byId("clientShopList").innerHTML=App.db.products.filter(p=>p.stock>0&&p.price>0).map(p=>`<article class="shop-card"><h3>${p.name}</h3><div class="muted">${p.stock} disponibles</div><div class="big">${App.money(p.price)}</div></article>`).join("")||'<div class="muted">No hay productos disponibles.</div>'};


App.renderClientBookingSummary=function(){
  if(!App.byId("clientBookingSummary"))return;
  const s=App.db.services.find(x=>x.id===App.clientSelection.serviceId);
  const b=App.db.barbers.find(x=>x.id===App.clientSelection.barberId);
  const date=App.val("clientBookDate")||"—";
  App.byId("clientBookingSummary").innerHTML=`
    <div class="summary-line"><span>Servicio</span><strong>${s?.name||"Sin seleccionar"}</strong></div>
    <div class="summary-line"><span>Barbero</span><strong>${App.clientSelection.barberId===""?"Cualquiera disponible":(b?.name||"Sin seleccionar")}</strong></div>
    <div class="summary-line"><span>Fecha</span><strong>${date}</strong></div>
    <div class="summary-line"><span>Hora</span><strong>${App.clientSelection.time||"Sin seleccionar"}</strong></div>
    <div class="summary-line"><span>Total</span><strong>${s?App.money(s.price):"—"}</strong></div>`;
};
App.addShopItem=function(id){
  const p=App.db.products.find(x=>x.id===id);if(!p)return;
  const item=App.clientCart.find(x=>x.id===id);
  if(item){if(item.qty>=p.stock)return App.toast("No hay más stock");item.qty++}
  else App.clientCart.push({id:p.id,name:p.name,price:Number(p.price),qty:1});
  App.renderClientShop();
};
App.renderClientShop=function(){
  App.byId("clientShopList").innerHTML=App.db.products.filter(p=>p.stock>0&&p.price>0).map(p=>{
    const item=App.clientCart.find(x=>x.id===p.id);
    return `<article class="shop-card"><span class="qty-badge">${p.stock} disp.</span><h3>${p.name}</h3><div class="muted">${p.category}</div><div class="big">${App.money(p.price)}</div><button class="btn primary" onclick="App.addShopItem('${p.id}')">${item?`Agregar otro (${item.qty})`:"Agregar"}</button></article>`;
  }).join("")||'<div class="muted">No hay productos disponibles.</div>';
  const count=App.clientCart.reduce((s,x)=>s+x.qty,0),total=App.clientCart.reduce((s,x)=>s+x.qty*x.price,0);
  App.byId("clientCart").classList.toggle("hidden",count===0);
  App.byId("clientCartCount").textContent=`${count} productos`;
  App.byId("clientCartTotal").textContent=App.money(total);
};
App.clientCheckout=function(){
  if(!App.clientCart.length)return;
  const lines=App.clientCart.map(x=>`${x.qty} × ${x.name} = ${App.money(x.qty*x.price)}`).join("\n");
  const total=App.clientCart.reduce((s,x)=>s+x.qty*x.price,0);
  App.confirmAction("Solicitar compra",`${lines}\nTotal: ${App.money(total)}`,()=>{App.toast("Solicitud de compra preparada");App.clientCart=[];App.renderClientShop()});
};

/* ===== FASE 10.9 OVERRIDES ===== */
App.lookupClientAppointments=function(){
  const phone=App.val("clientLookupPhone").replace(/\D/g,""),c=App.db.clients.find(x=>(x.phone||"").replace(/\D/g,"")===phone);
  if(!c){App.byId("clientAppointmentsList").innerHTML='<div class="muted">No encontrado.</div>';return}
  const data=App.db.appointments.filter(a=>a.clientId===c.id).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
  App.byId("clientAppointmentsList").innerHTML=data.map(a=>`
    <div class="row"><div><strong>${a.date} ${a.time}</strong><small>${App.serviceName(a.serviceId)} · ${App.barberName(a.barberId)} · ${a.status}</small></div>${["Pendiente","Confirmada"].includes(a.status)?`<div class="request-actions"><button class="btn secondary" onclick="App.requestAppointmentChange('${a.id}','reschedule')">Reprogramar</button><button class="btn danger" onclick="App.requestAppointmentChange('${a.id}','cancel')">Cancelar</button></div>`:""}</div>`).join("")||'<div class="muted">No tienes citas registradas.</div>';
};

App.lookupClientProfile=function(){
  const phone=App.val("clientProfilePhone").replace(/\D/g,""),c=App.db.clients.find(x=>(x.phone||"").replace(/\D/g,"")===phone);
  if(!c){App.byId("clientProfileData").innerHTML='<div class="muted">No encontrado.</div>';App.byId("clientPersonalPromos").innerHTML="";return}
  const progress=Math.min(100,(Number(c.points||0)/100)*100);
  App.byId("clientProfileData").innerHTML=`<div class="loyalty-card"><span>PROGRAMA DE FIDELIDAD</span><h2 style="color:#fff;margin:8px 0">${c.name}</h2><div><strong>${c.points||0} puntos</strong> · ${c.visits||0} visitas</div><div class="loyalty-progress"><span style="width:${progress}%"></span></div><small>${progress>=100?"Cliente VIP":"Avanza hacia nivel VIP"}</small></div>`;
  const promos=[];if((c.visits||0)>=5)promos.push({title:"Cliente frecuente",text:"Pregunta por tu beneficio especial"});if((c.points||0)>=100)promos.push({title:"Beneficio VIP",text:"Tienes beneficios exclusivos disponibles"});
  App.byId("clientPersonalPromos").innerHTML=`<h3>Promociones para ti</h3>${promos.map(p=>`<div class="personal-promo"><h3>${p.title}</h3><div>${p.text}</div></div>`).join("")||'<div class="muted">Sigue acumulando visitas y puntos para desbloquear beneficios.</div>'}`;
};

App.lookupClientHistory=function(){
  const phone=App.val("clientHistoryPhone").replace(/\D/g,""),c=App.db.clients.find(x=>(x.phone||"").replace(/\D/g,"")===phone);
  if(!c){App.byId("clientHistorySummary").innerHTML="";App.byId("clientHistoryList").innerHTML='<div class="muted">No encontrado.</div>';return}
  const visits=App.db.appointments.filter(a=>a.clientId===c.id&&a.status==="Finalizada").sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
  const spent=App.db.sales.filter(s=>s.clientName===c.name).reduce((sum,s)=>sum+Number(s.total||0),0);
  App.byId("clientHistorySummary").innerHTML=`<article><span>Visitas</span><b>${visits.length}</b></article><article><span>Puntos</span><b>${c.points||0}</b></article><article><span>Gastado</span><b>${App.money(spent)}</b></article><article><span>Última visita</span><b style="font-size:14px">${c.lastVisit||"—"}</b></article>`;
  App.byId("clientHistoryList").innerHTML=`<div class="client-timeline">${visits.map(a=>`<div class="timeline-item"><strong>${a.date} · ${App.serviceName(a.serviceId)}</strong><div class="muted">${App.barberName(a.barberId)} · ${a.time}</div></div>`).join("")||'<div class="muted">Aún no tienes visitas finalizadas.</div>'}</div>`;
};

const App_submitClientReservation_109=App.submitClientReservation;
App.submitClientReservation=function(){
  const before=App.db.appointments.length;
  App_submitClientReservation_109();
  if(App.db.appointments.length>before){
    const a=App.db.appointments[App.db.appointments.length-1],c=App.db.clients.find(x=>x.id===a.clientId);
    App.addClientActivity("Reserva online",`${c?.name||"Cliente"} · ${a.date} ${a.time}`,c?.phone||"");
    localStorage.setItem(App.KEY,JSON.stringify(App.db));
  }
};

App.clientCheckout=function(){
  if(!App.clientCart.length)return;
  App.byId("clientOrderNoteWrap").classList.remove("hidden");
  App.confirmAction("Enviar solicitud de compra",`Total: ${App.money(App.clientCart.reduce((s,x)=>s+x.qty*x.price,0))}`,()=>App.createShopOrder());
};
