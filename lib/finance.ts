/** Decimal input to integer cents; accepts Brazilian and plain decimal notation. */
export function parseMoney(value:string){
 const raw=value.trim().replace(/^R\$\s*/, '').replace(/\s/g,'');
 const normalized=raw.includes(',')?raw.replace(/\./g,'').replace(',','.') : raw;
 if(!/^\d+(\.\d{1,2})?$/.test(normalized))return Number.NaN;
 return Math.round(Number(normalized)*100);
}
export function futureMonthlyDates(competence:string,dueDate:string,count=11){
 const [year,month]=competence.split('-').map(Number),base=new Date(dueDate);
 return Array.from({length:count},(_,i)=>{
  const n=i+1,c=new Date(Date.UTC(year,month-1+n,1));
  const due=new Date(base);const targetMonth=base.getUTCMonth()+n;
  due.setUTCDate(1);due.setUTCMonth(targetMonth);
  due.setUTCDate(Math.min(base.getUTCDate(),new Date(Date.UTC(due.getUTCFullYear(),due.getUTCMonth()+1,0)).getUTCDate()));
  return {competence:`${c.getUTCFullYear()}-${String(c.getUTCMonth()+1).padStart(2,'0')}`,dueDate:due.toISOString()};
 });
}
