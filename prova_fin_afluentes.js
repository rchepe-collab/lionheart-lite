/* PROVA v895 — TR08 parte 4: Dados +4 (estoque, CAPEX, amortização, distribuição); CAPEX credita no Identificador e sai do
   Fluxo; estoque entra no giro; mix de compras pelos XMLs vence o campo; indicadores (ponto de equilíbrio, carga total,
   cobertura); afluentes Reprecificação de Contratos (c02) e Dentro × Híbrido (dxh); select vazio mostra o padrão.
   Sabotagens: CAPEX creditado no Simples; contrato aplicado antes do ano; digitado sobrescrito pelo dxh.
   Uso: npm i --no-save jsdom && node prova_fin_afluentes.js */
const { JSDOM, VirtualConsole } = require('jsdom'); const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
let falhou = 0; const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(86, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const perto = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1 : tol);
const w = new JSDOM(APP, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://lionheartintelligence.com.br/app.html', virtualConsole: new VirtualConsole() }).window;
w.fetch = () => new Promise(() => {}); w.HTMLElement.prototype.scrollIntoView = function () {}; w.scrollTo = function () {}; w.alert = () => {};
setTimeout(() => {
  const d = w.document, F = w.LH_FIN; w.LH_ALIQ_REF = 26.5; const O = { tipo: 'digitado', detalhe: 'prova', quando: '2026-10-01' };
  ex('os 4 campos novos existem nos Dados e em LH_FIN.campos', ['estoque', 'capex', 'amort', 'distrib'].every((k) => !!d.getElementById('fin_' + k) && F.campos.indexOf(k) >= 0) && F.campos.length === 32);
  const de = [...d.querySelectorAll('.lh-fin-btn')].map((x) => (x.getAttribute('onclick').match(/afluente\('([^']+)'/) || [])[1]).sort();
  ex('botão "→ Usar no meu DRE / Fluxo" nas 9 análises (+ c02 e dxh)', JSON.stringify(de) === JSON.stringify(['c01', 'c02', 'c05', 'c11', 'cadeia', 'cr04', 'dxh', 'n33', 'precmassa']), de.join(','));
  ex('os botões de c02 e dxh estão nas páginas certas', !!d.querySelector('#page-c02 .lh-fin-btn') && !!d.querySelector('#page-dxh .lh-fin-btn'));

  w.localStorage.removeItem('LH_FIN::' + F.eid());
  F.set({ fat: 1200000, cresc: 0, infl: 0, regime: 'presumido', tipo: 'comercio', icms: 18, recExp: 0, compras: 660000, comprasTrat: 'cheia', desp: 8, st: 0, cartao: 2, despMkt: 0, pessoal: 180000, prolab: 60000, ocup: 40000, adm: 20000, recFin: 0, pRec: 30, pPag: 20, vista: 40, inad: 2, caixa0: 50000, ressarc: 60, estoque: 0, capex: 0, amort: 0, distrib: 0 }, O);
  w.abrirPagina('fin_dados');
  ex('select "tratamento do que você vende" vazio mostra "Alíquota cheia" (não fica em branco)', d.getElementById('fin_trat').selectedIndex === 0 && d.getElementById('fin_trat').value === 'cheia');

  /* CAPEX: credita no Identificador (regular, a partir de 2027) e sai do Fluxo */
  const base33 = F.impostos(2033), baseF = F.fluxo();
  F.set({ capex: 100000 }, O);
  const c33 = F.impostos(2033), c26 = F.impostos(2026), cF = F.fluxo();
  ex('CAPEX de 100.000: crédito de 26,5% em 2033 no Identificador; a pagar cai 26.500', perto(c33.credCapex, 26500) && perto(c33.aPagar, base33.aPagar - 26500), JSON.stringify([c33.credCapex, c33.aPagar, base33.aPagar]));
  ex('2026 (ano-teste) não credita CAPEX', c26.credCapex === 0);
  ex('no Fluxo, o CAPEX sai do caixa inteiro (100.000) e o crédito volta pela linha de imposto', perto(cF[7].capex, 100000) && perto(cF[7].caixa, baseF[7].caixa - 100000 + 26500), JSON.stringify([cF[7].caixa, baseF[7].caixa]));
  F.set({ regime: 'simples', aliqDas: 8.5 }, O);
  ex('sabotagem: no Simples o CAPEX não credita', F.impostos(2033).credCapex === 0 && F.impostos(2033).credTotal === 0);
  F.set({ regime: 'presumido', capex: 0 }, O);

  /* estoque, amortização, distribuição */
  F.set({ estoque: 30 }, O); const eF = F.fluxo();
  ex('estoque de 30 dias entra na NCG: dias = 30×0,6 − 20 + 30 = 28', perto(eF[0].dias, 28, 0.01) && perto(eF[0].ncgBase, 1200000 / 360 * 28), String(eF[0].dias));
  F.set({ estoque: 0, amort: 24000, distrib: 50 }, O); const aF = F.fluxo(), aD = F.dre();
  ex('amortização de 24.000 e 50% do lucro distribuído saem do caixa', perto(aF[0].amort, 24000) && perto(aF[0].dist, Math.max(0, aD[0].lucro) * 0.5) && perto(aF[0].caixa, aF[0].entradas - aF[0].saidas - aF[0].dNcg - 24000 - aF[0].dist));
  F.set({ amort: 0, distrib: 0 }, O);

  /* indicadores */
  const D = F.dre(), Fx = F.fluxo();
  ex('ponto de equilíbrio = fixos ÷ margem de contribuição % (receita de equilíbrio)', D[0].pe != null && perto(D[0].pe, (D[0].fixos + D[0].mkt - D[0].recFin) / (D[0].margem / D[0].receita)), String(D[0].pe));
  ex('carga total = (consumo + IRPJ/CSLL) ÷ receita', perto(D[7].cargaTotal, (D[7].impostos + D[7].irpj) / D[7].receita * 100, 0.01));
  ex('cobertura de caixa = saldo ÷ saídas mensais', Fx[7].cobertura != null && perto(Fx[7].cobertura, Fx[7].saldo / (Fx[7].saidas / 12), 0.01));
  w.abrirPagina('fin_dre'); F.renderDre(); const bd = d.getElementById('fin_dre_result');
  ex('o DRE mostra Ponto de equilíbrio e Carga total', /Ponto de equilíbrio/.test(bd.textContent) && /Carga total sobre a receita/.test(bd.textContent));
  w.abrirPagina('fin_fluxo'); F.renderFluxo(); const bf = d.getElementById('fin_fluxo_result');
  ex('o Fluxo mostra Cobertura de caixa', /Cobertura de caixa/.test(bf.textContent));

  /* mix de compras pelos XMLs vence o campo */
  const semXml = F.impostos(2033);
  w.LH_EMP_CNPJ = '11111111000191';
  w._LH_XML_NOTAS = [
    { destCNPJ: '11111111000191', emitCNPJ: '22222222000100', tpNF: '0', itens: [{ ncm: '10063021', vProd: 300 }, { ncm: '84143011', vProd: 700 }] },   /* arroz (cesta básica, zero) + compressor (cheia) */
    { destCNPJ: '33333333000100', emitCNPJ: '11111111000191', tpNF: '1', itens: [{ ncm: '84143011', vProd: 5000 }] } ];   /* venda: não entra */
  const comXml = F.impostos(2033);
  const esperado = (300 * w.cmAliqAno(w.lhVereditoNCM('10063021').trat, 2033) + 700 * 26.5) / 1000 / 100;
  ex('alíquota das compras passa a vir dos XMLs (arroz zero + compressor cheia, ponderado): ' + (esperado * 100).toFixed(2) + '%', perto(comXml.tCompras, esperado, 0.0005) && comXml.fontes.comprasXML === true && /XMLs de compra/.test(comXml.fontes.compras), JSON.stringify([comXml.tCompras, esperado]));
  ex('e o crédito das compras cai na proporção (campo "cheia" ignorado)', comXml.credCompras < semXml.credCompras && perto(comXml.credCompras, 660000 * esperado));
  ex('a nota de venda não entra no mix de compras', comXml.fontes.compras.indexOf('1 notas') >= 0);
  w._LH_XML_NOTAS = null; w.LH_EMP_CNPJ = '';

  /* afluente c02: reajuste de contratos a partir do ano */
  w.LH_PONTE.ultimo = w.LH_PONTE.ultimo || {};
  ex('c02 sem análise: não liga', F.afluente('c02') === false);
  w.LH_PONTE.ultimo.calcularC02 = { ent: { preco: 1000, ano: 2029, pct_sujeita: 80, qtd_contratos: 12 }, resultado: { novo_preco: 1100, impacto_carteira: 14400 }, quando: 'x' };
  ex('c02 liga: +10% no preço sobre 80% da receita = +8% a partir de 2029', F.afluente('c02') === true && perto(F.afluentes().contrato.pct, 0.08, 0.0001) && F.afluentes().contrato.ano === 2029);
  const Dc = F.dre();
  ex('receita 2028 inalterada; 2029 em diante × 1,08 (sabotagem: aplicar antes do ano)', perto(Dc[2].receita, 1200000) && perto(Dc[3].receita, 1296000) && perto(Dc[7].receita, 1296000), Dc.map((y) => y.ano + ':' + Math.round(y.receita)).join(' '));
  ex('o débito de 2029 incide sobre a receita reajustada', perto(Dc[3].imp.debito, 1296000 * w.getAliq(2029).total));
  F.removerAfluente('contrato');

  /* afluente dxh: regime híbrido com DAS, RBT12 e anexo */
  ex('dxh sem análise: não liga', F.afluente('dxh') === false);
  d.getElementById('dxh_anexo').value = 'I';
  w.LH_PONTE.ultimo.dxhCalc = { ent: { fat: 100000, aliq: 10, parc: 0, comp: 0, rbt12: 1200000 }, resultado: { ok: true }, quando: 'x' };
  F.set({ regime: 'presumido' }, O);
  ex('com regime DIGITADO, o dxh não sobrescreve o regime (mas liga o afluente)', F.afluente('dxh') === true && F.get().dados.regime === 'presumido' && !!F.afluentes().hibrido);
  const st = F.get(); delete st.origem.regime; delete st.origem.aliqDas; delete st.origem.hibRbt; delete st.origem.hibAnexo; w.localStorage.setItem('LH_FIN::' + F.eid(), JSON.stringify(st));
  ex('sem regime digitado, o dxh põe híbrido, DAS 10%, RBT12 e Anexo I nos Dados (origem: tela)', F.afluente('dxh') === true && F.get().dados.regime === 'hibrido' && F.get().dados.aliqDas === 10 && F.get().dados.hibRbt === 1200000 && F.get().dados.hibAnexo === 'I' && F.get().origem.regime.tipo === 'tela');
  const h33 = F.impostos(2033), fat = w.LH_fatiaDAS('I', 1200000, 2033);
  ex('e o Identificador passa a calcular o híbrido (DAS residual + IBS/CBS por fora)', h33.hib && h33.hib.faixa === fat.faixa && perto(h33.das, 1200000 * (10 - 10 * fat.federal / 100 - 10 * fat.base / 100) / 100) && h33.debito > 0);

  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado'); process.exit(falhou ? 1 : 0);
}, 9000);
