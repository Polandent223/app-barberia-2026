/* Compatibilidad temporal: la lógica activa de agenda vive en agenda-scheduling.js. */
(function(){
 const A=window.App;if(!A)return;
 const load=()=>{
   if(window.__sambrixAgendaSchedulingLoaded)return;
   window.__sambrixAgendaSchedulingLoaded=true;
   const s=document.createElement('script');
   s.src='js/agenda-scheduling.js?v=1.0.11';
   s.onerror=()=>{window.__sambrixAgendaSchedulingLoaded=false;console.error('[SAMBRIX] No se pudo cargar agenda-scheduling.js')};
   document.head.appendChild(s);
 };
 load();
})();