
import {firebaseConfig} from "../firebase/firebase-config.js";
import {firebaseApp,firestore,doc,getDoc,setDoc,serverTimestamp} from "../firebase/firebase-core.js";
import {initializeApp,deleteApp} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {getAuth,createUserWithEmailAndPassword,signOut,deleteUser} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {collection,getDocs,deleteDoc,updateDoc} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

let platformConfig=null,currentProfile=null;

async function loadPlatformConfig(){
  try{
    const s=await getDoc(doc(firestore,"platform","config"));
    platformConfig=s.exists()?s.data():null;
  }catch(error){
    platformConfig=null;
    if(String(error?.code||"")!=="permission-denied")console.warn("[SAMBRIX platform config]",error);
  }
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
  const app=initializeApp(firebaseConfig,"secondary-"+Date.now()+"-"+Math.random().toString(36).slice(2));
  const auth=getAuth(app);
  const credential=await createUserWithEmailAndPassword(auth,email,password);
  return {app,auth,user:credential.user};
}

async function createBusinessMember({businessId,name,email,password,role}){
  const memberRole=String(role||"barber").toLowerCase();
  const allowedRoles=["owner","admin","manager","reception","cashier","barber"];
  if(!businessId||!email||!password||password.length<8)throw new Error("Completa correo y contraseña mínima de 8 caracteres.");
  if(!allowedRoles.includes(memberRole))throw new Error("Rol de usuario inválido.");
  if(memberRole==="owner"&&!isSuperAdmin())throw new Error("Solo SuperAdmin puede crear otro propietario.");

  const secondary=await createAuthUser(email,password);
  const u=secondary.user;
  let memberCreated=false;
  try{
    await setDoc(doc(firestore,"businesses",businessId,"members",u.uid),{
      uid:u.uid,businessId,name:name||email,email,role:memberRole,active:true,createdAt:serverTimestamp()
    });
    memberCreated=true;

    const business=SaaS.db.businesses?.find(b=>b.id===businessId);
    if(business){
      await setDoc(doc(firestore,"businesses",businessId),{
        id:businessId,name:business.name||"Negocio",type:business.type||"",status:business.status||"Activo",
        owner:business.owner||name||email,ownerEmail:business.ownerEmail||email,
        branches:business.branches||[],brand:business.brand||{},planId:business.planId||business.plan||"",
        updatedAt:serverTimestamp()
      },{merge:true});
    }

    await setDoc(doc(firestore,"platform_users",u.uid),{
      uid:u.uid,email,name:name||email,role:"business_user",businessId,active:true,createdAt:serverTimestamp()
    },{merge:true});
    return u;
  }catch(error){
    if(memberCreated){try{await deleteDoc(doc(firestore,"businesses",businessId,"members",u.uid))}catch{}}
    try{await deleteUser(u)}catch{}
    throw error;
  }finally{
    try{await signOut(secondary.auth)}catch{}
    try{await deleteApp(secondary.app)}catch{}
  }
}

async function listBusinessMembers(businessId){
  const s=await getDocs(collection(firestore,"businesses",businessId,"members"));
  return s.docs.map(d=>({id:d.id,...d.data()}));
}

async function removeBusinessMember(businessId,uid){
  await updateDoc(doc(firestore,"businesses",businessId,"members",uid),{active:false,updatedAt:serverTimestamp()});
  try{await updateDoc(doc(firestore,"platform_users",uid),{active:false,updatedAt:serverTimestamp()})}catch{}
}

async function reactivateBusinessMember(businessId,uid){
  await updateDoc(doc(firestore,"businesses",businessId,"members",uid),{active:true,updatedAt:serverTimestamp()});
  try{await updateDoc(doc(firestore,"platform_users",uid),{active:true,updatedAt:serverTimestamp()})}catch{}
}

async function myBusinessMemberships(){
  const u=window.FirebaseBridge?.user;if(!u)return [];
  await loadCurrentProfile();
  if(currentProfile?.active===false)return [];
  const out=[];
  for(const b of SaaS.db.businesses||[]){
    const s=await getDoc(doc(firestore,"businesses",b.id,"members",u.uid));
    if(!s.exists()||s.data()?.active===false)continue;
    const businessSnap=await getDoc(doc(firestore,"businesses",b.id));
    const status=String(businessSnap.data()?.status||b.status||"Activo").toLowerCase();
    if(["suspendido","suspended","inactivo","inactive","bloqueado","blocked"].includes(status))continue;
    out.push({businessId:b.id,...s.data()});
  }
  return out;
}

async function resolveMyBusiness(){
  const u=window.FirebaseBridge?.user;if(!u)return null;
  await loadCurrentProfile();
  if(!currentProfile||currentProfile.active===false)return null;
  const businessId=String(currentProfile?.businessId||"");
  if(!businessId)return null;
  const member=await getDoc(doc(firestore,"businesses",businessId,"members",u.uid));
  if(!member.exists()||member.data()?.active===false)return null;
  const businessSnap=await getDoc(doc(firestore,"businesses",businessId));
  const business=businessSnap.exists()?{id:businessId,...businessSnap.data()}:{id:businessId,name:"Mi negocio",branches:[]};
  const status=String(business.status||"Activo").toLowerCase();
  if(["suspendido","suspended","inactivo","inactive","bloqueado","blocked"].includes(status))return null;
  return {business,membership:{businessId,...member.data()}};
}

async function repairBusinessUserLinks(){
  if(!isSuperAdmin())return 0;
  let repaired=0;
  for(const business of SaaS.db.businesses||[]){
    const members=await getDocs(collection(firestore,"businesses",business.id,"members"));
    for(const m of members.docs){
      const data=m.data()||{};
      await setDoc(doc(firestore,"platform_users",m.id),{
        uid:m.id,email:data.email||"",name:data.name||data.email||"Usuario",role:"business_user",
        businessId:business.id,active:data.active!==false,updatedAt:serverTimestamp()
      },{merge:true});
      repaired++;
    }
  }
  return repaired;
}

function isSuperAdmin(){
  const u=window.FirebaseBridge?.user;
  return !!(u&&platformConfig?.ownerUid===u.uid);
}

function updateSuperAdminUI(){
  const superOn=isSuperAdmin();
  const superPages=["superadmin","saasPlans","saasSupport","saasSubscriptions","platformSettings","saasAlerts","saasAudit","saasSecurity","systemHealth","backupCenter","supportCenter","licenseCenter","saasAnalytics","activationCenter","launchDiagnostics","launchCenter","testCenter","technicalAudit","firebaseTestCenter","finalTestWizard","certificationCenter","productionCenter","migrationCenter","healthCenter","incidentCenter","continuityCenter","maintenanceCenter","updateCenter","authSecurityCenter","firebaseRulesCenter","deploymentCenter","releaseCandidateCenter","smokeTestCenter","runtimeDiagnosticsCenter","bugReportCenter","syncTestCenter","dataIntegrityCenter","performanceCenter","compatibilityCenter","validationSecurityCenter","privacyCenter","finalReadinessCenter","secretsSecurityCenter","demoDataCenter","cacheVersionCenter","recoveryCenter","operationsCenter","serviceStatusCenter","onboardingCenter","trainingHandoffCenter","helpCenter","billingOperationsCenter","renewalAlertsCenter","discountsCenter","invoicesCenter","accountStatementsCenter","saasMetricsCenter","reviewGateCenter","saasAddons","saasCRM"];
  document.querySelectorAll(superPages.map(p=>`[data-page="${p}"]`).join(",")).forEach(el=>{el.style.display=superOn?"":"none";});
  if(!superOn&&superPages.some(id=>document.getElementById(id)?.classList.contains("active"))){
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
  refreshAccess,isSuperAdmin,createBusinessMember,listBusinessMembers,removeBusinessMember,reactivateBusinessMember,myBusinessMemberships,resolveMyBusiness,repairBusinessUserLinks,
  get profile(){return currentProfile},
  get platform(){return platformConfig}
};
