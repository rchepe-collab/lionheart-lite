/* PROVA v917/v919 — LEITURA DO DONO no ITFE (empresario.html). Lote 1: Dentro × Híbrido, Split, Regime Ótimo.
   Lote 2 (v919): NCG, Reprecificação de Contratos, Alíquota efetiva, Comprar do Simples × regular, Pró-labore,
   Dividendos e Formação de Preço (item, cálculo local — lê LH_PMI_ULTIMO).
   O servidor é simulado com resultados reais do Supabase (provas/fixtures_dono.json, tirados de
   fn_dxh / fn_c01 / fn_regime_otimo em 04/10/2026). Confere:
   1. no ITFE, o cartão "Para você, dono" aparece logo depois dos KPIs, com os números do servidor;
   2. base legal, memória de cálculo, viabilidade, pareceres e a análise do contador somem;
   3. nenhuma menção a Fecomércio / CORE visível na tela;
   4. no CORE (app.html), com o MESMO resultado, nada muda: sem cartão, técnico à vista.
   Uso: npm i --no-save jsdom && node prova_dono.js */
const { JSDOM, VirtualConsole } = require('jsdom'); const fs = require('fs'), path = require('path');
const FIX = JSON.parse(fs.readFileSync(path.join(__dirname, 'provas/fixtures_dono.json'), 'utf8'));
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
const EMP = fs.readFileSync(path.join(__dirname, 'empresario.html'), 'utf8');
let falhou = 0; const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(82, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const abre = (html, url) => {
  const w = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url, virtualConsole: new VirtualConsole(),
    beforeParse(win) { try { win.localStorage.setItem('LHCORE::lh_token', 'x.eyJlbWFpbCI6InRAdC5jb20ifQ.x'); win.sessionStorage.setItem('lh_logado', 'sim'); } catch (e) {} } }).window;
  w.fetch = (url, opt) => {
    if (/functions\/v1\/calcular/.test(String(url))) {
      let b = {}; try { b = JSON.parse(opt.body); } catch (e) {}
      const r = FIX[b.calc] ? { ok: true, calc: b.calc, resultado: JSON.parse(JSON.stringify(FIX[b.calc])), sessao: { plano: 'core' } } : { ok: false, motivo: 'sem fixture' };
      return Promise.resolve({ json: () => Promise.resolve(r) });
    }
    return new Promise(() => {});
  };
  w.HTMLElement.prototype.scrollIntoView = function () {}; w.scrollTo = function () {}; return w;
};
const visivel = (w, el) => { for (let e = el; e && e !== w.document.body; e = e.parentElement) { if (w.getComputedStyle(e).display === 'none') return false; } return true; };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const textoVisivel = (w, root) => { let t = ''; const walk = (n) => { if (n.nodeType === 3) { t += n.nodeValue; return; } if (n.nodeType !== 1) return; if (w.getComputedStyle(n).display === 'none') return; if (/^(SCRIPT|STYLE)$/.test(n.tagName)) return; n.childNodes.forEach(walk); }; walk(root); return t; };
const set = (w, id, v) => { const e = w.document.getElementById(id); if (e) e.value = v; };

const CASOS = [
  { pg: 'dxh', kpis: 'dxhKpis', rodar: (w) => { w.dxhPreset('com'); w.dxhCalc(); }, deve: [/R\$ 8\.825/, /R\$ 7\.290/, /R\$ 1\.535 mais barato por m[eê]s/, /30\/10\/2026/] },
  { pg: 'c01', kpis: 'kpi-c01', rodar: (w) => { set(w, 'c01_faturamento', 100000); w.calcularC01(); }, deve: [/R\$ 7\.128 por m[eê]s/, /R\$ 34\.062 por m[eê]s/, /R\$ 107 por m[eê]s/] },
  { pg: 'c05', kpis: 'kpi-c05', rodar: (w) => { set(w, 'c05_fat', 1200000); set(w, 'c05_folha', 20000); set(w, 'c05_custos', 50000); w.calcularC05(); }, deve: [/Simples Nacional<\/b>: R\$ 167\.548 por ano/, /Simples H[ií]brido, R\$ 26\.844 a mais/] },
  /* v919 · lote 2 */
  { pg: 'n33', kpis: 'kpi-n33', rodar: (w) => { set(w, 'n33_fat', 100000); set(w, 'n33_pct_eletronico', 90); w.calcularN33(); }, deve: [/R\$ 150\.000/, /R\$ 297\.948/, /R\$ 40\.875/, /R\$ 30\.700 por ano/] },
  { pg: 'c02', kpis: 'kpi-c02', rodar: (w) => { set(w, 'c02_preco', 50000); set(w, 'c02_margem', 20); w.calcularC02(); }, deve: [/R\$ 50\.099/, /R\$ 52\.453/, /15,7%/] },
  { pg: 'c04', kpis: 'kpi-c04', rodar: (w) => { set(w, 'c04_faturamento', 100000); w.calcularC04(); }, deve: [/R\$ 8\.650/, /R\$ 8\.036/, /2029 fica em R\$ 8\.610/, /R\$ 13\.780/] },
  { pg: 'calc03', kpis: 'kpi-calc03', rodar: (w) => { set(w, 'calc03_compra_sn', 50000); set(w, 'calc03_compra_lp', 50000); w.calcularCalc03(); }, deve: [/R\$ 47\.410/, /R\$ 45\.820/, /R\$ 1\.590 mais barato por m[eê]s/, /R\$ 48\.32\d/], semPct: true },
  { pg: 'c08', antes: 'res-c08', rodar: (w) => { set(w, 'c08_renda', 30000); set(w, 'c08_lucro', 40000); w.calcularC08(); }, deve: [/pró-labore de <b>R\$ 1\.621<\/b> \(o mínimo legal\)/, /R\$ 8\.400/, /Fator R/] },
  { pg: 'c06', kpis: 'kpi-c06', rodar: (w) => { set(w, 'c06_prolabore', 10000); set(w, 'c06_dividendo', 30000); w.calcularC06(); }, deve: [/R\$ 2\.517/, /R\$ 37\.483/, /abaixo de R\$ 50 mil/] },
  { pg: 'precmassa', abrir: 'formpreco', grade: true, rodar: (w) => { w.lhPmItemExemplo(); w.lhPmItem(); }, deve: [/R\$ 100,00/, /R\$ 100,38/, /perde <b>R\$ 0,30 por item/], semExemplo: true }
];
let E2 = null;

(async () => {
  const E = abre(EMP, 'https://lionheartintelligence.com.br/empresario.html'); E2 = E;
  const C = abre(APP, 'https://lionheartintelligence.com.br/app.html');
  await espera(16000);
  console.log('--- PROVA: leitura do dono (ITFE) ---');
  for (const k of CASOS) {
    E.abrirPagina(k.abrir || k.pg); k.rodar(E); C.abrirPagina(k.abrir || k.pg); k.rodar(C);
    await espera(3500);
    const d = E.document, P = d.getElementById('page-' + k.pg);
    const card = d.getElementById('pcp-dono-' + k.pg);
    ex(k.pg + ': cartão "Para você, dono" aparece', !!card && visivel(E, card));
    const antes = (() => { let e = card && card.previousElementSibling; while (e && e.classList.contains('pcp-tec')) e = e.previousElementSibling; return e; })();
    if (k.antes) ex(k.pg + ': no topo do resultado', !!card && card.parentElement && card.parentElement.id === k.antes && card === card.parentElement.firstElementChild);
    else if (k.grade) ex(k.pg + ': logo depois dos números do item', !!antes && antes.classList.contains('kpi-grid') && antes.parentElement.id === 'pmi_res');
    else ex(k.pg + ': logo depois dos KPIs', !!antes && antes.id === k.kpis, antes && (antes.tagName + '#' + antes.id + '.' + antes.className));
    const h = card ? card.innerHTML : '';
    k.deve.forEach((rx) => ex(k.pg + ': diz ' + rx.source.replace(/\\/g, '').slice(0, 40), rx.test(h), h.replace(/<[^>]+>/g, '').slice(0, 160)));
    ex(k.pg + ': tem "O que fazer"', /O que fazer/.test(h));
    const sums = [...P.querySelectorAll('summary')];
    const tec = sums.filter((s) => /Base legal|Mem[oó]ria de c[aá]lculo|Viabilidade|Parecer|An[aá]lise de Resultados/i.test(s.textContent));
    ex(k.pg + ': técnico e análise do contador escondidos (' + tec.length + ' blocos)', tec.every((s) => !visivel(E, s)), tec.filter((s) => visivel(E, s)).map((s) => s.textContent.trim().slice(0, 30)).join('|'));
    if (k.semPct) ex(k.pg + ': sem % de desconto que contradiga o cartão da tela', !/% de desconto/.test(h));
    if (k.semExemplo) ex(k.pg + ': exemplo do item sem Fecomércio', !/fecom/i.test((d.getElementById('pmi_desc') || {}).value || '') && !/fecom/i.test(h));
    ex(k.pg + ': nenhuma menção a Fecomércio ou CORE visível', !/Fecom[eé]rcio|\bno CORE\b|\bdo CORE\b|Lionheart CORE/.test(textoVisivel(E, P)));
    const CP = C.document.getElementById('page-' + k.pg);
    const tecC = [...CP.querySelectorAll('summary')].filter((s) => /Base legal/i.test(s.textContent));
    ex(k.pg + ': no CORE nada muda (sem cartão, nada escondido)', !C.document.getElementById('pcp-dono-' + k.pg) && !CP.querySelector('.pcp-tec'));
  }
  console.log('--- a leitura segue o resultado ---');
  const L = E.LH_PONTE.ultimo.dxhCalc; L.resultado = JSON.parse(JSON.stringify(L.resultado)); L.resultado.comparacao.vence_hibrido = false; L.resultado.comparacao.vence_dentro = true; L.quando = 'teste-dentro';
  E.LH_DONO_ATUALIZAR('dxh');
  ex('dxh: se ficar dentro vence, o cartão manda não fazer nada', /Não precisa fazer nada/.test(E.document.getElementById('pcp-dono-dxh').innerHTML));
  E.LH_PONTE.ultimo.dxhCalc = { resultado: { ok: false }, quando: 'erro' }; E.LH_DONO_ATUALIZAR('dxh');
  ex('dxh: resultado com erro some com o cartão (nunca texto sem número)', !E.document.getElementById('pcp-dono-dxh'));
  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado'); process.exit(falhou ? 1 : 0);
})();
