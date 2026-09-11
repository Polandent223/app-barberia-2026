/* SAMBRIX · Personal: seguridad, permisos y persistencia de producción */
(function(){
  const A=window.App;
  if(!A)return;

  const persist=()=>{
    if(typeof A.persist==="function")A.persist();
    else localStorage.setItem(A.KEY,JSON.stringify(A.db));
  };
  const cleanPin=v=>String(v||"").replace(/\D/g,"").slice(0,6);
  const validPin=v=>/^\d{6}$/.test(String(v||""));
  const can=page=>!window.SaaS||window.SaaS.session?.role==="superadmin"||window.SaaS.pageAllowed?.(page);
  const deny=()=>A.toast("Tu rol no tiene permiso para realizar esta acción");

  function configurePinInputs(){
    const employee=A.byId?.("employeePin"),attendance=A.byId?.("attendancePin");
    [employee,attendance].forEach(el=>{
      if(!el)return;
      el.setAttribute("inputmode","numeric");
      el.setAttribute("maxlength","6");
      el.setAttribute("pattern","[0-9]{6}");
      el.setAttribute("autocomplete","off");
    });
    if(employee){
      const label=employee.closest("label");
      if(label&&label.firstChild?.nodeType===3)label.firstChild.textContent="PIN de asistencia (6 dígitos)";
    }
  }

  const oldEnsure=A.ensureStaff;
  A.ensureStaff=function(){
    oldEnsure?.();
    let migrated=false;
    (A.db.employees||[]).forEach(e=>{
      if(String(e.pin||"")==="1234"){e.pin="";migrated=true;}
    });
    configurePinInputs();
    if(migrated)persist();
  };

  A.saveEmployee=function(){
    if(!can("personal"))return deny();
    const id=A.val("employeeEditId");
    const pin=cleanPin(A.val("employeePin"));
    if(pin&&!validPin(pin))return A.toast("El PIN debe tener exactamente 6 dígitos");
    const data={
      name:A.val("employeeName"),role:A.val("employeeRole"),phone:A.val("employeePhone"),pin,
      serviceCommission:Number(A.val("employeeServiceCommission")||0),
      productCommission:Number(A.val("employeeProductCommission")||0),
      monthlyGoal:Number(A.val("employeeMonthlyGoal")||0),weeklyGoal:Number(A.val("employeeMonthlyGoal")||0)/4,
      active:A.val("employeeActive")==="true"
    };
    if(!data.name)return A.toast("Escribe el nombre");

    const finish=photo=>{
      if(!can("personal"))return deny();
      if(id){
        const e=A.db.employees.find(x=>x.id===id);if(!e)return;
        Object.assign(e,data);if(photo)e.photo=photo;
        const b=A.db.barbers.find(x=>x.id===e.barberId);if(b){b.name=e.name;b.phone=e.phone;b.commission=e.serviceCommission;}
      }else{
        let barberId="";
        if(data.role==="Barbero"){
          const b={id:A.uid(),name:data.name,phone:data.phone,commission:data.serviceCommission};A.db.barbers.push(b);barberId=b.id;
        }
        A.db.employees.push({id:A.uid(),barberId,...data,photo:photo||"",schedule:A.defaultSchedule()});
      }
      A.hide("employeeForm");A.byId("employeeEditId").value="";
      A.logAction(id?"Empleado editado":"Empleado creado","Personal",data.name);
      persist();window.FirebaseBridge?.scheduleImagePush?.();A.renderAll();A.toast("Empleado guardado");
    };
    const file=A.byId("employeePhoto")?.files?.[0];
    if(file)A.compressImageLocal(file,520,.78).then(finish).catch(()=>{A.toast("No se pudo procesar la foto");finish("");});
    else finish("");
  };

  function getAttendanceEmployee(){
    return A.db.employees.find(x=>x.id===A.val("attendanceEmployee"));
  }
  function verifyAttendancePin(e){
    const entered=cleanPin(A.val("attendancePin"));
    if(!validPin(e?.pin)){
      A.toast("Este empleado no tiene un PIN de asistencia configurado");return false;
    }
    if(!validPin(entered)||entered!==String(e.pin)){
      A.toast("PIN incorrecto");return false;
    }
    return true;
  }

  A.clockIn=function(){
    if(!can("asistencia"))return deny();
    const e=getAttendanceEmployee();if(!e)return;
    if(!verifyAttendancePin(e))return;
    if(A.db.attendance.some(a=>a.employeeId===e.id&&a.date===A.today()&&!a.out))return A.toast("Ya existe una entrada abierta");
    const time=new Date().toTimeString().slice(0,5),sch=A.scheduleForDate(e,A.today());
    const late=!!(sch?.active&&A.parseHours(time)>A.parseHours(sch.start)+5);
    A.db.attendance.push({id:A.uid(),employeeId:e.id,date:A.today(),in:time,out:"",late});
    A.logAction("Entrada marcada","Asistencia",`${e.name} · ${time}`);persist();
    const pinInput=A.byId("attendancePin");if(pinInput)pinInput.value="";
    A.renderAll();A.toast(late?"Entrada registrada con retardo":"Entrada registrada");
  };

  A.clockOut=function(){
    if(!can("asistencia"))return deny();
    const e=getAttendanceEmployee();if(!e)return;
    if(!verifyAttendancePin(e))return;
    const a=[...(A.db.attendance||[])].reverse().find(x=>x.employeeId===e.id&&x.date===A.today()&&!x.out);
    if(!a)return A.toast("No hay entrada abierta");
    a.out=new Date().toTimeString().slice(0,5);
    A.logAction("Salida marcada","Asistencia",`${e.name} · ${a.out}`);persist();
    const pinInput=A.byId("attendancePin");if(pinInput)pinInput.value="";
    A.renderAll();A.toast("Salida registrada");
  };

  A.updateSchedule=function(id,i,key,val){
    if(!can("horariosPersonal"))return deny();
    const e=A.db.employees.find(x=>x.id===id);if(!e)return;
    e.schedule=e.schedule||A.defaultSchedule();e.schedule[i][key]=val;persist();
  };

  const oldSaveAbsence=A.saveAbsence;
  A.saveAbsence=function(){
    if(!can("ausenciasPersonal"))return deny();
    const before=(A.db.absences||[]).length;
    oldSaveAbsence?.();
    if((A.db.absences||[]).length!==before)persist();
  };

  configurePinInputs();
})();
