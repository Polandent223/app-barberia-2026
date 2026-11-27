/* Tenant-side reconciliation, authorized by existing CRM and client_accounts rules. */
import {auth,firestore} from "../firebase/firebase-core.js";
import {doc,collection,onSnapshot,runTransaction,serverTimestamp,getDocsFromServer} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import {inspectAccount,makeClient,verifyLink,projection} from "./client-identity-core.js?v=1";
const S=()=>window.SaaS,A=()=>window.App,C=()=>window.SaaSCloudProduction;
const role=()=>S()?.session?.role;
const context=()=>{if(new URLSearchParams(location.search).get("cliente")==="app")return null;const id=String(S()?.session?.businessId||""),uid=auth.currentUser?.uid;return id&&uid&&["owner","admin","manager"].includes(role())?{id,uid,key:id+":"+uid+":"+role()}:null;};
const check=ctx=>{if(context()?.key!==ctx.key||!C()?.isTenantReady?.(ctx.id))throw Error("La sesión o sincronización cambió.");};
let active="",stops=[],accounts=[],timer,busy=false,dirty=false,failed="",ready=false;
const state=(id,name)=>doc(firestore,"businesses",id,"state",name);
const account=(id,uid)=>doc(firestore,"public_businesses",id,"client_accounts",uid);
const group=id=>collection(firestore,"public_businesses",id,"client_accounts");
const clone=v=>JSON.parse(JSON.stringify(v));
function payload(s,id){if(!s.exists()||s.data().businessId!==id||!s.data().payload)throw Error("Datos de empresa no verificados.");return clone(s.data().payload);}
function saveCrm(tx,ref,s,data,ctx){tx.update(ref,{businessId:ctx.id,payload:data,updatedAt:serverTimestamp(),updatedBy:auth.currentUser?.email||"",updatedByUid:ctx.uid,syncRevision:Number(s.data().syncRevision||0)+1});}
function sameValue(a,b){return JSON.stringify(a)===JSON.stringify(b);}
async function reconcile(ctx,uid,verification=null){
 check(ctx);
 return runTransaction(firestore,async tx=>{
  check(ctx);
  const refs=[state(ctx.id,"crm"),state(ctx.id,"schedule"),state(ctx.id,"config"),account(ctx.id,uid)];
  const [cs,ss,fs,ps]=await Promise.all(refs.map(r=>tx.get(r)));
  if(!ps.exists())return false;
  const crm=payload(cs,ctx.id),schedule=payload(ss,ctx.id),config=payload(fs,ctx.id),p=ps.data();
  if(!Array.isArray(crm.clients))throw Error("Directorio no válido.");
  const m=inspectAccount(crm.clients,uid,p);
  let c=m.client,changed=false;
  if(verification){c=verifyLink(crm.clients,uid,p,verification.clientId,verification.code,ctx.uid,new Date().toISOString());changed=true;}
  else if(m.kind==="new"){c=makeClient(ctx.id,config.meta?.branchId,uid,p);crm.clients.push(c);changed=true;}
  else if(m.kind!=="linked")return false;
  if(changed)saveCrm(tx,refs[0],cs,crm,ctx);
  const next=projection(c,uid,schedule,config,S().planCapability?.("clientHistory",S().currentBusiness?.())===true);
  if(Object.keys(next).some(k=>!sameValue(p[k],next[k])))tx.update(refs[3],next);
  return changed;
 });
}
function schedule(){dirty=true;clearTimeout(timer);timer=setTimeout(sync,900);}
async function sync(){
 const ctx=context();if(!ctx||ctx.key!==active||!ready||busy||!dirty)return;
 if(!C()?.isTenantReady?.(ctx.id)){timer=setTimeout(sync,2000);return;}
 dirty=false;busy=true;failed="";
 try{
  await C().awaitTenantWrites(ctx.id);check(ctx);
  const list=accounts.slice();
  // Only reconcile the same tenant, and never choose between conflicting phone identities.
  for(const row of list){
   check(ctx);
   const clients=A()?.db?.clients||[],m=inspectAccount(clients,row.uid,row.data);
   if(list.some(x=>x.uid!==row.uid&&x.data.status==="Activo"&&x.data.phoneNormalized===row.data.phoneNormalized))continue;
   if(m.kind==="new"||m.kind==="linked"&&Object.entries(projection(m.client,row.uid,{appointments:A().db.appointments||[]},{services:A().db.services||[],barbers:A().db.barbers||[]},S().planCapability?.("clientHistory",S().currentBusiness?.())===true)).some(([k,v])=>!sameValue(row.data[k],v))){
    const changed=await reconcile(ctx,row.uid);
    if(changed)await C().refreshTenant(ctx.id);
   }
  }
 }catch(e){if(context()?.key===ctx.key){failed="No se pudo confirmar la sincronización de cuentas. Actualiza y revisa permisos.";console.warn("[SAMBRIX client accounts]",e);}}
 finally{busy=false;if(context()?.key===active){draw();if(dirty)schedule();}}
}
function reset(){clearTimeout(timer);stops.forEach(u=>u());stops=[];accounts=[];ready=false;dirty=false;failed="";active="";document.getElementById("clientIdentityPanel")?.remove();}
function watch(){
 const ctx=context();if(ctx?.key===active)return;
 reset();if(!ctx)return;active=ctx.key;
 stops.push(onSnapshot(group(ctx.id),{includeMetadataChanges:true},s=>{if(context()?.key!==ctx.key||s.metadata.fromCache||s.metadata.hasPendingWrites)return;accounts=s.docs.map(d=>({uid:d.id,data:d.data()}));ready=true;schedule();draw();},e=>{if(context()?.key!==ctx.key)return;failed="No se pudieron consultar cuentas de clientes.";console.warn(e);draw();}));
 for(const name of ["crm","schedule","config"])stops.push(onSnapshot(state(ctx.id,name),{includeMetadataChanges:true},s=>{if(context()?.key===ctx.key&&!s.metadata.fromCache&&!s.metadata.hasPendingWrites){schedule();}},e=>console.warn(e)));
}
const node=(tag,t="",cls="")=>{const n=document.createElement(tag);n.textContent=t;n.className=cls;return n;};
function button(t,fn){const b=node("button",t,"btn secondary");b.type="button";b.onclick=fn;return b;}
function draw(){
 const ctx=context(),page=document.getElementById("clientes");if(!ctx||ctx.key!==active||!page)return;
 let panel=document.getElementById("clientIdentityPanel");
 if(!panel){panel=node("div","","panel");panel.id="clientIdentityPanel";page.append(panel);}
 panel.replaceChildren(node("h3","Cuentas de la App Cliente"),node("p","El cliente crea su PIN desde su enlace habitual. Las cuentas nuevas se sincronizan cuando la administración está conectada. Para recuperar una ficha anterior, verifica el teléfono por un canal conocido y el código mostrado en Mi cuenta.","muted"));
 const refresh=button("Actualizar cuentas",async()=>{try{const s=await getDocsFromServer(group(ctx.id));if(context()?.key!==ctx.key)return;accounts=s.docs.map(d=>({uid:d.id,data:d.data()}));ready=true;schedule();draw();}catch(e){failed=e.message||"No se pudo actualizar.";draw();}});
 panel.append(refresh,node("p",failed||(!ready?"Consultando Firebase…":busy?"Sincronizando…":accounts.length+" cuentas registradas"),"muted"));
 for(const row of accounts){
  const m=inspectAccount(A()?.db?.clients||[],row.uid,row.data);
  const duplicate=accounts.some(x=>x.uid!==row.uid&&x.data.status==="Activo"&&x.data.phoneNormalized===row.data.phoneNormalized);
  const card=node("div","","row");const copy=node("div");copy.append(node("strong",row.data.name||"Cliente"),node("small",(row.data.phone||"")+" · "+(duplicate||m.kind==="conflict"?"Conflicto de identidad":m.kind==="verify"?"Ficha existente: verificar":m.kind==="linked"?(m.client.clientLinkVerified?"Vinculación verificada":"Cuenta vinculada; historial anterior protegido"):m.kind==="new"?"Pendiente de sincronizar":"No disponible")));card.append(copy);
  if(!duplicate&&["verify","linked"].includes(m.kind)&&!m.client.clientLinkVerified){
   const b=button("Verificar y vincular",async()=>{
    if(!confirm("Confirma únicamente después de verificar la identidad del cliente y su teléfono por un canal conocido. El historial previo será visible en su cuenta."))return;
    const code=prompt("Pide al cliente el código de activación de Mi cuenta (12 caracteres).");if(!code)return;
    b.disabled=true;
    try{await C().awaitTenantWrites(ctx.id);check(ctx);await reconcile(ctx,row.uid,{clientId:m.client.id,code});await C().refreshTenant(ctx.id);A()?.toast?.("Identidad verificada y ficha vinculada.");}
    catch(e){A()?.toast?.(e.message||"No se pudo vincular.");}finally{draw();}
   });card.append(b);
  }
  panel.append(card);
 }
}
setInterval(()=>{watch();if(context()?.key===active&&dirty&&!busy&&C()?.isTenantReady?.(context()?.id))schedule();},2500);
window.SambrixClientIdentity={refresh:()=>{watch();schedule();},status:()=>({ready,busy,failed})};
