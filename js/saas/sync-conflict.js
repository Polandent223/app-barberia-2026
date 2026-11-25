/* Pure helpers shared by the tenant synchronizer and its tests. */
export const cloneJSON=value=>JSON.parse(JSON.stringify(value));
export function fingerprint(value){
  if(value===undefined)return "missing";
  if(value===null||typeof value!=="object")return JSON.stringify(value);
  if(Array.isArray(value))return "["+value.map(fingerprint).join(",")+"]";
  return "{"+Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+fingerprint(value[k])).join(",")+"}";
}
export function changedParts(next,logical,raw,allowed=null){
  return Object.entries(next).filter(([name,value])=>(!allowed||allowed.has(name))&&fingerprint(value)!==fingerprint(logical[name]))
    .map(([name,value])=>({name,before:raw[name],after:cloneJSON(value)}));
}
export function assertUnchanged(entries,actual){
  for(const entry of entries)if(fingerprint(entry.before)!==fingerprint(actual[entry.name])){
    const e=new Error("Otro dispositivo cambió el módulo "+entry.name+". No se sobrescribieron los datos.");
    e.code="sambrix/conflict";e.domain=entry.name;throw e;
  }
}
