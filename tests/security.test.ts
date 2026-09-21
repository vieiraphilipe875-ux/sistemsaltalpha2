import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pbkdf2Sync,createHash} from 'node:crypto';
import {hashPassword,verifyPassword} from '../lib/security';
import {parseMoney,futureMonthlyDates} from '../lib/finance';
import {effectivePermissions} from '../lib/permissions';
test('Hashes novos e legados reconhecem apenas a senha correta',async()=>{
 const password='Teste-Seguro-2026!',hash=await hashPassword(password);
 assert(await verifyPassword(password,hash));assert(!await verifyPassword('incorreta',hash));
 const salt=Buffer.from('0123456789abcdef');const legacy=`pbkdf2$210000$${salt.toString('base64')}$${pbkdf2Sync(password,salt,210000,32,'sha256').toString('base64')}`;
 assert(await verifyPassword(password,legacy));assert(!await verifyPassword('incorreta',legacy));
 assert(await verifyPassword(password,createHash('sha256').update(password).digest('hex')));assert(!await verifyPassword(password,'malformed'));
});
test('Permissão explícita vazia permanece sem acesso',()=>{assert.deepEqual(effectivePermissions('editor',[]),[]);assert(!effectivePermissions('viewer',[]).includes('finance.access'));});
test('Valores BR viram centavos e não aceitam entrada ambígua',()=>{assert.equal(parseMoney('1.234,56'),123456);assert.equal(parseMoney('1234.56'),123456);assert.equal(parseMoney('0,01'),1);assert(Number.isNaN(parseMoney('abc')));assert(Number.isNaN(parseMoney('-10')));});
test('Recorrência respeita fevereiro e não acumula perda do dia 31',()=>{const dates=futureMonthlyDates('2028-01','2028-01-31T12:00:00Z');assert.equal(dates.length,11);assert(dates[0].dueDate.startsWith('2028-02-29'));assert(dates[1].dueDate.startsWith('2028-03-31'));assert.equal(dates.at(-1)?.competence,'2028-12');});

import {dateInputToISO,validDateInput} from '../lib/dates';
test('Data financeira mantém dia no Brasil e rejeita calendário inválido',()=>{assert.equal(new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo'}).format(new Date(dateInputToISO('2026-09-30'))),'30/09/2026');assert(!validDateInput('2026-02-30'));assert(!validDateInput('0'));assert(validDateInput('2028-02-29'));});
