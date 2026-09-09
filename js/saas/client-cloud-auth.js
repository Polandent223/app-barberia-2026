/* SAMBRIX 1.0 — Cloud client accounts (cross-device) */
import {firebaseConfig} from "../firebase/firebase-config.js";
import {initializeApp,getApps} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {getAuth,setPersistence,browserLocalPersistence,onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut,updateProfile} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {getFirestore,doc,getDoc,setDoc,collection,addDoc,query,where,onSnapshot,serverTimestamp} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const appName="sambrix-client-auth";
const clientApp=getApps().find(a=>a.name===appName)||initializeApp(firebaseConfig,appName);
const auth=getAuth(clientApp);
const db=getFirestore(clientApp);
await setPersistence(auth,browserLocalPersistence);

const normPhone=v=>String(v||"").replace(/\D/g,"");
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const bid=()=>String(new URLSearchParams(location.search).get("business")||window.App?.db?.meta?.businessId||"").trim();
const safeBusiness=v=>String(v||"").toLowerCase().replace(/[^a-z0-9_-]/g,"").slice(0,80);
const authEmail=(businessId,phone)=>`${safeBusiness(businessId)}.${normPhone(phone)}@clients.sambrix.app`;
let profile=null,bookings=[],changes=[],bookingUnsub=null,changeUnsub=null,ready=false;

function profileRef(businessId,uid){return doc(db,"public_businesses",businessId,"client_accounts",uid)}
function currentClient(){
  if(!profile||!auth.currentUser)return null;
  return {id:profile.clientId||auth.currentUser.uid,name:profile.name||auth.currentUser.displayName||"Cliente",phone:profile.phone||"",points:Number(profile.points||0),visits:Number(profile.visits||0),lastVisit:profile.lastVisit||""};
}
async function loadProfile(){
  const businessId=bid(),u=auth.currentUser;
  profile=null;
  if(!businessId||!u)return null;
  const s=await getDoc(profileRef(businessId,u.uid));
  if(s.exists())profile={id:u.uid,...s.data()};
  return profile;
}
function stopBookings(){if(bookingUnsub){try{bookingUnsub()}catch{}bookingUnsub=null}if(changeUnsub){try{changeUnsub()}catch{}changeUnsub=null}bookings=[];changes=[]}
function watchBookings(){
  stopBookings();
  const businessId=bid(),u=auth.currentUser;if(!businessId||!u)return;
  const q=query(collection(db,"public_businesses",businessId,"booking_requests"),where("clientUid","==",u.uid));
  bookingUnsub=onSnapshot(q,s=>{
    bookings=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(b.date||"").localeCompare(String(a.date||""))||String(b.time||"").localeCompare(String(a.time||"")));
    window.App?.lookupClientAppointments?.();
  },e=>{console.error("[SAMBRIX Client bookings]",e);window.App?.toast?.("No se pudieron actualizar tus citas")});
  const cq=query(collection(db,"public_businesses",businessId,"booking_change_requests"),where("clientUid","==",u.uid));
  changeUnsub=onSnapshot(cq,s=>{
    changes=s.docs.map(d=>({id:d.id,...d.data()}));
    window.App?.lookupClientAppointments?.();
  },e=>console.error("[SAMBRIX Client changes]",e));
}
function rerender(){
  const A=window.App;if(!A)return;
  A.ensureClientAuthUI?.();
  if(currentClient()){
    A.renderClientAuthUI?.();
    A.syncClientAccountFields?.();
    A.lookupClientAppointments?.();
    A.lookupClientProfile?.();
  }else A.renderClientAuthUI?.("login");
}

async function register(name,phone,pin){
  const businessId=bid(),p=normPhone(phone);
  if(!businessId)throw new Error("Negocio no identificado");
  if(!name?.trim()||p.length<7)throw new Error("Escribe nombre y WhatsApp válido");
  if(!/^\d{8}$/.test(pin))throw new Error("Por seguridad, el PIN nuevo debe tener 8 números");
  const c=await createUserWithEmailAndPassword(auth,authEmail(businessId,p),pin);
  await updateProfile(c.user,{displayName:name.trim()});
  const clientId=`client_${c.user.uid}`;
  await setDoc(profileRef(businessId,c.user.uid),{
    clientId,name:name.trim(),phone:String(phone||"").trim(),phoneNormalized:p,status:"Activo",createdAt:serverTimestamp(),points:0,visits:0
  });
  await loadProfile();watchBookings();rerender();return profile;
}
async function login(phone,pin){
  const businessId=bid(),p=normPhone(phone);
  if(!businessId)throw new Error("Negocio no identificado");
  if(p.length<7||!/^\d{6,8}$/.test(pin))throw new Error("WhatsApp o PIN inválido");
  await signInWithEmailAndPassword(auth,authEmail(businessId,p),pin);
  const pdoc=await loadProfile();
  if(!pdoc){await signOut(auth);throw new Error("La cuenta no está vinculada a este negocio")}
  if(pdoc.status==="Bloqueado"){await signOut(auth);throw new Error("Esta cuenta está bloqueada. Contacta al negocio")}
  watchBookings();rerender();return pdoc;
}
async function logout(){stopBookings();profile=null;await signOut(auth);rerender()}
async function createBooking(data){
  const businessId=bid(),u=auth.currentUser,c=currentClient();
  if(!businessId||!u||!c)throw new Error("Debes iniciar sesión para reservar");
  return addDoc(collection(db,"public_businesses",businessId,"booking_requests"),{
    name:c.name,phone:c.phone,clientUid:u.uid,clientId:c.id,
    serviceId:String(data.serviceId||""),barberId:String(data.barberId||""),date:String(data.date||""),time:String(data.time||""),
    note:String(data.note||"").slice(0,500),branchId:String(data.branchId||""),status:"Pendiente",createdAt:serverTimestamp()
  });
}
async function requestBookingChange(bookingRequestId,type,newDate="",newTime=""){
  const businessId=bid(),u=auth.currentUser,c=currentClient();
  if(!businessId||!u||!c)throw new Error("Debes iniciar sesión");
  const booking=bookings.find(x=>x.id===bookingRequestId);
  if(!booking||booking.clientUid!==u.uid)throw new Error("Cita no encontrada");
  if(booking.status!=="Aprobada")throw new Error("Solo puedes modificar una cita confirmada");
  if(changes.some(x=>x.bookingRequestId===bookingRequestId&&x.status==="Pendiente"))throw new Error("Ya existe una solicitud pendiente para esta cita");
  if(type==="reschedule"&&(!/^\d{4}-\d{2}-\d{2}$/.test(newDate)||!/^\d{2}:\d{2}$/.test(newTime)))throw new Error("Fecha u hora inválida");
  return addDoc(collection(db,"public_businesses",businessId,"booking_change_requests"),{
    clientUid:u.uid,clientId:c.id,bookingRequestId,type,oldDate:String(booking.date||""),oldTime:String(booking.time||""),
    newDate:type==="reschedule"?newDate:"",newTime:type==="reschedule"?newTime:"",status:"Pendiente",createdAt:serverTimestamp()
  });
}

window.SambrixClientCloud={auth,db,register,login,logout,currentUser:()=>auth.currentUser,currentProfile:()=>profile,currentClient,bookings:()=>bookings.slice(),changes:()=>changes.slice(),createBooking,requestBookingChange,isReady:()=>ready};

onAuthStateChanged(auth,async u=>{
  ready=true;
  if(u){try{await loadProfile();if(profile?.status!=="Bloqueado")watchBookings();else await signOut(auth)}catch(e){console.error("[SAMBRIX Client auth]",e)}}
  else{profile=null;stopBookings()}
  rerender();
});

function installAppBridge(){
  const A=window.App;if(!A)return;
  A.currentClientAccount=()=>profile&&auth.currentUser?{id:auth.currentUser.uid,clientId:profile.clientId,phone:profile.phone,status:profile.status||"Activo"}:null;
  A.currentClient=()=>currentClient();
  A.clientLoggedIn=()=>!!currentClient();
  A.clientRegister2031=async function(){
    const name=A.val("clientRegName2031").trim(),phone=A.val("clientRegPhone2031"),pin=A.val("clientRegPin2031"),pin2=A.val("clientRegPin22031");
    if(pin!==pin2)return A.toast("Los PIN no coinciden");
    try{await register(name,phone,pin);A.clientGo("clientHome");A.toast("Cuenta creada. Ya puedes usarla en cualquier dispositivo")}
    catch(e){const m=String(e?.code||"").includes("email-already-in-use")?"Ese WhatsApp ya tiene cuenta. Ingresa con tu PIN":(e?.message||"No se pudo crear la cuenta");A.toast(m)}
  };
  A.clientLogin2031=async function(){
    try{await login(A.val("clientLoginPhone2031"),A.val("clientLoginPin2031"));A.clientGo("clientHome");A.toast("Sesión iniciada")}
    catch(e){A.toast(String(e?.code||"").includes("invalid-credential")?"WhatsApp o PIN incorrecto":(e?.message||"No se pudo iniciar sesión"))}
  };
  A.clientLogout2031=async function(){A.clientSelection={serviceId:"",barberId:"",time:""};await logout();A.toast("Sesión cerrada")};

  A.lookupClientAppointments=function(){
    const root=A.byId("clientAppointmentsList");if(!root)return;
    if(!currentClient()){root.innerHTML='<div class="muted">Inicia sesión para ver tus citas.</div>';return}
    const rows=bookings;
    const label=s=>s==="Pendiente"?"Pendiente de confirmación":s||"Pendiente";
    root.innerHTML=rows.map(r=>{const cr=changes.filter(x=>x.bookingRequestId===r.id).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0))[0];const pending=cr?.status==="Pendiente";return `<div class="row"><div><strong>${esc(r.date)} ${esc(r.time)}</strong><small>${esc(A.serviceName(r.serviceId))} · ${esc(A.barberName(r.barberId))} · <strong>${esc(label(r.status))}</strong>${cr?` · Solicitud ${esc(cr.type==="cancel"?"cancelación":"reprogramación")}: ${esc(cr.status)}`:""}</small>${r.status==="Pendiente"?'<div class="muted">El negocio todavía debe confirmar esta cita.</div>':''}${r.status==="Rechazada"?`<div class="muted">Solicitud no confirmada${r.reason?`: ${esc(r.reason)}`:""}.</div>`:""}</div>${r.status==="Aprobada"&&!pending?`<div class="request-actions"><button class="btn secondary" onclick="App.requestCloudReschedule('${r.id}')">Reprogramar</button><button class="btn danger" onclick="App.requestCloudCancel('${r.id}')">Cancelar</button></div>`:""}</div>`}).join("")||'<div class="muted">No tienes citas registradas.</div>';
  };
  A.requestCloudCancel=async function(id){if(!confirm("¿Solicitar la cancelación de esta cita?"))return;try{await requestBookingChange(id,"cancel");A.toast("Solicitud de cancelación enviada")}catch(e){A.toast(e?.message||"No se pudo enviar")}};
  A.requestCloudReschedule=async function(id){const b=bookings.find(x=>x.id===id);if(!b)return;const date=prompt("Nueva fecha YYYY-MM-DD",b.date||"");if(!date)return;const time=prompt("Nueva hora HH:MM",b.time||"");if(!time)return;try{await requestBookingChange(id,"reschedule",date,time);A.toast("Solicitud de reprogramación enviada")}catch(e){A.toast(e?.message||"No se pudo enviar")}};
  A.lookupClientProfile=function(){
    const c=currentClient();if(!c)return;
    const root=A.byId("clientProfileData");if(root)root.innerHTML=`<div class="loyalty-card"><span>MI CUENTA SAMBRIX</span><h2 style="color:#fff;margin:8px 0">${esc(c.name)}</h2><div>${esc(c.phone)} · <strong>${c.points||0} puntos</strong> · ${c.visits||0} visitas</div><small>Cuenta protegida y sincronizada con Firebase.</small></div>`;
    const promos=A.byId("clientPersonalPromos");if(promos)promos.innerHTML='<h3>Promociones para ti</h3><div class="muted">Tus beneficios aparecerán aquí cuando estén disponibles.</div>';
  };
  A.syncClientAccountFields=function(){const c=currentClient();if(!c)return;[["clientBookName",c.name],["clientBookPhone",c.phone],["clientLookupPhone",c.phone],["clientProfilePhone",c.phone],["clientHistoryPhone",c.phone]].forEach(([id,v])=>{const el=document.getElementById(id);if(el){el.value=v||"";el.readOnly=true}})};
  rerender();
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",installAppBridge);else installAppBridge();
