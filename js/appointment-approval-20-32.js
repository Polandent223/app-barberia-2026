/* Compatibilidad temporal: la lógica activa vive en appointment-approval.js. */
(function(){
 if(window.__sambrixAppointmentApprovalLoaded)return;
 window.__sambrixAppointmentApprovalLoaded=true;
 const s=document.createElement('script');
 s.src='js/appointment-approval.js?v=1.0.12';
 s.onerror=()=>{window.__sambrixAppointmentApprovalLoaded=false;console.error('[SAMBRIX] No se pudo cargar appointment-approval.js')};
 document.head.appendChild(s);
})();