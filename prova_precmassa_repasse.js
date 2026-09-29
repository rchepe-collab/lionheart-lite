/* PROVA DO REPASSE E DA CONTA ABERTA · v875
   A ferramenta calcula o preço que mantém o que você escolheu; o repasse é a sua decisão sobre esse cálculo.
   1. repasse 100% (padrão): decidido = calculado, CSV e ERP iguais ao de antes;
   2. parafuso (100 → 99,11 calculado em 2033): repasse geral 50% → decidido 99,56; 0% → 100,00; a parte não repassada
      sai do que fica (fica decidido); 2027 (calculado 103,96) com 50% → 101,98;
   3. prioridade: linha > grupo > geral — e a linha fica guardada no navegador (sobrevive a recálculo e troca de estratégia);
   4. KPI "preço decidido em 2033" e bloco "Calculado × decidido" só aparecem com repasse ≠ 100; célula REPASSE em toda linha;
   5. a conta aberta (▸) mostra ano a ano: ICMS 18% → 16,2% (9/10) em 2029 → 0 em 2033; PIS/COFINS 3,65% → 0 em 2027 (CBS substitui);
      por dentro 100 → 95,55 → 78,35; IBS/CBS 8,8% = 8,41 em 2027 e 26,5% = 20,76 em 2033; prateleira 103,96 → 99,11;
   6. exportações: CSV traz Preco_<ano> = decidido e, com repasse ≠ 100, Repasse_% e Preco_calculado_<ano>; Excel idem + Fica_decidido;
      Leia-me com as linhas "Repasse" e "Conta aberta".
   Uso: npm i --no-save jsdom exceljs && node prova_precmassa_repasse.js */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
let falhou = 0;
const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(84, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const perto = (a, b, t) => Math.abs((+a) - (+b)) <= (t === undefined ? 0.011 : t);
const ROWS = [['CODIGO', 'DESCRICAO', 'NCM', 'PRECO_VENDA', 'CUSTO', 'ALIQUOTA_ICMS', 'CST_ICMS', 'CST_PIS_COFINS', 'GRUPO'],
  ['A1', 'PARAFUSO SEXTAVADO', '73181500', '100', '60', '18', '000', '01', 'FERRAGEM'],
  ['A2', 'TRENA 5M', '90178090', '20', '', '18', '000', '01', 'FERRAGEM'],
  ['A6', 'ARROZ TIPO 1 5KG', '10063021', '25', '', '7', '000', '06', 'MERCEARIA']];
function rodar(html) {
  return new Promise((ok) => {
    const w = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://lionheartintelligence.com.br/app.html', virtualConsole: new VirtualConsole() }).window;
    w.fetch = () => new Promise(() => {}); w.HTMLElement.prototype.scrollIntoView = function () {}; w.scrollTo = function () {};
    setTimeout(() => {
      const out = { erro: '' };
      try {
        try { w.localStorage.clear(); } catch (e) {}
        w.abrirPagina('classmassa'); w.cmProcessar(ROWS.map((r) => r.slice()));
        const poll = async () => {
          if (!w.CM_ULTIMO) return setTimeout(poll, 100);
          try {
            w.abrirPagina('precmassa');
            const d = w.document, $ = (id) => d.getElementById(id), set = (id, v) => { const e = $(id); if (e) e.value = v; };
            set('pm_regime', 'presumido'); set('pm_estr', 'fica'); set('pm_icms', '18'); set('pm_cliente', 'pf');
            const run = (mut) => { if (mut) mut(); w.lhPmRender(); const o = { by: {} }; w.PM_ULTIMO.rows.forEach((r) => { o.by[r.f.cod] = r; }); o.html = $('pm-result').innerHTML; o.repN = ($('pm_rep_n') || {}).textContent || ''; return o; };
            const csv = () => { let c = ''; const _B = w.Blob; w.Blob = function (parts, opt) { c = parts.join(''); return new _B(parts, opt); }; w.URL.createObjectURL = () => 'blob:x'; w.HTMLAnchorElement.prototype.click = function () {}; w.lhPmCSV(); w.Blob = _B; return c; };
            out.r100 = run(); out.csv100 = csv();
            out.tela100 = { repBox: $('pm_rep_box').style.display, grupos: [...d.querySelectorAll('#pm_rep_grupos input.pm-rg')].map((e) => e.getAttribute('data-grupo')), celulas: (out.r100.html.match(/class="pm-rl"/g) || []).length };
            /* geral 50 */
            out.r50 = run(() => { set('pm_repasse', '50'); }); out.csv50 = csv();
            /* geral 0 */
            out.r0 = run(() => { set('pm_repasse', '0'); });
            /* grupo FERRAGEM 100 sobre geral 0; linha A1 25 sobre o grupo */
            const vg = d.querySelector('#pm_rep_grupos input.pm-rg[data-grupo="FERRAGEM"]'); if (vg) vg.value = '100';
            out.rG = run();
            w.lhPmRepLinha.gravar('A1', 25); out.rL = run();
            /* troca de estratégia: a linha sobrevive */
            out.rL2 = run(() => { set('pm_estr', 'preco'); }); out.rL3 = run(() => { set('pm_estr', 'fica'); });
            out.ls = w.localStorage.getItem(w.lhPmRepLinha.chave());
            /* conta aberta do parafuso */
            const tr = d.querySelector('#pm-result tr[data-i]'); const abre = tr && tr.querySelector('.pm-abre');
            if (abre) { abre.dispatchEvent(new w.Event('click')); }
            const det = tr && tr.nextElementSibling; out.conta = det && det.classList.contains('pm-det') ? det.textContent.replace(/\s+/g, ' ') : '';
            out.contaLinhas = det ? [...det.querySelectorAll('tbody tr')].map((x) => [...x.querySelectorAll('td')].map((c) => c.textContent.trim())) : [];
            if (abre) { abre.dispatchEvent(new w.Event('click')); } out.contaFechou = !(tr.nextElementSibling && tr.nextElementSibling.classList.contains('pm-det'));
            /* limpar linhas */
            w.lhPmRepLinha.limpar(); out.rLimpo = run();
            /* Excel com repasse 50 geral */
            vg.value = ''; set('pm_repasse', '50'); w.lhPmRender();
            try { w.eval(fs.readFileSync(require.resolve('exceljs/dist/exceljs.min.js'), 'utf8')); } catch (e) { out.xlErro = 'exceljs: ' + e.message; }
            if (w.ExcelJS) { const _wb = w.ExcelJS.Workbook; let cap = null; w.ExcelJS.Workbook = function () { cap = new _wb(); cap.xlsx.writeBuffer = () => Promise.resolve(new Uint8Array(1)); return cap; };
              w.lhPmExcel(); await new Promise((r) => setTimeout(r, 300)); w.ExcelJS.Workbook = _wb;
              if (cap) { const ws = cap.getWorksheet('Precificacao'); out.xlHead = ws.getRow(1).values.slice(1); const li = ws.getRow(2).values.slice(1); out.xlA1 = {}; out.xlHead.forEach((h, i) => { out.xlA1[h] = li[i]; });
                const erp = cap.getWorksheet('Tabela_Precos_ERP'); out.erpHead = erp.getRow(1).values.slice(1); const el = erp.getRow(2).values.slice(1); out.erpA1 = {}; out.erpHead.forEach((h, i) => { out.erpA1[h] = el[i]; });
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
    console.log('\n-- repasse 100% (padrão) --');
    ex('caixa do repasse visível; grupos FERRAGEM e MERCEARIA; célula REPASSE em cada uma das 3 linhas', r.tela100.repBox !== 'none' && r.tela100.grupos.join(',') === 'FERRAGEM,MERCEARIA' && r.tela100.celulas === 3, JSON.stringify(r.tela100));
    ex('decidido = calculado: parafuso 2033 99,11 e 2027 103,96', perto(y(r.r100, 'A1', 2033).decidido, 99.11) && perto(y(r.r100, 'A1', 2027).decidido, 103.96), y(r.r100, 'A1', 2033).decidido + ' ' + y(r.r100, 'A1', 2027).decidido);
    ex('a tela diz "100%: a tabela decidida é a calculada"; sem KPI de decidido', /100%: a tabela decidida é a calculada/.test(r.r100.repN) && !/Preço decidido em 2033/.test(r.r100.html), r.r100.repN);
    ex('CSV: Preco_2033 = 99,11 e sem coluna Repasse_%', /A1;[^\n]*;99,11;/.test(r.csv100) && !/Repasse_%/.test(r.csv100), r.csv100.split(/\r?\n/).slice(0, 2).join(' | '));
    console.log('\n-- repasse geral 50% e 0% --');
    ex('50%: parafuso 2033 = 100 + 0,5 × (99,11 − 100) = 99,56', perto(y(r.r50, 'A1', 2033).decidido, 99.56), String(y(r.r50, 'A1', 2033).decidido));
    ex('50%: parafuso 2027 = 100 + 0,5 × (103,96 − 100) = 101,98', perto(y(r.r50, 'A1', 2027).decidido, 101.98), String(y(r.r50, 'A1', 2027).decidido));
    ex('50%: o que não repassou sai do que fica: fica decidido 2027 = 101,98 × 0,82 ÷ 1,088 = 76,86 (< 78,35)', perto(y(r.r50, 'A1', 2027).ficaDecidido, 76.86) && y(r.r50, 'A1', 2027).ficaDecidido < 78.35, String(y(r.r50, 'A1', 2027).ficaDecidido));
    ex('50%: absorvido 2027 = 103,96 − 101,98 = 1,98', perto(y(r.r50, 'A1', 2027).absorvido, 1.98), String(y(r.r50, 'A1', 2027).absorvido));
    ex('50%: lucro decidido 2027 = fica decidido − custo do ano (57,81) = 19,05', perto(y(r.r50, 'A1', 2027).lucroDecidido, 19.05), String(y(r.r50, 'A1', 2027).lucroDecidido));
    ex('KPI "Preço decidido em 2033" aparece com "calculado" ao lado; bloco "Calculado × decidido"', /Preço decidido em 2033/.test(r.r50.html) && /calculado [+−-]?\d/.test(r.r50.html) && /Calculado × decidido \(repasse\)/.test(r.r50.html), '');
    ex('CSV com 50%: Preco_2033 = 99,56 (decidido), Repasse_% = 50, Preco_calculado_2033 = 99,11', /Preco_2033;Repasse_%;Preco_calculado_2027/.test(r.csv50) && /A1;[^\n]*;99,56;50;103,96;/.test(r.csv50), r.csv50.split(/\r?\n/).slice(0, 2).join(' | '));
    ex('0%: parafuso 2033 = 100,00 (preço de hoje) em todos os anos', perto(y(r.r0, 'A1', 2033).decidido, 100) && perto(y(r.r0, 'A1', 2027).decidido, 100), String(y(r.r0, 'A1', 2033).decidido));
    console.log('\n-- prioridade: linha > grupo > geral --');
    ex('geral 0 + grupo FERRAGEM 100: parafuso 99,11 (grupo), arroz 25,00 (geral)', perto(y(r.rG, 'A1', 2033).decidido, 99.11) && perto(y(r.rG, 'A6', 2033).decidido, 25) && r.rG.by.A1.c.repasse.origem === 'grupo', y(r.rG, 'A1', 2033).decidido + ' ' + y(r.rG, 'A6', 2033).decidido);
    ex('linha A1 = 25: parafuso 100 + 0,25 × (−0,89) = 99,78 (linha), trena continua 100 (grupo)', perto(y(r.rL, 'A1', 2033).decidido, 99.78) && r.rL.by.A1.c.repasse.origem === 'linha' && r.rL.by.A2.c.repasse.origem === 'grupo', y(r.rL, 'A1', 2033).decidido + ' ' + r.rL.by.A1.c.repasse.origem);
    ex('a linha sobrevive à troca de estratégia (preço → fica): origem continua "linha", 25%', r.rL3.by.A1.c.repasse.origem === 'linha' && r.rL3.by.A1.c.repasse.pct === 25, JSON.stringify(r.rL3.by.A1.c.repasse));
    ex('guardado no navegador: localStorage tem {"A1":25}', /"A1":25/.test(r.ls || ''), String(r.ls));
    ex('a tela conta "1 pela linha"', /1 pela linha/.test(r.rL.repN), r.rL.repN);
    ex('limpar repasses por linha → parafuso volta ao grupo (99,11)', perto(y(r.rLimpo, 'A1', 2033).decidido, 99.11) && r.rLimpo.by.A1.c.repasse.origem === 'grupo', y(r.rLimpo, 'A1', 2033).decidido);
    console.log('\n-- conta aberta (▸) --');
    const L = r.contaLinhas.filter((l) => l.length); const linha = (rot) => L.find((l) => l[0] === rot) || [];
    ex('abriu com as linhas hoje, 2026 (teste), 2027 … 2033', L.length === 9 && linha('hoje').length > 0 && linha('2033').length > 0, L.map((l) => l[0]).join(','));
    ex('hoje: ICMS 18% · PIS/COFINS 3,65% · por dentro 100,00 · prateleira 100,00 · fica 78,35', linha('hoje')[1] === '18%' && linha('hoje')[2] === '3,65%' && linha('hoje')[3] === '100,00' && linha('hoje')[5] === '100,00' && linha('hoje')[6] === '78,35', linha('hoje').join(' | '));
    ex('2027: ICMS 18% · PIS 0 (CBS substitui) · por dentro 97,06 · IBS/CBS 8,8% = 6,89 (sobre os 78,35, art. 12 §2º V) · prateleira 103,96', linha('2027')[1] === '18%' && /^0 \(CBS substitui\)/.test(linha('2027')[2]) && linha('2027')[3] === '97,06' && /8,8% = 6,89/.test(linha('2027')[4]) && linha('2027')[5] === '103,96', linha('2027').join(' | '));
    ex('2029: ICMS 16,2% (9/10) · por dentro 95,10 · IBS/CBS 10,57% = 8,28 · prateleira 103,38', /^16,2% \(9\/10\)/.test(linha('2029')[1]) && linha('2029')[3] === '95,10' && /10,57% = 8,28/.test(linha('2029')[4]) && linha('2029')[5] === '103,38', linha('2029').join(' | '));
    ex('2033: ICMS 0 · por dentro 78,35 · IBS/CBS 26,5% = 20,76 · prateleira 99,11 · fica 78,35', linha('2033')[1] === '0%' && linha('2033')[3] === '78,35' && /26,5% = 20,76/.test(linha('2033')[4]) && linha('2033')[5] === '99,11' && linha('2033')[6] === '78,35', linha('2033').join(' | '));
    ex('a conta traz custo e lucro (o parafuso tem custo): 2033 custo 57,81 · lucro 20,54', linha('2033')[7] === '57,81' && linha('2033')[8] === '20,54', linha('2033').slice(7).join(' | '));
    ex('o rodapé explica o derretimento (9/10 … 6/10; 2033: zero) e a estratégia', /9\/10, 8\/10, 7\/10, 6\/10; 2033: zero/.test(r.conta) && /os 78,35 são fixos/.test(r.conta), r.conta.slice(-200));
    ex('clicar de novo fecha a conta', r.contaFechou === true, '');
    console.log('\n-- Excel (repasse geral 50%) --');
    ex('Precificacao com Repasse_%, Repasse_origem, Preco_decidido_2033, Fica_decidido_2033', !!r.xlHead && ['Repasse_%', 'Repasse_origem', 'Preco_decidido_2033', 'Fica_decidido_2033'].every((c) => r.xlHead.indexOf(c) >= 0), r.xlErro || (r.xlHead || []).join(','));
    ex('parafuso: Repasse 50 · decidido 2033 99,56 · calculado 99,11', !!r.xlA1 && r.xlA1['Repasse_%'] === 50 && perto(r.xlA1.Preco_decidido_2033, 99.56) && perto(r.xlA1.Preco_final_2033, 99.11), JSON.stringify(r.xlA1 && { r: r.xlA1['Repasse_%'], d: r.xlA1.Preco_decidido_2033, c: r.xlA1.Preco_final_2033 }));
    ex('Tabela_Precos_ERP: Preco_2033 = decidido 99,56 e Preco_calculado_2033 = 99,11', !!r.erpA1 && perto(r.erpA1.Preco_2033, 99.56) && perto(r.erpA1.Preco_calculado_2033, 99.11), JSON.stringify(r.erpA1 && { d: r.erpA1.Preco_2033, c: r.erpA1.Preco_calculado_2033 }));
    ex('CSV traz CST_IBS_CBS e cClassTrib na linha do preço: parafuso 000 · 000001, arroz 200 · 200003', /Tratamento;CST_IBS_CBS;cClassTrib;Preco_hoje/.test(r.csv100) && /A1;[^;]*;[^;]*;[^;]*;000;000001;100;/.test(r.csv100) && /A6;[^;]*;[^;]*;[^;]*;200;200003;25;/.test(r.csv100), r.csv100.split(/\r?\n/).slice(0, 2).join(' | '));
    ex('Excel Precificacao e Tabela_Precos_ERP com CST_IBS_CBS e cClassTrib (parafuso 000 · 000001)', !!r.xlA1 && r.xlA1.CST_IBS_CBS === '000' && r.xlA1.cClassTrib === '000001' && !!r.erpA1 && r.erpA1.CST_IBS_CBS === '000' && r.erpA1.cClassTrib === '000001', JSON.stringify({ x: r.xlA1 && [r.xlA1.CST_IBS_CBS, r.xlA1.cClassTrib], e: r.erpA1 && [r.erpA1.CST_IBS_CBS, r.erpA1.cClassTrib] }));
    ex('Leia-me com "Repasse: Preço decidido = …" e "Conta aberta"', !!r.leiame && r.leiame.some((l) => /^Repasse: Preço decidido = preço de hoje/.test(l)) && r.leiame.some((l) => /^Conta aberta:/.test(l)), (r.leiame || []).filter((l) => /^(Repasse|Conta)/.test(l)).map((l) => l.slice(0, 60)).join(' | '));
  }
  console.log('\n-- ao contrário --');
  const sab = async (nome, alvo, troca, teste) => {
    if (APP.split(alvo).length !== 2) throw new Error('sabotagem "' + nome + '" não achou o alvo');
    const s = await rodar(APP.replace(alvo, troca)); ex(nome, !s.erro && teste(s), s.erro);
  };
  await sab('repasse ignorado no preço decidido → 50% sai 99,11 → reprova', 'o.decidido=r2(o.hojeCli+rp.fr*(o.finalCli-o.hojeCli));', 'o.decidido=r2(o.finalCli);',
    (s) => !perto(s.r50.by.A1.c.anos[2033].decidido, 99.56));
  await sab('linha deixa de valer sobre o grupo → parafuso fica no grupo (99,11) → reprova', "if(cfg.repLinha && cfg.repLinha[String(f.cod)]!=null){ v=+cfg.repLinha[String(f.cod)]; origem='linha'; }", "if(false){}",
    (s) => !perto(s.rL.by.A1.c.anos[2033].decidido, 99.78));
  await sab('CSV volta a sair com o calculado → 50% sai 99,11 → reprova', "concat(AN.map(function(a){ return v(o['dec'+a]); }))", "concat(AN.map(function(a){ return v(o['final'+a]); }))",
    (s) => !/A1;[^\n]*;99,56;50;/.test(s.csv50));
  await sab('conta aberta sem o derretimento do ICMS → 2029 mostra 18% → reprova', "pct(icmsPct*(al.pcVelhoEstadual!=null?al.pcVelhoEstadual:1))", "pct(icmsPct)",
    (s) => { const l = (s.contaLinhas || []).find((x) => x[0] === '2029') || []; return !/^16,2%/.test(l[1] || ''); });
  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado');
  process.exit(falhou ? 1 : 0);
})();
