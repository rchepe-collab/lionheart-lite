/* PROVA DO ICMS-ST NA PRECIFICAÇÃO — v886
   O ST pago na compra é custo morto hoje; conforme o ICMS some (1/10 ao ano de 2029 a 2032, zero em 2033) o IBS que o
   substitui é creditável. custo(ano) = custo × (1 − 3,65%·(1−fPis) − stEmb·(1−fIcms)).
   Cerveja (cheia+IS): preço 10, custo 6, ICMS 18, ICMS_ST 1,20/un (20% do custo), Presumido, manter o que fica.
     hoje: fica 7,835 · lucro 1,835. 2033: custo = 6 × (1 − 0,0365 − 0,20) = 4,581 · lucro 3,254 · stCred 1,20.
     2030 (8/10): custo = 6 × (1 − 0,0365 − 0,20×0,2) = 5,541.
   Sem a coluna: custo 2033 = 5,781 (só o PIS/COFINS). Coluna em %: "ICMS_ST_%" = 20 → mesmo resultado.
   Cartão "um item": campo ICMS-ST pago na compra → mesma conta. Simples: nada muda.
   Uso: npm i --no-save jsdom && node prova_precmassa_st.js */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
let falhou = 0;
const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(82, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const perto = (a, b, t) => Math.abs((+a) - (+b)) <= (t === undefined ? 0.006 : t);
const H = ['CODIGO', 'DESCRICAO', 'NCM', 'PRECO_VENDA', 'CUSTO', 'ALIQUOTA_ICMS', 'CST_ICMS', 'ICMS_ST'];
const ROWS = [H, ['1', 'CERVEJA LATA 350ML', '22030000', 10, 6, 18, '060', 1.2], ['2', 'PARAFUSO', '73181500', 100, 60, 18, '000', '']];
const ROWS_PCT = [['CODIGO', 'DESCRICAO', 'NCM', 'PRECO_VENDA', 'CUSTO', 'ALIQUOTA_ICMS', 'CST_ICMS', 'ICMS_ST_%'], ['1', 'CERVEJA LATA 350ML', '22030000', 10, 6, 18, '060', 20]];
function rodar(html, rows, regime) {
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
            w.abrirPagina('precmassa'); S('pm_regime', regime || 'presumido'); S('pm_estr', 'fica'); S('pm_leitura', 'fisco'); w.lhPmRender();
            const r = w.PM_ULTIMO.rows.find((x) => /CERVEJA/.test(x.f.desc)); const y = r ? r.c.anos : null;
            out.st = r ? r.f.st : null; out.c33 = y && y[2033].custo; out.c30 = y && y[2030].custo; out.c27 = y && y[2027].custo; out.l33 = y && y[2033].lucro; out.stCred = y && y[2033].stCred; out.stValor = y && y[2033].stValor;
            out.fica = y && y[2033].fica; out.fin33 = y && y[2033].finalCli;
            out.html = $('pm-result').innerHTML; out.kpi = [...$('pm-result').querySelectorAll('.kpi-card')].map((e) => e.textContent.replace(/\s+/g, ' ').trim());
            const p = w.PM_ULTIMO.rows.find((x) => /PARAFUSO/.test(x.f.desc)); out.paraf33 = p ? p.c.anos[2033].custo : null;
            /* cartão um item */
            w.abrirPagina('formpreco'); S('pmi_cod', '22030000'); S('pmi_desc', 'CERVEJA LATA'); S('pmi_preco', 10); S('pmi_custo', 6); S('pmi_icms', 18); S('pmi_st', 1.2); S('pm_regime', regime || 'presumido'); w.lhPmItemClassifica(); w.lhPmItem();
            out.itemLinhas = [...$('pmi_res').querySelectorAll('table tr')].filter((x) => x.querySelectorAll('td').length).map((x) => [...x.querySelectorAll('td')].map((c) => c.textContent.trim()));
            out.itemHtml = $('pmi_res').innerHTML;
          } catch (e) { out.erro = e.message + ' ' + (e.stack || '').split('\n')[1]; }
          w.close(); ok(out); };
        poll();
      } catch (e) { out.erro = e.message; w.close(); ok(out); }
    }, 9000);
  });
}
(async () => {
  const r = await rodar(APP, ROWS);
  ex('carregou sem erro', !r.erro, r.erro);
  if (!r.erro) {
    ex('cerveja marcada ST (CST 060) e ST de 1,20 lido da coluna ICMS_ST', r.st === true && perto(r.stValor, 1.2), r.st + ' ' + r.stValor);
    ex('2027: só o PIS/COFINS sai do custo (ICMS ainda inteiro): 5,781', perto(r.c27, 5.781), r.c27);
    ex('2030 (ICMS a 8/10): custo 5,541 = 6 × (1 − 0,0365 − 0,20×0,2)', perto(r.c30, 5.541), r.c30);
    ex('2033: custo 4,581 = 6 × (1 − 0,0365 − 0,20) · crédito do ST 1,20', perto(r.c33, 4.581) && perto(r.stCred, 1.2), r.c33 + ' ' + r.stCred);
    ex('2033: o que fica 7,835 não muda; lucro sobe para 3,254', perto(r.fica, 7.835) && perto(r.l33, 3.254), r.fica + ' ' + r.l33);
    ex('parafuso (sem ST) continua 57,81 em 2033', perto(r.paraf33, 57.81), r.paraf33);
    ex('KPI "ICMS-ST que vira crédito de IBS em 2033": 1 item · custo cai 1,20', r.kpi.some((t) => /ICMS-ST que vira crédito/.test(t) && /1 itens/.test(t) && /1,20/.test(t)), r.kpi.filter((t) => /ST/.test(t)).join(' | '));
    ex('premissas dizem que o ST entrou em 1 item', /em 1 itens deste catálogo/.test(r.html), '');
    const l33 = r.itemLinhas.find((l) => l[0] === '2033') || [];
    ex('cartão "um item" com ICMS-ST 1,20: custo 2033 = 4,58 · lucro 3,25', l33[1] === '4,58' && l33[2] === '3,25', l33.join(' | '));
    ex('conta aberta do item: cabeçalho "(+ ST)" e rodapé cita o ST de 1,20 → crédito 1,20', /\(\+ ST\)/.test(r.itemHtml) && /ICMS-ST de 1,20/.test(r.itemHtml), '');
  }
  const p = await rodar(APP, ROWS_PCT);
  ex('coluna "ICMS_ST_%" = 20 dá o mesmo custo 2033 (4,581)', !p.erro && perto(p.c33, 4.581), p.erro || p.c33);
  const sn = await rodar(APP, ROWS, 'simples');
  ex('Simples: o ST não mexe no custo (6,00 em 2033)', !sn.erro && perto(sn.c33, 6), sn.erro || sn.c33);
  console.log('\n-- ao contrário --');
  const sab = async (nome, alvo, troca, teste) => {
    if (APP.split(alvo).length !== 2) throw new Error('sabotagem "' + nome + '" não achou o alvo');
    const s = await rodar(APP.replace(alvo, troca), ROWS); ex(nome, !s.erro && teste(s), s.erro);
  };
  await sab('o ST deixa de sair do custo (stEmb ignorado) → 2033 volta a 5,781 → reprova', "stEmb=stValor/custoBase;", "stEmb=0;", (s) => !perto(s.c33, 4.581));
  await sab('o ST sai inteiro já em 2027 (sem a curva do ICMS) → 2027 = 4,581 → reprova', "- stEmb*(1-fIcms)*cred);", "- stEmb*cred);", (s) => !perto(s.c27, 5.781));
  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado');
  process.exit(falhou ? 1 : 0);
})();
