import {readFileSync} from "node:fs";
import {before,after,test} from "node:test";
import {initializeTestEnvironment,assertSucceeds,assertFails} from "@firebase/rules-unit-testing";
import {doc,getDoc,setDoc,updateDoc,deleteDoc,writeBatch,serverTimestamp} from "firebase/firestore";
let env;
const path=(db,...s)=>doc(db,...s);
const state=(db,id,name)=>path(db,"businesses",id,"state",name);
const member=(db,id,uid)=>path(db,"businesses",id,"members",uid);
const actor=uid=>env.authenticatedContext(uid).firestore();
const payload={cash:[{id:"cash1",amount:10,type:"Ingreso"}],sales:[{id:"sale1",total:10}]};
before(async()=>{
  if(!process.env.FIRESTORE_EMULATOR_HOST)throw Error("No se permite ejecutar estas pruebas contra producción.");
  env=await initializeTestEnvironment({projectId:"demo-sambrix-qa",firestore:{rules:readFileSync(new URL("../firestore.rules",import.meta.url),"utf8")}});
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx=>{
    const db=ctx.firestore();
    await setDoc(path(db,"platform","config"),{ownerUid:"root"});
    for(const id of ["one","two","blocked"])await setDoc(path(db,"businesses",id),{id,status:"Activo",accessSuspended:id==="blocked",planId:"plan-pro"});
    for(const [uid,id,role] of [["owner","one","owner"],["admin","one","admin"],["cashier","one","cashier"],["barber","one","barber"],["other","two","owner"],["locked","blocked","owner"]]){
      await setDoc(path(db,"platform_users",uid),{uid,active:true,role:"business_user",businessId:id});
      await setDoc(member(db,id,uid),{uid,businessId:id,role,active:true});
    }
    for(const id of ["one","two","blocked"])await setDoc(state(db,id,"finance"),{businessId:id,payload,syncRevision:1});
  });
});
after(async()=>{if(env)await env.cleanup();});
test("tenant cannot access another business or a suspended business",async()=>{
  await assertSucceeds(getDoc(state(actor("owner"),"one","finance")));
  await assertFails(getDoc(state(actor("other"),"one","finance")));
  await assertFails(getDoc(state(actor("locked"),"blocked","finance")));
  await assertFails(getDoc(state(env.unauthenticatedContext().firestore(),"one","finance")));
});
test("tenant cannot change commercial plan or lift suspension",async()=>{
  await assertFails(updateDoc(path(actor("owner"),"businesses","one"),{planId:"plan-premium"}));
  await assertFails(updateDoc(path(actor("locked"),"businesses","blocked"),{accessSuspended:false}));
});
test("admin cannot promote another user to admin",async()=>{
  await assertFails(updateDoc(member(actor("admin"),"one","cashier"),{role:"admin"}));
});
function financeWrite(db,uid,next,revision,eventId){
  const b=writeBatch(db),ref=state(db,"one","finance"),event=path(db,"businesses","one","state_events",eventId);
  b.update(ref,{payload:next,syncRevision:revision,updatedByUid:uid,updatedAt:serverTimestamp(),auditId:eventId});
  b.set(event,{businessId:"one",domain:"finance",revision,actorUid:uid,createdAt:serverTimestamp()});return b.commit();
}
test("cashier can append an audited movement but cannot edit or delete history",async()=>{
  const db=actor("cashier"),next={...payload,cash:[...payload.cash,{id:"cash2",amount:5,type:"Ingreso"}]};
  await assertFails(updateDoc(state(db,"one","finance"),{payload:next,syncRevision:2,updatedByUid:"cashier",updatedAt:serverTimestamp()}));
  await assertFails(financeWrite(db,"cashier",{...payload,cash:[]},2,"bad-delete"));
  await assertFails(financeWrite(db,"cashier",{...payload,cash:[{...payload.cash[0],amount:1}]},2,"bad-edit"));
  await assertSucceeds(financeWrite(db,"cashier",next,2,"ok"));
  await assertFails(financeWrite(db,"cashier",next,2,"stale"));
  await assertFails(deleteDoc(state(db,"one","finance")));
  await assertFails(deleteDoc(path(db,"businesses","one","state_events","ok")));
  await assertSucceeds(getDoc(path(actor("owner"),"businesses","one","state_events","ok")));
});
test("professional cannot write finance even with audit",async()=>{
  await assertFails(financeWrite(actor("barber"),"barber",payload,3,"bad-role"));
});
