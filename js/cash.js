App.saveCash = function(){
  const amount=Number(App.val("cashAmount"));if(!App.val("cashConcept")||!amount)return App.toast("Completa concepto y monto");
  App.db.cash.push({id:App.uid(),type:App.val("cashType"),concept:App.val("cashConcept"),amount,method:App.val("cashMethod"),date:App.val("cashDate")||App.today(),currency:App.db.business.currency});
  App.hide("cashForm");App.byId("cashConcept").value="";App.byId("cashAmount").value="";App.persist();
};
App.renderCash = function(){
  App.byId("cashList").innerHTML=App.db.cash.slice().reverse().map(c=>`<div class="row"><div><strong>${c.concept}</strong><small>${c.date} · ${c.method} · ${c.currency||"$"}</small></div><strong>${c.type==="Ingreso"?"+":"-"}${c.currency||"$"}${Number(c.amount).toFixed(2)}</strong></div>`).join("")||'<div class="muted">Sin movimientos.</div>';
};
