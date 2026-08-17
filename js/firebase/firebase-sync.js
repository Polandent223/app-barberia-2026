
import {firestore,doc,getDoc,setDoc,onSnapshot,serverTimestamp} from "./firebase-core.js";
import {getLocalAssets,splitCloudState,combineCloudState,restoreLocalAssets} from "./firebase-data.js";

const COL="barberia_state";
let unsubs=[],realtime=false,applyingRemote=false,pushTimer=null;

async function readPart(name){
  const s=await getDoc(doc(firestore,COL,name));
  return s.exists()?(s.data().payload||{}):{};
}
async function writePart(name,payload){
  await setDoc(doc(firestore,COL,name),{payload,updatedAt:serverTimestamp(),updatedBy:window.FirebaseBridge?.user?.email||""},{merge:true});
}
export async function uploadAll(){
  const state=splitCloudState(window.App.db);
  await Promise.all([writePart("config",state.config),writePart("operations",state.operations),writePart("history",state.history)]);
}
export async function downloadAll(){
  const App=window.App,assets=getLocalAssets(App.db);
  const [config,operations,history]=await Promise.all([readPart("config"),readPart("operations"),readPart("history")]);
  if(!Object.keys(config).length&&!Object.keys(operations).length&&!Object.keys(history).length)throw new Error("Todavía no hay datos guardados en Firestore.");
  applyingRemote=true;
  try{
    App.db=restoreLocalAssets(combineCloudState(config,operations,history),assets);
    App.ensurePermissionsData?.();App.ensureStaff?.();
    localStorage.setItem(App.KEY,JSON.stringify(App.db));
    App.renderAll?.();
  }finally{setTimeout(()=>applyingRemote=false,100)}
}
function applyPart(part,payload){
  const App=window.App,assets=getLocalAssets(App.db);
  applyingRemote=true;
  try{
    App.db=restoreLocalAssets({...App.db,...payload},assets);
    App.ensurePermissionsData?.();App.ensureStaff?.();
    localStorage.setItem(App.KEY,JSON.stringify(App.db));
    App.renderAll?.();
  }finally{setTimeout(()=>applyingRemote=false,100)}
}
export function enableRealtime(){
  disableRealtime();
  ["config","operations","history"].forEach(part=>{
    unsubs.push(onSnapshot(doc(firestore,COL,part),s=>{if(s.exists()&&s.data()?.payload)applyPart(part,s.data().payload)},e=>window.FirebaseBridge?.setError?.(e)));
  });
  realtime=true;
}
export function disableRealtime(){unsubs.forEach(f=>{try{f()}catch{}});unsubs=[];realtime=false}
export function isRealtimeEnabled(){return realtime}
export function scheduleCloudPush(){
  if(applyingRemote||!window.FirebaseBridge?.connected)return;
  clearTimeout(pushTimer);
  pushTimer=setTimeout(async()=>{try{await uploadAll();window.FirebaseBridge?.setSynced?.()}catch(e){window.FirebaseBridge?.setError?.(e)}},900);
}
