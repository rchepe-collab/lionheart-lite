/* PROVA v897 — ECD e Balancete alimentam os Dados Estratégicos: fixos (ocupação, administrativo, pessoal, pró-labore,
   marketing), estoque em dias, prazos, caixa inicial, amortização de empréstimos (CP inteiro + LP ÷ 5), compras (CMV).
   Também: o ramo J100 do parseECD que nunca rodava desde o v227 (estoque, caixa, fornecedores) passa a rodar.
   Uso: npm i --no-save jsdom && node prova_fin_ecd.js */
const { JSDOM, VirtualConsole } = require('jsdom'); const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
let falhou = 0; const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(86, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const perto = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1 : tol);
const w = new JSDOM(APP, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://lionheartintelligence.com.br/app.html', virtualConsole: new VirtualConsole() }).window;
w.fetch = () => new Promise(() => {}); w.HTMLElement.prototype.scrollIntoView = function () {}; w.scrollTo = function () {}; w.alert = () => {};
/* ECD sintética no layout do Guia Prático: |J100|COD|IND|NIVEL|SUP|GRP|DESCR|VL_INI|DC|VL_FIN|DC| e |J150|...|DESCR|...|VL| */
const J100 = (grp, descr, v) => '|J100|x|T|1|x|' + grp + '|' + descr + '|0|D|' + v.toFixed(2).replace('.', ',') + '|D|';
const J150 = (descr, v) => '|J150|x|T|1|x|x|' + descr + '|0|D|' + v.toFixed(2).replace('.', ',') + '|D|';
const ECD = ['|0000|LECD|01012025|31122025|EMPRESA TESTE LTDA|11111111000191|RS|', J100('A', 'ATIVO', 900000), J100('A', 'ATIVO CIRCULANTE', 500000), J100('A', 'CAIXA E EQUIVALENTES', 50000), J100('A', 'CLIENTES', 100000), J100('A', 'ESTOQUES', 55000),
  J100('P', 'PASSIVO CIRCULANTE', 200000), J100('P', 'FORNECEDORES', 36667), J100('P', 'EMPRESTIMOS E FINANCIAMENTOS', 24000), J100('P', 'PASSIVO NAO CIRCULANTE', 100000), J100('P', 'EMPRESTIMOS E FINANCIAMENTOS', 100000), J100('P', 'PATRIMONIO LIQUIDO', 600000),
  J150('RECEITA BRUTA DE VENDAS', 1300000), J150('(-) DEDUCOES DA RECEITA BRUTA', 100000), J150('RECEITA LIQUIDA', 1200000), J150('CUSTO DAS MERCADORIAS VENDIDAS', 660000), J150('LUCRO BRUTO', 540000),
  J150('DESPESAS COM PESSOAL', 180000), J150('PRO-LABORE', 60000), J150('ALUGUEIS', 30000), J150('ENERGIA ELETRICA', 8000), J150('CONDOMINIO', 2000), J150('DESPESAS ADMINISTRATIVAS', 15000), J150('HONORARIOS CONTABEIS', 5000), J150('PROPAGANDA E PUBLICIDADE', 24000), J150('RECEITAS FINANCEIRAS', 3000), J150('LUCRO LIQUIDO DO EXERCICIO', 150000)].join('\n');
setTimeout(() => {
  const d = w.document, F = w.LH_FIN; const O = { tipo: 'digitado', detalhe: 'prova', quando: '2026-10-01' };
  const e = w.parseECD(ECD);
  ex('parseECD lê o balanço (J100) — o ramo que estava morto desde o v227: caixa, clientes, estoque, fornecedores', e.ok && e.caixa === 50000 && e.receber === 100000 && e.estoque === 55000 && e.fornecedores === 36667, JSON.stringify([e.caixa, e.receber, e.estoque, e.fornecedores]));
  ex('separa empréstimos de curto (24.000) e longo prazo (100.000) pela seção do balanço', e.emprestimosCP === 24000 && e.emprestimosLP === 100000, JSON.stringify([e.emprestimosCP, e.emprestimosLP]));
  ex('lê a DRE (J150): receita líquida 1.200.000 (deduções não sobrescrevem), CMV, pessoal, pró-labore, aluguel, energia, condomínio, adm, marketing, receita financeira', e.receitaLiquida === 1200000 && e.cmv === 660000 && e.pessoal === 180000 && e.prolabore === 60000 && e.aluguel === 30000 && e.energia === 8000 && e.ocupOutros === 2000 && e.adm === 20000 && e.marketing === 24000 && e.recFin === 3000, JSON.stringify(e));
  ex('o PL continua lido (nada regrediu)', e.patrimonioLiquido === 600000);

  /* ECD na Central → Dados */
  w.localStorage.removeItem('LH_FIN::' + F.eid());
  w.LH_IMPORT_ECD = e; w.LH_IMPORT_PGDAS = null; w.LH_IMPORT_ESOCIAL = null; w.LH_IMPORT_XML = null; w._LH_XML_NOTAS = null;
  const n = F.sugerir(false); const D = F.get().dados, Og = F.get().origem;
  ex('faturamento = receita líquida; compras = CMV', D.fat === 1200000 && D.compras === 660000);
  ex('ocupação = aluguel + energia + condomínio = 40.000; administrativo = 20.000; pessoal = 180.000; pró-labore = 60.000', D.ocup === 40000 && D.adm === 20000 && D.pessoal === 180000 && D.prolab === 60000, JSON.stringify([D.ocup, D.adm, D.pessoal, D.prolab]));
  ex('marketing = 24.000 ÷ 1.200.000 = 2%; receita financeira = 3.000', D.despMkt === 2 && D.recFin === 3000);
  ex('estoque em dias = 55.000 ÷ 660.000 × 360 = 30', D.estoque === 30, String(D.estoque));
  ex('prazos: receber = 100.000 ÷ 1.200.000 × 360 = 30 dias; pagar = 36.667 ÷ 660.000 × 360 = 20 dias', D.pRec === 30 && D.pPag === 20, JSON.stringify([D.pRec, D.pPag]));
  ex('caixa inicial = 50.000; amortização = CP 24.000 + LP 100.000 ÷ 5 = 44.000', D.caixa0 === 50000 && D.amort === 44000, JSON.stringify([D.caixa0, D.amort]));
  ex('tudo com selo "Central · ECD"', ['ocup', 'adm', 'estoque', 'amort', 'caixa0', 'pRec'].every((k) => Og[k].tipo === 'central' && /ECD/.test(Og[k].detalhe)));
  w.abrirPagina('fin_dados');
  ex('a tabela de documentos lista a ECD como fonte de ocupação, estoque, prazos, caixa e amortização', /ECD/.test(d.getElementById('fin_dados_docs').textContent) && /estoque em dias/.test(d.getElementById('fin_dados_docs').textContent) && /amortização/.test(d.getElementById('fin_dados_docs').textContent));
  ex('a lista do "só manual" encolheu para 12 (crescimento, inflação, cartão, operação, IPI/IS, repasses, sazonalidade, à vista, inadimplência, CAPEX, % distribuído, ressarcimento)', (d.getElementById('fin_dados_docs').textContent.match(/Só manuais[^:]*:([^.]*)/) || ['', ''])[1].split('·').length === 12);   /* v903: 12 */
  ex('com a ECD lida, o DRE e o Fluxo rodam sem nenhum campo digitado', F.dre().length === 8 && F.fluxo()[7].saldo !== undefined && F.dre()[0].fixos === 300000);

  /* Balancete: por nome, como % da receita do balancete × faturamento */
  w.localStorage.removeItem('LH_FIN::' + F.eid()); w.LH_IMPORT_ECD = null;
  F.set({ fat: 2400000 }, O);
  w.LH_IMPORT_BALANCETE = { ok: true, receita: 200000, cred: 10000, itens: [{ nome: 'ALUGUEL DE IMOVEIS', valor: 5000 }, { nome: 'ENERGIA ELETRICA', valor: 1500 }, { nome: 'SALARIOS E ORDENADOS', valor: 30000 }, { nome: 'HONORARIOS CONTABEIS', valor: 1200 }, { nome: 'PROPAGANDA', valor: 4000 }] };
  F.sugerir(false); const B = F.get().dados;
  ex('balancete mensal de 200 mil: ocupação 6.500/200.000 × 2,4 mi = 78.000; adm 14.400; pessoal 360.000; marketing 2%', B.ocup === 78000 && B.adm === 14400 && B.pessoal === 360000 && B.despMkt === 2, JSON.stringify([B.ocup, B.adm, B.pessoal, B.despMkt]));
  ex('e o faturamento digitado continua 2.400.000', B.fat === 2400000);

  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado'); process.exit(falhou ? 1 : 0);
}, 9000);
