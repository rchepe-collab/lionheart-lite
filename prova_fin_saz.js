/* PROVA v903 — TR09 parte 3: produtor rural fora do IBS/CBS (art. 164) como regime; repasses de agência fora da base
   (ISS hoje, IBS/CBS, DAS); sazonalidade mensal no Fluxo (pior mês dentro do ano).
   Sabotagens: produtor com débito/crédito; repasse na base; pior mês sem sazonalidade ≠ fechamento; 39 campos.
   Uso: npm i --no-save jsdom && node prova_fin_saz.js */
const { JSDOM, VirtualConsole } = require('jsdom'); const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
let falhou = 0; const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(86, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const perto = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1 : tol);
const w = new JSDOM(APP, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://lionheartintelligence.com.br/app.html', virtualConsole: new VirtualConsole() }).window;
w.fetch = () => new Promise(() => {}); w.HTMLElement.prototype.scrollIntoView = function () {}; w.scrollTo = function () {}; w.alert = () => {};
setTimeout(() => {
  const d = w.document, F = w.LH_FIN; w.LH_ALIQ_REF = 26.5; const O = { tipo: 'digitado', detalhe: 'prova', quando: '2026-10-01' };
  w.LH_EMP_CNPJ = '11111111000191'; w.localStorage.removeItem('LH_FIN::' + F.eid()); w.LH_PONTE.ultimo = {};
  ex('39 campos (+repasse, saz); regime "produtor" existe no select', F.campos.length === 39 && !!d.querySelector('#fin_regime option[value="produtor"]') && !!d.getElementById('fin_saz') && !!d.getElementById('fin_repasse'));

  /* produtor rural fora do IBS/CBS */
  F.set({ fat: 2400000, cresc: 0, infl: 0, regime: 'presumido', perfil: 'agro', icms: 0, trat: 'red60', recExp: 0, compras: 1200000, comprasTrat: 'red60', desp: 3, pessoal: 300000, prolab: 60000, ocup: 50000, adm: 30000, pRec: 30, pPag: 30, vista: 10, caixa0: 100000, ressarc: 60, estoque: 60 }, O);
  const dentro = F.impostos(2033), dD = F.dre();
  F.set({ regime: 'produtor' }, O);
  const fora = F.impostos(2033), fD = F.dre();
  ex('fora do IBS/CBS: débito e crédito zero em 2033; dentro havia débito', fora.debito === 0 && fora.credTotal === 0 && fora.aPagar === 0 && dentro.debito > 0, JSON.stringify([fora.debito, dentro.debito]));
  ex('PIS/COFINS não há para o produtor; ICMS 0 (diferido) → imposto sobre o consumo 2026 = 0', F.impostos(2026).pisLiq === 0 && F.impostos(2026).total === 0);
  ex('IRPJ/CSLL zero (IRPF pelo livro-caixa, fora da conta) e a linha diz isso', fD[7].irpj === 0 && /livro-caixa/.test(fD[7].irpjDe));
  w.abrirPagina('fin_dre'); F.renderDre(); const bd = d.getElementById('fin_dre_result').textContent;
  ex('a leitura do agro compara fora × dentro com o lucro de 2033 dos dois', /Este DRE está fora/.test(bd) && /dentro \(Presumido\) daria/.test(bd) && /crédito presumido/.test(bd));
  w.abrirPagina('fin_cred'); F.renderCred(); const bc = d.getElementById('fin_cred_result').textContent;
  ex('o Identificador mostra o card "Fora do IBS/CBS (art. 164)"', /Fora do IBS\/CBS \(art\. 164\)/.test(bc));

  /* agência: repasses fora da base */
  w.localStorage.removeItem('LH_FIN::' + F.eid());
  F.set({ fat: 1000000, cresc: 0, infl: 0, regime: 'presumido', perfil: 'turismo', icms: 5, trat: 'red40', recExp: 0, compras: 0, desp: 2, cartao: 0, pessoal: 150000, prolab: 48000, ocup: 24000, adm: 12000, pRec: 30, pPag: 30, vista: 50, caixa0: 20000, ressarc: 60 }, O);
  const b26 = F.impostos(2026), b33 = F.impostos(2033), bD = F.dre();
  F.set({ repasse: 80 }, O);
  const r26 = F.impostos(2026), r33 = F.impostos(2033), rD = F.dre(), rF = F.fluxo();
  ex('repasse de 80%: ISS de 2026 cai a 20% (base = comissão): 50.000 → 10.000', perto(b26.icmsLiq, 50000 * b26.fIcms) && perto(r26.icmsLiq, 10000 * r26.fIcms), JSON.stringify([b26.icmsLiq, r26.icmsLiq]));
  ex('PIS/COFINS e débito de IBS/CBS também sobre os 20%', perto(r26.pisLiq, b26.pisLiq * 0.2) && perto(r33.debito, b33.debito * 0.2), JSON.stringify([r33.debito, b33.debito]));
  ex('no DRE o repasse (800.000) é dedução da receita e a receita líquida cai', perto(rD[0].repasse, 800000) && perto(rD[0].recLiq, rD[0].receita - rD[0].impostos - 800000), JSON.stringify([rD[0].repasse, rD[0].recLiq]));
  ex('no Fluxo o repasse sai do caixa', perto(rF[0].repasse, 800000) && rF[0].saidas > 800000);
  F.set({ regime: 'simples', aliqDas: 10 }, O);
  ex('no Simples o DAS incide sobre a comissão (200.000 × 10% = 20.000)', perto(F.impostos(2026).das, 20000));
  F.set({ regime: 'presumido' }, O);
  w.abrirPagina('fin_dados');
  ex('a caixa de repasse aparece em turismo', d.getElementById('fin_repasse_box').style.display !== 'none');
  w.abrirPagina('fin_dre'); F.renderDre();
  ex('o DRE mostra a linha de repasses', /Repasses a hotéis/.test(d.getElementById('fin_dre_result').textContent));

  /* sazonalidade */
  F.set({ repasse: 0, saz: '' }, O);
  const u = F.fluxo();
  ex('sem sazonalidade e com caixa positivo, o ponto mais baixo do ano é janeiro: caixa inicial + 1/12 do caixa do ano', u[0].piorMes.mes === 1 && perto(u[0].piorMes.saldo, 20000 + u[0].caixa / 12, 2), JSON.stringify(u[0].piorMes) + ' ' + u[0].caixa);
  F.set({ saz: 'verao' }, O);
  const v = F.fluxo();
  ex('verão (dez–fev forte): o pior mês vem antes do fechamento e com saldo menor; o fechamento do ano não muda', v[1].piorMes.saldo < v[1].saldo && v[1].piorMes.mes < 12 && perto(v[1].saldo, u[1].saldo, 2), JSON.stringify([v[1].piorMes, v[1].saldo, u[1].saldo]));
  ex('12 saldos mensais por ano, o último = fechamento', v[1].mensal.length === 12 && perto(v[1].mensal[11], v[1].saldo, 2));
  F.set({ saz: 'safra' }, O);
  const sf = F.fluxo();
  ex('safra (mar–mai concentram a venda): o pior mês vem antes da safra (jan/fev) e o aperto é maior que no verão', sf[1].piorMes.mes <= 2 && sf[1].piorMes.saldo < v[1].piorMes.saldo, JSON.stringify([sf[1].piorMes, v[1].piorMes]));
  w.abrirPagina('fin_fluxo'); F.renderFluxo(); const bf = d.getElementById('fin_fluxo_result').textContent;
  ex('o Fluxo mostra o KPI "Pior mês" e a linha "Pior mês do ano (saldo)"', /Pior mês \(safra/.test(bf) && /Pior mês do ano \(saldo\)/.test(bf) && /jan|fev/.test(bf));

  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado'); process.exit(falhou ? 1 : 0);
}, 9000);
