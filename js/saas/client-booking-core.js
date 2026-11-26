/* Pure booking validation. Availability is advisory until the business confirms. */
export function minute(s){if(typeof s!=="string"||!/^([01]\d|2[0-3]):[0-5]\d$/.test(s))return NaN;return Number(s.slice(0,2))*60+Number(s.slice(3));}
export function dayValid(s){if(typeof s!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+"T00:00:00Z");return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s;}
export function clock(zone){
  const d=new Date();
  try{const parts=new Intl.DateTimeFormat("en-CA",{timeZone:zone||undefined,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(d);const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));return {date:p.year+"-"+p.month+"-"+p.day,time:p.hour+":"+p.minute};}catch{return clock(undefined);}
}
export function durationOf(s){const d=Number(s?.duration);return Number.isInteger(d)&&d>0&&d<=720?d:0;}
export function available(data,serviceId,barberId,date,time,now=clock(data?.timezone)){
  const s=data?.services?.find(x=>x.id===serviceId),b=data?.barbers?.find(x=>x.id===barberId);
  const duration=durationOf(s),start=minute(time),open=minute(data?.businessHours?.open),close=minute(data?.businessHours?.close);
  if(!s||!b||!duration||!dayValid(date)||!Number.isFinite(start)||!Number.isFinite(open)||!Number.isFinite(close)||date<now.date||date===now.date&&start<=minute(now.time)||start<open||start+duration>close)return false;
  if(Array.isArray(b.schedule)&&b.schedule.length){const weekday=new Date(date+"T00:00:00Z").getUTCDay(),work=b.schedule.find(x=>Number(x.day)===weekday);if(!work||work.active!==true||!Number.isFinite(minute(work.start))||!Number.isFinite(minute(work.end))||start<minute(work.start)||start+duration>minute(work.end))return false;}
  return !(data.busy||[]).some(a=>{
    if(a.barberId!==barberId||a.date!==date||["Cancelada","Rechazada"].includes(a.status))return false;
    const at=minute(a.time),len=durationOf(a)||durationOf(data.services.find(x=>x.id===a.serviceId))||720;
    return !Number.isFinite(at)||start<at+len&&start+duration>at;
  });
}
export function slots(data,serviceId,barberId,date,now=clock(data?.timezone)){
  const start=minute(data?.businessHours?.open),end=minute(data?.businessHours?.close);if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return [];
  const result=[];for(let m=start;m<end;m+=30){const time=String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0");if(available(data,serviceId,barberId,date,time,now))result.push(time);}return result;
}
