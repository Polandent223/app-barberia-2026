App.confirmState={callback:null};
App.confirmAction=function(title,message,callback){
  App.byId("confirmTitle").textContent=title||"Confirmar acción";
  App.byId("confirmMessage").textContent=message||"¿Deseas continuar?";
  App.confirmState.callback=callback;
  App.show("confirmModal");
};
App.closeConfirm=function(){App.hide("confirmModal");App.confirmState.callback=null};
App.acceptConfirm=function(){
  const cb=App.confirmState.callback;
  App.closeConfirm();
  if(typeof cb==="function")cb();
};
