SaaS.REVIEW_VISUAL=[
 {name:"Portada SAMBRIX",detail:"Nombre, marca y acceso se ven correctos."},
 {name:"SuperAdmin",detail:"Menú, negocios, soporte, cobros y paneles cargan sin superponerse."},
 {name:"Negocio",detail:"Abre un tenant y confirma que se entiende qué negocio está activo."},
 {name:"Cliente público",detail:"La portada/reserva pública se ve clara y con la marca correcta."},
 {name:"Móvil",detail:"Abre el paquete en un teléfono y revisa que botones/modales no se corten."}
];
SaaS.REVIEW_REAL=[
 {name:"Login Firebase real",detail:"SuperAdmin y dueño deben entrar con cuentas reales."},
 {name:"Aislamiento",detail:"Un dueño no debe ver otro negocio."},
 {name:"Sincronización",detail:"Crear una cita en un teléfono y verla en otro."},
 {name:"Imágenes",detail:"Subir/cambiar una imagen y verla desde otro dispositivo."},
 {name:"Reserva cliente",detail:"Reserva pública debe llegar al tenant correcto."},
 {name:"Reglas Firebase",detail:"Probar lecturas/escrituras permitidas y bloqueadas."}
];
SaaS.renderReviewGate=function(){
 const v=document.getElementById("reviewGateVisualList");if(!v)return;
 v.innerHTML=SaaS.REVIEW_VISUAL.map((x,i)=>`<div class="row review-row"><div class="diag-mark">${i+1}</div><div><strong>${x.name}</strong><small>${x.detail}</small></div></div>`).join("");
 document.getElementById("reviewGateRealList").innerHTML=SaaS.REVIEW_REAL.map((x,i)=>`<div class="row review-row pending"><div class="diag-mark">${i+1}</div><div><strong>${x.name}</strong><small>${x.detail}</small></div></div>`).join("");
 const result=document.getElementById("reviewGateResult");
 result.className="launch-result ready";
 result.innerHTML='<span class="tag">MOMENTO DE REVISAR</span><h2>La construcción base llegó a un punto estable</h2><p>Ahora corresponde una revisión visual y luego las pruebas reales de Firebase y dos dispositivos antes de seguir agregando funciones.</p>';
};
SaaS.refreshReviewGate=function(){SaaS.renderReviewGate();SaaS.audit?.("SYSTEM","Puerta de revisión recalculada",{},"")};
const oldRenderAll_196=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_196();SaaS.renderReviewGate();};
