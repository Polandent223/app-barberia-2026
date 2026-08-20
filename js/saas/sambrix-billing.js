SaaS.billingPayments=SaaS.billingPayments||[];

SaaS.loadBilling=function(){
  try{SaaS.billingPayments=JSON.parse(localStorage.getItem("sambrix_billing_payments"))||[]}catch{SaaS.billingPayments=[]}
};
SaaS.saveBilling=function(){localStorage.setItem("sambrix_billing_payments",JSON.stringify(SaaS.billingPayments))};

SaaS.billingState=function(b){
  if(String(b.status||"").toLowerCase()==="suspendido")return "Suspendida";
  if(!b.nextPayment)return "Activa";
  const d=SaaS.daysUntil?.(b.nextPayment);
  if(d===null)return "Activa";
  if(d<0)return "Vencida";
  if(d<=7)return "Por vencer";
  return "Activa";
};

SaaS.refreshBillingStates=function(){
  (SaaS.db.businesses||[]).forEach(b=>{
    const state=SaaS.billingState(b);
    b.billingStatus=state;
    if(state==="Vencida"&&b.status!=="Suspendido")b.status="Vencido";
    if(state==="Activa"&&["Vencido"].includes(b.status))b.status="Activo";
  });
  SaaS.save();SaaS.generateNotifications?.();SaaS.renderBilling();
};

SaaS.renderBilling=function(){
  const box=document.getElementById("billingBusinessList");if(!box)return;
  const q=(document.getElementById("billingSearch")?.value||"").toLowerCase().trim();
  const filter=document.getElementById("billingStatusFilter")?.value||"";
  const bs=(SaaS.db.businesses||[]).filter(b=>(!q||`${b.name} ${b.owner||""}`.toLowerCase().includes(q))&&(!filter||SaaS.billingState(b)===filter));

  const all=SaaS.db.businesses||[];
  const active=all.filter(b=>SaaS.billingState(b)==="Activa");
  const due=all.filter(b=>SaaS.billingState(b)==="Por vencer");
  const overdue=all.filter(b=>SaaS.billingState(b)==="Vencida");
  const mrr=all.filter(b=>["Activa","Por vencer"].includes(SaaS.billingState(b))).reduce((sum,b)=>sum+Number(SaaS.getPlan(b.planId)?.price||0),0);

  document.getElementById("billingMRR").textContent=SaaS.money?.(mrr)||("$"+mrr.toFixed(2));
  document.getElementById("billingActive").textContent=active.length;
  document.getElementById("billingDueSoon").textContent=due.length;
  document.getElementById("billingOverdue").textContent=overdue.length;

  box.innerHTML=bs.map(b=>{
    const state=SaaS.billingState(b),plan=SaaS.getPlan(b.planId), cls=state==="Por vencer"?"due":state==="Vencida"?"overdue":state==="Suspendida"?"suspended":"";
    return `<div class="row billing-row ${cls}">
      <div><strong>${b.name}</strong><small>${b.owner||"Sin dueño"} · ${plan?.name||"Sin plan"} · Próximo pago: ${b.nextPayment||"—"}</small></div>
      <div class="billing-actions">
        <span class="billing-money">${SaaS.money?.(Number(plan?.price||0))||("$"+Number(plan?.price||0).toFixed(2))}</span>
        <span class="billing-status ${cls}">${state}</span>
        <button class="btn primary tiny" onclick="SaaS.openBillingPayment('${b.id}')">Registrar pago</button>
        ${state==="Suspendida"?`<button class="btn secondary tiny" onclick="SaaS.reactivateBilling('${b.id}')">Reactivar</button>`:`<button class="btn secondary tiny" onclick="SaaS.suspendBilling('${b.id}')">Suspender</button>`}
      </div>
    </div>`;
  }).join("")||'<div class="muted">No hay negocios con este filtro.</div>';

  const payments=document.getElementById("billingPaymentsList");
  if(payments){
    payments.innerHTML=[...SaaS.billingPayments].reverse().slice(0,20).map(p=>`<div class="row"><div><strong>${p.businessName}</strong><small>${p.method} · ${p.reference||"Sin referencia"} · ${new Date(p.createdAt).toLocaleString()}</small></div><strong>${SaaS.money?.(p.amount)||("$"+Number(p.amount).toFixed(2))}</strong></div>`).join("")||'<div class="muted">Todavía no hay pagos registrados.</div>';
  }
};

SaaS.openBillingPayment=function(id){
  const b=SaaS.db.businesses.find(x=>x.id===id);if(!b)return;
  const p=SaaS.getPlan(b.planId);
  document.getElementById("billingPaymentBusinessId").value=id;
  document.getElementById("billingPaymentBusinessName").value=b.name;
  document.getElementById("billingPaymentAmount").value=Number(p?.price||0).toFixed(2);
  document.getElementById("billingPaymentReference").value="";
  document.getElementById("billingPaymentNote").value="";
  document.getElementById("billingPaymentModal")?.classList.add("open");
};
SaaS.closeBillingPayment=function(){document.getElementById("billingPaymentModal")?.classList.remove("open")};

SaaS.registerBillingPayment=function(){
  const id=document.getElementById("billingPaymentBusinessId").value;
  const b=SaaS.db.businesses.find(x=>x.id===id);if(!b)return;
  const amount=Number(document.getElementById("billingPaymentAmount").value||0);
  if(amount<=0)return alert("Escribe un monto válido.");

  const from=b.nextPayment&&new Date(b.nextPayment)>new Date()?new Date(b.nextPayment):new Date();
  from.setMonth(from.getMonth()+1);
  b.nextPayment=from.toISOString().slice(0,10);
  b.status="Activo";b.billingStatus="Activa";

  const payment={
    id:"pay_"+SaaS.uid(),businessId:b.id,businessName:b.name,amount,
    method:document.getElementById("billingPaymentMethod").value,
    reference:document.getElementById("billingPaymentReference").value.trim(),
    note:document.getElementById("billingPaymentNote").value.trim(),
    createdAt:new Date().toISOString(),
    nextPayment:b.nextPayment
  };
  SaaS.billingPayments.push(payment);SaaS.saveBilling();SaaS.save();
  SaaS.audit?.("BILLING","Pago de suscripción registrado",{amount,method:payment.method,nextPayment:b.nextPayment},b.id);
  SaaS.closeBillingPayment();SaaS.renderAll();window.App?.toast?.("Pago registrado y cuenta renovada");
};

SaaS.suspendBilling=function(id){
  const b=SaaS.db.businesses.find(x=>x.id===id);if(!b)return;
  if(!confirm(`¿Suspender el acceso de ${b.name}? Sus datos no serán eliminados.`))return;
  b.status="Suspendido";b.billingStatus="Suspendida";SaaS.save();
  SaaS.audit?.("BILLING","Negocio suspendido",{reason:"billing"},id);SaaS.renderAll();
};
SaaS.reactivateBilling=function(id){
  const b=SaaS.db.businesses.find(x=>x.id===id);if(!b)return;
  b.status="Activo";b.billingStatus=SaaS.billingState({...b,status:"Activo"});SaaS.save();
  SaaS.audit?.("BILLING","Negocio reactivado",{},id);SaaS.renderAll();
};

const oldRenderAll_147=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_147();SaaS.renderBilling()};
