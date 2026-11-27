
import {firebaseConfig} from "../firebase/firebase-config.js";
import {firebaseApp,firestore,doc,getDoc,setDoc,serverTimestamp} from "../firebase/firebase-core.js";
import {initializeApp,deleteApp} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {getAuth,createUserWithEmailAndPassword,signOut,deleteUser} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {collection,getDocs,getDocsFromServer,deleteDoc,updateDoc,getDocFromServer,runTransaction} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

let platformConfig=null,currentProfile=null;

async function loadPlatformConfig(){
  try{
    const s=await getDocFromServer(doc(firestore,"platform","config"));
    platformConfig=s.exists()?s.data():null;
  }catch(error){
    platformConfig=null;
    console.warn("[SAMBRIX platform config]",error);
    throw new Error(String(error?.code||"")==="permission-denied"
      ?"Firebase todavía no permite validar el SuperAdmin. Publica las reglas Firestore actualizadas."
      :(error?.message||"No se pudo cargar la configuración de SAMBRIX."));
  }
  return platformConfig;
}

async function loadCurrentProfile(){
  const u=window.FirebaseBridge?.user;
  if(!u){currentProfile=null;return null}
  const s=await getDocFromServer(doc(firestore,"platform_users",u.uid));
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
  try{const credential=await createUserWithEmailAndPassword(auth,email,password);return {app,auth,user:credential.user};}
  catch(error){try{await deleteApp(app);}catch{}throw error;}
}

async function memberManager(businessId){
  const uid=window.FirebaseBridge?.user?.uid;
  if(!uid||!businessId)throw Error("Inicia sesión para gestionar usuarios.");
  if(isSuperAdmin())return {uid,role:"superadmin"};
  if(window.SaaS?.session?.businessId!==businessId)throw Error("Empresa no autorizada.");
  const snap=await getDocFromServer(doc(firestore,"businesses",businessId,"members",uid));
  const m=snap.data();
  if(!m||m.active===false||!["owner","admin"].includes(m.role))throw Error("No tienes permiso para gestionar accesos.");
  return {uid,role:m.role};
}
async function createBusinessMember({businessId,name,email,password,role}){
  const memberRole=String(role||"barber").toLowerCase();
  const allowedRoles=["owner","admin","manager","reception","cashier","barber"];
  if(!businessId||!email||!password||password.length<8)throw new Error("Completa correo y contraseña mínima de 8 caracteres.");
  if(!allowedRoles.includes(memberRole))throw new Error("Rol de usuario inválido.");
  const actor=await memberManager(businessId);
  if(memberRole==="owner"&&actor.role!=="superadmin")throw Error("Solo SuperAdmin puede crear otro propietario.");
  if(memberRole==="admin"&&!["owner","superadmin"].includes(actor.role))throw Error("Solo el propietario o SuperAdmin puede crear administradores.");

  const secondary=await createAuthUser(email,password);
  const u=secondary.user;
  let memberCreated=false;
  try{
    await setDoc(doc(firestore,"businesses",businessId,"members",u.uid),{
      uid:u.uid,businessId,name:name||email,email,role:memberRole,active:true,createdAt:serverTimestamp()
    });
    memberCreated=true;

    // Creating another user must never reset the commercial state of an existing company.
    const businessRef=doc(firestore,"businesses",businessId);
    const business=SaaS.db.businesses?.find(b=>b.id===businessId);
    await runTransaction(firestore,async tx=>{
      const existing=await tx.get(businessRef);
      if(existing.exists())return;
      if(!isSuperAdmin()||!business)throw Error("Primero verifica la empresa en Firebase.");
      tx.set(businessRef,{
        id:businessId,name:business.name||"Negocio",type:business.type||"",status:business.status||"Activo",
        owner:business.owner||name||email,ownerEmail:business.ownerEmail||email,
        branches:business.branches||[],brand:business.brand||{},planId:business.planId||business.plan||"",
        nextPayment:business.nextPayment||"",updatedAt:serverTimestamp()
      });
    });

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
  const s=await getDocsFromServer(collection(firestore,"businesses",businessId,"members"));
  return s.docs.map(d=>({id:d.id,...d.data()}));
}

async function updateManagedMember(businessId,uid,patch){
  const actor=await memberManager(businessId);
  if(uid===actor.uid)throw Error("No puedes modificar tu propio acceso.");
  const ref=doc(firestore,"businesses",businessId,"members",uid);
  await runTransaction(firestore,async tx=>{
    const snap=await tx.get(ref),m=snap.data();
    if(!m||m.role==="owner")throw Error("El acceso del propietario está protegido.");
    if(actor.role==="admin"&&(m.role==="admin"||patch.role==="admin"))throw Error("No puedes gestionar administradores.");
    if(patch.role&&!["admin","manager","reception","cashier","barber"].includes(patch.role))throw Error("Rol inválido.");
    tx.update(ref,{...patch,updatedAt:serverTimestamp()});
  });
}
async function changeBusinessMemberRole(businessId,uid,role){
  return updateManagedMember(businessId,uid,{role});
}
async function setBusinessMemberActive(businessId,uid,active){
  if(typeof active!=="boolean")throw Error("Estado inválido.");
  return updateManagedMember(businessId,uid,{active});
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
  const member=await getDocFromServer(doc(firestore,"businesses",businessId,"members",u.uid));
  if(!member.exists()||member.data()?.active===false)return null;
  const businessSnap=await getDocFromServer(doc(firestore,"businesses",businessId));
  const business=businessSnap.exists()?{id:businessId,...businessSnap.data()}:{id:businessId,name:"Mi negocio",branches:[]};
  if(business.accessSuspended===true)return null;
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
      const profileRef=doc(firestore,"platform_users",m.id);
      await runTransaction(firestore,async tx=>{
        const old=await tx.get(profileRef),p=old.data();
        if(p&&(p.role!=="business_user"||p.businessId&&p.businessId!==business.id))return;
        tx.set(profileRef,{
          uid:m.id,email:data.email||"",name:data.name||data.email||"Usuario",role:"business_user",
          businessId:business.id,active:p?p.active!==false:true,updatedAt:serverTimestamp()
        },{merge:true});
      });
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
  refreshAccess,isSuperAdmin,createBusinessMember,listBusinessMembers,removeBusinessMember,reactivateBusinessMember,changeBusinessMemberRole,setBusinessMemberActive,myBusinessMemberships,resolveMyBusiness,repairBusinessUserLinks,
  get profile(){return currentProfile},
  get platform(){return platformConfig}
};
