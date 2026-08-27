export type BotCommand='MENU'|'OBRAS'|'MASCOTA'|'VISITA'|'MIS_EVENTOS'|'CANCELAR_EVENTO'|'EDITAR_EVENTO'|'EVENTO'|'TRANSPARENCIA'|'ASAMBLEAS'|'VOTAR'|'DATOS_PAGO'|'SALDO'|'ESTADO_CUENTA'|'CAJONES'|'APARTAR_CAJON'|'LIBERAR_CAJON'|'REPORTE';
const exact=(value:string,options:string[])=>options.includes(value);
export function matchDeterministicCommand(text:string):BotCommand|null{
  const value=text.trim().toLowerCase();
  if(exact(value,['hola','buenas','inicio','menu','menú']))return'MENU';
  if(value==='obras')return'OBRAS';
  if(value.startsWith('mascota')||value.includes('mascota'))return'MASCOTA';
  if(value.startsWith('visita')||value.includes('visita'))return'VISITA';
  if(exact(value,['mis eventos','eventos']))return'MIS_EVENTOS';
  if(value.startsWith('cancelar evento'))return'CANCELAR_EVENTO';
  if(value.startsWith('editar evento'))return'EDITAR_EVENTO';
  if(value.startsWith('evento'))return'EVENTO';
  if(exact(value,['transparencia','finanzas','reporte financiero','estado general','estado financiero general','finanzas generales']))return'TRANSPARENCIA';
  if(exact(value,['votaciones','asambleas','asamblea','quiero votar']))return'ASAMBLEAS';
  if(value.startsWith('votar '))return'VOTAR';
  if(exact(value,['datos de pago','datos bancarios','cuenta para depositar','numero de cuenta','número de cuenta','tarjeta para depositar','donde deposito','dónde deposito']))return'DATOS_PAGO';
  if(exact(value,['saldo','mi saldo','adeudo','lo acumulado']))return'SALDO';
  if(exact(value,['estado de cuenta','mi estado de cuenta','cuenta']))return'ESTADO_CUENTA';
  if(exact(value,['cajones','estacionamiento']))return'CAJONES';
  if(value.startsWith('apartar')||value.includes('apartar'))return'APARTAR_CAJON';
  if(value.startsWith('liberar')||value.includes('liberar'))return'LIBERAR_CAJON';
  if(value.startsWith('reporte')||value.includes('reporte'))return'REPORTE';
  return null;
}
