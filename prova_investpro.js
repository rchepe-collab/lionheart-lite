/* PROVA v926 — ITFE etapa 4 · InvestPRO: Excesso de caixa, Saúde financeira e Comprar um bem.
   1. as 3 telas no pilar "Investimento" do ITFE e fora do menu do CORE;
   2. Comprar um bem: Price, valor presente e crédito do bem (valor × t/(1+t), t = getAliq(ano)) conferidos
      contra uma conta independente; no Simples o crédito é zero; o mais barato é o de menor custo líquido;
   3. Excesso de caixa fecha com o Fluxo: sobra = saldo − caixa mínimo − giro que ainda vai ser preciso;
   4. Saúde financeira: nota = média dos sinais (verde 100, amarelo 50, vermelho 0) com os números do DRE/Fluxo;
   5. sem Dados da Empresa, as telas pedem os dados em vez de mostrar zero; texto sem Fecomércio/lei.
   Uso: npm i --no-save jsdom && node prova_investpro.js */
const { JSDOM, VirtualConsole } = require('jsdom'); const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
const EMP = fs.readFileSync(path.join(__dirname, 'empresario.html'), 'utf8');
let falhou = 0; const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(82, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const abre = (html, url) => { const w = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url, virtualConsole: new VirtualConsole(),
    beforeParse(win) { try { win.localStorage.setItem('LHCORE::lh_token', 'x.eyJlbWFpbCI6InRAdC5jb20ifQ.x'); win.sessionStorage.setItem('lh_logado', 'sim'); } catch (e) {} } }).window;
  w.fetch = () => new Promise(() => {}); w.HTMLElement.prototype.scrollIntoView = function () {}; w.scrollTo = function () {}; return w; };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const idDo = (el) => ((el.getAttribute('onclick') || '').match(/abrirPagina\(\s*['"]([\w-]+)['"]/) || [])[1];
const perto = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1 : tol);
const PGS = ['inv_caixa', 'inv_saude', 'inv_ativos'];
(async () => {
  const E = abre(EMP, 'https://lionheartintelligence.com.br/empresario.html');
  const C = abre(APP, 'https://lionheartintelligence.com.br/app.html');
  await espera(14000);
  console.log('--- PROVA: InvestPRO (v926) ---');
  const tit = [...E.document.querySelectorAll('nav .nav-group-title[data-pcp]')].map((t) => t.textContent.replace(/[▼▶]/g, '').trim());
  const itE = [...E.document.querySelectorAll('nav .nav-item[data-pcp]')].map(idDo), itC = [...C.document.querySelectorAll('nav.nav-section .nav-item[onclick]')].map(idDo);
  ex('ITFE: pilar INVESTIMENTO logo depois do FINANCEIRO, com as 3 telas', tit.indexOf('INVESTIMENTO') === tit.indexOf('FINANCEIRO') + 1 && PGS.every((p) => itE.includes(p)), tit.join('|'));
  ex('CORE: as 3 telas fora do menu', PGS.every((p) => !itC.includes(p)));
  /* sem dados */
  E.abrirPagina('inv_saude'); await espera(400);
  ex('sem Dados da Empresa: Saúde pede os dados (não mostra zero)', /Faltam os Dados da Empresa/.test(E.document.getElementById('inv_saude_res').textContent));
  /* comprar um bem */
  const p = { valor: 300000, ano: 2027, rend: 0.8, regular: true, desc: 5, ent: 20, juros: 1.4, nf: 48, adm: 16, fundo: 2, nc: 80, cont: 24 };
  const R = E.LH_INVEST.ativos(p), t = E.getAliq(2027).total, r = 0.008;
  const a = (rr, n) => (1 - Math.pow(1 + rr, -n)) / rr;
  const pmt = 240000 * 0.014 / (1 - Math.pow(1.014, -48));
  ex('financiamento: parcela pela tabela Price', perto(R.fi.parcela, pmt, 0.01), R.fi.parcela.toFixed(2) + ' × ' + pmt.toFixed(2));
  ex('financiamento: custo em dinheiro de hoje = entrada + parcelas descontadas − crédito', perto(R.fi.liquido, 60000 + pmt * a(r, 48) - 300000 * t / (1 + t), 0.5));
  ex('à vista: com desconto e crédito sobre o valor pago', perto(R.av.liquido, 285000 - 285000 * t / (1 + t), 0.5));
  const parc = 300000 * 1.18 / 80;
  ex('consórcio: parcela com adm + fundo e crédito só quando o bem chega (mês 24)', perto(R.co.parcela, parc, 0.01) && perto(R.co.liquido, parc * a(r, 80) - (300000 * t / (1 + t)) / Math.pow(1 + r, 24), 0.5));
  ex('crédito do bem igual ao do servidor (fn_capex: valor × t/(1+t)) — 2029 a 10,57%', perto(E.LH_INVEST.ativos(Object.assign({}, p, { ano: 2029 })).fi.credito, 300000 * 0.1057 / 1.1057, 0.01));
  ex('no Simples, o bem não gera crédito', E.LH_INVEST.ativos(Object.assign({}, p, { regular: false })).fi.credito === 0);
  ex('o mais barato é o de menor custo líquido', [R.av, R.fi, R.co].every((o) => R.melhor.liquido <= o.liquido));
  E.abrirPagina('inv_ativos'); await espera(300); E.document.getElementById('inv_a_valor').value = 300000; E.document.getElementById('inv_a_reg').value = 'sim'; E.LH_INVEST.renderAtivos(); await espera(200);
  const ta = E.document.getElementById('inv_ativos_res').textContent;
  ex('tela do bem: leitura do dono com o mais barato e o aviso do consórcio', /Para você, dono/.test(ta) && new RegExp(R.melhor.nome.toLowerCase()).test(ta.toLowerCase()) && /data não é garantida/.test(ta));
  /* excesso de caixa e saúde, com dados */
  const D = { fat: 4800000, regime: 'presumido', compras: 2400000, pessoal: 720000, prolab: 120000, ocup: 180000, adm: 150000, cresc: 5, infl: 4, pRec: 45, pPag: 30, vista: 20, estoque: 40, caixa0: 900000, distrib: 30 };
  E.LH_FIN.set(D, { tipo: 'digitado' });
  const CX = E.LH_INVEST.caixa(9), S = E.LH_FIN.fluxo();
  const okCx = CX.every((y, i) => { let mx = S[i].ncg; for (let j = i; j < S.length; j++) mx = Math.max(mx, S[j].ncg); return perto(y.excedente, S[i].saldo - S[i].alvo - Math.max(0, mx - S[i].ncg), 0.01) && perto(y.rende, Math.max(0, y.excedente) * 0.09, 0.01); });
  ex('Excesso de caixa fecha com o Fluxo (saldo − caixa mínimo − giro futuro) nos 8 anos', okCx);
  E.abrirPagina('inv_caixa'); await espera(400);
  const tc = E.document.getElementById('inv_caixa_res').textContent;
  ex('tela do caixa: mostra a sobra de 2026 e a leitura do dono', tc.includes('R$ ' + Math.round(Math.max(0, CX[0].excedente)).toLocaleString('pt-BR')) && /Para você, dono/.test(tc));
  const SA = E.LH_INVEST.saude(), Dr = E.LH_FIN.dre(), RG = E.LH_INVEST.regua;
  const notaMao = (i) => { const pts = []; RG.forEach((r) => { const v = r.f(Dr[i], S[i]); if (r.bom == null || v == null || isNaN(v)) return; const s = r.maior ? (v >= r.bom ? 2 : v >= r.ruim ? 1 : 0) : (v <= r.bom ? 2 : v <= r.ruim ? 1 : 0); pts.push(s * 50); }); return Math.round(pts.reduce((a, b) => a + b, 0) / pts.length); };
  ex('Saúde: nota de hoje e de 2033 conferidas com a régua', SA.hoje.nota === notaMao(0) && SA.z.nota === notaMao(7), SA.hoje.nota + '/' + SA.z.nota);
  ex('Saúde: margem líquida igual à do DRE', perto(SA.hoje.it.margem.v, Dr[0].margemPct, 1e-9));
  E.abrirPagina('inv_saude'); await espera(400);
  const ts = E.document.getElementById('inv_saude_res').textContent;
  ex('tela da saúde: notas e leitura do dono', ts.includes(SA.hoje.nota + '/100') && /Para você, dono/.test(ts));
  for (const pg of PGS) { const tx = E.document.getElementById('page-' + pg).textContent; ex(pg + ': sem Fecomércio nem citação de lei', !/Fecom|LC 214|art\. \d|Lei \d/.test(tx)); }
  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado'); process.exit(falhou ? 1 : 0);
})();
