import {cloudBootstrapPlatform,uploadBusinessCatalog,downloadBusinessCatalog,uploadCurrentTenant,uploadTenantState,ensureTenantState,downloadTenant,watchCatalog,watchCurrentTenant,stopSaaSCloud} from "./saas-cloud.js";

let hooked=false,lastSyncKey="",catalogPushChain=Promise.resolve(),sessionGeneration=0,lastObservedUid="";
const hydrationPromises=new Map();
const hydratedTenants=new Set();

function queueCatalogUpload(){
  catalogPushChain=catalogPushChain.catch(()=>{}).then(()=>uploadBusinessCatalog());
  return catalogPushChain;
}

async function ensureCatalogTenants(){
  for(const business of SaaS.db.businesses||[]){
    if(!business?.id)continue;
    try{await ensureTenantState(business.id)}catch(e){console.error(`[SAMBRIX init tenant:${business.id}]`,e)}
  }
}

function currentBusinessId(){return String(SaaS.getContext?.()?.businessId||SaaS.session?.businessId||"").trim()}
function tenantHydrating(id=currentBusinessId()){return !!id&&hydrationPromises.has(id)}

function resetCloudSession(){
  sessionGeneration++;
  lastSyncKey="";
  hydratedTenants.clear();
  hydrationPromises.clear();
  try{stopSaaSCloud()}catch(e){console.warn("[SAMBRIX cloud reset]",e)}
}

function hydrateTenant(id,{createIfMissing=false}={}){
  id=String(id||"").trim();
  if(!id)return Promise.resolve(false);
  if(hydrationPromises.has(id))return hydrationPromises.get(id);
  const generation=sessionGeneration;
  const uid=String(window.FirebaseBridge?.user?.uid||"");
  const task=(async()=>{
    const got=await downloadTenant(id);
    if(generation!==sessionGeneration||uid!==String(window.FirebaseBridge?.user?.uid||""))return got;
    if(!got&&createIfMissing){
      if(currentBusinessId()!==id)throw new Error("El negocio cambió durante la sincronización inicial.");
      await uploadCurrentTenant();
    }
    if(generation!==sessionGeneration)return got;
    hydratedTenants.add(id);
    if(currentBusinessId()===id)watchCurrentTenant();
    return got;
  })().finally(()=>{
    if(hydrationPromises.get(id)===task)hydrationPromises.delete(id);
  });
  hydrationPromises.set(id,task);
  return task;
}

function installHooks(){
  if(hooked||!window.SaaS||!window.App)return;
  const oldSave=SaaS.save.bind(SaaS);
  SaaS.save=function(){
    oldSave();
    if(SaaS.__applyingCloudCatalog)return;
    if(window.FirebaseBridge?.connected&&SaaS.session?.role==="superadmin")queueCatalogUpload().catch(console.error);
  };

  const oldSwitch=SaaS.switchTenant.bind(SaaS);
  SaaS.switchTenant=function(id,opts){
    const previous=currentBusinessId();
    const r=oldSwitch(id,opts);
    if(r&&previous&&previous!==String(id||"")){
      try{stopSaaSCloud()}catch{}
      hydratedTenants.delete(previous);
    }
    if(r&&window.FirebaseBridge?.connected&&SaaS.session?.role!=="guest"){
      hydrateTenant(id,{createIfMissing:false}).catch(console.error);
    }
    return r;
  };

  const A=window.App,oldPersist=A.persist.bind(A);
  A.persist=function(){
    const r=oldPersist();
    const id=currentBusinessId();
    const role=SaaS.session?.role;
    if(!window.FirebaseBridge?.connected||!["owner","admin","manager","reception","cashier","barber","superadmin"].includes(role))return r;
    if(id&&tenantHydrating(id))return r;
    if(id&&!hydratedTenants.has(id)&&role!=="superadmin"){
      hydrateTenant(id,{createIfMissing:true}).catch(console.error);
      return r;
    }
    uploadCurrentTenant().then(()=>{
      if(["owner","admin","manager","superadmin"].includes(SaaS.session?.role))return window.NexoPublicCloud?.publishCurrentBusiness?.();
    }).catch(console.error);
    return r;
  };
  hooked=true;
}

async function syncForCurrentSession(){
  if(!window.FirebaseBridge?.connected||!window.SaaS)return false;
  let role=SaaS.session?.role||"guest";
  if(role==="guest"){
    await SaaS.resolveFirebaseSession?.();
    role=SaaS.session?.role||"guest";
  }
  if(role==="guest")return false;

  installHooks();
  if(role==="superadmin"){
    await cloudBootstrapPlatform();
    await window.SaaSAuthAdmin?.refreshAccess?.();
    const got=await downloadBusinessCatalog();
    if(!got)await queueCatalogUpload();
    await window.SaaSAuthAdmin?.repairBusinessUserLinks?.();
    await ensureCatalogTenants();
    watchCatalog();
    return true;
  }

  const businessId=String(SaaS.session?.businessId||SaaS.getContext?.()?.businessId||"").trim();
  if(!businessId)return false;
  if(SaaS.getContext?.()?.businessId!==businessId)SaaS.switchTenant?.(businessId,{support:false});
  await hydrateTenant(businessId,{createIfMissing:true});
  return true;
}

async function forceUploadCatalog(){
  if(!window.FirebaseBridge?.connected)throw new Error("Firebase no está conectado.");
  await window.SaaSAuthAdmin?.refreshAccess?.();
  if(!window.SaaSAuthAdmin?.isSuperAdmin?.())throw new Error("La sesión actual no tiene permisos de SuperAdmin.");
  await queueCatalogUpload();
  await ensureCatalogTenants();
  return true;
}

async function initializeTenant(businessId,state){
  if(!window.FirebaseBridge?.connected)throw new Error("Firebase no está conectado.");
  await window.SaaSAuthAdmin?.refreshAccess?.();
  if(!window.SaaSAuthAdmin?.isSuperAdmin?.())throw new Error("Solo SuperAdmin puede inicializar un negocio.");
  await uploadTenantState(businessId,state);
  hydratedTenants.add(String(businessId||""));
  return true;
}

window.SaaSCloudProduction={syncForCurrentSession,forceUploadCatalog,initializeTenant,isTenantHydrating:tenantHydrating,resetCloudSession};

async function attemptSync(){
  const uid=String(window.FirebaseBridge?.user?.uid||"");
  if(uid!==lastObservedUid){
    resetCloudSession();
    lastObservedUid=uid;
  }
  const role=SaaS.session?.role||"guest";
  const key=`${uid}:${role}:${SaaS.session?.businessId||""}`;
  if(!uid||role==="guest"||key===lastSyncKey)return;
  try{if(await syncForCurrentSession())lastSyncKey=key}catch(e){console.error("[SaaS Cloud]",e)}
}

const timer=setInterval(()=>{attemptSync()},700);
setTimeout(()=>clearInterval(timer),60000);
