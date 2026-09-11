
App.requireInventoryAccess=function(){
  if(window.SaaS&&!SaaS.pageAllowed?.("inventario")){App.toast("Tu rol no tiene permiso para gestionar inventario");return false}
  return true;
};

App.saveProduct = function(){
  if(!App.requireInventoryAccess())return;
  if(!App.val("productName"))return App.toast("Escribe el producto");
  const id=App.val("productEditId");
  const existing=id?App.db.products.find(x=>x.id===id):null;
  const data={
    name:App.val("productName"),category:App.val("productCategory"),stock:Number(App.val("productStock")||0),
    min:Number(App.val("productMin")||0),cost:Number(App.val("productCost")||0),price:Number(App.val("productPrice")||0)
  };
  const finish=photo=>{
    if(!App.requireInventoryAccess())return;
    if(existing){Object.assign(existing,data);if(photo)existing.photo=photo}
    else App.db.products.push({id:App.uid(),...data,photo:photo||""});
    ["productEditId","productName","productStock","productMin","productCost","productPrice"].forEach(x=>{const e=App.byId(x);if(e)e.value=""});
    const file=App.byId("productPhoto");if(file)file.value="";
    const preview=App.byId("productPhotoPreview");if(preview){preview.src="";preview.classList.add("hidden")}
    App.hide("productForm");App.persist();App.toast(existing?"Producto actualizado":"Producto guardado");
  };
  const file=App.byId("productPhoto")?.files?.[0];
  if(file)App.compressImageLocal(file,720,.8).then(finish).catch(()=>{App.toast("No se pudo procesar la foto");finish("")});else finish("");
};
App.editProduct = function(id){
  if(!App.requireInventoryAccess())return;
  const p=App.db.products.find(x=>x.id===id);if(!p)return;
  App.show("productForm");App.byId("productEditId").value=p.id;App.byId("productName").value=p.name||"";
  App.byId("productCategory").value=p.category||"Insumo";App.byId("productStock").value=p.stock??0;
  App.byId("productMin").value=p.min??0;App.byId("productCost").value=p.cost??0;App.byId("productPrice").value=p.price??0;
  const preview=App.byId("productPhotoPreview");if(preview){preview.src=p.photo||"";preview.classList.toggle("hidden",!p.photo)}
  App.byId("productForm")?.scrollIntoView?.({behavior:"smooth",block:"start"});
};
App.deleteProduct = function(id){if(!App.requireInventoryAccess())return;App.requestDelete("product",id)};
App.stockMove = function(id,type){
  if(!App.requireInventoryAccess())return;
  const p=App.db.products.find(x=>x.id===id);if(!p)return;
  App.openFormModal({
    tag:"STOCK",title:`${type} de inventario`,note:`Producto: <strong>${p.name}</strong> · Stock actual: <strong>${p.stock}</strong>`,
    fields:[{name:"qty",label:"Cantidad",type:"number",value:1},{name:"reason",label:"Motivo",value:type==="Entrada"?"Compra / reposición":"Uso / venta"}],
    saveText:`Registrar ${type.toLowerCase()}`,
    onSave:()=>{
      if(!App.requireInventoryAccess())return;
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
  const q=App.filters.products||"";const filtered=App.db.products.filter(p=>!q||p.name.toLowerCase().includes(q)||p.category.toLowerCase().includes(q));
  App.byId("productList").innerHTML=filtered.map(p=>`<article class="card product-card">${p.photo?`<img class="catalog-card-photo" src="${p.photo}" alt="${p.name}">`:""}<h3>${p.name}</h3><div class="muted">${p.category}</div><div class="big">${p.stock} u.</div><div class="muted">Mín. ${p.min} · Precio ${App.money(p.price)}</div><div class="actions"><button class="btn secondary" onclick="App.stockMove('${p.id}','Entrada')">+ Entrada</button><button class="btn secondary" onclick="App.stockMove('${p.id}','Salida')">- Salida</button></div><div class="manage-actions"><button class="btn edit" onclick="App.editProduct('${p.id}')">Editar</button><button class="btn danger" onclick="App.deleteProduct('${p.id}')">${App.deleteButtonLabel()}</button></div></article>`).join("");
  App.byId("stockMoveList").innerHTML=App.db.stockMoves.slice().reverse().map(m=>`<div class="row"><div><strong>${App.db.products.find(p=>p.id===m.productId)?.name||"Producto"}</strong><small>${m.date} · ${m.type}${m.reason?` · ${m.reason}`:""}</small></div><strong>${m.qty}</strong></div>`).join("")||'<div class="muted">Sin movimientos.</div>';
};

App.byId("productPhoto")?.addEventListener("change",e=>{
 const file=e.target.files?.[0], preview=App.byId("productPhotoPreview");if(!preview)return;
 if(!file){preview.src="";preview.classList.add("hidden");return}
 const reader=new FileReader();reader.onload=()=>{preview.src=reader.result;preview.classList.remove("hidden")};reader.readAsDataURL(file);
});
