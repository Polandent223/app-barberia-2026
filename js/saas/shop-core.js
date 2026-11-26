/* POS sale: same shared transaction in browser and emulator. Limited to 3 distinct products per receipt until ledger migration. */
export const MAX_LINES=3;
export const METHODS=["Efectivo","Pago móvil","Transferencia","Divisa","Tarjeta","Otro"];
const copy=v=>JSON.parse(JSON.stringify(v));
const cents=v=>{const n=Number(v),c=Math.round(n*100);if(v==null||v===""||!Number.isFinite(n)||n<0||c>999999900||Math.abs(n*100-c)>1e-6)throw Error("Precio inválido.");return c;};
export function buildShopSale({inventory,finance,config,businessId,actor,operationId,orderId="",items=[],method,date,time}){
 if(!METHODS.includes(method)||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(time))throw Error("Datos de cobro inválidos.");
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
export async function checkoutShop({db,sdk,businessId,actor,email="",check=()=>{},...args}){
 const {doc,collection,runTransaction,serverTimestamp}=sdk;
 const ref=name=>doc(db,"businesses",businessId,"state",name),refs=["inventory","finance","config"].map(ref);
 const op=doc(collection(db,"businesses",businessId,"shop_operations")),events=["inventory","finance"].map(()=>doc(collection(db,"businesses",businessId,"state_events")));
 return runTransaction(db,async tx=>{
  check();const snaps=await Promise.all(refs.map(r=>tx.get(r)));if(snaps.some(s=>!s.exists()||s.data().businessId!==businessId))throw Error("Módulo empresarial no verificado.");
  const result=buildShopSale({...args,businessId,actor,operationId:op.id,inventory:snaps[0].data().payload,finance:snaps[1].data().payload,config:snaps[2].data().payload});
  check();const rev=snaps.slice(0,2).map(s=>Number(s.data().syncRevision||0)+1);
  tx.set(op,{...result.record,inventoryRevision:rev[0],financeRevision:rev[1],createdAt:serverTimestamp()});
  for(const [i,domain] of ["inventory","finance"].entries()){
   tx.set(events[i],{businessId,domain,revision:rev[i],actorUid:actor,createdAt:serverTimestamp()});
   tx.update(refs[i],{businessId,payload:result[domain],updatedByUid:actor,updatedBy:email,updatedAt:serverTimestamp(),syncRevision:rev[i],auditId:events[i].id,shopOperationId:op.id});
  }
  return result.record.sale;
 });
}
