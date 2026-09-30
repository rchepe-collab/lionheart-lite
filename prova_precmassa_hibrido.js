/* PROVA v889 — SIMPLES HÍBRIDO NA PRECIFICAÇÃO (art. 41), com a tabela do Dentro × Híbrido
   Anexo I, RBT12 500 mil (faixa 3), DAS efetivo 8%: federal 15,5% → 1,24% (PIS/COFINS, sai em 2027); base 33,5% → 2,68% (ICMS, sai 2029-33).
   Parafuso 100, custo 60, integral, manter o que fica:
     hoje: velho 3,92 → fica 96,08 (o DAS residual de 4,08% fica dentro). 2027: fora 8,8% × 96,08 = 8,455; ICMS-fatia 2,68% sobre o total
     (leitura fisco): velho = 0,0268×(96,08+8,455)/0,9732 = 2,879 → 107,41. 2033: velho 0, fora 25,46 → 121,54; líquido PJ 96,08.
   Simples puro: 100 em todos os anos. Sem Anexo/aliq: híbrido sem imposto velho → 2033 = 126,50 e aviso na tela.
   Ponte C05: _C05_REGIMES aponta híbrido → link "precificar nesse regime". Puxar do DxH copia os campos.
   Uso: npm i --no-save jsdom && node prova_precmassa_hibrido.js */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
let falhou = 0;
const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(82, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const perto = (a, b, t) => Math.abs((+a) - (+b)) <= (t === undefined ? 0.011 : t);
const ROWS = [['CODIGO', 'DESCRICAO', 'NCM', 'PRECO_VENDA', 'CUSTO', 'ALIQUOTA_ICMS'], ['1', 'PARAFUSO', '73181500', 100, 60, 18]];
function rodar(html, fn) {
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
            w.abrirPagina('precmassa'); S('pm_estr', 'fica'); S('pm_leitura', 'fisco');
            const y = () => { w.lhPmRender(); const r = w.PM_ULTIMO.rows[0]; return { a: r.c.anos, icms: r.c.icmsUsado, pis: r.c.pisUsado, hib: r.c.hib, box: $('pm_hib_box').style.display, info: $('pm_hib_info').textContent, html: $('pm-result').innerHTML, c05: $('pm_c05_info').innerHTML }; };
            S('pm_regime', 'hibrido'); S('pm_hib_anexo', 'I'); S('pm_hib_rbt', 500000); S('pm_hib_aliq', 8); out.h = y();
            S('pm_regime', 'simples'); out.s = y();
            S('pm_regime', 'hibrido'); S('pm_hib_anexo', ''); S('pm_hib_aliq', ''); out.vazio = y();
            /* puxar do DxH */
            S('dxh_anexo', 'III'); S('dxh_rbt12', 900000); S('dxh_aliq', 11.2); w.lhPmHibDoDxh(); out.puxado = { anexo: $('pm_hib_anexo').value, rbt: $('pm_hib_rbt').value, aliq: $('pm_hib_aliq').value };
            /* ponte C05 */
            w._C05_REGIMES = [{ nome: 'Lucro Presumido', total: 120000 }, { nome: 'Simples Híbrido', total: 90000, hibrido: true }, { nome: 'Simples Nacional', total: 100000 }];
            S('pm_regime', 'presumido'); out.c05 = y().c05;
            const a = $('pm_c05_info').querySelector('a'); if (a) a.click(); out.regimeDepois = $('pm_regime').value;
            if (fn) fn(w, d, $, S, out);
          } catch (e) { out.erro = e.message + ' ' + (e.stack || '').split('\n')[1]; }
          w.close(); ok(out); };
        poll();
      } catch (e) { out.erro = e.message; w.close(); ok(out); }
    }, 9000);
  });
}
(async () => {
  const r = await rodar(APP);
  ex('carregou sem erro', !r.erro, r.erro);
  if (!r.erro) {
    const h = r.h;
    ex('caixa do híbrido aparece e a info diz o que sai do DAS (1,24% PIS/COFINS · 2,68% ICMS · faixa 3)', h.box === '' && /faixa 3/.test(h.info) && /1,24%/.test(h.info) && /2,68%/.test(h.info), h.info.slice(0, 160));
    ex('ICMS/ISS e PIS/COFINS usados = fatias do DAS (2,68 / 1,24), não o ICMS do cadastro', perto(h.icms, 2.68) && perto(h.pis, 1.24), h.icms + ' ' + h.pis);
    ex('hoje: velho 3,92 · fica 96,08', perto(h.a[2033].velhoHoje, 3.92) && perto(h.a[2033].ficaHoje, 96.08), h.a[2033].velhoHoje + ' ' + h.a[2033].ficaHoje);
    ex('2027: IBS/CBS 8,46 fora · fatia ICMS 2,88 dentro · prateleira 107,41', perto(h.a[2027].fora, 8.455) && perto(h.a[2027].velho, 2.879) && perto(h.a[2027].finalCli, 107.41), JSON.stringify([h.a[2027].fora, h.a[2027].velho, h.a[2027].finalCli]));
    ex('2033: velho 0 · IBS/CBS 25,46 · prateleira 121,54 · líquido PJ 96,08', perto(h.a[2033].velho, 0) && perto(h.a[2033].fora, 25.46) && perto(h.a[2033].finalCli, 121.54) && perto(h.a[2033].liqPJ, 96.08), JSON.stringify([h.a[2033].velho, h.a[2033].fora, h.a[2033].finalCli, h.a[2033].liqPJ]));
    ex('crédito de compra vale no híbrido: custo 2033 = 57,81', perto(h.a[2033].custo, 57.81), h.a[2033].custo);
    ex('conta aberta e premissas falam da fatia do DAS e do art. 41', /fatia do DAS que sai/.test(h.html) && /Simples híbrido \(art\. 41\)/.test(h.html), '');
    ex('Simples puro: 100,00 em todos os anos, custo não muda', perto(r.s.a[2027].finalCli, 100) && perto(r.s.a[2033].finalCli, 100) && perto(r.s.a[2033].custo, 60), JSON.stringify([r.s.a[2027].finalCli, r.s.a[2033].finalCli, r.s.a[2033].custo]));
    ex('híbrido sem Anexo/alíquota: sem imposto velho → 126,50 e aviso amarelo', perto(r.vazio.a[2033].finalCli, 126.5) && /Preencha Anexo/.test(r.vazio.info), r.vazio.a[2033].finalCli + ' ' + r.vazio.info.slice(0, 60));
    ex('"puxar do Dentro × Híbrido" copia Anexo III · 900.000 · 11,2', r.puxado.anexo === 'III' && +r.puxado.rbt === 900000 && +r.puxado.aliq === 11.2, JSON.stringify(r.puxado));
    ex('ponte C05: "Regime Ótimo apontou Simples Híbrido" com link; clicar muda o regime da tabela', /Simples Híbrido/.test(r.c05) && /precificar nesse regime/.test(r.c05) && r.regimeDepois === 'hibrido', r.c05.slice(0, 120) + ' | ' + r.regimeDepois);
  }
  console.log('\n-- ao contrário --');
  const sab = async (nome, alvo, troca, teste) => {
    if (APP.split(alvo).length !== 2) throw new Error('sabotagem "' + nome + '" não achou o alvo');
    const s = await rodar(APP.replace(alvo, troca)); ex(nome, !s.erro && teste(s), s.erro);
  };
  await sab('o híbrido deixa de ler a tabela do DxH (fatia ignorada) → 2027 sem imposto velho → reprova', "pis=al*fat.federal/100; icms=al*fat.base/100;", "pis=0; icms=0;", (s) => !perto(s.h.a[2027].finalCli, 107.41));
  await sab('o híbrido volta a ser tratado como Simples puro (neutro) → 100 em 2033 → reprova', "var neutro=(regime==='simples' || ano<=2026);", "var neutro=(regime==='simples' || regime==='hibrido' || ano<=2026);", (s) => !perto(s.h.a[2033].finalCli, 121.54));
  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado');
  process.exit(falhou ? 1 : 0);
})();
