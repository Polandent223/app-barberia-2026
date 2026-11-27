import {cloudBootstrapPlatform,uploadBusinessCatalog,downloadBusinessCatalog,uploadCurrentTenant,uploadTenantState,ensureTenantState,downloadTenant,watchCatalog,watchCurrentTenant,stopSaaSCloud,tenantSyncBlocked,tenantSyncBusy,tenantSyncDraftSaved,awaitTenantWrites,waitForTenantCommit,reviewPendingDrafts} from "./saas-cloud.js?v=2.0.11";

let hooked=false,lastSyncKey="",catalogPushChain=Promise.resolve(),sessionGeneration=0,lastObservedUid="";
const hydrationPromises=new Map(),hydratedTenants=new Set();

function queueCatalogUpload(){catalogPushChain=catalogPushChain.catch(()=>{}).then(()=>uploadBusinessCatalog());return catalogPushChain}
async function ensureCatalogTenants(){for(const business of SaaS.db.businesses||[]){if(!business?.id)continue;try{await ensureTenantState(business.id)}catch(e){console.error(`[SAMBRIX init tenant:${business.id}]`,e)}}}
function Atoast(message){window.App?.toast?.(message);}
function currentBusinessId(){return String(SaaS.getContext?.()?.businessId||SaaS.session?.businessId||"").trim()}
function tenantHydrating(id=currentBusinessId()){return !!id&&hydrationPromises.has(id)}
function tenantReady(id=currentBusinessId()){const role=String(SaaS.session?.role||"");return role==="superadmin"||(!tenantSyncBlocked(id)&&!tenantHydrating(id)&&hydratedTenants.has(id))}

function setHydrationUI(active,id=currentBusinessId()){
  if(typeof document==="undefined")return;
  const app=document.getElementById("adminApp");if(app){app.dataset.cloudHydrating=active?"true":"false";app.setAttribute("aria-busy",active?"true":"false")}
  let overlay=document.getElementById("sambrixCloudHydrationLock");
  if(active){if(!overlay){overlay=document.createElement("div");overlay.id="sambrixCloudHydrationLock";overlay.setAttribute("role","status");overlay.setAttribute("aria-live","polite");overlay.style.cssText="position:fixed;inset:0;z-index:2147483000;background:rgba(255,255,255,.88);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;font-family:inherit";overlay.innerHTML='<div style="max-width:420px;background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:24px;box-shadow:0 18px 50px rgba(0,0,0,.12)"><strong style="display:block;font-size:18px;margin-bottom:8px">Sincronizando SAMBRIX</strong><span style="color:#667085">Estamos cargando los datos del negocio. Podrás trabajar en unos segundos.</span></div>';document.body.appendChild(overlay)}overlay.dataset.businessId=String(id||"");overlay.hidden=false;overlay.style.display="flex"}else if(overlay){overlay.hidden=true;overlay.style.display="none";overlay.dataset.businessId="";delete overlay.dataset.renderKey}
}
function refreshHydrationUI(){
  const id=currentBusinessId(),role=String(SaaS.session?.role||"");
  const businessRole=["owner","admin","manager","reception","cashier","barber"].includes(role);
  const blocked=businessRole&&!!id&&tenantSyncBlocked(id);
  setHydrationUI(businessRole&&!!id&&(blocked||!hydratedTenants.has(id)||tenantHydrating(id)),id);
  const overlay=document.getElementById("sambrixCloudHydrationLock");
  if(overlay&&!overlay.hidden){
    const renderKey=id+":"+blocked+":"+tenantSyncDraftSaved(id);
    if(overlay.dataset.renderKey===renderKey)return;
    overlay.dataset.renderKey=renderKey;
    const box=overlay.firstElementChild;box.replaceChildren();
    const h=document.createElement("strong");h.style.cssText="display:block;font-size:18px;margin-bottom:8px";
    h.textContent=blocked?"Cambios pendientes de revisión":"Sincronizando SAMBRIX";
    const text=document.createElement("p");text.textContent=blocked?(tenantSyncDraftSaved(id)?"Los cambios no confirmados quedaron guardados en este navegador. No sigas operando aquí. Contacta a SAMBRIX para revisar el conflicto.":"No se pudo confirmar el cambio ni su copia local. Mantén abierta esta página y contacta a SAMBRIX."):"Esperando una lectura confirmada de Firebase. Si no conecta, contacta a soporte.";
    const exit=document.createElement("button");exit.type="button";exit.className="btn secondary";exit.textContent="Cerrar sesión";exit.addEventListener("click",()=>SaaS.signOutToPortal?.());
    const support=document.createElement('button');support.type='button';support.className='btn primary';support.textContent='Contactar soporte';support.addEventListener('click',()=>SaaS.openSupportTicket?.());
    box.append(h,text);
    if(blocked&&tenantSyncDraftSaved(id)){
      const review=document.createElement("button");review.type="button";review.className="btn primary";review.textContent="Verificar cambios pendientes";
      review.addEventListener("click",async()=>{
        review.disabled=true;
        try{
          const results=await reviewPendingDrafts(id);
          if(currentBusinessId()!==id)return;
          if(!tenantSyncBlocked(id)){lastSyncKey="";await hydrateTenant(id);Atoast("Cambios confirmados. Sincronización recuperada.");}
          else Atoast("Hay diferencias con Firebase. No se modificó la información; contacta a soporte.");
        }catch(e){Atoast(e.message||"No se pudo verificar la copia.");}
        finally{review.disabled=false;refreshHydrationUI();}
      });
      box.append(review);
    }
    box.append(support,exit);
  }
}
document.addEventListener("sambrix-sync-conflict",refreshHydrationUI);
function resetCloudSession(){sessionGeneration++;lastSyncKey="";hydratedTenants.clear();hydrationPromises.clear();setHydrationUI(false);try{stopSaaSCloud()}catch(e){console.warn("[SAMBRIX cloud reset]",e)}}

function hydrateTenant(id,{createIfMissing=false}={}){
  id=String(id||"").trim();if(!id)return Promise.resolve(false);if(hydrationPromises.has(id))return hydrationPromises.get(id);
  const generation=sessionGeneration,uid=String(window.FirebaseBridge?.user?.uid||"");let task;
  task=(async()=>{const got=await downloadTenant(id);if(generation!==sessionGeneration||uid!==String(window.FirebaseBridge?.user?.uid||""))return false;if(!got)throw new Error("No hay datos inicializados en Firebase. Solicita al SuperAdmin que inicialice la empresa.");if(generation!==sessionGeneration||uid!==String(window.FirebaseBridge?.user?.uid||""))return false;hydratedTenants.add(id);if(currentBusinessId()===id)watchCurrentTenant();return got})().finally(()=>{if(hydrationPromises.get(id)===task)hydrationPromises.delete(id);refreshHydrationUI();if(currentBusinessId()===id&&tenantReady(id))window.App?.renderInventory?.()});
  // Registrar la hidratación antes de actualizar la interfaz elimina la ventana en que el usuario podía tocar datos.
  hydrationPromises.set(id,task);refreshHydrationUI();return task;
}

function installHooks(){
  if(hooked||!window.SaaS||!window.App)return;
  const oldSave=SaaS.save.bind(SaaS);SaaS.save=function(){oldSave();if(SaaS.__applyingCloudCatalog)return;if(window.FirebaseBridge?.connected&&SaaS.session?.role==="superadmin")queueCatalogUpload().catch(console.error)};
  const oldSwitch=SaaS.switchTenant.bind(SaaS);SaaS.switchTenant=function(id,opts){const previous=currentBusinessId(),r=oldSwitch(id,opts);if(r&&previous&&previous!==String(id||"")){try{stopSaaSCloud()}catch{}hydratedTenants.delete(previous)}if(r&&window.FirebaseBridge?.connected&&!["guest","superadmin"].includes(String(SaaS.session?.role||"")))hydrateTenant(id,{createIfMissing:false}).catch(console.error);refreshHydrationUI();return r};
  const A=window.App,oldPersist=A.persist.bind(A);
  A.persist=function(){
    const id=currentBusinessId(),role=String(SaaS.session?.role||""),uid=String(window.FirebaseBridge?.user?.uid||"");
    const businessRole=["owner","admin","manager","reception","cashier","barber"].includes(role);
    if(businessRole&&(!window.FirebaseBridge?.connected||!id||!tenantReady(id))){
      A.toast?.("No puedes guardar hasta verificar la sincronización con Firebase.");
      refreshHydrationUI();return false;
    }
    const r=oldPersist();
    if(!window.FirebaseBridge?.connected||!businessRole)return r;
    let work;
    try{work=uploadCurrentTenant();}catch(e){work=Promise.reject(e);}
    Promise.resolve(work).then(async saved=>{
      if(!saved||uid!==String(window.FirebaseBridge?.user?.uid||"")||id!==currentBusinessId()||tenantSyncBlocked(id)||tenantSyncBusy(id))return;
      const currentRole=String(SaaS.session?.role||"");
      if(["owner","admin","manager"].includes(currentRole))return window.NexoPublicCloud?.publishCurrentBusiness?.();
      if(["reception","barber"].includes(currentRole))return window.NexoPublicCloud?.publishCurrentAvailability?.();
    }).catch(e=>{console.error("[SAMBRIX cloud persist]",e);A.toast?.("No se confirmó el cambio en Firebase. Revisa la conexión o contacta a soporte.");refreshHydrationUI();});
    return r;
  };
  hooked=true;
}

async function syncForCurrentSession(){if(!window.FirebaseBridge?.connected||!window.SaaS)return false;let role=SaaS.session?.role||"guest";if(role==="guest"){await SaaS.resolveFirebaseSession?.();role=SaaS.session?.role||"guest"}if(role==="guest")return false;installHooks();if(role==="superadmin"){await cloudBootstrapPlatform();await window.SaaSAuthAdmin?.refreshAccess?.();const got=await downloadBusinessCatalog();if(!got)await queueCatalogUpload();await window.SaaSAuthAdmin?.repairBusinessUserLinks?.();await ensureCatalogTenants();watchCatalog();return true}const businessId=String(SaaS.session?.businessId||SaaS.getContext?.()?.businessId||"").trim();if(!businessId)return false;if(SaaS.getContext?.()?.businessId!==businessId)SaaS.switchTenant?.(businessId,{support:false});await hydrateTenant(businessId,{createIfMissing:true});return true}
async function forceUploadCatalog(){if(!window.FirebaseBridge?.connected)throw new Error("Firebase no está conectado.");await window.SaaSAuthAdmin?.refreshAccess?.();if(!window.SaaSAuthAdmin?.isSuperAdmin?.())throw new Error("La sesión actual no tiene permisos de SuperAdmin.");await queueCatalogUpload();await ensureCatalogTenants();return true}
async function initializeTenant(businessId,state){if(!window.FirebaseBridge?.connected)throw new Error("Firebase no está conectado.");await window.SaaSAuthAdmin?.refreshAccess?.();if(!window.SaaSAuthAdmin?.isSuperAdmin?.())throw new Error("Solo SuperAdmin puede inicializar un negocio.");await uploadTenantState(businessId,state);hydratedTenants.add(String(businessId||""));refreshHydrationUI();return true}
window.SaaSCloudProduction={waitForTenantCommit,syncForCurrentSession,forceUploadCatalog,initializeTenant,awaitTenantWrites,refreshTenant:async id=>{if(id!==currentBusinessId())throw Error("Cambió la empresa activa.");await awaitTenantWrites(id);return hydrateTenant(id);},isTenantHydrating:tenantHydrating,isTenantReady:tenantReady,resetCloudSession,stopSessionCloud:resetCloudSession};
let attemptInFlight=false,retryAfter=0;
async function attemptSync(){
  const uid=String(window.FirebaseBridge?.user?.uid||"");
  if(uid!==lastObservedUid){resetCloudSession();lastObservedUid=uid;retryAfter=0;}
  const role=SaaS.session?.role||"guest",id=String(SaaS.session?.businessId||""),key=uid+":"+role+":"+id;
  if(!uid||role==="guest"||attemptInFlight||Date.now()<retryAfter)return;
  if(role!=="superadmin"&&id&&tenantSyncBlocked(id)){refreshHydrationUI();return;}
  if(key===lastSyncKey){refreshHydrationUI();return;}
  attemptInFlight=true;
  try{if(await syncForCurrentSession()&&uid===String(window.FirebaseBridge?.user?.uid||""))lastSyncKey=key;}
  catch(e){console.error("[SaaS Cloud]",e);retryAfter=Date.now()+5000;refreshHydrationUI();}
  finally{attemptInFlight=false;}
}
setInterval(attemptSync,1200);
