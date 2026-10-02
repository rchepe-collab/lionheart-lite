/* PROVA v906 — ECD solta na Central de Documentos (Porteiro) passa a ser lida e aplicada; botões "Central de Documentos"
   dos Dados Estratégicos e do Identificador abrem a página certa (importsped — 'importxml' não existe).
   Uso: npm i --no-save jsdom && node prova_central_ecd.js */
const { JSDOM, VirtualConsole } = require('jsdom'); const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
let falhou = 0; const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(86, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const w = new JSDOM(APP, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://lionheartintelligence.com.br/app.html', virtualConsole: new VirtualConsole() }).window;
w.fetch = () => new Promise(() => {}); w.HTMLElement.prototype.scrollIntoView = function () {}; w.scrollTo = function () {}; w.alert = () => {};
setTimeout(() => {
  const d = w.document;
  ex('nenhum botão aponta para a página inexistente "importxml"', !APP.includes("abrirPagina('importxml')") && !!d.getElementById('page-importsped'));
  ex('o Porteiro tem ramo para grupos.ECD (parseECD → LH_IMPORT_ECD → LH_aplicarECDNasCalcs)', /if\(grupos\.ECD\)\{[^]*?parseECD\(l\.texto\)[^]*?LH_IMPORT_ECD=_e[^]*?LH_aplicarECDNasCalcs/.test(APP));
  const J100 = (g, de, v) => '|J100|x|T|1|x|' + g + '|' + de + '|0|D|' + v.toFixed(2).replace('.', ',') + '|D|', J150 = (de, v) => '|J150|x|T|1|x|x|' + de + '|0|D|' + v.toFixed(2).replace('.', ',') + '|D|';
  const ECD = ['|0000|LECD|01012025|31122025|EMPRESA TESTE LTDA|11111111000191|RS|', J100('A', 'CAIXA E EQUIVALENTES', 50000), J100('P', 'PATRIMONIO LIQUIDO', 600000), J150('RECEITA LIQUIDA', 1200000), J150('CUSTO DAS MERCADORIAS VENDIDAS', 660000), J150('DESPESAS COM PESSOAL', 180000), J150('LUCRO LIQUIDO DO EXERCICIO', 150000)].join('\n');
  const e = w.parseECD(ECD);
  ex('a ECD sintética é reconhecida pelo detector do Porteiro como ECD', /\|LECD\|/.test(ECD) && e.ok && e.receitaLiquida === 1200000);
  w.LH_IMPORT_ECD = e; const n = w.LH_aplicarECDNasCalcs ? w.LH_aplicarECDNasCalcs(e) : 0;
  ex('aplicar a ECD preenche campos de calculadoras (19 com esta ECD mínima)', n >= 10, String(n));
  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado'); process.exit(falhou ? 1 : 0);
}, 9000);
