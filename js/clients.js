
App.saveClient = function(){
  if(!App.val("clientName"))return App.toast("Escribe el nombre");
  if(App.val("clientPhone")&&!App.validPhone(App.val("clientPhone")))return App.toast("WhatsApp inválido");
  if(App.hasDuplicateClient(App.val("clientPhone")))return App.toast("Ya existe un cliente con ese WhatsApp");
  App.db.clients.push({id:App.uid(),name:App.val("clientName"),phone:App.val("clientPhone"),birthday:App.val("clientBirthday"),frequency:Number(App.val("clientFrequency")||20),style:App.val("clientStyle"),points:0,visits:0,lastVisit:""});
  App.hide("clientForm");["clientName","clientPhone","clientBirthday","clientStyle"].forEach(id=>App.byId(id).value="");App.persist();
};

App.editClient = function(id){
  const c=App.db.clients.find(x=>x.id===id);if(!c)return;
  App.openFormModal({
    tag:"CLIENTE",title:"Editar cliente",
    fields:[
      {name:"name",label:"Nombre",value:c.name},
      {name:"phone",label:"WhatsApp",value:c.phone||""},
      {name:"birthday",label:"Cumpleaños",type:"date",value:c.birthday||""},
      {name:"frequency",label:"Frecuencia de visita (días)",type:"number",value:c.frequency||20},
      {name:"style",label:"Mi estilo / notas",type:"textarea",value:c.style||""}
    ],
    onSave:()=>{
      c.name=App.readModal("name").trim()||c.name;
      c.phone=App.readModal("phone").trim();
      c.birthday=App.readModal("birthday");
      c.frequency=Number(App.readModal("frequency")||20);
      c.style=App.readModal("style");
      App.closeModal();App.persist();App.toast("Cliente actualizado");
    }
  });
};

App.deleteClient = function(id){App.requestDelete("client",id);return;
  const c=App.db.clients.find(x=>x.id===id);if(!c)return;
  App.openConfirmModal({
    title:"Eliminar cliente",
    message:`Vas a eliminar a <strong>${c.name}</strong> y sus citas asociadas.`,
    onConfirm:()=>{
      App.db.clients=App.db.clients.filter(x=>x.id!==id);
      App.db.appointments=App.db.appointments.filter(a=>a.clientId!==id);
      App.closeModal();App.persist();App.toast("Cliente eliminado");
    }
  });
};

App.renderClients = function(){
  const q=App.filters.clients||"";const data=App.db.clients.filter(c=>!q||c.name.toLowerCase().includes(q)||(c.phone||"").includes(q));App.byId("clientList").innerHTML=data.map(c=>`<article class="card"><h3>${c.name}</h3><div class="muted">${c.phone||"Sin teléfono"}</div><div class="big">${c.points||0} pts</div><div class="muted">${c.visits||0} visitas</div><p>${c.style||""}</p><div class="manage-actions"><button class="btn edit" onclick="App.editClient('${c.id}')">Editar</button><button class="btn danger" onclick="App.deleteClient('${c.id}')">${App.deleteButtonLabel()}</button></div></article>`).join("");
};
