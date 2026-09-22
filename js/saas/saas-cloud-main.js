import {cloudBootstrapPlatform,uploadBusinessCatalog,downloadBusinessCatalog,uploadCurrentTenant,uploadTenantState,ensureTenantState,downloadTenant,watchCatalog,watchCurrentTenant,stopSaaSCloud} from "./saas-cloud.js?v=1.0.17";

let hooked=false,lastSyncKey="",catalogPushChain=Promise.resolve(),sessionGeneration=0,lastObservedUid="";
const hydrationPromises=new Map(),hydratedTenants=new Set();

function queueCatalogUpload(){catalogPushChain=catalogPushChain.catch(()=>{}).then(()=>uploadBusinessCatalog());return catalogPushChain}
async function ensureCatalogTenants(){for(const business of SaaS.db.businesses||[]){if(!business?.id)continue;try{await ensureTenantState(business.id)}catch(e){console.error(`[SAMBRIX init tenant:${business.id}]`,e)}}}
function currentBusinessId(){return String(SaaS.getContext?.()?.businessId||SaaS.session?.businessId||"").trim()}
function tenantHydrating(id=currentBusinessId()){return !!id&&hydrationPromises.has(id)}
function tenantReady(id=currentBusinessId()){const role=String(SaaS.session?.role||"");return role==="superadmin"||(!tenantHydrating(id)&&hydratedTenants.has(id))}

function setHydrationUI(active,id=currentBusinessId()){
  if(typeof document==="undefined")return;
  const app=document.getElementById("adminApp");if(app){app.dataset.cloudHydrating=active?"true":"false";app.setAttribute("aria-busy",active?"true":"false")}
  let overlay=document.getElementById("sambrixCloudHydrationLock");
  if(active){if(!overlay){overlay=document.createElement("div");overlay.id="sambrixCloudHydrationLock";overlay.setAttribute("role","status");overlay.setAttribute("aria-live","polite");overlay.style.cssText="position:fixed;inset:0;z-index:2147483000;background:rgba(255,255,255,.88);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;font-family:inherit";overlay.innerHTML='<div style="max-width:420px;background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:24px;box-shadow:0 18px 50px rgba(0,0,0,.12)"><strong style="display:block;font-size:18px;margin-bottom:8px">Sincronizando SAMBRIX</strong><span style="color:#667085">Estamos cargando los datos del negocio. Podrás trabajar en unos segundos.</span></div>';document.body.appendChild(overlay)}overlay.dataset.businessId=String(id||"");overlay.hidden=false}else if(overlay){overlay.hidden=true;overlay.dataset.businessId=""}
}
function refreshHydrationUI(){const id=currentBusinessId();setHydrationUI(!!id&&tenantHydrating(id),id)}
function resetCloudSession(){sessionGeneration++;lastSyncKey="";hydratedTenants.clear();hydrationPromises.clear();setHydrationUI(false);try{stopSaaSCloud()}catch(e){console.warn("[SAMBRIX cloud reset]",e)}}

function hydrateTenant(id,{createIfMissing=false}={}){
  id=String(id||"").trim();if(!id)return Promise.resolve(false);if(hydrationPromises.has(id))return hydrationPromises.get(id);
  const generation=sessionGeneration,uid=String(window.FirebaseBridge?.user?.uid||"");let task;
  task=(async()=>{const got=await downloadTenant(id);if(generation!==sessionGeneration||uid!==String(window.FirebaseBridge?.user?.uid||""))return false;if(!got&&createIfMissing){if(currentBusinessId()!==id)throw new Error("El negocio cambió durante la sincronización inicial.");await uploadCurrentTenant()}if(generation!==sessionGeneration||uid!==String(window.FirebaseBridge?.user?.uid||""))return false;hydratedTenants.add(id);if(currentBusinessId()===id)watchCurrentTenant();return got})().finally(()=>{if(hydrationPromises.get(id)===task)hydrationPromises.delete(id);refreshHydrationUI()});
  // Registrar la hidratación antes de actualizar la interfaz elimina la ventana en que el usuario podía tocar datos.
  hydrationPromises.set(id,task);refreshHydrationUI();return task;
}

function installHooks(){
  if(hooked||!window.SaaS||!window.App)return;
  const oldSave=SaaS.save.bind(SaaS);SaaS.save=function(){oldSave();if(SaaS.__applyingCloudCatalog)return;if(window.FirebaseBridge?.connected&&SaaS.session?.role==="superadmin")queueCatalogUpload().catch(console.error)};
  const oldSwitch=SaaS.switchTenant.bind(SaaS);SaaS.switchTenant=function(id,opts){const previous=currentBusinessId(),r=oldSwitch(id,opts);if(r&&previous&&previous!==String(id||"")){try{stopSaaSCloud()}catch{}hydratedTenants.delete(previous)}if(r&&window.FirebaseBridge?.connected&&SaaS.session?.role!=="guest")hydrateTenant(id,{createIfMissing:false}).catch(console.error);refreshHydrationUI();return r};
  const A=window.App,oldPersist=A.persist.bind(A);A.persist=function(){const id=currentBusinessId(),role=SaaS.session?.role;if(window.FirebaseBridge?.connected&&id&&tenantHydrating(id)){A.toast?.("Espera unos segundos: SAMBRIX todavía está sincronizando este negocio.");return false}const r=oldPersist();if(!window.FirebaseBridge?.connected||!["owner","admin","manager","reception","cashier","barber","superadmin"].includes(role))return r;if(id&&!hydratedTenants.has(id)&&role!=="superadmin"){hydrateTenant(id,{createIfMissing:true}).catch(console.error);return r}uploadCurrentTenant().then(async()=>{const currentRole=String(SaaS.session?.role||"");if(["owner","admin","manager","superadmin"].includes(currentRole))return window.NexoPublicCloud?.publishCurrentBusiness?.();if(["reception","barber"].includes(currentRole))return window.NexoPublicCloud?.publishCurrentAvailability?.();}).catch(e=>{console.error("[SAMBRIX cloud persist]",e);A.toast?.("El cambio quedó guardado en este dispositivo, pero no pudo sincronizarse con Firebase. Revisa tu conexión y vuelve a guardar.");});return r};hooked=true;
}

async function syncForCurrentSession(){if(!window.FirebaseBridge?.connected||!window.SaaS)return false;let role=SaaS.session?.role||"guest";if(role==="guest"){await SaaS.resolveFirebaseSession?.();role=SaaS.session?.role||"guest"}if(role==="guest")return false;installHooks();if(role==="superadmin"){await cloudBootstrapPlatform();await window.SaaSAuthAdmin?.refreshAccess?.();const got=await downloadBusinessCatalog();if(!got)await queueCatalogUpload();await window.SaaSAuthAdmin?.repairBusinessUserLinks?.();await ensureCatalogTenants();watchCatalog();return true}const businessId=String(SaaS.session?.businessId||SaaS.getContext?.()?.businessId||"").trim();if(!businessId)return false;if(SaaS.getContext?.()?.businessId!==businessId)SaaS.switchTenant?.(businessId,{support:false});await hydrateTenant(businessId,{createIfMissing:true});return true}
async function forceUploadCatalog(){if(!window.FirebaseBridge?.connected)throw new Error("Firebase no está conectado.");await window.SaaSAuthAdmin?.refreshAccess?.();if(!window.SaaSAuthAdmin?.isSuperAdmin?.())throw new Error("La sesión actual no tiene permisos de SuperAdmin.");await queueCatalogUpload();await ensureCatalogTenants();return true}
async function initializeTenant(businessId,state){if(!window.FirebaseBridge?.connected)throw new Error("Firebase no está conectado.");await window.SaaSAuthAdmin?.refreshAccess?.();if(!window.SaaSAuthAdmin?.isSuperAdmin?.())throw new Error("Solo SuperAdmin puede inicializar un negocio.");await uploadTenantState(businessId,state);hydratedTenants.add(String(businessId||""));refreshHydrationUI();return true}
window.SaaSCloudProduction={syncForCurrentSession,forceUploadCatalog,initializeTenant,isTenantHydrating:tenantHydrating,isTenantReady:tenantReady,resetCloudSession,stopSessionCloud:resetCloudSession};
async function attemptSync(){const uid=String(window.FirebaseBridge?.user?.uid||"");if(uid!==lastObservedUid){resetCloudSession();lastObservedUid=uid}const role=SaaS.session?.role||"guest",key=`${uid}:${role}:${SaaS.session?.businessId||""}`;if(!uid||role==="guest"||key===lastSyncKey)return;try{if(await syncForCurrentSession())lastSyncKey=key}catch(e){console.error("[SaaS Cloud]",e);refreshHydrationUI()}}
const timer=setInterval(()=>attemptSync(),700);setTimeout(()=>clearInterval(timer),60000);
