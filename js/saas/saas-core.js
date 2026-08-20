
window.SaaS=window.SaaS||{};
SaaS.STORAGE_KEY="hc_saas_platform_v1";
SaaS.CONTEXT_KEY="hc_saas_context";
SaaS.seed={
  superAdmin:{id:"superadmin-1",name:"Super Administrador",email:"",role:"SuperAdmin"},
  plans:[
    {id:"plan-basic",name:"Básico",price:19,active:true,features:["Citas","Clientes","Barberos","App Cliente"]},
    {id:"plan-pro",name:"Pro",price:39,active:true,features:["Todo Básico","Caja","Inventario","Personal","Reportes"]},
    {id:"plan-premium",name:"Premium",price:69,active:true,features:["Todo Pro","Marca blanca","Sucursales","Soporte prioritario"]}
  ],
  businesses:[],supportAudit:[]
};
SaaS.load=function(){try{const r=localStorage.getItem(SaaS.STORAGE_KEY);SaaS.db=r?JSON.parse(r):JSON.parse(JSON.stringify(SaaS.seed))}catch{SaaS.db=JSON.parse(JSON.stringify(SaaS.seed))}SaaS.ensureCurrentBusiness()};
SaaS.save=function(){localStorage.setItem(SaaS.STORAGE_KEY,JSON.stringify(SaaS.db))};
SaaS.uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
SaaS.ensureCurrentBusiness=function(){
  if(!SaaS.db.businesses.length){
    const app=window.App,name=app?.db?.business?.name||"Barbería Los Hermanos Camejo";
    SaaS.db.businesses.push({id:"business-main",name,type:"Barbería",owner:"Propietario",ownerEmail:"",city:"",planId:"plan-pro",status:"Activo",nextPayment:"",createdAt:new Date().toISOString(),branches:[{id:"branch-main",name:"Principal",city:"",active:true}]});
    SaaS.save();
  }
  if(!localStorage.getItem(SaaS.CONTEXT_KEY)){const b=SaaS.db.businesses[0];SaaS.setContext({businessId:b.id,branchId:b.branches[0].id,support:false})}
};
SaaS.getContext=function(){try{return JSON.parse(localStorage.getItem(SaaS.CONTEXT_KEY))||{}}catch{return {}}};
SaaS.setContext=ctx=>localStorage.setItem(SaaS.CONTEXT_KEY,JSON.stringify(ctx));
SaaS.currentBusiness=function(){const c=SaaS.getContext();return SaaS.db.businesses.find(b=>b.id===c.businessId)||SaaS.db.businesses[0]};
SaaS.currentBranch=function(){const b=SaaS.currentBusiness(),c=SaaS.getContext();return b?.branches?.find(x=>x.id===c.branchId)||b?.branches?.[0]};
SaaS.getPlan=id=>SaaS.db.plans.find(p=>p.id===id);
SaaS.isSuperAdmin=()=>true;
SaaS.subscriptionActive=b=>["Activo","Prueba"].includes((b||SaaS.currentBusiness())?.status);
SaaS.applyTenantContext=function(){const A=window.App;if(!A?.db)return;const b=SaaS.currentBusiness(),br=SaaS.currentBranch();A.db.meta=A.db.meta||{};A.db.meta.businessId=b?.id||"";A.db.meta.branchId=br?.id||"";A.db.meta.businessType=b?.type||"";localStorage.setItem(A.KEY,JSON.stringify(A.db))};
SaaS.startSupport=function(id){const b=SaaS.db.businesses.find(x=>x.id===id);if(!b)return;const old=SaaS.getContext();SaaS.db.supportAudit.push({id:SaaS.uid(),businessId:b.id,businessName:b.name,action:"ENTER",at:new Date().toISOString()});SaaS.save();SaaS.setContext({businessId:b.id,branchId:b.branches?.[0]?.id||"",support:true,previous:old});SaaS.applyTenantContext();SaaS.renderSupportBanner();window.App?.toast?.(`Modo soporte: ${b.name}`)};
SaaS.exitSupport=function(){const c=SaaS.getContext(),b=SaaS.currentBusiness();if(c.support){SaaS.db.supportAudit.push({id:SaaS.uid(),businessId:b?.id||"",businessName:b?.name||"",action:"EXIT",at:new Date().toISOString()});SaaS.save();const p=c.previous||{businessId:SaaS.db.businesses[0]?.id,branchId:SaaS.db.businesses[0]?.branches?.[0]?.id,support:false};p.support=false;SaaS.setContext(p);SaaS.applyTenantContext()}SaaS.renderSupportBanner()};
SaaS.renderSupportBanner=function(){const b=document.getElementById("supportModeBanner");if(!b)return;const c=SaaS.getContext(),biz=SaaS.currentBusiness();b.classList.toggle("hidden",!c.support);const n=document.getElementById("supportModeBusinessName");if(n)n.textContent=biz?.name||""};
SaaS.guardSubscription=function(){const b=SaaS.currentBusiness();if(b&&["Suspendido","Vencido"].includes(b.status)){window.App?.toast?.("Suscripción no activa");return false}return true};

const SaaS_startSupport_original=SaaS.startSupport;
SaaS.startSupport=function(id){
  const b=SaaS.db.businesses.find(x=>x.id===id);if(!b)return;
  const old=SaaS.getContext();
  SaaS.db.supportAudit.push({id:SaaS.uid(),businessId:b.id,businessName:b.name,action:"ENTER",at:new Date().toISOString()});
  SaaS.save();
  SaaS.switchTenant(id,{support:true,previous:old});
  window.App?.toast?.(`Modo soporte: ${b.name}`);
};
SaaS.exitSupport=function(){
  const ctx=SaaS.getContext(),b=SaaS.currentBusiness();
  if(!ctx.support)return SaaS.renderSupportBanner();
  SaaS.db.supportAudit.push({id:SaaS.uid(),businessId:b?.id||"",businessName:b?.name||"",action:"EXIT",at:new Date().toISOString()});
  SaaS.save();
  const prev=ctx.previous||{};
  const target=prev.businessId||SaaS.db.businesses[0]?.id;
  SaaS.switchTenant(target,{branchId:prev.branchId,support:false});
};
