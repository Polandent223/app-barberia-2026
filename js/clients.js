
App.requireClientAccess=function(){
  if(window.SaaS&& !SaaS.pageAllowed?.("clientes")){App.toast("Tu rol no tiene permiso para gestionar clientes");return false}
  return true;
};

App.saveClient = function(){
  if(!App.requireClientAccess())return;
  if(!App.val("clientName"))return App.toast("Escribe el nombre");
  if(App.val("clientPhone")&&!App.validPhone(App.val("clientPhone")))return App.toast("WhatsApp inválido");
  if(App.hasDuplicateClient(App.val("clientPhone")))return App.toast("Ya existe un cliente con ese WhatsApp");
  App.db.clients.push({id:App.uid(),name:App.val("clientName"),phone:App.val("clientPhone"),birthday:App.val("clientBirthday"),frequency:Number(App.val("clientFrequency")||20),style:App.val("clientStyle"),points:0,visits:0,lastVisit:""});
  App.hide("clientForm");["clientName","clientPhone","clientBirthday","clientStyle"].forEach(id=>App.byId(id).value="");App.persist();
};

App.editClient=function(id){
  if(!App.requireClientAccess())return;
  const c=App.db.clients.find(x=>x.id===id);if(!c)return;
  App.byId("editClientId").value=c.id;
  App.byId("editClientName").value=c.name||"";
  App.byId("editClientPhone").value=c.phone||"";
  App.byId("editClientBirthday").value=c.birthday||"";
  App.byId("editClientFrequency").value=c.frequency||20;
  App.byId("editClientStyle").value=c.style||"";
  App.byId("editClientModal").classList.remove("hidden");
  App.byId("editClientModal").setAttribute("aria-hidden","false");
};
App.closeEditClient=function(){
  App.byId("editClientModal")?.classList.add("hidden");
  App.byId("editClientModal")?.setAttribute("aria-hidden","true");
};
App.saveEditedClient=function(){
  if(!App.requireClientAccess())return;
  const id=App.val("editClientId"),c=App.db.clients.find(x=>x.id===id);if(!c)return;
  const name=App.val("editClientName").trim(),phone=App.val("editClientPhone").trim();
  if(!name)return App.toast("Escribe el nombre");
  if(phone&&!App.validPhone(phone))return App.toast("WhatsApp inválido");
  const dup=App.db.clients.some(x=>x.id!==id&&phone&&String(x.phone||"").replace(/\D/g,"")===phone.replace(/\D/g,""));
  if(dup)return App.toast("Ya existe otro cliente con ese WhatsApp");
  c.name=name;c.phone=phone;c.birthday=App.val("editClientBirthday");
  c.frequency=Number(App.val("editClientFrequency")||20);c.style=App.val("editClientStyle");
  App.closeEditClient();App.persist();App.toast("Cliente actualizado");
};

App.deleteClient = function(id){
  if(!App.requireClientAccess())return;
  App.requestDelete("client",id);
};

App.renderClients = function(){
  const q=App.filters.clients||"";
  const data=App.db.clients.filter(c=>!q||c.name.toLowerCase().includes(q)||(c.phone||"").includes(q));
  App.byId("clientList").innerHTML=data.map(c=>`<article class="card">
    <h3>${c.name}</h3><div class="muted">${c.phone||"Sin teléfono"}</div>
    <div class="big">${c.points||0} pts</div><div class="muted">${c.visits||0} visitas</div><p>${c.style||""}</p>
    <div class="manage-actions">
      <button type="button" class="btn secondary" onclick="App.openClientHistory('${c.id}')">Historial</button>
      <button type="button" class="btn edit" onclick="App.editClient('${c.id}')">Editar</button>
      <button type="button" class="btn danger" onclick="App.deleteClient('${c.id}')">${App.deleteButtonLabel()}</button>
    </div>
  </article>`).join("");
};

App.ensureClientHistory=function(){App.db.clientHistory=Array.isArray(App.db.clientHistory)?App.db.clientHistory:[]};

App.openClientHistory=function(id){
 if(!App.requireClientAccess())return;
 App.ensureClientHistory();
 const c=App.db.clients.find(x=>x.id===id);if(!c)return;
 const appts=App.db.appointments.filter(a=>a.clientId===id).slice().sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
 const notes=App.db.clientHistory.filter(x=>x.clientId===id).slice().sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")));
 App.byId("clientHistoryTitle").textContent=`Historial · ${c.name}`;
 App.byId("clientRecordSummary").innerHTML=`<strong>${c.visits||0} visitas</strong> · ${c.points||0} puntos · ${c.phone||"Sin teléfono"}${c.style?`<br>Notas: ${c.style}`:""}`;
 const events=[
   ...notes.map(n=>({sort:n.date||"",html:`<article class="history-event"><div><strong>${n.date||""} · Nota de atención</strong><p>${n.note||""}</p></div>${(n.photos||[]).length?`<div class="history-thumbs">${n.photos.map(p=>`<img src="${p}" alt="Foto del historial">`).join("")}</div>`:""}</article>`})),
   ...appts.map(a=>({sort:(a.date||"")+" "+(a.time||""),html:`<article class="history-event"><div><strong>${a.date} ${a.time} · ${App.serviceName(a.serviceId)}</strong><small>${App.barberName(a.barberId)} · ${a.status}</small></div></article>`}))
 ].sort((a,b)=>b.sort.localeCompare(a.sort));
 App.byId("clientHistoryTimeline").innerHTML=`<div class="actions"><button class="btn primary" onclick="App.addClientHistoryEntry('${id}')">+ Agregar nota y fotos</button></div>${events.map(x=>x.html).join("")||'<div class="muted">Este cliente todavía no tiene historial.</div>'}`;
 App.byId("clientHistoryModal").classList.remove("hidden");App.byId("clientHistoryModal").setAttribute("aria-hidden","false");
};
App.closeClientHistory=function(){App.byId("clientHistoryModal")?.classList.add("hidden");App.byId("clientHistoryModal")?.setAttribute("aria-hidden","true")};

App.addClientHistoryEntry=function(clientId){
  if(!App.requireClientAccess())return;
  App.byId("clientHistoryEntryClientId").value=clientId;
  App.byId("clientHistoryEntryDate").value=App.today();
  App.byId("clientHistoryEntryNote").value="";
  App.byId("clientHistoryEntryPhotos").value="";
  App.byId("clientHistoryEntryPreview").innerHTML="";
  App.byId("clientHistoryEntryForm").classList.remove("hidden");
  App.byId("clientHistoryEntryForm").scrollIntoView?.({behavior:"smooth",block:"center"});
};
App.cancelClientHistoryEntry=function(){App.byId("clientHistoryEntryForm")?.classList.add("hidden")};
App.previewClientHistoryPhotos=function(){
  const files=[...(App.byId("clientHistoryEntryPhotos")?.files||[])].slice(0,3);
  const box=App.byId("clientHistoryEntryPreview");if(!box)return;
  box.innerHTML="";
  files.forEach(file=>{const r=new FileReader();r.onload=()=>box.insertAdjacentHTML("beforeend",`<img src="${r.result}" alt="Vista previa">`);r.readAsDataURL(file)});
};
App.saveClientHistoryEntry=async function(){
  if(!App.requireClientAccess())return;
  const clientId=App.val("clientHistoryEntryClientId"),c=App.db.clients.find(x=>x.id===clientId);if(!c)return;
  const date=App.val("clientHistoryEntryDate")||App.today(),note=App.val("clientHistoryEntryNote").trim();
  const files=[...(App.byId("clientHistoryEntryPhotos")?.files||[])].slice(0,3),photos=[];
  if(!note&&!files.length)return App.toast("Agrega una nota o una foto");
  for(const f of files){try{photos.push(await App.compressImageLocal(f,320,.60))}catch(e){}}
  App.ensureClientHistory();
  App.db.clientHistory.push({id:App.uid(),clientId,date,note,photos,createdAt:new Date().toISOString()});
  App.cancelClientHistoryEntry();App.persist();App.openClientHistory(clientId);App.toast("Historial guardado");
};

document.addEventListener("DOMContentLoaded",()=>{App.byId("clientHistoryEntryPhotos")?.addEventListener("change",App.previewClientHistoryPhotos)});
