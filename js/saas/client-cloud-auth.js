/* SAMBRIX 1.0 — Cloud client accounts (cross-device) */
import {firebaseConfig} from "../firebase/firebase-config.js";
import {initializeApp,getApps} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {getAuth,setPersistence,browserLocalPersistence,onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut,updateProfile,deleteUser} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {getFirestore,doc,getDoc,getDocFromServer,setDoc,collection,addDoc,query,where,onSnapshot,serverTimestamp,writeBatch} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import {available,dayValid,minute} from "./client-booking-core.js?v=2.0.8";

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
let profile=null,profileBusiness="",profileUid="",bookings=[],changes=[],bookingUnsub=null,changeUnsub=null,ready=false,profileGeneration=0;
const notify=()=>document.dispatchEvent(new Event("sambrix-client-cloud-change"));

function profileRef(businessId,uid){return doc(db,"public_businesses",businessId,"client_accounts",uid)}
function currentClient(){
  if(!profile||!auth.currentUser||profileBusiness!==bid()||profileUid!==auth.currentUser.uid||profile.status!=="Activo")return null;
  return {id:profile.clientId||auth.currentUser.uid,name:profile.name||auth.currentUser.displayName||"Cliente",phone:profile.phone||"",points:Number(profile.points||0),visits:Number(profile.visits||0),lastVisit:profile.lastVisit||""};
}
async function loadProfile(){
  const businessId=bid(),u=auth.currentUser;
  const gen=++profileGeneration;if(profileBusiness!==businessId||profileUid!==u?.uid){profile=null;profileBusiness="";profileUid="";}
  if(!businessId||!u)return null;
  const s=await getDocFromServer(profileRef(businessId,u.uid));
  if(bid()!==businessId||auth.currentUser?.uid!==u.uid)return null;
  const value=s.exists()?{id:u.uid,...s.data()}:null;
  if(gen===profileGeneration){profile=value;profileBusiness=value?businessId:"";profileUid=value?u.uid:"";}
  return value;
}
function stopBookings(){if(bookingUnsub){try{bookingUnsub()}catch{}bookingUnsub=null}if(changeUnsub){try{changeUnsub()}catch{}changeUnsub=null}bookings=[];changes=[]}
function watchBookings(){
  stopBookings();
  const businessId=bid(),u=auth.currentUser;if(!businessId||!u)return;
  const q=query(collection(db,"public_businesses",businessId,"booking_requests"),where("clientUid","==",u.uid));
  bookingUnsub=onSnapshot(q,s=>{
    bookings=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(b.date||"").localeCompare(String(a.date||""))||String(b.time||"").localeCompare(String(a.time||"")));
    if(bid()!==businessId||auth.currentUser?.uid!==u.uid){stopBookings();return;}
    window.App?.lookupClientAppointments?.();notify();
  },e=>{console.error("[SAMBRIX Client bookings]",e);window.App?.toast?.("No se pudieron actualizar tus citas")});
  const cq=query(collection(db,"public_businesses",businessId,"booking_change_requests"),where("clientUid","==",u.uid));
  changeUnsub=onSnapshot(cq,s=>{
    changes=s.docs.map(d=>({id:d.id,...d.data()}));
    if(bid()!==businessId||auth.currentUser?.uid!==u.uid){stopBookings();return;}
    window.App?.lookupClientAppointments?.();notify();
  },e=>console.error("[SAMBRIX Client changes]",e));
}
function rerender(){
  notify();const A=window.App;if(!A)return;
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
  if(name?.trim().length<2||name.trim().length>120||p.length<7||p.length>20||String(phone||"").trim().length>30)throw new Error("Escribe nombre y WhatsApp válido");
  if(!/^\d{8}$/.test(pin))throw new Error("Por seguridad, el PIN nuevo debe tener 8 números");
  const c=await createUserWithEmailAndPassword(auth,authEmail(businessId,p),pin);
  const clientId=`client_${c.user.uid}`;
  try {
    await updateProfile(c.user,{displayName:name.trim()});
    await setDoc(profileRef(businessId,c.user.uid),{
      clientId,name:name.trim(),phone:String(phone||"").trim(),phoneNormalized:p,status:"Activo",createdAt:serverTimestamp(),points:0,visits:0
    });
  } catch(error) {
    // Do not leave an Auth account without its required business profile.
    // On an ambiguous network failure, only delete after confirming absence.
    try {
      const existing=await getDoc(profileRef(businessId,c.user.uid));
      if(!existing.exists() && !existing.metadata.fromCache) await deleteUser(c.user);
    } catch(cleanupError) { console.warn("[SAMBRIX client registration cleanup]",cleanupError); }
    throw error;
  }
  await loadProfile();watchBookings();rerender();return profile;
}
async function login(phone,pin){
  const businessId=bid(),p=normPhone(phone);
  if(!businessId)throw new Error("Negocio no identificado");
  if(p.length<7||!/^\d{6,8}$/.test(pin))throw new Error("WhatsApp o PIN inválido");
  await signInWithEmailAndPassword(auth,authEmail(businessId,p),pin);
  const pdoc=await loadProfile();
  if(!pdoc){await signOut(auth);throw new Error("La cuenta no está vinculada a este negocio")}
  if(pdoc.status!=="Activo"){await signOut(auth);throw new Error("Esta cuenta está bloqueada. Contacta al negocio")}
  watchBookings();rerender();return pdoc;
}
async function logout(){profileGeneration++;stopBookings();profile=null;profileBusiness="";profileUid="";await signOut(auth);rerender()}
async function verifiedAvailability(businessId){
  const [business,availability]=await Promise.all([
    getDocFromServer(doc(db,"public_businesses",businessId)),
    getDocFromServer(doc(db,"public_businesses",businessId,"public_state","availability"))
  ]);
  if(!business.exists()||!["Activo","Prueba"].includes(business.data().status))throw Error("El negocio no está recibiendo reservas.");
  if(!availability.exists())throw Error("La agenda todavía no está publicada. Contacta al negocio.");
  const p=business.data(),a=availability.data();
  if(a.businessId!==businessId)throw Error("No se pudo verificar la agenda.");
  return {...p,businessHours:a.businessHours,barbers:a.barbers||[],busy:a.busy||[]};
}
async function createBooking(data){
  const businessId=bid(),u=auth.currentUser,c=currentClient();
  if(!businessId||!u||!c)throw new Error("Debes iniciar sesión para reservar");
  const serviceId=String(data.serviceId||""),barberId=String(data.barberId||""),date=String(data.date||""),time=String(data.time||"");
  if(!serviceId||!barberId||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)||!/^[0-9]{2}:[0-9]{2}$/.test(time))throw new Error("Horario inválido");
  const live=await verifiedAvailability(businessId);
  if(!available(live,serviceId,barberId,date,time))throw Error("Ese horario ya no está disponible. Selecciona otro.");
  if(auth.currentUser?.uid!==u.uid||bid()!==businessId||!currentClient())throw Error("La sesión cambió.");
  if(String(data.branchId||"")!==String(live.branch?.id||""))throw Error("La sucursal cambió. Actualiza.");
  const slotId=barberId+"_"+date+"_"+time;
  const slotRef=doc(db,"public_businesses",businessId,"booking_slots",slotId);
  const requestRef=doc(collection(db,"public_businesses",businessId,"booking_requests"));
  // A client cannot read an empty or another client's private slot.
  // The rules grant create only; an existing slot rejects this entire batch.
  const batch=writeBatch(db);
    batch.set(slotRef,{clientUid:u.uid,clientId:c.id,bookingRequestId:requestRef.id,barberId,date,time,status:"Pendiente",createdAt:serverTimestamp()});
    batch.set(requestRef,{name:c.name,phone:c.phone,clientUid:u.uid,clientId:c.id,serviceId,barberId,date,time,note:String(data.note||"").slice(0,500),branchId:String(data.branchId||""),status:"Pendiente",slotId,createdAt:serverTimestamp()});
  try{await batch.commit();}catch(e){if(e.code==="permission-denied")throw Error("No se pudo reservar: el horario pudo ocuparse o el negocio no acepta reservas. Actualiza la agenda.");throw e;}
  return requestRef;
}
async function requestBookingChange(bookingRequestId,type,newDate="",newTime=""){
  const businessId=bid(),u=auth.currentUser,c=currentClient();
  if(!businessId||!u||!c)throw new Error("Debes iniciar sesión");
  const booking=bookings.find(x=>x.id===bookingRequestId);
  if(!booking||booking.clientUid!==u.uid)throw new Error("Cita no encontrada");
  if(booking.status!=="Aprobada")throw new Error("Solo puedes modificar una cita confirmada");
  if(changes.some(x=>x.bookingRequestId===bookingRequestId&&x.status==="Pendiente"))throw new Error("Ya existe una solicitud pendiente para esta cita");
  if(type==="reschedule"&&(!/^\d{4}-\d{2}-\d{2}$/.test(newDate)||!/^\d{2}:\d{2}$/.test(newTime)))throw new Error("Fecha u hora inválida");
  const changeRef=doc(collection(db,"public_businesses",businessId,"booking_change_requests"));
  if(type!=="reschedule"){
    await setDoc(changeRef,{clientUid:u.uid,clientId:c.id,bookingRequestId,type,oldDate:String(booking.date||""),oldTime:String(booking.time||""),newDate:"",newTime:"",status:"Pendiente",createdAt:serverTimestamp()});
    return changeRef;
  }
  const live=await verifiedAvailability(businessId);
  if(!available(live,booking.serviceId,booking.barberId,newDate,newTime))throw Error("El nuevo horario no está disponible.");
  if(auth.currentUser?.uid!==u.uid||bid()!==businessId||!currentClient())throw Error("La sesión cambió.");
  const slotId=String(booking.barberId||"")+"_"+newDate+"_"+newTime;
  const slotRef=doc(db,"public_businesses",businessId,"booking_slots",slotId);
  // A client cannot read an empty or another client's private slot.
  // The rules grant create only; an existing slot rejects this entire batch.
  const batch=writeBatch(db);
    batch.set(slotRef,{clientUid:u.uid,clientId:c.id,bookingRequestId,changeRequestId:changeRef.id,barberId:String(booking.barberId||""),date:newDate,time:newTime,status:"CambioPendiente",createdAt:serverTimestamp()});
    batch.set(changeRef,{clientUid:u.uid,clientId:c.id,bookingRequestId,type,oldDate:String(booking.date||""),oldTime:String(booking.time||""),newDate,newTime,newSlotId:slotId,status:"Pendiente",createdAt:serverTimestamp()});
  await batch.commit();
  return changeRef;
}

window.SambrixClientCloud={auth,db,register,login,logout,verifiedAvailability,currentUser:()=>auth.currentUser,currentProfile:()=>profile,currentClient,bookings:()=>bookings.slice(),changes:()=>changes.slice(),createBooking,requestBookingChange,isReady:()=>ready};

onAuthStateChanged(auth,async u=>{
  ready=true;
  if(u){try{await loadProfile();if(profile?.status==="Activo")watchBookings();else if(profile)await signOut(auth)}catch(e){console.error("[SAMBRIX Client auth]",e)}}
  else{profileGeneration++;profile=null;profileBusiness="";profileUid="";stopBookings()}
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
