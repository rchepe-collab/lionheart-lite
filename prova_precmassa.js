/* PROVA DA PRECIFICAÇÃO EM MASSA 2027-33 · v866 — só preço e imposto
   1. o motor lhPreco: preço 100, ICMS 18 + PIS/COFINS 3,65 por dentro (Presumido) → fica 78,35; 2033 = 78,35 × 1,265 = 99,11;
      2027 = 78,35 ÷ 0,82 = 95,55 por dentro + 8,8% por fora = 103,96; 2029 com ICMS a 9/10 e IBS 10%;
   2. as três estratégias fixam o que prometem (fica · preço · custo líquido do cliente PJ);
   3. cesta básica (zero) cai: o ICMS some e nada entra por fora; Simples = preço igual em todos os anos; 2026 = igual a hoje (teste compensável); ICMS-ST fica por dentro (não "sobe 20%");
   4. a alíquota por fora bate com a nota simulada no mesmo ano (mesma fonte: getAliq × cmAliqAno);
   5. a tela lê a ficha do Classificador (itens prontos), separa os não precificados e explica; Excel com 4 abas; CSV para o ERP.
   Uso: npm i --no-save jsdom exceljs && node prova_precmassa.js */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
let falhou = 0;
const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(74, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const perto = (a, b, t) => Math.abs((+a) - (+b)) <= (t === undefined ? 0.011 : t);
const ROWS = [['CODIGO', 'DESCRICAO', 'NCM', 'PRECO_VENDA', 'ALIQUOTA_ICMS', 'CST_ICMS', 'CST_PIS_COFINS'],
  ['A1', 'PARAFUSO SEXTAVADO', '73181500', '100', '18', '000', '01'],
  ['A2', 'PAPEL HIGIENICO 4 ROLOS', '48181000', '10', '18', '000', '01'],
  ['A3', 'CIMENTO CP-II (ST)', '25232900', '40', '0', '500', '01'],
  ['A4', 'GASOLINA', '27101259', '6', '', '', ''],
  ['A5', 'TRENA', '30178090', '20', '18', '000', '01'],
  ['A6', 'ARROZ TIPO 1 5KG', '10063021', '25', '7', '000', '06'],
  ['A7', 'FURADEIRA', '84672100', '300', '', '000', '01']];
function rodar(html, cfg) {
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
            const set = (id, v) => { const e = w.document.getElementById(id); if (e) e.value = v; };
            set('pm_regime', (cfg && cfg.regime) || 'presumido'); set('pm_estr', (cfg && cfg.estr) || 'fica'); set('pm_icms', '18'); set('pm_cliente', (cfg && cfg.cliente) || 'pf');
            w.lhPmRender();
            const P = w.PM_ULTIMO; out.by = {}; P.rows.forEach((r) => { out.by[r.f.cod] = r; }); out.fora = P.fora.map((f) => f.cod + ':' + f.motivo);
            out.html = w.document.getElementById('pm-result').innerHTML;
            /* motor direto */
            out.m = {}; [2026, 2027, 2029, 2033].forEach((a) => { out.m[a] = { fica: w.lhPreco({ trat: 'cheia', preco: 100, icms: 18, pis: 3.65 }, a, { regime: 'presumido' }, 'fica'), preco: w.lhPreco({ trat: 'cheia', preco: 100, icms: 18, pis: 3.65 }, a, { regime: 'presumido' }, 'preco'), pj: w.lhPreco({ trat: 'cheia', preco: 100, icms: 18, pis: 3.65 }, a, { regime: 'presumido' }, 'pj'), simples: w.lhPreco({ trat: 'cheia', preco: 100, icms: 18 }, a, { regime: 'simples' }, 'fica'), red60: w.lhPreco({ trat: 'red60', preco: 100, icms: 18, pis: 3.65 }, a, { regime: 'presumido' }, 'fica') }; });
            out.adrem = w.lhPreco({ trat: 'adrem', preco: 6 }, 2033, {}, 'fica');
            /* bate com a nota: IBS+CBS de um item de R$ 95,55 em 2027 pelo caminho da nota (snItemBase com SN_ANO) */
            try { w.abrirPagina('simnotas'); w.snAno(2027); const idx = w.LH_CLASSIF_PRODUTOS.findIndex((p) => p.n === 'Comércio - Varejo Geral');
              w.document.getElementById('snv_prod').value = String(idx); w.document.getElementById('snv_qtd').value = 1; w.document.getElementById('snv_vu').value = 95.55;
              const it = w.snItem('snv'); out.nota2027 = it ? (it.ibs + it.cbs) : null; } catch (e) { out.notaErro = e.message; }
            /* Excel real */
            w.eval(fs.readFileSync(require.resolve('exceljs/dist/exceljs.min.js'), 'utf8'));
            let buf = null; w.URL.createObjectURL = () => 'blob:x'; w.HTMLAnchorElement.prototype.click = function () {}; const _B = w.Blob; w.Blob = function (p) { buf = p[0]; return new _B(p); };
            w.lhPmExcel(); for (let i = 0; i < 100 && !buf; i++) await new Promise((r) => setTimeout(r, 50));
            if (buf) { const wb = new (require('exceljs')).Workbook(); await wb.xlsx.load(buf); out.xl = { abas: wb.worksheets.map((s) => s.name), n: wb.getWorksheet('Precificacao').rowCount - 1, erp: [], nao: wb.getWorksheet('Nao_precificados').rowCount - 1 };
              wb.getWorksheet('Tabela_Precos_ERP').eachRow((row) => out.xl.erp.push(row.values.slice(1))); }
            let csv = null; w.Blob = function (p) { csv = p[0]; return new _B(p); }; w.lhPmCSV(); out.csv = csv;
          } catch (e) { out.erro = e.message + ' ' + (e.stack || '').split('\n')[1]; }
          w.close(); ok(out);
        };
        setTimeout(poll, 200);
      } catch (e) { out.erro = e.message; w.close(); ok(out); }
    }, 8000);
  });
}
(async () => {
  const r = await rodar(APP);
  ex('carregou, classificou e precificou sem erro', !r.erro, r.erro);
  if (!r.erro) {
    const m = r.m;
    console.log('\n-- o motor: preço 100, ICMS 18 + PIS/COFINS 3,65 por dentro --');
    ex('hoje fica com você 78,35', perto(m[2033].fica.ficaHoje, 78.35), m[2033].fica.ficaHoje);
    ex('2033: por dentro 78,35 · IBS/CBS 20,76 · final 99,11 (menor que hoje)', perto(m[2033].fica.base, 78.35) && perto(m[2033].fica.fora, 20.76) && perto(m[2033].fica.final, 99.11) && m[2033].fica.sinal === '▼', JSON.stringify(m[2033].fica));
    ex('2027: por dentro 95,55 (cobre o ICMS 18) · IBS/CBS 8,41 · final 103,96', perto(m[2027].fica.base, 95.55) && perto(m[2027].fica.fora, 8.41) && perto(m[2027].fica.final, 103.96), JSON.stringify(m[2027].fica));
    /* 2029: ICMS 16,2% por dentro → base 78,35/0,838 = 93,50; fora 10,57% → 9,88; final 103,38 */
    ex('2029: ICMS a 9/10 (16,2%) → por dentro 93,50 · IBS/CBS 10,57% = 9,88 · final 103,38', perto(m[2029].fica.base, 93.50) && perto(m[2029].fica.fora, 9.88) && perto(m[2029].fica.final, 103.38), JSON.stringify(m[2029].fica));
    ex('fica com você constante em todos os anos', [2027, 2029, 2033].every((a) => perto(m[a].fica.fica, 78.35)));
    ex('−60% (papel higiênico) em 2033: 78,35 × 1,106 = 86,66', perto(m[2033].red60.final, 86.66), m[2033].red60.final);
    console.log('\n-- as estratégias fixam o que prometem --');
    ex('manter preço: final 100 em 2033 → fica 79,05 (+0,70)', perto(m[2033].preco.final, 100) && perto(m[2033].preco.fica, 79.05) && perto(m[2033].preco.dFica, 0.70), JSON.stringify(m[2033].preco));
    ex('cliente PJ: por dentro 100 · final 126,50 · fica 100', perto(m[2033].pj.base, 100) && perto(m[2033].pj.final, 126.5) && perto(m[2033].pj.fica, 100), JSON.stringify(m[2033].pj));
    ex('cliente PJ em 2027: final 100 + 8,8 = 108,80; fica 82', perto(m[2027].pj.final, 108.8) && perto(m[2027].pj.fica, 82), JSON.stringify(m[2027].pj));
    console.log('\n-- casos especiais --');
    ex('Simples: preço igual em todos os anos, com o motivo', [2027, 2029, 2033].every((a) => m[a].simples.final === 100 && m[a].simples.neutro) && /DAS/.test(m[2033].simples.motivo));
    ex('2026: igual a hoje (teste compensável)', m[2026].fica.final === 100 && m[2026].fica.neutro && /2026/.test(m[2026].fica.motivo));
    ex('ad rem (gasolina) → o motor devolve null (não é percentual)', r.adrem === null);
    ex('ICMS-ST (cimento, ICMS 0 no cadastro, CSOSN 500): usa a média 18% por dentro e NÃO sobe 20%', r.by.A3 && perto(r.by.A3.c.icmsUsado, 18) && r.by.A3.f.st && perto(r.by.A3.c.anos[2033].final, 40 * 0.7835 * 1.265, 0.02), r.by.A3 && JSON.stringify([r.by.A3.c.icmsUsado, r.by.A3.c.anos[2033].final]));
    ex('arroz (cesta básica, zero; ICMS 7 no cadastro, PIS CST 06 = 0) CAI em 2033: 25 × 0,93 = 23,25, sem IBS/CBS', r.by.A6 && r.by.A6.f.trat === 'zero' && perto(r.by.A6.c.anos[2033].final, 23.25) && r.by.A6.c.anos[2033].fora === 0 && r.by.A6.c.anos[2033].sinal === '▼', r.by.A6 && JSON.stringify(r.by.A6.c.anos[2033]));
    ex('arroz em 2029 ainda carrega 9/10 do ICMS: 23,25 ÷ 0,937 = 24,81', r.by.A6 && perto(r.by.A6.c.anos[2029].final, 24.81), r.by.A6 && r.by.A6.c.anos[2029].final);
    ex('furadeira sem ICMS no cadastro → média 18% marcada "est."', r.by.A7 && r.by.A7.c.icmsEstimado && perto(r.by.A7.c.icmsUsado, 18));
    console.log('\n-- bate com a nota simulada --');
    ex('IBS+CBS de R$ 95,55 em 2027 pela nota = 8,41 (mesma fonte)', r.nota2027 !== null && perto(r.nota2027, 8.41, 0.02), String(r.nota2027) + ' ' + (r.notaErro || ''));
    console.log('\n-- a tela --');
    ex('lê a ficha do Classificador: 5 prontos precificados', Object.keys(r.by).length === 5, Object.keys(r.by).join(','));
    ex('não precificados com motivo: gasolina (revisão), trena (NCM a validar)', r.fora.length === 2 && r.fora.some((x) => /A4/.test(x) && /revis/.test(x)) && r.fora.some((x) => /A5/.test(x) && /validar/.test(x)), r.fora.join(' / '));
    ex('mostra a classificação como coluna de leitura (200 · 200035 do papel higiênico)', /200 · 200035/.test(r.html));
    ex('bloco "Como ler esta tabela" recolhível', /Como ler esta tabela/.test(r.html) && /line-clamp:2/.test(r.html) && /ver tudo/.test(r.html));
    ex('KPIs: sobem / caem / não precificados', /Sobem em 2033/.test(r.html) && /Caem em 2033/.test(r.html) && /Não precificados/.test(r.html));
    console.log('\n-- exportações --');
    ex('Excel com 4 abas', r.xl && r.xl.abas.join() === 'Precificacao,Tabela_Precos_ERP,Nao_precificados,Leia-me', r.xl && r.xl.abas.join());
    ex('Precificacao tem 5 linhas; Nao_precificados 2', r.xl && r.xl.n === 5 && r.xl.nao === 2, r.xl && r.xl.n + '/' + r.xl.nao);
    ex('Tabela_Precos_ERP: parafuso hoje 100 → 2033 99,11', r.xl && r.xl.erp.some((v) => v[0] === 'A1' && perto(v[2], 100) && perto(v[v.length - 1], 99.11)), r.xl && JSON.stringify(r.xl.erp[1]));
    ex('CSV para o ERP com Preco_final_2027..2033 e vírgula decimal', /Preco_final_2027;.*Preco_final_2033/.test(String(r.csv)) && /A1;PARAFUSO[^\n]*;99,11/.test(String(r.csv)), String(r.csv).split('\n').slice(0, 2).join(' | '));
  }
  console.log('\n-- ao contrário --');
  const sab = async (nome, alvo, troca, teste) => {
    if (APP.split(alvo).length !== 2) throw new Error('sabotagem "' + nome + '" não achou o alvo');
    const s = await rodar(APP.replace(alvo, troca)); ex(nome, !s.erro && teste(s), s.erro);
  };
  await sab('por dentro sem o divisor (base = R) → 2027 sai 78,35 em vez de 95,55 → reprova', 'else { base=R/(1-tD);', 'else { base=R;',
    (s) => !perto(s.m[2027].fica.base, 95.55));
  await sab('IBS/CBS calculado por dentro (base/(1+t)) → 2033 diverge da nota → reprova', 'fora=base*tFora; fin=base+fora; velho=base*tD; fica=base-velho; }\n   o.base', 'fora=base-base/(1+tFora); fin=base; velho=base*tD; fica=base-velho; }\n   o.base',
    (s) => !perto(s.m[2033].fica.final, 99.11));
  await sab('Simples tratado como Presumido → preço muda → reprova', "if(regime==='simples' || ano<=2026){", "if(ano<=2026){",
    (s) => !(s.m[2033].simples.final === 100));
  await sab('ST volta a zero de ICMS → cimento sobe 20% → reprova', 'var icms=(item.icms!=null && +item.icms>0)?+item.icms:(+cfg.icmsMedio||0);', 'var icms=item.st?0:((item.icms!=null && +item.icms>0)?+item.icms:(+cfg.icmsMedio||0));',
    (s) => s.by.A3 && s.by.A3.c.anos[2033].final > 45);
  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado');
  process.exit(falhou ? 1 : 0);
})();
