/* PROVA DO CRÉDITO POR ORIGEM DA COMPRA — v887
   Parafuso 100 · custo 60 · ICMS 18 · Presumido · manter o que fica. Custo 2033 = 60 × (1 − 0,0365 × cred):
     regular (100%) → 57,81 · Simples (20%) → 59,562 · pessoa física (0) → 60,00 · CRED_% 50 → 58,905.
   Cascata: CRED_% da linha > ORIGEM_COMPRA da linha > % do grupo > % geral > Cadeia > 100.
   Cartão "um item": % da compra com crédito = 20 → 59,56. Excel: colunas Credito_% / Credito_origem.
   Uso: npm i --no-save jsdom && node prova_precmassa_cred.js */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
let falhou = 0;
const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(82, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const perto = (a, b, t) => Math.abs((+a) - (+b)) <= (t === undefined ? 0.006 : t);
const H = ['CODIGO', 'DESCRICAO', 'NCM', 'PRECO_VENDA', 'CUSTO', 'ALIQUOTA_ICMS', 'GRUPO', 'ORIGEM_COMPRA', 'CRED_%'];
const ROWS = [H,
  ['1', 'PARAFUSO REGULAR', '73181500', 100, 60, 18, 'FERRAGEM', 'regular', ''],
  ['2', 'PARAFUSO SIMPLES', '73181500', 100, 60, 18, 'FERRAGEM', 'Simples Nacional', ''],
  ['3', 'PARAFUSO PF', '73181500', 100, 60, 18, 'FERRAGEM', 'pessoa física', ''],
  ['4', 'PARAFUSO CRED50', '73181500', 100, 60, 18, 'FERRAGEM', 'regular', 50],
  ['5', 'PARAFUSO GRUPO', '73181500', 100, 60, 18, 'HORTI', '', ''],
  ['6', 'PARAFUSO GERAL', '73181500', 100, 60, 18, '', '', '']];
function rodar(html, rows, fn) {
  return new Promise((ok) => {
    const w = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://lionheartintelligence.com.br/app.html', virtualConsole: new VirtualConsole() }).window;
    w.fetch = () => new Promise(() => {}); w.HTMLElement.prototype.scrollIntoView = function () {}; w.scrollTo = function () {};
    setTimeout(() => {
      const out = { erro: '' };
      try {
        const d = w.document, $ = (id) => d.getElementById(id), S = (id, v) => { const e = $(id); if (e) e.value = v; };
        w.abrirPagina('classmassa'); w.cmProcessar(rows.map((r) => r.slice()));
        const poll = () => { if (!w.CM_ULTIMO) return setTimeout(poll, 100);
          try {
            w.abrirPagina('precmassa'); S('pm_regime', 'presumido'); S('pm_estr', 'fica'); S('pm_leitura', 'fisco'); w.lhPmRender();
            if (fn) fn(w, d, $, S);
            w.lhPmRender();
            const by = {}; w.PM_ULTIMO.rows.forEach((r) => { by[r.f.desc] = { c33: r.c.anos[2033].custo, cred: r.c.cred }; });
            out.by = by; out.html = $('pm-result').innerHTML; out.credBox = $('pm_cred_box').style.display; out.credN = $('pm_cred_n').textContent;
            out.grupos = [...d.querySelectorAll('#pm_cred_grupos input.pm-cg')].map((e) => e.getAttribute('data-grupo'));
            /* cartão um item */
            w.abrirPagina('formpreco'); S('pmi_cod', '73181500'); S('pmi_desc', 'PARAFUSO'); S('pmi_preco', 100); S('pmi_custo', 60); S('pmi_icms', 18); S('pmi_cred', 20); S('pm_regime', 'presumido'); w.lhPmItemClassifica(); w.lhPmItem();
            out.itemLinhas = [...$('pmi_res').querySelectorAll('table tr')].filter((x) => x.querySelectorAll('td').length).map((x) => [...x.querySelectorAll('td')].map((c) => c.textContent.trim()));
            S('pmi_cred', '');
          } catch (e) { out.erro = e.message + ' ' + (e.stack || '').split('\n')[1]; }
          w.close(); ok(out); };
        poll();
      } catch (e) { out.erro = e.message; w.close(); ok(out); }
    }, 9000);
  });
}
(async () => {
  const r = await rodar(APP, ROWS, (w, d, $, S) => { S('pm_cred', 80); w.lhPmRender(); const g = d.querySelector('#pm_cred_grupos input.pm-cg[data-grupo="HORTI"]'); if (g) g.value = 0; });
  ex('carregou sem erro', !r.erro, r.erro);
  if (!r.erro) {
    const b = r.by;
    ex('caixa "De quem você compra?" aparece (há custo, Presumido) e conta as colunas da planilha', r.credBox === '' && /4 com ORIGEM_COMPRA/.test(r.credN) && /1 linhas com CRED_%/.test(r.credN), r.credBox + ' | ' + r.credN);
    ex('ORIGEM regular → 100% → custo 2033 = 57,81', perto(b['PARAFUSO REGULAR'].c33, 57.81) && b['PARAFUSO REGULAR'].cred.pct === 100, JSON.stringify(b['PARAFUSO REGULAR']));
    ex('ORIGEM "Simples Nacional" → 20% → 59,562', perto(b['PARAFUSO SIMPLES'].c33, 59.562) && b['PARAFUSO SIMPLES'].cred.pct === 20, JSON.stringify(b['PARAFUSO SIMPLES']));
    ex('ORIGEM "pessoa física" → 0 → custo não cai (60,00)', perto(b['PARAFUSO PF'].c33, 60) && b['PARAFUSO PF'].cred.pct === 0, JSON.stringify(b['PARAFUSO PF']));
    ex('CRED_% 50 na linha vence a origem → 58,905 (origem "linha")', perto(b['PARAFUSO CRED50'].c33, 58.905) && b['PARAFUSO CRED50'].cred.origem === 'linha', JSON.stringify(b['PARAFUSO CRED50']));
    ex('grupo HORTI = 0 → 60,00 (origem "grupo")', perto(b['PARAFUSO GRUPO'].c33, 60) && b['PARAFUSO GRUPO'].cred.origem === 'grupo', JSON.stringify(b['PARAFUSO GRUPO']));
    ex('sem nada na linha nem grupo → % geral 80 → 58,248 (origem "geral")', perto(b['PARAFUSO GERAL'].c33, 58.248) && b['PARAFUSO GERAL'].cred.origem === 'geral', JSON.stringify(b['PARAFUSO GERAL']));
    ex('campos por grupo: FERRAGEM e HORTI', r.grupos.join(',') === 'FERRAGEM,HORTI', r.grupos.join(','));
    ex('tabela mostra o % de crédito ao lado de "líq." quando < 100', /líq\. <b style="color:#e0a83a">20%<\/b>/.test(r.html) && /líq\. <b style="color:#e0a83a">0%<\/b>/.test(r.html), '');
    ex('premissas contam os itens por origem do crédito', /itens por origem/.test(r.html) && /itens por linha/.test(r.html) && /itens por grupo/.test(r.html) && /itens por geral/.test(r.html), '');
    const l33 = r.itemLinhas.find((l) => l[0] === '2033') || [];
    ex('cartão "um item" com 20% de crédito: custo 2033 = 59,56', l33[1] === '59,56', l33.join(' | '));
  }
  const s0 = await rodar(APP, ROWS, null);
  ex('sem % geral: item sem origem cai no padrão 100% → 57,81 (origem "padrão (100%)")', !s0.erro && perto(s0.by['PARAFUSO GERAL'].c33, 57.81) && /padrão/.test(s0.by['PARAFUSO GERAL'].cred.origem), s0.erro || JSON.stringify(s0.by['PARAFUSO GERAL']));
  console.log('\n-- ao contrário --');
  const sab = async (nome, alvo, troca, teste) => {
    if (APP.split(alvo).length !== 2) throw new Error('sabotagem "' + nome + '" não achou o alvo');
    const s = await rodar(APP.replace(alvo, troca), ROWS, null); ex(nome, !s.erro && teste(s), s.erro);
  };
  await sab('o item deixa de levar o % dele ao motor (cfg.creditavel=cr.fr ignorado) → Simples volta a 57,81 → reprova', "cfg.creditavel=cr.fr;", "cfg.creditavel=1;", (s) => !perto(s.by['PARAFUSO SIMPLES'].c33, 59.562));
  await sab('a origem "simples" passa a valer 100 → reprova', "simples:20, simplesnacional:20, sn:20, mei:20,", "simples:100, simplesnacional:100, sn:100, mei:100,", (s) => !perto(s.by['PARAFUSO SIMPLES'].c33, 59.562));
  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado');
  process.exit(falhou ? 1 : 0);
})();
