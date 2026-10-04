/* PROVA v917/v919/v921 — LEITURA DO DONO no ITFE (empresario.html). Lote 1: Dentro × Híbrido, Split, Regime Ótimo.
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
  { pg: 'precmassa', abrir: 'formpreco', grade: true, rodar: (w) => { w.lhPmItemExemplo(); w.lhPmItem(); }, deve: [/R\$ 100,00/, /R\$ 100,38/, /perde <b>R\$ 0,30 por item/], semExemplo: true },
  /* v921 · lote 3 (Funrural, Cooperativa, Fundopem, CAPEX, Farmácia, Posto) */
  { pg: 'agro01', kpis: 'kpi-agro01', recs: true, rodar: (w) => { set(w, 'agro01_receita', 3000000); set(w, 'agro01_folha', 240000); w.calcularAGRO01(); }, deve: [/R\$ 48\.900 por ano/, /R\$ 58\.800/, /R\$ 9\.900 a menos por ano/, /R\$ 195\.000 por ano/, /STF/] },
  { pg: 'agro12', kpis: 'kpi-agro12', recs: true, rodar: (w) => { set(w, 'agro12_ato', 30000000); set(w, 'agro12_terc', 10000000); w.calcularAGRO12(); }, deve: [/R\$ 284\.000/, /R\$ 1\.208\.000/, /R\$ 924\.000 por ano/, /R\$ 352\.000<\/b> em 2027/, /imposto novo é <b>zero/] },
  { pg: 'ind09', kpis: 'kpi-ind09', recs: true, rodar: (w) => { w.calcularIND09(); }, deve: [/R\$ 3\.000\.000 por ano/, /deixa de receber <b>R\$ 3\.000\.000/, /habilite no prazo/, /R\$ 1\.297\.500 por ano/] },
  { pg: 'capex', kpis: 'kpi-capex', recs: true, rodar: (w) => { set(w, 'capex_valor', 100000); w.calcularCapex(); }, deve: [/R\$ 9\.5(59|60)/, /R\$ 90\.44\d/, /em 2029/, /volta para a empresa/] },
  { pg: 'medicamento', kpis: 'kpi-medicamento', recs: true, rodar: (w) => { set(w, 'med_sub', 'medicamento_geral'); set(w, 'med_fat', 100000); set(w, 'med_atual', 17.86); set(w, 'med_cred', 30); w.calcularMedicamento(); }, deve: [/R\$ 17\.860/, /R\$ 7\.420 por ano/, /R\$ 10\.440 a menos/, /redução de 60%/] },
  { pg: 'combustivel', kpis: 'kpi-combustivel', recs: true, rodar: (w) => { set(w, 'comb_vol', 5000000); set(w, 'comb_novo', 2.2); set(w, 'comb_atual', 2.01); w.calcularCombustivel(); }, deve: [/uma vez só/, /R\$ 10\.050\.000/, /R\$ 11\.000\.000/, /R\$ 950\.000 a mais/, /R\$ 2,20 por litro/, /estimativa/] }
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
    if (k.recs) { const rc = d.getElementById('recs-' + k.pg); ex(k.pg + ': a leitura do contador (com base legal) sai de cena', !rc || !visivel(E, rc)); }
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
  console.log('--- lote 3: os outros caminhos ---');
  const troca = (fn, pg, mut) => { const u = E.LH_PONTE.ultimo[fn]; u.resultado = Object.assign(JSON.parse(JSON.stringify(u.resultado)), mut); u.quando = 'teste-' + pg; E.LH_DONO_ATUALIZAR(pg); return E.document.getElementById('pcp-dono-' + pg).innerHTML; };
  let h2 = troca('calcularCapex', 'capex', { regime: 'simples', credito_apropriado: 0, custo_liquido_do_bem: 100000, credito_perdido_no_simples: 9559.56 });
  ex('capex: no Simples, o cartão diz que o imposto não volta', /não volta/.test(h2) && /Dentro × Híbrido/.test(h2) && !/volta para a empresa/.test(h2));
  h2 = troca('calcularAGRO12', 'agro12', { opcao_art271_exercida: false, ibs_cbs_ato_cooperativo: 1056000 });
  ex('agro12: sem a opção, o cartão mostra o custo e manda levar à assembleia', /R\$ 1\.056\.000/.test(h2) && /assembleia/.test(h2));
  h2 = troca('calcularAGRO01', 'agro01', { opcao_folha: { total: 28000 }, economia_anual: 20900, vence: 'OPTAR PELA FOLHA' });
  ex('agro01: com folha baixa, o cartão aponta a folha', /folha sai <b>R\$ 20\.900 mais barata/.test(h2) && /janeiro/.test(h2));
  h2 = troca('calcularIND09', 'ind09', { compensacao_fundo: 0, perda_liquida: 3000000, custo_2029: 1597500 });
  ex('ind09: sem cobertura do fundo, o cartão diz que nada é compensado', /nada disso é compensado/.test(h2) && /R\$ 1\.597\.500/.test(h2));
  console.log('--- tema claro legível (v921) ---');
  E.Element.prototype.getClientRects = function () { return [{ width: 1, height: 1 }]; };   /* o jsdom não faz layout */
  E.abrirPagina('c01'); await espera(300);
  const pc = E.document.getElementById('page-c01'), sp = E.document.createElement('span');
  sp.id = 'tst-claro'; sp.textContent = 'texto branco de tela escura'; sp.style.color = '#ffffff'; pc.appendChild(sp); await espera(400);
  E.setTema('claro'); await espera(200); E.LH_CLARO_AJUSTAR();
  const cor = (el) => (E.getComputedStyle(el).color.match(/\d+/g) || []).slice(0, 3).map(Number);
  const c1 = cor(sp);
  ex('claro: texto branco fixo vira escuro e legível', c1.length === 3 && Math.max(...c1) < 120 && sp.hasAttribute('data-pcp-cor'), c1.join(','));
  const pd = E.document.querySelector('#pcp-dono-c01 p');
  ex('claro: texto do cartão do dono em cor escura', !!pd && cor(pd).join(',') === '42,42,42', pd && cor(pd).join(','));
  E.setTema('onyx'); await espera(200);
  ex('escuro de volta: a cor original volta', cor(sp).join(',') === '255,255,255' && !E.document.querySelector('[data-pcp-cor]'));
  ex('CORE: sem o ajuste do claro (só no produto)', typeof C.LH_CLARO_AJUSTAR === 'undefined');
  sp.remove();
  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado'); process.exit(falhou ? 1 : 0);
})();
