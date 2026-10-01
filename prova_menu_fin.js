/* PROVA v898 — quarto degrau da escada: "Especialista · Inteligência Estratégica" (plano especialista) antes do Painel do
   Escritório, com a Inteligência Financeira logo depois do Painel; os outros três degraus intactos.
   Uso: npm i --no-save jsdom && node prova_menu_fin.js */
const { JSDOM, VirtualConsole } = require('jsdom'); const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
let falhou = 0; const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(82, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const w = new JSDOM(APP, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://lionheartintelligence.com.br/app.html', virtualConsole: new VirtualConsole() }).window;
w.fetch = () => new Promise(() => {}); w.HTMLElement.prototype.scrollIntoView = function () {}; w.scrollTo = function () {};
setTimeout(() => {
  const d = w.document; const sec = d.querySelector('.nav-section');
  const kids = [...sec.children].map((c) => ({ el: c, cls: String(c.className || ''), txt: (c.textContent || '').replace(/\s+/g, ' ').trim() }));
  const seps = kids.filter((k) => /nav-secao-js/.test(k.cls) && k.el.getAttribute('data-lh-plano'));
  ex('a escada tem 4 degraus com plano (Adequação, Consultoria, Especialista, Especialista · Inteligência Estratégica)', seps.length === 4, seps.map((k) => k.txt.slice(0, 40)).join(' | '));
  const intel = seps.find((k) => /Intelig[êe]ncia Estrat/i.test(k.txt));
  ex('o quarto degrau existe e é do plano especialista', !!intel && intel.el.getAttribute('data-lh-plano') === 'especialista');
  const idx = (re) => kids.findIndex((k) => re.test(k.txt) && /nav-cat-wrap|nav-secao-js/.test(k.cls));
  const iInd = idx(/^IND[ÚU]STRIA/i), iIntel = kids.indexOf(intel), iPainel = idx(/Painel do Escrit/i), iFin = idx(/INTELIG[ÊE]NCIA FINANCEIRA/i), iBpo = idx(/Gest[ãa]o BPO/i), iEspec = kids.findIndex((k) => /nav-secao-js/.test(k.cls) && /^Especialista$/i.test(k.txt));
  ex('ordem: Indústria → degrau Inteligência Estratégica → Painel do Escritório → Inteligência Financeira → Gestão BPO', iInd < iIntel && iIntel < iPainel && iPainel < iFin && iFin < iBpo && iFin === iPainel + 1, [iInd, iIntel, iPainel, iFin, iBpo].join(','));
  ex('o degrau "Especialista" (setores) continua antes de Serviços · Comércio · Turismo e antes do novo', iEspec >= 0 && iEspec < idx(/Servi[çc]os · Com[ée]rcio/i) && iEspec < iIntel);
  ex('a Inteligência Financeira tem as 4 abas', ['fin_dados', 'fin_cred', 'fin_dre', 'fin_fluxo'].every((id) => !!kids[iFin].el.querySelector('[onclick*="abrirPagina(\'' + id + '\'"]')));
  ex('nenhuma supercategoria antiga sobrou (Centrais de Análises, Seu Escritório)', !kids.some((k) => /nav-secao-js/.test(k.cls) && /Centrais de An|Seu Escrit/i.test(k.txt)));
  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado'); process.exit(falhou ? 1 : 0);
}, 9000);
