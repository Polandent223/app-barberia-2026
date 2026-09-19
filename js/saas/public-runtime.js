
(async function(){
  const params=new URLSearchParams(location.search);
  const businessId=params.get("business");
  const clientMode=params.get("cliente");
  if(!businessId||clientMode!=="app")return;

  try{
    // hide admin login/app immediately
    document.getElementById("loginView")?.classList.add("hidden");
    document.getElementById("adminApp")?.classList.add("hidden");

    let tries=0;
    while((!window.NexoPublicCloud||!window.SambrixClientCloud)&&tries++<60)await new Promise(r=>setTimeout(r,100));
    if(!window.NexoPublicCloud)throw new Error("Servicio público no disponible");
    if(!window.SambrixClientCloud)throw new Error("Servicio de cuenta del cliente no disponible");

    const p=await NexoPublicCloud.loadPublicBusiness(businessId);
    if(!p||!["Activo","Prueba"].includes(p.status)){
      document.body.innerHTML='<main style="max-width:600px;margin:80px auto;font-family:Arial;padding:20px;text-align:center"><h2>Reservas temporalmente no disponibles</h2><p>Contacta directamente con el negocio.</p></main>';
      return;
    }

    const A=window.App;
    A.db.business=A.db.business||{};
    A.db.business.name=p.name;
    A.db.business.open=p.businessHours?.open||"09:00";
    A.db.business.close=p.businessHours?.close||"19:00";
    const applyPublicState=next=>{
      if(!next||!["Activo","Prueba"].includes(next.status))return false;
      A.db.business.name=next.name||A.db.business.name;
      A.db.business.open=next.businessHours?.open||"09:00";
      A.db.business.close=next.businessHours?.close||"19:00";
      A.db.business.clientApp={...(A.db.business.clientApp||{}),...(next.branding||{})};
      A.db.services=next.services||[];
      A.db.barbers=next.barbers||[];
      A.db.products=(next.products||[]).map(x=>({...x,stock:x.available?1:0}));
      A.db.appointments=(next.busy||[]).map((x,i)=>({...x,id:"busy-"+i+"-"+String(x.barberId||"")+"-"+String(x.date||"")+"-"+String(x.time||""),clientId:"public-busy"}));
      return true;
    };
    applyPublicState(p);
    const applyAvailability=next=>{
      if(!next)return false;
      A.db.business.open=next.businessHours?.open||A.db.business.open||"09:00";
      A.db.business.close=next.businessHours?.close||A.db.business.close||"19:00";
      if(Array.isArray(next.barbers))A.db.barbers=next.barbers;
      if(Array.isArray(next.busy))A.db.appointments=next.busy.map((x,i)=>({...x,id:x.id||("busy-live-"+i+"-"+String(x.barberId||"")+"-"+String(x.date||"")+"-"+String(x.time||"")),clientId:"public-busy"}));
      return true;
    };
    let availabilityUnsub=null;
    if(window.NexoPublicCloud.watchPublicAvailability){
      availabilityUnsub=window.NexoPublicCloud.watchPublicAvailability(businessId,next=>{
        if(!next)return;
        applyAvailability(next);
        A.renderClientBooking?.();
      });
    }

    A.submitClientReservation=async function(){
      const s=A.db.services.find(x=>x.id===A.clientSelection.serviceId),date=A.val("clientBookDate"),time=A.clientSelection.time,name=A.val("clientBookName"),phone=A.val("clientBookPhone");
      if(!s||!date||!time||!name||!phone)return A.toast("Completa servicio, horario y tus datos");
      let barberId=A.clientSelection.barberId;
      if(!barberId){
        const list=A.availableBarbers(date,time,s.duration);
        if(!list.length)return A.toast("Horario no disponible");
        barberId=list[0].id;
      }
      try{
        if(!window.SambrixClientCloud?.isReady?.())throw new Error("La cuenta del cliente todavía está cargando");
        if(!window.SambrixClientCloud?.currentUser?.())throw new Error("Debes iniciar sesión para reservar");
        await window.SambrixClientCloud.createBooking({serviceId:s.id,barberId,date,time,note:A.val("clientBookNote")||"",branchId:p.branch?.id||""});
        A.toast("Solicitud de reserva enviada");
        A.clientSelection={serviceId:"",barberId:"",time:""};
        A.renderClientBooking();
      }catch(e){A.toast(e?.message||"No se pudo enviar la reserva")}
    };

    A.openClientApp();
    window.NexoPublicCloud.watchPublicBusiness?.(businessId,next=>{
      if(!next||!["Activo","Prueba"].includes(next.status)){
        try{availabilityUnsub?.()}catch{}
        document.body.innerHTML='<main style="max-width:600px;margin:80px auto;font-family:Arial;padding:20px;text-align:center"><h2>Reservas temporalmente no disponibles</h2><p>Contacta directamente con el negocio.</p></main>';
        return;
      }
      applyPublicState(next);
      A.renderClientBooking?.();
    });
    const foot=document.getElementById("nexoPoweredBy");if(foot)foot.classList.toggle("white-label-hidden",p.whiteLabel?.showPoweredBy===false);
  }catch(e){
    console.error("[Public Client]",e);
  }
})();
