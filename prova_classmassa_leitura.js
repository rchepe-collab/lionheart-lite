/* PROVA DO CLASSIFICADOR EM MASSA · v864 — "o que é da ferramenta e o que é do cadastro"
   1. descrição que indica produto SEM benefício vira regra geral firme (CONFIRMADO), não revisão:
      puxador (8302), lâmpada LED (8543), luva de látex 4015.19, óculos de proteção 9004.90.90, graxa (2710),
      cupinicida (3808), álcool gel (2207), telefone sem fio (8517);
   2. a evidência positiva continua abrindo o caminho do benefício: barra de apoio PcD, luva cirúrgica, óculos de grau;
   3. o combustível de verdade continua monofásico/revisão (gasolina), e o que não dá para decidir continua em revisão;
   4. NCM com erro de digitação ganha sugestão (3017.80.90 → 9017.80.90) sem alterar o NCM do cadastro; NCM "0" é "zerado";
   5. o bloco "Como ler este resultado" sai do próprio arquivo — na tela, no Dashboard, no topo da aba Pendencias e no Leia-me.
   Uso: npm i --no-save jsdom exceljs && node prova_classmassa_leitura.js */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
let falhou = 0;
const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(72, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const ROWS = [['Codigo', 'Descricao', 'NCM'],
  ['A1', 'PUXADOR TIPO ALCA MED INOX', '83024100'],
  ['A2', 'BARRA DE APOIO PCD 80CM INOX', '83024100'],
  ['A3', 'LAMPADA LED 9 WATTS BIVOLT', '85437099'],
  ['A4', 'LUVA LATEX FORRADA CONFORT N07', '40151900'],
  ['A5', 'LUVA CIRURGICA ESTERIL 7,5', '40151200'],
  ['A6', 'OCULOS DE SEG INCOLOR MOD RJ', '90049090'],
  ['A7', 'OCULOS DE GRAU RECEITADO', '90049010'],
  ['A8', 'GRAXA USO GERAL MARROM 90G', '27101999'],
  ['A9', 'GASOLINA COMUM', '27101259'],
  ['A10', 'JIMO CUPIM INCOLOR 18L', '38089119'],
  ['A11', 'ALCOOL GEL 70% 5L', '22071000'],
  ['A12', 'TELEFONE SEM FIO INTELBRAS', '85171200'],
  ['A13', 'GAS PARA MACARICO 400ML', '27111910'],
  ['A14', 'TRENA DE FITA 10MT', '30178090'],
  ['A15', 'KIT BARRAMENTO', '1010101'],
  ['A16', 'MASSA NIVELADORA', '0'],
  ['A17', 'PAPEL HIGIENICO FOLHA DUPLA 4 ROLOS', '48181000'],
  ['A18', 'PARAFUSO SEXTAVADO 1/2', '73181500'],
  ['A19', 'LUVA CIRURGICA ESTERIL 7,5', '40151900']];
function rodar(html) {
  return new Promise((ok) => {
    const w = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true,
      url: 'https://lionheartintelligence.com.br/app.html', virtualConsole: new VirtualConsole() }).window;
    w.fetch = () => new Promise(() => {}); w.HTMLElement.prototype.scrollIntoView = function () {};
    setTimeout(() => {
      const out = { erro: '', by: {} };
      try {
        if (!w.document.getElementById('cm-result')) { const d = w.document.createElement('div'); d.id = 'cm-result'; w.document.body.appendChild(d); }
        w.cmProcessar(ROWS.map((r) => r.slice()));
        const poll = async () => {
          if (!w.CM_ULTIMO) return setTimeout(poll, 100);
          try {
            w.cmBuildRows().forEach((r) => { out.by[r.cod] = r; });
            out.tela = w.document.getElementById('cm-result').innerHTML;
            out.leitura = w.cmLeituraTexto(w.cmLeitura(w.CM_ULTIMO.itens));
            /* Excel: ExcelJS real, gráfico desligado, download capturado */
            /* ExcelJS dentro da janela (mesmo realm), como no navegador */
            w.eval(fs.readFileSync(require.resolve('exceljs/dist/exceljs.min.js'), 'utf8')); w.cmChartPNG = () => null;
            let buf = null; w.URL.createObjectURL = () => 'blob:x'; w.HTMLAnchorElement.prototype.click = function () {};
            const _Blob = w.Blob; w.Blob = function (parts) { buf = parts[0]; return new _Blob(parts); };
            w.cmExportarExcel();
            for (let i = 0; i < 100 && !buf; i++) await new Promise((r) => setTimeout(r, 50));
            if (buf) {
              const wb = new (require('exceljs')).Workbook(); await wb.xlsx.load(buf);
              const txt = (ws) => { const a = []; ws.eachRow((row) => a.push(row.values.map((v) => (v && v.result !== undefined ? v.result : v)).join(' | '))); return a; };
              out.xl = { dash: txt(wb.getWorksheet('Dashboard')), pend: txt(wb.getWorksheet('Pendencias')), leia: txt(wb.getWorksheet('Leia-me')), pendFreeze: (wb.getWorksheet('Pendencias').views[0] || {}).ySplit };
            }
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
  ex('carregou e classificou sem erro', !r.erro, r.erro);
  if (!r.erro) {
    const B = r.by, st = (c) => (B[c] || {}).status, tr = (c) => (B[c] || {}).tratLabel, fo = (c) => String((B[c] || {}).fonte || '');
    console.log('\n-- descrição indica produto SEM benefício → regra geral firme --');
    [['A1', 'puxador'], ['A3', 'lâmpada LED'], ['A4', 'luva de látex 4015.19'], ['A6', 'óculos de proteção 9004.90.90'], ['A8', 'graxa'], ['A10', 'cupinicida'], ['A11', 'álcool gel'], ['A12', 'telefone sem fio']]
      .forEach(([c, n]) => ex(n + ' → CONFIRMADO · Tributação integral · 000001', st(c) === 'CONFIRMADO' && tr(c) === 'Tributação integral' && B[c].cclass === '000001', st(c) + '/' + tr(c) + ' · ' + fo(c).slice(0, 80)));
    ex('a fonte explica o porquê ("a descrição indica … cita o NCM só para …")', /a descrição indica .* só para/.test(fo('A1')), fo('A1').slice(0, 120));
    console.log('\n-- evidência positiva continua abrindo o benefício (não vira regra geral em silêncio) --');
    ex('barra de apoio PcD (8302) NÃO é confirmada como integral', !(st('A2') === 'CONFIRMADO' && tr('A2') === 'Tributação integral'), st('A2') + '/' + tr('A2'));
    ex('luva cirúrgica estéril (4015.12) NÃO é confirmada como integral', !(st('A5') === 'CONFIRMADO' && tr('A5') === 'Tributação integral'), st('A5') + '/' + tr('A5'));
    ex('luva cirúrgica estéril mesmo sob 4015.19 NÃO é confirmada em silêncio', !(st('A19') === 'CONFIRMADO' && tr('A19') === 'Tributação integral'), st('A19') + '/' + tr('A19'));
    ex('óculos de grau (9004.90.10) NÃO é confirmado como integral', !(st('A7') === 'CONFIRMADO' && tr('A7') === 'Tributação integral'), st('A7') + '/' + tr('A7'));
    ex('papel higiênico (Anexo VIII) segue com benefício 200035', st('A17') === 'BENEFICIO_IDENTIFICADO' && B.A17.cclass === '200035', st('A17') + '/' + B.A17.cclass);
    console.log('\n-- o que não dá para decidir continua em revisão --');
    ex('gasolina (2710.12) → monofásico/revisão', st('A9') === 'REVISAO_TRIBUTARIA' && /MONOF/.test(tr('A9')), st('A9') + '/' + tr('A9'));
    ex('gás para maçarico (2711) → revisão (GLP?)', st('A13') === 'REVISAO_TRIBUTARIA', st('A13') + '/' + tr('A13'));
    ex('parafuso → integral, pronto (não mexeu)', (st('A18') === 'REGRA_GERAL' || st('A18') === 'CONFIRMADO') && tr('A18') === 'Tributação integral', st('A18') + '/' + tr('A18'));
    console.log('\n-- cadastro: erro de digitação ganha sugestão; zerado é zerado --');
    ex('trena 3017.80.90 → REVISAO_NCM com sugestão 9017.80.90 na fonte', st('A14') === 'REVISAO_NCM' && /9017\.80\.90/.test(fo('A14')), st('A14') + ' · ' + fo('A14').slice(0, 120));
    ex('o NCM do cadastro NÃO é alterado na linha', B.A14.ncm.replace(/\D/g, '') === '30178090', B.A14.ncm);
    ex('a evidência necessária traz a sugestão', /9017\.80\.90/.test(B.A14.evid), B.A14.evid);
    ex('kit barramento 1010101 → REVISAO_NCM sem sugestão inventada', st('A15') === 'REVISAO_NCM' && !/provável erro/.test(fo('A15')), fo('A15').slice(0, 100));
    ex('NCM "0" → "em branco ou zerado"', st('A16') === 'REVISAO_NCM' && /zerado/.test(fo('A16')), fo('A16').slice(0, 100));
    console.log('\n-- "Como ler este resultado" --');
    const L = r.leitura || [];
    ex('três blocos: como ler · revisão · validar', L.length === 3, String(L.length));
    ex('revisão cita NCM, quantidade e o motivo legal', L[1] && /NCM 2710 \(1/.test(L[1][1]) && /combust/.test(L[1][1]), L[1] && L[1][1].slice(0, 160));
    ex('validar separa zerado / inexistente / digitação com exemplo', L[2] && /zerado/.test(L[2][1]) && /1010101/.test(L[2][1]) && /3017\.80\.90 → 9017\.80\.90/.test(L[2][1]), L[2] && L[2][1].slice(0, 200));
    ex('o bloco está na tela', /Como ler este resultado/.test(r.tela) && /Problema do cadastro/.test(r.tela));
    ex('v865: cada tópico nasce recolhido (2 linhas) com "ver tudo"', (r.tela.match(/class="cml-t"/g) || []).length === 3 && /line-clamp:2/.test(r.tela) && /ver tudo/.test(r.tela) && !/cml-t aberto/.test(r.tela));
    ex('conta os itens confirmados pela descrição', /Em 8 itens a descri/.test(L[0][1]), L[0][1].slice(-120));
    console.log('\n-- Excel --');
    ex('exportou', !!r.xl, 'sem buffer');
    if (r.xl) {
      ex('Dashboard tem "COMO LER ESTE RESULTADO" com os três blocos', r.xl.dash.some((l) => /COMO LER ESTE RESULTADO/.test(l)) && r.xl.dash.some((l) => /em revisão tributária/.test(l)) && r.xl.dash.some((l) => /NCM a validar/.test(l)));
      ex('Pendencias começa com a explicação e o cabeçalho vem depois', /Como ler/.test(r.xl.pend[0]) && !/Codigo/.test(r.xl.pend[0]) && r.xl.pend.slice(1, 4).some((l) => /Codigo \| Descricao/.test(l)), r.xl.pend.slice(0, 5).map((x) => x.slice(0, 40)).join(' // '));
      ex('Pendencias congela até o cabeçalho', r.xl.pendFreeze === 5, String(r.xl.pendFreeze));
      ex('Pendencias lista trena com a sugestão', r.xl.pend.some((l) => /TRENA/.test(l) && /9017\.80\.90/.test(l)));
      ex('Pendencias NÃO lista o puxador', !r.xl.pend.some((l) => /PUXADOR/.test(l)));
      ex('Leia-me traz o bloco', r.xl.leia.some((l) => /Como ler este resultado/.test(l)) && r.xl.leia.some((l) => /Problema do cadastro/.test(l)));
    }
  }
  console.log('\n-- ao contrário --');
  const sab = async (nome, alvo, troca, teste) => {
    if (APP.split(alvo).length !== 2) throw new Error('sabotagem "' + nome + '" não achou o alvo');
    const s = await rodar(APP.replace(alvo, troca)); ex(nome, !s.erro && teste(s), s.erro);
  };
  await sab('gancho removido → puxador volta a revisão → reprova', 'var _sb=cmSemBeneficio(k,hit,desc); if(_sb) return _sb;', 'var _sb=null;',
    (s) => s.by.A1.status !== 'CONFIRMADO');
  await sab('evidência positiva ignorada → luva cirúrgica vira integral em silêncio → reprova', 'if(r.nao.test(d)) return null;', 'if(false) return null;',
    (s) => s.by.A19.status === 'CONFIRMADO' && s.by.A19.tratLabel === 'Tributação integral');
  await sab('sugestão de NCM desligada → trena sem 9017.80.90 → reprova', 'var _sg=cmSugereNCM(k,it.desc);', 'var _sg=null;',
    (s) => !/9017\.80\.90/.test(String(s.by.A14.fonte)));
  await sab('tópicos abertos por padrão (sem o clamp) → reprova', '#cm-leitura .cml-x{display:-webkit-box;-webkit-line-clamp:2;', '#cm-leitura .cml-x{display:block;',
    (s) => !/line-clamp:2/.test(s.tela));
  await sab('bloco tirado da tela → reprova', 'try{ h+=cmLeituraHTML(cmLeitura(itens)); }catch(_eL){}', '',
    (s) => !/Como ler este resultado/.test(s.tela));
  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado');
  process.exit(falhou ? 1 : 0);
})();
