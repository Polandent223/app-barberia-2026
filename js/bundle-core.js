/* bundle-core.js (regenerado) */

/* ---- js/core.js ---- */
window.App = {
  // Commercial builds must never authenticate with legacy local PINs.
  PRODUCTION_MODE:true,
  KEY:"hc_fase10_3_modular",
  SESSION_KEY:"hc_fase10_3_session",
  db:null,
  seed:{
    users:[{id:"u1",name:"Administrador",login:"admin",pin:"1234",role:"Administrador"}],
    business:{name:"BarberÃ­a Los Hermanos Camejo",open:"09:00",close:"19:00",currency:"$",language:"es",whatsapp:"",address:"",pointsPerService:10,clientApp:{brandName:"Los Hermanos Camejo",heroTitle:"Tu estilo. Tu momento.",heroSubtitle:"Elige servicio, barbero y horario disponible.",theme:"light",primary:"#c89a4b",secondary:"#111111",logo:"",background:"",whatsapp:"",instagram:"",tiktok:"",facebook:"",promotions:[],barberPhotos:{}}},
    barbers:[{id:"b1",name:"Barbero 1",phone:"",commission:40},{id:"b2",name:"Barbero 2",phone:"",commission:40}],
    services:[{id:"s1",name:"Corte clÃ¡sico",price:10,duration:40,description:""},{id:"s2",name:"Degradado",price:12,duration:45,description:""},{id:"s3",name:"Corte + barba",price:15,duration:60,description:""}],
    clients:[{id:"c1",name:"Cliente demo",phone:"04120000000",birthday:"",frequency:20,style:"Degradado bajo",points:0,visits:0,lastVisit:""}],
    appointments:[],cash:[],products:[{id:"p1",name:"Gel fijador",category:"Venta",stock:6,min:3,cost:2.5,price:5},{id:"p2",name:"Hojillas",category:"Insumo",stock:20,min:10,cost:.2,price:0}],
    stockMoves:[],sales:[],approvalRequests:[],auditLog:[],clientRequests:[],clientActivity:[],shopOrders:[],employees:[],attendance:[],absences:[]
  },
  rolePermissions:{
    "Administrador":["inicio","citas","clientes","barberos","caja","inventario","servicios","usuarios","recibos","autorizaciones","reportes","auditoria","configuracion","clienteConfig","clienteSolicitudes","personal","asistencia","horariosPersonal","rendimientoPersonal","historialPersonal","ausenciasPersonal","nominaPersonal","reservas"],
    "RecepciÃ³n":["inicio","citas","clientes","caja","servicios","recibos","reservas"],
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
App.currentUser = () => {
  const id=localStorage.getItem(App.SESSION_KEY);
  if(!id)return null;
  return App.db.users.find(x=>x.id===id)||null;
};
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

// Boot: datos listos al parsear, antes de cualquier logica de alto nivel
App.load();

;

/* ---- js/confirm.js ---- */
App.confirmState={callback:null};
App.confirmAction=function(title,message,callback){
  App.byId("confirmTitle").textContent=title||"Confirmar acciÃ³n";
  App.byId("confirmMessage").textContent=message||"Â¿Deseas continuar?";
  App.confirmState.callback=callback;
  App.show("confirmModal");
};
App.closeConfirm=function(){App.hide("confirmModal");App.confirmState.callback=null};
App.acceptConfirm=function(){
  const cb=App.confirmState.callback;
  App.closeConfirm();
  if(typeof cb==="function")cb();
};

;

/* ---- js/validation.js ---- */
App.normalizePhone=function(phone){return (phone||"").replace(/\D/g,"")};
App.validPhone=function(phone){const p=App.normalizePhone(phone);return p.length>=7&&p.length<=15};
App.hasDuplicateClient=function(phone,ignoreId=""){const p=App.normalizePhone(phone);return !!p&&App.db.clients.some(c=>c.id!==ignoreId&&App.normalizePhone(c.phone)===p)};
App.appointmentConflict=function(candidate,ignoreId=""){
  const service=App.db.services.find(s=>s.id===candidate.serviceId);
  const dur=Number(service?.duration||40);
  const start=App.parseTime(candidate.time);
  return App.db.appointments.some(a=>{
    if(a.id===ignoreId||a.barberId!==candidate.barberId||a.date!==candidate.date||["Cancelada","Rechazada"].includes(a.status))return false;
    const s=App.db.services.find(x=>x.id===a.serviceId);
    const aStart=App.parseTime(a.time),aDur=Number(s?.duration||40);
    return start<aStart+aDur && start+dur>aStart;
  });
};

;

/* ---- js/search.js ---- */
App.filters={appointments:"",clients:"",products:"",services:""};
App.bindSearch=function(id,key,renderFn){
  const el=App.byId(id);if(!el)return;
  el.addEventListener("input",()=>{App.filters[key]=el.value.toLowerCase().trim();renderFn()});
};

;

/* ---- js/auth.js ---- */
App.login = async function(){
  const mode=window.SaaS?.requestedLoginMode||document.body.dataset.loginMode||"business";

  if(mode==="business"&&window.SaaS){
    const email=App.val("loginUser").trim();
    const password=App.val("loginPin");
    if(!email||!password)return App.toast("Escribe correo y contraseÃ±a");

    const btn=App.byId("loginBtn");
    if(btn){btn.disabled=true;btn.textContent="Entrando...";}
    try{
      const ok=await SaaS.loginBusinessOwner?.(email,password);
      if(!ok)return App.toast("Correo o contraseÃ±a incorrectos");
      return;
    }finally{
      if(btn){btn.disabled=false;btn.textContent="Entrar";}
    }
  }

  if(mode==="superadmin"&&window.SaaS){
    const email=App.val("loginUser").trim();
    const password=App.val("loginPin");
    if(!email||!password)return App.toast("Escribe correo y contraseÃ±a");
    if(!window.FirebaseBridge?.loginWithEmailPassword)return App.toast("Firebase todavÃ­a no estÃ¡ disponible");
    const btn=App.byId("loginBtn");
    if(btn){btn.disabled=true;btn.textContent="Entrando...";}
    try{
      const authenticatedUser=await FirebaseBridge.loginWithEmailPassword(email,password);
      if(!authenticatedUser?.uid)throw new Error("Firebase no devolviÃ³ una sesiÃ³n vÃ¡lida");
      const session=await SaaS.resolveFirebaseSession?.();
      if(session?.role!=="superadmin"){
        await FirebaseBridge.logoutUser?.();
        SaaS.session={role:"guest",user:null,businessId:"",branchId:""};
        return App.toast("Esta cuenta no tiene permiso de SuperAdmin");
      }
      SaaS.routeSession?.();
      return;
    }catch(error){
      console.error("[SAMBRIX superadmin login]",error);
      const code=String(error?.code||"");
      const msg=String(error?.message||"");
      if(msg.includes("Publica las reglas Firestore"))return App.toast(msg);
      if(["auth/invalid-credential","auth/wrong-password","auth/user-not-found"].includes(code))return App.toast("Correo o contraseÃ±a incorrectos");
      if(code==="auth/invalid-email")return App.toast("El correo no es vÃ¡lido");
      if(code==="auth/network-request-failed")return App.toast("No se pudo conectar con Firebase. Revisa Internet e intÃ©ntalo de nuevo");
      if(code==="auth/too-many-requests")return App.toast("Firebase bloqueÃ³ temporalmente nuevos intentos. Espera unos minutos");
      if(code==="auth/user-disabled")return App.toast("Esta cuenta estÃ¡ desactivada en Firebase");
      if(code==="permission-denied"||code==="firestore/permission-denied")return App.toast("La contraseÃ±a fue aceptada, pero Firestore rechazÃ³ el acceso");
      return App.toast("No se pudo iniciar sesiÃ³n: "+(code||msg||"error desconocido"));
    }finally{
      if(btn){btn.disabled=false;btn.textContent="Entrar";}
    }
  }

  if(App.PRODUCTION_MODE)return App.toast("Este acceso local estÃ¡ desactivado en producciÃ³n");
  const u=App.db.users.find(x=>x.login===App.val("loginUser")&&String(x.pin)===String(App.val("loginPin")));
  if(!u)return App.toast("Usuario o PIN incorrecto");
  if(mode==="superadmin"&&window.SaaS){
    localStorage.setItem(App.SESSION_KEY,u.id);
    SaaS.session={role:"superadmin",user:{email:"admin-local@sambrix",localReview:true},businessId:"",branchId:""};
    SaaS.installPermissionBridge?.();App.hide("loginView");App.show("adminApp");SaaS.applyRoleUI?.();App.renderAll();App.go("superadmin");SaaS.renderSuperAdminZeroState?.();return;
  }
  localStorage.setItem(App.SESSION_KEY,u.id);App.hide("loginView");App.show("adminApp");App.renderAll();
};


// Login bootstrap independiente: el acceso no debe depender de que main.js termine de cargar.
function bindSambrixLogin(){
  const btn=App.byId("loginBtn");
  if(btn&&!btn.dataset.sambrixLoginBound){
    btn.dataset.sambrixLoginBound="1";
    btn.addEventListener("click",e=>{e.preventDefault();App.login();});
  }
  ["loginUser","loginPin"].forEach(id=>{
    const el=App.byId(id);
    if(el&&!el.dataset.sambrixLoginBound){
      el.dataset.sambrixLoginBound="1";
      el.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();App.login();}});
    }
  });
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bindSambrixLogin);
else bindSambrixLogin();

App.logout = function(){
  localStorage.removeItem(App.SESSION_KEY);
  if(window.SaaS?.signOutToPortal){SaaS.signOutToPortal();return;}
  App.show("loginView");App.hide("adminApp");
};

App.applyRoleUI = function(){document.querySelectorAll(".bottom-nav button").forEach(b=>b.style.display=App.allowed(b.dataset.page)?"flex":"none")};

App.requestPasswordReset=async function(){
  const mode=window.SaaS?.requestedLoginMode||document.body.dataset.loginMode||"business";
  if(!["business","superadmin"].includes(mode))return App.toast("RecuperaciÃ³n no disponible para este acceso");
  const email=App.val("loginUser").trim();
  if(!email)return App.toast("Escribe primero tu correo");
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return App.toast("Escribe un correo vÃ¡lido");
  if(!window.FirebaseBridge?.sendPasswordReset)return App.toast("Firebase todavÃ­a no estÃ¡ disponible");
  const btn=App.byId("loginResetBtn");
  try{if(btn){btn.disabled=true;btn.textContent="Enviando...";}await FirebaseBridge.sendPasswordReset(email);App.toast("Te enviamos un enlace para cambiar la contraseÃ±a")}
  catch(error){console.error("[SAMBRIX password reset]",error);App.toast("Si el correo estÃ¡ registrado, recibirÃ¡s el enlace de recuperaciÃ³n")}
  finally{if(btn){btn.disabled=false;btn.textContent="Â¿Olvidaste tu contraseÃ±a?";}}
};

function ensurePasswordResetButton(){
  if(App.byId("loginResetBtn"))return App.byId("loginResetBtn");
  const loginBtn=App.byId("loginBtn");
  if(!loginBtn)return null;
  const btn=document.createElement("button");
  btn.type="button";
  btn.id="loginResetBtn";
  btn.className="link login-reset-link";
  btn.textContent="Â¿Olvidaste tu contraseÃ±a?";
  btn.style.cssText="display:block;width:100%;margin:10px 0 4px;text-align:center";
  loginBtn.insertAdjacentElement("afterend",btn);
  return btn;
}

function loadProductionPatch(src,key,label){
  if(document.querySelector(`script[data-sambrix-patch="${key}"]`))return;
  const script=document.createElement("script");
  script.src=src;
  script.defer=true;
  script.dataset.sambrixPatch=key;
  script.onerror=()=>console.error(`[SAMBRIX] No se pudo cargar ${label}`);
  document.body.appendChild(script);
}

document.addEventListener("DOMContentLoaded",()=>{
  ensurePasswordResetButton()?.addEventListener("click",App.requestPasswordReset);
  loadProductionPatch("js/staff-production-patch.js","staff","el refuerzo de personal");
  loadProductionPatch("js/saas/session-production-guard.js","session","el refuerzo de sesiÃ³n");
  loadProductionPatch("js/saas/production-action-guards.js","actions","las guardas finales de acciones");
});
;

/* ---- js/operations.js ---- */
App.logAction=function(action,module,detail=""){
  const u=App.currentUser();
  App.db.auditLog=App.db.auditLog||[];
  App.db.auditLog.push({id:App.uid(),at:new Date().toISOString(),user:u?.name||u?.login||"Sistema",role:u?.role||"",action,module,detail});
  if(App.db.auditLog.length>1500)App.db.auditLog=App.db.auditLog.slice(-1500);
};

App.renderReports=function(){
  if(!App.byId("reportRevenue"))return;
  const from=App.val("reportFrom")||"0000-01-01",to=App.val("reportTo")||"9999-12-31";
  const sales=App.db.sales.filter(s=>s.date>=from&&s.date<=to);
  const revenue=sales.reduce((a,s)=>a+Number(s.total||0),0);
  App.byId("reportRevenue").textContent=App.money(revenue);
  App.byId("reportServices").textContent=sales.reduce((a,s)=>a+(s.items||[]).reduce((q,i)=>q+Number(i.qty||1),0),0);
  App.byId("reportClients").textContent=new Set(sales.map(s=>s.clientName)).size;
  App.byId("reportAverage").textContent=App.money(sales.length?revenue/sales.length:0);

  const bp={};sales.forEach(s=>bp[s.barberName]=(bp[s.barberName]||0)+Number(s.total||0));
  App.byId("reportBarbers").innerHTML=Object.entries(bp).sort((a,b)=>b[1]-a[1]).map(([n,v],i)=>`<div class="row"><div><strong>${i+1}. ${n}</strong><small>Ingresos generados</small></div><strong>${App.money(v)}</strong></div>`).join("")||'<div class="muted">Sin datos.</div>';

  const sp={};sales.forEach(s=>(s.items||[]).forEach(i=>sp[i.name]=(sp[i.name]||0)+Number(i.qty||1)));
  App.byId("reportTopServices").innerHTML=Object.entries(sp).sort((a,b)=>b[1]-a[1]).map(([n,v],i)=>`<div class="row"><div><strong>${i+1}. ${n}</strong><small>Servicios realizados</small></div><strong>${v}</strong></div>`).join("")||'<div class="muted">Sin datos.</div>';
};

App.renderAudit=function(){
  if(!App.byId("auditList"))return;
  const q=(App.val("auditSearch")||"").toLowerCase();
  const data=(App.db.auditLog||[]).slice().reverse().filter(x=>!q||`${x.user} ${x.role} ${x.action} ${x.module} ${x.detail}`.toLowerCase().includes(q));
  App.byId("auditList").innerHTML=data.slice(0,300).map(x=>`<div class="row"><div><strong>${x.action}</strong><small>${x.user} Â· ${x.role} Â· ${x.module}<br>${x.detail||""}</small></div><div><span class="audit-chip">${new Date(x.at).toLocaleString()}</span></div></div>`).join("")||'<div class="muted">Sin acciones registradas.</div>';
};

App.loadConfig=function(){
  if(!App.byId("configBusinessName"))return;
  const b=App.db.business;
  App.byId("configBusinessName").value=b.name||"";
  App.byId("configWhatsapp").value=b.whatsapp||"";
  App.byId("configAddress").value=b.address||"";
  App.byId("configOpen").value=b.open||"09:00";
  App.byId("configClose").value=b.close||"19:00";
  App.byId("configPoints").value=b.pointsPerService||10;
};
App.saveConfig=function(){
  const b=App.db.business;
  b.name=App.val("configBusinessName")||b.name;b.whatsapp=App.val("configWhatsapp");b.address=App.val("configAddress");b.open=App.val("configOpen")||b.open;b.close=App.val("configClose")||b.close;b.pointsPerService=Number(App.val("configPoints")||10);
  App.logAction("ConfiguraciÃ³n actualizada","ConfiguraciÃ³n",b.name);
  localStorage.setItem(App.KEY,JSON.stringify(App.db));App.renderAll();App.toast("ConfiguraciÃ³n guardada");
};

App.exportBackup=function(){
  App.logAction("Respaldo descargado","Seguridad","Copia JSON completa");
  localStorage.setItem(App.KEY,JSON.stringify(App.db));
  const blob=new Blob([JSON.stringify(App.db,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`sambrix_respaldo_${App.today()}.json`;a.click();URL.revokeObjectURL(a.href);
};
App.importBackup=function(file){
  if(!file)return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      const data=JSON.parse(r.result);
      if(!data.users||!data.business||!data.clients)throw new Error("Formato invÃ¡lido");
      App.confirmAction("Restaurar respaldo","Esto reemplazarÃ¡ la informaciÃ³n actual.",()=>{
        App.db=data;App.ensurePermissionsData();App.logAction("Respaldo restaurado","Seguridad",file.name);localStorage.setItem(App.KEY,JSON.stringify(App.db));location.reload();
      });
    }catch(e){App.toast("El archivo no es un respaldo vÃ¡lido")}
  };r.readAsText(file);
};

App.printReceipt=function(id){
  const s=App.db.sales.find(x=>x.id===id);if(!s)return;
  const b=App.db.business;
  const w=window.open("","_blank","width=480,height=720");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Recibo ${s.number}</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#171717}.brand{text-align:center;border-bottom:2px solid #171717;padding-bottom:14px}.brand h1{font-size:23px;margin:0}.muted{color:#666;font-size:12px}.row{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid #ddd}.total{font-size:20px;font-weight:800}.footer{text-align:center;margin-top:25px;font-size:12px}</style></head><body><div class="brand"><h1>${b.name}</h1><div class="muted">${b.address||""} ${b.whatsapp?("Â· "+b.whatsapp):""}</div></div><h3>Recibo #${s.number}</h3><div class="muted">${s.date} ${s.time}${s.paymentMethod?` Â· ${s.paymentMethod}`:""}</div><p><strong>Cliente:</strong> ${s.clientName}<br><strong>${(App.businessVocabulary?.().staffOne||"profesional").replace(/^./,c=>c.toUpperCase())}:</strong> ${s.barberName}</p>${s.items.map(i=>`<div class="row"><span>${i.qty} Ã— ${i.name}</span><strong>${s.currency}${Number(i.total).toFixed(2)}</strong></div>`).join("")}<div class="row total"><span>Total</span><span>${s.currency}${Number(s.total).toFixed(2)}</span></div><div class="footer">Gracias por preferirnos.</div><script>window.onload=()=>window.print()<\/script></body></html>`);
  w.document.close();
  App.logAction("Recibo impreso","Recibos",`#${s.number}`);
  localStorage.setItem(App.KEY,JSON.stringify(App.db));
};

;

/* ---- js/security.js ---- */
(function(){
  const approvedDeletes=new Set();
  const ENTITY_PAGE={client:"clientes",barber:"barberos",product:"inventario",service:"servicios",appointment:"citas",sale:"recibos",user:"configuracion"};
  const ENTITY_DOMAIN={client:"crm",barber:"config",product:"inventory",service:"config",appointment:"schedule",sale:"finance",user:"config"};

  function saasRole(){return String(window.SaaS?.session?.role||"").toLowerCase()}
  function deletionAdmin(){
    const role=saasRole();
    if(role&&role!=="guest")return ["owner","admin","superadmin"].includes(role);
    return App.currentUser()?.role==="Administrador";
  }
  function canAccessEntity(type){
    const page=ENTITY_PAGE[type];
    if(!page)return false;
    if(saasRole()==="superadmin")return false;
    return !!App.allowed?.(page);
  }
  function reviewerName(){
    const user=window.SaaS?.session?.user;
    return user?.displayName||user?.email||App.currentUser()?.name||App.currentUser()?.login||"Administrador";
  }
  function requestUser(){
    const u=App.currentUser();
    const s=window.SaaS?.session;
    return {
      id:s?.user?.uid||u?.id||"",
      name:s?.user?.displayName||s?.user?.email||u?.name||u?.login||"Usuario",
      role:s?.role||u?.role||""
    };
  }

  App.isAdmin=deletionAdmin;

  App.entityLabel=function(type,id){
    if(type==="client")return App.db.clients.find(x=>x.id===id)?.name||"Cliente";
    if(type==="barber")return App.db.barbers.find(x=>x.id===id)?.name||(App.businessVocabulary?.().staffOne||"Profesional");
    if(type==="product")return App.db.products.find(x=>x.id===id)?.name||"Producto";
    if(type==="service")return App.db.services.find(x=>x.id===id)?.name||"Servicio";
    if(type==="appointment"){
      const a=App.db.appointments.find(x=>x.id===id);
      return a?`${App.clientName(a.clientId)} Â· ${a.date} ${a.time}`:"Cita";
    }
    if(type==="user")return App.db.users.find(x=>x.id===id)?.login||"Usuario";
    if(type==="sale")return "Recibo #"+(App.db.sales.find(x=>x.id===id)?.number||"");
    return type;
  };

  App.financialDeleteBlockReason=function(type,id){
    const finalized=a=>a&&(a.status==="Finalizada"||!!a.finalizedAccountingAt);
    if(type==="appointment"){
      const a=(App.db.appointments||[]).find(x=>x.id===id);
      if(finalized(a)||(App.db.sales||[]).some(s=>s.appointmentId===id)||(App.db.cash||[]).some(c=>c.appointmentId===id))
        return "Esta cita ya tiene cierre financiero. No se puede eliminar porque romperÃ­a la caja y el historial.";
    }
    if(type==="sale"){
      const s=(App.db.sales||[]).find(x=>x.id===id);
      const a=s?.appointmentId?(App.db.appointments||[]).find(x=>x.id===s.appointmentId):null;
      if(s?.appointmentId||finalized(a)||(App.db.cash||[]).some(c=>c.saleId===id))
        return "Este recibo pertenece a un cobro cerrado. No se puede eliminar directamente.";
    }
    if(type==="client"){
      const protectedAppt=(App.db.appointments||[]).some(a=>a.clientId===id&&finalized(a));
      const protectedSale=(App.db.sales||[]).some(s=>s.clientId===id);
      if(protectedAppt||protectedSale)return "Este cliente tiene servicios cobrados. Conserva el cliente para mantener Ã­ntegro el historial contable.";
    }
    if(type==="barber"){
      const protectedAppt=(App.db.appointments||[]).some(a=>a.barberId===id&&finalized(a));
      const protectedSale=(App.db.sales||[]).some(s=>s.barberId===id);
      if(protectedAppt||protectedSale)return "Este profesional tiene servicios cobrados. No se puede eliminar porque forma parte del historial contable.";
    }
    if(type==="service"){
      const protectedAppt=(App.db.appointments||[]).some(a=>a.serviceId===id&&finalized(a));
      const protectedSale=(App.db.sales||[]).some(s=>s.serviceId===id||(s.items||[]).some(i=>i.serviceId===id));
      if(protectedAppt||protectedSale)return "Este servicio aparece en cobros histÃ³ricos. No se puede eliminar; puedes dejarlo inactivo sin alterar recibos anteriores.";
    }
    return "";
  };

  App.requestDelete=function(type,id){
    if(!canAccessEntity(type))return App.toast("No tienes permiso para modificar esta informaciÃ³n");
    const blocked=App.financialDeleteBlockReason(type,id);
    if(blocked)return App.toast(blocked);
    if(deletionAdmin()){
      App.confirmAction("Eliminar definitivamente",`Â¿Deseas eliminar ${App.entityLabel(type,id)}?`,()=>{
        approvedDeletes.add(`${type}:${id}`);
        const deleted=App.executeDelete(type,id);
        if(deleted!==true)App.toast("No se pudo completar la eliminaciÃ³n");
      });
      return;
    }
    const duplicate=(App.db.approvalRequests||[]).some(r=>r.status==="Pendiente"&&r.type===type&&r.entityId===id);
    if(duplicate)return App.toast("Ya existe una solicitud pendiente");
    const u=requestUser();
    App.db.approvalRequests=App.db.approvalRequests||[];
    const request={
      id:App.uid(),action:"Eliminar",type,entityId:id,entityLabel:App.entityLabel(type,id),
      requestedById:u.id,requestedBy:u.name,requestedRole:u.role,
      requestedAt:new Date().toISOString(),status:"Pendiente",reviewedBy:"",reviewedAt:""
    };
    App.db.approvalRequests.push(request);
    const auditBefore=(App.db.auditLog||[]).length;
    App.logAction?.("Solicitud de eliminaciÃ³n","Seguridad",`${type}: ${App.entityLabel(type,id)}`);
    const persisted=App.persist();
    if(persisted===false){App.db.approvalRequests=App.db.approvalRequests.filter(r=>r.id!==request.id);if(App.db.auditLog)App.db.auditLog.splice(auditBefore);return App.toast("No se pudo enviar la solicitud")}
    App.toast("Solicitud enviada al administrador");
  };

  App.executeDelete=function(type,id,options={}){
    const key=`${type}:${id}`;
    const authorized=deletionAdmin()||approvedDeletes.has(key);
    approvedDeletes.delete(key);
    if(!authorized)return App.toast("No tienes autorizaciÃ³n para eliminar definitivamente");
    if(!canAccessEntity(type)&&saasRole()!=="superadmin")return App.toast("No tienes permiso para modificar esta informaciÃ³n");
    const blocked=App.financialDeleteBlockReason(type,id);
    if(blocked)return App.toast(blocked);

    const collections=["clients","appointments","barbers","products","stockMoves","services","users","sales","cash"];
    const snapshot={};collections.forEach(name=>snapshot[name]=[...(App.db[name]||[])]);
    const rollback=()=>{collections.forEach(name=>App.db[name]=snapshot[name]);};
    if(type==="client"){
      App.db.clients=App.db.clients.filter(x=>x.id!==id);
      App.db.appointments=App.db.appointments.filter(a=>a.clientId!==id);
    }
    if(type==="barber"){
      App.db.barbers=App.db.barbers.filter(x=>x.id!==id);
      App.db.appointments=App.db.appointments.filter(a=>a.barberId!==id);
    }
    if(type==="product"){
      App.db.products=App.db.products.filter(x=>x.id!==id);
      App.db.stockMoves=App.db.stockMoves.filter(x=>x.productId!==id);
    }
    if(type==="service"){
      App.db.services=App.db.services.filter(x=>x.id!==id);
      App.db.appointments=App.db.appointments.filter(a=>a.serviceId!==id);
    }
    if(type==="appointment")App.db.appointments=App.db.appointments.filter(x=>x.id!==id);
    if(type==="user"){
      if(App.db.users.length<=1)return App.toast("Debe quedar al menos un usuario");
      App.db.users=App.db.users.filter(x=>x.id!==id);
    }
    if(type==="sale"){
      App.db.sales=App.db.sales.filter(x=>x.id!==id);
      App.db.cash=App.db.cash.filter(c=>c.saleId!==id);
    }
    if(options.persist===false)return {rollback};
    const persisted=App.persist();
    if(persisted===false){rollback();App.renderAll?.();return false}
    return true;
  };

  App.approveRequest=function(id){
    if(!deletionAdmin())return App.toast("Solo el dueÃ±o o administrador puede aprobar eliminaciones");
    const r=(App.db.approvalRequests||[]).find(x=>x.id===id);if(!r||r.status!=="Pendiente")return;
    const blocked=App.financialDeleteBlockReason(r.type,r.entityId);
    if(blocked){
      const reviewSnapshot={status:r.status,reviewedBy:r.reviewedBy,reviewedAt:r.reviewedAt};
      r.status="Rechazada";r.reviewedBy=reviewerName();r.reviewedAt=new Date().toISOString();
      const persisted=App.persist();
      if(persisted===false){Object.assign(r,reviewSnapshot);App.renderAll?.();return App.toast("No se pudo guardar el rechazo automÃ¡tico")}
      App.toast(blocked);return;
    }
    App.confirmAction("Aprobar eliminaciÃ³n",`Eliminar definitivamente: ${r.entityLabel}`,()=>{
      approvedDeletes.add(`${r.type}:${r.entityId}`);
      const deletion=App.executeDelete(r.type,r.entityId,{persist:false});
      if(!deletion?.rollback)return App.toast("No se pudo completar la eliminaciÃ³n");
      const stillExists=(App.db.approvalRequests||[]).includes(r);
      if(!stillExists){deletion.rollback();return App.toast("No se pudo completar la aprobaciÃ³n")}
      const reviewSnapshot={status:r.status,reviewedBy:r.reviewedBy,reviewedAt:r.reviewedAt},auditBefore=(App.db.auditLog||[]).length;
      r.status="Aprobada";r.reviewedBy=reviewerName();r.reviewedAt=new Date().toISOString();
      App.logAction?.("EliminaciÃ³n aprobada","Seguridad",r.entityLabel);
      const persisted=App.persist();
      if(persisted===false){deletion.rollback();Object.assign(r,reviewSnapshot);if(App.db.auditLog)App.db.auditLog.splice(auditBefore);App.renderAll?.();return App.toast("No se pudo guardar la eliminaciÃ³n")}
      App.toast("Solicitud aprobada");
    });
  };

  App.rejectRequest=function(id){
    if(!deletionAdmin())return App.toast("Solo el dueÃ±o o administrador puede revisar eliminaciones");
    const r=(App.db.approvalRequests||[]).find(x=>x.id===id);if(!r||r.status!=="Pendiente")return;
    const reviewSnapshot={status:r.status,reviewedBy:r.reviewedBy,reviewedAt:r.reviewedAt},auditBefore=(App.db.auditLog||[]).length;
    r.status="Rechazada";r.reviewedBy=reviewerName();r.reviewedAt=new Date().toISOString();
    App.logAction?.("EliminaciÃ³n rechazada","Seguridad",r.entityLabel);
    const persisted=App.persist();
    if(persisted===false){Object.assign(r,reviewSnapshot);if(App.db.auditLog)App.db.auditLog.splice(auditBefore);return App.toast("No se pudo guardar el rechazo")}
    App.toast("Solicitud rechazada");
  };

  App.renderApprovals=function(){
    if(!App.byId("approvalList"))return;
    const all=App.db.approvalRequests||[],pending=all.filter(r=>r.status==="Pendiente");
    App.byId("approvalPendingCount").textContent=pending.length;
    App.byId("approvalApprovedCount").textContent=all.filter(r=>r.status==="Aprobada").length;
    App.byId("approvalRejectedCount").textContent=all.filter(r=>r.status==="Rechazada").length;
    App.byId("approvalTodayCount").textContent=all.filter(r=>r.requestedAt?.slice(0,10)===App.today()).length;
    const actions=deletionAdmin();
    App.byId("approvalList").innerHTML=pending.map(r=>`<div class="row"><div><strong>${r.action}: ${r.entityLabel}</strong><small>${r.requestedBy} Â· ${r.requestedRole} Â· ${new Date(r.requestedAt).toLocaleString()}</small></div>${actions?`<div class="manage-actions"><button class="btn primary" onclick="App.approveRequest('${r.id}')">Aprobar</button><button class="btn danger" onclick="App.rejectRequest('${r.id}')">Rechazar</button></div>`:""}</div>`).join("")||'<div class="muted">No hay solicitudes pendientes.</div>';
    App.byId("approvalHistory").innerHTML=all.filter(r=>r.status!=="Pendiente").slice().reverse().map(r=>`<div class="row"><div><strong>${r.entityLabel}</strong><small>${r.requestedBy} solicitÃ³ eliminar Â· revisÃ³ ${r.reviewedBy||"Administrador"}</small></div><span class="${r.status==="Aprobada"?"approval-approved":"approval-rejected"}">${r.status}</span></div>`).join("")||'<div class="muted">Sin historial.</div>';
  };

  App.deleteButtonLabel=function(){return deletionAdmin()?"Eliminar":"Solicitar eliminaciÃ³n"};
})();

;

/* ---- js/clients.js ---- */

App.requireClientAccess=function(){
  if(window.SaaS&& !SaaS.pageAllowed?.("clientes")){App.toast("Tu rol no tiene permiso para gestionar clientes");return false}
  return true;
};

App.saveClient = function(){
  if(!App.requireClientAccess())return;
  if(!App.val("clientName"))return App.toast("Escribe el nombre");
  if(App.val("clientPhone")&&!App.validPhone(App.val("clientPhone")))return App.toast("WhatsApp invÃ¡lido");
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
  if(phone&&!App.validPhone(phone))return App.toast("WhatsApp invÃ¡lido");
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
    <h3>${c.name}</h3><div class="muted">${c.phone||"Sin telÃ©fono"}</div>
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
 App.byId("clientHistoryTitle").textContent=`Historial Â· ${c.name}`;
 App.byId("clientRecordSummary").innerHTML=`<strong>${c.visits||0} visitas</strong> Â· ${c.points||0} puntos Â· ${c.phone||"Sin telÃ©fono"}${c.style?`<br>Notas: ${c.style}`:""}`;
 const events=[
   ...notes.map(n=>({sort:n.date||"",html:`<article class="history-event"><div><strong>${n.date||""} Â· Nota de atenciÃ³n</strong><p>${n.note||""}</p></div>${(n.photos||[]).length?`<div class="history-thumbs">${n.photos.map(p=>`<img src="${p}" alt="Foto del historial">`).join("")}</div>`:""}</article>`})),
   ...appts.map(a=>({sort:(a.date||"")+" "+(a.time||""),html:`<article class="history-event"><div><strong>${a.date} ${a.time} Â· ${App.serviceName(a.serviceId)}</strong><small>${App.barberName(a.barberId)} Â· ${a.status}</small></div></article>`}))
 ].sort((a,b)=>b.sort.localeCompare(a.sort));
 App.byId("clientHistoryTimeline").innerHTML=`<div class="actions"><button class="btn primary" onclick="App.addClientHistoryEntry('${id}')">+ Agregar nota y fotos</button></div>${events.map(x=>x.html).join("")||'<div class="muted">Este cliente todavÃ­a no tiene historial.</div>'}`;
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

;

/* ---- js/barbers.js ---- */

App.saveBarber = function(){
  if(!App.val("barberName"))return App.toast("Escribe el nombre");
  const id=App.val("barberEditId");
  const existing=id?App.db.barbers.find(x=>x.id===id):null;
  const previousBarber=existing?JSON.parse(JSON.stringify(existing)):null;
  const data={name:App.val("barberName"),phone:App.val("barberPhone"),commission:Number(App.val("barberCommission")||0)};
  const finish=photo=>{
    let b=existing;
    if(b){Object.assign(b,data);if(photo)b.photo=photo}
    else{b={id:App.uid(),...data,photo:photo||""};App.db.barbers.push(b)}
    App.db.business.clientApp=App.db.business.clientApp||{};
    App.db.business.clientApp.barberPhotos=App.db.business.clientApp.barberPhotos||{};
    if(b.photo)App.db.business.clientApp.barberPhotos[b.id]=b.photo;

    const employee=App.db.employees?.find(e=>e.barberId===b.id);
    const previousEmployee=employee?JSON.parse(JSON.stringify(employee)):null;
    const previousPhotoMap=App.db.business.clientApp.barberPhotos[b.id];
    if(employee){employee.name=b.name;employee.phone=b.phone;employee.serviceCommission=b.commission;if(b.photo)employee.photo=b.photo}

    const persisted=App.persist();if(persisted===false){if(existing){Object.assign(existing,previousBarber);if(previousEmployee&&employee)Object.assign(employee,previousEmployee)}else{App.db.barbers=App.db.barbers.filter(x=>x!==b)}if(previousPhotoMap===undefined)delete App.db.business.clientApp.barberPhotos[b.id];else App.db.business.clientApp.barberPhotos[b.id]=previousPhotoMap;App.renderBarbers?.();return App.toast("No se pudo guardar el profesional")}
    ["barberEditId","barberName","barberPhone"].forEach(x=>{const e=App.byId(x);if(e)e.value=""});
    const file=App.byId("barberPhoto");if(file)file.value="";
    const preview=App.byId("barberPhotoPreview");if(preview){preview.src="";preview.classList.add("hidden")}
    App.hide("barberForm");App.toast(existing?"Profesional actualizado":"Profesional guardado");
  };
  const file=App.byId("barberPhoto")?.files?.[0];
  if(file)App.compressImageLocal(file,360,.64).then(photo=>{if(!photo)throw new Error("Foto vacÃ­a");finish(photo)}).catch(e=>{console.error("[SAMBRIX foto profesional]",e);App.toast("No se pudo procesar la foto. Prueba otra imagen.");});
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
App.deleteBarber = function(id){App.requestDelete("barber",id);};
App.renderBarbers = function(){
  App.byId("barberList").innerHTML=App.db.barbers.map(b=>{const photo=b.photo||App.db.business.clientApp?.barberPhotos?.[b.id]||"";return `<article class="card professional-card" data-barber-id="${b.id}">${photo?`<img class="catalog-card-photo professional-photo" src="${photo}" alt="${b.name}">`:""}<h3>${b.name}</h3><div class="muted">${b.phone||"Sin telÃ©fono"}</div><div class="big">${b.commission}%</div><div class="muted">ComisiÃ³n</div><div class="manage-actions"><button class="btn edit" onclick="App.editBarber('${b.id}')">Editar</button><button class="btn danger" onclick="App.deleteBarber('${b.id}')">${App.deleteButtonLabel()}</button></div></article>`}).join("");
};

/* ===== FASE 20.22 â€” FOTO PROFESIONAL ===== */
App.byId("barberPhoto")?.addEventListener("change",e=>{
 const file=e.target.files?.[0], preview=App.byId("barberPhotoPreview");if(!preview)return;
 if(!file){preview.src="";preview.classList.add("hidden");return}
 const reader=new FileReader();reader.onload=()=>{preview.src=reader.result;preview.classList.remove("hidden")};reader.readAsDataURL(file);
});

;

/* ---- js/appointments.js ---- */
App.requireAppointmentAccess=function(){
  if(window.SaaS&&!SaaS.pageAllowed?.("citas")){App.toast("Tu rol no tiene permiso para gestionar citas");return false}
  return true;
};
App.fillAppointmentSelects = function(){
  App.byId("apptClient").innerHTML=App.db.clients.map(c=>`<option value="${c.id}">${c.name}</option>`).join("");
  App.byId("apptBarber").innerHTML=App.db.barbers.map(b=>`<option value="${b.id}">${b.name}</option>`).join("");
  App.byId("apptService").innerHTML=App.db.services.map(s=>`<option value="${s.id}">${s.name} Â· ${App.money(s.price)}</option>`).join("");
};
App.saveAppointment = function(){
  if(!App.requireAppointmentAccess())return;
  const businessId=window.SaaS?.getContext?.()?.businessId||App.db?.meta?.businessId||"";
  const branchId=window.SaaS?.getContext?.()?.branchId||App.db?.meta?.branchId||"";
  const d={id:App.uid(),clientId:App.val("apptClient"),barberId:App.val("apptBarber"),serviceId:App.val("apptService"),date:App.val("apptDate"),time:App.val("apptTime"),status:App.val("apptStatus"),businessId,branchId};
  if(!d.clientId||!d.barberId||!d.serviceId||!d.date||!d.time)return App.toast("Completa la cita");
  if(App.appointmentConflict(d))return App.toast(`Ese ${App.businessVocabulary?.().staffOne||"profesional"} no estÃ¡ disponible durante todo el servicio`);
  App.db.appointments.push(d);App.hide("appointmentForm");App.persist();
};
App.editAppointment = function(id){
  if(!App.requireAppointmentAccess())return;
  const a=App.db.appointments.find(x=>x.id===id);if(!a)return;
  if(a.status==="Finalizada")return App.toast("Una cita finalizada queda bloqueada para proteger el cobro y el recibo");
  App.openFormModal({
    tag:"CITA",title:"Editar cita",
    fields:[
      {name:"clientId",label:"Cliente",type:"select",value:a.clientId,options:App.db.clients.map(c=>({value:c.id,label:c.name}))},
      {name:"barberId",label:(App.businessVocabulary?.().staffOne||"profesional").replace(/^./,c=>c.toUpperCase()),type:"select",value:a.barberId,options:App.db.barbers.map(b=>({value:b.id,label:b.name}))},
      {name:"serviceId",label:"Servicio",type:"select",value:a.serviceId,options:App.db.services.map(s=>({value:s.id,label:`${s.name} Â· ${App.money(s.price)}`}))},
      {name:"date",label:"Fecha",type:"date",value:a.date},
      {name:"time",label:"Hora",type:"time",value:a.time},
      {name:"status",label:"Estado",type:"select",value:a.status,options:["Pendiente","Confirmada","Cancelada"].map(x=>({value:x,label:x}))}
    ],
    onSave:()=>{
      if(!App.requireAppointmentAccess())return;
      const barberId=App.readModal("barberId"),date=App.readModal("date"),time=App.readModal("time");
      const clash=App.db.appointments.some(x=>x.id!==a.id&&x.barberId===barberId&&x.date===date&&x.time===time&&x.status!=="Cancelada");
      if(clash)return App.toast(`Ese ${App.businessVocabulary?.().staffOne||"profesional"} ya tiene una cita a esa hora`);
      a.clientId=App.readModal("clientId");a.barberId=barberId;a.serviceId=App.readModal("serviceId");
      a.date=date;a.time=time;a.status=App.readModal("status");
      App.closeModal();App.persist();App.toast("Cita actualizada");
    }
  });
};
App.finishAppointment = function(id){
  if(!App.requireAppointmentAccess())return;
  const a=App.db.appointments.find(x=>x.id===id);if(!a||a.status==="Finalizada"||a.status==="Cancelada")return;
  a.status="Finalizada";
  const s=App.db.services.find(x=>x.id===a.serviceId);
  const c=App.db.clients.find(x=>x.id===a.clientId);
  if(c){c.lastVisit=a.date;c.points=(c.points||0)+Number(App.db.business.pointsPerService||10);c.visits=(c.visits||0)+1}
  App.db.cash.push({id:App.uid(),type:"Ingreso",concept:`${s?.name||"Servicio"} - ${App.clientName(a.clientId)}`,amount:Number(s?.price||0),method:"Efectivo",date:a.date,appointmentId:a.id,currency:App.db.business.currency});
  App.logAction("Cita finalizada","Citas",`${App.clientName(a.clientId)} Â· ${a.date} ${a.time}`);App.db.sales.push({id:App.uid(),number:String(App.db.sales.length+1).padStart(6,"0"),date:a.date,time:a.time,clientName:App.clientName(a.clientId),barberName:App.barberName(a.barberId),currency:App.db.business.currency,total:Number(s?.price||0),items:[{name:s?.name||"Servicio",qty:1,unit:Number(s?.price||0),total:Number(s?.price||0)}]});
  App.persist();
};
App.deleteAppointment = function(id){if(!App.requireAppointmentAccess())return;App.requestDelete("appointment",id)};
App.renderAppointments = function(){
  const q=App.filters.appointments||"";const data=App.db.appointments.slice().reverse().filter(a=>!q||App.clientName(a.clientId).toLowerCase().includes(q)||App.barberName(a.barberId).toLowerCase().includes(q)||App.serviceName(a.serviceId).toLowerCase().includes(q));App.byId("appointmentList").innerHTML=data.map(a=>`<div class="row"><div><strong>${a.date} ${a.time} Â· ${App.clientName(a.clientId)}</strong><small>${App.serviceName(a.serviceId)} Â· ${App.barberName(a.barberId)} Â· ${a.status}</small></div><div class="manage-actions">${a.status!=="Finalizada"&&a.status!=="Cancelada"?`<button class="btn secondary" onclick="App.finishAppointment('${a.id}')">Finalizar</button>`:""}<button class="btn edit" onclick="App.editAppointment('${a.id}')">Editar</button><button class="btn danger" onclick="App.deleteAppointment('${a.id}')">${App.deleteButtonLabel()}</button></div></div>`).join("")||'<div class="muted">Sin citas.</div>';
};

const oldRenderAppointmentsTerminology=App.renderAppointments;
App.renderAppointments=function(){
  const r=oldRenderAppointmentsTerminology();
  window.SaaS?.applyBusinessTerminology?.();
  return r;
};

;

/* ---- js/services.js ---- */
App.requireServiceAccess=function(){
  if(window.SaaS&&!SaaS.pageAllowed?.("servicios")){App.toast("Tu rol no tiene permiso para gestionar servicios");return false}
  return true;
};
App.saveService = function(){
  if(!App.requireServiceAccess())return;
  if(!App.val("serviceName"))return App.toast("Escribe el servicio");
  const id=App.val("serviceEditId"), existing=id?App.db.services.find(x=>x.id===id):null;
  const data={name:App.val("serviceName"),price:Number(App.val("servicePrice")||0),duration:Number(App.val("serviceDuration")||40),description:App.val("serviceDescription")};
  const finish=photo=>{
    if(!App.requireServiceAccess())return;
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
  if(!App.requireServiceAccess())return;
  const s=App.db.services.find(x=>x.id===id);if(!s)return;
  App.show("serviceForm");App.byId("serviceEditId").value=s.id;App.byId("serviceName").value=s.name||"";
  App.byId("servicePrice").value=s.price??0;App.byId("serviceDuration").value=s.duration??40;App.byId("serviceDescription").value=s.description||"";
  const p=App.byId("servicePhotoPreview");if(p){p.src=s.photo||"";p.classList.toggle("hidden",!s.photo)}
  App.byId("serviceForm")?.scrollIntoView?.({behavior:"smooth",block:"start"});
};
App.deleteService = function(id){if(!App.requireServiceAccess())return;App.requestDelete("service",id)};
App.renderServices = function(){
  const q=App.filters.services||"";const data=App.db.services.filter(s=>!q||s.name.toLowerCase().includes(q));
  App.byId("serviceList").innerHTML=data.map(s=>`<article class="card service-card">${s.photo?`<img class="catalog-card-photo" src="${s.photo}" alt="${s.name}">`:""}<h3>${s.name}</h3><div class="big">${App.money(s.price)}</div><div class="muted">${s.duration} min</div><p>${s.description||""}</p><div class="manage-actions"><button class="btn edit" onclick="App.editService('${s.id}')">Editar</button><button class="btn danger" onclick="App.deleteService('${s.id}')">${App.deleteButtonLabel()}</button></div></article>`).join("");
};

App.byId("servicePhoto")?.addEventListener("change",e=>{
 const file=e.target.files?.[0],p=App.byId("servicePhotoPreview");if(!p)return;
 if(!file){p.src="";p.classList.add("hidden");return}
 const r=new FileReader();r.onload=()=>{p.src=r.result;p.classList.remove("hidden")};r.readAsDataURL(file);
});

;

/* ---- js/inventory.js ---- */

App.requireInventoryAccess=function(){
  if(window.SaaS&&!SaaS.pageAllowed?.("inventario")){App.toast("Tu rol no tiene permiso para gestionar inventario");return false}
  return true;
};

App.saveProduct = function(){
  if(!App.requireInventoryAccess())return;
  if(!App.val("productName"))return App.toast("Escribe el producto");
  const id=App.val("productEditId");
  const existing=id?App.db.products.find(x=>x.id===id):null;
  const data={
    name:App.val("productName"),category:App.val("productCategory"),stock:Number(App.val("productStock")||0),
    min:Number(App.val("productMin")||0),cost:Number(App.val("productCost")||0),price:Number(App.val("productPrice")||0)
  };
  const finish=photo=>{
    if(!App.requireInventoryAccess())return;
    if(existing){Object.assign(existing,data);if(photo)existing.photo=photo}
    else App.db.products.push({id:App.uid(),...data,photo:photo||""});
    ["productEditId","productName","productStock","productMin","productCost","productPrice"].forEach(x=>{const e=App.byId(x);if(e)e.value=""});
    const file=App.byId("productPhoto");if(file)file.value="";
    const preview=App.byId("productPhotoPreview");if(preview){preview.src="";preview.classList.add("hidden")}
    App.hide("productForm");App.persist();App.toast(existing?"Producto actualizado":"Producto guardado");
  };
  const file=App.byId("productPhoto")?.files?.[0];
  if(file)App.compressImageLocal(file,720,.8).then(finish).catch(()=>{App.toast("No se pudo procesar la foto");finish("")});else finish("");
};
App.editProduct = function(id){
  if(!App.requireInventoryAccess())return;
  const p=App.db.products.find(x=>x.id===id);if(!p)return;
  App.show("productForm");App.byId("productEditId").value=p.id;App.byId("productName").value=p.name||"";
  App.byId("productCategory").value=p.category||"Insumo";App.byId("productStock").value=p.stock??0;
  App.byId("productMin").value=p.min??0;App.byId("productCost").value=p.cost??0;App.byId("productPrice").value=p.price??0;
  const preview=App.byId("productPhotoPreview");if(preview){preview.src=p.photo||"";preview.classList.toggle("hidden",!p.photo)}
  App.byId("productForm")?.scrollIntoView?.({behavior:"smooth",block:"start"});
};
App.deleteProduct = function(id){if(!App.requireInventoryAccess())return;App.requestDelete("product",id)};
App.stockMove = function(id,type){
  if(!App.requireInventoryAccess())return;
  const p=App.db.products.find(x=>x.id===id);if(!p)return;
  App.openFormModal({
    tag:"STOCK",title:`${type} de inventario`,note:`Producto: <strong>${p.name}</strong> Â· Stock actual: <strong>${p.stock}</strong>`,
    fields:[{name:"qty",label:"Cantidad",type:"number",value:1},{name:"reason",label:"Motivo",value:type==="Entrada"?"Compra / reposiciÃ³n":"Uso / venta"}],
    saveText:`Registrar ${type.toLowerCase()}`,
    onSave:()=>{
      if(!App.requireInventoryAccess())return;
      const q=Number(App.readModal("qty")||0);if(q<=0)return App.toast("Cantidad invÃ¡lida");
      if(type==="Salida"&&q>p.stock)return App.toast("Stock insuficiente");
      p.stock+=type==="Entrada"?q:-q;
      App.db.stockMoves.push({id:App.uid(),productId:id,type,qty:q,reason:App.readModal("reason"),date:App.today()});
      App.closeModal();App.persist();App.toast("Stock actualizado");
    }
  });
};
App.renderInventory = function(){
  App.byId("invCount").textContent=App.db.products.length;
  App.byId("invLow").textContent=App.db.products.filter(p=>p.stock<=p.min).length;
  App.byId("invValue").textContent=App.money(App.db.products.reduce((s,p)=>s+p.stock*p.cost,0));
  App.byId("invMoves").textContent=App.db.stockMoves.length;
  const q=App.filters.products||"";const filtered=App.db.products.filter(p=>!q||p.name.toLowerCase().includes(q)||p.category.toLowerCase().includes(q));
  App.byId("productList").innerHTML=filtered.map(p=>`<article class="card product-card">${p.photo?`<img class="catalog-card-photo" src="${p.photo}" alt="${p.name}">`:""}<h3>${p.name}</h3><div class="muted">${p.category}</div><div class="big">${p.stock} u.</div><div class="muted">MÃ­n. ${p.min} Â· Precio ${App.money(p.price)}</div><div class="actions"><button class="btn secondary" onclick="App.stockMove('${p.id}','Entrada')">+ Entrada</button><button class="btn secondary" onclick="App.stockMove('${p.id}','Salida')">- Salida</button></div><div class="manage-actions"><button class="btn edit" onclick="App.editProduct('${p.id}')">Editar</button><button class="btn danger" onclick="App.deleteProduct('${p.id}')">${App.deleteButtonLabel()}</button></div></article>`).join("");
  App.byId("stockMoveList").innerHTML=App.db.stockMoves.slice().reverse().map(m=>`<div class="row"><div><strong>${App.db.products.find(p=>p.id===m.productId)?.name||"Producto"}</strong><small>${m.date} Â· ${m.type}${m.reason?` Â· ${m.reason}`:""}</small></div><strong>${m.qty}</strong></div>`).join("")||'<div class="muted">Sin movimientos.</div>';
};

App.byId("productPhoto")?.addEventListener("change",e=>{
 const file=e.target.files?.[0], preview=App.byId("productPhotoPreview");if(!preview)return;
 if(!file){preview.src="";preview.classList.add("hidden");return}
 const reader=new FileReader();reader.onload=()=>{preview.src=reader.result;preview.classList.remove("hidden")};reader.readAsDataURL(file);
});

;

/* ---- js/cash.js ---- */
App.saveCash = function(){
  if(window.SaaS&&!window.SaaS.pageAllowed?.("caja"))return App.toast("Tu rol no tiene permiso para registrar movimientos de caja");
  const amount=Number(App.val("cashAmount"));if(!App.val("cashConcept")||!amount)return App.toast("Completa concepto y monto");
  App.db.cash.push({id:App.uid(),type:App.val("cashType"),concept:App.val("cashConcept"),amount,method:App.val("cashMethod"),date:App.val("cashDate")||App.today(),currency:App.db.business.currency,businessId:window.SaaS?.getContext?.()?.businessId||App.db?.meta?.businessId||"",branchId:window.SaaS?.getContext?.()?.branchId||App.db?.meta?.branchId||"",createdAt:new Date().toISOString()});
  App.hide("cashForm");App.byId("cashConcept").value="";App.byId("cashAmount").value="";App.persist();
};
App.renderCash = function(){
  App.byId("cashList").innerHTML=App.db.cash.slice().reverse().map(c=>`<div class="row"><div><strong>${c.concept}</strong><small>${c.date} Â· ${c.method} Â· ${c.currency||"$"}</small></div><strong>${c.type==="Ingreso"?"+":"-"}${c.currency||"$"}${Number(c.amount).toFixed(2)}</strong></div>`).join("")||'<div class="muted">Sin movimientos.</div>';
};

;

/* ---- js/users.js ---- */
App.renderRolePreview = function(){
  const r=App.val("userRole")||"RecepciÃ³n";
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
  App.byId("userList").innerHTML=App.db.users.map(u=>`<article class="card"><h3>${u.name}</h3><div class="muted">${u.login} Â· ${u.role}</div><div class="permission-box">${(App.rolePermissions[u.role]||[]).join(" Â· ")}</div><div class="manage-actions"><button class="btn edit" onclick="App.editUser('${u.id}')">Editar</button><button class="btn danger" onclick="App.deleteUser('${u.id}')">${App.deleteButtonLabel()}</button></div></article>`).join("");
};

;

/* ---- js/receipts.js ---- */
App.renderReceipts = function(){
  const f=App.val("receiptFrom")||"0000-01-01",t=App.val("receiptTo")||"9999-12-31";
  App.byId("receiptList").innerHTML=App.db.sales.filter(s=>s.date>=f&&s.date<=t).slice().reverse().map(s=>`<div class="receipt"><div class="panel-head"><div><strong>Recibo #${s.number}</strong><div class="muted">${s.date} ${s.time}${s.paymentMethod?` Â· ${s.paymentMethod}`:""}</div></div><span class="currency-chip">${s.currency}</span></div><div class="row"><strong>Cliente</strong><strong>${s.clientName}</strong></div><div class="row"><strong>${(App.businessVocabulary?.().staffOne||"profesional").replace(/^./,c=>c.toUpperCase())}</strong><strong>${s.barberName}</strong></div><div class="receipt-items">${s.items.map(i=>`<div class="row"><div><strong>${i.name}</strong><small>${i.qty} Ã— ${s.currency}${i.unit.toFixed(2)}</small></div><strong>${s.currency}${i.total.toFixed(2)}</strong></div>`).join("")}</div><div class="row"><strong>Total</strong><strong>${s.currency}${s.total.toFixed(2)}</strong><div class="manage-actions"><button class="btn secondary" onclick="App.printReceipt('${s.id}')">Imprimir</button><button class="btn danger" onclick="App.requestDelete('sale','${s.id}')">${App.deleteButtonLabel()}</button></div></div>`).join("")||'<div class="muted">Sin recibos.</div>';
};

;

/* ---- js/i18n.js ---- */
App.I18N={
  en:{"Inicio":"Home","Citas":"Appointments","Clientes":"Clients","Barberos":"Barbers","Caja":"Cash","Stock":"Inventory","Servicios":"Services","Roles":"Roles","Recibos":"Receipts","Reservas":"Bookings","Tienda":"Shop"},
  "pt-BR":{"Inicio":"InÃ­cio","Citas":"Agendamentos","Clientes":"Clientes","Barberos":"Barbeiros","Caja":"Caixa","Stock":"Estoque","Servicios":"ServiÃ§os","Roles":"FunÃ§Ãµes","Recibos":"Recibos","Reservas":"Reservas","Tienda":"Loja"}
};
App.setLanguage = function(lang){App.db.business.language=lang;localStorage.setItem(App.KEY,JSON.stringify(App.db));location.reload()};
App.applyLanguage = function(){
  const lang=App.db.business.language||"es";App.byId("languageSelect").value=lang;if(lang==="es")return;
  const map=App.I18N[lang]||{};
  document.querySelectorAll(".bottom-nav span,.client-bottom span").forEach(el=>{const base=el.dataset.baseText||el.textContent.trim();el.dataset.baseText=base;if(map[base])el.textContent=map[base]});
};
App.setCurrency = function(cur){App.db.business.currency=cur;localStorage.setItem(App.KEY,JSON.stringify(App.db));App.renderAll()};

;

/* ---- js/client-customization.js ---- */

App.compressImageLocal=function(file,maxSize=520,quality=.78){
  return new Promise((resolve,reject)=>{
    if(!file)return resolve("");
    const r=new FileReader();
    r.onerror=()=>reject(new Error("No se pudo leer la imagen"));
    r.onload=()=>{
      const img=new Image();
      img.onerror=()=>reject(new Error("No se pudo cargar la imagen"));
      img.onload=()=>{
        let w=img.width,h=img.height;
        if(w>h&&w>maxSize){h=Math.round(h*(maxSize/w));w=maxSize}
        else if(h>=w&&h>maxSize){w=Math.round(w*(maxSize/h));h=maxSize}
        const c=document.createElement("canvas");c.width=w;c.height=h;
        c.getContext("2d",{alpha:false}).drawImage(img,0,0,w,h);
        resolve(c.toDataURL("image/jpeg",quality));
      };
      img.src=r.result;
    };
    r.readAsDataURL(file);
  });
};

App.fileToDataUrl=function(file,callback){
  if(!file)return callback("");
  const r=new FileReader();
  r.onload=()=>callback(r.result);
  r.readAsDataURL(file);
};

App.loadClientCustomization=function(){
  if(!App.byId("clientBrandName"))return;
  if(!App.db)return;
  App.db.business=App.db.business||{};
  const c=App.db.business.clientApp=App.db.business.clientApp||{};

  App.byId("clientBrandName").value=c.brandName||App.db.business.name||"";
  if(App.byId("clientTagline"))App.byId("clientTagline").value=c.tagline||"";
  if(App.byId("clientContactPhone"))App.byId("clientContactPhone").value=c.contactPhone||"";
  App.byId("clientHeroTitle").value=c.heroTitle||"";
  App.byId("clientHeroSubtitle").value=c.heroSubtitle||"";
  App.byId("clientThemeMode").value=c.theme||"light";
  App.byId("clientPrimaryColor").value=c.primary||"#c89a4b";
  App.byId("clientSecondaryColor").value=c.secondary||"#111111";
  App.byId("clientWhatsappLink").value=c.whatsapp||"";
  App.byId("clientInstagramLink").value=c.instagram||"";
  App.byId("clientTiktokLink").value=c.tiktok||"";
  App.byId("clientFacebookLink").value=c.facebook||"";

  App.byId("clientLogoPreview").src=c.logo||"";
  App.byId("clientBackgroundPreview").src=c.background||"";

  App.renderPromotionEditor();
  App.renderBarberPhotoEditor();
  window.SaaS?.renderBrandingPlanAccess?.();
};

App.renderPromotionEditor=function(){
  const box=App.byId("promotionEditorList");if(!box)return;
  const p=App.db.business.clientApp.promotions||[];
  box.innerHTML=p.map((x,i)=>`<div class="promotion-editor">
    <label>TÃ­tulo<input value="${x.title||""}" onchange="App.updatePromotion(${i},'title',this.value)"></label>
    <label>Descuento / texto<input value="${x.text||""}" onchange="App.updatePromotion(${i},'text',this.value)"></label>
    <button class="btn danger" onclick="App.removePromotion(${i})">Eliminar</button>
  </div>`).join("")||'<div class="muted">Sin promociones configuradas.</div>';
};
App.addPromotion=function(){
  App.db.business.clientApp.promotions.push({title:"Nueva promociÃ³n",text:"10% OFF"});
  App.renderPromotionEditor();
};
App.updatePromotion=function(i,key,val){App.db.business.clientApp.promotions[i][key]=val};
App.removePromotion=function(i){App.db.business.clientApp.promotions.splice(i,1);App.renderPromotionEditor()};

App.renderBarberPhotoEditor=function(){
  const box=App.byId("barberPhotoEditor");if(!box)return;
  const photos=App.db.business.clientApp.barberPhotos||{};
  box.innerHTML=App.db.barbers.map(b=>`<article class="card barber-photo-card">
    <img src="${photos[b.id]||""}" alt="${b.name}">
    <div class="in"><h3>${b.name}</h3><label>Elegir foto<input type="file" accept="image/*" onchange="App.setBarberPhoto('${b.id}',this.files[0])"></label></div>
  </article>`).join("");
};
App.setBarberPhoto=function(id,file){
  App.compressImageLocal(file,520,.78).then(data=>{App.db.business.clientApp.barberPhotos[id]=data;App.renderBarberPhotoEditor();localStorage.setItem(App.KEY,JSON.stringify(App.db));window.FirebaseBridge?.scheduleImagePush?.();App.toast("Foto actualizada")}).catch(()=>App.toast("No se pudo procesar la foto"));
};

App.saveClientCustomization=function(){
  const c=App.db.business.clientApp=App.db.business.clientApp||{};
  const business=window.SaaS?.currentBusiness?.();
  const canTheme=window.SaaS?.planCapability?.("customTheme",business)??false;
  const canCover=window.SaaS?.planCapability?.("coverImage",business)??true;

  c.brandName=App.val("clientBrandName");
  c.tagline=App.val("clientTagline");
  c.contactPhone=App.val("clientContactPhone");
  c.heroTitle=App.val("clientHeroTitle");
  c.heroSubtitle=App.val("clientHeroSubtitle");

  if(canTheme){
    c.theme=App.val("clientThemeMode")||"light";
    c.primary=App.val("clientPrimaryColor")||"#c89a4b";
    c.secondary=App.val("clientSecondaryColor")||"#111111";
  }else{
    c.theme="light";
  }

  c.whatsapp=App.val("clientWhatsappLink");
  c.instagram=App.val("clientInstagramLink");
  c.tiktok=App.val("clientTiktokLink");
  c.facebook=App.val("clientFacebookLink");

  const logo=App.byId("clientLogoFile")?.files?.[0];
  const bg=canCover?App.byId("clientBackgroundFile")?.files?.[0]:null;

  const persist=()=>{
    App.logAction("App Cliente personalizada","App Cliente","DiseÃ±o actualizado");
    localStorage.setItem(App.KEY,JSON.stringify(App.db));
    window.SaaS?.saveTenantState?.(window.SaaS?.getContext?.().businessId,App.db);
    window.FirebaseBridge?.scheduleImagePush?.();
    App.applyClientCustomization();
    window.SaaS?.renderBrandingPlanAccess?.();
    App.renderAll();
    App.toast("App Cliente actualizada");
  };

  const jobs=[];
  if(logo)jobs.push(App.compressImageLocal(logo,420,.80).then(d=>{c.logo=d}));
  if(bg)jobs.push(App.compressImageLocal(bg,900,.72).then(d=>{c.background=d}));

  Promise.allSettled(jobs).then(persist);
};

App.applyClientCustomization=function(){
  const c=App.db?.business?.clientApp;if(!c)return;
  const app=App.byId("clientApp");if(!app)return;

  const business=window.SaaS?.currentBusiness?.();
  const canTheme=window.SaaS?.planCapability?.("customTheme",business)??false;

  app.classList.toggle("client-dark",canTheme&&c.theme==="dark");
  app.classList.toggle("client-light",!canTheme||c.theme!=="dark");

  if(canTheme){
    app.style.setProperty("--client-primary",c.primary||"#c89a4b");
    app.style.setProperty("--client-secondary",c.secondary||"#111111");
  }else{
    app.style.removeProperty("--client-primary");
    app.style.removeProperty("--client-secondary");
  }

  App.byId("clientBrandNameView").textContent=c.brandName||App.db.business.name;
  App.byId("clientBrandTagline").textContent=c.tagline||c.heroSubtitle||"Reserva con nosotros";
  App.byId("clientBrandLogo").src=c.logo||"";
  App.byId("clientHeroTitleView").innerHTML=(c.heroTitle||"Tu negocio. Tu momento.").replace(/\.\s+/,".<br><em>")+(c.heroTitle?.includes(".")?"</em>":"");
  App.byId("clientHeroSubtitleView").textContent=c.heroSubtitle||"";

  const hero=document.querySelector(".client-hero");
  if(hero){
    if(c.background){
      hero.classList.add("custom-bg");
      hero.style.backgroundImage=`linear-gradient(90deg,rgba(0,0,0,.58),rgba(0,0,0,.15)),url("${c.background}")`;
    }else{
      hero.classList.remove("custom-bg");
      hero.style.backgroundImage="";
    }
  }

  const canPromos=window.SaaS?.planCapability?.("promotions",business)??false;
  const promoBox=App.byId("clientPromotionsHome");
  const promoCard=promoBox?.closest(".client-card");
  if(promoCard)promoCard.hidden=!canPromos;
  if(promoBox&&canPromos){
    promoBox.innerHTML=(c.promotions||[]).map(p=>`<article class="promo-client-card"><span>OFERTA</span><h3>${p.title}</h3><strong>${p.text}</strong></article>`).join("")||'<div class="muted">No hay promociones activas.</div>';
  }

  const links=[["WhatsApp",c.whatsapp],["Instagram",c.instagram],["TikTok",c.tiktok],["Facebook",c.facebook]].filter(x=>x[1]);
  App.byId("clientSocialLinks").innerHTML=links.map(([n,u])=>`<a class="social-link" href="${u}" target="_blank" rel="noopener">${n}</a>`).join("")||'<div class="muted">Redes sociales no configuradas.</div>';
};

App.previewClientCustomization=function(){
  App.openClientApp();
};

App.previewSelectedImage=function(inputId,imgId){
  const f=App.byId(inputId).files[0];if(!f)return;
  App.fileToDataUrl(f,d=>App.byId(imgId).src=d);
};

;

/* ---- js/client-requests.js ---- */
App.addClientActivity=function(type,detail,phone=""){
  App.db.clientActivity=App.db.clientActivity||[];
  App.db.clientActivity.push({id:App.uid(),type,detail,phone,at:new Date().toISOString()});
  if(App.db.clientActivity.length>1000)App.db.clientActivity=App.db.clientActivity.slice(-1000);
};

App.requestAppointmentChange=function(appointmentId,action){
  const a=App.db.appointments.find(x=>x.id===appointmentId);if(!a)return;
  const client=App.db.clients.find(c=>c.id===a.clientId);
  if(action==="cancel"){
    App.confirmAction("Solicitar cancelaciÃ³n",`Cita ${a.date} ${a.time}`,()=>{
      App.db.clientRequests.push({id:App.uid(),type:"cancel",appointmentId,status:"Pendiente",clientId:a.clientId,clientName:client?.name||"Cliente",phone:client?.phone||"",oldDate:a.date,oldTime:a.time,createdAt:new Date().toISOString()});
      App.addClientActivity("Solicitud de cancelaciÃ³n",`${client?.name||"Cliente"} Â· ${a.date} ${a.time}`,client?.phone||"");
      localStorage.setItem(App.KEY,JSON.stringify(App.db));App.renderAll();App.toast("Solicitud enviada al administrador");
    });
  }else{
    const date=prompt("Nueva fecha YYYY-MM-DD",a.date);if(!date)return;
    const time=prompt("Nueva hora HH:MM",a.time);if(!time)return;
    App.db.clientRequests.push({id:App.uid(),type:"reschedule",appointmentId,status:"Pendiente",clientId:a.clientId,clientName:client?.name||"Cliente",phone:client?.phone||"",oldDate:a.date,oldTime:a.time,newDate:date,newTime:time,createdAt:new Date().toISOString()});
    App.addClientActivity("Solicitud de reprogramaciÃ³n",`${client?.name||"Cliente"} Â· ${a.date} ${a.time} â†’ ${date} ${time}`,client?.phone||"");
    localStorage.setItem(App.KEY,JSON.stringify(App.db));App.renderAll();App.toast("Solicitud enviada al administrador");
  }
};

App.approveClientRequest=function(id){
  const r=App.db.clientRequests.find(x=>x.id===id);if(!r||r.status!=="Pendiente")return;
  const a=App.db.appointments.find(x=>x.id===r.appointmentId);
  if(!a){r.status="Rechazada";localStorage.setItem(App.KEY,JSON.stringify(App.db));return App.renderAll()}
  if(r.type==="cancel")a.status="Cancelada";
  else{
    const candidate={...a,date:r.newDate,time:r.newTime};
    if(App.appointmentConflict(candidate,a.id))return App.toast("El nuevo horario estÃ¡ ocupado");
    a.date=r.newDate;a.time=r.newTime;a.status="Confirmada";
  }
  r.status="Aprobada";r.reviewedAt=new Date().toISOString();
  App.addClientActivity(r.type==="cancel"?"CancelaciÃ³n aprobada":"ReprogramaciÃ³n aprobada",r.clientName,r.phone);
  App.logAction("Solicitud cliente aprobada","App Cliente",`${r.clientName} Â· ${r.type}`);
  localStorage.setItem(App.KEY,JSON.stringify(App.db));App.renderAll();App.toast("Solicitud aprobada");
};
App.rejectClientRequest=function(id){
  const r=App.db.clientRequests.find(x=>x.id===id);if(!r||r.status!=="Pendiente")return;
  r.status="Rechazada";r.reviewedAt=new Date().toISOString();
  App.addClientActivity("Solicitud rechazada",`${r.clientName} Â· ${r.type}`,r.phone);
  App.logAction("Solicitud cliente rechazada","App Cliente",`${r.clientName} Â· ${r.type}`);
  localStorage.setItem(App.KEY,JSON.stringify(App.db));App.renderAll();App.toast("Solicitud rechazada");
};

App.renderClientRequestAdmin=function(){
  if(!App.byId("clientRequestAdminList"))return;
  const pending=App.db.clientRequests.filter(r=>r.status==="Pendiente");
  const shopPending=App.db.shopOrders.filter(o=>["Pendiente","Reservado"].includes(o.status));
  App.byId("metricOnlineBookings").textContent=App.db.clientActivity.filter(x=>x.type==="Reserva online").length;
  App.byId("metricReschedules").textContent=App.db.clientRequests.filter(x=>x.type==="reschedule").length;
  App.byId("metricCancellations").textContent=App.db.clientRequests.filter(x=>x.type==="cancel").length;
  App.byId("metricShopOrders").textContent=App.db.shopOrders.length;
  const reqHtml=pending.map(r=>`
    <div class="row"><div><strong>${r.type==="cancel"?"Cancelar cita":"Reprogramar cita"} Â· ${r.clientName}</strong><small>${r.oldDate} ${r.oldTime}${r.type==="reschedule"?` â†’ ${r.newDate} ${r.newTime}`:""}</small></div><div class="request-actions"><button class="btn primary" onclick="App.approveClientRequest('${r.id}')">Aprobar</button><button class="btn danger" onclick="App.rejectClientRequest('${r.id}')">Rechazar</button></div></div>`).join("");
  const shopHtml=shopPending.map(o=>`
    <div class="row shop-order-card"><div><strong>Compra Â· ${o.phone}</strong><small>${o.items.map(i=>`${i.qty}Ã— ${i.name}`).join(", ")} Â· ${o.currency}${o.total.toFixed(2)} Â· ${o.status}${o.note?` Â· ${o.note}`:""}</small></div><div class="request-actions">${o.status==="Pendiente"?`<button class="btn primary" onclick="App.approveShopOrder('${o.id}')">Reservar</button><button class="btn danger" onclick="App.rejectShopOrder('${o.id}')">Rechazar</button>`:`<button class="btn danger" onclick="App.cancelShopOrder('${o.id}')">Cancelar reserva</button>`}</div></div>`).join("");
  App.byId("clientRequestAdminList").innerHTML=reqHtml+shopHtml||'<div class="muted">No hay solicitudes pendientes.</div>';
  const activity=[...(App.db.clientActivity||[])].slice().reverse().slice(0,100);
  App.byId("clientActivityAdminList").innerHTML=activity.map(x=>`<div class="row"><div><strong>${x.type}</strong><small>${x.detail}</small></div><span class="audit-chip">${new Date(x.at).toLocaleString()}</span></div>`).join("")||'<div class="muted">Sin actividad.</div>';
};

;

/* ---- js/shop-orders.js ---- */
App.createShopOrder=function(){
  if(!App.clientCart.length)return;
  const phone=prompt("WhatsApp del cliente:","")||"";if(!phone)return;
  const note=App.val("clientOrderNote")||"";
  const order={
    id:App.uid(),
    phone,
    note,
    status:"Pendiente",
    createdAt:new Date().toISOString(),
    items:App.clientCart.map(x=>({...x})),
    total:App.clientCart.reduce((s,x)=>s+x.qty*x.price,0),
    currency:App.db.business.currency||"$",
    reservedAt:"",
    paidAt:"",
    deliveredAt:"",
    saleId:""
  };
  App.db.shopOrders.push(order);
  App.addClientActivity("Solicitud de compra",`${phone} Â· ${order.currency}${order.total.toFixed(2)}`,phone);
  localStorage.setItem(App.KEY,JSON.stringify(App.db));
  App.clientCart=[];
  App.renderClientShop();
  App.renderAll();
  App.toast("Solicitud de compra enviada");
};

/* ADMIN approves request: only reserve, DO NOT touch stock */
App.approveShopOrder=function(id){
  const o=App.db.shopOrders.find(x=>x.id===id);
  if(!o||o.status!=="Pendiente")return;

  for(const item of o.items){
    const p=App.db.products.find(x=>x.id===item.id);
    if(!p || Number(p.stock)<Number(item.qty)){
      return App.toast(`Stock insuficiente para reservar: ${item.name}`);
    }
  }

  o.status="Reservado";
  o.reservedAt=new Date().toISOString();
  App.logAction("Pedido reservado","App Cliente",`${o.phone} Â· ${o.currency}${o.total.toFixed(2)}`);
  App.addClientActivity("Pedido reservado",`${o.phone} Â· pendiente de pago`,o.phone);
  localStorage.setItem(App.KEY,JSON.stringify(App.db));
  App.renderAll();
  App.toast("Pedido reservado. Stock aÃºn no descontado.");
};

App.rejectShopOrder=function(id){
  const o=App.db.shopOrders.find(x=>x.id===id);if(!o)return;
  if(o.status==="Pagado/Entregado")return App.toast("No se puede rechazar un pedido ya cobrado");
  o.status="Rechazado";
  o.reviewedAt=new Date().toISOString();
  App.logAction("Compra cliente rechazada","App Cliente",o.phone);
  App.addClientActivity("Pedido rechazado",o.phone,o.phone);
  localStorage.setItem(App.KEY,JSON.stringify(App.db));
  App.renderAll();
};

App.cancelShopOrder=function(id){
  const o=App.db.shopOrders.find(x=>x.id===id);if(!o)return;
  if(o.status==="Pagado/Entregado")return App.toast("El pedido ya fue cobrado. Usa devoluciÃ³n.");
  o.status="Cancelado";
  o.cancelledAt=new Date().toISOString();
  App.logAction("Pedido cancelado","App Cliente",`${o.phone} Â· sin movimiento de stock`);
  App.addClientActivity("Pedido cancelado",`${o.phone} Â· stock sin cambios`,o.phone);
  localStorage.setItem(App.KEY,JSON.stringify(App.db));
  App.renderAll();
  App.toast("Pedido cancelado. El stock no cambiÃ³.");
};

App.canCheckoutOrder=function(){
  return ["Administrador","RecepciÃ³n"].includes(App.currentUser()?.role);
};

/* CASHIER/ADMIN: real sale happens here */
App.checkoutAndDeliverOrder=function(id){
  if(!App.canCheckoutOrder())return App.toast("Solo Administrador o RecepciÃ³n/Caja puede cobrar");
  const o=App.db.shopOrders.find(x=>x.id===id);
  if(!o||o.status!=="Reservado")return App.toast("El pedido no estÃ¡ reservado");

  for(const item of o.items){
    const p=App.db.products.find(x=>x.id===item.id);
    if(!p || Number(p.stock)<Number(item.qty)){
      return App.toast(`Stock insuficiente: ${item.name}`);
    }
  }

  const method=prompt("MÃ©todo de pago: Efectivo / Pago mÃ³vil / Transferencia / Divisa","Efectivo")||"Efectivo";
  const client=App.db.clients.find(c=>App.normalizePhone(c.phone)===App.normalizePhone(o.phone));
  const sale={
    id:App.uid(),
    number:String(App.db.sales.length+1).padStart(6,"0"),
    date:App.today(),
    time:new Date().toTimeString().slice(0,5),
    clientName:client?.name||o.phone||"Cliente tienda",
    barberName:"Venta tienda",
    currency:o.currency||App.db.business.currency||"$",
    total:Number(o.total||0),
    items:o.items.map(i=>({
      name:i.name,qty:Number(i.qty),unit:Number(i.price),total:Number(i.qty)*Number(i.price),type:"Producto",refId:i.id
    })),
    source:"App Cliente",
    orderId:o.id
  };

  /* Only now decrement physical inventory */
  for(const item of o.items){
    const p=App.db.products.find(x=>x.id===item.id);
    p.stock=Number(p.stock)-Number(item.qty);
    App.db.stockMoves.push({
      id:App.uid(),productId:p.id,type:"Salida",qty:Number(item.qty),date:App.today(),reason:`Venta pedido ${sale.number}`
    });
  }

  App.db.sales.push(sale);
  App.db.cash.push({
    id:App.uid(),
    type:"Ingreso",
    concept:`Pedido cliente #${sale.number}`,
    amount:Number(o.total||0),
    method,
    date:App.today(),
    currency:sale.currency,
    saleId:sale.id,
    orderId:o.id
  });

  o.status="Pagado/Entregado";
  o.paidAt=new Date().toISOString();
  o.deliveredAt=o.paidAt;
  o.saleId=sale.id;
  o.paymentMethod=method;

  App.logAction("Pedido cobrado y entregado","Caja",`${o.phone} Â· ${sale.currency}${sale.total.toFixed(2)} Â· ${method}`);
  App.addClientActivity("Compra completada",`${o.phone} Â· ${sale.currency}${sale.total.toFixed(2)}`,o.phone);

  localStorage.setItem(App.KEY,JSON.stringify(App.db));
  App.renderAll();
  App.toast("Pago registrado, producto entregado e inventario descontado");
};

/* Admin-only reversal after payment: returns stock and creates negative cash movement */
App.returnShopOrder=function(id){
  if(!App.isAdmin())return App.toast("Solo el administrador puede procesar devoluciones");
  const o=App.db.shopOrders.find(x=>x.id===id);
  if(!o||o.status!=="Pagado/Entregado")return App.toast("Este pedido no estÃ¡ pagado");

  App.confirmAction("Procesar devoluciÃ³n","Se devolverÃ¡ el producto al inventario y se registrarÃ¡ la salida de dinero.",()=>{
    const sale=App.db.sales.find(s=>s.id===o.saleId);
    for(const item of o.items){
      const p=App.db.products.find(x=>x.id===item.id);
      if(p){
        p.stock=Number(p.stock)+Number(item.qty);
        App.db.stockMoves.push({
          id:App.uid(),productId:p.id,type:"Entrada",qty:Number(item.qty),date:App.today(),reason:`DevoluciÃ³n pedido ${sale?.number||o.id}`
        });
      }
    }

    App.db.cash.push({
      id:App.uid(),
      type:"Gasto",
      concept:`DevoluciÃ³n pedido #${sale?.number||""}`,
      amount:Number(o.total||0),
      method:o.paymentMethod||"DevoluciÃ³n",
      date:App.today(),
      currency:o.currency,
      orderId:o.id,
      refund:true
    });

    o.status="Devuelto";
    o.refundedAt=new Date().toISOString();

    App.logAction("Pedido devuelto","Caja",`${o.phone} Â· ${o.currency}${Number(o.total).toFixed(2)}`);
    App.addClientActivity("Compra devuelta",`${o.phone} Â· stock reintegrado`,o.phone);
    localStorage.setItem(App.KEY,JSON.stringify(App.db));
    App.renderAll();
    App.toast("DevoluciÃ³n completada y stock reintegrado");
  });
};

App.renderCashShopOrders=function(){
  const box=App.byId("cashShopOrders");if(!box)return;
  const list=App.db.shopOrders.filter(o=>["Reservado","Pagado/Entregado"].includes(o.status)).slice().reverse();
  box.innerHTML=list.map(o=>`
    <div class="row ${o.status==="Reservado"?"order-reserved":"order-paid"}">
      <div>
        <strong>${o.phone} Â· ${o.currency}${Number(o.total).toFixed(2)}</strong>
        <small>${o.items.map(i=>`${i.qty}Ã— ${i.name}`).join(", ")} Â· ${o.status}${o.paymentMethod?` Â· ${o.paymentMethod}`:""}</small>
      </div>
      <div class="request-actions">
        ${o.status==="Reservado"&&App.canCheckoutOrder()?`<button class="btn primary" onclick="App.checkoutAndDeliverOrder('${o.id}')">Cobrar y entregar</button>`:""}
        ${o.status==="Reservado"?`<button class="btn danger" onclick="App.cancelShopOrder('${o.id}')">Cancelar pedido</button>`:""}
        ${o.status==="Pagado/Entregado"&&App.isAdmin()?`<button class="btn secondary" onclick="App.returnShopOrder('${o.id}')">DevoluciÃ³n</button>`:""}
      </div>
    </div>`).join("")||'<div class="muted">No hay pedidos reservados o cobrados.</div>';
};

;

/* ---- js/client-app.js ---- */
App.clientCart=[];
App.clientSelection={serviceId:"",barberId:"",time:""};
App.parseTime=t=>{const [h,m]=t.split(":").map(Number);return h*60+m};
App.fmtTime=n=>`${String(Math.floor(n/60)).padStart(2,"0")}:${String(n%60).padStart(2,"0")}`;
App.slotAvailable=function(barberId,date,time,duration){
  const start=App.parseTime(time),open=App.parseTime(App.db.business.open),close=App.parseTime(App.db.business.close);
  if(start<open||start+duration>close)return false;
  return !App.db.appointments.some(a=>{if(a.barberId!==barberId||a.date!==date||a.status==="Cancelada")return false;const s=App.db.services.find(x=>x.id===a.serviceId);const as=App.parseTime(a.time),ad=Number(s?.duration||40);return start<as+ad&&start+duration>as});
};
App.availableBarbers=(date,time,duration)=>App.db.barbers.filter(b=>App.slotAvailable(b.id,date,time,duration));
App.openClientApp=()=>{App.show("clientApp");App.renderClientApp()};
App.closeClientApp=()=>App.hide("clientApp");
App.clientGo=function(page){document.querySelectorAll(".client-page").forEach(x=>x.classList.toggle("active",x.id===page));document.querySelectorAll(".client-bottom button").forEach(x=>x.classList.toggle("active",x.dataset.clientPage===page));if(page==="clientBook")App.renderClientBooking();if(page==="clientShop")App.renderClientShop()};
App.selectClientService=id=>{App.clientSelection.serviceId=id;App.clientSelection.time="";App.renderClientBooking();const s=App.db.services.find(x=>x.id===id);App.toast(`Servicio seleccionado: ${s?.name||''}`)};
App.selectClientBarber=id=>{App.clientSelection.barberId=id;App.clientSelection.time="";App.renderClientBooking();App.toast(id?`${(App.businessVocabulary?.().staffOne||"profesional").replace(/^./,c=>c.toUpperCase())} seleccionado: ${App.barberName(id)}`:`Cualquier ${App.businessVocabulary?.().staffOne||"profesional"} disponible`)};
App.selectClientTime=t=>{App.clientSelection.time=t;App.renderClientSlots()};
App.renderClientApp=function(){
  App.byId("clientServicesHome").innerHTML=App.db.services.map(s=>`<article class="client-service">${s.photo?`<img class="client-catalog-photo" src="${s.photo}" alt="${s.name}">`:""}<h3>${s.name}</h3><div class="muted">${s.duration} min</div><div class="big">${App.money(s.price)}</div></article>`).join("");
  const photos=App.db.business.clientApp.barberPhotos||{};App.byId("clientBarbersHome").innerHTML=App.db.barbers.map(b=>{const photo=b.photo||photos[b.id]||"";return `<article class="client-barber">${photo?`<img src="${photo}" class="client-catalog-photo professional" alt="${b.name}">`:""}<h3>${b.name}</h3><div class="muted">Disponible por horario</div></article>`}).join("");
  if(!App.val("clientBookDate"))App.byId("clientBookDate").value=App.today();App.renderClientBooking();App.renderClientShop();App.applyClientCustomization();
};
App.renderClientBooking=function(){
  const selectedService=App.db.services.find(s=>s.id===App.clientSelection.serviceId);
  const selectedBarber=App.clientSelection.barberId?App.db.barbers.find(b=>b.id===App.clientSelection.barberId):null;

  App.byId("clientServicePicker").innerHTML=App.db.services.map(s=>`
    <article class="client-service choice-card ${App.clientSelection.serviceId===s.id?"selected":""}" onclick="App.selectClientService('${s.id}')">
      ${s.photo?`<img class="client-catalog-photo" src="${s.photo}" alt="${s.name}">`:""}<h3>${s.name}</h3><div class="muted">${s.duration} min</div><div class="big">${App.money(s.price)}</div>
      <button class="btn ${App.clientSelection.serviceId===s.id?"selected-btn":"secondary"}" type="button">${App.clientSelection.serviceId===s.id?"Elegido":"Elegir"}</button>
    </article>`).join("");

  App.byId("clientBarberPicker").innerHTML=`
    <article class="client-barber choice-card ${App.clientSelection.barberId===""?"selected":""}" onclick="App.selectClientBarber('')">
      <h3>Cualquiera disponible</h3><div class="muted">Asignaremos ${(App.businessVocabulary?.().staffOne||"profesional")==="profesional"?"un profesional disponible":`un ${App.businessVocabulary?.().staffOne||"profesional"} disponible`}.</div>
      <button class="btn ${App.clientSelection.barberId===""?"selected-btn":"secondary"}" type="button">${App.clientSelection.barberId===""?"Elegido":"Elegir"}</button>
    </article>`+
    App.db.barbers.map(b=>{const photo=b.photo||App.db.business.clientApp?.barberPhotos?.[b.id]||"";return `
    <article class="client-barber choice-card ${App.clientSelection.barberId===b.id?"selected":""}" onclick="App.selectClientBarber('${b.id}')">
      ${photo?`<img class="client-catalog-photo professional" src="${photo}" alt="${b.name}">`:""}<h3>${b.name}</h3><div class="muted">Ver horarios disponibles.</div>
      <button class="btn ${App.clientSelection.barberId===b.id?"selected-btn":"secondary"}" type="button">${App.clientSelection.barberId===b.id?"Elegido":"Elegir"}</button>
    </article>`}).join("");

  let summary=[];
  if(selectedService)summary.push(`Servicio: <strong>${selectedService.name}</strong>`);
  summary.push(`${(App.businessVocabulary?.().staffOne||"profesional").replace(/^./,c=>c.toUpperCase())}: <strong>${selectedBarber?selectedBarber.name:"Cualquiera disponible"}</strong>`);
  if(App.clientSelection.time)summary.push(`Hora: <strong>${App.clientSelection.time}</strong>`);
  const existing=document.getElementById("clientSelectionSummary");
  if(existing)existing.remove();
  App.byId("clientBarberPicker").insertAdjacentHTML("afterend",`<div id="clientSelectionSummary" class="selection-summary">${summary.join(" Â· ")}</div>`);

  App.renderClientSlots();
  App.renderClientBookingSummary();
};
App.renderClientSlots=function(){
  if(!App.clientSelection.serviceId){App.byId("clientSlots").innerHTML='<div class="muted">Primero elige un servicio.</div>';return}
  const s=App.db.services.find(x=>x.id===App.clientSelection.serviceId),date=App.val("clientBookDate")||App.today(),open=App.parseTime(App.db.business.open),close=App.parseTime(App.db.business.close),slots=[];
  for(let n=open;n+Number(s.duration)<=close;n+=30){const t=App.fmtTime(n);const ok=App.clientSelection.barberId?App.slotAvailable(App.clientSelection.barberId,date,t,s.duration):App.availableBarbers(date,t,s.duration).length>0;if(ok)slots.push(t)}
  App.byId("clientSlots").innerHTML=slots.length?slots.map(t=>`<button class="slot ${App.clientSelection.time===t?"selected":""}" onclick="App.selectClientTime('${t}')">${t}</button>`).join(""):'<div class="muted">No hay horarios disponibles.</div>';
};
App.submitClientReservation=function(){
  const s=App.db.services.find(x=>x.id===App.clientSelection.serviceId),date=App.val("clientBookDate"),time=App.clientSelection.time,name=App.val("clientBookName"),phone=App.val("clientBookPhone");
  if(!s||!date||!time||!name||!phone)return App.toast("Completa servicio, horario y tus datos");
  let barberId=App.clientSelection.barberId;if(!barberId){const list=App.availableBarbers(date,time,s.duration);if(!list.length)return App.toast("Horario no disponible");barberId=list[0].id}
  let c=App.db.clients.find(x=>(x.phone||"").replace(/\D/g,"")===phone.replace(/\D/g,""));if(!c){c={id:App.uid(),name,phone,birthday:"",frequency:20,style:App.val("clientBookNote"),points:0,visits:0,lastVisit:""};App.db.clients.push(c)}
  App.db.appointments.push({id:App.uid(),clientId:c.id,barberId,serviceId:s.id,date,time,status:"Confirmada"});App.persist();App.clientSelection={serviceId:"",barberId:"",time:""};App.clientGo("clientAppointments");App.byId("clientLookupPhone").value=phone;App.lookupClientAppointments();
};
App.lookupClientAppointments=function(){const phone=App.val("clientLookupPhone").replace(/\D/g,""),c=App.db.clients.find(x=>(x.phone||"").replace(/\D/g,"")===phone);App.byId("clientAppointmentsList").innerHTML=c?App.db.appointments.filter(a=>a.clientId===c.id).map(a=>`<div class="row"><strong>${a.date} ${a.time}</strong><small>${App.serviceName(a.serviceId)} Â· ${App.barberName(a.barberId)}</small></div>`).join(""):'<div class="muted">No encontrado.</div>'};
App.lookupClientProfile=function(){const phone=App.val("clientProfilePhone").replace(/\D/g,""),c=App.db.clients.find(x=>(x.phone||"").replace(/\D/g,"")===phone);App.byId("clientProfileData").innerHTML=c?`<div class="stats"><article><span>Visitas</span><b>${c.visits||0}</b></article><article><span>Puntos</span><b>${c.points||0}</b></article></div>`:'<div class="muted">No encontrado.</div>'};
App.renderClientShop=function(){App.byId("clientShopList").innerHTML=App.db.products.filter(p=>p.stock>0&&p.price>0).map(p=>`<article class="shop-card">${p.photo?`<img class="client-catalog-photo product" src="${p.photo}" alt="${p.name}">`:""}<h3>${p.name}</h3><div class="muted">${p.stock} disponibles</div><div class="big">${App.money(p.price)}</div></article>`).join("")||'<div class="muted">No hay productos disponibles.</div>'};


App.renderClientBookingSummary=function(){
  if(!App.byId("clientBookingSummary"))return;
  const s=App.db.services.find(x=>x.id===App.clientSelection.serviceId);
  const b=App.db.barbers.find(x=>x.id===App.clientSelection.barberId);
  const date=App.val("clientBookDate")||"â€”";
  App.byId("clientBookingSummary").innerHTML=`
    <div class="summary-line"><span>Servicio</span><strong>${s?.name||"Sin seleccionar"}</strong></div>
    <div class="summary-line"><span>${(App.businessVocabulary?.().staffOne||"profesional").replace(/^./,c=>c.toUpperCase())}</span><strong>${App.clientSelection.barberId===""?"Cualquiera disponible":(b?.name||"Sin seleccionar")}</strong></div>
    <div class="summary-line"><span>Fecha</span><strong>${date}</strong></div>
    <div class="summary-line"><span>Hora</span><strong>${App.clientSelection.time||"Sin seleccionar"}</strong></div>
    <div class="summary-line"><span>Total</span><strong>${s?App.money(s.price):"â€”"}</strong></div>`;
};
App.addShopItem=function(id){
  const p=App.db.products.find(x=>x.id===id);if(!p)return;
  const item=App.clientCart.find(x=>x.id===id);
  if(item){if(item.qty>=p.stock)return App.toast("No hay mÃ¡s stock");item.qty++}
  else App.clientCart.push({id:p.id,name:p.name,price:Number(p.price),qty:1});
  App.renderClientShop();
};
App.renderClientShop=function(){
  App.byId("clientShopList").innerHTML=App.db.products.filter(p=>p.stock>0&&p.price>0).map(p=>{
    const item=App.clientCart.find(x=>x.id===p.id);
    return `<article class="shop-card">${p.photo?`<img class="client-catalog-photo product" src="${p.photo}" alt="${p.name}">`:""}<span class="qty-badge">${p.stock} disp.</span><h3>${p.name}</h3><div class="muted">${p.category}</div><div class="big">${App.money(p.price)}</div><button class="btn primary" onclick="App.addShopItem('${p.id}')">${item?`Agregar otro (${item.qty})`:"Agregar"}</button></article>`;
  }).join("")||'<div class="muted">No hay productos disponibles.</div>';
  const count=App.clientCart.reduce((s,x)=>s+x.qty,0),total=App.clientCart.reduce((s,x)=>s+x.qty*x.price,0);
  App.byId("clientCart").classList.toggle("hidden",count===0);
  App.byId("clientCartCount").textContent=`${count} productos`;
  App.byId("clientCartTotal").textContent=App.money(total);
};
App.clientCheckout=function(){
  if(!App.clientCart.length)return;
  const lines=App.clientCart.map(x=>`${x.qty} Ã— ${x.name} = ${App.money(x.qty*x.price)}`).join("\n");
  const total=App.clientCart.reduce((s,x)=>s+x.qty*x.price,0);
  App.confirmAction("Solicitar compra",`${lines}\nTotal: ${App.money(total)}`,()=>{App.toast("Solicitud de compra preparada");App.clientCart=[];App.renderClientShop()});
};

/* ===== FASE 10.9 OVERRIDES ===== */
App.lookupClientAppointments=function(){
  const phone=App.val("clientLookupPhone").replace(/\D/g,""),c=App.db.clients.find(x=>(x.phone||"").replace(/\D/g,"")===phone);
  if(!c){App.byId("clientAppointmentsList").innerHTML='<div class="muted">No encontrado.</div>';return}
  const data=App.db.appointments.filter(a=>a.clientId===c.id).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
  App.byId("clientAppointmentsList").innerHTML=data.map(a=>`
    <div class="row"><div><strong>${a.date} ${a.time}</strong><small>${App.serviceName(a.serviceId)} Â· ${App.barberName(a.barberId)} Â· ${a.status}</small></div>${["Pendiente","Confirmada"].includes(a.status)?`<div class="request-actions"><button class="btn secondary" onclick="App.requestAppointmentChange('${a.id}','reschedule')">Reprogramar</button><button class="btn danger" onclick="App.requestAppointmentChange('${a.id}','cancel')">Cancelar</button></div>`:""}</div>`).join("")||'<div class="muted">No tienes citas registradas.</div>';
};

App.lookupClientProfile=function(){
  const phone=App.val("clientProfilePhone").replace(/\D/g,""),c=App.db.clients.find(x=>(x.phone||"").replace(/\D/g,"")===phone);
  if(!c){App.byId("clientProfileData").innerHTML='<div class="muted">No encontrado.</div>';App.byId("clientPersonalPromos").innerHTML="";return}
  const progress=Math.min(100,(Number(c.points||0)/100)*100);
  App.byId("clientProfileData").innerHTML=`<div class="loyalty-card"><span>PROGRAMA DE FIDELIDAD</span><h2 style="color:#fff;margin:8px 0">${c.name}</h2><div><strong>${c.points||0} puntos</strong> Â· ${c.visits||0} visitas</div><div class="loyalty-progress"><span style="width:${progress}%"></span></div><small>${progress>=100?"Cliente VIP":"Avanza hacia nivel VIP"}</small></div>`;
  const promos=[];if((c.visits||0)>=5)promos.push({title:"Cliente frecuente",text:"Pregunta por tu beneficio especial"});if((c.points||0)>=100)promos.push({title:"Beneficio VIP",text:"Tienes beneficios exclusivos disponibles"});
  App.byId("clientPersonalPromos").innerHTML=`<h3>Promociones para ti</h3>${promos.map(p=>`<div class="personal-promo"><h3>${p.title}</h3><div>${p.text}</div></div>`).join("")||'<div class="muted">Sigue acumulando visitas y puntos para desbloquear beneficios.</div>'}`;
};

App.lookupClientHistory=function(){
  const phone=App.val("clientHistoryPhone").replace(/\D/g,""),c=App.db.clients.find(x=>(x.phone||"").replace(/\D/g,"")===phone);
  if(!c){App.byId("clientHistorySummary").innerHTML="";App.byId("clientHistoryList").innerHTML='<div class="muted">No encontrado.</div>';return}
  const visits=App.db.appointments.filter(a=>a.clientId===c.id&&a.status==="Finalizada").sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
  const spent=App.db.sales.filter(s=>(s.clientId&&s.clientId===c.id)||(!s.clientId&&s.clientName===c.name)).reduce((sum,s)=>sum+Number(s.total||0),0);
  App.byId("clientHistorySummary").innerHTML=`<article><span>Visitas</span><b>${visits.length}</b></article><article><span>Puntos</span><b>${c.points||0}</b></article><article><span>Gastado</span><b>${App.money(spent)}</b></article><article><span>Ãšltima visita</span><b style="font-size:14px">${c.lastVisit||"â€”"}</b></article>`;
  App.byId("clientHistoryList").innerHTML=`<div class="client-timeline">${visits.map(a=>`<div class="timeline-item"><strong>${a.date} Â· ${App.serviceName(a.serviceId)}</strong><div class="muted">${App.barberName(a.barberId)} Â· ${a.time}</div></div>`).join("")||'<div class="muted">AÃºn no tienes visitas finalizadas.</div>'}</div>`;
};

const App_submitClientReservation_109=App.submitClientReservation;
App.submitClientReservation=function(){
  const before=App.db.appointments.length;
  App_submitClientReservation_109();
  if(App.db.appointments.length>before){
    const a=App.db.appointments[App.db.appointments.length-1],c=App.db.clients.find(x=>x.id===a.clientId);
    App.addClientActivity("Reserva online",`${c?.name||"Cliente"} Â· ${a.date} ${a.time}`,c?.phone||"");
    localStorage.setItem(App.KEY,JSON.stringify(App.db));
  }
};

App.clientCheckout=function(){
  if(!App.clientCart.length)return;
  App.byId("clientOrderNoteWrap").classList.remove("hidden");
  App.confirmAction("Enviar solicitud de compra",`Total: ${App.money(App.clientCart.reduce((s,x)=>s+x.qty*x.price,0))}`,()=>App.createShopOrder());
};

/* ===== FASE 20.24 â€” APP CLIENTE SEGÃšN PLAN ===== */
App.applyClientPlanUI=function(){
  const canHistory=window.SaaS?.planCapability?.("clientHistory")??false;
  const canShop=window.SaaS?.planCapability?.("clientShop")??false;
  const caps={clientHistory:canHistory,clientShop:canShop};

  document.querySelectorAll("[data-client-capability]").forEach(el=>{
    const allowed=!!caps[el.dataset.clientCapability];
    el.hidden=!allowed;
    el.classList.toggle("plan-client-hidden",!allowed);
  });

  const active=document.querySelector(".client-page.active");
  if(active?.dataset?.clientCapability && !caps[active.dataset.clientCapability]){
    App.clientGo("clientHome");
  }
};

const _clientGo2024=App.clientGo;
App.clientGo=function(page){
  if(page==="clientHistory" && !(window.SaaS?.planCapability?.("clientHistory")??false)){
    return App.toast("Historial del cliente estÃ¡ disponible desde Pro");
  }
  if(page==="clientShop" && !(window.SaaS?.planCapability?.("clientShop")??false)){
    return App.toast("Tienda estÃ¡ disponible desde Pro");
  }
  return _clientGo2024(page);
};

const _renderClientApp2024=App.renderClientApp;
App.renderClientApp=function(){
  const r=_renderClientApp2024();
  App.applyClientPlanUI();
  return r;
};

/* ===== FASE 20.25 â€” PORTADA BÃSICA ===== */
App.applyBasicClientCover=function(){
  const c=App.db.business.clientApp||{},hero=document.querySelector("#clientHome .client-hero");
  if(!hero)return;
  if(c.background){
    hero.style.backgroundImage=`linear-gradient(rgba(0,0,0,.34),rgba(0,0,0,.34)),url("${c.background}")`;
    hero.classList.add("has-business-cover");
  }else{
    hero.style.backgroundImage="";
    hero.classList.remove("has-business-cover");
  }
};
const _renderClientApp2025=App.renderClientApp;
App.renderClientApp=function(){
  const r=_renderClientApp2025();
  App.applyBasicClientCover();
  return r;
};

;

/* ---- js/home.js ---- */
App.renderHome=function(){
  const a=App.db.appointments.filter(x=>x.date===App.today());
  App.byId("statAppointments").textContent=a.length;
  App.byId("statFinished").textContent=a.filter(x=>x.status==="Finalizada").length;
  App.byId("statSales").textContent=App.money(App.db.cash.filter(x=>x.date===App.today()&&x.type==="Ingreso").reduce((s,x)=>s+Number(x.amount),0));
  App.byId("statLowStock").textContent=App.db.products.filter(p=>p.stock<=p.min).length;
  App.byId("homeAppointments").innerHTML=a.map(x=>{const b=App.db.barbers.find(z=>z.id===x.barberId),photo=b?.photo||App.db.business.clientApp?.barberPhotos?.[x.barberId]||"";return `<div class="row home-appt-row">${photo?`<img class="mini-avatar" src="${photo}" alt="${b?.name||"Profesional"}">`:""}<div><strong>${x.time} Â· ${App.clientName(x.clientId)}</strong><small>${App.serviceName(x.serviceId)} Â· ${App.barberName(x.barberId)}</small></div></div>`}).join("")||'<div class="muted">Sin citas hoy.</div>';
  const team=App.db.barbers.slice(0,6).map(b=>{const photo=b.photo||App.db.business.clientApp?.barberPhotos?.[b.id]||"";return `<div class="home-team-person">${photo?`<img class="mini-avatar" src="${photo}" alt="${b.name}">`:""}<small>${b.name}</small></div>`}).join("");
  const hasInventory=window.SaaS?.featureAllowed?.("inventario")??true;
  App.byId("homeSummary").innerHTML=`<div class="row"><strong>Clientes</strong><strong>${App.db.clients.length}</strong></div><div class="row"><strong>${App.businessVocabulary?.().staff||"Profesionales"}</strong><strong>${App.db.barbers.length}</strong></div>${team?`<div class="home-team-strip">${team}</div>`:""}${hasInventory?`<div class="row"><strong>Productos</strong><strong>${App.db.products.length}</strong></div>`:""}`;
};


/* ===== FASE 20.13 â€” IDENTIDAD DINÃMICA DEL NEGOCIO ===== */
const oldRenderHome_2013=App.renderHome;
App.renderHome=function(){
  oldRenderHome_2013();
  const b=window.SaaS?.currentBusiness?.();
  const hero=document.querySelector("#inicio .owner-hero h1, #inicio .hero h1, #inicio h1");
  if(hero && b){
    hero.innerHTML=`${b.name}<br><span>Bajo control.</span>`;
  }
  const subtitle=document.querySelector("#inicio .owner-hero p, #inicio .hero p");
  if(subtitle && b){
    subtitle.textContent=`Panel principal Â· ${b.type||"Negocio"}`;
  }
};
App.sambrixBusinessHomeIdentity=true;

/* ===== FASE 20.25 â€” INICIO COHERENTE POR PLAN ===== */
App.openBasicReceipt=function(){
  const today=App.today();
  const completed=App.db.appointments.filter(a=>a.date===today&&["Completada","Completado","Finalizada","Finalizado"].includes(a.status));
  const last=completed.slice().sort((a,b)=>(b.time||"").localeCompare(a.time||""))[0];
  if(last && typeof App.printReceipt==="function")return App.printReceipt(last.id);
  App.toast("El comprobante se genera al completar/cobrar un servicio");
};

document.addEventListener("DOMContentLoaded",()=>{
  App.byId("homeReceiptBtn")?.addEventListener("click",()=>{
    if(window.SaaS?.featureAllowed?.("recibos"))App.go("recibos");
    else App.openBasicReceipt();
  });
});

;

/* ---- js/owner-dashboard.js ---- */
App.renderOwnerDashboard=function(){
  if(!App.byId("ownerMonthSales"))return;
  const month=App.today().slice(0,7);
  const monthSales=App.db.sales.filter(s=>s.date.startsWith(month)).reduce((sum,s)=>sum+Number(s.total||0),0);
  const monthServices=App.db.sales.filter(s=>s.date.startsWith(month)).reduce((sum,s)=>sum+(s.items||[]).filter(i=>i.name).reduce((q,i)=>q+Number(i.qty||1),0),0);
  const todayAppts=App.db.appointments.filter(a=>a.date===App.today()&&a.status!=="Cancelada").sort((a,b)=>a.time.localeCompare(b.time));
  const todayRevenue=App.db.cash.filter(c=>c.date===App.today()&&c.type==="Ingreso").reduce((s,c)=>s+Number(c.amount||0),0);
  const now=new Date().toTimeString().slice(0,5);
  const next=todayAppts.find(a=>a.time>=now&&a.status!=="Finalizada");

  App.byId("ownerMonthSales").textContent=App.money(monthSales);
  App.byId("ownerMonthServices").textContent=`${monthServices} servicios realizados`;
  App.byId("ownerTodayAppointments").textContent=todayAppts.length;
  App.byId("ownerNextAppointment").textContent=next?`${next.time} Â· ${App.clientName(next.clientId)}`:"Sin prÃ³ximas citas";
  App.byId("ownerTodayRevenue").textContent=App.money(todayRevenue);
  App.byId("ownerTodayTransactions").textContent=`${App.db.cash.filter(c=>c.date===App.today()).length} movimientos`;
  App.byId("ownerClients").textContent=App.db.clients.length;
  App.byId("ownerVipClients").textContent=`${App.db.clients.filter(c=>(c.visits||0)>=8||(c.points||0)>=100).length} VIP`;
  App.byId("ownerLowStock").textContent=App.db.products.filter(p=>Number(p.stock)<=Number(p.min)).length;

  App.byId("ownerUpcomingAppointments").innerHTML=todayAppts.slice(0,6).map(a=>`
    <div class="row"><div><strong>${a.time} Â· ${App.clientName(a.clientId)}</strong><small>${App.serviceName(a.serviceId)} Â· ${App.barberName(a.barberId)}</small></div><span class="client-badge">${a.status}</span></div>`).join("")||'<div class="muted">Sin citas para hoy.</div>';

  const perf=App.db.barbers.map(b=>{
    const sales=App.db.sales.filter(s=>s.date.startsWith(month)&&s.barberName===b.name).reduce((sum,s)=>sum+Number(s.total||0),0);
    return {b,sales};
  }).sort((a,b)=>b.sales-a.sales);
  const max=Math.max(1,...perf.map(x=>x.sales));
  App.byId("ownerBarberPerformance").innerHTML=perf.map(x=>`
    <div class="row"><div style="width:100%"><strong>${x.b.name}</strong><small>${App.money(x.sales)} este mes</small><div class="progress"><span style="width:${Math.min(100,x.sales/max*100)}%"></span></div></div></div>`).join("")||'<div class="muted">Sin datos.</div>';

  const svc={};
  App.db.sales.filter(s=>s.date.startsWith(month)).forEach(s=>(s.items||[]).forEach(i=>svc[i.name]=(svc[i.name]||0)+Number(i.qty||1)));
  App.byId("ownerTopServices").innerHTML=Object.entries(svc).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,count],i)=>`
    <div class="row"><div><strong>${i+1}. ${name}</strong><small>${count} vendidos</small></div><strong>${count}</strong></div>`).join("")||'<div class="muted">AÃºn no hay ventas este mes.</div>';

  const alerts=[];
  App.db.products.filter(p=>Number(p.stock)<=Number(p.min)).forEach(p=>alerts.push({critical:Number(p.stock)<=0,text:`${p.name}: ${p.stock} unidades`}));
  App.db.appointments.filter(a=>a.date===App.today()&&a.status==="Pendiente").forEach(a=>alerts.push({critical:false,text:`Cita pendiente ${a.time} Â· ${App.clientName(a.clientId)}`}));
  App.byId("ownerAlerts").innerHTML=alerts.map(a=>`<div class="row alert-row ${a.critical?"critical":""}"><strong>${a.text}</strong></div>`).join("")||'<div class="muted">Todo bajo control.</div>';
};

;

/* ---- js/staff.js ---- */
App.defaultSchedule=function(){
  return [
    {day:0,name:"Domingo",active:false,start:"09:00",end:"19:00"},
    {day:1,name:"Lunes",active:true,start:"09:00",end:"19:00"},
    {day:2,name:"Martes",active:true,start:"09:00",end:"19:00"},
    {day:3,name:"MiÃ©rcoles",active:true,start:"09:00",end:"19:00"},
    {day:4,name:"Jueves",active:true,start:"09:00",end:"19:00"},
    {day:5,name:"Viernes",active:true,start:"09:00",end:"19:00"},
    {day:6,name:"SÃ¡bado",active:true,start:"09:00",end:"19:00"}
  ];
};

App.ensureStaff=function(){
  App.db.employees=App.db.employees||[];
  App.db.attendance=App.db.attendance||[];
  App.db.barbers.forEach(b=>{
    if(!App.db.employees.some(e=>e.barberId===b.id)){
      App.db.employees.push({
        id:App.uid(),barberId:b.id,name:b.name,role:(App.businessVocabulary?.().staffRole||"Profesional"),phone:b.phone||"",pin:"1234",
        serviceCommission:Number(b.commission||40),productCommission:0,monthlyGoal:500,weeklyGoal:125,active:true,
        photo:App.db.business.clientApp.barberPhotos?.[b.id]||"",schedule:App.defaultSchedule()
      });
    }
  });
};

App.saveEmployee=function(){
  const id=App.val("employeeEditId");
  const data={
    name:App.val("employeeName"),
    role:App.val("employeeRole"),
    phone:App.val("employeePhone"),
    pin:App.val("employeePin")||"1234",
    serviceCommission:Number(App.val("employeeServiceCommission")||0),
    productCommission:Number(App.val("employeeProductCommission")||0),
    monthlyGoal:Number(App.val("employeeMonthlyGoal")||0),weeklyGoal:Number(App.val("employeeMonthlyGoal")||0)/4,
    active:App.val("employeeActive")==="true"
  };
  if(!data.name)return App.toast("Escribe el nombre");

  const finish=photo=>{
    if(id){
      const e=App.db.employees.find(x=>x.id===id);Object.assign(e,data);if(photo)e.photo=photo;
      const b=App.db.barbers.find(x=>x.id===e.barberId);if(b){b.name=e.name;b.phone=e.phone;b.commission=e.serviceCommission}
    }else{
      let barberId="";
      if(data.role==="Barbero"){
        const b={id:App.uid(),name:data.name,phone:data.phone,commission:data.serviceCommission};App.db.barbers.push(b);barberId=b.id;
      }
      App.db.employees.push({id:App.uid(),barberId,...data,photo:photo||"",schedule:App.defaultSchedule()});
    }
    App.hide("employeeForm");App.byId("employeeEditId").value="";
    App.logAction(id?"Empleado editado":"Empleado creado","Personal",data.name);
    localStorage.setItem(App.KEY,JSON.stringify(App.db));window.FirebaseBridge?.scheduleImagePush?.();App.renderAll();App.toast("Empleado guardado");
  };
  const file=App.byId("employeePhoto").files[0];
  if(file)App.compressImageLocal(file,520,.78).then(finish).catch(()=>{App.toast("No se pudo procesar la foto");finish("")});else finish("");
};

App.editEmployee=function(id){
  const e=App.db.employees.find(x=>x.id===id);if(!e)return;
  App.show("employeeForm");
  App.byId("employeeEditId").value=e.id;
  App.byId("employeeName").value=e.name||"";
  App.byId("employeeRole").value=e.role||"Profesional";
  App.byId("employeePhone").value=e.phone||"";
  App.byId("employeePin").value=e.pin||"";
  App.byId("employeeServiceCommission").value=e.serviceCommission||0;
  App.byId("employeeProductCommission").value=e.productCommission||0;
  App.byId("employeeMonthlyGoal").value=e.monthlyGoal||0;
  App.byId("employeeActive").value=String(e.active!==false);
};

App.deleteEmployee=function(id){
  if(!App.isAdmin())return App.toast("Solo el administrador puede eliminar empleados");
  const e=App.db.employees.find(x=>x.id===id);if(!e)return;
  App.confirmAction("Eliminar empleado",`Eliminar ${e.name}?`,()=>{
    if(e.barberId)App.db.barbers=App.db.barbers.filter(b=>b.id!==e.barberId);
    App.db.attendance=App.db.attendance.filter(a=>a.employeeId!==id);
    App.db.employees=App.db.employees.filter(x=>x.id!==id);
    App.logAction("Empleado eliminado","Personal",e.name);
    App.persist();
  });
};

App.staffPeriodPerformance=function(employeeId,from,to){
  const e=App.db.employees.find(x=>x.id===employeeId);
  if(!e)return {serviceSales:0,productSales:0,totalSales:0,commission:0,services:0,products:0};
  const sales=App.db.sales.filter(s=>s.date>=from&&s.date<=to && (!e.barberId || s.barberName===App.barberName(e.barberId)));
  let serviceSales=0,productSales=0,services=0,products=0;
  sales.forEach(s=>(s.items||[]).forEach(i=>{
    if(i.type==="Producto"){productSales+=Number(i.total||0);products+=Number(i.qty||1)}
    else{serviceSales+=Number(i.total||0);services+=Number(i.qty||1)}
  }));
  const commission=serviceSales*Number(e.serviceCommission||0)/100 + productSales*Number(e.productCommission||0)/100;
  return {serviceSales,productSales,totalSales:serviceSales+productSales,commission,services,products};
};

App.renderEmployees=function(){
  if(!App.byId("employeeList"))return;
  const from=App.today().slice(0,8)+"01",to=App.today();
  App.byId("employeeList").innerHTML=App.db.employees.map(e=>{
    const p=App.staffPeriodPerformance(e.id,from,to),goal=Number(e.monthlyGoal||0),pct=goal?Math.min(100,p.totalSales/goal*100):0;
    return `<article class="card employee-card">
      <img src="${e.photo||""}" alt="${e.name}">
      <div class="inside">
        <span class="staff-badge">${e.role}</span>
        <h3>${e.name}</h3>
        <div class="muted">${e.phone||"Sin telÃ©fono"}</div>
        <div class="big">${App.money(p.totalSales)}</div>
        <div class="goal-bar"><span style="width:${pct}%"></span></div>
        <div class="muted">${pct.toFixed(0)}% de meta Â· ComisiÃ³n ${App.money(p.commission)}</div>
        <div class="manage-actions"><button class="btn edit" onclick="App.editEmployee('${e.id}')">Editar</button><button class="btn danger" onclick="App.deleteEmployee('${e.id}')">Eliminar</button></div>
      </div>
    </article>`;
  }).join("")||'<div class="muted">Sin empleados.</div>';
};

App.fillStaffSelects=function(){
  const opts=App.db.employees.filter(e=>e.active!==false).map(e=>`<option value="${e.id}">${e.name} Â· ${e.role}</option>`).join("");
  ["attendanceEmployee","scheduleEmployee","historyEmployee"].forEach(id=>{const el=App.byId(id);if(el)el.innerHTML=opts});
};

App.parseHours=function(t){const [h,m]=String(t||"00:00").split(":").map(Number);return h*60+m};
App.workedHours=function(a){
  if(!a.in)return 0;
  const end=a.out||new Date().toTimeString().slice(0,5);
  return Math.max(0,(App.parseHours(end)-App.parseHours(a.in))/60);
};
App.scheduleForDate=function(e,date){
  const day=new Date(date+"T12:00:00").getDay();
  return (e.schedule||App.defaultSchedule()).find(x=>x.day===day);
};

App.clockIn=function(){
  const e=App.db.employees.find(x=>x.id===App.val("attendanceEmployee"));if(!e)return;
  if(String(e.pin)!==String(App.val("attendancePin")))return App.toast("PIN incorrecto");
  if(App.db.attendance.some(a=>a.employeeId===e.id&&a.date===App.today()&&!a.out))return App.toast("Ya existe una entrada abierta");
  const time=new Date().toTimeString().slice(0,5),sch=App.scheduleForDate(e,App.today());
  const late=!!(sch?.active && App.parseHours(time)>App.parseHours(sch.start)+5);
  App.db.attendance.push({id:App.uid(),employeeId:e.id,date:App.today(),in:time,out:"",late});
  App.logAction("Entrada marcada","Asistencia",`${e.name} Â· ${time}`);
  localStorage.setItem(App.KEY,JSON.stringify(App.db));App.renderAll();App.toast(late?"Entrada registrada con retardo":"Entrada registrada");
};
App.clockOut=function(){
  const e=App.db.employees.find(x=>x.id===App.val("attendanceEmployee"));if(!e)return;
  if(String(e.pin)!==String(App.val("attendancePin")))return App.toast("PIN incorrecto");
  const a=[...App.db.attendance].reverse().find(x=>x.employeeId===e.id&&x.date===App.today()&&!x.out);
  if(!a)return App.toast("No hay entrada abierta");
  a.out=new Date().toTimeString().slice(0,5);
  App.logAction("Salida marcada","Asistencia",`${e.name} Â· ${a.out}`);
  localStorage.setItem(App.KEY,JSON.stringify(App.db));App.renderAll();App.toast("Salida registrada");
};

App.renderAttendance=function(){
  if(!App.byId("attendanceTodayList"))return;
  App.fillStaffSelects();
  const arr=App.db.attendance.filter(a=>a.date===App.today());
  App.byId("attendanceWorking").textContent=arr.filter(a=>!a.out).length;
  App.byId("attendanceEntries").textContent=arr.length;
  App.byId("attendanceLate").textContent=arr.filter(a=>a.late).length;
  App.byId("attendanceHours").textContent=arr.reduce((s,a)=>s+App.workedHours(a),0).toFixed(1);
  App.byId("attendanceTodayList").innerHTML=arr.map(a=>{
    const e=App.db.employees.find(x=>x.id===a.employeeId);
    return `<div class="row"><div><strong>${e?.name||"Empleado"}</strong><small>Entrada ${a.in} Â· Salida ${a.out||"Trabajando"} Â· ${App.workedHours(a).toFixed(1)} h</small></div><span class="${a.late?"attendance-late":a.out?"attendance-good":"attendance-open"}">${a.late?"Retardo":a.out?"Completo":"Activo"}</span></div>`;
  }).join("")||'<div class="muted">Sin marcaciones hoy.</div>';
};

App.renderScheduleEditor=function(){
  const box=App.byId("scheduleEditor");if(!box)return;
  App.fillStaffSelects();
  const e=App.db.employees.find(x=>x.id===App.val("scheduleEmployee"))||App.db.employees[0];
  if(!e){box.innerHTML='<div class="muted">Sin empleados.</div>';return}
  e.schedule=e.schedule||App.defaultSchedule();
  box.innerHTML=`<h3>${e.name}</h3>${e.schedule.map((d,i)=>`
    <div class="schedule-row">
      <strong>${d.name}</strong>
      <label>Entrada<input type="time" value="${d.start}" onchange="App.updateSchedule('${e.id}',${i},'start',this.value)"></label>
      <label>Salida<input type="time" value="${d.end}" onchange="App.updateSchedule('${e.id}',${i},'end',this.value)"></label>
      <label><input type="checkbox" style="width:auto" ${d.active?"checked":""} onchange="App.updateSchedule('${e.id}',${i},'active',this.checked)"> Trabaja</label>
    </div>`).join("")}`;
};
App.updateSchedule=function(id,i,key,val){
  const e=App.db.employees.find(x=>x.id===id);if(!e)return;
  e.schedule=e.schedule||App.defaultSchedule();e.schedule[i][key]=val;
  localStorage.setItem(App.KEY,JSON.stringify(App.db));
};

App.renderStaffPerformance=function(){
  if(!App.byId("staffRanking"))return;
  const from=App.val("staffReportFrom")||App.today().slice(0,8)+"01",to=App.val("staffReportTo")||App.today();
  const data=App.db.employees.filter(e=>e.active!==false).map(e=>({e,p:App.staffPeriodPerformance(e.id,from,to)})).sort((a,b)=>b.p.totalSales-a.p.totalSales);
  App.byId("staffRanking").innerHTML=data.map((x,i)=>`<div class="row"><div style="display:flex;align-items:center;gap:10px"><span class="rank-number">${i+1}</span><div><strong>${x.e.name}</strong><small>${x.p.services} servicios Â· ${x.p.products} productos</small></div></div><strong>${App.money(x.p.totalSales)}</strong></div>`).join("")||'<div class="muted">Sin datos.</div>';
  App.byId("staffCommissions").innerHTML=data.map(x=>`<div class="row"><div><strong>${x.e.name}</strong><small>Servicios ${App.money(x.p.serviceSales)} Â· Productos ${App.money(x.p.productSales)}</small></div><strong>${App.money(x.p.commission)}</strong></div>`).join("")||'<div class="muted">Sin datos.</div>';
  App.byId("staffPerformanceCards").innerHTML=data.map(x=>{const goal=Number(x.e.monthlyGoal||0),pct=goal?Math.min(100,x.p.totalSales/goal*100):0;return `<article class="card employee-card"><img src="${x.e.photo||""}"><div class="inside"><h3>${x.e.name}</h3><div class="big">${App.money(x.p.totalSales)}</div><div class="goal-bar"><span style="width:${pct}%"></span></div><div class="muted">${pct.toFixed(0)}% de meta Â· ComisiÃ³n ${App.money(x.p.commission)}</div></div></article>`}).join("");
};

App.renderEmployeeHistory=function(){
  if(!App.byId("employeeAttendanceHistory"))return;
  App.fillStaffSelects();
  const e=App.db.employees.find(x=>x.id===App.val("historyEmployee"))||App.db.employees[0];
  if(!e)return;
  const from=App.val("historyFrom")||App.today().slice(0,8)+"01",to=App.val("historyTo")||App.today();
  const att=App.db.attendance.filter(a=>a.employeeId===e.id&&a.date>=from&&a.date<=to);
  App.byId("employeeAttendanceHistory").innerHTML=att.map(a=>`<div class="row"><div><strong>${a.date}</strong><small>${a.in} - ${a.out||"Abierto"} Â· ${App.workedHours(a).toFixed(1)} h</small></div><span class="${a.late?"attendance-late":"attendance-good"}">${a.late?"Retardo":"Puntual"}</span></div>`).join("")||'<div class="muted">Sin asistencia.</div>';

  const p=App.staffPeriodPerformance(e.id,from,to);
  App.byId("employeeSalesHistory").innerHTML=`<div class="row"><strong>Servicios</strong><strong>${App.money(p.serviceSales)}</strong></div><div class="row"><strong>Productos</strong><strong>${App.money(p.productSales)}</strong></div><div class="row"><strong>Servicios realizados</strong><strong>${p.services}</strong></div><div class="row"><strong>Productos vendidos</strong><strong>${p.products}</strong></div>`;
  const hours=att.reduce((s,a)=>s+App.workedHours(a),0);
  App.byId("employeePaySummary").innerHTML=`<h2>${e.name}</h2><p>${e.role}</p><div class="row"><strong>Periodo</strong><strong>${from} a ${to}</strong></div><div class="row"><strong>Horas trabajadas</strong><strong>${hours.toFixed(1)} h</strong></div><div class="row"><strong>Ventas generadas</strong><strong>${App.money(p.totalSales)}</strong></div><div class="row"><strong>ComisiÃ³n a pagar</strong><strong>${App.money(p.commission)}</strong></div>`;
};

App.printEmployeePay=function(){
  const box=App.byId("employeePaySummary");if(!box)return;
  const w=window.open("","_blank","width=600,height=760");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Resumen de pago</title><style>body{font-family:Arial;padding:28px}.row{display:flex;justify-content:space-between;border-bottom:1px solid #ddd;padding:10px 0}</style></head><body>${box.innerHTML}<script>window.onload=()=>window.print()<\/script></body></html>`);
  w.document.close();
};

/* ===== FASE 11.1 EXTENSION ===== */
App.fillAdvancedStaffSelects=function(){
  const opts=App.db.employees.filter(e=>e.active!==false).map(e=>`<option value="${e.id}">${e.name}</option>`).join("");
  ["absenceEmployee","payrollEmployee"].forEach(id=>{const el=App.byId(id);if(el)el.innerHTML=opts});
};

App.saveAbsence=function(){
  const employeeId=App.val("absenceEmployee"),from=App.val("absenceFrom"),to=App.val("absenceTo")||from;
  if(!employeeId||!from)return App.toast("Completa empleado y fecha");
  const e=App.db.employees.find(x=>x.id===employeeId);
  App.db.absences.push({
    id:App.uid(),employeeId,type:App.val("absenceType"),from,to,note:App.val("absenceNote"),createdAt:new Date().toISOString()
  });
  App.logAction("Ausencia registrada","Personal",`${e?.name||"Empleado"} Â· ${App.val("absenceType")} Â· ${from} a ${to}`);
  localStorage.setItem(App.KEY,JSON.stringify(App.db));
  App.renderAll();App.toast("Ausencia guardada");
};
App.deleteAbsence=function(id){
  if(!App.isAdmin())return App.toast("Solo administrador");
  App.confirmAction("Eliminar ausencia","Â¿Eliminar este registro?",()=>{
    App.db.absences=App.db.absences.filter(x=>x.id!==id);App.persist();
  });
};
App.renderAbsences=function(){
  if(!App.byId("absenceList"))return;
  App.fillAdvancedStaffSelects();
  const list=[...App.db.absences].sort((a,b)=>b.from.localeCompare(a.from));
  App.byId("absenceList").innerHTML=list.map(a=>{
    const e=App.db.employees.find(x=>x.id===a.employeeId);
    const cls=a.type==="Ausencia no justificada"?"unjustified":a.type==="Vacaciones"?"vacation":"";
    return `<div class="row absence-card ${cls}"><div><strong>${e?.name||"Empleado"} Â· ${a.type}</strong><small>${a.from}${a.to!==a.from?` a ${a.to}`:""}${a.note?` Â· ${a.note}`:""}</small></div><button class="btn danger" onclick="App.deleteAbsence('${a.id}')">Eliminar</button></div>`;
  }).join("")||'<div class="muted">Sin ausencias registradas.</div>';
};

App.countAbsenceDays=function(employeeId,from,to){
  let count=0;
  (App.db.absences||[]).filter(a=>a.employeeId===employeeId && a.to>=from && a.from<=to).forEach(a=>{
    const start=new Date((a.from<from?from:a.from)+"T12:00:00"), end=new Date((a.to>to?to:a.to)+"T12:00:00");
    count+=Math.max(1,Math.round((end-start)/86400000)+1);
  });
  return count;
};

App.renderPayroll=function(){
  if(!App.byId("payrollReceipt"))return;
  App.fillAdvancedStaffSelects();
  const e=App.db.employees.find(x=>x.id===App.val("payrollEmployee"))||App.db.employees[0];
  if(!e)return;
  const from=App.val("payrollFrom")||App.today().slice(0,8)+"01",to=App.val("payrollTo")||App.today();
  const att=App.db.attendance.filter(a=>a.employeeId===e.id&&a.date>=from&&a.date<=to);
  const hours=att.reduce((s,a)=>s+App.workedHours(a),0);
  const p=App.staffPeriodPerformance(e.id,from,to);
  const abs=App.countAbsenceDays(e.id,from,to);
  App.byId("payrollHours").textContent=hours.toFixed(1);
  App.byId("payrollSales").textContent=App.money(p.totalSales);
  App.byId("payrollCommission").textContent=App.money(p.commission);
  App.byId("payrollAbsences").textContent=abs;
  App.byId("payrollDetail").innerHTML=`
    <div class="row"><strong>Ventas de servicios</strong><strong>${App.money(p.serviceSales)}</strong></div>
    <div class="row"><strong>Ventas de productos</strong><strong>${App.money(p.productSales)}</strong></div>
    <div class="row"><strong>Servicios realizados</strong><strong>${p.services}</strong></div>
    <div class="row"><strong>Productos vendidos</strong><strong>${p.products}</strong></div>
    <div class="row"><strong>Retardos</strong><strong>${att.filter(a=>a.late).length}</strong></div>
    <div class="row"><strong>DÃ­as de ausencia</strong><strong>${abs}</strong></div>`;
  App.byId("payrollReceipt").innerHTML=`
    <h2>${e.name}</h2><p>${e.role}</p>
    <div class="row"><strong>Periodo</strong><strong>${from} a ${to}</strong></div>
    <div class="row"><strong>Horas</strong><strong>${hours.toFixed(1)} h</strong></div>
    <div class="row"><strong>Ventas generadas</strong><strong>${App.money(p.totalSales)}</strong></div>
    <div class="row"><strong>ComisiÃ³n servicios (${e.serviceCommission||0}%)</strong><strong>${App.money(p.serviceSales*(e.serviceCommission||0)/100)}</strong></div>
    <div class="row"><strong>ComisiÃ³n productos (${e.productCommission||0}%)</strong><strong>${App.money(p.productSales*(e.productCommission||0)/100)}</strong></div>
    <div class="row"><strong>Total comisiÃ³n</strong><strong class="payroll-total">${App.money(p.commission)}</strong></div>`;
};

App.printPayroll=function(){
  const box=App.byId("payrollReceipt");if(!box)return;
  const w=window.open("","_blank","width=620,height=800");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>NÃ³mina</title><style>body{font-family:Arial;padding:30px}.row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #ddd}</style></head><body>${box.innerHTML}<script>window.onload=()=>window.print()<\/script></body></html>`);
  w.document.close();
};

const oldRenderStaffPerformance_111=App.renderStaffPerformance;
App.renderStaffPerformance=function(){
  oldRenderStaffPerformance_111();
  const from=App.val("staffReportFrom")||App.today().slice(0,8)+"01",to=App.val("staffReportTo")||App.today();
  if(App.byId("staffPerformanceCards")){
    App.byId("staffPerformanceCards").innerHTML=App.db.employees.filter(e=>e.active!==false).map(e=>{
      const p=App.staffPeriodPerformance(e.id,from,to),mg=Number(e.monthlyGoal||0),wg=Number(e.weeklyGoal||mg/4||0);
      const monthlyPct=mg?Math.min(100,p.totalSales/mg*100):0;
      const weeklyPct=wg?Math.min(100,p.totalSales/wg*100):0;
      return `<article class="card employee-card"><img src="${e.photo||""}"><div class="inside"><h3>${e.name}</h3><div class="big">${App.money(p.totalSales)}</div><div class="goal-split"><div class="goal-mini"><small>Meta semanal</small><strong>${App.money(wg)}</strong><div class="goal-bar"><span style="width:${weeklyPct}%"></span></div></div><div class="goal-mini"><small>Meta mensual</small><strong>${App.money(mg)}</strong><div class="goal-bar"><span style="width:${monthlyPct}%"></span></div></div></div><div class="muted">ComisiÃ³n ${App.money(p.commission)}</div></div></article>`;
    }).join("");
  }
};

;

/* ---- js/main.js ---- */
App.renderAll=function(){
  App.byId("todayLabel").textContent=new Intl.DateTimeFormat("es-VE",{dateStyle:"full"}).format(new Date());
  if(!App.val("apptDate"))App.byId("apptDate").value=App.today();
  if(!App.val("apptTime"))App.byId("apptTime").value="09:00";
  if(!App.val("cashDate"))App.byId("cashDate").value=App.today();
  App.fillAppointmentSelects();App.renderHome();App.renderAppointments();App.renderClients();App.renderBarbers();App.renderCash();App.renderInventory();App.renderServices();App.renderUsers();App.renderReceipts();App.renderClientApp();App.renderCashShopOrders();App.renderEmployees();App.renderAttendance();App.renderScheduleEditor();App.renderStaffPerformance();App.renderEmployeeHistory();App.renderAbsences();App.renderPayroll();App.renderOwnerDashboard();App.renderApprovals();App.renderReports();App.renderAudit();App.loadConfig();App.loadClientCustomization();App.renderClientRequestAdmin();App.applyRoleUI();App.applyLanguage();App.byId("currencySelect").value=App.db.business.currency||"$";
};

document.addEventListener("DOMContentLoaded",()=>{
  App.load();App.ensurePermissionsData();App.ensureStaff();
  App.byId("logoutBtn").addEventListener("click",App.logout);
  App.byId("confirmCancel").addEventListener("click",App.closeConfirm);
  App.byId("confirmAccept").addEventListener("click",App.acceptConfirm);
  App.byId("openClientAppBtn").addEventListener("click",App.openClientApp);
  App.byId("openClientAppFromReservations").addEventListener("click",App.openClientApp);
  App.byId("closeClientAppBtn").addEventListener("click",App.closeClientApp);
  App.byId("languageSelect").addEventListener("change",e=>App.setLanguage(e.target.value));
  App.byId("currencySelect").addEventListener("change",e=>App.setCurrency(e.target.value));
  document.querySelectorAll(".bottom-nav button").forEach(b=>b.addEventListener("click",()=>App.go(b.dataset.page)));
  document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>App.go(b.dataset.go)));
  document.querySelectorAll(".client-bottom button").forEach(b=>b.addEventListener("click",()=>App.clientGo(b.dataset.clientPage)));
  document.querySelectorAll("[data-client-go]").forEach(b=>b.addEventListener("click",()=>App.clientGo(b.dataset.clientGo)));
  App.byId("toggleAppointmentForm").addEventListener("click",()=>App.show("appointmentForm"));App.byId("cancelAppointmentForm").addEventListener("click",()=>App.hide("appointmentForm"));App.byId("saveAppointmentBtn").addEventListener("click",App.saveAppointment);
  App.byId("toggleClientForm").addEventListener("click",()=>App.show("clientForm"));App.byId("cancelClientForm").addEventListener("click",()=>App.hide("clientForm"));App.byId("saveClientBtn").addEventListener("click",App.saveClient);
  App.byId("toggleBarberForm").addEventListener("click",()=>App.show("barberForm"));App.byId("cancelBarberForm").addEventListener("click",()=>App.hide("barberForm"));App.byId("saveBarberBtn").addEventListener("click",App.saveBarber);
  App.byId("toggleCashForm").addEventListener("click",()=>App.show("cashForm"));App.byId("cancelCashForm").addEventListener("click",()=>App.hide("cashForm"));App.byId("saveCashBtn").addEventListener("click",App.saveCash);
  App.byId("toggleProductForm").addEventListener("click",()=>App.show("productForm"));App.byId("cancelProductForm").addEventListener("click",()=>App.hide("productForm"));App.byId("saveProductBtn").addEventListener("click",App.saveProduct);
  App.byId("toggleServiceForm").addEventListener("click",()=>App.show("serviceForm"));App.byId("cancelServiceForm").addEventListener("click",()=>App.hide("serviceForm"));App.byId("saveServiceBtn").addEventListener("click",App.saveService);
  App.byId("toggleUserForm").addEventListener("click",()=>{App.show("userForm");App.renderRolePreview()});App.byId("cancelUserForm").addEventListener("click",()=>App.hide("userForm"));App.byId("saveUserBtn").addEventListener("click",App.saveUser);App.byId("userRole").addEventListener("change",App.renderRolePreview);
  App.byId("clientBookDate").addEventListener("change",App.renderClientSlots);App.byId("submitClientReservation").addEventListener("click",App.submitClientReservation);App.byId("lookupAppointmentsBtn").addEventListener("click",App.lookupClientAppointments);App.byId("lookupProfileBtn").addEventListener("click",App.lookupClientProfile);
  App.byId("lookupHistoryBtn").addEventListener("click",App.lookupClientHistory);
  App.byId("toggleEmployeeForm").addEventListener("click",()=>App.show("employeeForm"));
  App.byId("cancelEmployeeForm").addEventListener("click",()=>App.hide("employeeForm"));
  App.byId("saveEmployeeBtn").addEventListener("click",App.saveEmployee);
  App.byId("clockInBtn").addEventListener("click",App.clockIn);
  App.byId("clockOutBtn").addEventListener("click",App.clockOut);
  App.byId("scheduleEmployee").addEventListener("change",App.renderScheduleEditor);
  App.byId("staffReportFrom").value=App.today().slice(0,8)+"01";App.byId("staffReportTo").value=App.today();
  App.byId("staffReportFrom").addEventListener("change",App.renderStaffPerformance);App.byId("staffReportTo").addEventListener("change",App.renderStaffPerformance);
  App.byId("historyFrom").value=App.today().slice(0,8)+"01";App.byId("historyTo").value=App.today();
  App.byId("historyEmployee").addEventListener("change",App.renderEmployeeHistory);App.byId("historyFrom").addEventListener("change",App.renderEmployeeHistory);App.byId("historyTo").addEventListener("change",App.renderEmployeeHistory);
  App.byId("printEmployeePayBtn").addEventListener("click",App.printEmployeePay);
  App.byId("printStaffReportBtn").addEventListener("click",()=>window.print());
  App.byId("saveAbsenceBtn").addEventListener("click",App.saveAbsence);
  App.byId("absenceFrom").value=App.today();App.byId("absenceTo").value=App.today();
  App.byId("payrollFrom").value=App.today().slice(0,8)+"01";App.byId("payrollTo").value=App.today();
  App.byId("payrollEmployee").addEventListener("change",App.renderPayroll);App.byId("payrollFrom").addEventListener("change",App.renderPayroll);App.byId("payrollTo").addEventListener("change",App.renderPayroll);
  App.byId("printPayrollBtn").addEventListener("click",App.printPayroll);
  App.byId("clientCheckoutBtn").addEventListener("click",App.clientCheckout);
  App.byId("saveConfigBtn").addEventListener("click",App.saveConfig);
  App.byId("saveClientCustomizationBtn").addEventListener("click",App.saveClientCustomization);
  App.byId("previewClientBtn").addEventListener("click",App.previewClientCustomization);
  App.byId("addPromotionBtn").addEventListener("click",App.addPromotion);
  App.byId("clientLogoFile").addEventListener("change",()=>App.previewSelectedImage("clientLogoFile","clientLogoPreview"));
  App.byId("clientBackgroundFile").addEventListener("change",()=>App.previewSelectedImage("clientBackgroundFile","clientBackgroundPreview"));
  App.byId("exportBackupBtn").addEventListener("click",App.exportBackup);
  App.byId("importBackupInput").addEventListener("change",e=>App.importBackup(e.target.files[0]));
  App.byId("reportFrom").value=App.today().slice(0,8)+"01";App.byId("reportTo").value=App.today();
  App.byId("reportFrom").addEventListener("change",App.renderReports);App.byId("reportTo").addEventListener("change",App.renderReports);
  App.byId("printReportBtn").addEventListener("click",()=>window.print());
  App.byId("auditSearch").addEventListener("input",App.renderAudit);
  App.bindSearch("appointmentSearch","appointments",App.renderAppointments);
  App.bindSearch("clientSearch","clients",App.renderClients);
  App.bindSearch("productSearch","products",App.renderInventory);
  App.bindSearch("serviceSearch","services",App.renderServices);
  App.byId("receiptFrom").value=App.today();App.byId("receiptTo").value=App.today();App.byId("receiptFrom").addEventListener("change",App.renderReceipts);App.byId("receiptTo").addEventListener("change",App.renderReceipts);
  // Production never trusts a legacy localStorage session to open the admin panel.
  if(!App.PRODUCTION_MODE && localStorage.getItem(App.SESSION_KEY)){App.hide("loginView");App.show("adminApp")}
  if(App.PRODUCTION_MODE) localStorage.removeItem(App.SESSION_KEY);
  App.renderAll();
  const mode=new URLSearchParams(location.search).get("cliente");if(mode==="app"||mode==="reservar")App.openClientApp();
});

;
