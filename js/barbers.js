
App.saveBarber = function(){
  if(!App.val("barberName"))return App.toast("Escribe el nombre");
  const id=App.val("barberEditId");
  const existing=id?App.db.barbers.find(x=>x.id===id):null;
  const data={name:App.val("barberName"),phone:App.val("barberPhone"),commission:Number(App.val("barberCommission")||0)};
  const finish=photo=>{
    let b=existing;
    if(b){Object.assign(b,data);if(photo)b.photo=photo}
    else{b={id:App.uid(),...data,photo:photo||""};App.db.barbers.push(b)}
    App.db.business.clientApp=App.db.business.clientApp||{};
    App.db.business.clientApp.barberPhotos=App.db.business.clientApp.barberPhotos||{};
    if(b.photo)App.db.business.clientApp.barberPhotos[b.id]=b.photo;

    const employee=App.db.employees?.find(e=>e.barberId===b.id);
    if(employee){employee.name=b.name;employee.phone=b.phone;employee.serviceCommission=b.commission;if(b.photo)employee.photo=b.photo}

    ["barberEditId","barberName","barberPhone"].forEach(x=>{const e=App.byId(x);if(e)e.value=""});
    const file=App.byId("barberPhoto");if(file)file.value="";
    const preview=App.byId("barberPhotoPreview");if(preview){preview.src="";preview.classList.add("hidden")}
    App.hide("barberForm");App.persist();App.toast(existing?"Profesional actualizado":"Profesional guardado");
  };
  const file=App.byId("barberPhoto")?.files?.[0];
  if(file)App.compressImageLocal(file,520,.78).then(finish).catch(()=>{App.toast("No se pudo procesar la foto");finish("")});
  else finish("");
};
App.editBarber = function(id){
  const b=App.db.barbers.find(x=>x.id===id);if(!b)return;
  App.show("barberForm");
  App.byId("barberEditId").value=b.id;
  App.byId("barberName").value=b.name||"";
  App.byId("barberPhone").value=b.phone||"";
  App.byId("barberCommission").value=b.commission??0;
  const photo=b.photo||App.db.business.clientApp?.barberPhotos?.[b.id]||"";
  const preview=App.byId("barberPhotoPreview");
  if(preview){preview.src=photo;preview.classList.toggle("hidden",!photo)}
  App.byId("barberForm")?.scrollIntoView?.({behavior:"smooth",block:"start"});
};
App.deleteBarber = function(id){App.requestDelete("barber",id);return;
  const b=App.db.barbers.find(x=>x.id===id);if(!b)return;
  App.openConfirmModal({title:`Eliminar ${App.businessVocabulary?.().staffOne||"profesional"}`,message:`Se eliminará <strong>${b.name}</strong> y sus citas asociadas.`,onConfirm:()=>{
    App.db.barbers=App.db.barbers.filter(x=>x.id!==id);App.db.appointments=App.db.appointments.filter(a=>a.barberId!==id);
    App.closeModal();App.persist();App.toast(`${(App.businessVocabulary?.().staffOne||"profesional").replace(/^./,c=>c.toUpperCase())} eliminado`);
  }});
};
App.renderBarbers = function(){
  App.byId("barberList").innerHTML=App.db.barbers.map(b=>{const photo=b.photo||App.db.business.clientApp?.barberPhotos?.[b.id]||"";return `<article class="card professional-card">${photo?`<img class="catalog-card-photo professional-photo" src="${photo}" alt="${b.name}">`:""}<h3>${b.name}</h3><div class="muted">${b.phone||"Sin teléfono"}</div><div class="big">${b.commission}%</div><div class="muted">Comisión</div><div class="manage-actions"><button class="btn edit" onclick="App.editBarber('${b.id}')">Editar</button><button class="btn danger" onclick="App.deleteBarber('${b.id}')">${App.deleteButtonLabel()}</button></div></article>`}).join("");
};

/* ===== FASE 20.22 — FOTO PROFESIONAL ===== */
App.byId("barberPhoto")?.addEventListener("change",e=>{
 const file=e.target.files?.[0], preview=App.byId("barberPhotoPreview");if(!preview)return;
 if(!file){preview.src="";preview.classList.add("hidden");return}
 const reader=new FileReader();reader.onload=()=>{preview.src=reader.result;preview.classList.remove("hidden")};reader.readAsDataURL(file);
});
