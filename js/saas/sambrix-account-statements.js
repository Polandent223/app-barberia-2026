SaaS.statementFor=function(businessId){
 const invoices=(SaaS.invoices||[]).filter(i=>i.businessId===businessId&&i.status!=="Anulada");
 const payments=(SaaS.billingOps?.payments||[]).filter(p=>p.businessId===businessId);
 const discounts=(SaaS.discounts?.uses||[]).filter(u=>u.businessId===businessId);
 const invoiced=invoices.reduce((s,i)=>s+Number(i.total||0),0);
 const paid=payments.reduce((s,p)=>s+Number(p.amount||0),0);
 const discount=discounts.reduce((s,d)=>s+Number(d.discountAmount||0),0);
 const balance=Math.max(0,invoiced-paid);
 const overdueInvoices=invoices.filter(i=>i.status==="Emitida"&&i.dueAt&&new Date(i.dueAt+"T23:59:59")<new Date());
 return {invoiced,paid,discount,balance,overdue:overdueInvoices.length,invoices:invoices.length,payments:payments.length};
};
SaaS.renderAccountStatements=function(){
 const box=document.getElementById("statementBusinessList");if(!box)return;
 const q=(document.getElementById("statementSearch")?.value||"").toLowerCase();
 const rows=(SaaS.db.businesses||[]).filter(b=>!q||b.name.toLowerCase().includes(q)).map(b=>({b,s:SaaS.statementFor(b.id)}));
 const totals=rows.reduce((a,x)=>({invoiced:a.invoiced+x.s.invoiced,paid:a.paid+x.s.paid,discount:a.discount+x.s.discount,balance:a.balance+x.s.balance}),{invoiced:0,paid:0,discount:0,balance:0});
 document.getElementById("statementInvoicedTotal").textContent="$"+totals.invoiced.toFixed(2);
 document.getElementById("statementPaidTotal").textContent="$"+totals.paid.toFixed(2);
 document.getElementById("statementBalanceTotal").textContent="$"+totals.balance.toFixed(2);
 document.getElementById("statementDiscountTotal").textContent="$"+totals.discount.toFixed(2);
 box.innerHTML=rows.map(({b,s})=>`<div class="row statement-row ${s.overdue?"overdue":s.balance?"due":""}">
   <div style="flex:1"><strong>${b.name}</strong><small>Facturado $${s.invoiced.toFixed(2)} · Pagado $${s.paid.toFixed(2)} · Balance $${s.balance.toFixed(2)}</small>
   <div class="statement-meta">${s.invoices} factura(s) · ${s.payments} pago(s) · descuentos $${s.discount.toFixed(2)} · ${s.overdue} vencida(s)</div></div>
   <span class="status ${!s.balance?"ok":""}">${s.balance?"Pendiente":"Al día"}</span>
 </div>`).join("")||'<div class="muted">No hay negocios.</div>';
 const overdue=rows.filter(x=>x.s.overdue).length;
 const result=document.getElementById("statementResult");
 if(overdue){result.className="launch-result blocked";result.innerHTML=`<span class="tag">CARTERA VENCIDA</span><h2>${overdue} negocio(s) con factura vencida</h2><p>Revisa renovaciones y seguimiento de cobro.</p>`}
 else if(totals.balance){result.className="launch-result";result.innerHTML=`<span class="tag">SALDO PENDIENTE</span><h2>$${totals.balance.toFixed(2)} por cobrar</h2><p>No hay facturas vencidas detectadas, pero existe balance abierto.</p>`}
 else{result.className="launch-result ready";result.innerHTML='<span class="tag">AL DÍA</span><h2>Sin balance pendiente registrado</h2><p>La cartera comercial aparece conciliada con los datos disponibles.</p>'}
};
SaaS.refreshAccountStatements=function(){SaaS.renderAccountStatements();SaaS.audit?.("BILLING","Estados de cuenta revisados",{},"")};
const oldRenderAll_194=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_194();SaaS.renderAccountStatements();};
