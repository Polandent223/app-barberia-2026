import {initializeApp} from "firebase-admin/app";
import {getFirestore,FieldValue} from "firebase-admin/firestore";
import {onCall,HttpsError} from "firebase-functions/v2/https";
import {createShopService} from "./shop-service.js";
initializeApp();
const db=getFirestore();
const sdk={
 doc:(root,...path)=>path.length?root.doc(path.join("/")):root.doc(),
 collection:(root,...path)=>root.collection(path.join("/")),
 serverTimestamp:()=>FieldValue.serverTimestamp(),
 runTransaction:(root,run)=>root.runTransaction(tx=>run({
  get:async ref=>{const s=await tx.get(ref);return {exists:()=>s.exists,data:()=>s.data()};},
  set:(...args)=>tx.set(...args),
  update:(...args)=>tx.update(...args)
 }))
};
const execute=createShopService({db,sdk});
const known=new Set(["unauthenticated","permission-denied","invalid-argument","failed-precondition"]);
const handler=kind=>onCall({region:"us-central1",timeoutSeconds:60,maxInstances:10},async request=>{
 try{const result=await execute(kind,request.auth,request.data);return kind==="SALE"?{sale:result}:{saleId:result.sale.id,amount:result.cash.amount};}
 catch(error){
  if(known.has(error?.code))throw new HttpsError(error.code,error.message);
  if(typeof error?.code==="number"||error?.code){console.error("POS transaction failed",error.code);throw new HttpsError("internal","No se pudo confirmar la operación. Reintenta con la misma solicitud.");}
  throw new HttpsError("failed-precondition",String(error?.message||"Operación no disponible.").slice(0,300));
 }
});
export const sambrixSellProducts=handler("SALE");
export const sambrixReturnProducts=handler("RETURN");
