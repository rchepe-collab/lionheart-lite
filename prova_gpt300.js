/* PROVA DO TESTE DE ESTRESSE EXTERNO (catálogo de 300 linhas gerado fora, 28/09) · v872
   O que o arquivo pegou e o que ficou fechado:
   1. medicamento pelo NCM: 3003/3004 é medicamento por definição — "Amoxicilina 500mg" não precisa dizer "medicamento" (−60% firme);
   2. marcador agro reconhece aves/frango/peixe: "Ração para aves" (2309.90.90) fecha o −60% do Anexo IX;
   3. NCM com 7 dígitos: um candidato só na tabela oficial → restaura o zero (à esquerda: 4012010 = 04012010 leite; à direita:
      7318150 = 7318.15.00) e avisa; nenhum candidato → revisão com o motivo;
   4. linha totalmente em branco no meio da planilha não vira item;
   5. preço zero quando a planilha TEM coluna de preço → fora ("sem preço no cadastro"), não R$ 100; sem coluna de preço, R$ 100 continua;
   6. custo maior que o preço → precifica, marca "custo > preço" e explica; CUSTO_NOVO ≤ 0 e VAR_CUSTO ≤ −100 → ignorados e contados.
   Uso: npm i --no-save jsdom && node prova_gpt300.js */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
let falhou = 0;
const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(80, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const perto = (a, b, t) => Math.abs((+a) - (+b)) <= (t === undefined ? 0.011 : t);
const H = ['CODIGO', 'DESCRICAO', 'NCM', 'NBS', 'PRECO_VENDA', 'CUSTO', 'CUSTO_NOVO', 'VAR_CUSTO', 'GRUPO', 'ALIQUOTA_ICMS', 'CST_ICMS', 'CST_PIS_COFINS'];
const ROWS = [H,
  ['1063', 'Amoxicilina 500mg 21 cápsulas', '30041012', '', '28.9', '18', '', '', 'FARMACIA', '18', '000', '04'],
  ['1108', 'Ração para aves 40kg', '23099090', '', '118', '88', '', '', 'AGRO', '12', '000', '01'],
  ['1017', 'Leite integral UHT 1L', '4012010', '', '5.29', '4.07', '', '', 'CESTA', '12', '000', '06'],
  ['2025', 'Parafuso sextavado 1/4', '7318150', '', '39.9', '24', '', '', 'FERRAGEM', '18', '000', '01'],
  ['2001', 'Item com NCM inventado', '1234567', '', '19.9', '12', '', '', 'COMUM', '18', '000', '01'],
  ['', '', '', '', '', '', '', '', '', '', '', ''],
  ['2006', 'Produto com preço zero', '10063021', '', '0', '10', '', '', 'CESTA', '12', '000', '06'],
  ['2007', 'Feijão vendido abaixo do custo', '07133329', '', '8', '11', '', '', 'CESTA', '7', '000', '06'],
  ['2008', 'Custo novo negativo', '34022000', '', '18.9', '10', '-25', '', 'LIMPEZA', '18', '000', '01'],
  ['2009', 'Variação de custo -150', '34025011', '', '8.9', '5', '', '-150', 'LIMPEZA', '18', '000', '01'],
  ['1001', 'Arroz tipo 1 5kg', '10063021', '', '27.9', '17.78', '', '-10', 'CESTA', '12', '000', '06'],
  /* v873 · o catálogo de 2.500 (tabela oficial) pegou mais estes */
  ['3001', 'Item com letras no NCM', 'ABC02010', '', '25.9', '15', '', '', 'COMUM', '18', '000', '01'],
  ['3002', 'Fresadora CNC', '847621', '', '98000', '61000', '', '', 'MAQUINAS', '18', '000', '01'],
  ['3003', 'Batatas-doces', '07142000', '', '6.9', '3.1', '', '', 'HORTIFRUTI', '7', '000', '06'],
  ['3004', 'Fios utilizados para limpar os espaços interdentais (fio dental)', '33062000', '', '9.9', '5', '', '', 'HIGIENE', '18', '000', '01'],
  ['3005', 'Amitraz; cipermetrina', '30049046', '', '45', '28', '', '', 'FARMACIA', '18', '000', '04']];
const SEM_PRECO = [['CODIGO', 'DESCRICAO', 'NCM'], ['A1', 'ARROZ TIPO 1 5KG', '10063021']];
function rodar(html) {
  return new Promise((ok) => {
    const w = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://lionheartintelligence.com.br/app.html', virtualConsole: new VirtualConsole() }).window;
    w.fetch = () => new Promise(() => {}); w.HTMLElement.prototype.scrollIntoView = function () {}; w.scrollTo = function () {};
    setTimeout(() => {
      const out = { erro: '' };
      try {
        w.abrirPagina('classmassa'); w.cmProcessar(ROWS.map((r) => r.slice()));
        const poll = () => {
          if (!w.CM_ULTIMO) return setTimeout(poll, 100);
          try {
            out.n = w.CM_ULTIMO.itens.length; out.st = w.CM_ULTIMO.st; out.it = {};
            w.CM_ULTIMO.itens.forEach((it) => { out.it[String(it.cod)] = { status: w.cmStatusFinal(it), trat: it.trat, fonte: String(it.fonte || ''), ncm: it.ncm, corr: it.ncm_corrigido || '' }; });
            w.abrirPagina('precmassa'); w.document.getElementById('pm_regime').value = 'presumido'; w.document.getElementById('pm_estr').value = 'fica'; w.lhPmRender();
            const P = w.PM_ULTIMO; out.rows = {}; P.rows.forEach((r) => { out.rows[String(r.f.cod)] = { custoMaior: !!r.f.custoMaior, custoNovo: r.c.custoNovo, hoje: r.c.anos[2033].hojeCli, lucro: r.c.anos[2033].lucro }; });
            out.fora = {}; P.fora.forEach((f) => { out.fora[String(f.cod)] = f.motivo; });
            out.html = w.document.getElementById('pm-result').innerHTML; out.varN = w.document.getElementById('pm_var_n').textContent;
            /* sem coluna de preço: R$ 100 continua */
            w.CM_ULTIMO = null; w.cmProcessar(SEM_PRECO.map((r) => r.slice()));
            const poll2 = () => { if (!w.CM_ULTIMO) return setTimeout(poll2, 100);
              try { w.lhPmRender(); out.semPreco = w.PM_ULTIMO.rows.length ? w.PM_ULTIMO.rows[0].c.anos[2033].hojeCli : null; out.semPrecoFora = w.PM_ULTIMO.fora.length; } catch (e) { out.erro = 'semPreco: ' + e.message; }
              w.close(); ok(out); };
            poll2();
          } catch (e) { out.erro = e.message + ' ' + (e.stack || '').split('\n')[1]; w.close(); ok(out); }
        };
        poll();
      } catch (e) { out.erro = e.message; w.close(); ok(out); }
    }, 9000);
  });
}
(async () => {
  const r = await rodar(APP);
  ex('carregou, classificou e precificou sem erro', !r.erro, r.erro);
  if (!r.erro) {
    console.log('\n-- classificação --');
    ex('amoxicilina (3004.10.12) = −60% firme, sem pedir a palavra "medicamento"', r.it['1063'].status === 'BENEFICIO_IDENTIFICADO' && r.it['1063'].trat === 'red60', r.it['1063'].status + ' ' + r.it['1063'].trat);
    ex('a fonte diz "NCM 3003/3004 = medicamento por definição"', /medicamento por definição/.test(r.it['1063'].fonte), r.it['1063'].fonte.slice(0, 100));
    ex('ração para aves (2309.90.90) = −60% Anexo IX (marcador agro conhece aves)', r.it['1108'].status === 'BENEFICIO_IDENTIFICADO' && r.it['1108'].trat === 'red60', r.it['1108'].status + ' ' + r.it['1108'].trat);
    ex('leite com NCM "4012010" (zero à esquerda perdido) → lido como 0401.20.10, cesta básica zero', r.it['1017'].trat === 'zero' && r.it['1017'].corr === '0401.20.10' && /zero à esquerda restaurado/.test(r.it['1017'].fonte), r.it['1017'].trat + ' ' + r.it['1017'].corr + ' ' + r.it['1017'].fonte.slice(0, 90));
    ex('parafuso "7318150" (zero à direita perdido) → lido como 7318.15.00, integral, com aviso', r.it['2025'].trat === 'cheia' && r.it['2025'].corr === '7318.15.00' && /zero à direita restaurado/.test(r.it['2025'].fonte), r.it['2025'].corr + ' ' + r.it['2025'].fonte.slice(0, 90));
    ex('"1234567" (nenhum candidato na tabela oficial) → revisão com o motivo', r.it['2001'].status === 'REVISAO_NCM' && /7 dígitos/.test(r.it['2001'].fonte) && /nem 01234567 nem 12345670/.test(r.it['2001'].fonte), r.it['2001'].status + ' ' + r.it['2001'].fonte.slice(0, 120));
    ex('a planilha tem 15 linhas de dados + 1 em branco: 15 itens (a linha vazia não é item)', r.n === 15, String(r.n));
    console.log('\n-- v873: o que o catálogo de 2.500 linhas (tabela oficial) pegou --');
    ex('NCM com letras ("ABC02010") → revisão, não carne bovina (0201) pelos dígitos que sobram', r.it['3001'].status === 'REVISAO_NCM' && /NCM com letras/.test(r.it['3001'].fonte), r.it['3001'].status + ' ' + r.it['3001'].fonte.slice(0, 80));
    ex('NCM com 6 dígitos ("847621") → classifica pelo prefixo e avisa na fonte', r.it['3002'].status === 'REGRA_GERAL' && /6 dígitos/.test(r.it['3002'].fonte), r.it['3002'].status + ' ' + r.it['3002'].fonte.slice(0, 80));
    ex('batata-doce (0714.20.00) = −60% hortícolas (o NCM já é o produto; não pede a palavra "alimento")', r.it['3003'].trat === 'red60' && r.it['3003'].status === 'BENEFICIO_IDENTIFICADO', r.it['3003'].trat + ' ' + r.it['3003'].status);
    ex('fio dental (3306.20.00) = −60% higiene pessoal básica', r.it['3004'].trat === 'red60' && r.it['3004'].status === 'BENEFICIO_IDENTIFICADO', r.it['3004'].trat + ' ' + r.it['3004'].status);
    ex('amitraz (3004.90.46, base "zero só na lista") = −60% medicamento, não integral', r.it['3005'].trat === 'red60' && r.it['3005'].status === 'BENEFICIO_IDENTIFICADO', r.it['3005'].trat + ' ' + r.it['3005'].status);
    ex('contador st.ncm7 = 2 (leite e parafuso restaurados)', r.st.ncm7 === 2, String(r.st.ncm7));
    console.log('\n-- precificação --');
    ex('preço zero com coluna de preço presente → fora: "sem preço no cadastro"', /sem preço no cadastro/.test(r.fora['2006'] || ''), r.fora['2006'] || ('precificado a ' + JSON.stringify(r.rows['2006'])));
    ex('sem coluna de preço na planilha → R$ 100 continua (comportamento antigo preservado)', r.semPreco === 100 && r.semPrecoFora === 0, String(r.semPreco) + ' fora ' + r.semPrecoFora);
    ex('feijão custo 11 > preço 8 → precificado, marcado custoMaior, lucro negativo', r.rows['2007'] && r.rows['2007'].custoMaior && r.rows['2007'].lucro < 0, JSON.stringify(r.rows['2007']));
    ex('selo "custo > preço" na tabela e bloco "Custo maior que o preço em 1 item" na leitura', /custo &gt; preço<\/span>/.test(r.html) && /Custo maior que o preço em 1 item/.test(r.html), '');
    ex('CUSTO_NOVO −25 → ignorado (custo novo nulo, item segue só pelo imposto)', r.rows['2008'] && r.rows['2008'].custoNovo == null, JSON.stringify(r.rows['2008']));
    ex('VAR_CUSTO −150 → ignorado', r.rows['2009'] && r.rows['2009'].custoNovo == null, JSON.stringify(r.rows['2009']));
    ex('arroz VAR_CUSTO −10 → custo 17,78 → 16,00 (o válido continua valendo)', r.rows['1001'] && perto(r.rows['1001'].custoNovo, 16.002, 0.001), JSON.stringify(r.rows['1001']));
    ex('a tela conta "2 custos novos inválidos … ignorados"', /2 custos novos inválidos/.test(r.varN), r.varN);
    ex('a leitura explica os inválidos', /custos novos inválidos<\/b>/.test(r.html), '');
  }
  console.log('\n-- ao contrário --');
  const sab = async (nome, alvo, troca, teste) => {
    if (APP.split(alvo).length !== 2) throw new Error('sabotagem "' + nome + '" não achou o alvo');
    const s = await rodar(APP.replace(alvo, troca)); ex(nome, !s.erro && teste(s), s.erro);
  };
  await sab('regra firme de 3003/3004 removida → amoxicilina volta à revisão → reprova', "if(/^(3003|3004)/.test(k) && hit && (hit.trat==='red60' ||", "if(false && (",
    (s) => s.it['1063'].status !== 'BENEFICIO_IDENTIFICADO');
  await sab('tratamento de 7 dígitos removido → leite "4012010" casa com pneus (4012) → reprova', 'if(k.length===7){', 'if(false){',
    (s) => s.it['1017'].trat !== 'zero' || !s.it['1017'].corr);
  await sab('linha em branco volta a ser item → 16 itens → reprova', "if(!row.some(function(c){ return c!=null && String(c).trim()!==''; })) continue;", "",
    (s) => s.n !== 15);
  await sab('letras no NCM deixam de ser barradas → "ABC02010" vira carne bovina (0201) → reprova', "if(/[a-z]/i.test(String(it.ncm||''))){", "if(false){",
    (s) => s.it['3001'].status !== 'REVISAO_NCM');
  await sab('preço zero volta a sair por R$ 100 → reprova', "if(temColPreco && !(f.preco>0)){ f.motivo='sem preço no cadastro (coluna de preço vazia ou zero)'; fora.push(f); return; }", "",
    (s) => !s.fora['2006']);
  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado');
  process.exit(falhou ? 1 : 0);
})();
