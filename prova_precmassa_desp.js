/* PROVA v888 — PIS/COFINS embutido por grupo e o KPI de crédito de despesas (fora das linhas)
   Parafuso 100 · custo 60 · ICMS 18 · Presumido. Geral 3,65 → custo 2033 57,81. Grupo FERRAGEM = 9,25 → 60 × (1 − 0,0925) = 54,45.
   Despesas 10% da receita × 8,65 dentro: 2027 = 10% × 3,65 (só PIS/COFINS some) = 0,365% · 2033 = 10% × 8,65 = 0,865%.
   Simples: caixa escondida, KPI não aparece. Nenhum preço de item muda com a despesa.
   Uso: npm i --no-save jsdom && node prova_precmassa_desp.js */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
let falhou = 0;
const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(82, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const perto = (a, b, t) => Math.abs((+a) - (+b)) <= (t === undefined ? 0.006 : t);
const ROWS = [['CODIGO', 'DESCRICAO', 'NCM', 'PRECO_VENDA', 'CUSTO', 'ALIQUOTA_ICMS', 'GRUPO'], ['1', 'PARAFUSO A', '73181500', 100, 60, 18, 'FERRAGEM'], ['2', 'PARAFUSO B', '73181500', 100, 60, 18, 'OUTROS']];
function rodar(html, regime, fn) {
  return new Promise((ok) => {
    const w = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://lionheartintelligence.com.br/app.html', virtualConsole: new VirtualConsole() }).window;
    w.fetch = () => new Promise(() => {}); w.HTMLElement.prototype.scrollIntoView = function () {}; w.scrollTo = function () {};
    setTimeout(() => {
      const out = { erro: '' };
      try {
        const d = w.document, $ = (id) => d.getElementById(id), S = (id, v) => { const e = $(id); if (e) e.value = v; };
        w.abrirPagina('classmassa'); w.cmProcessar(ROWS.map((r) => r.slice()));
        const poll = () => { if (!w.CM_ULTIMO) return setTimeout(poll, 100);
          try {
            w.abrirPagina('precmassa'); S('pm_regime', regime); S('pm_estr', 'fica'); w.lhPmRender();
            if (fn) fn(w, d, $, S);
            w.lhPmRender();
            const by = {}; w.PM_ULTIMO.rows.forEach((r) => { by[r.f.desc] = { c33: r.c.anos[2033].custo, f33: r.c.anos[2033].finalCli, pg: r.c.pisEmbGrupo }; });
            out.by = by; out.kpi = [...$('pm-result').querySelectorAll('.kpi-card')].map((e) => e.textContent.replace(/\s+/g, ' ').trim());
            out.despBox = $('pm_desp_box').style.display; out.pgBox = $('pm_pisemb_grupos_box').style.display; out.html = $('pm-result').innerHTML;
          } catch (e) { out.erro = e.message + ' ' + (e.stack || '').split('\n')[1]; }
          w.close(); ok(out); };
        poll();
      } catch (e) { out.erro = e.message; w.close(); ok(out); }
    }, 9000);
  });
}
(async () => {
  const r = await rodar(APP, 'presumido', (w, d, $, S) => { const g = d.querySelector('#pm_pisemb_grupos input.pm-pg[data-grupo="FERRAGEM"]'); if (g) g.value = 9.25; S('pm_desp', 10); S('pm_despemb', 8.65); });
  ex('carregou sem erro', !r.erro, r.erro);
  if (!r.erro) {
    ex('campos "% embutido por grupo" existem (FERRAGEM, OUTROS) e a caixa de despesas aparece', r.pgBox === '' && r.despBox === '', r.pgBox + '|' + r.despBox);
    ex('grupo FERRAGEM = 9,25% → custo 2033 = 54,45', perto(r.by['PARAFUSO A'].c33, 54.45) && r.by['PARAFUSO A'].pg === 9.25, JSON.stringify(r.by['PARAFUSO A']));
    ex('grupo OUTROS sem valor → geral 3,65 → 57,81', perto(r.by['PARAFUSO B'].c33, 57.81) && r.by['PARAFUSO B'].pg == null, JSON.stringify(r.by['PARAFUSO B']));
    const k = r.kpi.find((t) => /Crédito de despesas/.test(t)) || '';
    ex('KPI "Crédito de despesas": +0,87% da receita em 2033 · +0,37% em 2027 — "ganho da empresa, não do item"', /\+0,87%/.test(k) && /\+0,37% em 2027/.test(k) && /não do item/.test(k), k);
    ex('a despesa não mexe no preço de nenhum item (parafuso B continua 99,11)', perto(r.by['PARAFUSO B'].f33, 99.11), String(r.by['PARAFUSO B'].f33));
    ex('premissas registram o % embutido por grupo e a despesa informada', /FERRAGEM 9,25%/.test(r.html) && /Informado: 10% da receita/.test(r.html), '');
  }
  const sn = await rodar(APP, 'simples', (w, d, $, S) => { S('pm_desp', 10); });
  ex('Simples: caixa de despesas escondida e sem KPI; sem campos por grupo', !sn.erro && sn.despBox === 'none' && !sn.kpi.some((t) => /Crédito de despesas/.test(t)) && sn.pgBox === 'none', sn.erro || (sn.despBox + '|' + sn.pgBox));
  console.log('\n-- ao contrário --');
  const sab = async (nome, alvo, troca, teste) => {
    if (APP.split(alvo).length !== 2) throw new Error('sabotagem "' + nome + '" não achou o alvo');
    const s = await rodar(APP.replace(alvo, troca), 'presumido', (w, d, $, S) => { const g = d.querySelector('#pm_pisemb_grupos input.pm-pg[data-grupo="FERRAGEM"]'); if (g) g.value = 9.25; S('pm_desp', 10); }); ex(nome, !s.erro && teste(s), s.erro);
  };
  await sab('o % do grupo deixa de chegar ao motor → FERRAGEM volta a 57,81 → reprova', "cfg.pisEmb=cfg.pisEmbGrupo[f.grupo]; out.pisEmbGrupo=cfg.pisEmb;", "out.pisEmbGrupo=cfg.pisEmbGrupo[f.grupo];", (s) => !perto(s.by['PARAFUSO A'].c33, 54.45));
  await sab('o KPI de despesas ignora a curva (ISS some já em 2027) → 2027 = 0,87 → reprova', "iss*(1-fI)); };", "iss); };", (s) => !/\+0,37% em 2027/.test(s.kpi.find((t) => /Crédito de despesas/.test(t)) || ''));
  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado');
  process.exit(falhou ? 1 : 0);
})();
