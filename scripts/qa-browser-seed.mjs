import {createRequire} from "node:module";
import {assertLocalEmulators,PROJECT} from "./qa-browser-server.mjs";
assertLocalEmulators();
const require=createRequire(new URL("../functions/package.json",import.meta.url));
const {initializeApp,deleteApp}=require("firebase-admin/app");
const {getFirestore}=require("firebase-admin/firestore");
const {getAuth}=require("firebase-admin/auth");
export const PASSWORD="QA-only-123456";
export const PHONE="5551234567",PIN="12345678",BUSINESS="qa-studio",SECOND="qa-other";
export async function seedQa(){
 const app=initializeApp({projectId:PROJECT},"qa-browser-seed"),db=getFirestore(app),auth=getAuth(app);
 const users={};
 try{
  for(const role of ["superadmin","owner","admin","manager","reception","cashier","barber","other","suspended","client"]){
   const email=role==="client"?BUSINESS+"."+PHONE+"@clients.sambrix.app":role+"@sambrix-qa.example";
   const password=role==="client"?PIN:PASSWORD;
   const u=await auth.createUser({email,password,displayName:"QA "+role});
   users[role]={uid:u.uid,email,password};
  }
  const company=(id,name,status="Activo")=>({id,name,type:"Barbería",status,accessSuspended:status==="Suspendido",planId:"plan-premium",nextPayment:"2099-12-31",owner:"Propietario QA",ownerEmail:users.owner.email,branches:[{id:"branch",name:"Principal",active:true}],brand:{name}});
  const businesses=[company(BUSINESS,"Estudio SAMBRIX QA"),company(SECOND,"Empresa Aislada QA"),company("qa-suspended","Suspendida QA","Suspendido")];
  const batch=db.batch();
  batch.set(db.doc("platform/config"),{ownerUid:users.superadmin.uid,shopServerEnabled:true});
  batch.set(db.doc("platform/business_catalog"),{businesses,plans:[{id:"plan-basic",name:"Básico",price:10,features:[]},{id:"plan-pro",name:"Pro",price:20,features:[]},{id:"plan-premium",name:"Premium",price:30,features:[]}],supportAudit:[]});
  batch.set(db.doc("platform_users/"+users.superadmin.uid),{uid:users.superadmin.uid,role:"superadmin",active:true,email:users.superadmin.email,name:"QA SuperAdmin"});
  for(const role of ["owner","admin","manager","reception","cashier","barber","other","suspended"]){
   const u=users[role],id=role==="other"?SECOND:role==="suspended"?"qa-suspended":BUSINESS,r=["other","suspended"].includes(role)?"owner":role;
   batch.set(db.doc("platform_users/"+u.uid),{uid:u.uid,businessId:id,role:"business_user",active:true,email:u.email,name:"QA "+role});
   batch.set(db.doc("businesses/"+id+"/members/"+u.uid),{uid:u.uid,businessId:id,role:r,active:true,email:u.email,name:"QA "+role});
  }
  for(const b of businesses){
   batch.set(db.doc("businesses/"+b.id),b);
   const branchId="branch",businessId=b.id,identity={businessId,branchId};
   const service={id:"s1",name:"Corte QA",duration:60,price:12,...identity};
   const professional={id:"p1",name:"Profesional QA",active:true,...identity};
   const client={id:"c1",name:b.id===SECOND?"Cliente exclusivo otra empresa":"Cliente de prueba",phone:"5550000000",visits:0,points:0,...identity};
   const modules={
    config:{business:{name:b.name,currency:"$",open:"09:00",close:"19:00",timezone:"America/Caracas",clientApp:{brandName:b.name,promotions:[]}},meta:{...identity,businessType:b.type},services:[service],barbers:[professional],users:[]},
    crm:{clients:[client],approvalRequests:[],clientRequests:[]},schedule:{appointments:[]},finance:{sales:[],cash:[]},
    inventory:{products:[{id:"product1",name:"Champú QA",category:"Insumo",stock:10,min:2,cost:4,price:8,...identity}],stockMoves:[],shopOrders:[]},
    staff:{employees:[]},attendance:{attendance:[],absences:[]},history:{auditLog:[],clientActivity:[]}
   };
   for(const [name,payload] of Object.entries(modules))batch.set(db.doc("businesses/"+b.id+"/state/"+name),{businessId:b.id,syncRevision:1,payload});
   batch.set(db.doc("public_businesses/"+b.id),{businessId:b.id,name:b.name,status:b.status,timezone:"America/Caracas",branch:{id:"branch",name:"Principal"},branding:{brandName:b.name},businessHours:{open:"09:00",close:"19:00"},services:[service],barbers:[professional],busy:[]});
   batch.set(db.doc("public_businesses/"+b.id+"/public_state/availability"),{businessId:b.id,businessHours:{open:"09:00",close:"19:00"},barbers:[professional],busy:[]});
  }
  batch.set(db.doc("public_businesses/"+BUSINESS+"/client_accounts/"+users.client.uid),{clientId:"client_"+users.client.uid,name:"Cliente QA",phone:PHONE,phoneNormalized:PHONE,status:"Activo",points:0,visits:0});
  await batch.commit();
  return {users,db,close:async()=>{await db.terminate();await deleteApp(app);}};
 }catch(e){await db.terminate();await deleteApp(app);throw e;}
}
