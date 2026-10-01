/* PROVA v891 — a Cadeia de Crédito mora em Cadastro & Preço (decisão), não em Crédito Tributário (recuperação)
   Uso: npm i --no-save jsdom && node prova_menu_cadeia.js */
const { JSDOM, VirtualConsole } = require('jsdom'); const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
let falhou = 0; const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(82, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const w = new JSDOM(APP, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://lionheartintelligence.com.br/app.html', virtualConsole: new VirtualConsole() }).window;
w.fetch = () => new Promise(() => {}); w.HTMLElement.prototype.scrollIntoView = function () {}; w.scrollTo = function () {};
setTimeout(() => {
  const d = w.document;
  const items = [...d.querySelectorAll('.nav-item[onclick]')];
  const ids = items.map((e) => (e.getAttribute('onclick').match(/abrirPagina\('([^']+)'/) || [])[1]);
  const seq = [...d.querySelectorAll('.nav-group-title, .nav-item[onclick]')];
  const grupo = (id) => { const el = items[ids.indexOf(id)]; let i = seq.indexOf(el); while (i > 0) { i--; if (seq[i].classList.contains('nav-group-title')) return seq[i].textContent.trim(); } return ''; };
  ex('a Cadeia aparece uma vez só no menu', ids.filter((x) => x === 'cadeia').length === 1, String(ids.filter((x) => x === 'cadeia').length));
  ex('e é a PRIMEIRA aba de Cadastro & Preço (antes da Matriz e da Formação de Preço)', ids.indexOf('cadeia') < ids.indexOf('formpreco') && ids.indexOf('cadeia') < ids.indexOf('matrizdoc') && grupo('cadeia') === grupo('formpreco'), ids.indexOf('cadeia') + ' / ' + ids.indexOf('formpreco'));
  ex('no grupo de Cadastro & Preço, não em Crédito Tributário', /CADASTRO|Cadastro/i.test(grupo('cadeia')) && grupo('cadeia') === grupo('classmassa'), grupo('cadeia'));
  ex('Créditos Plenos continua em Crédito Tributário', /Crédito Tributário/i.test(grupo('cr04')), grupo('cr04'));
  try { w.abrirPagina('cadeia'); ex('abrir a Cadeia pelo menu continua funcionando', d.getElementById('page-cadeia').classList.contains('active')); } catch (e) { ex('abrir a Cadeia pelo menu continua funcionando', false, e.message); }
  ex('a busca encontra a Cadeia pela pergunta', (w.BUSCA_INDEX || []).some((x) => x.id === 'cadeia' && /compro/.test(x.nome)));
  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado'); process.exit(falhou ? 1 : 0);
}, 9000);
