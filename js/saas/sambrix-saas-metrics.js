SaaS.subscriptionMonthlyValue=function(sub){
 const raw=Number(sub?.price||sub?.amount||0);
 const cycle=String(sub?.cycle||sub?.billingCycle||"monthly").toLowerCase();
 if(cycle.includes("year")||cycle.includes("annual"))return raw/12;
 return raw;
};
SaaS.renderSaasMetrics=function(){
 const planBox=document.getElementById("metricsPlanList");if(!planBox)return;
 const businesses=SaaS.db.businesses||[];
 const subs=SaaS.db.subscriptions||[];
 const activeSubs=subs.filter(s=>!["Suspended","Suspendida","Cancelled","Cancelada"].includes(s.status));
 const mrr=activeSubs.reduce((s,x)=>s+SaaS.subscriptionMonthlyValue(x),0);
 const arr=mrr*12, arpu=activeSubs.length?mrr/activeSubs.length:0;
 const risks=businesses.map(b=>({b,status:SaaS.billingStatusFor?.(b.id)||{label:"Activa"}})).filter(x=>["Atrasada","Suspendida"].includes(x.status.label));
 document.getElementById("metricsMrr").textContent="$"+mrr.toFixed(2);
 document.getElementById("metricsArr").textContent="$"+arr.toFixed(2);
 document.getElementById("metricsArpu").textContent="$"+arpu.toFixed(2);
 document.getElementById("metricsRiskCount").textContent=risks.length;

 const groups={};
 activeSubs.forEach(s=>{const key=s.planName||s.planId||"Sin plan";groups[key]=(groups[key]||0)+1});
 planBox.innerHTML=Object.entries(groups).sort((a,b)=>b[1]-a[1]).map(([name,count])=>`<div class="row metrics-row"><div style="flex:1"><strong>${name}</strong><small>${count} suscripción(es)</small></div><b>${count}</b></div>`).join("")||'<div class="muted">No hay suscripciones activas.</div>';

 document.getElementById("metricsRiskList").innerHTML=risks.map(({b,status})=>`<div class="row metrics-row risk"><div><strong>${b.name}</strong><small>${status.label}</small></div></div>`).join("")||'<div class="row metrics-row"><div><strong>Sin riesgo comercial inmediato</strong><small>No hay atrasos o suspensiones detectadas.</small></div></div>';
};
SaaS.refreshSaasMetrics=function(){SaaS.renderSaasMetrics();SaaS.audit?.("BILLING","Métricas SaaS actualizadas",{},"")};
const oldRenderAll_195=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_195();SaaS.renderSaasMetrics();};
