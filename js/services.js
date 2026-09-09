App.saveService = function(){
  if(!App.val("serviceName"))return App.toast("Escribe el servicio");
  const id=App.val("serviceEditId"), existing=id?App.db.services.find(x=>x.id===id):null;
  const data={name:App.val("serviceName"),price:Number(App.val("servicePrice")||0),duration:Number(App.val("serviceDuration")||40),description:App.val("serviceDescription")};
  const finish=photo=>{
    if(existing){Object.assign(existing,data);if(photo)existing.photo=photo}
    else App.db.services.push({id:App.uid(),...data,photo:photo||""});
    ["serviceEditId","serviceName","servicePrice","serviceDescription"].forEach(x=>{const e=App.byId(x);if(e)e.value=""});
    const f=App.byId("servicePhoto");if(f)f.value="";
    const p=App.byId("servicePhotoPreview");if(p){p.src="";p.classList.add("hidden")}
    App.hide("serviceForm");App.persist();App.toast(existing?"Servicio actualizado":"Servicio guardado");
  };
  const file=App.byId("servicePhoto")?.files?.[0];
  if(file)App.compressImageLocal(file,720,.8).then(finish).catch(()=>{App.toast("No se pudo procesar la foto");finish("")});else finish("");
};
App.editService = function(id){
  const s=App.db.services.find(x=>x.id===id);if(!s)return;
  App.show("serviceForm");App.byId("serviceEditId").value=s.id;App.byId("serviceName").value=s.name||"";
  App.byId("servicePrice").value=s.price??0;App.byId("serviceDuration").value=s.duration??40;App.byId("serviceDescription").value=s.description||"";
  const p=App.byId("servicePhotoPreview");if(p){p.src=s.photo||"";p.classList.toggle("hidden",!s.photo)}
  App.byId("serviceForm")?.scrollIntoView?.({behavior:"smooth",block:"start"});
};
App.deleteService = function(id){App.requestDelete("service",id)};
App.renderServices = function(){
  const q=App.filters.services||"";const data=App.db.services.filter(s=>!q||s.name.toLowerCase().includes(q));
  App.byId("serviceList").innerHTML=data.map(s=>`<article class="card service-card">${s.photo?`<img class="catalog-card-photo" src="${s.photo}" alt="${s.name}">`:""}<h3>${s.name}</h3><div class="big">${App.money(s.price)}</div><div class="muted">${s.duration} min</div><p>${s.description||""}</p><div class="manage-actions"><button class="btn edit" onclick="App.editService('${s.id}')">Editar</button><button class="btn danger" onclick="App.deleteService('${s.id}')">${App.deleteButtonLabel()}</button></div></article>`).join("");
};

App.byId("servicePhoto")?.addEventListener("change",e=>{
 const file=e.target.files?.[0],p=App.byId("servicePhotoPreview");if(!p)return;
 if(!file){p.src="";p.classList.add("hidden");return}
 const r=new FileReader();r.onload=()=>{p.src=r.result;p.classList.remove("hidden")};r.readAsDataURL(file);
});
