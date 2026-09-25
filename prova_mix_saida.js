/* PROVA DO MOTOR DE SAÍDA · v857
   Segura: os três campos de cliente (Real/Presumido, Simples, não creditante)
   fecham em 100% das vendas no país, na DxH e na Regime Ótimo, pela mesma conta,
   e a exportação vem à parte, sobre o total;
   nota de venda de fornecedor e transferência entre filiais não entram;
   ente público e CPF são não creditantes; CNPJ privado é B2B.
   Achado com documentos reais de 25/09: 113% na DxH, 37,8% na Regime Ótimo.
   Dados 100% sintéticos. Uso: npm i --no-save jsdom && node prova_mix_saida.js */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
let falhou = 0;
const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(64, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const EMP = '11222333000181', FIL = '11222333000262', FORN = '99888777000155';
const nota = (o) => Object.assign({ tpNF: '1', emitCNPJ: EMP, idDest: '1', cfop: '5102', destCNPJ: '', destCPF: '', destNome: '', destIE: '9', vProd: 0, itens: [] }, o);
const NOTAS = [
  nota({ destCNPJ: '12345678000195', destNome: 'COMERCIAL PRIVADA LTDA', destIE: '1', vProd: 40000 }),       /* B2B        40 */
  nota({ destCNPJ: '23456789000110', destNome: 'SERVICO AUTONOMO DE AGUA E ESGOTO', destIE: '1', vProd: 30000 }), /* público 30 (tem IE!) */
  nota({ destCPF: '12345678909', destNome: 'JOAO DA SILVA', destIE: '1', vProd: 20000 }),                      /* CPF        20 */
  nota({ destCNPJ: '', destNome: 'IMPORTER INC', idDest: '3', cfop: '7101', vProd: 10000 }),                   /* exportação 10 */
  nota({ emitCNPJ: FORN, destCNPJ: '55666777000100', destNome: 'OUTRA EMPRESA LTDA', destIE: '1', vProd: 500000 }), /* nota de venda de FORNECEDOR que veio na pasta: fora */
  nota({ destCNPJ: FIL, destNome: 'FILIAL', destIE: '1', cfop: '5152', vProd: 50000 })                         /* transferência: fora */
];
function rodar(html) {
  return new Promise((ok) => {
    const w = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true,
      url: 'https://lionheartintelligence.com.br/app.html', virtualConsole: new VirtualConsole() }).window;
    setTimeout(() => {
      /* o campo cliente Simples começa sujo: a conta nova tem de zerar */
      ['dxh_cli_simples', 'c05_cli_simples'].forEach((id) => { const e = w.document.getElementById(id); if (e) e.value = '13'; });
      w.LH_IMPORT_PGDAS = { ok: true, cnpj: EMP, rbt12: 1200000, _n: 6 }; w.LH_EMP_CNPJ = EMP;
      w._LH_XML_NOTAS = NOTAS; w.LH_XML_NOTAS = NOTAS; w.LH_IMPORT_XML = w.lhImportXML_aggregate(NOTAS);
      try { w.LH_aplicarDocsNasCalcs(true); } catch (e) {}
      setTimeout(() => {
        const v = (id) => parseFloat((w.document.getElementById(id) || {}).value) || 0;
        const r = {
          dxh: ['dxh_cli_regular', 'dxh_cli_simples', 'dxh_cli_b2c', 'dxh_export'].map(v),
          c05: ['c05_cli_regular', 'c05_cli_simples', 'c05_cli_b2c', 'c05_export'].map(v),
          mix: w.lhMixSaidaNotas ? w.lhMixSaidaNotas(NOTAS) : null
        };
        try { w.dxhSaidaSoma(); } catch (e) {}
        r.dxhSoma = (w.document.getElementById('dxh_saida_soma') || {}).textContent || '';
        w.close(); ok(r);
      }, 1200);
    }, 8000);
  });
}
const soma = (a) => Math.round(a.slice(0, 3).reduce((s, x) => s + x, 0) * 10) / 10;   /* os três de cliente */
const checar = (r) => [
  ['DxH: clientes fecham em 100%', soma(r.dxh) === 100, r.dxh.join(' + ')],
  ['Regime Ótimo: clientes fecham em 100%', soma(r.c05) === 100, r.c05.join(' + ')],
  ['DxH mostra "Soma 100%" em verde', /Soma 100%/.test(r.dxhSoma), r.dxhSoma],
  ['DxH e Regime Ótimo mostram o mesmo perfil', JSON.stringify(r.dxh) === JSON.stringify(r.c05), r.dxh + ' | ' + r.c05],
  ['B2B privado = 44,4% das vendas no país (40 de 90; fornecedor e transferência fora)', r.c05[0] === 44.4, 'regular=' + r.c05[0]],
  ['não creditante = 55,6% das vendas no país (ente público com IE + CPF)', r.c05[2] === 55.6, 'b2c=' + r.c05[2]],
  ['exportação = 10% do total', r.c05[3] === 10, 'export=' + r.c05[3]],
  ['campo Simples sujo volta a 0 (a nota não diz o regime)', r.dxh[1] === 0 && r.c05[1] === 0, 'simples=' + r.dxh[1] + '/' + r.c05[1]]
];
function sabotar(chave) {
  const a = {
    contaFornecedor: ["if(raizEmp && em && em.slice(0,8)!==raizEmp) return;          /* venda do fornecedor: não é saída da empresa */", ''],
    semRegimeOtimo: [",cliRegular:'c05_cli_regular',cliSimples:'c05_cli_simples'}", '}'],
    publicoCredita: ["if(window._lhEntePublico && window._lhEntePublico(nt.destNome||'')) vPub+=v; else vB2B+=v;", 'vB2B+=v;']
  }[chave];
  if (APP.split(a[0]).length !== 2) throw new Error('sabotagem ' + chave + ' não achou o alvo');
  return APP.replace(a[0], a[1]);
}
(async () => {
  console.log('\n-- motor de saída pela conta única --');
  for (const [n, ok, d] of checar(await rodar(APP))) ex(n, ok, d);
  console.log('\n-- ao contrário: cada defesa arrancada tem de reprovar --');
  for (const [k, idx] of Object.entries({ contaFornecedor: 4, semRegimeOtimo: 1, publicoCredita: 5 })) {
    const r = checar(await rodar(sabotar(k)));
    ex('sem ' + k + ' → reprova', !r[idx][1], r[idx][2]);
  }
  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado');
  process.exit(falhou ? 1 : 0);
})();
