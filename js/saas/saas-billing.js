
SaaS.PLAN_FEATURES={
  "plan-basic":[
    "inicio","citas","clientes","barberos","servicios","configuracion","clienteConfig"
  ],
  "plan-pro":[
    "inicio","citas","clientes","barberos","servicios","configuracion","clienteConfig",
    "caja","inventario","usuarios","recibos","autorizaciones","reportes"
  ],
  "plan-premium":["*"]
};

SaaS.PLAN_CAPABILITIES={
  basic:{
    basicBranding:true,customTheme:false,coverImage:true,basicReceipt:true,
    socialLinks:true,promotions:false,staffPhotos:true,whiteLabel:false,customSlug:false,
    clientHistory:false,clientShop:false,branches:1,users:5
  },
  pro:{
    basicBranding:true,customTheme:true,coverImage:true,basicReceipt:true,
    socialLinks:true,promotions:true,staffPhotos:true,whiteLabel:false,customSlug:false,
    clientHistory:true,clientShop:true,branches:3,users:999
  },
  premium:{
    basicBranding:true,customTheme:true,coverImage:true,basicReceipt:true,
    socialLinks:true,promotions:true,staffPhotos:true,whiteLabel:true,customSlug:true,
    clientHistory:true,clientShop:true,branches:999,users:999
  }
};

SaaS.planTier=function(business=SaaS.currentBusiness()){
  if(!business)return "basic";
  const plan=SaaS.getPlan?.(business.planId);
  const id=String(business.planId||"").toLowerCase();
  const name=String(plan?.name||"").trim().toLowerCase();

  if(id.includes("premium")||name.includes("premium"))return "premium";
  if(id.includes("pro")||name==="pro"||name.startsWith("pro ")||name.endsWith(" pro"))return "pro";
  return "basic";
};

SaaS.planCapability=function(name,business=SaaS.currentBusiness()){
  const tier=SaaS.planTier(business);
  return SaaS.PLAN_CAPABILITIES[tier]?.[name] ?? false;
};


SaaS.featureAllowed=function(page,business=SaaS.currentBusiness()){
  if(!business)return false;

  const role=String(SaaS.session?.role||"").toLowerCase();
  if(role==="superadmin" || window.SaaSAuthAdmin?.isSuperAdmin?.())return true;

  const status=String(business.status||"Activo").toLowerCase();
  if(status.includes("suspend")||status.includes("venc")||status.includes("cancel"))return false;

  const features=SaaS.PLAN_FEATURES[business.planId]||[];
  return features.includes("*")||features.includes(page);
};

SaaS.daysUntil=function(date){
  if(!date)return null;
  return Math.ceil((new Date(date+"T23:59:59")-new Date())/86400000);
};

SaaS.subscriptionLabel=function(b){
  if(b.status==="Prueba")return "Prueba";
  if(b.status==="Suspendido")return "Suspendido";
  const days=SaaS.daysUntil(b.nextPayment);
  if(days!==null&&days<0)return "Vencido";
  return b.status||"Activo";
};


/* ===== FASE 20.6 — SUSCRIPCIONES UNIFICADAS ===== */


/* ===== FASE 20.7 — CICLO DE RENOVACIÓN ===== */

SaaS.isFreeOrSpecialPlan=function(plan){
  if(!plan)return false;
  const price=Number(plan.price||0);
  const id=String(plan.id||"").toLowerCase();
  const name=String(plan.name||"").toLowerCase();
  return price<=0 || id.includes("free") || name.includes("gratis") || name.includes("free");
};

SaaS.addMonthsISO=function(iso,months=1){
  let d=iso?new Date(iso.length===10?iso+"T12:00:00":iso):new Date();
  if(Number.isNaN(d.getTime()))d=new Date();
  d.setMonth(d.getMonth()+months);
  return d.toISOString().slice(0,10);
};

SaaS.defaultRenewalDate=function(business){
  const plan=SaaS.getPlan?.(business?.planId);
  if(SaaS.isFreeOrSpecialPlan(plan))return "";
  const base=business?.createdAt||new Date().toISOString();
  return SaaS.addMonthsISO(base,1);
};

SaaS.ensureRenewalDates=function(){
  let changed=false;

  (SaaS.db.businesses||[]).forEach(b=>{
    const plan=SaaS.getPlan?.(b.planId);
    const active=["activo","active","prueba","trial"].includes(String(b.status||"Activo").toLowerCase());

    if(active && !SaaS.isFreeOrSpecialPlan(plan) && !b.nextPayment){
      b.nextPayment=SaaS.defaultRenewalDate(b);
      changed=true;
    }

    const sub=(SaaS.db.subscriptions||[]).find(s=>s.businessId===b.id);
    if(sub){
      if(!SaaS.isFreeOrSpecialPlan(plan) && !sub.nextDue){
        sub.nextDue=b.nextPayment||SaaS.defaultRenewalDate(b);
        changed=true;
      }
      if(!SaaS.isFreeOrSpecialPlan(plan) && !sub.renewalDate){
        sub.renewalDate=sub.nextDue||b.nextPayment||SaaS.defaultRenewalDate(b);
        changed=true;
      }
      if(b.nextPayment && (sub.nextDue!==b.nextPayment || sub.renewalDate!==b.nextPayment)){
        sub.nextDue=b.nextPayment;
        sub.renewalDate=b.nextPayment;
        changed=true;
      }
    }
  });

  if(changed)SaaS.save?.();
  return changed;
};

SaaS.subscriptionStatusFromBusiness=function(business){
  const raw=String(business?.status||"Activo").toLowerCase();
  if(raw.includes("suspend"))return "Suspended";
  if(raw.includes("prueba")||raw.includes("trial"))return "Trial";
  if(raw.includes("cancel"))return "Cancelled";
  return "Active";
};

SaaS.ensureSubscriptionRecords=function(){
  SaaS.db.subscriptions=Array.isArray(SaaS.db.subscriptions)?SaaS.db.subscriptions:[];
  SaaS.ensureRenewalDates?.();

  const businesses=SaaS.db.businesses||[];
  const businessIds=new Set(businesses.map(b=>b.id));

  // Remove orphaned duplicates while preserving the most recent/first valid record.
  const seen=new Set();
  SaaS.db.subscriptions=SaaS.db.subscriptions.filter(sub=>{
    if(!sub?.businessId||!businessIds.has(sub.businessId))return false;
    if(seen.has(sub.businessId))return false;
    seen.add(sub.businessId);
    return true;
  });

  businesses.forEach(b=>{
    const plan=SaaS.getPlan?.(b.planId);
    let sub=SaaS.db.subscriptions.find(s=>s.businessId===b.id);

    if(!sub){
      sub={
        id:"sub_"+SaaS.uid(),
        businessId:b.id,
        businessName:b.name,
        planId:b.planId||"",
        planName:plan?.name||"Sin plan",
        price:Number(plan?.price||0),
        amount:Number(plan?.price||0),
        currency:"USD",
        cycle:"monthly",
        status:SaaS.subscriptionStatusFromBusiness(b),
        startedAt:b.createdAt||new Date().toISOString(),
        nextDue:b.nextPayment||"",
        renewalDate:b.nextPayment||"",
        createdAt:new Date().toISOString()
      };
      SaaS.db.subscriptions.push(sub);
    }else{
      // Business remains the source for its assigned plan and public account state.
      sub.businessName=b.name;
      sub.planId=b.planId||sub.planId||"";
      sub.planName=plan?.name||sub.planName||"Sin plan";
      sub.price=Number(plan?.price??sub.price??sub.amount??0);
      sub.amount=Number(plan?.price??sub.amount??sub.price??0);
      sub.currency=sub.currency||"USD";
      sub.cycle=sub.cycle||"monthly";
      sub.status=SaaS.subscriptionStatusFromBusiness(b);
      if(b.nextPayment){
        sub.nextDue=b.nextPayment;
        sub.renewalDate=b.nextPayment;
      }
    }
  });

  SaaS.save?.();
  return SaaS.db.subscriptions;
};

SaaS.subscriptionForBusiness=function(businessId){
  SaaS.ensureSubscriptionRecords();
  return SaaS.db.subscriptions.find(s=>s.businessId===businessId)||null;
};

SaaS.subscriptionDisplayStatus=function(sub,business){
  if(["Suspended","Suspendida"].includes(sub?.status))return "Suspendido";
  if(["Trial","Prueba"].includes(sub?.status))return "Prueba";
  if(["Cancelled","Cancelada"].includes(sub?.status))return "Cancelado";

  const due=sub?.nextDue||sub?.renewalDate||business?.nextPayment||"";
  const days=SaaS.daysUntil?.(due);
  if(days!==null&&days<0)return "Vencido";
  return "Activo";
};

SaaS.renderSubscriptions=function(){
  const box=document.getElementById("subscriptionList");
  if(!box)return;

  const subs=SaaS.ensureSubscriptionRecords();
  const businesses=SaaS.db.businesses||[];

  const rows=businesses.map(b=>{
    const sub=subs.find(s=>s.businessId===b.id);
    const plan=SaaS.getPlan?.(sub?.planId||b.planId);
    const status=SaaS.subscriptionDisplayStatus(sub,b);
    const due=sub?.nextDue||sub?.renewalDate||b.nextPayment||"";
    const days=SaaS.daysUntil?.(due);
    const price=Number(sub?.price??sub?.amount??plan?.price??0);
    return {b,sub,plan,status,due,days,price};
  });

  const mrr=rows
    .filter(x=>["Activo","Prueba"].includes(x.status))
    .reduce((sum,x)=>sum+x.price,0);

  const dueSoon=rows.filter(x=>x.days!==null&&x.days>=0&&x.days<=7).length;
  const expired=rows.filter(x=>["Vencido","Suspendido"].includes(x.status)).length;
  const trials=rows.filter(x=>x.status==="Prueba").length;

  document.getElementById("subMRR").textContent=`$${mrr.toFixed(2)}`;
  document.getElementById("subDueSoon").textContent=dueSoon;
  document.getElementById("subExpired").textContent=expired;
  document.getElementById("subTrials").textContent=trials;

  box.innerHTML=rows.map(({b,sub,plan,status,due,days,price})=>`
    <div class="row subscription-row ${["Vencido","Suspendido"].includes(status)?"expired":status==="Prueba"?"trial":""}">
      <div class="subscription-main">
        <strong>${b.name}</strong>
        <small>
          ${plan?.name||sub?.planName||"Sin plan"} ·
          $${price.toFixed(2)}/mes ·
          ${status} ·
          ${SaaS.isFreeOrSpecialPlan(plan)?"Cuenta gratuita":(due||"Fecha pendiente")}
          ${days!==null?` · ${days>=0?days+" día(s)":"vencido hace "+Math.abs(days)+" día(s)"}`:""}
        </small>
        <span class="subscription-owner">${b.ownerEmail||"Propietario sin correo"}</span>
      </div>
      <div class="manage-actions">
        <button class="btn primary tiny" onclick="SaaS.openPlanChange('${b.id}')">Cambiar plan</button>
        <button class="btn secondary tiny" onclick="SaaS.renewBusiness('${b.id}',1)">+1 mes</button>
        <button class="btn secondary tiny" onclick="SaaS.renewBusiness('${b.id}',3)">+3 meses</button>
        <button class="btn danger tiny" onclick="SaaS.suspendBusiness('${b.id}')">${status==="Suspendido"?"Reactivar":"Suspender"}</button>
      </div>
    </div>
  `).join("")||`
    <div class="empty-state">
      <strong>No hay suscripciones</strong>
      <small>Las suscripciones aparecerán automáticamente al crear un negocio.</small>
    </div>`;
};



/* ===== FASE 20.18 — CAMBIO DE PLAN POR NEGOCIO ===== */

SaaS.planFeaturePages=function(plan){
  if(!plan)return [];
  if(SaaS.PLAN_FEATURES?.[plan.id])return SaaS.PLAN_FEATURES[plan.id];

  const n=String(plan.name||"").toLowerCase();
  if(n.includes("premium")||n.includes("enterprise"))return ["*"];
  if(n.includes("pro"))return SaaS.PLAN_FEATURES["plan-pro"]||[];
  return SaaS.PLAN_FEATURES["plan-basic"]||[];
};

SaaS.planTrialDays=function(plan){
  const name=String(plan?.name||"");
  const m=name.match(/(\d+)\s*d[ií]as?/i);
  return m?Math.max(1,Number(m[1])):15;
};

SaaS.openPlanChange=function(businessId){
  const b=SaaS.db.businesses.find(x=>x.id===businessId);if(!b)return;
  const current=SaaS.getPlan(b.planId);

  document.getElementById("planChangeBusinessId").value=b.id;
  document.getElementById("planChangeTitle").textContent=`Plan · ${b.name}`;
  document.getElementById("planChangeCurrent").innerHTML=`
    <strong>${current?.name||"Sin plan"}</strong>
    <span>$${Number(current?.price||0).toFixed(2)}/mes · ${b.status||"Activo"}</span>`;

  const select=document.getElementById("planChangeSelect");
  select.innerHTML=(SaaS.db.plans||[])
    .filter(p=>p.active!==false)
    .map(p=>`<option value="${p.id}" ${p.id===b.planId?"selected":""}>${p.name} — $${Number(p.price||0).toFixed(2)}/mes</option>`)
    .join("");

  SaaS.renderPlanChangePreview();
  const modal=document.getElementById("planChangeModal");
  modal?.classList.remove("hidden");
  modal?.classList.add("open");
};

SaaS.closePlanChange=function(){
  const modal=document.getElementById("planChangeModal");
  if(!modal)return;
  modal.classList.remove("open");
  modal.classList.add("hidden");
};

SaaS.renderPlanChangePreview=function(){
  const id=document.getElementById("planChangeSelect")?.value;
  const plan=SaaS.getPlan(id);
  const box=document.getElementById("planChangePreview");
  if(!box||!plan)return;

  const pages=SaaS.planFeaturePages(plan);
  const named=(plan.features||[]).join(" · ");
  const isTrial=Number(plan.price||0)<=0 || /prueba|trial/i.test(plan.name||"");

  box.innerHTML=`
    <div class="plan-change-preview-head">
      <div><strong>${plan.name}</strong><span>$${Number(plan.price||0).toFixed(2)}/mes</span></div>
      <span class="status ${isTrial?"trial":"ok"}">${isTrial?"Prueba":"Plan activo"}</span>
    </div>
    <p>${named||"Configuración comercial del plan."}</p>
    <small>${pages.includes("*")?"Acceso completo a módulos Business.":`Módulos incluidos según la matriz ${plan.name}.`}</small>`;
};

SaaS.savePlanChange=function(){
  const businessId=document.getElementById("planChangeBusinessId")?.value;
  const newPlanId=document.getElementById("planChangeSelect")?.value;
  const b=SaaS.db.businesses.find(x=>x.id===businessId);
  const nextPlan=SaaS.getPlan(newPlanId);
  if(!b||!nextPlan)return alert("No se pudo identificar el negocio o el plan.");

  const oldPlan=SaaS.getPlan(b.planId);
  if(oldPlan?.id===nextPlan.id){
    SaaS.closePlanChange();
    return window.App?.toast?.("El negocio ya tiene ese plan");
  }

  const oldPlanId=b.planId;
  const oldPlanName=oldPlan?.name||"Sin plan";
  const now=new Date();
  const isTrial=Number(nextPlan.price||0)<=0 || /prueba|trial/i.test(nextPlan.name||"");

  b.planHistory=Array.isArray(b.planHistory)?b.planHistory:[];
  b.planHistory.push({
    id:SaaS.uid(),
    fromPlanId:oldPlanId,
    fromPlanName:oldPlanName,
    toPlanId:nextPlan.id,
    toPlanName:nextPlan.name,
    changedAt:now.toISOString(),
    changedBy:SaaS.session?.user?.email||"SuperAdmin"
  });

  b.planId=nextPlan.id;

  // Preserve an explicit suspension. Otherwise the plan determines the normal account state.
  if(b.status!=="Suspendido"){
    b.status=isTrial?"Prueba":"Activo";
  }

  if(isTrial){
    const end=new Date();
    end.setDate(end.getDate()+SaaS.planTrialDays(nextPlan));
    b.nextPayment=end.toISOString().slice(0,10);
  }else{
    const currentDue=b.nextPayment?new Date(b.nextPayment+"T12:00:00"):null;
    if(!currentDue || Number.isNaN(currentDue.getTime()) || currentDue<now){
      const due=new Date();
      due.setMonth(due.getMonth()+1);
      b.nextPayment=due.toISOString().slice(0,10);
    }
  }

  const sub=SaaS.subscriptionForBusiness(b.id);
  if(sub){
    sub.planHistory=Array.isArray(sub.planHistory)?sub.planHistory:[];
    sub.planHistory.push({
      id:SaaS.uid(),
      fromPlanId:oldPlanId,
      fromPlanName:oldPlanName,
      toPlanId:nextPlan.id,
      toPlanName:nextPlan.name,
      changedAt:now.toISOString()
    });
    sub.planId=nextPlan.id;
    sub.planName=nextPlan.name;
    sub.price=Number(nextPlan.price||0);
    sub.amount=Number(nextPlan.price||0);
    sub.status=b.status==="Suspendido"?"Suspended":isTrial?"Trial":"Active";
    sub.nextDue=b.nextPayment||"";
    sub.renewalDate=b.nextPayment||"";
  }

  SaaS.save();
  SaaS.audit?.("SUBSCRIPTION","Cambio de plan",{
    fromPlanId:oldPlanId,
    fromPlanName:oldPlanName,
    toPlanId:nextPlan.id,
    toPlanName:nextPlan.name,
    price:Number(nextPlan.price||0)
  },b.id);

  SaaS.closePlanChange();
  SaaS.ensureSubscriptionRecords?.();
  SaaS.renderAll?.();
  SaaS.applyPlanUI?.();

  window.App?.toast?.(`${b.name}: ${oldPlanName} → ${nextPlan.name}`);
};

SaaS.applyPlanUI=function(){
  const role=String(SaaS.session?.role||"").toLowerCase();
  const isSuper=role==="superadmin" || window.SaaSAuthAdmin?.isSuperAdmin?.();

  document.querySelectorAll(".nav-business[data-page]").forEach(btn=>{
    const allowed=isSuper ? true : SaaS.featureAllowed(btn.dataset.page);
    btn.hidden=!allowed;
    btn.classList.toggle("plan-hidden",!allowed);
    btn.disabled=false;
    btn.removeAttribute("title");
    if(!allowed){
      btn.setAttribute("aria-hidden","true");
      btn.setAttribute("tabindex","-1");
    }else{
      btn.removeAttribute("aria-hidden");
      btn.removeAttribute("tabindex");
    }
  });

  SaaS.renderCurrentPlanBadge?.();
};


SaaS.renewBusiness=function(id,months=1){
  const b=SaaS.db.businesses.find(x=>x.id===id);if(!b)return;
  const sub=SaaS.subscriptionForBusiness(id);
  const raw=sub?.nextDue||sub?.renewalDate||b.nextPayment||"";
  const base=raw&&new Date(raw+"T12:00:00")>new Date()?new Date(raw+"T12:00:00"):new Date();
  base.setMonth(base.getMonth()+months);
  const next=base.toISOString().slice(0,10);

  b.nextPayment=next;
  b.status="Activo";

  if(sub){
    sub.nextDue=next;
    sub.renewalDate=next;
    sub.status="Active";
    sub.paymentHistory=sub.paymentHistory||[];
    sub.paymentHistory.push({
      id:SaaS.uid(),
      months,
      at:new Date().toISOString(),
      amount:Number(sub.price||sub.amount||SaaS.getPlan(b.planId)?.price||0)*months
    });
  }

  b.paymentHistory=b.paymentHistory||[];
  b.paymentHistory.push({
    id:SaaS.uid(),
    months,
    at:new Date().toISOString(),
    planId:b.planId,
    amount:Number(SaaS.getPlan(b.planId)?.price||0)*months
  });

  SaaS.save();
  SaaS.audit?.("SUBSCRIPTION","Suscripción renovada",{months,next},id);
  SaaS.renderAll();
  window.App?.toast?.(`Suscripción renovada ${months} mes(es)`);
};

SaaS.suspendBusiness=function(id){
  const b=SaaS.db.businesses.find(x=>x.id===id);if(!b)return;
  const sub=SaaS.subscriptionForBusiness(id);
  const suspending=b.status!=="Suspendido";

  b.status=suspending?"Suspendido":"Activo";
  if(sub)sub.status=suspending?"Suspended":"Active";

  SaaS.save();
  SaaS.audit?.("SUBSCRIPTION",suspending?"Suscripción suspendida":"Suscripción reactivada",{},id);
  SaaS.renderAll();
};

SaaS.installPlanGuard=function(){
  const A=window.App;if(!A||A.__planGuard)return;
  const old=A.go.bind(A);

  A.go=function(page){
    const role=String(SaaS.session?.role||"").toLowerCase();
    const isSuper=role==="superadmin" || window.SaaSAuthAdmin?.isSuperAdmin?.();
    if(isSuper)return old(page);

    const businessPages=new Set([
      "inicio","citas","clientes","barberos","servicios","configuracion","clienteConfig",
      "caja","inventario","usuarios","recibos","autorizaciones","reportes"
    ]);

    if(businessPages.has(page) && !SaaS.featureAllowed(page)){
      A.toast?.("Esta función no está incluida en tu plan actual");
      return old("inicio");
    }
    return old(page);
  };
  A.__planGuard=true;
};


/* FASE 20.6: Suscripciones siempre se renderizan con el resto del SuperAdmin. */
const oldRenderAll_206=SaaS.renderAll;
SaaS.renderAll=function(){
  const r=oldRenderAll_206();
  SaaS.ensureSubscriptionRecords();
  SaaS.renderSubscriptions();
  return r;
};


/* ===== FASE 20.20 — PLAN VISIBLE EN BUSINESS ===== */
SaaS.renderCurrentPlanBadge=function(){
  const badge=document.getElementById("currentBusinessPlanBadge");
  if(!badge)return;

  const role=String(SaaS.session?.role||"").toLowerCase();
  if(role==="superadmin"){
    badge.classList.add("hidden");
    return;
  }

  const b=SaaS.currentBusiness?.();
  const p=SaaS.getPlan?.(b?.planId);
  if(!b||!p){
    badge.classList.add("hidden");
    return;
  }

  badge.classList.remove("hidden");
  badge.textContent=`PLAN ${String(p.name||"").toUpperCase()}`;
  badge.dataset.planId=p.id||"";
};

SaaS.planMenuSummary=function(){
  const b=SaaS.currentBusiness?.();
  const p=SaaS.getPlan?.(b?.planId);
  if(!b||!p)return null;
  const visible=[...document.querySelectorAll(".nav-business[data-page]")].filter(x=>!x.hidden);
  return {business:b.name,plan:p.name,count:visible.length,pages:visible.map(x=>x.dataset.page)};
};
