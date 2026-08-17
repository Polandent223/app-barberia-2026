App.login = function(){
  const u=App.db.users.find(x=>x.login===App.val("loginUser")&&String(x.pin)===String(App.val("loginPin")));
  if(!u)return App.toast("Usuario o PIN incorrecto");
  localStorage.setItem(App.SESSION_KEY,u.id);
  App.hide("loginView");App.show("adminApp");App.renderAll();
};
App.logout = function(){
  localStorage.removeItem(App.SESSION_KEY);
  App.show("loginView");App.hide("adminApp");
};
App.applyRoleUI = function(){
  document.querySelectorAll(".bottom-nav button").forEach(b=>b.style.display=App.allowed(b.dataset.page)?"flex":"none");
};
