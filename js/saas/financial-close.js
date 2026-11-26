import {auth,firestore} from "../firebase/firebase-core.js";
import {doc,collection,runTransaction,serverTimestamp} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import {closeAppointment} from "./financial-close-core.js?v=2.0.11";
let busy=false;
function boot(){
 const A=window.App,S=window.SaaS;if(!A||!S)return;
 const allowed=()=>["owner","admin","manager","reception"].includes(S.session?.role)&&S.canWriteDomain?.("schedule")&&S.canWriteDomain?.("finance")&&S.pageAllowed?.("citas")&&S.featureAllowed?.("caja",S.currentBusiness?.());
 A.commitAppointmentFinalization=async(id,{method="Efectivo",amount=null}={})=>{
  if(busy||!allowed())return false;
  const businessId=S.session?.businessId,actor=auth.currentUser?.uid,cloud=window.SaaSCloudProduction;
  if(!businessId||!actor||!cloud?.isTenantReady?.(businessId)){A.toast("Primero verifica la conexión y la empresa.");return false;}
  const check=()=>{if(!allowed()||S.session?.businessId!==businessId||auth.currentUser?.uid!==actor)throw Error("Cambió la sesión.");};
  busy=true;
  const lock=document.createElement("dialog");lock.className="cloud-support-dialog";lock.textContent="Guardando cierre en Firebase…";document.body.append(lock);lock.addEventListener("cancel",e=>e.preventDefault());lock.showModal();
  try{
   await cloud.awaitTenantWrites(businessId);check();
   const sale=await closeAppointment({db:firestore,sdk:{doc,collection,runTransaction,serverTimestamp},businessId,appointmentId:id,method,amount,actor,email:auth.currentUser?.email||"",check});
   if(S.session?.businessId===businessId&&auth.currentUser?.uid===actor){
     try{await cloud.refreshTenant(businessId);await window.NexoPublicCloud?.publishCurrentAvailability?.();}catch(e){console.warn("[SAMBRIX close refresh]",e);}
     A.toast("Cobro confirmado en Firebase. Recibo #"+sale.number);
   }
   return sale;
  }catch(e){A.toast(e?.code==="permission-denied"?"Firebase no autorizó el cierre. Verifica permisos.":e.message||"No se confirmó el cierre.");return false;}
  finally{lock.close();lock.remove();busy=false;}
 };
 A.finishAppointment=function(id){
  if(!allowed()||busy)return A.toast("No tienes autorización para cerrar y cobrar citas.");
  const a=A.db.appointments?.find(x=>x.id===id);if(!a||!["Pendiente","Confirmada"].includes(a.status))return A.toast("La cita no admite otro cierre.");
  const s=A.db.services?.find(x=>x.id===a.serviceId),amount=Number(a.price??s?.price);
  if(!Number.isFinite(amount)||amount<0)return A.toast("Precio de cita inválido.");
  A.openFormModal({tag:"COBRO",title:"Finalizar servicio",saveText:"Confirmar cobro",note:"Monto registrado de la cita: "+A.money(amount),fields:[{name:"paymentMethod",label:"Método de pago",type:"select",value:"Efectivo",options:["Efectivo","Pago móvil","Transferencia","Divisa","Tarjeta","Otro"].map(x=>({value:x,label:x}))}],onSave:async()=>{const method=A.readModal("paymentMethod");const sale=await A.commitAppointmentFinalization(id,{method,amount});if(sale)A.closeModal();}});
 };
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
