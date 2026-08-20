
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
    while(!window.NexoPublicCloud&&tries++<40)await new Promise(r=>setTimeout(r,100));
    if(!window.NexoPublicCloud)throw new Error("Servicio público no disponible");

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
    A.db.business.clientApp={...(A.db.business.clientApp||{}),...(p.branding||{})};
    A.db.services=p.services||[];
    A.db.barbers=p.barbers||[];
    A.db.products=(p.products||[]).map(x=>({...x,stock:x.available?1:0}));
    A.db.appointments=(p.busy||[]).map(x=>({...x,id:"busy-"+Math.random().toString(36).slice(2),clientId:"public-busy"}));

    const oldSubmit=A.submitClientReservation;
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
        await NexoPublicCloud.createPublicBooking(businessId,{name,phone,serviceId:s.id,barberId,date,time,note:A.val("clientBookNote")||"",branchId:p.branch?.id||""});
        A.toast("Solicitud de reserva enviada");
        A.clientSelection={serviceId:"",barberId:"",time:""};
        A.renderClientBooking();
      }catch(e){A.toast("No se pudo enviar la reserva")}
    };

    A.openClientApp();
    const foot=document.getElementById("nexoPoweredBy");if(foot)foot.classList.toggle("white-label-hidden",p.whiteLabel?.showPoweredBy===false);
  }catch(e){
    console.error("[Public Client]",e);
  }
})();
