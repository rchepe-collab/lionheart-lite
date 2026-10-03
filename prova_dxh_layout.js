/* PROVA v908/v908b/v909 — Dentro × Híbrido: resultado na ordem da casa (KPIs → gráfico → como usar → análise → detalhamento → pareceres →
   memória → base legal → viabilidade → nota → PDF), sem o organizador v244 desfazer; prazos da Resolução CGSN 194/2026.
   Uso: npm i --no-save jsdom && node prova_dxh_layout.js */
const { JSDOM, VirtualConsole } = require('jsdom'); const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
let falhou = 0; const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(86, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const RA = { ok: true, ano: 2027, dentro: { das: 27016.12, credito_util: 439.67, credito_cliente: 4187.38, custo_absorvido: 39311.48 }, so_cbs: false, cenario: 'A', hibrido: { total: 31932.28, debito: 21398.9, credito_util: 2246.88, das_reduzido: 22828.74, saldo_credor: 0, credito_cliente: 21398.9, credito_compras: 12295.36, custo_absorvido: 30976.41, ibs_cbs_liquido: 9103.54, credito_aproveitado: 12295.36 }, fatia_sn: 0.155, fator_ano: 0.332075472, comparacao: { b2b: 10.5, repasse: 0.105, diferenca: 4916.17, credito_icms: 0, vence_dentro: false, b2b_aproveita: 10.5, credito_extra: 1807.21, vence_hibrido: false } };
const w = new JSDOM(APP, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://lionheartintelligence.com.br/app.html', virtualConsole: new VirtualConsole() }).window;
w.fetch = () => new Promise(() => {}); w.HTMLElement.prototype.scrollIntoView = function () {}; w.scrollTo = function () {}; w.alert = () => {}; w.HTMLCanvasElement.prototype.getContext = () => null;
setTimeout(() => {
  const d = w.document; w.abrirPagina('dxh');
  const S = (id, v) => { const e = d.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new w.Event('input')); } };
  S('dxh_rbt12', '2740604.05'); S('dxh_anexo', 'I'); S('dxh_fat', '243169.36'); S('dxh_aliq', '11.11'); try { w.dxhAutoParcela(); } catch (e) {}
  S('dxh_comp', '160000'); S('dxh_forn_regular', '85'); S('dxh_forn_simples', '15'); S('dxh_cli_regular', '10.5'); S('dxh_cli_b2c', '89.5');
  ex('parcela automática do DAS = 1,722 (Anexo I, faixa 5, 15,5%)', d.getElementById('dxh_parc').value === '1.722', d.getElementById('dxh_parc').value);
  w.LH_IMPORT_CLI = { ok: true, pB2C: 89.5, pB2B: 10.5, pExp: 0, pPub: 89.5, nNotas: 133 };
  const ent = w.dxhLerEntradas(); w.LH_PONTE.ultimo.dxhCalc = { resultado: RA, ent: ent, quando: 'x' }; w.dxhRender(RA, ent);
  setTimeout(() => {
    const res = d.getElementById('dxhRes'); const kids = [...res.children];
    const pos = (f) => kids.findIndex(f); const sum = (re) => (el) => { const s = el.querySelector && el.querySelector(':scope > summary'); return !!s && re.test(s.textContent); };
    const iK = pos((e) => e.id === 'dxhKpis'), iG = pos((e) => e.id === 'dxhGrafico'), iC = pos(sum(/Como usar/)), iA = pos(sum(/Análise de Resultados/)), iD = pos((e) => e.id === 'dxhDetalhe'), iP = pos(sum(/Parecer do consultor/)), iB = pos(sum(/Base legal/)), iV = pos(sum(/Viabilidade/)), iPdf = pos((e) => e.id === 'dxhBtnPdfCli' || (e.querySelector && e.querySelector('#dxhBtnPdfCli')));
    ex('ordem: KPIs → gráfico → como usar → análise → detalhamento → parecer → base legal → viabilidade → PDF', iK === 0 && iK < iG && iG < iC && iC < iA && iA < iD && iD < iP && iP < iB && iB < iV && iV < iPdf, [iK, iG, iC, iA, iD, iP, iB, iV, iPdf].join(','));
    const kt = d.getElementById('dxhKpis').textContent;
    ex('KPIs: dentro R$ 27.016,12 · híbrido R$ 31.932,28 · custa a mais R$ 4.916,17 · crédito extra R$ 1.807,21', /27\.016,12/.test(kt) && /31\.932,28/.test(kt) && /custa a mais/.test(kt) && /4\.916,17/.test(kt) && /1\.807,21/.test(kt), kt.slice(0, 200));
    ex('a tabela completa fica dentro do Detalhamento (recolhido)', !!d.querySelector('#dxhDetalhe #dxhTabela') && !d.getElementById('dxhDetalhe').open);
    ex('o veredito continua: "Dentro do Simples tende a ganhar" e o "Por que" do ente público', /Dentro do Simples tende a ganhar/.test(res.textContent) && /entes p[uú]blicos/.test(res.textContent));
    w.dxhArrumar(); const k2 = [...res.children].map((e) => e.id || (e.querySelector && e.querySelector(':scope > summary') ? e.querySelector(':scope > summary').textContent.slice(0, 12) : e.tagName)).join('|');
    ex('arrumar de novo não muda nada (idempotente) e não duplica KPIs nem detalhamento', d.querySelectorAll('#dxhKpis').length === 1 && d.querySelectorAll('#dxhDetalhe').length === 1 && k2 === kids.map((e) => e.id || (e.querySelector && e.querySelector(':scope > summary') ? e.querySelector(':scope > summary').textContent.slice(0, 12) : e.tagName)).join('|'));
    const pg = d.getElementById('page-dxh').textContent;
    ex('prazos atualizados: Resolução CGSN 194/2026, até 30/10, cancelamento 03/11 a 20/12; nenhuma menção à 186 na tela', /194\/2026/.test(pg) && /30\/10\/2026/.test(pg) && /20\/12/.test(pg) && !/186\/2026/.test(pg));
    ex('nenhum texto exibido da plataforma cita mais a Resolução 186 (só comentário de código)', !/186\/2026/.test(APP.replace(/\/\*[\s\S]*?\*\//g, '')));
    const velhas = [...APP.matchAll(/1[º°o]\s*a\s*30(?:\/set\/| de setembro de )2026/gi)].filter((m) => /h[ií]brido/i.test(APP.slice(Math.max(0, m.index - 300), m.index + m[0].length + 300)));
    ex('nenhum prazo antigo do híbrido ("1º a 30/set/2026" ou "1º a 30 de setembro de 2026"); Regularize fica de fora', velhas.length === 0, velhas.map((m) => 'linha ' + APP.slice(0, m.index).split('\n').length).join(', '));
    const SEMCOM = APP.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));   /* comentário de código fica de fora, mesmas linhas */
    const datas = [...SEMCOM.matchAll(/30\/(?:09|11)\/2026/g)].filter((m) => /h[ií]brido/i.test(SEMCOM.slice(Math.max(0, m.index - 300), m.index + m[0].length + 300)));
    ex('nenhum "30/09/2026" ou "30/11/2026" perto de "híbrido" (Regularize e Transação PGFN ficam de fora)', datas.length === 0, datas.map((m) => m[0] + ' na linha ' + SEMCOM.slice(0, m.index).split('\n').length).join(', '));
    /* v909 · 2º Comparar (outro valor): o gráfico continua logo depois dos KPIs e a tabela continua dentro do Detalhamento */
    w.dxhRender(RA, ent);
    setTimeout(() => {
      const k3 = [...res.children]; const j = (f) => k3.findIndex(f);
      ex('2º Comparar: KPIs primeiro, gráfico logo depois, tabela dentro do Detalhamento', j((e) => e.id === 'dxhKpis') === 0 && j((e) => e.id === 'dxhGrafico') < 3 && !!d.querySelector('#dxhDetalhe > #dxhDetalheCorpo #dxhTabela') && j((e) => e.id === 'dxhDetalheCorpo') < 0, k3.map((e) => e.id || e.tagName).slice(0, 5).join(','));
      console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado'); process.exit(falhou ? 1 : 0);
    }, 3500);
    return;
    console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado'); process.exit(falhou ? 1 : 0);
  }, 3500);
}, 9000);
