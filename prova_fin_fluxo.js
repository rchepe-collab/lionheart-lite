/* PROVA v894 — Fluxo de Caixa 2026–2033 (TR08 parte 3): entradas/saídas do DRE, NCG pelos prazos, ΔNCG, saldo acumulado;
   split payment por UMA fonte (n33 > c01 > c11), saldo credor retido × prazo de ressarcimento; Créditos Plenos substitui o
   crédito de despesas. Afluentes lidos de LH_PONTE.ultimo (resultado estruturado), nunca da tela. Sabotagens: duas leituras
   do split somadas; split antes de 2027; afluente sem análise rodada.
   Uso: npm i --no-save jsdom && node prova_fin_fluxo.js */
const { JSDOM, VirtualConsole } = require('jsdom'); const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
let falhou = 0; const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(86, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const perto = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1 : tol);
const w = new JSDOM(APP, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://lionheartintelligence.com.br/app.html', virtualConsole: new VirtualConsole() }).window;
w.fetch = () => new Promise(() => {}); w.HTMLElement.prototype.scrollIntoView = function () {}; w.scrollTo = function () {}; w.alert = () => {};
setTimeout(() => {
  const d = w.document, F = w.LH_FIN; w.LH_ALIQ_REF = 26.5;
  ex('LH_FIN.fluxo / renderFluxo existem', typeof F.fluxo === 'function' && typeof F.renderFluxo === 'function');
  const ids = [...d.querySelectorAll('.nav-item[onclick]')].map((e) => (e.getAttribute('onclick').match(/abrirPagina\('([^']+)'/) || [])[1]);
  ex('aba Fluxo de Caixa no menu, logo depois do DRE', ids.indexOf('fin_fluxo') === ids.indexOf('fin_dre') + 1 && !!d.getElementById('page-fin_fluxo'));
  const de = [...d.querySelectorAll('.lh-fin-btn')].map((x) => (x.getAttribute('onclick').match(/afluente\('([^']+)'/) || [])[1]).sort();
  ex('botão "→ Usar no meu DRE / Fluxo" nas 7 análises (c05, precmassa, cadeia, c01, c11, n33, cr04)', JSON.stringify(de) === JSON.stringify(['c01', 'c05', 'c11', 'cadeia', 'cr04', 'n33', 'precmassa']), de.join(','));
  ex('cada botão está na sua página', ['c01', 'c11', 'n33', 'cr04'].every((id) => !!d.querySelector('#page-' + id + ' .lh-fin-btn')));

  const O = { tipo: 'digitado', detalhe: 'prova', quando: '2026-10-01' };
  w.localStorage.removeItem('LH_FIN::' + F.eid());
  F.set({ fat: 1200000, cresc: 0, infl: 0, regime: 'presumido', tipo: 'comercio', icms: 18, trat: 'cheia', recExp: 0, compras: 660000, comprasTrat: 'cheia', desp: 8, st: 0, cartao: 2, despMkt: 0, pessoal: 180000, prolab: 60000, ocup: 40000, adm: 20000, recFin: 0, pRec: 30, pPag: 20, vista: 40, inad: 2, caixa0: 50000, ressarc: 60 }, O);
  const S = F.fluxo(), D = F.dre(); const y26 = S[0], y27 = S[1], y33 = S[7];
  ex('8 anos', S.length === 8);
  ex('entradas = receita × (1 − 2%) = 1.176.000', perto(y26.entradas, 1176000), String(y26.entradas));
  ex('saídas = imposto + cartão + CMV + fixos + IRPJ/CSLL do DRE', perto(y26.saidas, D[0].impostos + D[0].cartao + D[0].cmv + D[0].fixos + D[0].mkt + D[0].irpj), String(y26.saidas));
  const ncgBase = 1200000 / 360 * (30 * 0.6 - 20);
  ex('NCG = receita/360 × (30 × (1 − 40%) − 20) = ' + Math.round(ncgBase) + ' (−2 dias → libera caixa)', perto(y26.ncgBase, ncgBase) && perto(y26.dias, -2, 0.01), JSON.stringify([y26.ncgBase, y26.dias]));
  ex('ΔNCG do 1º ano = 0; sem crescimento e sem split, ΔNCG = 0 nos demais', y26.dNcg === 0 && S.every((y) => perto(y.dNcg, 0)));
  ex('caixa operacional = entradas − saídas − ΔNCG; saldo acumula a partir do caixa inicial', perto(y26.caixa, y26.entradas - y26.saidas) && perto(y26.saldo, 50000 + y26.caixa) && perto(y33.saldo, 50000 + S.reduce((a, y) => a + y.caixa, 0)));
  ex('sem saldo credor, nada retido', S.every((y) => y.retido === 0 && y.credor === 0));

  /* exportador: saldo credor vira caixa retido */
  F.set({ recExp: 60 }, O); const Se = F.fluxo();
  ex('exportador 60%: saldo credor de 2033 × 60/360 fica retido no giro', Se[7].credor > 0 && perto(Se[7].retido, Se[7].credor * 60 / 360), JSON.stringify([Se[7].credor, Se[7].retido]));
  ex('o retido entra na NCG e, ao surgir em 2027, sai do caixa pela ΔNCG', Se[1].retido > 0 && perto(Se[1].dNcg, Se[1].ncg - Se[0].ncg) && Se[1].dNcg > 0);
  F.set({ recExp: 0 }, O);

  /* afluentes de caixa pelo LH_PONTE.ultimo */
  w.LH_PONTE.ultimo = {};
  ex('c01 sem análise rodada: não liga', F.afluente('c01') === false);
  w.LH_PONTE.ultimo.calcularC01 = { ent: { faturamento_mensal: 100000 }, resultado: { ok: true, float_atual_mensal: 9125, projecao: [{ ano: 2026, gap_de_caixa_mensal: 0 }, { ano: 2027, gap_de_caixa_mensal: 23100 }, { ano: 2029, gap_de_caixa_mensal: 30590 }] }, quando: 'x' };
  ex('c01 liga e lê o gap mensal por ano do resultado estruturado', F.afluente('c01') === true && F.afluentes().split.anos[2027] === 23100 && d.getElementById('page-fin_fluxo').classList.contains('active'));
  const Sc = F.fluxo();
  ex('split entra na NCG a partir de 2027 (23.100), 2028 repete o último ano conhecido, 2029 = 30.590; 2026 = 0', Sc[0].ncgSplit === 0 && perto(Sc[1].ncgSplit, 23100) && perto(Sc[2].ncgSplit, 23100) && perto(Sc[3].ncgSplit, 30590), Sc.map((y) => y.ano + ':' + Math.round(y.ncgSplit)).join(' '));
  ex('a ΔNCG de 2027 tira os 23.100 do caixa', perto(Sc[1].dNcg, 23100) && perto(Sc[1].caixa, Sc[1].entradas - Sc[1].saidas - 23100));
  w.LH_PONTE.ultimo.calcularN33 = { ent: { faturamento_mensal: 100000 }, resultado: { ncg_2026: 50000, ncg_2033: 90000, camada_split_2033: 35000, aumento_da_ncg: 40000 }, quando: 'x' };
  ex('n33 liga e DESLIGA o c01 (uma leitura só do split — sabotagem: somar as duas)', F.afluente('n33') === true && !F.afluentes().split && !!F.afluentes().ncg);
  const Sn = F.fluxo();
  ex('camada do split escalada 2027→2033: 2033 = 35.000, 2027 = 35.000/7', perto(Sn[7].ncgSplit, 35000) && perto(Sn[1].ncgSplit, 5000) && Sn[0].ncgSplit === 0, Sn.map((y) => y.ano + ':' + Math.round(y.ncgSplit)).join(' '));
  w.LH_PONTE.ultimo.calcularC11 = { ent: { faturamento_mensal: 100000 }, resultado: { retido_no_split: 18000, impacto_total_ano: 25000 }, quando: 'x' };
  ex('c11 liga e desliga o n33; retido por mês vira NCG a partir de 2027', F.afluente('c11') === true && !F.afluentes().ncg && perto(F.fluxo()[1].ncgSplit, 18000) && F.fluxo()[0].ncgSplit === 0);
  F.removerAfluente('splitop');
  ex('desligar devolve a NCG só dos prazos', F.fluxo().every((y) => y.ncgSplit === 0));

  /* cr04 substitui o crédito de despesas no Identificador */
  const antes = F.impostos(2029).credDesp;
  w.LH_PONTE.ultimo.calcularCR04 = { ent: { ano: 2029, regime: 'lp', aliquota: 26.5 }, resultado: { ok: true, credito_anual: 15000, credito_mensal: 1250 }, quando: 'x' };
  ex('cr04 liga', F.afluente('cr04') === true && F.afluentes().credDesp.credito === 15000);
  const A29 = w.getAliq(2029), A33 = w.getAliq(2033);
  ex('crédito de despesas de 2029 = 15.000 (ano de referência); 2033 escalado pela curva = 15.000 × 26,5/10,57', perto(F.impostos(2029).credDesp, 15000) && perto(F.impostos(2033).credDesp, 15000 * A33.total / A29.total) && F.impostos(2029).credDesp !== antes, JSON.stringify([F.impostos(2029).credDesp, F.impostos(2033).credDesp]));
  ex('e o DRE/Fluxo seguem o Identificador (imposto de 2029 cai no valor do crédito novo − antigo)', perto(F.dre()[3].impostos, (function () { F.removerAfluente('credDesp'); const v = F.dre()[3].impostos - (15000 - antes); w.LH_PONTE.ultimo.calcularCR04 && F.afluente('cr04'); return v; })()));

  /* a aba desenha */
  w.abrirPagina('fin_fluxo'); F.renderFluxo(); const box = d.getElementById('fin_fluxo_result');
  ex('tabela com 8 anos: Entradas, Saídas, Capital de giro, Variação do giro, Caixa operacional, Saldo acumulado', box.querySelectorAll('thead th').length === 9 && ['Entradas', 'Saídas', 'Capital de giro', 'Variação do giro', 'Caixa operacional', 'Saldo acumulado'].every((t) => box.textContent.indexOf(t) >= 0));
  ex('KPIs: saldo 2033, pior saldo, NCG em dias, caixa retido; barras por ano', /Pior saldo/.test(box.textContent) && /dias/.test(box.textContent) && /Caixa retido/.test(box.textContent) && /caixa operacional por ano/.test(box.textContent));
  ex('painel de afluentes lista os Créditos Plenos ligados', /Créditos Plenos/.test(d.getElementById('fin_fluxo_afluentes').textContent));
  ex('"Como ler" e Premissas carimbam a conta', /Como ler este fluxo/.test(box.textContent) && /Premissas desta conta/.test(box.textContent));
  ex('sem faturamento, pede os Dados', (F.set({ fat: null }, O), F.renderFluxo(), /Faltam os Dados/.test(box.textContent)));

  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado'); process.exit(falhou ? 1 : 0);
}, 9000);
