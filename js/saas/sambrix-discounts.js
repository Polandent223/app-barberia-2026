SaaS.discounts=SaaS.discounts||{coupons:[],uses:[]};

SaaS.loadDiscounts=function(){
 try{
  const s=JSON.parse(localStorage.getItem("sambrix_discounts"))||{};
  SaaS.discounts={coupons:s.coupons||[],uses:s.uses||[]};
 }catch{}
};
SaaS.saveDiscounts=function(){localStorage.setItem("sambrix_discounts",JSON.stringify(SaaS.discounts));};

SaaS.openDiscountModal=function(){
 const today=new Date().toISOString().slice(0,10);
 const later=new Date(Date.now()+30*86400000).toISOString().slice(0,10);
 document.getElementById("discountCode").value="";
 document.getElementById("discountValue").value="";
 document.getElementById("discountMaxUses").value="100";
 document.getElementById("discountStartDate").value=today;
 document.getElementById("discountEndDate").value=later;
 document.getElementById("discountDescription").value="";
 document.getElementById("discountCreateModal")?.classList.add("open");
};
SaaS.closeDiscountModal=function(){document.getElementById("discountCreateModal")?.classList.remove("open");};

SaaS.createDiscount=function(){
 const code=document.getElementById("discountCode").value.trim().toUpperCase().replace(/\s+/g,"");
 const type=document.getElementById("discountType").value;
 const value=Number(document.getElementById("discountValue").value||0);
 if(!code)return alert("Escribe un código.");
 if(value<=0)return alert("Escribe un valor válido.");
 if(type==="percent"&&value>100)return alert("El porcentaje no puede superar 100.");
 if(SaaS.discounts.coupons.some(c=>c.code===code))return alert("Ese código ya existe.");
 const c={
  id:"coupon_"+SaaS.uid(),code,type,value,
  maxUses:Math.max(1,Number(document.getElementById("discountMaxUses").value||1)),
  startDate:document.getElementById("discountStartDate").value,
  endDate:document.getElementById("discountEndDate").value,
  description:document.getElementById("discountDescription").value.trim(),
  active:true,createdAt:new Date().toISOString()
 };
 if(c.endDate&&c.startDate&&c.endDate<c.startDate)return alert("El vencimiento no puede ser anterior al inicio.");
 SaaS.discounts.coupons.push(c);SaaS.saveDiscounts();
 SaaS.audit?.("BILLING","Cupón creado",{code:c.code,type:c.type,value:c.value},"");
 SaaS.closeDiscountModal();SaaS.renderDiscounts();
};

SaaS.discountState=function(c){
 const today=new Date().toISOString().slice(0,10);
 const uses=SaaS.discounts.uses.filter(u=>u.couponId===c.id).length;
 if(!c.active)return "Inactivo";
 if(c.endDate&&today>c.endDate)return "Vencido";
 if(c.startDate&&today<c.startDate)return "Programado";
 if(uses>=c.maxUses)return "Agotado";
 return "Activo";
};

SaaS.toggleDiscount=function(id){
 const c=SaaS.discounts.coupons.find(x=>x.id===id);if(!c)return;
 c.active=!c.active;SaaS.saveDiscounts();
 SaaS.audit?.("BILLING","Estado de cupón actualizado",{code:c.code,active:c.active},"");
 SaaS.renderDiscounts();
};

SaaS.applyDiscount=function(){
 const businessId=document.getElementById("discountApplyBusiness").value;
 const couponId=document.getElementById("discountApplyCoupon").value;
 const c=SaaS.discounts.coupons.find(x=>x.id===couponId);
 const b=SaaS.db.businesses.find(x=>x.id===businessId);
 if(!b||!c)return alert("Selecciona negocio y cupón.");
 if(SaaS.discountState(c)!=="Activo")return alert("Este cupón no está disponible.");
 if(SaaS.discounts.uses.some(u=>u.businessId===businessId&&u.couponId===couponId))return alert("Este negocio ya utilizó este cupón.");

 const sub=SaaS.billingSubscriptionFor?.(businessId);
 const base=Number(sub?.price||sub?.amount||0);
 const discountAmount=c.type==="percent"?(base*c.value/100):Math.min(base||c.value,c.value);
 const finalAmount=Math.max(0,base-discountAmount);

 SaaS.discounts.uses.push({
  id:"discount_use_"+SaaS.uid(),businessId,businessName:b.name,couponId,code:c.code,
  baseAmount:base,discountAmount,finalAmount,appliedAt:new Date().toISOString()
 });
 SaaS.saveDiscounts();
 SaaS.audit?.("BILLING","Cupón aplicado",{business:b.name,code:c.code,discountAmount},businessId);
 SaaS.renderDiscounts();
 window.App?.toast?.("Descuento registrado");
};

SaaS.renderDiscounts=function(){
 const box=document.getElementById("discountList");if(!box)return;
 const coupons=SaaS.discounts.coupons||[],uses=SaaS.discounts.uses||[];
 const active=coupons.filter(c=>SaaS.discountState(c)==="Activo").length;
 const expired=coupons.filter(c=>SaaS.discountState(c)==="Vencido").length;
 const total=uses.reduce((a,u)=>a+Number(u.discountAmount||0),0);

 document.getElementById("discountActiveCount").textContent=active;
 document.getElementById("discountUseCount").textContent=uses.length;
 document.getElementById("discountTotalAmount").textContent="$"+total.toFixed(2);
 document.getElementById("discountExpiredCount").textContent=expired;

 box.innerHTML=[...coupons].reverse().map(c=>{
  const state=SaaS.discountState(c),count=uses.filter(u=>u.couponId===c.id).length;
  return `<div class="row discount-row ${state==="Activo"?"active":state==="Vencido"?"expired":""}">
   <div style="flex:1"><strong>${c.code} · ${c.type==="percent"?c.value+"%":"$"+Number(c.value).toFixed(2)}</strong>
   <small>${state} · ${count}/${c.maxUses} usos · ${c.startDate||"sin inicio"} → ${c.endDate||"sin vencimiento"}</small>
   <div class="discount-meta">${c.description||"Sin descripción"}</div></div>
   <button class="btn secondary tiny" onclick="SaaS.toggleDiscount('${c.id}')">${c.active?"Desactivar":"Activar"}</button>
  </div>`;
 }).join("")||'<div class="muted">Todavía no hay cupones.</div>';

 const bsel=document.getElementById("discountApplyBusiness");
 bsel.innerHTML=(SaaS.db.businesses||[]).map(b=>`<option value="${b.id}">${b.name}</option>`).join("");
 const csel=document.getElementById("discountApplyCoupon");
 csel.innerHTML=coupons.filter(c=>SaaS.discountState(c)==="Activo").map(c=>`<option value="${c.id}">${c.code}</option>`).join("");

 document.getElementById("discountUsageList").innerHTML=[...uses].reverse().slice(0,30).map(u=>`<div class="row discount-row active">
  <div><strong>${u.businessName} · ${u.code}</strong><small>Base $${Number(u.baseAmount).toFixed(2)} · descuento $${Number(u.discountAmount).toFixed(2)} · final $${Number(u.finalAmount).toFixed(2)}</small>
  <div class="discount-meta">${new Date(u.appliedAt).toLocaleString()}</div></div>
 </div>`).join("")||'<div class="muted">No hay descuentos aplicados.</div>';
};

const oldRenderAll_192=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_192();SaaS.renderDiscounts();};
