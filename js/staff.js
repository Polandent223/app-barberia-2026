App.defaultSchedule=function(){
  return [
    {day:0,name:"Domingo",active:false,start:"09:00",end:"19:00"},
    {day:1,name:"Lunes",active:true,start:"09:00",end:"19:00"},
    {day:2,name:"Martes",active:true,start:"09:00",end:"19:00"},
    {day:3,name:"Miércoles",active:true,start:"09:00",end:"19:00"},
    {day:4,name:"Jueves",active:true,start:"09:00",end:"19:00"},
    {day:5,name:"Viernes",active:true,start:"09:00",end:"19:00"},
    {day:6,name:"Sábado",active:true,start:"09:00",end:"19:00"}
  ];
};

App.ensureStaff=function(){
  App.db.employees=App.db.employees||[];
  App.db.attendance=App.db.attendance||[];
  App.db.barbers.forEach(b=>{
    if(!App.db.employees.some(e=>e.barberId===b.id)){
      App.db.employees.push({
        id:App.uid(),barberId:b.id,name:b.name,role:"Barbero",phone:b.phone||"",pin:"1234",
        serviceCommission:Number(b.commission||40),productCommission:0,monthlyGoal:500,weeklyGoal:125,active:true,
        photo:App.db.business.clientApp.barberPhotos?.[b.id]||"",schedule:App.defaultSchedule()
      });
    }
  });
};

App.saveEmployee=function(){
  const id=App.val("employeeEditId");
  const data={
    name:App.val("employeeName"),
    role:App.val("employeeRole"),
    phone:App.val("employeePhone"),
    pin:App.val("employeePin")||"1234",
    serviceCommission:Number(App.val("employeeServiceCommission")||0),
    productCommission:Number(App.val("employeeProductCommission")||0),
    monthlyGoal:Number(App.val("employeeMonthlyGoal")||0),weeklyGoal:Number(App.val("employeeMonthlyGoal")||0)/4,
    active:App.val("employeeActive")==="true"
  };
  if(!data.name)return App.toast("Escribe el nombre");

  const finish=photo=>{
    if(id){
      const e=App.db.employees.find(x=>x.id===id);Object.assign(e,data);if(photo)e.photo=photo;
      const b=App.db.barbers.find(x=>x.id===e.barberId);if(b){b.name=e.name;b.phone=e.phone;b.commission=e.serviceCommission}
    }else{
      let barberId="";
      if(data.role==="Barbero"){
        const b={id:App.uid(),name:data.name,phone:data.phone,commission:data.serviceCommission};App.db.barbers.push(b);barberId=b.id;
      }
      App.db.employees.push({id:App.uid(),barberId,...data,photo:photo||"",schedule:App.defaultSchedule()});
    }
    App.hide("employeeForm");App.byId("employeeEditId").value="";
    App.logAction(id?"Empleado editado":"Empleado creado","Personal",data.name);
    localStorage.setItem(App.KEY,JSON.stringify(App.db));window.FirebaseBridge?.scheduleImagePush?.();App.renderAll();App.toast("Empleado guardado");
  };
  const file=App.byId("employeePhoto").files[0];
  if(file)App.compressImageLocal(file,520,.78).then(finish).catch(()=>{App.toast("No se pudo procesar la foto");finish("")});else finish("");
};

App.editEmployee=function(id){
  const e=App.db.employees.find(x=>x.id===id);if(!e)return;
  App.show("employeeForm");
  App.byId("employeeEditId").value=e.id;
  App.byId("employeeName").value=e.name||"";
  App.byId("employeeRole").value=e.role||"Barbero";
  App.byId("employeePhone").value=e.phone||"";
  App.byId("employeePin").value=e.pin||"";
  App.byId("employeeServiceCommission").value=e.serviceCommission||0;
  App.byId("employeeProductCommission").value=e.productCommission||0;
  App.byId("employeeMonthlyGoal").value=e.monthlyGoal||0;
  App.byId("employeeActive").value=String(e.active!==false);
};

App.deleteEmployee=function(id){
  if(!App.isAdmin())return App.toast("Solo el administrador puede eliminar empleados");
  const e=App.db.employees.find(x=>x.id===id);if(!e)return;
  App.confirmAction("Eliminar empleado",`Eliminar ${e.name}?`,()=>{
    if(e.barberId)App.db.barbers=App.db.barbers.filter(b=>b.id!==e.barberId);
    App.db.attendance=App.db.attendance.filter(a=>a.employeeId!==id);
    App.db.employees=App.db.employees.filter(x=>x.id!==id);
    App.logAction("Empleado eliminado","Personal",e.name);
    App.persist();
  });
};

App.staffPeriodPerformance=function(employeeId,from,to){
  const e=App.db.employees.find(x=>x.id===employeeId);
  if(!e)return {serviceSales:0,productSales:0,totalSales:0,commission:0,services:0,products:0};
  const sales=App.db.sales.filter(s=>s.date>=from&&s.date<=to && (!e.barberId || s.barberName===App.barberName(e.barberId)));
  let serviceSales=0,productSales=0,services=0,products=0;
  sales.forEach(s=>(s.items||[]).forEach(i=>{
    if(i.type==="Producto"){productSales+=Number(i.total||0);products+=Number(i.qty||1)}
    else{serviceSales+=Number(i.total||0);services+=Number(i.qty||1)}
  }));
  const commission=serviceSales*Number(e.serviceCommission||0)/100 + productSales*Number(e.productCommission||0)/100;
  return {serviceSales,productSales,totalSales:serviceSales+productSales,commission,services,products};
};

App.renderEmployees=function(){
  if(!App.byId("employeeList"))return;
  const from=App.today().slice(0,8)+"01",to=App.today();
  App.byId("employeeList").innerHTML=App.db.employees.map(e=>{
    const p=App.staffPeriodPerformance(e.id,from,to),goal=Number(e.monthlyGoal||0),pct=goal?Math.min(100,p.totalSales/goal*100):0;
    return `<article class="card employee-card">
      <img src="${e.photo||""}" alt="${e.name}">
      <div class="inside">
        <span class="staff-badge">${e.role}</span>
        <h3>${e.name}</h3>
        <div class="muted">${e.phone||"Sin teléfono"}</div>
        <div class="big">${App.money(p.totalSales)}</div>
        <div class="goal-bar"><span style="width:${pct}%"></span></div>
        <div class="muted">${pct.toFixed(0)}% de meta · Comisión ${App.money(p.commission)}</div>
        <div class="manage-actions"><button class="btn edit" onclick="App.editEmployee('${e.id}')">Editar</button><button class="btn danger" onclick="App.deleteEmployee('${e.id}')">Eliminar</button></div>
      </div>
    </article>`;
  }).join("")||'<div class="muted">Sin empleados.</div>';
};

App.fillStaffSelects=function(){
  const opts=App.db.employees.filter(e=>e.active!==false).map(e=>`<option value="${e.id}">${e.name} · ${e.role}</option>`).join("");
  ["attendanceEmployee","scheduleEmployee","historyEmployee"].forEach(id=>{const el=App.byId(id);if(el)el.innerHTML=opts});
};

App.parseHours=function(t){const [h,m]=String(t||"00:00").split(":").map(Number);return h*60+m};
App.workedHours=function(a){
  if(!a.in)return 0;
  const end=a.out||new Date().toTimeString().slice(0,5);
  return Math.max(0,(App.parseHours(end)-App.parseHours(a.in))/60);
};
App.scheduleForDate=function(e,date){
  const day=new Date(date+"T12:00:00").getDay();
  return (e.schedule||App.defaultSchedule()).find(x=>x.day===day);
};

App.clockIn=function(){
  const e=App.db.employees.find(x=>x.id===App.val("attendanceEmployee"));if(!e)return;
  if(String(e.pin)!==String(App.val("attendancePin")))return App.toast("PIN incorrecto");
  if(App.db.attendance.some(a=>a.employeeId===e.id&&a.date===App.today()&&!a.out))return App.toast("Ya existe una entrada abierta");
  const time=new Date().toTimeString().slice(0,5),sch=App.scheduleForDate(e,App.today());
  const late=!!(sch?.active && App.parseHours(time)>App.parseHours(sch.start)+5);
  App.db.attendance.push({id:App.uid(),employeeId:e.id,date:App.today(),in:time,out:"",late});
  App.logAction("Entrada marcada","Asistencia",`${e.name} · ${time}`);
  localStorage.setItem(App.KEY,JSON.stringify(App.db));App.renderAll();App.toast(late?"Entrada registrada con retardo":"Entrada registrada");
};
App.clockOut=function(){
  const e=App.db.employees.find(x=>x.id===App.val("attendanceEmployee"));if(!e)return;
  if(String(e.pin)!==String(App.val("attendancePin")))return App.toast("PIN incorrecto");
  const a=[...App.db.attendance].reverse().find(x=>x.employeeId===e.id&&x.date===App.today()&&!x.out);
  if(!a)return App.toast("No hay entrada abierta");
  a.out=new Date().toTimeString().slice(0,5);
  App.logAction("Salida marcada","Asistencia",`${e.name} · ${a.out}`);
  localStorage.setItem(App.KEY,JSON.stringify(App.db));App.renderAll();App.toast("Salida registrada");
};

App.renderAttendance=function(){
  if(!App.byId("attendanceTodayList"))return;
  App.fillStaffSelects();
  const arr=App.db.attendance.filter(a=>a.date===App.today());
  App.byId("attendanceWorking").textContent=arr.filter(a=>!a.out).length;
  App.byId("attendanceEntries").textContent=arr.length;
  App.byId("attendanceLate").textContent=arr.filter(a=>a.late).length;
  App.byId("attendanceHours").textContent=arr.reduce((s,a)=>s+App.workedHours(a),0).toFixed(1);
  App.byId("attendanceTodayList").innerHTML=arr.map(a=>{
    const e=App.db.employees.find(x=>x.id===a.employeeId);
    return `<div class="row"><div><strong>${e?.name||"Empleado"}</strong><small>Entrada ${a.in} · Salida ${a.out||"Trabajando"} · ${App.workedHours(a).toFixed(1)} h</small></div><span class="${a.late?"attendance-late":a.out?"attendance-good":"attendance-open"}">${a.late?"Retardo":a.out?"Completo":"Activo"}</span></div>`;
  }).join("")||'<div class="muted">Sin marcaciones hoy.</div>';
};

App.renderScheduleEditor=function(){
  const box=App.byId("scheduleEditor");if(!box)return;
  App.fillStaffSelects();
  const e=App.db.employees.find(x=>x.id===App.val("scheduleEmployee"))||App.db.employees[0];
  if(!e){box.innerHTML='<div class="muted">Sin empleados.</div>';return}
  e.schedule=e.schedule||App.defaultSchedule();
  box.innerHTML=`<h3>${e.name}</h3>${e.schedule.map((d,i)=>`
    <div class="schedule-row">
      <strong>${d.name}</strong>
      <label>Entrada<input type="time" value="${d.start}" onchange="App.updateSchedule('${e.id}',${i},'start',this.value)"></label>
      <label>Salida<input type="time" value="${d.end}" onchange="App.updateSchedule('${e.id}',${i},'end',this.value)"></label>
      <label><input type="checkbox" style="width:auto" ${d.active?"checked":""} onchange="App.updateSchedule('${e.id}',${i},'active',this.checked)"> Trabaja</label>
    </div>`).join("")}`;
};
App.updateSchedule=function(id,i,key,val){
  const e=App.db.employees.find(x=>x.id===id);if(!e)return;
  e.schedule=e.schedule||App.defaultSchedule();e.schedule[i][key]=val;
  localStorage.setItem(App.KEY,JSON.stringify(App.db));
};

App.renderStaffPerformance=function(){
  if(!App.byId("staffRanking"))return;
  const from=App.val("staffReportFrom")||App.today().slice(0,8)+"01",to=App.val("staffReportTo")||App.today();
  const data=App.db.employees.filter(e=>e.active!==false).map(e=>({e,p:App.staffPeriodPerformance(e.id,from,to)})).sort((a,b)=>b.p.totalSales-a.p.totalSales);
  App.byId("staffRanking").innerHTML=data.map((x,i)=>`<div class="row"><div style="display:flex;align-items:center;gap:10px"><span class="rank-number">${i+1}</span><div><strong>${x.e.name}</strong><small>${x.p.services} servicios · ${x.p.products} productos</small></div></div><strong>${App.money(x.p.totalSales)}</strong></div>`).join("")||'<div class="muted">Sin datos.</div>';
  App.byId("staffCommissions").innerHTML=data.map(x=>`<div class="row"><div><strong>${x.e.name}</strong><small>Servicios ${App.money(x.p.serviceSales)} · Productos ${App.money(x.p.productSales)}</small></div><strong>${App.money(x.p.commission)}</strong></div>`).join("")||'<div class="muted">Sin datos.</div>';
  App.byId("staffPerformanceCards").innerHTML=data.map(x=>{const goal=Number(x.e.monthlyGoal||0),pct=goal?Math.min(100,x.p.totalSales/goal*100):0;return `<article class="card employee-card"><img src="${x.e.photo||""}"><div class="inside"><h3>${x.e.name}</h3><div class="big">${App.money(x.p.totalSales)}</div><div class="goal-bar"><span style="width:${pct}%"></span></div><div class="muted">${pct.toFixed(0)}% de meta · Comisión ${App.money(x.p.commission)}</div></div></article>`}).join("");
};

App.renderEmployeeHistory=function(){
  if(!App.byId("employeeAttendanceHistory"))return;
  App.fillStaffSelects();
  const e=App.db.employees.find(x=>x.id===App.val("historyEmployee"))||App.db.employees[0];
  if(!e)return;
  const from=App.val("historyFrom")||App.today().slice(0,8)+"01",to=App.val("historyTo")||App.today();
  const att=App.db.attendance.filter(a=>a.employeeId===e.id&&a.date>=from&&a.date<=to);
  App.byId("employeeAttendanceHistory").innerHTML=att.map(a=>`<div class="row"><div><strong>${a.date}</strong><small>${a.in} - ${a.out||"Abierto"} · ${App.workedHours(a).toFixed(1)} h</small></div><span class="${a.late?"attendance-late":"attendance-good"}">${a.late?"Retardo":"Puntual"}</span></div>`).join("")||'<div class="muted">Sin asistencia.</div>';

  const p=App.staffPeriodPerformance(e.id,from,to);
  App.byId("employeeSalesHistory").innerHTML=`<div class="row"><strong>Servicios</strong><strong>${App.money(p.serviceSales)}</strong></div><div class="row"><strong>Productos</strong><strong>${App.money(p.productSales)}</strong></div><div class="row"><strong>Servicios realizados</strong><strong>${p.services}</strong></div><div class="row"><strong>Productos vendidos</strong><strong>${p.products}</strong></div>`;
  const hours=att.reduce((s,a)=>s+App.workedHours(a),0);
  App.byId("employeePaySummary").innerHTML=`<h2>${e.name}</h2><p>${e.role}</p><div class="row"><strong>Periodo</strong><strong>${from} a ${to}</strong></div><div class="row"><strong>Horas trabajadas</strong><strong>${hours.toFixed(1)} h</strong></div><div class="row"><strong>Ventas generadas</strong><strong>${App.money(p.totalSales)}</strong></div><div class="row"><strong>Comisión a pagar</strong><strong>${App.money(p.commission)}</strong></div>`;
};

App.printEmployeePay=function(){
  const box=App.byId("employeePaySummary");if(!box)return;
  const w=window.open("","_blank","width=600,height=760");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Resumen de pago</title><style>body{font-family:Arial;padding:28px}.row{display:flex;justify-content:space-between;border-bottom:1px solid #ddd;padding:10px 0}</style></head><body>${box.innerHTML}<script>window.onload=()=>window.print()<\/script></body></html>`);
  w.document.close();
};

/* ===== FASE 11.1 EXTENSION ===== */
App.fillAdvancedStaffSelects=function(){
  const opts=App.db.employees.filter(e=>e.active!==false).map(e=>`<option value="${e.id}">${e.name}</option>`).join("");
  ["absenceEmployee","payrollEmployee"].forEach(id=>{const el=App.byId(id);if(el)el.innerHTML=opts});
};

App.saveAbsence=function(){
  const employeeId=App.val("absenceEmployee"),from=App.val("absenceFrom"),to=App.val("absenceTo")||from;
  if(!employeeId||!from)return App.toast("Completa empleado y fecha");
  const e=App.db.employees.find(x=>x.id===employeeId);
  App.db.absences.push({
    id:App.uid(),employeeId,type:App.val("absenceType"),from,to,note:App.val("absenceNote"),createdAt:new Date().toISOString()
  });
  App.logAction("Ausencia registrada","Personal",`${e?.name||"Empleado"} · ${App.val("absenceType")} · ${from} a ${to}`);
  localStorage.setItem(App.KEY,JSON.stringify(App.db));
  App.renderAll();App.toast("Ausencia guardada");
};
App.deleteAbsence=function(id){
  if(!App.isAdmin())return App.toast("Solo administrador");
  App.confirmAction("Eliminar ausencia","¿Eliminar este registro?",()=>{
    App.db.absences=App.db.absences.filter(x=>x.id!==id);App.persist();
  });
};
App.renderAbsences=function(){
  if(!App.byId("absenceList"))return;
  App.fillAdvancedStaffSelects();
  const list=[...App.db.absences].sort((a,b)=>b.from.localeCompare(a.from));
  App.byId("absenceList").innerHTML=list.map(a=>{
    const e=App.db.employees.find(x=>x.id===a.employeeId);
    const cls=a.type==="Ausencia no justificada"?"unjustified":a.type==="Vacaciones"?"vacation":"";
    return `<div class="row absence-card ${cls}"><div><strong>${e?.name||"Empleado"} · ${a.type}</strong><small>${a.from}${a.to!==a.from?` a ${a.to}`:""}${a.note?` · ${a.note}`:""}</small></div><button class="btn danger" onclick="App.deleteAbsence('${a.id}')">Eliminar</button></div>`;
  }).join("")||'<div class="muted">Sin ausencias registradas.</div>';
};

App.countAbsenceDays=function(employeeId,from,to){
  let count=0;
  (App.db.absences||[]).filter(a=>a.employeeId===employeeId && a.to>=from && a.from<=to).forEach(a=>{
    const start=new Date((a.from<from?from:a.from)+"T12:00:00"), end=new Date((a.to>to?to:a.to)+"T12:00:00");
    count+=Math.max(1,Math.round((end-start)/86400000)+1);
  });
  return count;
};

App.renderPayroll=function(){
  if(!App.byId("payrollReceipt"))return;
  App.fillAdvancedStaffSelects();
  const e=App.db.employees.find(x=>x.id===App.val("payrollEmployee"))||App.db.employees[0];
  if(!e)return;
  const from=App.val("payrollFrom")||App.today().slice(0,8)+"01",to=App.val("payrollTo")||App.today();
  const att=App.db.attendance.filter(a=>a.employeeId===e.id&&a.date>=from&&a.date<=to);
  const hours=att.reduce((s,a)=>s+App.workedHours(a),0);
  const p=App.staffPeriodPerformance(e.id,from,to);
  const abs=App.countAbsenceDays(e.id,from,to);
  App.byId("payrollHours").textContent=hours.toFixed(1);
  App.byId("payrollSales").textContent=App.money(p.totalSales);
  App.byId("payrollCommission").textContent=App.money(p.commission);
  App.byId("payrollAbsences").textContent=abs;
  App.byId("payrollDetail").innerHTML=`
    <div class="row"><strong>Ventas de servicios</strong><strong>${App.money(p.serviceSales)}</strong></div>
    <div class="row"><strong>Ventas de productos</strong><strong>${App.money(p.productSales)}</strong></div>
    <div class="row"><strong>Servicios realizados</strong><strong>${p.services}</strong></div>
    <div class="row"><strong>Productos vendidos</strong><strong>${p.products}</strong></div>
    <div class="row"><strong>Retardos</strong><strong>${att.filter(a=>a.late).length}</strong></div>
    <div class="row"><strong>Días de ausencia</strong><strong>${abs}</strong></div>`;
  App.byId("payrollReceipt").innerHTML=`
    <h2>${e.name}</h2><p>${e.role}</p>
    <div class="row"><strong>Periodo</strong><strong>${from} a ${to}</strong></div>
    <div class="row"><strong>Horas</strong><strong>${hours.toFixed(1)} h</strong></div>
    <div class="row"><strong>Ventas generadas</strong><strong>${App.money(p.totalSales)}</strong></div>
    <div class="row"><strong>Comisión servicios (${e.serviceCommission||0}%)</strong><strong>${App.money(p.serviceSales*(e.serviceCommission||0)/100)}</strong></div>
    <div class="row"><strong>Comisión productos (${e.productCommission||0}%)</strong><strong>${App.money(p.productSales*(e.productCommission||0)/100)}</strong></div>
    <div class="row"><strong>Total comisión</strong><strong class="payroll-total">${App.money(p.commission)}</strong></div>`;
};

App.printPayroll=function(){
  const box=App.byId("payrollReceipt");if(!box)return;
  const w=window.open("","_blank","width=620,height=800");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Nómina</title><style>body{font-family:Arial;padding:30px}.row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #ddd}</style></head><body>${box.innerHTML}<script>window.onload=()=>window.print()<\/script></body></html>`);
  w.document.close();
};

const oldRenderStaffPerformance_111=App.renderStaffPerformance;
App.renderStaffPerformance=function(){
  oldRenderStaffPerformance_111();
  const from=App.val("staffReportFrom")||App.today().slice(0,8)+"01",to=App.val("staffReportTo")||App.today();
  if(App.byId("staffPerformanceCards")){
    App.byId("staffPerformanceCards").innerHTML=App.db.employees.filter(e=>e.active!==false).map(e=>{
      const p=App.staffPeriodPerformance(e.id,from,to),mg=Number(e.monthlyGoal||0),wg=Number(e.weeklyGoal||mg/4||0);
      const monthlyPct=mg?Math.min(100,p.totalSales/mg*100):0;
      const weeklyPct=wg?Math.min(100,p.totalSales/wg*100):0;
      return `<article class="card employee-card"><img src="${e.photo||""}"><div class="inside"><h3>${e.name}</h3><div class="big">${App.money(p.totalSales)}</div><div class="goal-split"><div class="goal-mini"><small>Meta semanal</small><strong>${App.money(wg)}</strong><div class="goal-bar"><span style="width:${weeklyPct}%"></span></div></div><div class="goal-mini"><small>Meta mensual</small><strong>${App.money(mg)}</strong><div class="goal-bar"><span style="width:${monthlyPct}%"></span></div></div></div><div class="muted">Comisión ${App.money(p.commission)}</div></div></article>`;
    }).join("");
  }
};
