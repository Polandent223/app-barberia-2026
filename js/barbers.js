
App.saveBarber = function(){
  if(!App.val("barberName"))return App.toast("Escribe el nombre");
  App.db.barbers.push({id:App.uid(),name:App.val("barberName"),phone:App.val("barberPhone"),commission:Number(App.val("barberCommission")||0)});
  App.hide("barberForm");App.byId("barberName").value="";App.byId("barberPhone").value="";App.persist();
};
App.editBarber = function(id){
  const b=App.db.barbers.find(x=>x.id===id);if(!b)return;
  App.openFormModal({
    tag:"BARBERO",title:"Editar barbero",
    fields:[
      {name:"name",label:"Nombre",value:b.name},
      {name:"phone",label:"Teléfono",value:b.phone||""},
      {name:"commission",label:"Comisión %",type:"number",value:b.commission||0}
    ],
    onSave:()=>{
      b.name=App.readModal("name").trim()||b.name;
      b.phone=App.readModal("phone").trim();
      b.commission=Number(App.readModal("commission")||0);
      App.closeModal();App.persist();App.toast("Barbero actualizado");
    }
  });
};
App.deleteBarber = function(id){App.requestDelete("barber",id);return;
  const b=App.db.barbers.find(x=>x.id===id);if(!b)return;
  App.openConfirmModal({title:"Eliminar barbero",message:`Se eliminará <strong>${b.name}</strong> y sus citas asociadas.`,onConfirm:()=>{
    App.db.barbers=App.db.barbers.filter(x=>x.id!==id);App.db.appointments=App.db.appointments.filter(a=>a.barberId!==id);
    App.closeModal();App.persist();App.toast("Barbero eliminado");
  }});
};
App.renderBarbers = function(){
  App.byId("barberList").innerHTML=App.db.barbers.map(b=>`<article class="card"><h3>${b.name}</h3><div class="muted">${b.phone||"Sin teléfono"}</div><div class="big">${b.commission}%</div><div class="muted">Comisión</div><div class="manage-actions"><button class="btn edit" onclick="App.editBarber('${b.id}')">Editar</button><button class="btn danger" onclick="App.deleteBarber('${b.id}')">${App.deleteButtonLabel()}</button></div></article>`).join("");
};
