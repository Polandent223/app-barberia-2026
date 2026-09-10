/* SAMBRIX 1.0 — cierre financiero idempotente de citas */
(function(){
  const A=window.App, S=window.SaaS;
  if(!A)return;
  const finalizing=new Set();

  A.nextReceiptNumber=function(){
    const max=(A.db.sales||[]).reduce((m,s)=>{
      const n=parseInt(String(s.number||'').replace(/\D/g,''),10);
      return Number.isFinite(n)?Math.max(m,n):m;
    },0);
    return String(max+1).padStart(6,'0');
  };

  A.commitAppointmentFinalization=function(id,{method='Efectivo',amount=null}={}){
    if(finalizing.has(id))return false;
    const a=(A.db.appointments||[]).find(x=>x.id===id);if(!a)return false;
    if(a.status==='Cancelada'){A.toast('Una cita cancelada no puede finalizarse');return false}

    const businessId=S?.getContext?.()?.businessId||A.db?.meta?.businessId||'';
    const appointmentBusinessId=String(a.businessId||businessId||'');
    if(businessId&&appointmentBusinessId&&appointmentBusinessId!==businessId){
      A.toast('La cita no pertenece al negocio activo');
      console.error('[SAMBRIX] Cierre financiero bloqueado por identidad de negocio',{appointmentId:id,businessId,appointmentBusinessId});
      return false;
    }

    finalizing.add(id);
    try{
      const s=(A.db.services||[]).find(x=>x.id===a.serviceId);
      const c=(A.db.clients||[]).find(x=>x.id===a.clientId);
      const branchId=a.branchId||S?.getContext?.()?.branchId||A.db?.meta?.branchId||'';
      const total=Number(amount==null?(a.price??s?.price??0):amount);
      if(!Number.isFinite(total)||total<0){A.toast('Monto inválido');return false}

      const existingSale=(A.db.sales||[]).find(x=>x.appointmentId===a.id);
      const existingCash=(A.db.cash||[]).find(x=>x.appointmentId===a.id&&x.type==='Ingreso');
      const firstFinalize=!a.finalizedAccountingAt;

      a.businessId=businessId||appointmentBusinessId;
      a.branchId=branchId;
      a.status='Finalizada';
      a.price=total;
      a.paymentMethod=method;
      a.finalizedAt=a.finalizedAt||new Date().toISOString();
      a.finalizedAccountingAt=a.finalizedAccountingAt||new Date().toISOString();

      if(c&&firstFinalize){
        c.lastVisit=a.date;
        c.points=Number(c.points||0)+Number(A.db.business.pointsPerService||10);
        c.visits=Number(c.visits||0)+1;
      }

      let sale=existingSale;
      if(!sale){
        sale={
          id:A.uid(),number:A.nextReceiptNumber(),date:a.date,time:a.time,
          clientId:a.clientId,clientName:A.clientName(a.clientId),
          barberId:a.barberId,barberName:A.barberName(a.barberId),
          serviceId:a.serviceId,appointmentId:a.id,publicRequestId:a.publicRequestId||'',
          businessId:a.businessId,branchId,currency:A.db.business.currency,paymentMethod:method,total,
          items:[{type:'Servicio',serviceId:a.serviceId,name:s?.name||'Servicio',qty:1,unit:total,total}],
          createdAt:new Date().toISOString()
        };
        A.db.sales=A.db.sales||[];A.db.sales.push(sale);
      }else{
        if(sale.businessId&&a.businessId&&sale.businessId!==a.businessId){
          A.toast('Se detectó un recibo vinculado a otro negocio');
          throw new Error('Bloqueado recibo cruzado entre negocios');
        }
        sale.paymentMethod=method;sale.total=total;sale.businessId=a.businessId;sale.branchId=branchId;
        sale.clientId=sale.clientId||a.clientId;sale.barberId=sale.barberId||a.barberId;sale.serviceId=sale.serviceId||a.serviceId;
        sale.appointmentId=a.id;
        if(sale.items?.[0]){sale.items[0].unit=total;sale.items[0].total=total;sale.items[0].type=sale.items[0].type||'Servicio'}
      }

      if(!existingCash){
        A.db.cash=A.db.cash||[];A.db.cash.push({
          id:A.uid(),type:'Ingreso',concept:`${s?.name||'Servicio'} - ${A.clientName(a.clientId)}`,
          amount:total,method,date:a.date,appointmentId:a.id,saleId:sale.id,
          clientId:a.clientId,businessId:a.businessId,branchId,currency:A.db.business.currency,createdAt:new Date().toISOString()
        });
      }else{
        if(existingCash.businessId&&a.businessId&&existingCash.businessId!==a.businessId){
          A.toast('Se detectó un movimiento de caja vinculado a otro negocio');
          throw new Error('Bloqueado movimiento de caja cruzado entre negocios');
        }
        existingCash.amount=total;existingCash.method=method;existingCash.saleId=sale.id;
        existingCash.businessId=a.businessId;existingCash.branchId=branchId;
      }

      A.logAction?.('Cita finalizada','Citas',`${A.clientName(a.clientId)} · ${a.date} ${a.time} · ${method} · ${A.money(total)}`);
      A.persist();

      if(a.publicRequestId&&businessId){
        window.NexoPublicCloud?.updateBookingRequest?.(businessId,a.publicRequestId,{status:'Finalizada',resolvedAt:new Date().toISOString()}).catch(console.error);
      }
      if(c?.firebaseUid&&businessId){
        window.NexoPublicCloud?.updateClientAccount?.(businessId,c.firebaseUid,{points:Number(c.points||0),visits:Number(c.visits||0),lastVisit:c.lastVisit||''}).catch(console.error);
      }
      return sale;
    }finally{
      finalizing.delete(id);
    }
  };

  A.finishAppointment=function(id){
    const a=(A.db.appointments||[]).find(x=>x.id===id);if(!a)return;
    if(a.status==='Finalizada')return A.toast('Esta cita ya fue finalizada');
    if(a.status==='Cancelada')return A.toast('Una cita cancelada no puede finalizarse');
    const s=(A.db.services||[]).find(x=>x.id===a.serviceId);
    const defaultAmount=Number(a.price??s?.price??0);
    if(typeof A.openFormModal!=='function')return A.commitAppointmentFinalization(id,{method:'Efectivo',amount:defaultAmount});
    A.openFormModal({
      tag:'COBRO',title:'Finalizar servicio',saveText:'Finalizar y cobrar',
      note:`${A.clientName(a.clientId)} · ${s?.name||'Servicio'} · ${a.date} ${a.time}`,
      fields:[
        {name:'paymentMethod',label:'Método de pago',type:'select',value:a.paymentMethod||'Efectivo',options:['Efectivo','Pago móvil','Transferencia','Divisa','Tarjeta','Otro'].map(x=>({value:x,label:x}))},
        {name:'amount',label:'Total cobrado',type:'number',step:'0.01',value:defaultAmount}
      ],
      onSave:()=>{
        const amount=Number(A.readModal('amount'));
        if(!Number.isFinite(amount)||amount<0)return A.toast('Escribe un monto válido');
        const method=A.readModal('paymentMethod')||'Efectivo';
        const sale=A.commitAppointmentFinalization(id,{method,amount});
        if(sale){A.closeModal();A.toast(`Servicio finalizado · Recibo #${sale.number}`)}
      }
    });
  };

  A.repairFinancialLinks=function(){
    const businessId=S?.getContext?.()?.businessId||A.db?.meta?.businessId||'';
    const branchId=S?.getContext?.()?.branchId||A.db?.meta?.branchId||'';
    (A.db.sales||[]).forEach(s=>{if(!s.businessId)s.businessId=businessId;if(!s.branchId)s.branchId=branchId;s.paymentMethod=s.paymentMethod||'No especificado'});
    (A.db.cash||[]).forEach(c=>{if(!c.businessId)c.businessId=businessId;if(!c.branchId)c.branchId=branchId});
  };

  const oldRenderAll=A.renderAll;
  if(oldRenderAll&&!A.__financialRenderHook){
    A.renderAll=function(){A.repairFinancialLinks();return oldRenderAll.apply(A,arguments)};
    A.__financialRenderHook=true;
  }
  A.repairFinancialLinks();
})();
