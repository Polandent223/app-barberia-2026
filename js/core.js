window.App = {
  KEY:"hc_fase10_3_modular",
  SESSION_KEY:"hc_fase10_3_session",
  db:null,
  seed:{
    users:[{id:"u1",name:"Administrador",login:"admin",pin:"1234",role:"Administrador"}],
    business:{name:"Barbería Los Hermanos Camejo",open:"09:00",close:"19:00",currency:"$",language:"es",whatsapp:"",address:"",pointsPerService:10,clientApp:{brandName:"Los Hermanos Camejo",heroTitle:"Tu estilo. Tu momento.",heroSubtitle:"Elige servicio, barbero y horario disponible.",theme:"light",primary:"#c89a4b",secondary:"#111111",logo:"",background:"",whatsapp:"",instagram:"",tiktok:"",facebook:"",promotions:[],barberPhotos:{}}},
    barbers:[{id:"b1",name:"Barbero 1",phone:"",commission:40},{id:"b2",name:"Barbero 2",phone:"",commission:40}],
    services:[{id:"s1",name:"Corte clásico",price:10,duration:40,description:""},{id:"s2",name:"Degradado",price:12,duration:45,description:""},{id:"s3",name:"Corte + barba",price:15,duration:60,description:""}],
    clients:[{id:"c1",name:"Cliente demo",phone:"04120000000",birthday:"",frequency:20,style:"Degradado bajo",points:0,visits:0,lastVisit:""}],
    appointments:[],cash:[],products:[{id:"p1",name:"Gel fijador",category:"Venta",stock:6,min:3,cost:2.5,price:5},{id:"p2",name:"Hojillas",category:"Insumo",stock:20,min:10,cost:.2,price:0}],
    stockMoves:[],sales:[],approvalRequests:[],auditLog:[],clientRequests:[],clientActivity:[],shopOrders:[],employees:[],attendance:[],absences:[]
  },
  rolePermissions:{
    "Administrador":["inicio","citas","clientes","barberos","caja","inventario","servicios","usuarios","recibos","autorizaciones","reportes","auditoria","configuracion","clienteConfig","clienteSolicitudes","personal","asistencia","horariosPersonal","rendimientoPersonal","historialPersonal","ausenciasPersonal","nominaPersonal","reservas"],
    "Recepción":["inicio","citas","clientes","caja","servicios","recibos","reservas"],
    "Barbero":["inicio","citas","clientes","reservas"]
  }
};

App.clone = x => JSON.parse(JSON.stringify(x));
App.byId = id => document.getElementById(id);
App.val = id => App.byId(id)?.value || "";
App.today = () => new Date().toISOString().slice(0,10);
App.uid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,7);
App.money = n => (App.db.business.currency||"$")+Number(n||0).toFixed(2);

App.load = function(){
  try{
    const raw=localStorage.getItem(App.KEY);
    App.db=raw?JSON.parse(raw):App.clone(App.seed);
  }catch(e){App.db=App.clone(App.seed)}
};
App.persist = function(){
  localStorage.setItem(App.KEY,JSON.stringify(App.db));
  App.renderAll();
};
App.toast = function(msg){
  const t=App.byId("toast"); if(!t) return;
  t.textContent=msg;t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),1700);
};
App.show = id => App.byId(id)?.classList.remove("hidden");
App.hide = id => App.byId(id)?.classList.add("hidden");
App.toggle = id => App.byId(id)?.classList.toggle("hidden");
App.clientName = id => App.db.clients.find(x=>x.id===id)?.name||"Cliente";
App.barberName = id => App.db.barbers.find(x=>x.id===id)?.name||"Barbero";
App.serviceName = id => App.db.services.find(x=>x.id===id)?.name||"Servicio";
App.currentUser = () => App.db.users.find(x=>x.id===localStorage.getItem(App.SESSION_KEY))||App.db.users[0];
App.allowed = page => (App.rolePermissions[App.currentUser()?.role]||[]).includes(page);

App.go = function(page){
  if(!App.allowed(page)) return App.toast("Sin permiso");
  document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x.id===page));
  document.querySelectorAll(".bottom-nav button").forEach(x=>x.classList.toggle("active",x.dataset.page===page));
  window.scrollTo({top:0,behavior:"smooth"});
  App.renderAll();
};

App.ensurePermissionsData=function(){
  App.db.approvalRequests=App.db.approvalRequests||[];App.db.auditLog=App.db.auditLog||[];App.db.clientRequests=App.db.clientRequests||[];App.db.clientActivity=App.db.clientActivity||[];App.db.shopOrders=App.db.shopOrders||[];App.db.employees=App.db.employees||[];App.db.attendance=App.db.attendance||[];App.db.absences=App.db.absences||[];App.db.business.whatsapp=App.db.business.whatsapp||"";App.db.business.address=App.db.business.address||"";App.db.business.pointsPerService=Number(App.db.business.pointsPerService||10);App.db.business.clientApp=App.db.business.clientApp||{brandName:"Los Hermanos Camejo",heroTitle:"Tu estilo. Tu momento.",heroSubtitle:"Elige servicio, barbero y horario disponible.",theme:"light",primary:"#c89a4b",secondary:"#111111",logo:"",background:"",whatsapp:"",instagram:"",tiktok:"",facebook:"",promotions:[],barberPhotos:{}};
};
