
import {FIREBASE_SDK_VERSION} from "./firebase-core.js";
import {observeFirebaseAuth,firebaseLogin,firebaseCreateFirstAdmin,firebaseLogout} from "./firebase-auth.js";
import {uploadAll,downloadAll,enableRealtime,disableRealtime,scheduleCloudPush} from "./firebase-sync.js";
const $=id=>document.getElementById(id);

function friendly(e){
  const m={"auth/invalid-credential":"Correo o contraseña incorrectos.","auth/invalid-email":"Correo inválido.","auth/email-already-in-use":"Ese correo ya existe.","auth/weak-password":"Contraseña demasiado débil.","auth/network-request-failed":"Sin conexión con Firebase.","permission-denied":"Firestore bloqueó la operación por las reglas."};
  return m[e?.code]||e?.message||"Error de Firebase.";
}
function status(mode,text){
  const b=$("firebaseStatusBadge"),t=$("firebaseTopStatus");
  if(b){b.className=`firebase-status ${mode}`;b.textContent=text}
  if(t){t.classList.toggle("online",mode==="online");t.textContent=mode==="online"?"☁ Nube":"☁ Local"}
}
const Bridge={connected:false,user:null,realtime:false,lastSync:null,setError(e){console.error(e);status("offline","Error");window.App?.toast?.(friendly(e))},setSynced(){this.lastSync=new Date();status("online","Sincronizado")}};
window.FirebaseBridge=Bridge;

function controls(){
  const on=Bridge.connected;
  ["firebaseUploadBtn","firebaseDownloadBtn","firebaseRealtimeBtn"].forEach(id=>{if($(id))$(id).disabled=!on});
  $("firebaseLoginBtn")?.classList.toggle("hidden",on);$("firebaseCreateAdminBtn")?.classList.toggle("hidden",on);$("firebaseLogoutBtn")?.classList.toggle("hidden",!on);
  if($("firebaseAccountInfo"))$("firebaseAccountInfo").innerHTML=on?`<strong>Conectado:</strong> ${Bridge.user?.email||""}<br><small>Firebase JS ${FIREBASE_SDK_VERSION}</small>`:"Firebase todavía no está conectado.";
  if($("firebaseRealtimeBtn"))$("firebaseRealtimeBtn").textContent=Bridge.realtime?"✓ Tiempo real activo":"↻ Activar tiempo real";
}
async function login(){
  const e=$("firebaseEmail")?.value.trim(),p=$("firebasePassword")?.value||"";if(!e||!p)return window.App?.toast?.("Escribe correo y contraseña Firebase");
  status("connecting","Conectando...");try{await firebaseLogin(e,p);window.App?.toast?.("Firebase conectado")}catch(err){Bridge.setError(err)}
}
async function createAdmin(){
  const e=$("firebaseEmail")?.value.trim(),p=$("firebasePassword")?.value||"";if(!e||!p)return window.App?.toast?.("Escribe correo y contraseña");
  if(p.length<6)return window.App?.toast?.("Usa mínimo 6 caracteres");
  status("connecting","Creando...");try{await firebaseCreateFirstAdmin(e,p);window.App?.toast?.("Administrador Firebase creado")}catch(err){Bridge.setError(err)}
}
async function logout(){try{disableRealtime();Bridge.realtime=false;await firebaseLogout();window.App?.toast?.("Firebase desconectado")}catch(e){Bridge.setError(e)}}
async function upload(){status("connecting","Subiendo...");try{await uploadAll();Bridge.setSynced();window.App?.toast?.("Datos subidos a Firestore")}catch(e){Bridge.setError(e)}}
async function download(){
  if(!confirm("¿Bajar datos de Firestore? Se reemplazarán los datos locales y se conservarán las fotos locales."))return;
  status("connecting","Descargando...");try{await downloadAll();Bridge.setSynced();window.App?.toast?.("Datos descargados")}catch(e){Bridge.setError(e)}
}
function realtime(){if(Bridge.realtime){disableRealtime();Bridge.realtime=false;window.App?.toast?.("Tiempo real desactivado")}else{enableRealtime();Bridge.realtime=true;window.App?.toast?.("Tiempo real activo")}controls()}
function hookPersist(){
  const App=window.App;if(!App||App.__firebasePersistHook||!App.persist)return;
  const old=App.persist.bind(App);App.persist=function(){const r=old();scheduleCloudPush();return r};App.__firebasePersistHook=true;
}
function boot(){
  hookPersist();
  $("firebaseLoginBtn")?.addEventListener("click",login);$("firebaseCreateAdminBtn")?.addEventListener("click",createAdmin);$("firebaseLogoutBtn")?.addEventListener("click",logout);
  $("firebaseUploadBtn")?.addEventListener("click",upload);$("firebaseDownloadBtn")?.addEventListener("click",download);$("firebaseRealtimeBtn")?.addEventListener("click",realtime);
  status("offline","Desconectado");controls();
  observeFirebaseAuth(u=>{Bridge.user=u;Bridge.connected=!!u;if(u)status("online","Conectado");else{disableRealtime();Bridge.realtime=false;status("offline","Desconectado")}controls()});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
