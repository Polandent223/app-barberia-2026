import {FIREBASE_SDK_VERSION} from "./firebase-core.js";
import {observeFirebaseAuth,firebaseLogin,firebaseCreateFirstAdmin,firebaseLogout} from "./firebase-auth.js";
import {uploadAll,downloadAll,enableRealtime,disableRealtime,scheduleCloudPush} from "./firebase-sync.js";
import {uploadImages,downloadImages,enableImageRealtime,disableImageRealtime,cloudImageStatus,scheduleImagePush} from "./firebase-images.js";

const $=id=>document.getElementById(id);

function friendly(e){
  const m={
    "auth/invalid-credential":"Correo o contraseña incorrectos.",
    "auth/invalid-email":"Correo inválido.",
    "auth/email-already-in-use":"Ese correo ya existe.",
    "auth/weak-password":"Contraseña demasiado débil.",
    "auth/network-request-failed":"Sin conexión con Firebase.",
    "permission-denied":"Firestore bloqueó la operación por las reglas."
  };
  return m[e?.code]||e?.message||"Error de Firebase.";
}

function status(mode,text){
  const b=$("firebaseStatusBadge");
  if(b){b.className=`firebase-status ${mode}`;b.textContent=text}
}

const Bridge={
  connected:false,
  user:null,
  realtime:false,
  autoReady:false,
  lastSync:null,
  scheduleImagePush,
  setError(e){
    console.error("[Firebase]",e);
    status("offline","Error");
    window.App?.toast?.(friendly(e));
  },
  setSynced(){
    this.lastSync=new Date();
    status("online","Sincronizado");
  }
};
window.FirebaseBridge=Bridge;

function controls(){
  const on=Bridge.connected;
  ["firebaseUploadBtn","firebaseDownloadBtn","firebaseRealtimeBtn","firebaseUploadImagesBtn","firebaseDownloadImagesBtn"].forEach(id=>{
    if($(id))$(id).disabled=!on;
  });
  $("firebaseLoginBtn")?.classList.toggle("hidden",on);
  $("firebaseCreateAdminBtn")?.classList.toggle("hidden",on);
  $("firebaseLogoutBtn")?.classList.toggle("hidden",!on);

  if($("firebaseAccountInfo")){
    $("firebaseAccountInfo").innerHTML=on
      ? `<strong>Conectado:</strong> ${Bridge.user?.email||""}<br><small>Sincronización automática activa · Firebase JS ${FIREBASE_SDK_VERSION}</small>`
      : "Firebase todavía no está conectado.";
  }
  if($("firebaseRealtimeBtn")){
    $("firebaseRealtimeBtn").textContent=Bridge.realtime?"✓ Tiempo real activo":"↻ Activar tiempo real";
  }
}

async function login(){
  const e=$("firebaseEmail")?.value.trim(),p=$("firebasePassword")?.value||"";
  if(!e||!p)return window.App?.toast?.("Escribe correo y contraseña Firebase");
  status("connecting","Conectando...");
  try{
    await firebaseLogin(e,p);
  }catch(err){Bridge.setError(err)}
}

async function createAdmin(){
  const e=$("firebaseEmail")?.value.trim(),p=$("firebasePassword")?.value||"";
  if(!e||!p)return window.App?.toast?.("Escribe correo y contraseña");
  if(p.length<6)return window.App?.toast?.("Usa mínimo 6 caracteres");
  status("connecting","Creando...");
  try{
    await firebaseCreateFirstAdmin(e,p);
  }catch(err){Bridge.setError(err)}
}

async function logout(){
  try{
    disableRealtime();disableImageRealtime();
    Bridge.realtime=false;Bridge.autoReady=false;
    await firebaseLogout();
    status("offline","Desconectado");
    controls();
    window.App?.toast?.("Firebase desconectado");
  }catch(e){Bridge.setError(e)}
}

async function upload(){
  status("connecting","Subiendo...");
  try{await uploadAll();Bridge.setSynced();window.App?.toast?.("Datos subidos a Firestore")}catch(e){Bridge.setError(e)}
}
async function download(){
  status("connecting","Descargando...");
  try{await downloadAll();Bridge.setSynced();window.App?.toast?.("Datos descargados")}catch(e){Bridge.setError(e)}
}
async function uploadPics(){
  status("connecting","Subiendo fotos...");
  try{await uploadImages();Bridge.setSynced();window.App?.toast?.("Imágenes subidas")}catch(e){Bridge.setError(e)}
}
async function downloadPics(){
  status("connecting","Bajando fotos...");
  try{await downloadImages();Bridge.setSynced();window.App?.toast?.("Imágenes descargadas")}catch(e){Bridge.setError(e)}
}

function startRealtime(){
  if(Bridge.realtime)return;
  enableRealtime();
  enableImageRealtime();
  Bridge.realtime=true;
  controls();
}

function stopRealtime(){
  disableRealtime();
  disableImageRealtime();
  Bridge.realtime=false;
  controls();
}

function realtime(){
  if(Bridge.realtime){stopRealtime();window.App?.toast?.("Tiempo real desactivado")}
  else{startRealtime();window.App?.toast?.("Tiempo real activo")}
}

async function autoSynchronize(){
  if(!Bridge.connected || Bridge.autoReady)return;
  status("connecting","Sincronizando...");
  try{
    // A second/new device should always receive cloud state first.
    await downloadAll();
    try{await downloadImages()}catch(e){
      // Image document may not exist yet; data sync should still continue.
      console.warn("[Firebase images]",e);
    }
    startRealtime();
    Bridge.autoReady=true;
    Bridge.setSynced();
    window.App?.toast?.("Datos sincronizados automáticamente");
  }catch(err){
    // If cloud is still empty (first device), do not destroy local data.
    const msg=String(err?.message||"");
    if(msg.includes("Todavía no hay datos")){
      status("online","Conectado");
      startRealtime();
      Bridge.autoReady=true;
    }else{
      Bridge.setError(err);
    }
  }
}

function hookPersist(){
  const App=window.App;
  if(!App||App.__firebasePersistHook||!App.persist)return;
  const old=App.persist.bind(App);
  App.persist=function(){
    const r=old();
    scheduleCloudPush();
    return r;
  };
  App.__firebasePersistHook=true;
}

function bind(){
  $("firebaseLoginBtn")?.addEventListener("click",login);
  $("firebaseCreateAdminBtn")?.addEventListener("click",createAdmin);
  $("firebaseLogoutBtn")?.addEventListener("click",logout);
  $("firebaseUploadBtn")?.addEventListener("click",upload);
  $("firebaseDownloadBtn")?.addEventListener("click",download);
  $("firebaseRealtimeBtn")?.addEventListener("click",realtime);
  $("firebaseUploadImagesBtn")?.addEventListener("click",uploadPics);
  $("firebaseDownloadImagesBtn")?.addEventListener("click",downloadPics);
}

function boot(){
  hookPersist();
  bind();
  status("offline","Desconectado");
  controls();

  observeFirebaseAuth(async u=>{
    Bridge.user=u;
    Bridge.connected=!!u;
    if(u){
      status("online","Conectado");
      controls();
      await autoSynchronize();
    }else{
      stopRealtime();
      Bridge.autoReady=false;
      status("offline","Desconectado");
      controls();
    }
  });
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);
else boot();
