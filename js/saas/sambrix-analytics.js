SaaS.businessActivity=function(b){
 const t=SaaS.loadTenantState?.(b.id)||{};
 return {
   appointments:(t.appointments||[]).length,
   clients:(t.clients||[]).length,
   sales:(t.sales||[]).length,
   staff:(t.employees||t.barbers||[]).length,
   score:(t.appointments||[]).length+(t.sales||[]).length*2+(t.clients||[]).length
 };
};
SaaS.analyticsSnapshot=function(){
 const bs=SaaS.db.businesses||[];
 const licenses=bs.map(b=>({b,l:SaaS.licenseFor?.(b),a:SaaS.businessActivity(b)}));
 const paying=licenses.filter(x=>x.l&&!x.l.blocked);
 const mrr=paying.reduce((s,x)=>s+Number(x.l.plan?.price||0),0);
 const cancelled=bs.filter(b=>["Cancelado","Cancelada"].includes(b.status)).length;
 return {licenses,paying,mrr,arr:mrr*12,retention:bs.length?Math.round((bs.length-cancelled)/bs.length*100):100};
};
SaaS.renderAnalytics=function(){
 const root=document.getElementById("analyticsBusinessRanking");if(!root)return;
 const s=SaaS.analyticsSnapshot(),money=n=>SaaS.money?.(n)||("$"+Number(n).toFixed(2));
 document.getElementById("analyticsMRR").textContent=money(s.mrr);
 document.getElementById("analyticsARR").textContent=money(s.arr);
 document.getElementById("analyticsActiveBusinesses").textContent=s.paying.length;
 document.getElementById("analyticsRetention").textContent=s.retention+"%";

 const planCounts={};
 s.licenses.forEach(x=>{const name=x.l?.plan?.name||"Sin plan";planCounts[name]=(planCounts[name]||0)+1});
 const maxPlan=Math.max(1,...Object.values(planCounts));
 document.getElementById("analyticsPlanMix").innerHTML=Object.entries(planCounts).map(([name,count])=>`<div class="row"><div style="flex:1"><strong>${name}</strong><small>${count} negocio(s)</small><div class="analytics-bar"><i style="width:${count/maxPlan*100}%"></i></div></div><strong>${count}</strong></div>`).join("")||'<div class="muted">Sin datos.</div>';

 const states={Activa:0,"Por vencer":0,Vencida:0,Suspendida:0};
 s.licenses.forEach(x=>{const st=x.l?.state||"Activa";states[st]=(states[st]||0)+1});
 document.getElementById("analyticsHealth").innerHTML=Object.entries(states).map(([k,v])=>`<div class="row"><span>${k}</span><strong>${v}</strong></div>`).join("");

 const q=(document.getElementById("analyticsSearch")?.value||"").toLowerCase();
 const ranked=s.licenses.filter(x=>!q||`${x.b.name} ${x.b.owner||""}`.toLowerCase().includes(q)).sort((x,y)=>y.a.score-x.a.score);
 root.innerHTML=ranked.map((x,i)=>`<div class="row"><div class="analytics-rank">${i+1}</div><div style="flex:1"><strong>${x.b.name}</strong><small>${x.a.appointments} citas · ${x.a.clients} clientes · ${x.a.sales} ventas · ${x.a.staff} personal</small></div><strong>${x.a.score} pts</strong></div>`).join("");

 const recent=[...s.licenses].sort((x,y)=>new Date(y.b.createdAt||0)-new Date(x.b.createdAt||0)).slice(0,8);
 document.getElementById("analyticsGrowth").innerHTML=recent.map(x=>`<div class="row"><div><strong>${x.b.name}</strong><small>${x.b.createdAt?new Date(x.b.createdAt).toLocaleDateString():"Sin fecha"} · ${x.l?.plan?.name||"Sin plan"}</small></div><span class="status ok">Alta</span></div>`).join("");

 const risks=[];
 s.licenses.forEach(x=>{
   if(x.l?.state==="Vencida"||x.l?.state==="Suspendida")risks.push({b:x.b,msg:`Cuenta ${x.l.state.toLowerCase()}`,critical:true});
   else if(x.l?.state==="Por vencer")risks.push({b:x.b,msg:"Suscripción vence en 7 días o menos",critical:false});
   if(x.a.score===0)risks.push({b:x.b,msg:"Sin actividad registrada",critical:false});
 });
 document.getElementById("analyticsRisks").innerHTML=risks.slice(0,12).map(r=>`<div class="row analytics-risk ${r.critical?"critical":""}"><div><strong>${r.b.name}</strong><small>${r.msg}</small></div><button class="btn secondary tiny" onclick="SaaS.enterSupportMode?.('${r.b.id}')">Revisar</button></div>`).join("")||'<div class="muted">No se detectan riesgos importantes.</div>';
};
const oldRenderAll_151=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_151();SaaS.renderAnalytics()};
