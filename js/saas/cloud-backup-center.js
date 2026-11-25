/* SAMBRIX — immutable operational backups, review and encrypted export. */
import {auth,firestore,onAuthStateChanged} from "../firebase/firebase-core.js";
import {doc,collection,query,orderBy,limit,getDocsFromServer,getDocFromServer,runTransaction,addDoc,serverTimestamp} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import {fingerprint} from "./sync-conflict.js?v=2.0.3";
const DOMAINS=["config","crm","schedule","finance","inventory","staff","attendance","history","operations"];
const LABEL={config:"Configuración",crm:"Clientes",schedule:"Agenda",finance:"Caja y ventas",inventory:"Inventario",staff:"Personal",attendance:"Asistencia",history:"Historial",operations:"Operaciones antiguas"};
const admin=()=>!!auth.currentUser&&window.SaaS?.session?.role==="superadmin";
const uid=()=>auth.currentUser?.uid||"";
const companies=()=>window.SaaS?.db?.businesses||[];
const $=id=>document.getElementById(id);
const n=(tag,text="",cls="")=>{const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;return e;};
const btn=(text,fn,cls="secondary")=>{const b=n("button",text,"btn "+cls);b.type="button";b.addEventListener("click",fn);return b;};
const audit=(id,action,reason,actor)=>({businessId:id,action,reason,caseId:"",actorUid:actor,createdAt:serverTimestamp()});
const snapshots=id=>collection(firestore,"tenant_backups",id,"snapshots");
const partRef=(id,backup,domain)=>doc(firestore,"tenant_backups",id,"snapshots",backup,"parts",domain);
const activeRef=(id,domain)=>doc(firestore,"businesses",id,"state",domain);
const encoder=new TextEncoder();
let root,picker,reason,list,details,status,selected="",generation=0,working=false;
const same=(actor,id,g)=>admin()&&uid()===actor&&selected===id&&generation===g;
const date=t=>t?.toDate?.().toLocaleString("es")||"Fecha sin verificar";
function alertText(text,error=false){status.textContent=text;status.classList.toggle("error",error);}
function requireReason(){const why=reason.value.trim();if(why.length<3)throw Error("Escribe un motivo de al menos 3 caracteres.");return why;}
function verifyParts(manifest,parts,id){
  if(manifest.businessId!==id||manifest.schemaVersion!==1||!Array.isArray(manifest.domains)||!manifest.domains.length||new Set(manifest.domains).size!==manifest.domains.length||manifest.domains.some(d=>!DOMAINS.includes(d))||parts.length!==manifest.domains.length)throw Error("Manifiesto de respaldo inválido.");
  for(let i=0;i<parts.length;i++){const p=parts[i];if(!p||p.businessId!==id||p.domain!==manifest.domains[i]||!p.payload||typeof p.payload!=="object"||Array.isArray(p.payload))throw Error("Respaldo incompleto o inconsistente.");}
}
async function loadBackup(id,backup){
  const s=await getDocFromServer(doc(snapshots(id),backup));if(!s.exists())throw Error("No existe el respaldo.");
  const m=s.data();if(!Array.isArray(m.domains)||m.domains.length>9||m.domains.some(d=>!DOMAINS.includes(d)))throw Error("Manifiesto inválido.");
  const docs=await Promise.all(m.domains.map(d=>getDocFromServer(partRef(id,backup,d))));
  const parts=docs.map(d=>d.exists()?d.data():null);verifyParts(m,parts,id);return {manifest:m,parts};
}
async function task(fn){if(working||!admin())return;working=true;try{await fn();}catch(e){console.warn("[SAMBRIX backup]",e);alertText(e?.code==="permission-denied"?"Firebase no autorizó la operación. Verifica las reglas.":String(e?.message||"No se completó la operación."),true);}finally{working=false;}}
async function refresh(){
  const id=selected,actor=uid(),g=++generation;list.replaceChildren();details.replaceChildren();if(!id||!admin())return;
  alertText("Consultando respaldos de Firebase…");
  try{const q=await getDocsFromServer(query(snapshots(id),orderBy("createdAt","desc"),limit(30)));if(!same(actor,id,g))return;
    if(q.empty)list.append(n("p","Sin respaldos registrados."));
    for(const s of q.docs){const d=s.data(),row=n("article","","cloud-ticket");row.append(n("strong",date(d.createdAt)),n("p",d.reason||""),n("small",(d.domains?.length||0)+" módulos"));const a=n("div","","cloud-actions");a.append(btn("Revisar",()=>task(()=>review(s.id))),btn("Exportar cifrado",()=>task(()=>exportBackup(s.id))));row.append(a);list.append(row);}
    alertText("Mostrando hasta 30 respaldos recientes.");
  }catch(e){if(same(actor,id,g))alertText("No se pudieron consultar los respaldos.",true);}
}
async function create(){
  const id=selected,actor=uid(),g=generation,why=requireReason();if(!id)throw Error("Selecciona una empresa.");
  if(!confirm("¿Crear un respaldo de los módulos operativos de esta empresa? No modifica sus datos."))return;
  const ref=doc(snapshots(id)),auditRef=doc(collection(firestore,"support_access_events"));
  alertText("Creando respaldo consistente…");
  await runTransaction(firestore,async tx=>{
    if(!same(actor,id,g))throw Error("Cambió la empresa o la sesión.");
    const ss=await Promise.all([tx.get(doc(firestore,"businesses",id)),...DOMAINS.map(d=>tx.get(activeRef(id,d)))]);
    if(!ss[0].exists())throw Error("Empresa no verificada.");
    const parts=[];let bytes=0;
    for(let i=0;i<DOMAINS.length;i++){const s=ss[i+1];if(!s.exists())continue;const d=s.data();if(d.businessId&&d.businessId!==id)throw Error("Documento de otra empresa.");if(!d.payload||typeof d.payload!=="object"||Array.isArray(d.payload))throw Error("Módulo inválido: "+DOMAINS[i]);const size=encoder.encode(JSON.stringify(d.payload)).length;if(size>700000)throw Error("Módulo demasiado grande para este tipo de respaldo: "+DOMAINS[i]);bytes+=size;
      parts.push({businessId:id,domain:DOMAINS[i],payload:d.payload,sourceRevision:Number.isInteger(d.syncRevision)&&d.syncRevision>=0?d.syncRevision:0,sourceUpdatedAt:d.updatedAt?.toDate?d.updatedAt:null});}
    if(!parts.length)throw Error("No existen módulos operativos para respaldar.");
    if(bytes>5000000)throw Error("El volumen supera el límite de respaldo desde navegador.");
    if(!same(actor,id,g))throw Error("Cambió la empresa o la sesión.");
    tx.set(ref,{businessId:id,name:String(ss[0].data().name||id).slice(0,180),reason:why,createdBy:actor,createdAt:serverTimestamp(),domains:parts.map(p=>p.domain),schemaVersion:1});
    for(const p of parts)tx.set(partRef(id,ref.id,p.domain),p);
    tx.set(auditRef,audit(id,"BACKUP_CREATE",why,actor));
  });
  if(same(actor,id,g)){reason.value="";await refresh();alertText("Respaldo operativo guardado en Firebase.");}
}
async function review(backup){
  const id=selected,actor=uid(),g=generation,why=requireReason();
  await addDoc(collection(firestore,"support_access_events"),audit(id,"BACKUP_REVIEW",why,actor));
  const data=await loadBackup(id,backup);
  const current=await Promise.all(data.parts.map(p=>getDocFromServer(activeRef(id,p.domain))));
  if(!same(actor,id,g))return;
  details.replaceChildren(n("h3","Comparación con los datos actuales"),n("p","Solo lectura. No se restaura ni se elimina información."));
  for(let i=0;i<data.parts.length;i++){const p=data.parts[i],s=current[i],d=s.exists()?s.data():null;
    const match=d&&(!d.businessId||d.businessId===id)&&fingerprint(d.payload)===fingerprint(p.payload);
    const row=n("div","","cloud-company-row");row.append(n("strong",LABEL[p.domain]),n("span",!d?"Falta actualmente":match?"Sin diferencias":"Contiene diferencias"));details.append(row);}
  details.append(n("p","Las diferencias requieren revisión. No se ofrece restauración automática de módulos relacionados, para evitar perder cambios posteriores.","cloud-message"));
  alertText("Comparación completada.");
}
async function exportBackup(backup){
  const id=selected,actor=uid(),g=generation,why=requireReason();
  if(!window.crypto?.subtle)throw Error("El cifrado requiere una conexión HTTPS segura.");
  const password=prompt("Crea una contraseña exclusiva para este archivo (mínimo 12 caracteres). Guárdala en un lugar seguro; SAMBRIX no puede recuperarla.");
  if(!password)return;if(password.length<12)throw Error("La contraseña debe tener al menos 12 caracteres.");
  if(prompt("Repite la contraseña del archivo")!==password)throw Error("Las contraseñas no coinciden.");
  const data=await loadBackup(id,backup);if(!same(actor,id,g))return;
  const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
  const keyMaterial=await crypto.subtle.importKey("raw",encoder.encode(password),"PBKDF2",false,["deriveKey"]);
  const key=await crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:600000,hash:"SHA-256"},keyMaterial,{name:"AES-GCM",length:256},false,["encrypt"]);
  const cipher=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,encoder.encode(JSON.stringify(data)));
  const b64=a=>{let s="";for(let i=0;i<a.length;i+=8192)s+=String.fromCharCode(...a.subarray(i,i+8192));return btoa(s);};
  await addDoc(collection(firestore,"support_access_events"),audit(id,"BACKUP_EXPORT",why,actor));
  if(!same(actor,id,g))return;
  const blob=new Blob([JSON.stringify({format:"SAMBRIX-OPERATIONAL-ENC-1",kdf:"PBKDF2-SHA256",iterations:600000,cipher:"AES-256-GCM",salt:b64(salt),iv:b64(iv),data:b64(new Uint8Array(cipher))})],{type:"application/json"});
  const url=URL.createObjectURL(blob),a=n("a");a.href=url;a.download="sambrix-respaldo-"+backup+".json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  alertText("Archivo cifrado preparado para descarga. Conserva su contraseña.");
}
function open(id){
  if(!admin())return;window.App?.go?.("backupCenter");populate();if(id&&Array.from(picker.options).some(o=>o.value===id)){picker.value=id;selected=id;refresh();}
}
function populate(){if(!admin())return;const previous=selected;picker.replaceChildren(new Option("Selecciona una empresa",""));for(const b of companies()){if(b.id)picker.append(new Option(b.name||b.id,b.id));}picker.value=previous;if(picker.value!==previous){selected="";generation++;list.replaceChildren();details.replaceChildren();}}
function boot(){
  const page=$("backupCenter");if(root||!page)return;
  root=n("div","","cloud-support");root.id="cloudBackupRoot";
  root.append(n("h2","Respaldos por empresa"),n("p","Copias operativas privadas, inmutables y auditadas. No incluyen cuentas de autenticación, reservas públicas, archivos externos ni datos locales no sincronizados."));
  picker=n("select");picker.addEventListener("change",()=>{selected=picker.value;refresh();});
  reason=n("input");reason.placeholder="Motivo de la operación";reason.maxLength=500;reason.setAttribute("aria-label","Motivo de la operación");
  const actions=n("div","","cloud-actions");actions.append(btn("Crear respaldo",()=>task(create),"primary"),btn("Actualizar",refresh));
  status=n("p","Selecciona una empresa.","cloud-message");status.setAttribute("role","status");
  list=n("div");details=n("div");root.append(picker,reason,actions,status,list,details);page.prepend(root);
  window.SambrixBackup={open};
  const observer=new MutationObserver(()=>{if(admin()&&page.classList.contains("active"))populate();});observer.observe(page,{attributes:true,attributeFilter:["class"]});
  onAuthStateChanged(auth,()=>{generation++;selected="";picker.replaceChildren();reason.value="";list.replaceChildren();details.replaceChildren();if(admin()&&page.classList.contains("active"))populate();});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
