/* SAMBRIX · Guardas finales de acciones de producción */
(function(){
  const A=window.App,S=window.SaaS;if(!A||A.__productionActionGuards)return;
  const deny=msg=>{A.toast?.(msg||'No tienes permiso para realizar esta acción');return false};
  const pageAllowed=page=>{if(!S)return true;const role=S.normalizeRole?.(S.session?.role)||S.session?.role||'guest';return role!=='guest'&&S.pageAllowed?.(page)!==false};
  const domainAllowed=domain=>{if(!S)return true;const role=S.normalizeRole?.(S.session?.role)||S.session?.role||'guest';if(role==='guest')return false;return typeof S.canWriteDomain==='function'?S.canWriteDomain(domain):true};
  const cloudReady=()=>{if(!window.FirebaseBridge?.connected)return true;return window.SaaSCloudProduction?.isTenantReady?.()!==false};
  function wrap(name,{page,domain,before}={}){const base=A[name];if(typeof base!=='function')return;A[name]=function(){if(page&&!pageAllowed(page))return deny();if(domain&&!domainAllowed(domain))return deny();if(!cloudReady())return deny('Espera a que SAMBRIX termine de sincronizar el negocio');const ok=before?.apply(this,arguments);if(ok===false)return false;return base.apply(this,arguments)}}

  wrap('editAppointment',{page:'citas',domain:'schedule',before:function(id){const a=(A.db?.appointments||[]).find(x=>x.id===id);if(a?.status==='Finalizada')return deny('Una cita finalizada queda bloqueada para proteger el cobro y el recibo')}});
  wrap('deleteAppointment',{page:'citas',domain:'schedule'});wrap('confirmAppointment2032',{page:'citas',domain:'schedule'});wrap('rejectAppointment2032',{page:'citas',domain:'schedule'});wrap('approveClientRequest',{page:'citas',domain:'schedule'});wrap('rejectClientRequest',{page:'citas',domain:'schedule'});

  // Horarios de profesionales viven en config (barbers), no en schedule (appointments).
  wrap('openSchedule',{page:'barberos'});wrap('saveSchedule',{page:'barberos',domain:'config'});wrap('addScheduleBlock',{page:'barberos',domain:'config'});wrap('removeScheduleBlock',{page:'barberos',domain:'config'});

  wrap('saveClient',{page:'clientes',domain:'crm'});wrap('deleteClient',{page:'clientes',domain:'crm'});
  wrap('saveService',{page:'servicios',domain:'config'});wrap('deleteService',{page:'servicios',domain:'config'});
  wrap('saveProduct',{page:'inventario',domain:'inventory'});wrap('deleteProduct',{page:'inventario',domain:'inventory'});wrap('addStockMove',{page:'inventario',domain:'inventory'});
  wrap('saveCash',{page:'caja',domain:'finance'});wrap('addCash',{page:'caja',domain:'finance'});wrap('deleteCash',{page:'caja',domain:'finance'});
  wrap('saveEmployee',{page:'personal',domain:'staff'});wrap('clockIn',{page:'asistencia',domain:'attendance'});wrap('clockOut',{page:'asistencia',domain:'attendance'});wrap('saveAbsence',{page:'ausenciasPersonal',domain:'attendance'});

  const oldRender=A.renderAppointments;if(typeof oldRender==='function'){A.renderAppointments=function(){const r=oldRender.apply(this,arguments);(A.db?.appointments||[]).filter(a=>a.status==='Finalizada').forEach(a=>{document.querySelectorAll(`[onclick="App.editAppointment('${a.id}')"]`).forEach(btn=>btn.remove())});return r}};
  A.__productionActionGuards=true;
})();