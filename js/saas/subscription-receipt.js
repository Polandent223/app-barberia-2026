import {planName,money,receiptNumber,receiptMessage} from "./subscription-core.js?v=1";
const el=(tag,text="",cls="")=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
const btn=(t,fn)=>{const b=el("button",t,"btn secondary");b.type="button";b.onclick=fn;return b;};
export function receiptCard(p){
 const card=el("article","","subscription-receipt");
 const head=el("header","","subscription-receipt-head"),brand=el("div","","subscription-brand");
 brand.append(el("span","S","subscription-logo"),el("strong","SAMBRIX"));head.append(brand,el("small","COMPROBANTE ADMINISTRATIVO"));card.append(head,el("h2","Pago registrado"),el("strong",money(p.amountCents),"subscription-amount"),el("p",p.businessName,"subscription-company"));
 const grid=el("dl","","subscription-receipt-grid");
 for(const [k,v] of [["Comprobante",receiptNumber(p.id)],["Fecha de pago",p.paidAt],["Plan",planName(p)],["Período",p.months+" mes(es)"],["Método",p.method],["Referencia",p.reference],["Vencimiento anterior",p.previousDue||"Sin fecha"],["Nuevo vencimiento",p.nextDue]]){const item=el("div");item.append(el("dt",k),el("dd",String(v??"")));grid.append(item);}
 card.append(grid,el("small","Identificador completo: "+p.id,"subscription-id"),el("p","Comprobante administrativo. No constituye factura fiscal ni confirma una transferencia bancaria.","subscription-disclaimer"));return card;
}
export function printReceipt(p){
 const frame=document.createElement("iframe");frame.title="Impresión de comprobante SAMBRIX";frame.style.cssText="position:fixed;width:1px;height:1px;bottom:0;right:0;border:0;opacity:0;pointer-events:none";
 document.body.append(frame);
 try{
 const d=frame.contentDocument;d.title="SAMBRIX-"+receiptNumber(p.id);
 const style=d.createElement("style");style.textContent="@page{size:A4;margin:18mm}*{box-sizing:border-box}body{margin:0;font:14px Arial,sans-serif;color:#173047}article{border:1px solid #d4dce2;padding:28px;border-radius:14px;max-width:680px;margin:0 auto}header{display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:2px solid #173047;padding-bottom:16px}header small{letter-spacing:1px;font-size:10px}.subscription-brand{display:flex;align-items:center;gap:9px}.subscription-logo{background:#173047;color:white;font:bold 22px Arial;padding:10px 14px;border-radius:8px;print-color-adjust:exact;-webkit-print-color-adjust:exact}.subscription-amount{font-size:36px;color:#173047}.subscription-company{font-size:20px;font-weight:700}.subscription-receipt-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:26px 0}.subscription-receipt-grid div{border-bottom:1px solid #d4dce2;padding-bottom:10px;break-inside:avoid}dt{font-size:11px;color:#506271}dd{margin:6px 0;font-weight:bold;overflow-wrap:anywhere}.subscription-id,.subscription-disclaimer{font-size:10px;color:#506271;overflow-wrap:anywhere}";d.head.append(style);d.body.append(d.importNode(receiptCard(p),true));
 const win=frame.contentWindow;win.addEventListener("afterprint",()=>frame.remove(),{once:true});win.focus();win.print();
 }catch(e){frame.remove();throw e;}
}
export function receiptActions(p,allowed){
 const actions=el("div","","cloud-actions");actions.append(btn("Imprimir / guardar PDF",()=>{if(allowed())try{printReceipt(p);}catch{window.App?.toast?.("No se pudo abrir la impresión.");}}),btn("Compartir por WhatsApp",()=>{if(allowed())window.open("https://wa.me/?text="+encodeURIComponent(receiptMessage(p)),"_blank","noopener,noreferrer");}));return actions;
}
