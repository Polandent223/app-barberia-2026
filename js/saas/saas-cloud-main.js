import {cloudBootstrapPlatform,uploadBusinessCatalog,downloadBusinessCatalog,uploadCurrentTenant,downloadTenant,watchCatalog,watchCurrentTenant} from "./saas-cloud.js";

let hooked=false,lastSyncKey="";

function installHooks(){
  if(hooked||!window.SaaS||!window.App)return;
  const oldSave=SaaS.save.bind(SaaS);
  SaaS.save=function(){
    oldSave();
    if(window.FirebaseBridge?.connected&&SaaS.session?.role==="superadmin")uploadBusinessCatalog().catch(console.error);
  };
  const oldSwitch=SaaS.switchTenant.bind(SaaS);
  SaaS.switchTenant=function(id,opts){
    const r=oldSwitch(id,opts);
    if(r&&window.FirebaseBridge?.connected&&SaaS.session?.role!=="guest"){
      downloadTenant(id).then(()=>watchCurrentTenant()).catch(console.error);
    }
    return r;
  };
  const A=window.App,oldPersist=A.persist.bind(A);
  A.persist=function(){
    const r=oldPersist();
    if(window.FirebaseBridge?.connected&&["owner","admin","manager","reception","cashier","barber","superadmin"].includes(SaaS.session?.role)){
      uploadCurrentTenant().then(()=>{
        if(["owner","admin","manager","superadmin"].includes(SaaS.session?.role))return window.NexoPublicCloud?.publishCurrentBusiness?.();
      }).catch(console.error);
    }
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
    if(!got)await uploadBusinessCatalog();
    await window.SaaSAuthAdmin?.repairBusinessUserLinks?.();
    watchCatalog();
    return true;
  }

  const businessId=SaaS.session?.businessId||SaaS.getContext?.()?.businessId;
  if(!businessId)return false;
  if(SaaS.getContext?.()?.businessId!==businessId)SaaS.switchTenant?.(businessId,{support:false});
  const tenantGot=await downloadTenant(businessId);
  if(!tenantGot)await uploadCurrentTenant();
  watchCurrentTenant();
  return true;
}

window.SaaSCloudProduction={syncForCurrentSession};

async function attemptSync(){
  const uid=window.FirebaseBridge?.user?.uid||"";
  const role=SaaS.session?.role||"guest";
  const key=`${uid}:${role}:${SaaS.session?.businessId||""}`;
  if(!uid||role==="guest"||key===lastSyncKey)return;
  try{if(await syncForCurrentSession())lastSyncKey=key}catch(e){console.error("[SaaS Cloud]",e)}
}

const timer=setInterval(()=>{
  if(window.FirebaseBridge?.connected)attemptSync();
},700);
setTimeout(()=>clearInterval(timer),60000);
