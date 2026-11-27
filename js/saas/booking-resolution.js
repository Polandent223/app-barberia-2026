/* Atomic public booking resolution, using cloud state rather than the browser's copy. */
import {auth,firestore} from "../firebase/firebase-core.js";
import {doc,runTransaction,serverTimestamp} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import {available,durationOf} from "./client-booking-core.js?v=2.0.8";
const S=()=>window.SaaS,A=()=>window.App;
const permitted=()=>["owner","admin","manager","reception"].includes(S()?.session?.role)&&!!auth.currentUser&&S()?.pageAllowed?.("bookingInbox");
const tenant=()=>String(S()?.session?.businessId||"");
const stateRef=(id,name)=>doc(firestore,"businesses",id,"state",name);
const publicRef=(id,name,key)=>doc(firestore,"public_businesses",id,name,key);
const toast=s=>A()?.toast?.(s);
const clone=x=>JSON.parse(JSON.stringify(x));
let running=false;
function check(id,actor){if(!permitted()||tenant()!==id||auth.currentUser?.uid!==actor)throw Error("La sesión o empresa cambió.");}
function state(s,id){if(!s.exists()||s.data().businessId!==id||!s.data().payload)throw Error("El módulo operativo no está inicializado o tiene identidad incorrecta.");return clone(s.data().payload);}
function writeState(tx,ref,s,payload,id,actor){tx.update(ref,{businessId:id,payload,updatedAt:serverTimestamp(),updatedBy:auth.currentUser?.email||"",updatedByUid:actor,syncRevision:Number(s.data().syncRevision||0)+1});}
function slotMatches(s,requestId,uid,changeId=""){return s?.exists()&&s.data().bookingRequestId===requestId&&s.data().clientUid===uid&&(!changeId||s.data().changeRequestId===changeId);}
function availability(config,staff,schedule,ignore=""){
  const b=config.business||{},people=Array.isArray(config.barbers)?config.barbers:[];
  return {timezone:b.timezone||"",businessHours:{open:b.open,close:b.close},services:config.services||[],barbers:people.map(p=>({...p,schedule:(staff.employees||[]).find(e=>e.barberId===p.id)?.schedule||p.schedule})),busy:(schedule.appointments||[]).filter(a=>a.id!==ignore)};
}
async function resolve(requestId,kind,approve,reason=""){
  if(running||!permitted())return;const id=tenant(),actor=auth.currentUser.uid,cloud=window.SaaSCloudProduction;
  if(!id||!cloud?.isTenantReady?.(id)){toast("Primero verifica la sincronización del negocio.");return;}
  running=true;const dialog=document.createElement("dialog");dialog.className="cloud-support-dialog";const p=document.createElement("p");p.textContent="Verificando y guardando la solicitud en Firebase…";dialog.append(p);document.body.append(dialog);dialog.addEventListener("cancel",e=>e.preventDefault());dialog.showModal();
  try{
    await cloud.awaitTenantWrites(id);check(id,actor);
    await runTransaction(firestore,async tx=>{
      check(id,actor);
      const changeRef=kind==="change"?publicRef(id,"booking_change_requests",requestId):null;
      const changeSnap=changeRef?await tx.get(changeRef):null;
      if(changeRef&&!changeSnap.exists())throw Error("Solicitud de cambio no encontrada.");
      const change=changeSnap?.data(),rid=change?change.bookingRequestId:requestId;
      if(change&&change.status!=="Pendiente")throw Error("La solicitud ya fue resuelta.");
      const br=publicRef(id,"booking_requests",rid),bs=await tx.get(br);
      if(!bs.exists())throw Error("Reserva no encontrada.");
      const booking=bs.data();
      if(!change&&booking.status!=="Pendiente")throw Error("La reserva ya fue resuelta.");
      if(change&&(booking.status!=="Aprobada"||change.clientUid!==booking.clientUid||change.oldDate!==booking.date||change.oldTime!==booking.time))throw Error("La cita cambió desde la solicitud. Revísala antes de continuar.");
      const oldSlotRef=booking.slotId?publicRef(id,"booking_slots",booking.slotId):null;
      const newSlotRef=change?.newSlotId?publicRef(id,"booking_slots",change.newSlotId):null;
      const scheduleRef=stateRef(id,"schedule"),crmRef=stateRef(id,"crm"),configRef=stateRef(id,"config"),staffRef=stateRef(id,"staff");
      const [oldSlot,newSlot,ss,cs,conf,staffSnap]=await Promise.all([oldSlotRef?tx.get(oldSlotRef):null,newSlotRef?tx.get(newSlotRef):null,tx.get(scheduleRef),tx.get(crmRef),tx.get(configRef),tx.get(staffRef)]);
      check(id,actor);
      const at=new Date().toISOString();
      if(!approve){
        if(change){tx.update(changeRef,{status:"Rechazada",reason,resolvedAt:at});if(newSlotRef&&slotMatches(newSlot,rid,booking.clientUid,requestId))tx.delete(newSlotRef);}
        else{tx.update(br,{status:"Rechazada",reason,resolvedAt:at});if(oldSlotRef&&slotMatches(oldSlot,rid,booking.clientUid))tx.delete(oldSlotRef);}
        return;
      }
      const schedule=state(ss,id),crm=state(cs,id),config=state(conf,id),staff=staffSnap.exists()?state(staffSnap,id):{};
      if(!Array.isArray(schedule.appointments)||!Array.isArray(crm.clients))throw Error("Agenda o directorio inválido.");
      const linked=schedule.appointments.filter(a=>a.publicRequestId===rid);
      if(linked.length>1)throw Error("Hay citas duplicadas asociadas a esta reserva. Contacta a soporte.");
      if(change){
        const appt=linked[0];if(!appt||appt.status==="Finalizada"||appt.status==="Cancelada")throw Error("La cita vinculada no admite cambios.");
        if(change.type==="reschedule"){
          if(!newSlotRef||!slotMatches(newSlot,rid,booking.clientUid,requestId))throw Error("El nuevo horario no está reservado para esta solicitud.");
          if(!available(availability(config,staff,schedule,appt.id),appt.serviceId,appt.barberId,change.newDate,change.newTime))throw Error("El nuevo horario está ocupado o fuera del turno.");
          appt.date=change.newDate;appt.time=change.newTime;
          tx.update(br,{date:appt.date,time:appt.time,slotId:change.newSlotId,status:"Aprobada",resolvedAt:at});
          tx.update(newSlotRef,{status:"Aprobada"});
        }else if(change.type==="cancel"){appt.status="Cancelada";tx.update(br,{status:"Cancelada",resolvedAt:at});}
        else throw Error("Tipo de solicitud inválido.");
        if(oldSlotRef&&slotMatches(oldSlot,rid,booking.clientUid))tx.delete(oldSlotRef);
        writeState(tx,scheduleRef,ss,schedule,id,actor);tx.update(changeRef,{status:"Aprobada",resolvedAt:at});return;
      }
      if(linked.length)throw Error("Ya existe una cita vinculada. Requiere conciliación antes de aprobar.");
      if(!oldSlotRef||!slotMatches(oldSlot,rid,booking.clientUid))throw Error("La reserva no tiene un bloqueo válido. Contacta a soporte.");
      const service=config.services?.find(x=>x.id===booking.serviceId);
      if(!service||!durationOf(service)||!Number.isFinite(Number(service.price))||Number(service.price)<0)throw Error("El servicio no tiene precio o duración válidos.");
      if(!available(availability(config,staff,schedule),booking.serviceId,booking.barberId,booking.date,booking.time))throw Error("El horario ya no está disponible.");
      if(typeof booking.clientUid!=="string"||!booking.clientUid||booking.clientId!=="client_"+booking.clientUid||typeof booking.name!=="string"||booking.name.trim().length<2||typeof booking.phone!=="string"||booking.phone.replace(/\D/g,"").length<7)throw Error("La solicitud no tiene una identidad de cliente válida. Contacta a soporte.");
      let client=crm.clients.find(c=>c.firebaseUid===booking.clientUid);
      const clientId=booking.clientId||"client_"+booking.clientUid;
      const phone=String(booking.phone).replace(/\D/g,"");
      const matches=crm.clients.filter(c=>String(c.phone||"").replace(/\D/g,"")===phone);
      if(matches.some(c=>c.id!==client?.id)||client&&String(client.phone||"").replace(/\D/g,"")!==phone)throw Error("El teléfono corresponde a una ficha existente o en conflicto. Verifica y vincula la cuenta desde Clientes antes de aprobar.");
      if(!client){const same=crm.clients.find(c=>c.id===clientId);if(same)throw Error("Identidad de cliente en conflicto. Contacta a soporte.");client={id:clientId,firebaseUid:booking.clientUid,clientLinkVerified:false,source:"App Cliente",name:booking.name||"Cliente",phone:booking.phone||"",email:"",businessId:id,branchId:booking.branchId||config.meta?.branchId||"",points:0,visits:0,lastVisit:""};crm.clients.push(client);writeState(tx,crmRef,cs,crm,id,actor);}
      const appt={id:"public_"+rid,clientId:client.id,serviceId:booking.serviceId,barberId:booking.barberId,date:booking.date,time:booking.time,status:"Confirmada",note:booking.note||"",duration:durationOf(service),price:Number(service.price),businessId:id,branchId:booking.branchId||config.meta?.branchId||"",source:"SAMBRIX Client",publicRequestId:rid,createdAt:at};
      if(schedule.appointments.some(a=>a.id===appt.id))throw Error("Identificador de cita duplicado.");
      schedule.appointments.push(appt);writeState(tx,scheduleRef,ss,schedule,id,actor);
      tx.update(br,{status:"Aprobada",appointmentId:appt.id,resolvedAt:at});tx.update(oldSlotRef,{status:"Aprobada"});
    });
    if(tenant()!==id||auth.currentUser?.uid!==actor)return;
    toast(approve?"Solicitud aprobada en Firebase.":"Solicitud rechazada en Firebase.");
    try{await cloud.refreshTenant(id);if(tenant()===id)await window.NexoPublicCloud?.publishCurrentAvailability?.();}catch(e){console.warn("[SAMBRIX refresh after booking]",e);toast("La solicitud se guardó. Actualiza la agenda antes de continuar.");}
  }catch(e){console.warn("[SAMBRIX booking resolution]",e);toast(e?.code==="permission-denied"?"Firebase no autorizó la operación. Revisa permisos.":e?.message||"No se pudo resolver la solicitud.");}finally{dialog.close();dialog.remove();running=false;}
}
function boot(){if(!S()||!A())return;
  S().canManageBookingInbox=permitted;
  S().approvePublicBooking=id=>resolve(id,"booking",true);
  S().rejectPublicBooking=id=>{if(!permitted())return;const why=prompt("Motivo del rechazo (opcional)","");if(why!==null)resolve(id,"booking",false,why.slice(0,500));};
  S().approveBookingChange=id=>resolve(id,"change",true);
  S().rejectBookingChange=id=>{if(!permitted())return;const why=prompt("Motivo del rechazo (opcional)","");if(why!==null)resolve(id,"change",false,why.slice(0,500));};
  // Old reconciliation could overwrite a transaction with an outdated local copy.
  S().reconcilePublicBookings=()=>false;
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
