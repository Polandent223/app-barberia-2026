
SaaS.PLAN_FEATURES={
  "plan-basic":["inicio","citas","clientes","barberos","servicios","reservas","clienteConfig"],
  "plan-pro":["inicio","citas","clientes","barberos","servicios","reservas","clienteConfig","caja","inventario","recibos","personal","asistencia","horariosPersonal","rendimientoPersonal","historialPersonal","ausenciasPersonal","nominaPersonal","reportes"],
  "plan-premium":["*"]
};

SaaS.featureAllowed=function(page,business=SaaS.currentBusiness()){
  if(!business)return false;
  if(SaaSAuthAdmin?.isSuperAdmin?.())return true;
  const features=SaaS.PLAN_FEATURES[business.planId]||[];
  return features.includes("*")||features.includes(page);
};

SaaS.daysUntil=function(date){
  if(!date)return null;
  return Math.ceil((new Date(date+"T23:59:59")-new Date())/86400000);
};

SaaS.subscriptionLabel=function(b){
  if(b.status==="Prueba")return "Prueba";
  if(b.status==="Suspendido")return "Suspendido";
  const days=SaaS.daysUntil(b.nextPayment);
  if(days!==null&&days<0)return "Vencido";
  return b.status||"Activo";
};

SaaS.renderSubscriptions=function(){
  const box=document.getElementById("subscriptionList");if(!box)return;
  const active=SaaS.db.businesses.filter(b=>b.status==="Activo");
  const mrr=active.reduce((s,b)=>s+Number(SaaS.getPlan(b.planId)?.price||0),0);
  document.getElementById("subMRR").textContent=`$${mrr.toFixed(2)}`;
  document.getElementById("subDueSoon").textContent=SaaS.db.businesses.filter(b=>{const d=SaaS.daysUntil(b.nextPayment);return d!==null&&d>=0&&d<=7}).length;
  document.getElementById("subExpired").textContent=SaaS.db.businesses.filter(b=>SaaS.subscriptionLabel(b)==="Vencido"||b.status==="Suspendido").length;
  document.getElementById("subTrials").textContent=SaaS.db.businesses.filter(b=>b.status==="Prueba").length;

  box.innerHTML=SaaS.db.businesses.map(b=>{
    const p=SaaS.getPlan(b.planId),label=SaaS.subscriptionLabel(b),days=SaaS.daysUntil(b.nextPayment);
    return `<div class="row subscription-row ${label==="Vencido"||label==="Suspendido"?"expired":label==="Prueba"?"trial":""}">
      <div><strong>${b.name}</strong><small>${p?.name||"Plan"} · ${label} · ${b.nextPayment||"Sin fecha"}${days!==null?` · ${days>=0?days+" días":"vencido hace "+Math.abs(days)+" días"}`:""}</small></div>
      <div class="manage-actions"><button class="btn secondary" onclick="SaaS.renewBusiness('${b.id}',1)">+1 mes</button><button class="btn secondary" onclick="SaaS.renewBusiness('${b.id}',3)">+3 meses</button><button class="btn danger" onclick="SaaS.suspendBusiness('${b.id}')">${b.status==="Suspendido"?"Reactivar":"Suspender"}</button></div>
    </div>`;
  }).join("");
};

SaaS.renewBusiness=function(id,months=1){
  const b=SaaS.db.businesses.find(x=>x.id===id);if(!b)return;
  const base=b.nextPayment&&new Date(b.nextPayment+"T12:00:00")>new Date()?new Date(b.nextPayment+"T12:00:00"):new Date();
  base.setMonth(base.getMonth()+months);
  b.nextPayment=base.toISOString().slice(0,10);b.status="Activo";
  b.paymentHistory=b.paymentHistory||[];
  b.paymentHistory.push({id:SaaS.uid(),months,at:new Date().toISOString(),planId:b.planId,amount:Number(SaaS.getPlan(b.planId)?.price||0)*months});
  SaaS.save();SaaS.renderAll();window.App?.toast?.(`Suscripción renovada ${months} mes(es)`);
};
SaaS.suspendBusiness=function(id){
  const b=SaaS.db.businesses.find(x=>x.id===id);if(!b)return;
  b.status=b.status==="Suspendido"?"Activo":"Suspendido";SaaS.save();SaaS.renderAll();
};

SaaS.installPlanGuard=function(){
  const A=window.App;if(!A||A.__planGuard)return;
  const old=A.go.bind(A);
  A.go=function(page){
    if(!SaaS.featureAllowed(page)){A.toast("Esta función no está incluida en el plan actual");return}
    return old(page);
  };
  A.__planGuard=true;
};
