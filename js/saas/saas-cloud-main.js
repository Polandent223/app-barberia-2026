
import {cloudBootstrapPlatform,uploadBusinessCatalog,downloadBusinessCatalog,uploadCurrentTenant,downloadTenant,watchCatalog,watchCurrentTenant} from "./saas-cloud.js";

let hooked=false;
async function onFirebaseReady(){
  if(!window.FirebaseBridge?.connected||!window.SaaS)return;
  try{
    await cloudBootstrapPlatform();
    await window.SaaSAuthAdmin?.refreshAccess?.();
    const got=await downloadBusinessCatalog();
    if(!got)await uploadBusinessCatalog();
    const b=SaaS.currentBusiness();
    const tenantGot=await downloadTenant(b.id);
    if(!tenantGot)await uploadCurrentTenant();
    watchCatalog();watchCurrentTenant();
    if(!hooked){
      const oldSave=SaaS.save.bind(SaaS);
      SaaS.save=function(){oldSave();if(window.FirebaseBridge?.connected)uploadBusinessCatalog().catch(console.error)};
      const oldSwitch=SaaS.switchTenant.bind(SaaS);
      SaaS.switchTenant=function(id,opts){const r=oldSwitch(id,opts);if(r&&window.FirebaseBridge?.connected){downloadTenant(id).then(()=>watchCurrentTenant()).catch(console.error)}return r};
      const A=window.App,oldPersist=A.persist.bind(A);
      A.persist=function(){const r=oldPersist();if(window.FirebaseBridge?.connected)uploadCurrentTenant().catch(console.error);return r};
      hooked=true;
    }
  }catch(e){console.error("[SaaS Cloud]",e)}
}

const timer=setInterval(()=>{if(window.FirebaseBridge?.connected){clearInterval(timer);onFirebaseReady()}},500);
setTimeout(()=>clearInterval(timer),30000);
