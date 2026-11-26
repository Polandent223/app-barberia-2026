/* Shared financial close: browser and emulator use the same transaction. */
const clone=v=>JSON.parse(JSON.stringify(v));
const methods=new Set(["Efectivo","Pago móvil","Transferencia","Divisa","Tarjeta","Otro"]);
const state=(snap,id)=>{
  if(!snap.exists()||snap.data().businessId!==id||!snap.data().payload)throw Error("Módulo empresarial no verificado.");
  return clone(snap.data().payload);
};
export function buildFinancialClose({businessId,appointmentId,method,amount,actor,at,config,schedule,crm,finance}){
  if(!methods.has(method))throw Error("Método de pago inválido.");
  const total=Number(amount);
  if(amount===null||amount===""||!Number.isFinite(total)||total<0||total>9999999||Math.abs(total*100-Math.round(total*100))>1e-7)throw Error("Monto inválido.");
  const a=schedule.appointments?.find(x=>x.id===appointmentId);
  if(!a||a.businessId&&a.businessId!==businessId)throw Error("Cita no encontrada en esta empresa.");
  if(a.status!=="Confirmada"&&a.status!=="Pendiente")throw Error("La cita no admite otro cierre.");
  if(a.finalizedAccountingAt||finance.sales?.some(x=>x.appointmentId===a.id)||finance.cash?.some(x=>x.appointmentId===a.id))throw Error("Ya existe un cierre. Solicita conciliación.");
  if(!Array.isArray(finance.sales)||!Array.isArray(finance.cash)||!Array.isArray(crm.clients))throw Error("Historial operativo inválido.");
  const s=config.services?.find(x=>x.id===a.serviceId),c=crm.clients.find(x=>x.id===a.clientId),p=config.barbers?.find(x=>x.id===a.barberId);
  if(!s||!c||!p)throw Error("La cita tiene referencias incompletas.");
  if([c,s,p].some(x=>x.businessId&&x.businessId!==businessId))throw Error("Identidad empresarial incorrecta.");
  const currency=String(config.business?.currency||"$"),branchId=a.branchId||config.meta?.branchId||"";
  const expected=Number(a.price??s.price);
  if(!Number.isFinite(expected)||expected<0)throw Error("Precio del servicio inválido.");
  // No silent discount: adjustments need their own authorised correction flow.
  if(Math.round(total*100)!==Math.round(expected*100))throw Error("El monto debe coincidir con el precio registrado de la cita.");
  const id="close_"+a.id,cashId="cash_"+a.id;
  if(finance.sales.some(x=>x.id===id)||finance.cash.some(x=>x.id===cashId))throw Error("Identificador financiero duplicado.");
  const max=finance.sales.reduce((n,v)=>Math.max(n,Number(String(v.number||"").replace(/\D/g,""))||0),0);
  if(!Number.isSafeInteger(max)||max>=Number.MAX_SAFE_INTEGER-1)throw Error("Numeración de recibo inválida.");
  const sale={id,number:String(max+1).padStart(6,"0"),date:a.date,time:a.time,clientId:c.id,clientName:c.name||"Cliente",barberId:p.id,barberName:p.name||"Profesional",serviceId:s.id,appointmentId:a.id,publicRequestId:a.publicRequestId||"",businessId,branchId,currency,paymentMethod:method,total,items:[{type:"Servicio",serviceId:s.id,name:s.name||"Servicio",qty:1,unit:total,total}],createdAt:at,createdBy:actor};
  const cash={id:cashId,type:"Ingreso",concept:(s.name||"Servicio")+" - "+(c.name||"Cliente"),amount:total,method,date:a.date,appointmentId:a.id,saleId:id,clientId:c.id,businessId,branchId,currency,createdAt:at,createdBy:actor};
  Object.assign(a,{businessId,branchId,status:"Finalizada",price:total,paymentMethod:method,finalizedAt:at,finalizedAccountingAt:at,finalizedBy:actor});
  const points=Number(config.business?.pointsPerService??10);
  c.lastVisit=a.date;c.points=Number(c.points||0)+(Number.isFinite(points)&&points>=0?points:0);c.visits=Number(c.visits||0)+1;
  finance.sales.push(sale);finance.cash.push(cash);return {sale,cash,appointment:a,client:c};
}
export async function closeAppointment({db,sdk,businessId,appointmentId,method,amount,actor,email="",check=()=>{},at=new Date().toISOString()}){
  const {doc,collection,runTransaction,serverTimestamp}=sdk;
  const ref=name=>doc(db,"businesses",businessId,"state",name);
  const pub=(kind,key)=>doc(db,"public_businesses",businessId,kind,key);
  const names=["config","schedule","crm","finance"],refs=names.map(ref),event=doc(collection(db,"businesses",businessId,"state_events"));
  return runTransaction(db,async tx=>{
    check();const snaps=await Promise.all(refs.map(r=>tx.get(r)));const [config,schedule,crm,finance]=snaps.map(s=>state(s,businessId));
    const result=buildFinancialClose({businessId,appointmentId,method,amount,actor,at,config,schedule,crm,finance});
    let requestRef=null,slotRef=null,slotSnap=null;
    if(result.appointment.publicRequestId){
      requestRef=pub("booking_requests",result.appointment.publicRequestId);const request=await tx.get(requestRef);
      if(!request.exists()||request.data().status!=="Aprobada"||request.data().appointmentId!==appointmentId||request.data().clientUid!==result.client.firebaseUid)throw Error("Reserva pública no conciliada. Contacta a soporte.");
      const b=request.data();if(b.date!==result.appointment.date||b.time!==result.appointment.time||b.barberId!==result.appointment.barberId||!b.slotId)throw Error("La reserva pública no coincide con la agenda.");
      slotRef=pub("booking_slots",b.slotId);slotSnap=await tx.get(slotRef);
      if(!slotSnap.exists()||slotSnap.data().bookingRequestId!==result.appointment.publicRequestId||slotSnap.data().clientUid!==b.clientUid||slotSnap.data().status!=="Aprobada")throw Error("Bloqueo de reserva no conciliado.");
    }
    check();
    for(const [i,payload] of [[1,schedule],[2,crm],[3,finance]]){
      const revision=Number(snaps[i].data().syncRevision||0)+1;
      const patch={businessId,payload,updatedAt:serverTimestamp(),updatedBy:email,updatedByUid:actor,syncRevision:revision};
      if(i===3){patch.auditId=event.id;tx.set(event,{businessId,domain:"finance",revision,actorUid:actor,createdAt:serverTimestamp()});}
      tx.update(refs[i],patch);
    }
    if(requestRef){tx.update(requestRef,{status:"Finalizada",resolvedAt:at});tx.delete(slotRef);}
    return result.sale;
  });
}
