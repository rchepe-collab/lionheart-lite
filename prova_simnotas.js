/* PROVA DO SIMULADOR DE NOTAS · v859
   Segura três coisas na nota simulada:
   1. cada item mostra o par CST-IBS/CBS · cClassTrib (da mesma amostra do Auditor de Cadastro);
   2. "quem paga o quê": por fora (cliente paga valor + IBS/CBS) e por dentro (o valor já é o preço
      final — base = valor/(1+r), IBS/CBS = diferença); ICMS/ISS sempre dentro do preço;
   3. o alerta do fornecedor do Simples diz o que o código faz (20% do cheio), não mais "50%".
   Os valores tributários entram como resposta gravada do servidor (item a item), como a tela recebe.
   Caso: 2027, venda de R$ 1.000 no padrão (IBS 1,00 + CBS 87,00 no ano; ICMS 180,00 dentro do preço)
         + R$ 500 de alimentos (−60%); compra de R$ 600 de fornecedor do Simples.
   Uso: npm i --no-save jsdom && node prova_simnotas.js */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
let falhou = 0;
const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(66, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const num = (t) => Number(String(t).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
const perto = (a, b, tol) => Math.abs(a - b) <= (tol || 0.02);

function rodar(html) {
  return new Promise((ok) => {
    const w = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true,
      url: 'https://lionheartintelligence.com.br/app.html', virtualConsole: new VirtualConsole() }).window;
    w.fetch = () => new Promise(() => {}); /* servidor mudo: a prova injeta a resposta */
    setTimeout(() => {
      const d = w.document, $ = (id) => d.getElementById(id);
      const out = { erro: '' };
      try {
        try { w.abrirPagina('simnotas'); } catch (e) {}
        if (typeof w.snAno === 'function') w.snAno(2027);
        const idx = (nome) => w.LH_CLASSIF_PRODUTOS.findIndex((p) => p.n === nome);
        /* — venda: padrão + reduzido 60% — */
        $('snv_prod').value = String(idx('Comércio - Varejo Geral')); $('snv_qtd').value = 1; $('snv_vu').value = 1000; w.snAddV();
        $('snv_prod').value = String(idx('Alimentos para Consumo Humano')); $('snv_qtd').value = 1; $('snv_vu').value = 500; w.snAddV();
        const RV = [
          { ok: true, nota_de_venda: { ibs: 1.00, cbs: 87.00 }, tributo_velho: { valor: 180.00 } },
          { ok: true, nota_de_venda: { ibs: 0.40, cbs: 34.80 }, tributo_velho: { valor: 90.00 } }];
        w.snvRender(JSON.parse(JSON.stringify(RV)), w.snvLerEntradas());
        const ths = [...d.querySelectorAll('#snv_lista th')].map((x) => x.textContent.trim());
        const cods = [...d.querySelectorAll('#snv_lista td.sn-cod')].map((x) => x.textContent.trim());
        out.venda = { ths, cods, paga: num($('snv_paga').textContent), novo: num($('snv_novo').textContent),
          velho: num($('snv_velho2').textContent), fica: num($('snv_fica').textContent), txt: $('snv_quem_txt').textContent };
        /* — por dentro — */
        const rd = d.querySelector('input[name="snv_modo"][value="dentro"]'); rd.checked = true;
        w.snvRender(JSON.parse(JSON.stringify(RV)), w.snvLerEntradas());
        out.dentro = { paga: num($('snv_paga').textContent), novo: num($('snv_novo').textContent), fica: num($('snv_fica').textContent) };
        /* — compra de fornecedor do Simples — */
        $('snc_forn_reg').value = 'simples';
        $('snc_prod').value = String(idx('Comércio - Varejo Geral')); $('snc_qtd').value = 1; $('snc_vu').value = 600; w.snAddC();
        w.sncRender([{ ok: true, nota_de_venda: { ibs: 0.60, cbs: 52.20 }, tributo_velho: { valor: 0 } }], w.sncLerEntradas());
        out.compra = { alerta: $('snc_alerta').innerHTML, cred: num($('snc_cred').textContent),
          cods: [...d.querySelectorAll('#snc_lista td.sn-cod')].map((x) => x.textContent.trim()) };
      } catch (e) { out.erro = e.message; }
      w.close(); ok(out);
    }, 8000);
  });
}
(async () => {
  console.log('\n-- nota de venda: códigos por item e quem paga o quê --');
  const r = await rodar(APP);
  ex('a tela rodou sem erro', !r.erro, r.erro);
  if (!r.erro) {
    ex('a tabela tem a coluna CST · cClassTrib', r.venda.ths.includes('CST · cClassTrib'), r.venda.ths.join('|'));
    ex('item padrão → 000 · 000001', r.venda.cods[0] === '000 · 000001', r.venda.cods[0]);
    ex('item −60% (alimentos) → 200 · 200003', r.venda.cods[1] === '200 · 200003', r.venda.cods[1]);
    ex('por fora: cliente paga 1.500 + 123,20 = 1.623,20', perto(r.venda.paga, 1623.20), r.venda.paga);
    ex('por fora: IBS + CBS na nota = 123,20', perto(r.venda.novo, 123.20), r.venda.novo);
    ex('ICMS/ISS dentro do preço = 270,00', perto(r.venda.velho, 270), r.venda.velho);
    ex('fica com você = 1.500 − 270 = 1.230,00', perto(r.venda.fica, 1230), r.venda.fica);
    ex('o texto explica que o IBS/CBS vira crédito do cliente PJ', /crédito/.test(r.venda.txt), r.venda.txt.slice(0, 80));
    /* por dentro: r = 123,20/1.500 = 0,082133 → base = 1.386,14 → IBS/CBS = 113,86 → fica = 1.386,14 − 270 = 1.116,14 */
    ex('por dentro: cliente paga o valor informado (1.500,00)', perto(r.dentro.paga, 1500), r.dentro.paga);
    ex('por dentro: IBS/CBS = 1.500 − 1.500/1,082133 = 113,86', perto(r.dentro.novo, 113.86, 0.05), r.dentro.novo);
    ex('por dentro: fica com você = 1.116,14', perto(r.dentro.fica, 1116.14, 0.05), r.dentro.fica);
    console.log('\n-- nota de compra: fornecedor do Simples --');
    ex('o alerta diz 20% do imposto cheio (o que o código faz)', /20% do imposto cheio/.test(r.compra.alerta), r.compra.alerta.slice(0, 120));
    ex('o alerta não diz mais 50%', !/50%/.test(r.compra.alerta));
    ex('o alerta cita o art. 47 §9º', /art\. 47/.test(r.compra.alerta));
    ex('crédito = 20% de (0,60 + 52,20) = 10,56', perto(r.compra.cred, 10.56), r.compra.cred);
    ex('a nota de compra também mostra os códigos', r.compra.cods[0] === '000 · 000001', r.compra.cods[0]);
  }
  console.log('\n-- ao contrário: cada sabotagem tem de reprovar --');
  const sab = async (nome, alvo, troca, teste) => {
    if (APP.split(alvo).length !== 2) throw new Error('sabotagem "' + nome + '" não achou o alvo');
    const s = await rodar(APP.replace(alvo, troca));
    ex(nome, !s.erro && teste(s), s.erro || '');
  };
  await sab('sem a coluna de códigos → reprova', "<th title=\"CST-IBS/CBS · cClassTrib — sugestão da amostra oficial; o contador confirma\">CST · cClassTrib</th>", '',
    (s) => !s.venda.ths.includes('CST · cClassTrib'));
  await sab('por dentro sem o gross-up (base = valor) → IBS/CBS zera → reprova', 'var base=tot/(1+r); novoD=tot-base;', 'var base=tot; novoD=tot-base;',
    (s) => !perto(s.dentro.novo, 113.86, 0.05));
  await sab('por fora sem somar o IBS/CBS ao que o cliente paga → reprova', 'novoD=novo; paga=tot+novo; fica=tot-velho;', 'novoD=novo; paga=tot; fica=tot-velho;',
    (s) => !perto(s.venda.paga, 1623.20));
  await sab('alerta de volta ao "50%" → reprova', 'aqui estimamos <b>20% do imposto cheio</b>', 'aqui estimamos 50%',
    (s) => !/20% do imposto cheio/.test(s.compra.alerta));
  await sab('balde errado no item manual/catálogo → códigos errados → reprova', "var mb={ZERO:'zero','60':'red60','30':'red30','40':'red40',PADRAO:'cheia'};\n  var chave=mb[(it&&it.b)||'PADRAO']||'cheia';",
    "var mb={ZERO:'zero','60':'red60','30':'red30','40':'red40',PADRAO:'cheia'};\n  var chave='cheia';",
    (s) => s.venda.cods[1] !== '200 · 200003');
  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado');
  process.exit(falhou ? 1 : 0);
})();
