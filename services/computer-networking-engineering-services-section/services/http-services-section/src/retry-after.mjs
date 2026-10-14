/** RFC 9110 section 10.2.3: one Retry-After value, interpreted at receipt.
 * Null means absent/invalid, never an invented server delay or retry policy. */
export function retryAfterDelayMs(value, receivedAt = Date.now()) {
  if (!Number.isFinite(receivedAt)) throw new TypeError('finite response receipt clock required');
  if (typeof value !== 'string') return null;
  const text=value.trim();
  if (/^\d+$/u.test(text)) {
    const seconds=Number(text);
    return Number.isSafeInteger(seconds)&&seconds<=Number.MAX_SAFE_INTEGER/1000?seconds*1000:null;
  }
  // HTTP dates accept the preferred IMF form and both obsolete recipient forms.
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let match,year,month,day,hour,minute,second;
  if ((match=/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), (\d{2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4}) (\d{2}):(\d{2}):(\d{2}) GMT$/u.exec(text))) {
    [,day,month,year,hour,minute,second]=match;
  } else if ((match=/^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (\d{2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{2}) (\d{2}):(\d{2}):(\d{2}) GMT$/u.exec(text))) {
    [,day,month,year,hour,minute,second]=match;
    const current=new Date(receivedAt).getUTCFullYear();
    year=Math.floor(current/100)*100+Number(year);
    if(year>current+50)year-=100;
  } else if ((match=/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (?: (\d)|([0-3]\d)) (\d{2}):(\d{2}):(\d{2}) (\d{4})$/u.exec(text))) {
    month=match[1];day=match[2]??match[3];hour=match[4];minute=match[5];second=match[6];year=match[7];
  } else return null;
  const date=new Date(0);date.setUTCFullYear(Number(year),months.indexOf(month),Number(day));date.setUTCHours(Number(hour),Number(minute),Number(second),0);
  if(!Number.isFinite(date.getTime())||date.getUTCFullYear()!==Number(year)||date.getUTCMonth()!==months.indexOf(month)||date.getUTCDate()!==Number(day)||date.getUTCHours()!==Number(hour)||date.getUTCMinutes()!==Number(minute)||date.getUTCSeconds()!==Number(second))return null;
  return Math.max(0,date.getTime()-receivedAt);
}
