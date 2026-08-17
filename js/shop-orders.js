App.createShopOrder=function(){
  if(!App.clientCart.length)return;
  const phone=prompt("WhatsApp del cliente:","")||"";if(!phone)return;
  const note=App.val("clientOrderNote")||"";
  const order={
    id:App.uid(),
    phone,
    note,
    status:"Pendiente",
    createdAt:new Date().toISOString(),
    items:App.clientCart.map(x=>({...x})),
    total:App.clientCart.reduce((s,x)=>s+x.qty*x.price,0),
    currency:App.db.business.currency||"$",
    reservedAt:"",
    paidAt:"",
    deliveredAt:"",
    saleId:""
  };
  App.db.shopOrders.push(order);
  App.addClientActivity("Solicitud de compra",`${phone} · ${order.currency}${order.total.toFixed(2)}`,phone);
  localStorage.setItem(App.KEY,JSON.stringify(App.db));
  App.clientCart=[];
  App.renderClientShop();
  App.renderAll();
  App.toast("Solicitud de compra enviada");
};

/* ADMIN approves request: only reserve, DO NOT touch stock */
App.approveShopOrder=function(id){
  const o=App.db.shopOrders.find(x=>x.id===id);
  if(!o||o.status!=="Pendiente")return;

  for(const item of o.items){
    const p=App.db.products.find(x=>x.id===item.id);
    if(!p || Number(p.stock)<Number(item.qty)){
      return App.toast(`Stock insuficiente para reservar: ${item.name}`);
    }
  }

  o.status="Reservado";
  o.reservedAt=new Date().toISOString();
  App.logAction("Pedido reservado","App Cliente",`${o.phone} · ${o.currency}${o.total.toFixed(2)}`);
  App.addClientActivity("Pedido reservado",`${o.phone} · pendiente de pago`,o.phone);
  localStorage.setItem(App.KEY,JSON.stringify(App.db));
  App.renderAll();
  App.toast("Pedido reservado. Stock aún no descontado.");
};

App.rejectShopOrder=function(id){
  const o=App.db.shopOrders.find(x=>x.id===id);if(!o)return;
  if(o.status==="Pagado/Entregado")return App.toast("No se puede rechazar un pedido ya cobrado");
  o.status="Rechazado";
  o.reviewedAt=new Date().toISOString();
  App.logAction("Compra cliente rechazada","App Cliente",o.phone);
  App.addClientActivity("Pedido rechazado",o.phone,o.phone);
  localStorage.setItem(App.KEY,JSON.stringify(App.db));
  App.renderAll();
};

App.cancelShopOrder=function(id){
  const o=App.db.shopOrders.find(x=>x.id===id);if(!o)return;
  if(o.status==="Pagado/Entregado")return App.toast("El pedido ya fue cobrado. Usa devolución.");
  o.status="Cancelado";
  o.cancelledAt=new Date().toISOString();
  App.logAction("Pedido cancelado","App Cliente",`${o.phone} · sin movimiento de stock`);
  App.addClientActivity("Pedido cancelado",`${o.phone} · stock sin cambios`,o.phone);
  localStorage.setItem(App.KEY,JSON.stringify(App.db));
  App.renderAll();
  App.toast("Pedido cancelado. El stock no cambió.");
};

App.canCheckoutOrder=function(){
  return ["Administrador","Recepción"].includes(App.currentUser()?.role);
};

/* CASHIER/ADMIN: real sale happens here */
App.checkoutAndDeliverOrder=function(id){
  if(!App.canCheckoutOrder())return App.toast("Solo Administrador o Recepción/Caja puede cobrar");
  const o=App.db.shopOrders.find(x=>x.id===id);
  if(!o||o.status!=="Reservado")return App.toast("El pedido no está reservado");

  for(const item of o.items){
    const p=App.db.products.find(x=>x.id===item.id);
    if(!p || Number(p.stock)<Number(item.qty)){
      return App.toast(`Stock insuficiente: ${item.name}`);
    }
  }

  const method=prompt("Método de pago: Efectivo / Pago móvil / Transferencia / Divisa","Efectivo")||"Efectivo";
  const client=App.db.clients.find(c=>App.normalizePhone(c.phone)===App.normalizePhone(o.phone));
  const sale={
    id:App.uid(),
    number:String(App.db.sales.length+1).padStart(6,"0"),
    date:App.today(),
    time:new Date().toTimeString().slice(0,5),
    clientName:client?.name||o.phone||"Cliente tienda",
    barberName:"Venta tienda",
    currency:o.currency||App.db.business.currency||"$",
    total:Number(o.total||0),
    items:o.items.map(i=>({
      name:i.name,qty:Number(i.qty),unit:Number(i.price),total:Number(i.qty)*Number(i.price),type:"Producto",refId:i.id
    })),
    source:"App Cliente",
    orderId:o.id
  };

  /* Only now decrement physical inventory */
  for(const item of o.items){
    const p=App.db.products.find(x=>x.id===item.id);
    p.stock=Number(p.stock)-Number(item.qty);
    App.db.stockMoves.push({
      id:App.uid(),productId:p.id,type:"Salida",qty:Number(item.qty),date:App.today(),reason:`Venta pedido ${sale.number}`
    });
  }

  App.db.sales.push(sale);
  App.db.cash.push({
    id:App.uid(),
    type:"Ingreso",
    concept:`Pedido cliente #${sale.number}`,
    amount:Number(o.total||0),
    method,
    date:App.today(),
    currency:sale.currency,
    saleId:sale.id,
    orderId:o.id
  });

  o.status="Pagado/Entregado";
  o.paidAt=new Date().toISOString();
  o.deliveredAt=o.paidAt;
  o.saleId=sale.id;
  o.paymentMethod=method;

  App.logAction("Pedido cobrado y entregado","Caja",`${o.phone} · ${sale.currency}${sale.total.toFixed(2)} · ${method}`);
  App.addClientActivity("Compra completada",`${o.phone} · ${sale.currency}${sale.total.toFixed(2)}`,o.phone);

  localStorage.setItem(App.KEY,JSON.stringify(App.db));
  App.renderAll();
  App.toast("Pago registrado, producto entregado e inventario descontado");
};

/* Admin-only reversal after payment: returns stock and creates negative cash movement */
App.returnShopOrder=function(id){
  if(!App.isAdmin())return App.toast("Solo el administrador puede procesar devoluciones");
  const o=App.db.shopOrders.find(x=>x.id===id);
  if(!o||o.status!=="Pagado/Entregado")return App.toast("Este pedido no está pagado");

  App.confirmAction("Procesar devolución","Se devolverá el producto al inventario y se registrará la salida de dinero.",()=>{
    const sale=App.db.sales.find(s=>s.id===o.saleId);
    for(const item of o.items){
      const p=App.db.products.find(x=>x.id===item.id);
      if(p){
        p.stock=Number(p.stock)+Number(item.qty);
        App.db.stockMoves.push({
          id:App.uid(),productId:p.id,type:"Entrada",qty:Number(item.qty),date:App.today(),reason:`Devolución pedido ${sale?.number||o.id}`
        });
      }
    }

    App.db.cash.push({
      id:App.uid(),
      type:"Gasto",
      concept:`Devolución pedido #${sale?.number||""}`,
      amount:Number(o.total||0),
      method:o.paymentMethod||"Devolución",
      date:App.today(),
      currency:o.currency,
      orderId:o.id,
      refund:true
    });

    o.status="Devuelto";
    o.refundedAt=new Date().toISOString();

    App.logAction("Pedido devuelto","Caja",`${o.phone} · ${o.currency}${Number(o.total).toFixed(2)}`);
    App.addClientActivity("Compra devuelta",`${o.phone} · stock reintegrado`,o.phone);
    localStorage.setItem(App.KEY,JSON.stringify(App.db));
    App.renderAll();
    App.toast("Devolución completada y stock reintegrado");
  });
};

App.renderCashShopOrders=function(){
  const box=App.byId("cashShopOrders");if(!box)return;
  const list=App.db.shopOrders.filter(o=>["Reservado","Pagado/Entregado"].includes(o.status)).slice().reverse();
  box.innerHTML=list.map(o=>`
    <div class="row ${o.status==="Reservado"?"order-reserved":"order-paid"}">
      <div>
        <strong>${o.phone} · ${o.currency}${Number(o.total).toFixed(2)}</strong>
        <small>${o.items.map(i=>`${i.qty}× ${i.name}`).join(", ")} · ${o.status}${o.paymentMethod?` · ${o.paymentMethod}`:""}</small>
      </div>
      <div class="request-actions">
        ${o.status==="Reservado"&&App.canCheckoutOrder()?`<button class="btn primary" onclick="App.checkoutAndDeliverOrder('${o.id}')">Cobrar y entregar</button>`:""}
        ${o.status==="Reservado"?`<button class="btn danger" onclick="App.cancelShopOrder('${o.id}')">Cancelar pedido</button>`:""}
        ${o.status==="Pagado/Entregado"&&App.isAdmin()?`<button class="btn secondary" onclick="App.returnShopOrder('${o.id}')">Devolución</button>`:""}
      </div>
    </div>`).join("")||'<div class="muted">No hay pedidos reservados o cobrados.</div>';
};
