SaaS.syncTest=SaaS.syncTest||{manual:{}};

SaaS.SYNC_MANUAL_STEPS=[
 {id:"appointment",title:"Cita nueva",detail:"Crear una cita en el dispositivo A y verla en el dispositivo B después de iniciar sesión."},
 {id:"public_booking",title:"Reserva de cliente",detail:"Enviar una reserva desde la vista cliente y comprobar que llegue al negocio correcto."},
 {id:"business_edit",title:"Cambio del negocio",detail:"Cambiar un dato visible del negocio y confirmar que el segundo dispositivo reciba el cambio."},
 {id:"image",title:"Imagen compartida",detail:"Subir o cambiar una imagen y comprobar que el segundo dispositivo pueda verla sin usar el archivo local del primero."},
 {id:"isolation",title:"Aislamiento entre negocios",detail:"Confirmar que un segundo negocio no vea citas, clientes ni configuración privada del primero."}
];

SaaS.loadSyncTest=function(){
 try{
  const saved=JSON.parse(localStorage.getItem("sambrix_sync_test"))||{};
  SaaS.syncTest={manual:saved.manual||{}};
 }catch{}
};

SaaS.saveSyncTest=function(){
 localStorage.setItem("sambrix_sync_test",JSON.stringify(SaaS.syncTest));
};

SaaS.syncTechnicalChecks=function(){
 const bridge=!!window.FirebaseBridge;
 const user=window.FirebaseBridge?.user||window.FirebaseBridge?.currentUser||null;
 const db=window.FirebaseBridge?.db||window.FirebaseBridge?.database||window.FirebaseBridge?.firestore||null;
 const businessId=SaaS.getContext?.()?.businessId||"";
 const localOnly=typeof localStorage!=="undefined";
 return [
  {name:"Firebase Bridge",status:bridge?"pass":"fail",detail:bridge?"FirebaseBridge cargado.":"No se detecta FirebaseBridge."},
  {name:"Sesión Firebase",status:user?"pass":"warn",detail:user?(user.email||user.uid||"Usuario autenticado"):"Inicia sesión para la prueba real."},
  {name:"Base Firebase disponible",status:db?"pass":"warn",detail:db?"Instancia de datos detectada.":"No se pudo confirmar una instancia de base de datos desde el bridge."},
  {name:"Tenant activo",status:businessId?"pass":"warn",detail:businessId||"Abre un negocio antes de probar."},
  {name:"Persistencia local",status:localOnly?"warn":"pass",detail:"localStorage existe; por sí solo NO demuestra sincronización entre teléfonos."}
 ];
};

SaaS.toggleSyncManual=function(e){
 const c=e.target;if(!c.matches(".syncManualCheck"))return;
 SaaS.syncTest.manual[c.dataset.step]=c.checked;
 SaaS.saveSyncTest();SaaS.renderSyncTest();
};

SaaS.resetSyncTest=function(){
 if(!confirm("¿Reiniciar la prueba de sincronización?"))return;
 SaaS.syncTest={manual:{}};SaaS.saveSyncTest();SaaS.renderSyncTest();
};

SaaS.renderSyncTest=function(){
 const techBox=document.getElementById("syncTechnicalChecks");if(!techBox)return;
 const checks=SaaS.syncTechnicalChecks();
 const steps=SaaS.SYNC_MANUAL_STEPS;
 const done=steps.filter(s=>SaaS.syncTest.manual?.[s.id]).length;
 const bridge=!!window.FirebaseBridge;
 const user=window.FirebaseBridge?.user||window.FirebaseBridge?.currentUser||null;

 document.getElementById("syncFirebaseState").textContent=bridge?"CARGADO":"NO";
 document.getElementById("syncDeviceAState").textContent=user?"LISTO":"PENDIENTE";
 document.getElementById("syncDeviceBState").textContent=done===steps.length?"CONFIRMADO":"PENDIENTE";
 document.getElementById("syncProgressState").textContent=`${done}/${steps.length}`;

 techBox.innerHTML=checks.map(c=>`<div class="row sync-check ${c.status}">
   <div class="diag-mark">${c.status==="pass"?"✓":c.status==="warn"?"!":"×"}</div>
   <div><strong>${c.name}</strong><small>${c.detail}</small></div>
 </div>`).join("");

 document.getElementById("syncManualChecks").innerHTML=steps.map((s,i)=>`<label class="row sync-check ${SaaS.syncTest.manual?.[s.id]?"":"warn"}">
   <div class="wizard-check"><input type="checkbox" class="syncManualCheck" data-step="${s.id}" ${SaaS.syncTest.manual?.[s.id]?"checked":""}>
   <div><strong>${i+1}. ${s.title}</strong><small>${s.detail}</small></div></div>
   <span class="status ${SaaS.syncTest.manual?.[s.id]?"ok":""}">${SaaS.syncTest.manual?.[s.id]?"OK":"Pendiente"}</span>
 </label>`).join("");

 const fail=checks.filter(c=>c.status==="fail").length;
 const result=document.getElementById("syncTestResult");
 if(fail){
  result.className="launch-result blocked";
  result.innerHTML=`<span class="tag">BLOQUEADO</span><h2>${fail} problema(s) técnico(s)</h2><p>No podemos validar sincronización real hasta corregirlos.</p>`;
 }else if(done<steps.length){
  result.className="launch-result";
  result.innerHTML=`<span class="tag">NO CONFIRMADO</span><h2>Sincronización todavía pendiente</h2><p>Faltan ${steps.length-done} prueba(s) entre dispositivos. Que funcione en un teléfono no demuestra sincronización.</p>`;
 }else{
  result.className="launch-result ready";
  result.innerHTML='<span class="tag">CONFIRMADO MANUALMENTE</span><h2>Pruebas entre dispositivos completadas</h2><p>Los cinco escenarios fueron marcados como verificados durante la prueba real.</p>';
 }
};

SaaS.refreshSyncTest=function(){
 SaaS.renderSyncTest();
 SaaS.audit?.("QA","Prueba de sincronización revisada",{completed:SaaS.SYNC_MANUAL_STEPS.filter(s=>SaaS.syncTest.manual?.[s.id]).length},"");
};

const oldRenderAll_174=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_174();SaaS.renderSyncTest();};
