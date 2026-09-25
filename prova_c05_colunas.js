/* PROVA DAS COLUNAS DA REGIME ÓTIMO · v858
   Segura: no "Comparativo dos regimes", Renda + Folha + Consumo de cada regime
   fecha no Total/Ano — inclusive no Simples Híbrido, cujo detalhe o servidor
   devolve em base MENSAL (fn_dxh roda com faturamento/12) ao lado do total anual.
   Antes: as colunas do Híbrido somavam R$ 45 mil para um total de R$ 310 mil, e o
   Líquido Sócios dele aparecia como o maior dos quatro.
   Resposta do servidor gravada abaixo (números, sem nome de cliente).
   Uso: npm i --no-save jsdom && node prova_c05_colunas.js */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
const R = {"ok":true,"ano":2027,"setor":"comercio_atacado","melhor":"Simples Nacional","socios":2,"cenario":"A",
 "ranking":[{"total":325726.37,"regime":"Simples Nacional"},{"total":327137.64,"regime":"Simples Híbrido"},{"total":386851.85,"regime":"Lucro Presumido"},{"total":533317.42,"regime":"Lucro Real"}],
 "simples":{"das":304606.37,"faixa":5,"fator_r":0.223308,"disponivel":true,"inss_socio":21120,"total_anual":325726.37,"cpp_anexo_iv":0,"anexo_efetivo":"I","anexo_original":"I","fator_r_aplica":false,"aliquota_efetiva":0.111146,"aliquota_teorica":0.111146,"aliquota_fonte":"tabela do Anexo (teórica)"},
 "lucro_real":{"ok":true,"iss":0,"pis":0,"csll":61663.59,"icms":99460.8,"irpj":147287.75,"cofins":0,"cbs_ibs":48625.28,"inss_socio":21120,"lucro_anual":685151,"total_anual":533317.42,"inss_patronal":155160},
 "lucro_presumido":{"ok":true,"iss":0,"pis":0,"csll":29598.52,"icms":99460.8,"irpj":32887.25,"cofins":0,"cbs_ibs":48625.28,"elegivel":true,"inss_socio":21120,"total_anual":386851.85,"inss_patronal":155160,"adicional_lc224":0},
 "simples_hibrido":{"detalhe":{"total":25501.47,"debito":20097.76,"credito_util":20097.76,"das_reduzido":21449.37,"saldo_credor":0,"credito_cliente":20097.76,"credito_compras":16045.66,"custo_absorvido":21449.37,"ibs_cbs_liquido":4052.11,"credito_aproveitado":16045.66},"fatia_das":0.155,"parcela_pp":1.7228,"total_anual":327137.64},
 "economia_vs_pior":207591.05};
let falhou = 0;
const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(64, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const num = (t) => Number(String(t).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
function rodar(html) {
  return new Promise((ok) => {
    const w = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true,
      url: 'https://lionheartintelligence.com.br/app.html', virtualConsole: new VirtualConsole() }).window;
    setTimeout(() => {
      const set = (id, v) => { const e = w.document.getElementById(id); if (e) e.value = v; };
      set('c05_fat', '2740604'); set('c05_seg', 'comercio_atacado'); set('c05_folha', '35000'); set('c05_lucro_pct', '25');
      set('c05_custos', '182337'); set('c05_prolabore', '8000'); set('c05_socios', '2'); set('c05_ano', '2027');
      try { w.abrirPagina('c05'); } catch (e) {}
      let erro = '';
      try { w.c05Render(JSON.parse(JSON.stringify(R)), w.c05LerEntradas()); } catch (e) { erro = e.message; }
      const linhas = [...w.document.querySelectorAll('#tabela-c05 tbody tr')].map((tr) => {
        const td = [...tr.querySelectorAll('td')].map((x) => x.textContent.trim());
        return { nome: td[0], renda: num(td[1]), folha: num(td[2]), consumo: num(td[3]), total: num(td[4]), liquido: num(td[6]) };
      });
      w.close(); ok({ linhas, erro });
    }, 8000);
  });
}
(async () => {
  console.log('\n-- comparativo dos regimes: as colunas fecham no total --');
  const r = await rodar(APP);
  ex('a tela desenhou sem erro', !r.erro && r.linhas.length === 4, r.erro || (r.linhas.length + ' linhas'));
  for (const l of r.linhas) {
    const soma = l.renda + l.folha + l.consumo;
    ex(l.nome + ': Renda + Folha + Consumo = Total', Math.abs(soma - l.total) <= 2, soma.toFixed(2) + ' × ' + l.total.toFixed(2));
  }
  const sn = r.linhas.find((l) => /Nacional/.test(l.nome)), hb = r.linhas.find((l) => /brido/.test(l.nome));
  ex('Líquido Sócios do Híbrido não passa o do Simples por erro de escala', !!sn && !!hb && hb.liquido < sn.liquido * 1.05, hb && sn ? hb.liquido + ' × ' + sn.liquido : '');
  console.log('\n-- ao contrário: sem a anualização, tem de reprovar --');
  const alvo = "var _hbDasA=hibDetalhe?(+hibDetalhe.das_reduzido||0)*12:0, _hbIbsA=hibDetalhe?(+hibDetalhe.ibs_cbs_liquido||0)*12:0;";
  if (APP.split(alvo).length !== 2) throw new Error('sabotagem não achou o alvo');
  const s = await rodar(APP.replace(alvo, "var _hbDasA=hibDetalhe?(+hibDetalhe.das_reduzido||0):0, _hbIbsA=hibDetalhe?(+hibDetalhe.ibs_cbs_liquido||0):0;"));
  const hs = s.linhas.find((l) => /brido/.test(l.nome));
  ex('sem ×12 → a linha do Híbrido não fecha', !!hs && Math.abs(hs.renda + hs.folha + hs.consumo - hs.total) > 2);
  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado');
  process.exit(falhou ? 1 : 0);
})();
