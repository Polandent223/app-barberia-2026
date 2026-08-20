App.normalizePhone=function(phone){return (phone||"").replace(/\D/g,"")};
App.validPhone=function(phone){const p=App.normalizePhone(phone);return p.length>=7&&p.length<=15};
App.hasDuplicateClient=function(phone,ignoreId=""){const p=App.normalizePhone(phone);return !!p&&App.db.clients.some(c=>c.id!==ignoreId&&App.normalizePhone(c.phone)===p)};
App.appointmentConflict=function(candidate,ignoreId=""){
  const service=App.db.services.find(s=>s.id===candidate.serviceId);
  const dur=Number(service?.duration||40);
  const start=App.parseTime(candidate.time);
  return App.db.appointments.some(a=>{
    if(a.id===ignoreId||a.barberId!==candidate.barberId||a.date!==candidate.date||a.status==="Cancelada")return false;
    const s=App.db.services.find(x=>x.id===a.serviceId);
    const aStart=App.parseTime(a.time),aDur=Number(s?.duration||40);
    return start<aStart+aDur && start+dur>aStart;
  });
};
