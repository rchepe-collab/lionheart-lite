/* PROVA v904 — Fluxo de Caixa com as práticas do DRE: ajustes de caixa por ano (CAPEX, amortização, aporte, distribuição,
   prazo de receber), linha de financiamento, necessidade de capital (quanto, quando, custo), 96 meses no gráfico,
   cenários de caixa (prazo, inadimplência, ressarcimento). Sabotagens: aporte no DRE; cenário em 2026; ajuste some ao limpar.
   Uso: npm i --no-save jsdom && node prova_fin_caixa.js */
const { JSDOM, VirtualConsole } = require('jsdom'); const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
let falhou = 0; const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(86, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const perto = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1 : tol);
const w = new JSDOM(APP, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://lionheartintelligence.com.br/app.html', virtualConsole: new VirtualConsole() }).window;
w.fetch = () => new Promise(() => {}); w.HTMLElement.prototype.scrollIntoView = function () {}; w.scrollTo = function () {}; w.alert = () => {};
setTimeout(() => {
  const d = w.document, F = w.LH_FIN; w.LH_ALIQ_REF = 26.5; const O = { tipo: 'digitado', detalhe: 'prova', quando: '2026-10-01' };
  w.LH_EMP_CNPJ = '11111111000191'; w.localStorage.removeItem('LH_FIN::' + F.eid()); w.LH_PONTE.ultimo = {};
  ex('41 campos (+caixa mínimo, custo do capital)', F.campos.length === 41 && !!d.getElementById('fin_cmin') && !!d.getElementById('fin_juros'));
  F.set({ fat: 1200000, cresc: 0, infl: 0, regime: 'presumido', perfil: 'comercio', icms: 18, trat: 'cheia', compras: 660000, comprasTrat: 'cheia', desp: 8, cartao: 2, pessoal: 180000, prolab: 60000, ocup: 40000, adm: 20000, pRec: 30, pPag: 20, vista: 40, inad: 2, caixa0: 50000, ressarc: 60, estoque: 20, capex: 30000, amort: 12000, distrib: 50, cmin: 1, juros: 18 }, O);
  F.limparAjustesCaixa(); F.cenarioCaixa('base');
  const b = F.fluxo();
  ex('fluxo devolve capital {falta, quando, alvo, custo}; alvo = saídas/12 × 1 mês', b.capital && b.capital.alvo > 0 && perto(b.capital.alvo, b[b.capital.quando.ano - 2026].saidas / 12), JSON.stringify(b.capital));
  ex('96 saldos mensais; o último de cada ano = fechamento', b.every((y) => y.mensal.length === 12 && perto(y.mensal[11], y.saldo, 2)));

  /* ajustes de caixa por ano */
  F.ajustarCaixa('capex', 2028, 200000);
  const a = F.fluxo();
  ex('CAPEX de 200.000 só em 2028: 2028 muda, 2027 e 2029 iguais ao padrão', perto(a[2].capex, 200000) && perto(a[1].capex, b[1].capex) && perto(a[3].capex, b[3].capex) && perto(a[2].caixa, b[2].caixa - 170000), JSON.stringify([a[2].capex, a[2].caixa, b[2].caixa]));
  F.ajustarCaixa('aporte', 2028, 150000);
  const c = F.fluxo();
  ex('aporte de 150.000 em 2028 entra no caixa (financiamento) e NÃO muda o DRE (sabotagem)', perto(c[2].caixa, a[2].caixa + 150000) && perto(F.dre()[2].lucro, b[2].lucro) && c[2].aporte === 150000);
  F.ajustarCaixa('distrib', 2027, 0); F.ajustarCaixa('pRec', 2029, 60);
  const e = F.fluxo();
  ex('distribuição 0% em 2027 (dist = 0, outros anos 50%); prazo de receber 60 dias em 2029 sobe a NCG do ano', e[1].dist === 0 && e[2].dist > 0 && e[3].pRec === 60 && e[3].ncg > c[3].ncg && perto(e[3].ncgBase, e[3].receita / 360 * (60 * 0.6 - 20 + 20)), JSON.stringify([e[1].dist, e[3].ncg, c[3].ncg]));
  ex('4 linhas ajustadas ficam em dados.ajc e sobrevivem ao recálculo', F.nAjustesCaixa() === 4 && F.get().dados.ajc.capex[2028] === 200000);
  w.abrirPagina('fin_fluxo'); F.renderFluxo(); const bf = d.getElementById('fin_fluxo_result');
  ex('o Fluxo mostra a linha "(+) Aporte", células ✎, a tabela de ajustes (5 × 8) e o gráfico de 96 meses', /Aporte de sócio/.test(bf.textContent) && (bf.textContent.match(/✎/g) || []).length >= 4 && bf.querySelectorAll('input.fin-ajc').length === 40 && !!bf.querySelector('svg polyline') && /Saldo mês a mês/.test(bf.textContent));
  F.ajustarCaixa('capex', 2028, '');
  ex('apagar a célula remove o ajuste', F.nAjustesCaixa() === 3 && !(F.get().dados.ajc.capex));
  F.limparAjustesCaixa();
  ex('limpar zera tudo e o caixa volta ao padrão', F.nAjustesCaixa() === 0 && perto(F.fluxo()[2].caixa, b[2].caixa));

  /* necessidade de capital */
  F.set({ caixa0: 5000, cmin: 2 }, O);
  const k = F.fluxo().capital;
  ex('com caixa inicial de 5.000 e mínimo de 2 meses, falta capital: quanto = alvo − pior saldo mensal; quando = mês/ano; custo = falta × 18% × anos até 2033', k.falta > 0 && k.quando && k.quando.mes >= 1 && perto(k.falta, k.alvo - (k.alvo + k.folga)) && perto(k.custo, k.falta * 0.18 * k.anos, 2), JSON.stringify(k));
  w.abrirPagina('fin_fluxo'); F.renderFluxo();
  ex('o KPI "Capital necessário" diz quanto, até quando e o custo', /Capital necessário/.test(bf.textContent) && /custa R\$/.test(bf.textContent) && /para manter 2 mês/.test(bf.textContent));
  F.set({ caixa0: 500000, cmin: 1 }, O);
  const k2 = F.fluxo().capital;
  ex('com caixa de 500.000, nenhum capital necessário (folga positiva, menor folga informada)', k2.falta === 0 && k2.custo === 0 && k2.folga > 0);

  /* cenários de caixa */
  F.set({ caixa0: 50000 }, O);
  const base = F.fluxo(); F.cenarioCaixa('pess'); const st = F.fluxo();
  ex('estresse: receber +15 dias, inadimplência ×2, ressarcimento 180 — a partir de 2027; 2026 intocado (sabotagem)', st[1].pRec === 45 && perto(st[1].inad, base[1].inad * 2) && st[0].pRec === 30 && perto(st[0].inad, base[0].inad) && st[7].saldo < base[7].saldo, JSON.stringify([st[1].pRec, st[1].inad, base[1].inad, st[0].pRec]));
  ex('o estresse fica em dados.cenc e o DRE não muda (é cenário de caixa)', F.get().dados.cenc === 'pess' && perto(F.dre()[7].lucro, b[7].lucro));
  F.renderFluxo();
  ex('a tabela de cenários tem Estresse, Base e Folga com capital necessário e quando', /Estresse/.test(bf.textContent) && /Folga/.test(bf.textContent) && /capital necessário/.test(bf.textContent));
  F.cenarioCaixa('otim'); const ot = F.fluxo();
  ex('folga: receber −10 dias, inadimplência ÷2, ressarcimento 30 → saldo 2033 maior', ot[1].pRec === 20 && ot[7].saldo > base[7].saldo);
  F.cenarioCaixa('base');
  ex('voltar ao base apaga dados.cenc', F.get().dados.cenc == null);
  const paleta = (w.PDF_PALETAS && w.PDF_PALETAS.dourado) || { primaria: '#c9a227', textoEscuro: '#111' };
  F.set({ caixa0: 5000, cmin: 2 }, O);
  const r = w.buildPaginasFin({ escritorio: 'E', contador: 'J', crc: '1', contato: 'x', cor: 'dourado', logoData: null }, paleta, 5);
  ex('o PDF diz o capital necessário no KPI do pior saldo', /capital necessário: R\$/.test(r.html));

  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado'); process.exit(falhou ? 1 : 0);
}, 9000);
