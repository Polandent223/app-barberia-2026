App.I18N={
  en:{"Inicio":"Home","Citas":"Appointments","Clientes":"Clients","Barberos":"Barbers","Caja":"Cash","Stock":"Inventory","Servicios":"Services","Roles":"Roles","Recibos":"Receipts","Reservas":"Bookings","Tienda":"Shop"},
  "pt-BR":{"Inicio":"Início","Citas":"Agendamentos","Clientes":"Clientes","Barberos":"Barbeiros","Caja":"Caixa","Stock":"Estoque","Servicios":"Serviços","Roles":"Funções","Recibos":"Recibos","Reservas":"Reservas","Tienda":"Loja"}
};
App.setLanguage = function(lang){App.db.business.language=lang;localStorage.setItem(App.KEY,JSON.stringify(App.db));location.reload()};
App.applyLanguage = function(){
  const lang=App.db.business.language||"es";App.byId("languageSelect").value=lang;if(lang==="es")return;
  const map=App.I18N[lang]||{};
  document.querySelectorAll(".bottom-nav span,.client-bottom span").forEach(el=>{const base=el.dataset.baseText||el.textContent.trim();el.dataset.baseText=base;if(map[base])el.textContent=map[base]});
};
App.setCurrency = function(cur){App.db.business.currency=cur;localStorage.setItem(App.KEY,JSON.stringify(App.db));App.renderAll()};
