/* PROVA v893 — DRE 2026–2033 (TR08 parte 2): linha de imposto = Identificador; CMV cheio (crédito só na linha de imposto);
   IRPJ/CSLL por presunção sem Regime Ótimo e do Regime Ótimo com ele; afluentes Regime Ótimo / Precificação / Cadeia pelo botão
   "→ Usar no meu DRE"; reprecificação muda a receita e não as compras. Sabotagens: crédito contado duas vezes; IRPJ no Simples.
   Uso: npm i --no-save jsdom && node prova_fin_dre.js */
const { JSDOM, VirtualConsole } = require('jsdom'); const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
let falhou = 0; const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(86, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const perto = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1 : tol);
const w = new JSDOM(APP, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://lionheartintelligence.com.br/app.html', virtualConsole: new VirtualConsole() }).window;
w.fetch = () => new Promise(() => {}); w.HTMLElement.prototype.scrollIntoView = function () {}; w.scrollTo = function () {}; w.alert = () => {};
setTimeout(() => {
  const d = w.document, F = w.LH_FIN; w.LH_ALIQ_REF = 26.5;
  ex('LH_FIN.dre / afluente / renderDre existem', ['dre', 'afluente', 'removerAfluente', 'renderDre', 'afluentes'].every((k) => typeof F[k] === 'function'));
  const ids = [...d.querySelectorAll('.nav-item[onclick]')].map((e) => (e.getAttribute('onclick').match(/abrirPagina\('([^']+)'/) || [])[1]);
  ex('aba DRE 2026–2033 no menu, logo depois do Identificador', ids.indexOf('fin_dre') === ids.indexOf('fin_cred') + 1 && !!d.getElementById('page-fin_dre'));
  ex('botão "→ Usar no meu DRE / Fluxo" nas três análises do DRE (c05, precmassa, cadeia)', (() => { const b = [...d.querySelectorAll('.lh-fin-btn')]; const de = b.map((x) => (x.getAttribute('onclick').match(/afluente\('([^']+)'/) || [])[1]); return ['c05', 'cadeia', 'precmassa'].every((k) => de.indexOf(k) >= 0) && de.length === new Set(de).size; })(), [...d.querySelectorAll('.lh-fin-btn')].length);
  ex('o botão do c05 está na página do Regime Ótimo, o da cadeia na Cadeia, o da precmassa na Precificação', !!d.querySelector('#page-c05 .lh-fin-btn') && !!d.querySelector('#page-cadeia .lh-fin-btn') && !!d.querySelector('#page-precmassa .lh-fin-btn'));

  /* empresa-base: Presumido comércio, fat 1,2 mi, compras 660 mil, fixos 300 mil, cartão 2%, sem crescimento */
  const O = { tipo: 'digitado', detalhe: 'prova', quando: '2026-10-01' };
  w.localStorage.removeItem('LH_FIN::' + F.eid());
  F.set({ fat: 1200000, cresc: 0, infl: 0, regime: 'presumido', tipo: 'comercio', icms: 18, trat: 'cheia', recExp: 0, compras: 660000, comprasTrat: 'cheia', desp: 8, st: 0, cartao: 2, despMkt: 0, pessoal: 180000, prolab: 60000, ocup: 40000, adm: 20000, recFin: 0 }, O);
  const S = F.dre(); const y26 = S[0], y27 = S[1], y33 = S[7];
  ex('8 anos', S.length === 8 && S[0].ano === 2026 && S[7].ano === 2033);
  const imp26 = F.impostos(2026), imp33 = F.impostos(2033);
  ex('linha de imposto = total do Identificador (2026 e 2033)', perto(y26.impostos, imp26.total) && perto(y33.impostos, imp33.total));
  ex('2026 conferido à mão: 1.200.000 − 141.000 (ICMS líq. 97.200 + PIS/COFINS 43.800) − 24.000 cartão = receita líquida 1.035.000', perto(y26.impostos, 97200 + 43800) && perto(y26.recLiq, 1200000 - 141000 - 24000), JSON.stringify([y26.impostos, y26.recLiq]));
  ex('CMV cheio (660.000): o crédito da compra não é descontado duas vezes', perto(y26.cmv, 660000) && perto(y33.cmv, 660000));
  ex('margem de contribuição = receita líquida − CMV; fixos = 300.000', perto(y26.margem, y26.recLiq - 660000) && perto(y26.fixos, 300000));
  const lair26 = y26.margem - 300000; const ir26 = (1200000 * 0.08) * 0.15 + (1200000 * 0.12) * 0.09;
  ex('IRPJ/CSLL sem Regime Ótimo = presunção 8%/12% (comércio): ' + Math.round(ir26), perto(y26.irpj, ir26) && /estimativa/.test(y26.irpjDe), JSON.stringify([y26.irpj, y26.irpjDe]));
  ex('lucro líquido = LAIR − IRPJ/CSLL; margem % = lucro ÷ receita', perto(y26.lucro, lair26 - ir26) && perto(y26.margemPct, y26.lucro / 1200000 * 100, 0.01));
  ex('2033: imposto = (1.200.000 − 660.000 − 96.000) × 26,5% = 117.660 → lucro sobe em relação a 2026', perto(y33.impostos, 117660) && y33.lucro > y26.lucro, JSON.stringify([y33.impostos, y33.lucro, y26.lucro]));
  ex('empresa-base com crédito de compra: o lucro não cai em nenhum ano (2027 já credita a CBS da compra e das despesas)', S.every((y, i) => i === 0 || y.lucro >= S[i - 1].lucro - 0.5) && perto(y27.impostos, 97200 + 1200000 * 0.088 - 660000 * 0.088 - 96000 * 0.088), S.map((y) => y.ano + ':' + Math.round(y.lucro)).join(' '));
  F.set({ compras: 0, desp: 0, tipo: 'servico', icms: 5 }, O); const Sv = F.dre();
  ex('serviço sem crédito e sem reprecificar: o lucro cai todo ano e 2033 é o pior (é o caso do guia — quem segura o preço perde)', Sv.every((y, i) => i === 0 || y.lucro <= Sv[i - 1].lucro + 0.5) && Sv[7].lucro < Sv[0].lucro * 0.75, Sv.map((y) => y.ano + ':' + Math.round(y.lucro)).join(' '));
  F.set({ compras: 660000, desp: 8, tipo: 'comercio', icms: 18 }, O);

  /* Simples: tudo no DAS, IRPJ zero */
  F.set({ regime: 'simples', aliqDas: 8.5 }, O); const Ss = F.dre();
  ex('Simples: imposto = DAS; IRPJ/CSLL = 0 (sabotagem: IR sobre o Simples)', perto(Ss[0].impostos, 1200000 * 0.085) && Ss[0].irpj === 0 && /DAS/.test(Ss[0].irpjDe));
  F.set({ regime: 'real' }, O); const Sr = F.dre();
  ex('Lucro Real sem Regime Ótimo: 34% do lucro antes do IR', perto(Sr[0].irpj, Math.max(0, Sr[0].lair) * 0.34));
  F.set({ regime: 'presumido' }, O);

  /* afluente Regime Ótimo */
  d.getElementById('c05_fat').value = '1200000';
  w._C05_REGIMES = [{ nome: 'Lucro Presumido', total: 210000 }, { nome: 'Simples Nacional', total: 240000 }, { nome: 'Lucro Real', total: 260000 }];
  w._LH_C05_REGIMES = [{ nome: 'Lucro Presumido', total: 210000, irpjCsll: 30000 }, { nome: 'Simples Nacional', total: 240000, irpjCsll: 0 }, { nome: 'Lucro Real', total: 260000, irpjCsll: 50000 }];
  ex('afluente c05 liga e abre o DRE', F.afluente('c05') === true && d.getElementById('page-fin_dre').classList.contains('active'));
  const A1 = F.afluentes();
  ex('registra regime, melhor regime e os IRPJ/CSLL por regime', A1.regime && A1.regime.melhor === 'Lucro Presumido' && A1.regime.regimes.length === 3 && A1.regime.regimes[0].irpjCsll === 30000);
  const Sa = F.dre();
  ex('IRPJ/CSLL passa a vir do Regime Ótimo (30.000 em 2026, escalado pela receita)', perto(Sa[0].irpj, 30000) && /Regime Ótimo/.test(Sa[0].irpjDe), JSON.stringify([Sa[0].irpj, Sa[0].irpjDe]));
  ex('o regime digitado não é sobrescrito pelo afluente', F.get().dados.regime === 'presumido' && F.get().origem.regime.tipo === 'digitado');
  ex('sem Regime Ótimo rodado, o botão não liga nada', (w._C05_REGIMES = null, F.afluente('c05') === false));

  /* afluente Precificação: reprecificação muda a receita, não as compras */
  w.PM_ULTIMO = { cfg: { regime: 'presumido', estr: 'fica' }, rows: [
    { c: { anos: { 2026: { hojeCli: 100, finalCli: 100, decidido: 100, tFora: 0 }, 2027: { hojeCli: 100, finalCli: 104, decidido: 102, tFora: 0.088 }, 2033: { hojeCli: 100, finalCli: 99.11, decidido: 99.11, tFora: 0.265 } } } },
    { c: { anos: { 2026: { hojeCli: 300, finalCli: 300, decidido: 300, tFora: 0 }, 2027: { hojeCli: 300, finalCli: 312, decidido: 306, tFora: 0.088 }, 2033: { hojeCli: 300, finalCli: 297.33, decidido: 297.33, tFora: 0.265 } } } } ] };
  ex('afluente precmassa liga', F.afluente('precmassa') === true);
  const A2 = F.afluentes(); const Sp = F.dre();
  ex('reprecificação 2027 = preço decidido ÷ hoje − 1 = (102+306)/400 − 1 = +2%', perto(A2.reprec.anos[2027], 0.02, 0.0001), String(A2.reprec.anos[2027]));
  ex('receita 2027 = 1.200.000 × 1,02; compras continuam 660.000', perto(Sp[1].receita, 1224000) && perto(Sp[1].cmv, 660000), JSON.stringify([Sp[1].receita, Sp[1].cmv]));
  ex('débito IBS/CBS de 2027 incide sobre a receita reprecificada (1.224.000 × 8,8%)', perto(Sp[1].imp.debito, 1224000 * 0.088), String(Sp[1].imp.debito));
  ex('anos sem dado no catálogo ficam com reprecificação 0 (2029)', Sp[3].reprec === 0 && perto(Sp[3].receita, 1200000));
  ex('desligar o afluente devolve a receita original', (F.removerAfluente('reprec'), perto(F.dre()[1].receita, 1200000)));
  w.PM_ULTIMO = null;
  ex('sem Precificação rodada, o botão não liga nada', F.afluente('precmassa') === false);

  /* afluente Cadeia */
  ex('sem Cadeia lida, o botão avisa e não liga', F.afluente('cadeia') === false);
  w.LH_CADEIA.set('entrada', { regular: 70, simples: 25, importacao: 0, pf: 5 }, { tipo: 'manual', detalhe: 'prova', quando: '2026-10-01' });
  ex('com Cadeia lida, liga e registra 75% creditável', F.afluente('cadeia') === true && perto(F.afluentes().cred.creditavel, 0.75, 0.001));
  ex('o DRE de 2033 usa a Cadeia: imposto = débito − 660.000 × 0,75 × 26,5% − 96.000 × 26,5%', perto(F.dre()[7].impostos, 1200000 * 0.265 - 660000 * 0.75 * 0.265 - 96000 * 0.265), String(F.dre()[7].impostos));
  w.LH_CADEIA.set('entrada', { regular: null, simples: null, importacao: null, pf: null }, null);

  /* a aba desenha */
  w.abrirPagina('fin_dre'); F.renderDre(); const box = d.getElementById('fin_dre_result');
  ex('tabela com 8 anos, linhas de receita, imposto, margem de contribuição e lucro líquido', box.querySelector('thead').querySelectorAll('th').length === 9 && /Receita bruta/.test(box.textContent) && /Imposto sobre o consumo/.test(box.textContent) && /Margem de contribuição/.test(box.textContent) && /Lucro líquido/.test(box.textContent));
  ex('"de onde veio" aparece por linha (Identificador, Dados, Regime Ótimo)', /Identificador de Créditos/.test(box.textContent) && /Regime Ótimo/.test(box.textContent) && /Dados ·/.test(box.textContent));
  ex('o painel de afluentes lista o Regime Ótimo e a Cadeia ligados', /Regime Ótimo/.test(d.getElementById('fin_dre_afluentes').textContent) && /Cadeia de Crédito/.test(d.getElementById('fin_dre_afluentes').textContent));
  ex('KPI "Pior ano de lucro" e Premissas carimbam a conta', /Pior ano de lucro/.test(box.textContent) && /Premissas desta conta/.test(box.textContent));
  ex('sem faturamento, pede os Dados', (F.set({ fat: null }, O), F.renderDre(), /Faltam os Dados/.test(box.textContent)));

  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado'); process.exit(falhou ? 1 : 0);
}, 9000);
