SaaS.billingOps=SaaS.billingOps||{
  payments:[],
  policy:{graceDays:3}
};

SaaS.loadBillingOps=function(){
  try{
    const s=JSON.parse(localStorage.getItem("sambrix_billing_ops"))||{};
    SaaS.billingOps={
      payments:s.payments||[],
      policy:{...SaaS.billingOps.policy,...(s.policy||{})}
    };
  }catch{}
};

SaaS.saveBillingOps=function(){
  localStorage.setItem("sambrix_billing_ops",JSON.stringify(SaaS.billingOps));
};

SaaS.billingSubscriptionFor=function(businessId){
  return (SaaS.db.subscriptions||[]).find(s=>s.businessId===businessId)||null;
};

SaaS.billingStatusFor=function(businessId){
  const sub=SaaS.billingSubscriptionFor(businessId);
  if(sub?.status==="Suspended"||sub?.status==="Suspendida")return {label:"Suspendida",days:null};
  const last=[...SaaS.billingOps.payments].reverse().find(p=>p.businessId===businessId);
  const dueRaw=last?.nextDue||sub?.nextDue||sub?.renewalDate||sub?.endsAt||"";
  if(!dueRaw)return {label:"Activa",days:null};

  const due=new Date(dueRaw+"T23:59:59");
  const now=new Date();
  const diff=Math.ceil((due-now)/86400000);
  const grace=Number(SaaS.billingOps.policy.graceDays||0);

  if(diff<(-grace))return {label:"Atrasada",days:diff};
  if(diff<=7)return {label:"Vence pronto",days:diff};
  return {label:"Activa",days:diff};
};

SaaS.openBillingPayment=function(){
  const sel=document.getElementById("billingBusiness");
  sel.innerHTML=(SaaS.db.businesses||[]).map(b=>`<option value="${b.id}">${b.name}</option>`).join("");
  const today=new Date().toISOString().slice(0,10);
  const next=new Date(Date.now()+30*86400000).toISOString().slice(0,10);
  document.getElementById("billingPaidAt").value=today;
  document.getElementById("billingNextDue").value=next;
  document.getElementById("billingAmount").value="";
  document.getElementById("billingReference").value="";
  document.getElementById("billingOpsPaymentModal")?.classList.add("open");
};

SaaS.closeBillingPayment=function(){
  document.getElementById("billingOpsPaymentModal")?.classList.remove("open");
};

SaaS.createBillingPayment=function(){
  const businessId=document.getElementById("billingBusiness").value;
  const amount=Number(document.getElementById("billingAmount").value||0);
  if(!businessId)return alert("Selecciona un negocio.");
  if(amount<=0)return alert("Escribe un monto válido.");

  const b=SaaS.db.businesses.find(x=>x.id===businessId);
  const p={
    id:"pay_"+SaaS.uid(),
    businessId,
    businessName:b?.name||businessId,
    amount,
    paidAt:document.getElementById("billingPaidAt").value,
    nextDue:document.getElementById("billingNextDue").value,
    method:document.getElementById("billingMethod").value,
    reference:document.getElementById("billingReference").value.trim(),
    createdAt:new Date().toISOString(),
    createdBy:window.FirebaseBridge?.user?.email||"SuperAdmin"
  };

  SaaS.billingOps.payments.push(p);
  SaaS.saveBillingOps();
  SaaS.audit?.("BILLING","Pago registrado",{business:p.businessName,amount:p.amount,nextDue:p.nextDue},businessId);
  SaaS.closeBillingPayment();
  SaaS.renderBillingOps();
  window.App?.toast?.("Pago registrado");
};

SaaS.saveBillingPolicy=function(){
  SaaS.billingOps.policy.graceDays=Math.max(0,Math.min(30,Number(document.getElementById("billingGraceDays").value||3)));
  SaaS.saveBillingOps();
  SaaS.audit?.("BILLING","Política de cobro actualizada",{graceDays:SaaS.billingOps.policy.graceDays},"");
  SaaS.renderBillingOps();
};

SaaS.toggleBillingSuspension=function(businessId){
  const sub=SaaS.billingSubscriptionFor(businessId);
  if(!sub)return alert("Este negocio no tiene una suscripción registrada.");
  const currently=["Suspended","Suspendida"].includes(sub.status);
  if(!confirm(currently?"¿Reactivar esta suscripción?":"¿Suspender manualmente esta suscripción?"))return;
  sub.status=currently?"Active":"Suspended";
  try{localStorage.setItem("sambrix_saas_db",JSON.stringify(SaaS.db))}catch{}
  SaaS.audit?.("BILLING",currently?"Suscripción reactivada":"Suscripción suspendida",{businessId},businessId);
  SaaS.renderBillingOps();
};

SaaS.renderBillingOps=function(){
  const box=document.getElementById("billingOpsBusinessList");if(!box)return;
  document.getElementById("billingGraceDays").value=SaaS.billingOps.policy.graceDays||3;

  const filter=document.getElementById("billingOpsStatusFilter")?.value||"";
  const rows=(SaaS.db.businesses||[]).map(b=>({b,status:SaaS.billingStatusFor(b.id)})).filter(x=>!filter||x.status.label===filter);

  const all=(SaaS.db.businesses||[]).map(b=>SaaS.billingStatusFor(b.id));
  document.getElementById("billingActiveCount").textContent=all.filter(x=>x.label==="Activa").length;
  document.getElementById("billingDueSoonCount").textContent=all.filter(x=>x.label==="Vence pronto").length;
  document.getElementById("billingPastDueCount").textContent=all.filter(x=>x.label==="Atrasada").length;
  document.getElementById("billingPaymentCount").textContent=SaaS.billingOps.payments.length;

  box.innerHTML=rows.map(({b,status})=>{
    const sub=SaaS.billingSubscriptionFor(b.id);
    const last=[...SaaS.billingOps.payments].reverse().find(p=>p.businessId===b.id);
    const next=last?.nextDue||sub?.nextDue||sub?.renewalDate||sub?.endsAt||"Sin fecha";
    const cls=status.label==="Atrasada"?"overdue":status.label==="Vence pronto"?"soon":status.label==="Suspendida"?"suspended":"";
    return `<div class="row billing-row ${cls}">
      <div style="flex:1">
        <strong>${b.name}</strong>
        <small>${status.label} · Próximo vencimiento: ${next}</small>
        <div class="billing-meta">Plan: ${sub?.planName||sub?.planId||"No definido"}${last?` · Último pago: $${Number(last.amount).toFixed(2)} (${last.paidAt})`:""}</div>
      </div>
      <div class="manage-actions">
        <span class="status ${status.label==="Activa"?"ok":""}">${status.label}</span>
        ${sub?`<button class="btn secondary tiny" onclick="SaaS.toggleBillingSuspension('${b.id}')">${status.label==="Suspendida"?"Reactivar":"Suspender"}</button>`:""}
      </div>
    </div>`;
  }).join("")||'<div class="muted">No hay negocios con este filtro.</div>';

  document.getElementById("billingPaymentList").innerHTML=[...SaaS.billingOps.payments].reverse().slice(0,30).map(p=>`<div class="row billing-row">
    <div><strong>${p.businessName} · $${Number(p.amount).toFixed(2)}</strong><small>${p.paidAt} · ${p.method} · próximo ${p.nextDue||"sin fecha"}</small><div class="billing-meta">${p.reference||"Sin referencia"}</div></div>
  </div>`).join("")||'<div class="muted">Todavía no hay pagos registrados.</div>';

  const overdue=all.filter(x=>x.label==="Atrasada").length;
  const soon=all.filter(x=>x.label==="Vence pronto").length;
  const result=document.getElementById("billingResult");
  if(overdue){
    result.className="launch-result blocked";
    result.innerHTML=`<span class="tag">COBROS PENDIENTES</span><h2>${overdue} suscripción(es) atrasada(s)</h2><p>Revisa el pago y decide manualmente si corresponde suspender el negocio.</p>`;
  }else if(soon){
    result.className="launch-result";
    result.innerHTML=`<span class="tag">RENOVACIONES</span><h2>${soon} suscripción(es) vencen pronto</h2><p>Conviene contactar o verificar el cobro antes de la fecha.</p>`;
  }else{
    result.className="launch-result ready";
    result.innerHTML='<span class="tag">AL DÍA</span><h2>Sin vencimientos urgentes</h2><p>Las suscripciones registradas no presentan atrasos según la información disponible.</p>';
  }
};

const oldRenderAll_190=SaaS.renderAll;
SaaS.renderAll=function(){
  oldRenderAll_190();
  SaaS.renderBillingOps();
};
