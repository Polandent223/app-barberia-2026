App.renderRolePreview = function(){
  const r=App.val("userRole")||"Recepción";
  App.byId("rolePreview").innerHTML=`<strong>${r}</strong><div class="permission-grid">${(App.rolePermissions[r]||[]).map(x=>`<span>${x}</span>`).join("")}</div>`;
};
App.saveUser = function(){
  const id=App.val("userEditId"),d={name:App.val("userName"),login:App.val("userLogin"),pin:App.val("userPin"),role:App.val("userRole")};
  if(!d.name||!d.login||!d.pin)return App.toast("Completa usuario");
  if(id)Object.assign(App.db.users.find(x=>x.id===id),d);else App.db.users.push({id:App.uid(),...d});
  App.hide("userForm");App.byId("userEditId").value="";App.persist();
};
App.editUser = function(id){
  const u=App.db.users.find(x=>x.id===id);if(!u)return;
  App.show("userForm");App.byId("userEditId").value=id;App.byId("userName").value=u.name;App.byId("userLogin").value=u.login;App.byId("userPin").value=u.pin;App.byId("userRole").value=u.role;App.renderRolePreview();
};
App.deleteUser = function(id){App.requestDelete("user",id)};
App.renderUsers = function(){
  App.byId("userList").innerHTML=App.db.users.map(u=>`<article class="card"><h3>${u.name}</h3><div class="muted">${u.login} · ${u.role}</div><div class="permission-box">${(App.rolePermissions[u.role]||[]).join(" · ")}</div><div class="manage-actions"><button class="btn edit" onclick="App.editUser('${u.id}')">Editar</button><button class="btn danger" onclick="App.deleteUser('${u.id}')">${App.deleteButtonLabel()}</button></div></article>`).join("");
};
