
import {firebaseConfig} from "../firebase/firebase-config.js";
import {firebaseApp,firestore,doc,getDoc,setDoc,serverTimestamp} from "../firebase/firebase-core.js";
import {initializeApp,deleteApp} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {getAuth,createUserWithEmailAndPassword,signOut} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {collection,getDocs,deleteDoc} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

let platformConfig=null,currentProfile=null;

async function loadPlatformConfig(){
  const s=await getDoc(doc(firestore,"platform","config"));
  platformConfig=s.exists()?s.data():null;
  return platformConfig;
}

async function loadCurrentProfile(){
  const u=window.FirebaseBridge?.user;
  if(!u){currentProfile=null;return null}
  const s=await getDoc(doc(firestore,"platform_users",u.uid));
  currentProfile=s.exists()?s.data():null;
  return currentProfile;
}

async function ensureSuperAdminProfile(){
  const u=window.FirebaseBridge?.user;if(!u)return false;
  await loadPlatformConfig();
  if(platformConfig?.ownerUid!==u.uid)return false;
  const ref=doc(firestore,"platform_users",u.uid);
  const s=await getDoc(ref);
  if(!s.exists()){
    await setDoc(ref,{uid:u.uid,email:u.email||"",name:"Super Administrador",role:"superadmin",active:true,createdAt:serverTimestamp()});
  }
  await loadCurrentProfile();
  return true;
}

async function createAuthUser(email,password){
  const name="secondary-"+Date.now();
  const secondary=initializeApp(firebaseConfig,name);
  const auth=getAuth(secondary);
  try{
    const c=await createUserWithEmailAndPassword(auth,email,password);
    await signOut(auth);
    return c.user;
  }finally{
    await deleteApp(secondary);
  }
}

async function createBusinessMember({businessId,name,email,password,role}){
  if(!businessId||!email||!password||password.length<6)throw new Error("Completa correo y contraseña mínima de 6 caracteres.");
  const u=await createAuthUser(email,password);
  await setDoc(doc(firestore,"businesses",businessId,"members",u.uid),{
    uid:u.uid,businessId,name:name||email,email,role:role||"barber",active:true,createdAt:serverTimestamp()
  });
  await setDoc(doc(firestore,"platform_users",u.uid),{
    uid:u.uid,email,name:name||email,role:"business_user",active:true,createdAt:serverTimestamp()
  },{merge:true});
  return u;
}

async function listBusinessMembers(businessId){
  const s=await getDocs(collection(firestore,"businesses",businessId,"members"));
  return s.docs.map(d=>({id:d.id,...d.data()}));
}

async function removeBusinessMember(businessId,uid){
  await deleteDoc(doc(firestore,"businesses",businessId,"members",uid));
}

async function myBusinessMemberships(){
  const u=window.FirebaseBridge?.user;if(!u)return [];
  const out=[];
  for(const b of SaaS.db.businesses||[]){
    const s=await getDoc(doc(firestore,"businesses",b.id,"members",u.uid));
    if(s.exists()&&s.data()?.active!==false)out.push({businessId:b.id,...s.data()});
  }
  return out;
}

function isSuperAdmin(){
  const u=window.FirebaseBridge?.user;
  return !!(u&&platformConfig?.ownerUid===u.uid);
}

function updateSuperAdminUI(){
  const superOn=isSuperAdmin();
  document.querySelectorAll('[data-page="superadmin"],[data-page="saasPlans"],[data-page="saasSupport"],[data-page="saasSubscriptions"],[data-page="platformSettings"],[data-page="saasAlerts"],[data-page="saasAudit"],[data-page="saasSecurity"],[data-page="systemHealth","backupCenter","supportCenter","licenseCenter","saasAnalytics","activationCenter","launchDiagnostics","launchCenter","testCenter","technicalAudit","firebaseTestCenter","finalTestWizard","certificationCenter","productionCenter","migrationCenter","healthCenter","incidentCenter","continuityCenter","maintenanceCenter","updateCenter","authSecurityCenter","firebaseRulesCenter","deploymentCenter","releaseCandidateCenter","smokeTestCenter","runtimeDiagnosticsCenter","bugReportCenter","syncTestCenter","dataIntegrityCenter","performanceCenter","compatibilityCenter","validationSecurityCenter","privacyCenter","finalReadinessCenter","secretsSecurityCenter","demoDataCenter","cacheVersionCenter","recoveryCenter","operationsCenter","serviceStatusCenter","onboardingCenter","trainingHandoffCenter","helpCenter","billingOperationsCenter","renewalAlertsCenter","discountsCenter","invoicesCenter","accountStatementsCenter","saasMetricsCenter","reviewGateCenter","saasAddons","saasCRM"],[data-page="saasAddons","saasCRM"],[data-page="saasCRM"]').forEach(el=>{
    el.style.display=superOn?"":"none";
  });
  if(!superOn&&["superadmin","saasPlans","saasSupport","saasSubscriptions","platformSettings","saasAlerts","saasAudit","saasSecurity","systemHealth","backupCenter","supportCenter","licenseCenter","saasAnalytics","activationCenter","launchDiagnostics","launchCenter","testCenter","technicalAudit","firebaseTestCenter","finalTestWizard","certificationCenter","productionCenter","migrationCenter","healthCenter","incidentCenter","continuityCenter","maintenanceCenter","updateCenter","authSecurityCenter","firebaseRulesCenter","deploymentCenter","releaseCandidateCenter","smokeTestCenter","runtimeDiagnosticsCenter","bugReportCenter","syncTestCenter","dataIntegrityCenter","performanceCenter","compatibilityCenter","validationSecurityCenter","privacyCenter","finalReadinessCenter","secretsSecurityCenter","demoDataCenter","cacheVersionCenter","recoveryCenter","operationsCenter","serviceStatusCenter","onboardingCenter","trainingHandoffCenter","helpCenter","billingOperationsCenter","renewalAlertsCenter","discountsCenter","invoicesCenter","accountStatementsCenter","saasMetricsCenter","reviewGateCenter","saasAddons","saasCRM"].some(id=>document.getElementById(id)?.classList.contains("active"))){
    window.App?.go?.("inicio");
  }
}

async function refreshAccess(){
  await loadPlatformConfig();
  await ensureSuperAdminProfile();
  await loadCurrentProfile();
  updateSuperAdminUI();
  return {superAdmin:isSuperAdmin(),profile:currentProfile};
}

window.SaaSAuthAdmin={
  refreshAccess,isSuperAdmin,createBusinessMember,listBusinessMembers,removeBusinessMember,myBusinessMemberships,
  get profile(){return currentProfile},
  get platform(){return platformConfig}
};
