SaaS.invoices=SaaS.invoices||[];

SaaS.loadInvoices=function(){
  try{SaaS.invoices=JSON.parse(localStorage.getItem("sambrix_invoices"))||[]}catch{SaaS.invoices=[]}
};

SaaS.saveInvoices=function(){
  localStorage.setItem("sambrix_invoices",JSON.stringify(SaaS.invoices));
};

SaaS.nextInvoiceNumber=function(){
  const n=(SaaS.invoices.length+1).toString().padStart(4,"0");
  return `SAM-${n}`;
};

SaaS.openInvoiceModal=function(){
  const businesses=(SaaS.db.businesses||[]).filter(b=>b.id!==SaaS.portal?._demoBusinessId);
  if(!businesses.length){
    window.App?.toast?.("Primero debes crear un negocio");
    SaaS.closeInvoiceModal?.();
    return;
  }
  const sel=document.getElementById("invoiceBusiness");
  sel.innerHTML=businesses.map(b=>`<option value="${b.id}">${b.name}</option>`).join("");
  const today=new Date().toISOString().slice(0,10);
  const due=new Date(Date.now()+15*86400000).toISOString().slice(0,10);

  document.getElementById("invoiceNumber").value=SaaS.nextInvoiceNumber();
  document.getElementById("invoiceConcept").value="Suscripción SAMBRIX";
  document.getElementById("invoiceSubtotal").value="0";
  document.getElementById("invoiceDiscount").value="0";
  document.getElementById("invoiceIssuedAt").value=today;
  document.getElementById("invoiceDueAt").value=due;
  document.getElementById("invoiceStatus").value="Emitida";
  document.getElementById("invoiceNotes").value="";
  document.getElementById("invoiceCreateModal")?.classList.add("open");
};

SaaS.closeInvoiceModal=function(){
  document.getElementById("invoiceCreateModal")?.classList.remove("open");
};

SaaS.createInvoice=function(){
  const businessId=document.getElementById("invoiceBusiness").value;
  if(!businessId||!(SaaS.db.businesses||[]).some(b=>b.id===businessId&&b.id!==SaaS.portal?._demoBusinessId)){
    SaaS.closeInvoiceModal?.();
    return window.App?.toast?.("Primero debes crear un negocio");
  }
  const number=document.getElementById("invoiceNumber").value.trim().toUpperCase();
  const concept=document.getElementById("invoiceConcept").value.trim();
  const subtotal=Math.max(0,Number(document.getElementById("invoiceSubtotal").value||0));
  const discount=Math.max(0,Number(document.getElementById("invoiceDiscount").value||0));

  if(!businessId)return alert("Selecciona un negocio.");
  if(!number)return alert("Escribe el número de factura.");
  if(SaaS.invoices.some(i=>i.number===number))return alert("Ese número ya existe.");
  if(!concept)return alert("Escribe el concepto.");
  if(discount>subtotal)return alert("El descuento no puede superar el subtotal.");

  const b=SaaS.db.businesses.find(x=>x.id===businessId);
  const inv={
    id:"invoice_"+SaaS.uid(),
    businessId,
    businessName:b?.name||businessId,
    number,
    concept,
    subtotal,
    discount,
    total:Math.max(0,subtotal-discount),
    issuedAt:document.getElementById("invoiceIssuedAt").value,
    dueAt:document.getElementById("invoiceDueAt").value,
    status:document.getElementById("invoiceStatus").value,
    notes:document.getElementById("invoiceNotes").value.trim(),
    createdAt:new Date().toISOString(),
    createdBy:window.FirebaseBridge?.user?.email||"SuperAdmin"
  };

  SaaS.invoices.push(inv);
  SaaS.saveInvoices();
  SaaS.audit?.("BILLING","Factura creada",{number:inv.number,total:inv.total,status:inv.status},businessId);
  SaaS.closeInvoiceModal();
  SaaS.renderInvoices();
  window.App?.toast?.("Factura guardada");
};

SaaS.updateInvoiceStatus=function(id,status){
  const inv=SaaS.invoices.find(x=>x.id===id);if(!inv)return;
  if(status==="Anulada"&&!confirm(`¿Anular ${inv.number}?`))return;
  inv.status=status;
  inv.updatedAt=new Date().toISOString();
  if(status==="Pagada")inv.paidAt=inv.updatedAt;
  if(status==="Anulada")inv.voidAt=inv.updatedAt;
  SaaS.saveInvoices();
  SaaS.audit?.("BILLING","Estado de factura actualizado",{number:inv.number,status},inv.businessId);
  SaaS.renderInvoices();
};

SaaS.exportInvoice=function(id){
  const inv=SaaS.invoices.find(x=>x.id===id);if(!inv)return;
  const payload={
    issuer:"SAMBRIX",
    documentType:"Comprobante comercial interno",
    invoice:inv
  };
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=`SAMBRIX_${inv.number}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
};

SaaS.renderInvoices=function(){
  const box=document.getElementById("invoiceList");if(!box)return;
  const q=(document.getElementById("invoiceSearch")?.value||"").toLowerCase();
  const filter=document.getElementById("invoiceStatusFilter")?.value||"";
  const rows=SaaS.invoices.filter(i=>(!filter||i.status===filter)&&(!q||`${i.number} ${i.businessName} ${i.concept}`.toLowerCase().includes(q)));

  document.getElementById("invoiceIssuedCount").textContent=SaaS.invoices.filter(i=>i.status!=="Borrador").length;
  document.getElementById("invoicePaidCount").textContent=SaaS.invoices.filter(i=>i.status==="Pagada").length;
  document.getElementById("invoiceVoidCount").textContent=SaaS.invoices.filter(i=>i.status==="Anulada").length;
  const pending=SaaS.invoices.filter(i=>i.status==="Emitida").reduce((s,i)=>s+Number(i.total||0),0);
  document.getElementById("invoicePendingAmount").textContent="$"+pending.toFixed(2);

  box.innerHTML=[...rows].reverse().map(i=>{
    const cls=i.status==="Pagada"?"paid":i.status==="Anulada"?"void":i.status==="Borrador"?"draft":"";
    return `<div class="row invoice-row ${cls}">
      <div style="flex:1">
        <strong>${i.number} · ${i.businessName}</strong>
        <small>${i.status} · emitida ${i.issuedAt||"—"} · vence ${i.dueAt||"—"}</small>
        <div class="invoice-meta">${i.concept}${i.notes?` · ${i.notes}`:""}</div>
      </div>
      <div style="text-align:right">
        <div class="invoice-total">$${Number(i.total||0).toFixed(2)}</div>
        <div class="manage-actions">
          <select onchange="SaaS.updateInvoiceStatus('${i.id}',this.value)">
            <option ${i.status==="Borrador"?"selected":""}>Borrador</option>
            <option ${i.status==="Emitida"?"selected":""}>Emitida</option>
            <option ${i.status==="Pagada"?"selected":""}>Pagada</option>
            <option ${i.status==="Anulada"?"selected":""}>Anulada</option>
          </select>
          <button class="btn secondary tiny" onclick="SaaS.exportInvoice('${i.id}')">Exportar</button>
        </div>
      </div>
    </div>`;
  }).join("")||'<div class="muted">No hay facturas con estos filtros.</div>';
};

const oldRenderAll_193=SaaS.renderAll;
SaaS.renderAll=function(){
  oldRenderAll_193();
  SaaS.renderInvoices();
};
