/* Compatibilidad temporal: la lógica activa vive en client-accounts.js. */
(function(){
 if(window.__sambrixClientAccountsLoaded)return;
 window.__sambrixClientAccountsLoaded=true;
 const s=document.createElement('script');
 s.src='js/client-accounts.js?v=1.0.18';
 s.onerror=()=>{window.__sambrixClientAccountsLoaded=false;console.error('[SAMBRIX] No se pudo cargar client-accounts.js')};
 document.head.appendChild(s);
})();