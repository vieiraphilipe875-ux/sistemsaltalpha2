/** Date-only business deadlines use noon UTC to preserve the calendar day in Brazil. */
export function dateInputToISO(value:string|number){
 return new Date(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)?`${value}T12:00:00.000Z`:value).toISOString();
}
export function validDateInput(value:string){
 if(!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/.test(value)||!Number.isFinite(Date.parse(value)))return false;
 const [year,month,day]=value.slice(0,10).split('-').map(Number);
 const check=new Date(`${value.slice(0,10)}T12:00:00Z`);
 return check.getUTCFullYear()===year&&check.getUTCMonth()===month-1&&check.getUTCDate()===day;
}
/** Convert datetime-local controls in the user's browser before sending to the server. */
export function normalizeDateInputs<T extends object>(payload:T):T{
 return Object.fromEntries(Object.entries(payload).map(([key,value])=>
  /(?:At|Date|End)$/.test(key)&&typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
   ? [key,new Date(value).toISOString()] : [key,value]
 )) as T;
}
