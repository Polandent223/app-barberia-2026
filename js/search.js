App.filters={appointments:"",clients:"",products:"",services:""};
App.bindSearch=function(id,key,renderFn){
  const el=App.byId(id);if(!el)return;
  el.addEventListener("input",()=>{App.filters[key]=el.value.toLowerCase().trim();renderFn()});
};
