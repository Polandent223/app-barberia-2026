/* SAMBRIX · Guardas finales de acciones de producción */
(function(){
  const A=window.App,S=window.SaaS;
  if(!A||A.__productionActionGuards)return;

  const can=page=>!S?.session||S.session.role==='guest'||S.pageAllowed?.(page)!==false;
  const deny=msg=>{A.toast?.(msg||'No tienes permiso para realizar esta acción');return false};

  function wrap(name,page,before){
    const base=A[name];
    if(typeof base!=='function')return;
    A[name]=function(){
      if(!can(page))return deny();
      const ok=before?.apply(this,arguments);
      if(ok===false)return false;
      return base.apply(this,arguments);
    };
  }

  wrap('editAppointment','citas',function(id){
    const a=(A.db?.appointments||[]).find(x=>x.id===id);
    if(a?.status==='Finalizada')return deny('Una cita finalizada queda bloqueada para proteger el cobro y el recibo');
  });
  wrap('deleteAppointment','citas');
  wrap('confirmAppointment2032','citas');
  wrap('rejectAppointment2032','citas');

  wrap('openSchedule','barberos');
  wrap('saveSchedule','barberos');
  wrap('addScheduleBlock','barberos');
  wrap('removeScheduleBlock','barberos');

  wrap('approveClientRequest','citas');
  wrap('rejectClientRequest','citas');

  const oldRender=A.renderAppointments;
  if(typeof oldRender==='function'){
    A.renderAppointments=function(){
      const r=oldRender.apply(this,arguments);
      (A.db?.appointments||[]).filter(a=>a.status==='Finalizada').forEach(a=>{
        document.querySelectorAll(`[onclick="App.editAppointment('${a.id}')"]`).forEach(btn=>btn.remove());
      });
      return r;
    };
  }

  A.__productionActionGuards=true;
})();