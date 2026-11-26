/* Observe revocation of an already authenticated business session. */
import {auth,firestore,doc,onSnapshot,onAuthStateChanged} from "../firebase/firebase-core.js";
let observed="", generation=0, unsub=[], leaving=false;
function reset(){generation++;observed="";for(const stop of unsub.splice(0)){try{stop();}catch{}}}
function check(){
  if(leaving)return;
  const session=window.SaaS?.session,uid=auth.currentUser?.uid||"",id=String(session?.businessId||"");
  const role=String(session?.role||"");
  const key=uid&&id&&["owner","admin","manager","reception","cashier","barber"].includes(role)?uid+":"+id+":"+role:"";
  if(key===observed)return;
  reset();if(!key)return;observed=key;
  const g=generation;
  const current=()=>g===generation&&auth.currentUser?.uid===uid&&window.SaaS?.session?.businessId===id;
  async function revoke(){
    if(!current()||leaving)return;leaving=true;reset();
    window.App?.toast?.("El acceso de esta empresa o usuario está suspendido. Contacta a SAMBRIX.");
    try{await window.SaaS?.signOutToPortal?.();}catch(e){console.warn("[SAMBRIX access guard]",e);}finally{leaving=false;}
  }
  function error(e){if(e?.code==="permission-denied")revoke();else console.warn("[SAMBRIX access guard]",e);}
  const server=s=>current()&&!s.metadata.fromCache&&!s.metadata.hasPendingWrites;
  unsub.push(onSnapshot(doc(firestore,"platform_users",uid),{includeMetadataChanges:true},s=>{if(server(s)&&(!s.exists()||s.data().active===false))revoke();},error));
  unsub.push(onSnapshot(doc(firestore,"businesses",id,"members",uid),{includeMetadataChanges:true},s=>{if(server(s)&&(!s.exists()||s.data().active===false))revoke();},error));
  unsub.push(onSnapshot(doc(firestore,"businesses",id),{includeMetadataChanges:true},s=>{if(server(s)&&(!s.exists()||s.data().accessSuspended===true||["suspendido","suspended","inactivo","inactive","bloqueado","blocked"].includes(String(s.data().status||"").toLowerCase())))revoke();},error));
}
onAuthStateChanged(auth,()=>{reset();check();});
setInterval(check,1200);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)check();});
