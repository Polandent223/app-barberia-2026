
App.saveProduct = function(){
  if(!App.val("productName"))return App.toast("Escribe el producto");
  App.db.products.push({id:App.uid(),name:App.val("productName"),category:App.val("productCategory"),stock:Number(App.val("productStock")||0),min:Number(App.val("productMin")||0),cost:Number(App.val("productCost")||0),price:Number(App.val("productPrice")||0)});
  App.hide("productForm");App.byId("productName").value="";App.persist();
};
App.editProduct = function(id){
  const p=App.db.products.find(x=>x.id===id);if(!p)return;
  App.openFormModal({
    tag:"INVENTARIO",title:"Editar producto",
    fields:[
      {name:"name",label:"Producto",value:p.name},
      {name:"category",label:"Categoría",type:"select",value:p.category,options:["Insumo","Venta","Herramienta","Limpieza"].map(x=>({value:x,label:x}))},
      {name:"stock",label:"Stock",type:"number",value:p.stock},
      {name:"min",label:"Stock mínimo",type:"number",value:p.min},
      {name:"cost",label:"Costo",type:"number",step:".01",value:p.cost},
      {name:"price",label:"Precio",type:"number",step:".01",value:p.price}
    ],
    onSave:()=>{
      p.name=App.readModal("name").trim()||p.name;
      p.category=App.readModal("category");
      p.stock=Number(App.readModal("stock")||0);
      p.min=Number(App.readModal("min")||0);
      p.cost=Number(App.readModal("cost")||0);
      p.price=Number(App.readModal("price")||0);
      App.closeModal();App.persist();App.toast("Producto actualizado");
    }
  });
};
App.deleteProduct = function(id){App.requestDelete("product",id)};
App.stockMove = function(id,type){
  const p=App.db.products.find(x=>x.id===id);if(!p)return;
  App.openFormModal({
    tag:"STOCK",title:`${type} de inventario`,
    note:`Producto: <strong>${p.name}</strong> · Stock actual: <strong>${p.stock}</strong>`,
    fields:[
      {name:"qty",label:"Cantidad",type:"number",value:1},
      {name:"reason",label:"Motivo",value:type==="Entrada"?"Compra / reposición":"Uso / venta"}
    ],
    saveText:`Registrar ${type.toLowerCase()}`,
    onSave:()=>{
      const q=Number(App.readModal("qty")||0);if(q<=0)return App.toast("Cantidad inválida");
      if(type==="Salida"&&q>p.stock)return App.toast("Stock insuficiente");
      p.stock+=type==="Entrada"?q:-q;
      App.db.stockMoves.push({id:App.uid(),productId:id,type,qty:q,reason:App.readModal("reason"),date:App.today()});
      App.closeModal();App.persist();App.toast("Stock actualizado");
    }
  });
};
App.renderInventory = function(){
  App.byId("invCount").textContent=App.db.products.length;
  App.byId("invLow").textContent=App.db.products.filter(p=>p.stock<=p.min).length;
  App.byId("invValue").textContent=App.money(App.db.products.reduce((s,p)=>s+p.stock*p.cost,0));
  App.byId("invMoves").textContent=App.db.stockMoves.length;
  const q=App.filters.products||"";const filtered=App.db.products.filter(p=>!q||p.name.toLowerCase().includes(q)||p.category.toLowerCase().includes(q));App.byId("productList").innerHTML=filtered.map(p=>`<article class="card"><h3>${p.name}</h3><div class="muted">${p.category}</div><div class="big">${p.stock} u.</div><div class="muted">Mín. ${p.min} · Precio ${App.money(p.price)}</div><div class="actions"><button class="btn secondary" onclick="App.stockMove('${p.id}','Entrada')">+ Entrada</button><button class="btn secondary" onclick="App.stockMove('${p.id}','Salida')">- Salida</button></div><div class="manage-actions"><button class="btn edit" onclick="App.editProduct('${p.id}')">Editar</button><button class="btn danger" onclick="App.deleteProduct('${p.id}')">${App.deleteButtonLabel()}</button></div></article>`).join("");
  App.byId("stockMoveList").innerHTML=App.db.stockMoves.slice().reverse().map(m=>`<div class="row"><div><strong>${App.db.products.find(p=>p.id===m.productId)?.name||"Producto"}</strong><small>${m.date} · ${m.type}${m.reason?` · ${m.reason}`:""}</small></div><strong>${m.qty}</strong></div>`).join("")||'<div class="muted">Sin movimientos.</div>';
};
