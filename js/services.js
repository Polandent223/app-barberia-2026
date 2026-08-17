App.saveService = function(){
  const id=App.val("serviceEditId"),d={name:App.val("serviceName"),price:Number(App.val("servicePrice")||0),duration:Number(App.val("serviceDuration")||40),description:App.val("serviceDescription")};
  if(!d.name)return App.toast("Escribe el servicio");
  if(id)Object.assign(App.db.services.find(x=>x.id===id),d);else App.db.services.push({id:App.uid(),...d});
  App.hide("serviceForm");App.byId("serviceEditId").value="";App.persist();
};
App.editService = function(id){
  const s=App.db.services.find(x=>x.id===id);if(!s)return;
  App.show("serviceForm");App.byId("serviceEditId").value=id;App.byId("serviceName").value=s.name;App.byId("servicePrice").value=s.price;App.byId("serviceDuration").value=s.duration;App.byId("serviceDescription").value=s.description||"";
};
App.deleteService = function(id){App.requestDelete("service",id)};
App.renderServices = function(){
  const q=App.filters.services||"";const filtered=App.db.services.filter(s=>!q||s.name.toLowerCase().includes(q)||(s.description||"").toLowerCase().includes(q));App.byId("serviceList").innerHTML=filtered.map(s=>`<article class="card"><h3>${s.name}</h3><div class="muted">${s.duration} min</div><div class="big">${App.money(s.price)}</div><p>${s.description||""}</p><div class="manage-actions"><button class="btn edit" onclick="App.editService('${s.id}')">Editar</button><button class="btn danger" onclick="App.deleteService('${s.id}')">${App.deleteButtonLabel()}</button></div></article>`).join("");
};
