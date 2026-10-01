/* PROVA v896 — Dados Estratégicos: que documentos da Central alimentam cada campo (tabela com "lido?") e as sugestões novas
   (EFD receita anualizada, SPED Fiscal ST anualizado e alíquota ICMS, NFS-e ISS, Balancete despesas com crédito, CT-e).
   Uso: npm i --no-save jsdom && node prova_fin_docs.js */
const { JSDOM, VirtualConsole } = require('jsdom'); const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
let falhou = 0; const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(86, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const perto = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1 : tol);
const w = new JSDOM(APP, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://lionheartintelligence.com.br/app.html', virtualConsole: new VirtualConsole() }).window;
w.fetch = () => new Promise(() => {}); w.HTMLElement.prototype.scrollIntoView = function () {}; w.scrollTo = function () {}; w.alert = () => {};
setTimeout(() => {
  const d = w.document, F = w.LH_FIN;
  w.localStorage.removeItem('LH_FIN::' + F.eid());
  w.abrirPagina('fin_dados');
  const box = d.getElementById('fin_dados_docs');
  ex('a aba Dados mostra a tabela "Que documentos preenchem estes campos"', !!box && /Que documentos preenchem/.test(box.textContent) && box.querySelectorAll('tbody tr').length === 10);
  ex('com a Central vazia, nenhuma fonte lida e a dobra abre sozinha', /0 de 10 fontes lidas/.test(box.textContent) && !!box.querySelector('.pm-dobra.aberto'));
  ex('lista as 9 fontes documentais + telas, e diz o que é só manual', ['XML de NF-e', 'PGDAS', 'eSocial', 'ECD', 'EFD-Contribuições', 'SPED Fiscal', 'NFS-e', 'Balancete', 'CT-e', 'Telas já rodadas'].every((t) => box.textContent.indexOf(t) >= 0) && /Só manuais/.test(box.textContent) && /caixa inicial/.test(box.textContent));

  /* documentos "lidos" na Central */
  w.LH_IMPORT_EFD = { receitaBruta: 300000, meses: 3, dtIni: '01/01/2026', dtFin: '31/03/2026' };
  w.LH_IMPORT_SPEDFISCAL = { ok: true, totIcmsST: 2000, totIcmsProprio: 18000, totBcIcms: 100000, dtIni: '01/03/2026', dtFin: '31/03/2026' };
  w.LH_IMPORT_BALANCETE = { ok: true, receita: 1000000, cred: 85000, confirmar: 0, nao: 10000, despesa: 95000 };
  w.LH_IMPORT_NFSE = { ok: true, base: 50000, iss: 2500, notas: 10 };
  w.LH_IMPORT_PGDAS = null; w.LH_IMPORT_ECD = null;
  const n = F.sugerir(false); const D = F.get().dados, O = F.get().origem;
  ex('EFD: receita bruta de 3 meses anualizada = 1.200.000 (Central)', D.fat === 1200000 && O.fat.tipo === 'central' && /EFD/.test(O.fat.detalhe), JSON.stringify([D.fat, O.fat]));
  ex('SPED Fiscal: ICMS-ST de 1 mês × 12 = 24.000; alíquota ICMS = 18%', D.st === 24000 && D.icms === 18 && /SPED/.test(O.st.detalhe), JSON.stringify([D.st, D.icms]));
  ex('Balancete: despesas com crédito = 8,5% da receita', D.desp === 8.5 && /Balancete/.test(O.desp.detalhe), String(D.desp));
  ex('NFS-e não sobrescreve o ICMS do SPED (primeira sugestão vence); o tipo vira serviço só se vier da NFS-e', D.icms === 18 && D.tipo === 'servico', JSON.stringify([D.icms, D.tipo]));
  w.abrirPagina('fin_dados');
  ex('a tabela marca EFD, SPED Fiscal, Balancete e NFS-e como lidos (4 de 10)', /4 de 10 fontes lidas/.test(d.getElementById('fin_dados_docs').textContent), d.getElementById('fin_dados_docs').textContent.match(/\d+ de 10/)[0]);
  const lidos = [...d.querySelectorAll('#fin_dados_docs tbody tr')].filter((tr) => /● lido/.test(tr.textContent)).map((tr) => tr.querySelector('b').textContent);
  ex('e são exatamente esses', JSON.stringify(lidos.sort()) === JSON.stringify(['Balancete', 'EFD-Contribuições', 'NFS-e (serviços prestados)', 'SPED Fiscal (EFD ICMS/IPI)'].sort()), lidos.join(' | '));
  ex('o digitado continua vencendo o documento', (F.set({ desp: 12 }, { tipo: 'digitado', detalhe: 'digitado', quando: '2026-10-01' }), F.sugerir(false), F.get().dados.desp === 12));

  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado'); process.exit(falhou ? 1 : 0);
}, 9000);
