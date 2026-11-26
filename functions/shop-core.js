import {buildCorrection} from "./financial-corrections-core.js";
/* POS sale: same shared transaction in browser and emulator. Limited to 3 distinct products per receipt until ledger migration. */
export const MAX_LINES=3;
export const METHODS=["Efectivo","Pago móvil","Transferencia","Divisa","Tarjeta","Otro"];
const copy=v=>JSON.parse(JSON.stringify(v));
const cents=v=>{const n=Number(v),c=Math.round(n*100);if(v==null||v===""||!Number.isFinite(n)||n<0||c>999999900||Math.abs(n*100-c)>1e-6)throw Error("Precio inválido.");return c;};
export function buildShopSale({inventory,finance,config,businessId,actor,operationId,orderId="",items=[],method,date,time}){
 if(!METHODS.includes(method)||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(time))throw Error("Datos de cobro inválidos.");
 inventory={...inventory,shopOrders:inventory.shopOrders??[]};
 if(!Array.isArray(inventory.products)||!Array.isArray(inventory.stockMoves)||!Array.isArray(inventory.shopOrders)||!Array.isArray(finance.sales)||!Array.isArray(finance.cash))throw Error("Módulos inválidos.");
 const orderIndex=orderId?inventory.shopOrders.findIndex(o=>o.id===orderId):-1,order=inventory.shopOrders[orderIndex];
 if(orderId&&(!order||!["Pendiente","Reservado"].includes(order.status)||order.businessId&&order.businessId!==businessId||order.saleId))throw Error("Pedido no disponible para cobro.");
 if(orderId)items=order.items;
 if(!Array.isArray(items)||!items.length||items.length>MAX_LINES)throw Error("Máximo tres productos diferentes por comprobante.");
 const ids=new Set(),products=copy(inventory.products),stockMoves=[...inventory.stockMoves],shopOrders=copy(inventory.shopOrders),lines=[],saleItems=[];
 let totalCents=0;
 const saleId="shop_"+operationId,cashId="shopcash_"+operationId;
 if(finance.sales.some(x=>x.id===saleId||(orderId&&x.orderId===orderId)))throw Error("Venta duplicada.");
 for(const item of items){
  const productId=String(item.id||""),qty=Number(item.qty),index=products.findIndex(p=>p.id===productId),p=products[index];
  if(!productId||ids.has(productId)||inventory.products.filter(x=>x.id===productId).length!==1||!p||p.archived===true||p.businessId&&p.businessId!==businessId||!Number.isSafeInteger(qty)||qty<=0||!Number.isSafeInteger(p.stock)||qty>p.stock)throw Error("Producto, cantidad o stock inválido.");
  ids.add(productId);const unitCents=cents(p.price);if(unitCents<=0)throw Error("Precio de venta inválido.");
  if(item.price!=null&&cents(item.price)!==unitCents)throw Error("El precio cambió. Revisa el pedido antes de cobrar.");
  const lineCents=unitCents*qty;if(!Number.isSafeInteger(lineCents)||lineCents>999999900)throw Error("Importe fuera de rango.");
  const movement={id:"shopstock_"+operationId+"_"+lines.length,productId,type:"Salida",qty,reason:"Venta de productos",date,businessId,branchId:String(p.branchId||""),createdBy:actor,stockBefore:p.stock,stockAfter:p.stock-qty,operationId,productName:String(p.name||"Producto")};
  const saleItem={name:String(p.name||"Producto"),qty,unit:unitCents/100,total:lineCents/100,type:"Producto",refId:productId};
  lines.push({index,productId,qty,unitCents,lineCents,movement,item:saleItem});saleItems.push(saleItem);stockMoves.push(movement);p.stock-=qty;totalCents+=lineCents;
 }
 if(totalCents<=0||totalCents>999999900)throw Error("Total fuera de rango.");
 if(order&&cents(order.total)!==totalCents)throw Error("El total del pedido no coincide con los precios vigentes.");
 const currency=String(config.business?.currency||"$");if(order&&order.currency!==currency)throw Error("Moneda del pedido incompatible.");
 const max=finance.sales.reduce((n,s)=>Math.max(n,Number(String(s.number||"").replace(/\D/g,""))||0),0);
 if(!Number.isSafeInteger(max)||max>=Number.MAX_SAFE_INTEGER-1)throw Error("Numeración inválida.");
 const sale={id:saleId,number:String(max+1).padStart(6,"0"),date,time,clientName:order?String(order.phone||"Cliente tienda"):"Venta mostrador",barberName:"Venta tienda",currency,total:totalCents/100,items:saleItems,source:"Punto de venta",orderId,businessId,branchId:String(config.meta?.branchId||""),paymentMethod:method,createdBy:actor,shopOperationId:operationId};
 const cash={id:cashId,type:"Ingreso",concept:"Venta de productos #"+sale.number,amount:sale.total,method,date,currency,saleId,orderId,businessId,branchId:sale.branchId,createdBy:actor,shopOperationId:operationId};
 if(order)shopOrders[orderIndex]={...order,status:"Pagado/Entregado",saleId,paymentMethod:method,paidAt:date+"T"+time,deliveredAt:date+"T"+time};
 return {inventory:{...inventory,products,stockMoves,shopOrders},finance:{...finance,sales:[...finance.sales,sale],cash:[...finance.cash,cash]},record:{businessId,actorUid:actor,kind:"SALE",orderId,orderIndex,lines,totalCents,sale,cash,date,time,method}};
}
export async function checkoutShop({db,sdk,businessId,actor,email="",authorize,operationId,intentHash,clock,...args}){
 const {doc,collection,runTransaction,serverTimestamp}=sdk;
 const ref=name=>doc(db,"businesses",businessId,"state",name),refs=["inventory","finance","config"].map(ref);
 const op=doc(db,"businesses",businessId,"shop_operations",operationId),events=["inventory","finance"].map(()=>doc(collection(db,"businesses",businessId,"state_events")));
 return runTransaction(db,async tx=>{
  await authorize(tx,"SALE");const prior=await tx.get(op);if(prior.exists()){const v=prior.data();if(v.kind==="SALE"&&v.actorUid===actor&&v.intentHash===intentHash)return v.sale;throw Error("Identificador de operación en conflicto.");}
  const snaps=await Promise.all(refs.map(r=>tx.get(r)));if(snaps.some(s=>!s.exists()||s.data().businessId!==businessId))throw Error("Módulo empresarial no verificado.");
  const result=buildShopSale({...args,...clock(snaps[2].data().payload.business),businessId,actor,operationId:op.id,inventory:snaps[0].data().payload,finance:snaps[1].data().payload,config:snaps[2].data().payload});
  const rev=snaps.slice(0,2).map(s=>Number(s.data().syncRevision||0)+1);
  tx.set(op,{...result.record,intentHash,inventoryRevision:rev[0],financeRevision:rev[1],createdAt:serverTimestamp()});
  for(const [i,domain] of ["inventory","finance"].entries()){
   tx.set(events[i],{businessId,domain,revision:rev[i],actorUid:actor,createdAt:serverTimestamp()});
   tx.update(refs[i],{businessId,payload:result[domain],updatedByUid:actor,updatedBy:email,updatedAt:serverTimestamp(),syncRevision:rev[i],auditId:events[i].id,shopOperationId:op.id});
  }
  return result.record.sale;
 });
}

/* Full physical return of a confirmed POS sale, only if no prior financial refund.
   A financial correction alone does not restock goods. */
export function buildShopReturn({inventory,finance,businessId,actor,operationId,correctionId,original,reason,date,time,previousCents=0}){
 if(original.kind!=="SALE"||original.businessId!==businessId||!original.sale?.id||previousCents!==0)throw Error("La venta no admite devolución integral. Consulta conciliación.");
 const sale=finance.sales.find(s=>s.id===original.sale.id&&s.shopOperationId===original.sale.shopOperationId);
 const source=finance.cash.find(c=>c.id===original.cash.id&&c.saleId===sale?.id);
 if(!sale||!source||cents(sale.total)!==original.totalCents||cents(source.amount)!==original.totalCents)throw Error("Recibo y caja no conciliados.");
 const correction=buildCorrection({finance,businessId,sourceId:source.id,kind:"VOID",amount:sale.total,reason,actor,correctionId,date,previousCents});
 const products=copy(inventory.products),stockMoves=[...inventory.stockMoves],shopOrders=copy(inventory.shopOrders??[]),lines=[];
 for(const old of original.lines){
  const index=products.findIndex(p=>p.id===old.productId),p=products[index];
  if(!p||p.archived===true||p.businessId&&p.businessId!==businessId||products.filter(x=>x.id===old.productId).length!==1||!Number.isSafeInteger(p.stock)||p.stock<0||!Number.isSafeInteger(old.qty)||old.qty<=0||p.stock+old.qty>9999999)throw Error("Producto no disponible para reintegro. Consulta soporte.");
  const movement={id:"shopstock_"+operationId+"_"+lines.length,productId:p.id,type:"Entrada",qty:old.qty,reason:"Devolución de productos",date,businessId,branchId:String(p.branchId||""),createdBy:actor,stockBefore:p.stock,stockAfter:p.stock+old.qty,operationId,productName:String(p.name||"Producto")};
  lines.push({...old,index,movement});stockMoves.push(movement);p.stock+=old.qty;
 }
 const orderId=original.orderId||"",orderIndex=orderId?shopOrders.findIndex(o=>o.id===orderId):-1;
 if(orderId){const o=shopOrders[orderIndex];if(!o||o.status!=="Pagado/Entregado"||o.saleId!==sale.id)throw Error("Pedido no conciliado.");shopOrders[orderIndex]={...o,status:"Devuelto",refundedAt:date+"T"+time};}
 const {originalCents,...record}=correction;
 return {inventory:{...inventory,products,stockMoves,shopOrders},finance:{...finance,cash:[...finance.cash,correction.cashEntry]},correction:record,record:{businessId,actorUid:actor,kind:"RETURN",originalOperationId:sale.shopOperationId,correctionId,orderId,orderIndex,lines,totalCents:original.totalCents,sale,cash:correction.cashEntry,date,time,method:source.method}};
}
export async function returnShopSale({db,sdk,businessId,actor,email="",authorize,operationId,intentHash,clock,originalOperationId,...args}){
 const {doc,collection,runTransaction,serverTimestamp}=sdk;
 const ref=name=>doc(db,"businesses",businessId,"state",name),refs=["inventory","finance"].map(ref);
 const base=doc(db,"businesses",businessId,"shop_operations",originalOperationId),op=doc(db,"businesses",businessId,"shop_operations",operationId),correction=doc(collection(db,"businesses",businessId,"financial_corrections")),events=["inventory","finance"].map(()=>doc(collection(db,"businesses",businessId,"state_events")));
 return runTransaction(db,async tx=>{
  await authorize(tx,"RETURN");const existing=await tx.get(op);if(existing.exists()){const v=existing.data();if(v.kind==="RETURN"&&v.actorUid===actor&&v.intentHash===intentHash)return v;throw Error("Identificador de operación en conflicto.");}
  const [i,f,s,cfg]=await Promise.all([...refs,base,ref("config")].map(r=>tx.get(r)));
  if([i,f,cfg].some(x=>!x.exists()||x.data().businessId!==businessId)||!s.exists()||s.data().businessId!==businessId)throw Error("Venta no verificada.");
  const original=s.data(),sourceId=original.cash?.id;if(!sourceId)throw Error("Venta inválida.");
  const total=doc(db,"businesses",businessId,"correction_totals",sourceId),prior=await tx.get(total);
  if(prior.exists())throw Error("Existe un ajuste anterior. Consulta soporte.");
  const result=buildShopReturn({...args,...clock(cfg.data().payload.business),businessId,actor,operationId:op.id,correctionId:correction.id,original,inventory:i.data().payload,finance:f.data().payload});
  const rev=[i,f].map(x=>Number(x.data().syncRevision||0)+1);
  tx.set(correction,{...result.correction,createdAt:serverTimestamp()});
  tx.set(total,{businessId,sourceId,cents:result.correction.cumulativeCents,lastCorrectionId:correction.id,actorUid:actor,updatedAt:serverTimestamp()});
  tx.set(op,{...result.record,intentHash,inventoryRevision:rev[0],financeRevision:rev[1],createdAt:serverTimestamp()});
  for(const [j,domain] of ["inventory","finance"].entries()){
   tx.set(events[j],{businessId,domain,revision:rev[j],actorUid:actor,createdAt:serverTimestamp()});
   tx.update(refs[j],{businessId,payload:result[domain],updatedByUid:actor,updatedBy:email,updatedAt:serverTimestamp(),syncRevision:rev[j],auditId:events[j].id,shopOperationId:op.id});
  }
  return result.record;
 });
}
