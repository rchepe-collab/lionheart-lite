/* PROVA v900 — Relatório PDF ganha DRE 2026–2033 e Fluxo de Caixa (modo completo), lendo o motor da Inteligência Financeira.
   Uso: npm i --no-save jsdom && node prova_fin_pdf.js */
const { JSDOM, VirtualConsole } = require('jsdom'); const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
let falhou = 0; const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(86, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const w = new JSDOM(APP, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://lionheartintelligence.com.br/app.html', virtualConsole: new VirtualConsole() }).window;
w.fetch = () => new Promise(() => {}); w.HTMLElement.prototype.scrollIntoView = function () {}; w.scrollTo = function () {}; w.alert = () => {};
setTimeout(() => {
  const d = w.document, F = w.LH_FIN; const O = { tipo: 'digitado', detalhe: 'prova', quando: '2026-10-01' };
  const paleta = (w.PDF_PALETAS && w.PDF_PALETAS.dourado) || { primaria: '#c9a227', textoEscuro: '#111' };
  const config = { escritorio: 'Escritório Teste', contador: 'Joana', crc: 'CRC/RS 1', contato: 'x@y', cor: 'dourado', logoData: null };
  w.localStorage.removeItem('LH_FIN::' + F.eid());
  ex('sem Dados, as páginas financeiras não entram no PDF', w.pdfFinDisponivel() === false && w.buildPaginasFin(config, paleta, 5).paginas === 0);
  F.set({ fat: 1200000, cresc: 3, infl: 4, regime: 'presumido', tipo: 'comercio', icms: 18, compras: 660000, desp: 8, cartao: 2, pessoal: 150000, prolab: 48000, ocup: 30000, adm: 12000, pRec: 30, pPag: 20, vista: 40, inad: 2, caixa0: 50000, ressarc: 60, estoque: 20, capex: 30000, amort: 12000, distrib: 50 }, O);
  const r = w.buildPaginasFin(config, paleta, 5);
  ex('com Dados, entram 2 páginas (DRE + Fluxo)', r.paginas === 2 && (r.html.match(/class="pdf-page"/g) || []).length === 2);
  const box = d.createElement('div'); box.innerHTML = r.html; const pags = box.querySelectorAll('.pdf-page');
  ex('página DRE: título, 9 colunas (conta + 8 anos), linhas de receita, imposto, margem e lucro, bloco "De onde veio"', /DRE Projetado 2026–2033/.test(pags[0].textContent) && pags[0].querySelectorAll('thead th').length === 9 && /Receita bruta/.test(pags[0].textContent) && /Lucro líquido/.test(pags[0].textContent) && /De onde veio/.test(pags[0].textContent));
  const D = F.dre();
  ex('os números do PDF são os do motor (lucro 2033 e receita 2026 batem)', pags[0].textContent.indexOf('R$ ' + Math.round(D[7].lucro).toLocaleString('pt-BR')) >= 0 && pags[0].textContent.indexOf('R$ ' + Math.round(D[0].receita).toLocaleString('pt-BR')) >= 0);
  ex('página Fluxo: título, KPIs (pior saldo, capital de giro), barras, linhas de CAPEX, amortização e distribuição, Premissas', /Fluxo de Caixa Projetado/.test(pags[1].textContent) && /Pior saldo/.test(pags[1].textContent) && /Investimentos \(CAPEX\)/.test(pags[1].textContent) && /Amortização/.test(pags[1].textContent) && /Distribuição aos sócios/.test(pags[1].textContent) && /Premissas/.test(pags[1].textContent));
  ex('rodapé com a numeração passada (5 e 6)', /5/.test([...pags[0].children].pop().textContent) && /6/.test([...pags[1].children].pop().textContent), [...pags[0].children].pop().textContent.slice(0, 80));
  ex('o nome do escritório aparece nas páginas (cabeçalho do relatório)', /Escritório Teste/.test(pags[0].textContent) || /Escritório Teste/.test(pags[0].innerHTML));
  ex('gerarPDF não bloqueia mais só por falta de calculadoras quando há DRE', /temFin/.test(String(w.gerarPDF)) && /nCalcs < 2 && !temFin/.test(String(w.gerarPDF)));
  ex('o modo completo encadeia as páginas financeiras antes das Premissas', /buildPaginasFin\(config, paleta/.test(String(w.gerarPDF)) && /buildPaginaPremissas\(config, paleta, \(scoreData \? 6 : 5\) \+ _fin\.paginas\)/.test(String(w.gerarPDF)));
  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado'); process.exit(falhou ? 1 : 0);
}, 9000);
