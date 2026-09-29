/* PROVA DA REPRECIFICAÇÃO PELO CUSTO DE COMPRA · v871 — "o leite que custava 5 passou a 4"
   A Precificação em Massa reprecifica, não forma preço: dado o preço praticado, o imposto e o custo que mudou, diz o novo preço.
   1. sem variação nada muda (o v868 continua o v868);
   2. prioridade do custo novo: CUSTO_NOVO da linha > VAR_CUSTO da linha > % do grupo > % geral;
   3. leite (cesta básica, alíquota zero, ICMS 12 por dentro, PIS 06 = 0): custo 4,07 → 3,00 na estratégia "manter o que fica":
      hoje c/ custo novo = (4,6552 − 1,07) ÷ 0,88 = 4,07 · 2033 = 4,6552 − 1,07 × 0,9635 = 3,62 (crédito de compra 3,65% aplicado ao custo novo) · 2033 só imposto = 4,66;
   4. "manter o preço": o preço não muda e o lucro sobe pelo custo menor; "manter a margem %": Rn = custo do ano ÷ (1 − m);
   5. serviço puro (NBS sem custo) fica fora da variação — e a tela diz; serviço com custo (insumo direto) entra;
   6. Simples: o custo novo move o preço sem gross-up do DAS (5,29 − 1,07 = 4,22); 2026 sem custo novo = hoje;
   7. tela: caixa "custo de compra mudou?", campos por grupo, colunas HOJE C/ CUSTO NOVO e 2033 SÓ IMPOSTO, KPI; Excel e CSV com as colunas novas.
   Uso: npm i --no-save jsdom exceljs && node prova_precmassa_custo.js */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
let falhou = 0;
const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(78, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const perto = (a, b, t) => Math.abs((+a) - (+b)) <= (t === undefined ? 0.011 : t);
const ROWS = [['CODIGO', 'DESCRICAO', 'NCM', 'NBS', 'PRECO_VENDA', 'CUSTO', 'CUSTO_NOVO', 'VAR_CUSTO', 'ALIQUOTA_ICMS', 'CST_ICMS', 'CST_PIS_COFINS', 'IPI', 'GRUPO'],
  ['1017', 'LEITE INTEGRAL UHT 1L', '04012010', '', '5.29', '4.07', '3', '', '12', '000', '06', '0', 'MERCEARIA BASICA'],
  ['1018', 'LEITE DESNATADO UHT 1L', '04012010', '', '5.49', '4.16', '', '-20', '12', '000', '06', '0', 'MERCEARIA BASICA'],
  ['1019', 'LEITE EM PO INTEGRAL 400G', '04022110', '', '17.9', '12.32', '', '', '12', '000', '06', '0', 'MERCEARIA BASICA'],
  ['1001', 'ARROZ TIPO 1 5KG', '10063021', '', '27.9', '17.78', '', '', '12', '000', '06', '0', 'MERCEARIA BASICA'],
  ['1088', 'CHOCOLATE AO LEITE 90G', '18063220', '', '6.99', '5.44', '', '', '18', '000', '01', '0', 'MERCEARIA'],
  ['2001', 'DETERGENTE 500ML', '34022000', '', '2.99', '1.9', '', '', '18', '000', '01', '0', 'LIMPEZA'],
  ['3001', 'PAPEL HIGIENICO 4 ROLOS', '48181000', '', '10', '', '', '', '18', '000', '01', '0', 'HIGIENE'],
  ['S1', 'HOSPEDAGEM EM QUARTOS (DIARIA)', '', '1.0303.11.00', '200', '', '', '', '5', '', '', '', 'SERVICOS'],
  ['S2', 'ENTREGA EM DOMICILIO (FRETE TERCEIRIZADO)', '', '1.2001.10.00', '100', '60', '', '', '5', '', '', '', 'SERVICOS']];
function rodar(html) {
  return new Promise((ok) => {
    const w = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://lionheartintelligence.com.br/app.html', virtualConsole: new VirtualConsole() }).window;
    w.fetch = () => new Promise(() => {}); w.HTMLElement.prototype.scrollIntoView = function () {}; w.scrollTo = function () {};
    setTimeout(() => {
      const out = { erro: '' };
      try {
        w.abrirPagina('classmassa'); w.cmProcessar(ROWS.map((r) => r.slice()));
        const poll = async () => {
          if (!w.CM_ULTIMO) return setTimeout(poll, 100);
          try {
            w.abrirPagina('precmassa');
            const d = w.document, $ = (id) => d.getElementById(id);
            const set = (id, v) => { const e = $(id); if (e) e.value = v; };
            set('pm_regime', 'presumido'); set('pm_estr', 'fica'); set('pm_icms', '18'); set('pm_cliente', 'pf');
            const run = (mut) => { if (mut) mut(); w.lhPmRender(); const o = { by: {} }; w.PM_ULTIMO.rows.forEach((r) => { o.by[r.f.cod] = r; }); o.html = $('pm-result').innerHTML; o.varN = ($('pm_var_n') || {}).textContent || ''; return o; };
            /* 1. só a planilha (CUSTO_NOVO e VAR_CUSTO nas linhas do leite), sem % na tela */
            out.base = run();
            out.tela = { varBox: $('pm_var_box').style.display, grupos: [...d.querySelectorAll('#pm_var_grupos input.pm-vg')].map((e) => e.getAttribute('data-grupo')), gruposBox: $('pm_var_grupos_box').style.display };
            /* 2. % geral −20 + grupo MERCEARIA BASICA −10 */
            const vg = d.querySelector('#pm_var_grupos input.pm-vg[data-grupo="MERCEARIA BASICA"]');
            out.var = run(() => { set('pm_varcusto', '-20'); if (vg) vg.value = '-10'; });
            out.preco = run(() => { set('pm_estr', 'preco'); });
            out.margem = run(() => { set('pm_estr', 'margem'); });
            out.simples = run(() => { set('pm_estr', 'fica'); set('pm_regime', 'simples'); });
            out.semVar = run(() => { set('pm_regime', 'presumido'); set('pm_varcusto', ''); if (vg) vg.value = ''; });
            out.var2 = run(() => { set('pm_varcusto', '-20'); if (vg) vg.value = '-10'; });
            /* exportações */
            out.csv = ''; const _Blob = w.Blob; w.Blob = function (parts, opt) { out.csv = parts.join(''); return new _Blob(parts, opt); };
            w.URL.createObjectURL = () => 'blob:x'; w.HTMLAnchorElement.prototype.click = function () {};
            w.lhPmCSV(); w.Blob = _Blob;
            try { w.eval(fs.readFileSync(require.resolve('exceljs/dist/exceljs.min.js'), 'utf8')); } catch (e) { out.xlErro = 'exceljs: ' + e.message; }
            out.linhas = w.lhPmLinhas();
            out.xlHead = null;
            if (w.ExcelJS) { const _wb = w.ExcelJS.Workbook; let cap = null; w.ExcelJS.Workbook = function () { cap = new _wb(); cap.xlsx.writeBuffer = () => Promise.resolve(new Uint8Array(1)); return cap; };
              w.lhPmExcel(); await new Promise((r) => setTimeout(r, 300)); w.ExcelJS.Workbook = _wb;
              if (cap) { const ws = cap.getWorksheet('Precificacao'); out.xlHead = ws.getRow(1).values.slice(1); out.xlAbas = cap.worksheets.map((s) => s.name);
                const li = ws.getRow(2).values.slice(1); out.xlLeite = {}; out.xlHead.forEach((h, i) => { out.xlLeite[h] = li[i]; });
                const erp = cap.getWorksheet('Tabela_Precos_ERP'); out.erpHead = erp.getRow(1).values.slice(1);
                const lm = cap.getWorksheet('Leia-me'); out.leiame = []; lm.eachRow((r) => { out.leiame.push(String(r.getCell(1).value) + ': ' + String(r.getCell(2).value)); }); } }
          } catch (e) { out.erro = e.message + ' ' + (e.stack || '').split('\n')[1]; }
          w.close(); ok(out);
        }; poll();
      } catch (e) { out.erro = e.message; w.close(); ok(out); }
    }, 9000);
  });
}
(async () => {
  const r = await rodar(APP);
  ex('carregou e precificou sem erro', !r.erro, r.erro);
  if (!r.erro) {
    const y = (o, cod, a) => o.by[cod].c.anos[a];
    console.log('\n-- leite 4,07 → 3,00 pela coluna CUSTO_NOVO (manter o que fica com você) --');
    const L = r.base.by['1017'];
    ex('o leite é cesta básica (zero) — a alíquota nova é 0', L.f.trat === 'zero', L.f.trat);
    ex('custo novo lido da planilha: 3,00', perto(L.c.custoNovo, 3), String(L.c.custoNovo));
    ex('hoje c/ custo novo = (4,6552 − 1,07) ÷ 0,88 = 4,07', perto(L.c.soCusto.finalCli, 4.07), String(L.c.soCusto.finalCli));
    ex('2033 = 4,6552 − 1,07 × 0,9635 = 3,62 (custo novo já com o crédito de compra)', perto(y(r.base, '1017', 2033).finalCli, 3.62), String(y(r.base, '1017', 2033).finalCli));
    ex('2033 só imposto (custo de hoje) = 4,66', perto(L.c.soImposto33.finalCli, 4.66), String(L.c.soImposto33.finalCli));
    ex('custo do ano 2033 = 3,00 × 0,9635 = 2,89', perto(y(r.base, '1017', 2033).custo, 2.89), String(y(r.base, '1017', 2033).custo));
    ex('lucro 2033 = fica − custo do ano = 3,62 − 2,89 = 0,73 (igual ao lucro de hoje 0,59 + o crédito de compra 0,15)', perto(y(r.base, '1017', 2033).lucro, 0.73, 0.02), String(y(r.base, '1017', 2033).lucro));
    ex('2026 (ano-teste) com custo novo: 4,07 — só o custo moveu', perto(y(r.base, '1017', 2026).finalCli, 4.07), String(y(r.base, '1017', 2026).finalCli));
    ex('leite desnatado via VAR_CUSTO −20: custo 4,16 → 3,33', perto(r.base.by['1018'].c.custoNovo, 3.328, 0.001), String(r.base.by['1018'].c.custoNovo));
    ex('leite em pó (sem coluna, sem % na tela): custo não muda, preço 2033 = só imposto', r.base.by['1019'].c.custoNovo == null && perto(y(r.base, '1019', 2033).finalCli, 15.75), String(r.base.by['1019'].c.custoNovo) + ' ' + y(r.base, '1019', 2033).finalCli);
    ex('sem variação em nenhum item, arroz 2033 = 24,55 (o v868 continua o v868)', perto(y(r.base, '1001', 2033).finalCli, 24.55), String(y(r.base, '1001', 2033).finalCli));

    console.log('\n-- prioridade: linha > grupo > % geral --');
    ex('% geral −20 e grupo MERCEARIA BASICA −10: leite integral continua 3,00 (a linha manda)', perto(r.var.by['1017'].c.custoNovo, 3), String(r.var.by['1017'].c.custoNovo));
    ex('leite desnatado continua −20 da linha (3,33), não −10 do grupo', perto(r.var.by['1018'].c.custoNovo, 3.328, 0.001), String(r.var.by['1018'].c.custoNovo));
    ex('leite em pó pega o grupo (−10): 12,32 → 11,09', perto(r.var.by['1019'].c.custoNovo, 11.088, 0.001), String(r.var.by['1019'].c.custoNovo));
    ex('arroz (mesmo grupo) pega −10: 17,78 → 16,00', perto(r.var.by['1001'].c.custoNovo, 16.002, 0.001), String(r.var.by['1001'].c.custoNovo));
    ex('chocolate (grupo sem %) pega o geral −20: 5,44 → 4,35', perto(r.var.by['1088'].c.custoNovo, 4.352, 0.001), String(r.var.by['1088'].c.custoNovo));
    ex('papel higiênico sem custo na planilha: nada a reprecificar além do imposto', r.var.by['3001'].c.custoNovo == null, String(r.var.by['3001'].c.custoNovo));
    ex('arroz com custo −10 e "manter o que fica": hoje c/ custo novo = 27,90 − 1,778 ÷ 0,88 = 25,88', perto(r.var.by['1001'].c.soCusto.finalCli, 25.88), String(r.var.by['1001'].c.soCusto.finalCli));

    console.log('\n-- serviço: puro fica fora, com insumo entra --');
    ex('hospedagem (NBS, sem custo) precificada, mas sem custo novo', r.var.by.S1 && r.var.by.S1.c.custoNovo == null, r.var.by.S1 ? String(r.var.by.S1.c.custoNovo) : 'S1 não precificado');
    ex('hospedagem: preço de hoje não muda pela variação (só o imposto move)', r.var.by.S1 && perto(r.var.by.S1.c.anos[2033].hojeCli, 200) && !r.var.by.S1.c.soCusto, r.var.by.S1 ? JSON.stringify(r.var.by.S1.c.soCusto) : '');
    ex('a tela diz que 1 serviço puro ficou fora (sem custo)', /1 serviço puro fora/.test(r.var.varN), r.var.varN);
    ex('entrega com custo 60 (frete terceirizado): entra com −20 → 48', r.var.by.S2 && perto(r.var.by.S2.c.custoNovo, 48), r.var.by.S2 ? String(r.var.by.S2.c.custoNovo) : 'S2 não precificado');
    ex('entrega hoje c/ custo novo (ISS 5 + PIS 3,65 por dentro): 100 − 12 ÷ 0,9135 = 86,86', r.var.by.S2 && perto(r.var.by.S2.c.soCusto.finalCli, 86.86), r.var.by.S2 ? String(r.var.by.S2.c.soCusto.finalCli) : '');

    console.log('\n-- as outras estratégias --');
    ex('"manter o preço": leite 2033 continua 5,29 e o lucro sobe (custo menor)', perto(y(r.preco, '1017', 2033).finalCli, 5.29) && y(r.preco, '1017', 2033).lucro > y(r.preco, '1017', 2033).lucroHoje + 1, y(r.preco, '1017', 2033).finalCli + ' lucro ' + y(r.preco, '1017', 2033).lucro + ' vs hoje ' + y(r.preco, '1017', 2033).lucroHoje);
    ex('"manter a margem %": Rn = 2,89 ÷ (1 − 0,1257) = 3,31 em 2033', perto(y(r.margem, '1017', 2033).finalCli, 3.31), String(y(r.margem, '1017', 2033).finalCli));
    ex('"manter a margem %": a margem de 2033 é a de hoje (12,57%)', perto(y(r.margem, '1017', 2033).margemLucro, 12.57, 0.2), String(y(r.margem, '1017', 2033).margemLucro));
    ex('Simples: leite 2033 = 5,29 − 1,07 = 4,22 (sem gross-up do DAS) e o motivo diz isso', perto(y(r.simples, '1017', 2033).finalCli, 4.22) && /sem gross-up/.test(y(r.simples, '1017', 2033).motivo || ''), y(r.simples, '1017', 2033).finalCli + ' ' + (y(r.simples, '1017', 2033).motivo || ''));
    ex('Simples: arroz (−10 do grupo) = 27,90 − 1,78 = 26,12 em 2027 e em 2033 — só o custo move', perto(y(r.simples, '1001', 2033).finalCli, 26.12) && perto(y(r.simples, '1001', 2027).finalCli, 26.12), String(y(r.simples, '1001', 2033).finalCli));
    ex('Simples: papel higiênico (sem custo) continua 10,00 em todos os anos', perto(y(r.simples, '3001', 2033).finalCli, 10) && perto(y(r.simples, '3001', 2027).finalCli, 10), String(y(r.simples, '3001', 2033).finalCli));
    ex('apagar o % na tela devolve o v868: arroz 2033 = 24,55', r.semVar.by['1001'].c.custoNovo == null && perto(y(r.semVar, '1001', 2033).finalCli, 24.55), String(y(r.semVar, '1001', 2033).finalCli));

    console.log('\n-- tela --');
    ex('caixa "custo de compra mudou?" aparece (o arquivo tem CUSTO)', r.tela.varBox !== 'none', r.tela.varBox);
    ex('campos por grupo: MERCEARIA BASICA, MERCEARIA, LIMPEZA, SERVICOS (só grupos com custo)', r.tela.grupos.join(',') === 'LIMPEZA,MERCEARIA,MERCEARIA BASICA,SERVICOS', r.tela.grupos.join(','));
    ex('KPI "Custo de compra novo em 7 itens"', /Custo de compra novo em 7 itens/.test(r.var.html), '');
    ex('KPI "Preço hoje só pelo custo novo"', /Preço hoje só pelo custo novo/.test(r.var.html), '');
    ex('colunas HOJE, SÓ CUSTO NOVO e 2033, SÓ IMPOSTO na tabela (+ "líq." no custo 2033)', /HOJE, SÓ CUSTO NOVO/.test(r.var.html) && /2033, SÓ IMPOSTO/.test(r.var.html) && /compra hoje → compra nova → líq\. do crédito 2033/.test(r.var.html) && /líq\.<\/span>/.test(r.var.html), '');
    ex('coluna de custo mostra 4,07 → 3,00 → 2,89 no leite', /4,07 → <b[^>]*>3,00<\/b> → 2,89/.test(r.var.html), '');
    ex('bloco "Custo de compra novo (reprecificar, não formar preço)" na leitura', /Custo de compra novo \(reprecificar, não formar preço\)/.test(r.var.html), '');
    ex('a leitura diz que serviço puro fica de fora', /Serviço puro \(honorário, hora/.test(r.var.html), '');
    ex('sem % na tela as colunas continuam (a planilha tem CUSTO_NOVO no leite) e o arroz mostra "→ igual"', /HOJE, SÓ CUSTO NOVO/.test(r.semVar.html) && /17,78 → <span[^>]*>igual<\/span> → /.test(r.semVar.html), '');
    ex('rodapé: "reprecificação… não forma preço"', /Reprecificação: parte do preço praticado/.test(r.var.html) && /não forma preço/.test(r.var.html), '');

    console.log('\n-- exportações --');
    ex('CSV traz Preco_hoje_custo_novo', /Preco_hoje_custo_novo/.test(r.csv.split('\n')[0]), r.csv.split('\n')[0]);
    ex('CSV do leite: hoje 5,29 · hoje c/ custo novo 4,07 · 2033 3,62', /^1017;[^;]*;[^;]*;[^;]*;200;200003;5,29;4,07;/.test(r.csv.split(/\r?\n/)[1]) && /;3,62;/.test(r.csv.split(/\r?\n/)[1]), r.csv.split(/\r?\n/)[1]);
    ex('Excel Precificacao com Grupo, Custo_novo, Var_custo_%, Preco_hoje_custo_novo, Preco_2033_so_imposto', !!r.xlHead && ['Grupo', 'Custo_novo', 'Var_custo_%', 'Preco_hoje_custo_novo', 'Preco_2033_so_imposto'].every((c) => r.xlHead.indexOf(c) >= 0), r.xlErro || (r.xlHead || []).join(','));
    ex('Excel leite: Custo_novo 3 · Var −26,29% · hoje c/ novo 4,07 · 2033 só imposto 4,66', !!r.xlLeite && perto(r.xlLeite.Custo_novo, 3) && perto(r.xlLeite['Var_custo_%'], -26.29) && perto(r.xlLeite.Preco_hoje_custo_novo, 4.07) && perto(r.xlLeite.Preco_2033_so_imposto, 4.66), JSON.stringify(r.xlLeite && { c: r.xlLeite.Custo_novo, v: r.xlLeite['Var_custo_%'], h: r.xlLeite.Preco_hoje_custo_novo, s: r.xlLeite.Preco_2033_so_imposto }));
    ex('Tabela_Precos_ERP com Preco_hoje_custo_novo', !!r.erpHead && r.erpHead.indexOf('Preco_hoje_custo_novo') >= 0, (r.erpHead || []).join(','));
    ex('Leia-me: "Regra: Reprecifica, não forma preço" e a linha "Custo novo"', !!r.leiame && r.leiame.some((l) => /^Regra: Reprecifica, não forma preço/.test(l)) && r.leiame.some((l) => /^Custo novo: Custo de compra novo em 7 itens/.test(l)), (r.leiame || []).filter((l) => /^(Regra|Custo novo)/.test(l)).join(' | '));
  }
  console.log('\n-- ao contrário --');
  const sab = async (nome, alvo, troca, teste) => {
    if (APP.split(alvo).length !== 2) throw new Error('sabotagem "' + nome + '" não achou o alvo');
    const s = await rodar(APP.replace(alvo, troca)); ex(nome, !s.erro && teste(s), s.erro);
  };
  await sab('variação do custo fora da estratégia "manter o que fica" → leite hoje c/ custo novo = 5,29 → reprova', 'else { q=ida(R+dCusto); }', 'else { q=ida(R); }',
    (s) => !perto(s.base.by['1017'].c.soCusto.finalCli, 4.07));
  await sab('CUSTO_NOVO da linha ignorado (só % da tela) → leite integral vira 3,66 (−10 do grupo) → reprova', 'if(f.custoNovo!=null && f.custoNovo>0) return', 'if(false) return',
    (s) => !perto(s.var.by['1017'].c.custoNovo, 3));
  await sab('% do grupo ignorado → leite em pó pega o geral (−20 → 9,86) → reprova', "else if(cfg.varGrupo && f.grupo && cfg.varGrupo[f.grupo]!=null) v=cfg.varGrupo[f.grupo];", "else if(false) v=0;",
    (s) => !perto(s.var.by['1019'].c.custoNovo, 11.088, 0.001));
  await sab('crédito de compra deixa de valer para o custo novo → 2033 = 3,59 em vez de 3,62 → reprova', 'var dCusto=(custoNovo!=null)?(custoNovo-custoHoje)*fCred:0;', 'var dCusto=(custoNovo!=null)?(custoNovo-custoHoje):0;',
    (s) => !perto(s.base.by['1017'].c.anos[2033].finalCli, 3.62));
  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado');
  process.exit(falhou ? 1 : 0);
})();
