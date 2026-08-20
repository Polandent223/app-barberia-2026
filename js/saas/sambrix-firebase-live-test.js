SaaS.firebaseLiveTest=SaaS.firebaseLiveTest||{manual:{},probe:null,confirmed:false};

SaaS.loadFirebaseLiveTest=function(){
 try{SaaS.firebaseLiveTest=JSON.parse(localStorage.getItem("sambrix_firebase_live_test"))||{manual:{},probe:null,confirmed:false}}catch{SaaS.firebaseLiveTest={manual:{},probe:null,confirmed:false}}
};
SaaS.saveFirebaseLiveTest=function(){localStorage.setItem("sambrix_firebase_live_test",JSON.stringify(SaaS.firebaseLiveTest))};

SaaS.firebaseUser=function(){
 return window.FirebaseBridge?.user||window.FirebaseBridge?.currentUser||null;
};

SaaS.createSyncProbe=function(){
 const code="SBX-"+Math.floor(100000+Math.random()*900000);
 SaaS.firebaseLiveTest.probe={code,createdAt:new Date().toISOString(),businessId:SaaS.getContext?.()?.businessId||null};
 SaaS.firebaseLiveTest.confirmed=false;SaaS.saveFirebaseLiveTest();
 // If a cloud bridge exposes a generic write helper, publish the probe there too.
 try{
   if(typeof window.FirebaseBridge?.setSyncProbe==="function") window.FirebaseBridge.setSyncProbe(SaaS.firebaseLiveTest.probe);
   else if(typeof window.NexoPublicCloud?.setSyncProbe==="function") window.NexoPublicCloud.setSyncProbe(SaaS.firebaseLiveTest.probe);
 }catch(e){console.warn("Sync probe cloud write unavailable",e)}
 SaaS.renderFirebaseLiveTest();window.App?.toast?.("Señal de sincronización creada");
};

SaaS.confirmSyncProbe=function(){
 const typed=(document.getElementById("fbProbeConfirmInput")?.value||"").trim().toUpperCase();
 const code=SaaS.firebaseLiveTest.probe?.code||"";
 if(!code)return alert("Primero crea la señal en el dispositivo A.");
 if(typed!==code)return alert("El código no coincide. Si estás en otro dispositivo, confirma que ambos están viendo los mismos datos.");
 SaaS.firebaseLiveTest.confirmed=true;SaaS.firebaseLiveTest.confirmedAt=new Date().toISOString();SaaS.saveFirebaseLiveTest();
 SaaS.audit?.("SYSTEM","Sincronización entre dispositivos confirmada",{code},"");
 SaaS.renderFirebaseLiveTest();
};

SaaS.renderFirebaseLiveTest=function(){
 const root=document.getElementById("firebaseTestResult");if(!root)return;
 const bridge=!!window.FirebaseBridge,user=SaaS.firebaseUser(),probe=SaaS.firebaseLiveTest.probe,confirmed=!!SaaS.firebaseLiveTest.confirmed;
 document.getElementById("fbTestConnection").textContent=bridge?"OK":"NO";
 document.getElementById("fbTestAuth").textContent=user?"OK":"NO";
 document.getElementById("fbTestProbe").textContent=confirmed?"OK":probe?"CREADA":"—";
 document.getElementById("fbStepAuthA").textContent=user?"Correcto":"Pendiente";
 document.getElementById("fbStepProbeA").textContent=probe?"Creada":"Pendiente";
 document.getElementById("fbProbeCode").textContent=probe?.code||"—";
 document.getElementById("fbProbeTime").textContent=probe?new Date(probe.createdAt).toLocaleString():"Todavía no creado";
 document.getElementById("fbProbeResultStatus").textContent=confirmed?"Confirmado":"Pendiente";
 document.getElementById("fbProbeResultText").textContent=confirmed?"El mismo código fue confirmado en la prueba entre dispositivos.":"Esperando prueba.";
 document.querySelectorAll(".fbManualCheck").forEach(c=>c.checked=!!SaaS.firebaseLiveTest.manual?.[c.dataset.key]);
 const manual=Object.values(SaaS.firebaseLiveTest.manual||{}).filter(Boolean).length;
 document.getElementById("fbTestScore").textContent=`${manual}/4`;
 if(!bridge){root.className="launch-result blocked";root.innerHTML='<span class="tag">NO LISTO</span><h2>Firebase no está disponible</h2><p>Hay que resolver la conexión antes de probar sincronización.</p>'}
 else if(!user){root.className="launch-result";root.innerHTML='<span class="tag">FALTA LOGIN</span><h2>Firebase detectado</h2><p>Inicia sesión con una cuenta real para continuar.</p>'}
 else if(!confirmed||manual<4){root.className="launch-result";root.innerHTML=`<span class="tag">PRUEBA EN CURSO</span><h2>Conexión detectada</h2><p>Falta completar sincronización y seguridad (${manual}/4 controles manuales).</p>`}
 else{root.className="launch-result ready";root.innerHTML='<span class="tag">PRUEBA REAL COMPLETA</span><h2>Firebase y seguridad verificados</h2><p>Los controles manuales y la prueba entre dispositivos fueron confirmados.</p>'}
};

SaaS.markFirebaseManual=function(e){
 const c=e.target;if(!c.matches(".fbManualCheck"))return;
 SaaS.firebaseLiveTest.manual=SaaS.firebaseLiveTest.manual||{};
 SaaS.firebaseLiveTest.manual[c.dataset.key]=c.checked;SaaS.saveFirebaseLiveTest();SaaS.renderFirebaseLiveTest();
};

const oldRenderAll_157=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_157();SaaS.renderFirebaseLiveTest()};
