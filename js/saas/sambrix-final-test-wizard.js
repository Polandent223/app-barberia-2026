SaaS.finalWizard=SaaS.finalWizard||{};
SaaS.FINAL_WIZARD_STEPS=[
 {id:"super_login",group:"super",title:"Entrar como SuperAdmin",detail:"Confirma que ves el panel general de SAMBRIX."},
 {id:"super_tenant",group:"super",title:"Entrar a un negocio desde SuperAdmin",detail:"Usa modo soporte y vuelve al panel central."},
 {id:"owner_login",group:"owner",title:"Entrar como dueño",detail:"El dueño solo debe ver y editar su negocio."},
 {id:"owner_data",group:"owner",title:"Crear datos de prueba",detail:"Crea un cliente, una cita y una venta."},
 {id:"owner_brand",group:"owner",title:"Comprobar marca e imagen",detail:"Cambia un dato visual y confirma persistencia."},
 {id:"client_public",group:"client",title:"Abrir reserva pública",detail:"Hazlo como si fueras un cliente del negocio."},
 {id:"client_booking",group:"client",title:"Enviar y gestionar una reserva",detail:"Confirma que llega al dueño y puede aprobarse."},
 {id:"sync_devices",group:"sync",title:"Probar dos dispositivos",detail:"Crea/cambia un dato en A y comprueba que aparece en B."},
 {id:"security_owner",group:"sync",title:"Intentar acceso indebido",detail:"Dueño/empleado no deben acceder a otro tenant ni al SuperAdmin."},
 {id:"firebase_rules",group:"sync",title:"Confirmar reglas Firebase",detail:"Marca este punto solo después de comprobar permisos reales."}
];
SaaS.loadFinalWizard=function(){try{SaaS.finalWizard=JSON.parse(localStorage.getItem("sambrix_final_wizard"))||{}}catch{SaaS.finalWizard={}}};
SaaS.saveFinalWizard=function(){localStorage.setItem("sambrix_final_wizard",JSON.stringify(SaaS.finalWizard))};
SaaS.toggleFinalWizard=function(e){
 const c=e.target;if(!c.matches(".finalWizardCheck"))return;
 SaaS.finalWizard[c.dataset.step]=c.checked;SaaS.saveFinalWizard();SaaS.renderFinalWizard();
};
SaaS.resetFinalWizard=function(){if(!confirm("¿Reiniciar todos los pasos de la prueba final?"))return;SaaS.finalWizard={};SaaS.saveFinalWizard();SaaS.renderFinalWizard()};
SaaS.renderFinalWizard=function(){
 const box=document.getElementById("finalWizardList");if(!box)return;
 const steps=SaaS.FINAL_WIZARD_STEPS,done=steps.filter(s=>SaaS.finalWizard[s.id]).length,pct=Math.round(done/steps.length*100);
 document.getElementById("wizardProgress").textContent=pct+"%";document.getElementById("wizardProgressBar").style.width=pct+"%";
 const groupDone=g=>steps.filter(s=>s.group===g).every(s=>SaaS.finalWizard[s.id]);
 document.getElementById("wizardSuper").textContent=groupDone("super")?"OK":"Pendiente";
 document.getElementById("wizardOwner").textContent=groupDone("owner")?"OK":"Pendiente";
 document.getElementById("wizardClient").textContent=groupDone("client")?"OK":"Pendiente";
 document.getElementById("wizardSync").textContent=groupDone("sync")?"OK":"Pendiente";
 box.innerHTML=steps.map((s,i)=>`<label class="row wizard-section"><div class="wizard-check"><input type="checkbox" class="finalWizardCheck" data-step="${s.id}" ${SaaS.finalWizard[s.id]?"checked":""}><div><strong>${i+1}. ${s.title}</strong><small>${s.detail}</small></div></div><span class="status ${SaaS.finalWizard[s.id]?"ok":""}">${SaaS.finalWizard[s.id]?"Aprobado":"Pendiente"}</span></label>`).join("");
 const result=document.getElementById("finalWizardResult");
 if(done===steps.length){result.className="launch-result ready";result.innerHTML='<span class="tag">ACEPTACIÓN COMPLETA</span><h2>SAMBRIX superó el recorrido final</h2><p>Todos los pasos fueron confirmados manualmente. Guarda evidencia antes de pasar a producción.</p>'}
 else{result.className="launch-result";result.innerHTML=`<span class="tag">PRUEBA PENDIENTE</span><h2>${done}/${steps.length} pasos confirmados</h2><p>No marques pasos por adelantado. Cada uno debe comprobarse en la aplicación real.</p>`}
};
const oldRenderAll_158=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_158();SaaS.renderFinalWizard()};
