App.fillAppointmentSelects = function(){
  App.byId("apptClient").innerHTML=App.db.clients.map(c=>`<option value="${c.id}">${c.name}</option>`).join("");
  App.byId("apptBarber").innerHTML=App.db.barbers.map(b=>`<option value="${b.id}">${b.name}</option>`).join("");
  App.byId("apptService").innerHTML=App.db.services.map(s=>`<option value="${s.id}">${s.name} · ${App.money(s.price)}</option>`).join("");
};
App.saveAppointment = function(){
  const d={id:App.uid(),clientId:App.val("apptClient"),barberId:App.val("apptBarber"),serviceId:App.val("apptService"),date:App.val("apptDate"),time:App.val("apptTime"),status:App.val("apptStatus")};
  if(!d.clientId||!d.barberId||!d.serviceId||!d.date||!d.time)return App.toast("Completa la cita");
  if(App.appointmentConflict(d))return App.toast("Ese barbero no está disponible durante todo el servicio");
  App.db.appointments.push(d);App.hide("appointmentForm");App.persist();
};
App.editAppointment = function(id){
  const a=App.db.appointments.find(x=>x.id===id);if(!a)return;
  App.openFormModal({
    tag:"CITA",title:"Editar cita",
    fields:[
      {name:"clientId",label:"Cliente",type:"select",value:a.clientId,options:App.db.clients.map(c=>({value:c.id,label:c.name}))},
      {name:"barberId",label:"Barbero",type:"select",value:a.barberId,options:App.db.barbers.map(b=>({value:b.id,label:b.name}))},
      {name:"serviceId",label:"Servicio",type:"select",value:a.serviceId,options:App.db.services.map(s=>({value:s.id,label:`${s.name} · ${App.money(s.price)}`}))},
      {name:"date",label:"Fecha",type:"date",value:a.date},
      {name:"time",label:"Hora",type:"time",value:a.time},
      {name:"status",label:"Estado",type:"select",value:a.status,options:["Pendiente","Confirmada","Finalizada","Cancelada"].map(x=>({value:x,label:x}))}
    ],
    onSave:()=>{
      const barberId=App.readModal("barberId"),date=App.readModal("date"),time=App.readModal("time");
      const clash=App.db.appointments.some(x=>x.id!==a.id&&x.barberId===barberId&&x.date===date&&x.time===time&&x.status!=="Cancelada");
      if(clash)return App.toast("Ese barbero ya tiene una cita a esa hora");
      a.clientId=App.readModal("clientId");a.barberId=barberId;a.serviceId=App.readModal("serviceId");
      a.date=date;a.time=time;a.status=App.readModal("status");
      App.closeModal();App.persist();App.toast("Cita actualizada");
    }
  });
};
App.finishAppointment = function(id){
  const a=App.db.appointments.find(x=>x.id===id);if(!a||a.status==="Finalizada")return;
  a.status="Finalizada";
  const s=App.db.services.find(x=>x.id===a.serviceId);
  const c=App.db.clients.find(x=>x.id===a.clientId);
  if(c){c.lastVisit=a.date;c.points=(c.points||0)+Number(App.db.business.pointsPerService||10);c.visits=(c.visits||0)+1}
  App.db.cash.push({id:App.uid(),type:"Ingreso",concept:`${s?.name||"Servicio"} - ${App.clientName(a.clientId)}`,amount:Number(s?.price||0),method:"Efectivo",date:a.date,appointmentId:a.id,currency:App.db.business.currency});
  App.logAction("Cita finalizada","Citas",`${App.clientName(a.clientId)} · ${a.date} ${a.time}`);App.db.sales.push({id:App.uid(),number:String(App.db.sales.length+1).padStart(6,"0"),date:a.date,time:a.time,clientName:App.clientName(a.clientId),barberName:App.barberName(a.barberId),currency:App.db.business.currency,total:Number(s?.price||0),items:[{name:s?.name||"Servicio",qty:1,unit:Number(s?.price||0),total:Number(s?.price||0)}]});
  App.persist();
};
App.deleteAppointment = function(id){App.requestDelete("appointment",id)};
App.renderAppointments = function(){
  const q=App.filters.appointments||"";const data=App.db.appointments.slice().reverse().filter(a=>!q||App.clientName(a.clientId).toLowerCase().includes(q)||App.barberName(a.barberId).toLowerCase().includes(q)||App.serviceName(a.serviceId).toLowerCase().includes(q));App.byId("appointmentList").innerHTML=data.map(a=>`<div class="row"><div><strong>${a.date} ${a.time} · ${App.clientName(a.clientId)}</strong><small>${App.serviceName(a.serviceId)} · ${App.barberName(a.barberId)} · ${a.status}</small></div><div class="manage-actions">${a.status!=="Finalizada"?`<button class="btn secondary" onclick="App.finishAppointment('${a.id}')">Finalizar</button>`:""}<button class="btn edit" onclick="App.editAppointment('${a.id}')">Editar</button><button class="btn danger" onclick="App.deleteAppointment('${a.id}')">${App.deleteButtonLabel()}</button></div></div>`).join("")||'<div class="muted">Sin citas.</div>';
};
