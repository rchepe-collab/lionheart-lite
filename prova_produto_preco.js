/* PROVA v911/v912 — produto "Inteligência de Cadastro e Preços" (app.html?produto=preco)
   O menu mostra só os pilares do produto, o resto do CORE fica escondido e trancado,
   e SEM o parâmetro o CORE continua idêntico.
   Uso: npm i --no-save jsdom && node prova_produto_preco.js */
const { JSDOM, VirtualConsole } = require('jsdom'); const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
let falhou = 0; const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(82, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const abre = (url) => { const w = new JSDOM(APP, { runScripts: 'dangerously', pretendToBeVisual: true, url, virtualConsole: new VirtualConsole() }).window;
  w.fetch = () => new Promise(() => {}); w.HTMLElement.prototype.scrollIntoView = function () {}; w.scrollTo = function () {}; return w; };
const visivel = (w, el) => { for (let e = el; e && e !== w.document.body; e = e.parentElement) { if (e.id === 'pcp-oculto' || w.getComputedStyle(e).display === 'none') return false; } return true; };
const idDo = (el) => ((el.getAttribute('onclick') || '').match(/abrirPagina\(\s*['"]([\w-]+)['"]/) || [])[1];

const P = abre('https://lionheartintelligence.com.br/app.html?produto=preco');
const C = abre('https://lionheartintelligence.com.br/app.html');

setTimeout(() => {
  const d = P.document;
  console.log('--- PROVA: produto Inteligência de Cadastro e Preços ---');
  const nav = d.querySelector('nav.nav-section');
  ex('o modo produto foi ligado pelo parâmetro', nav && nav.getAttribute('data-lh-produto') === 'preco');
  const titulos = [...nav.querySelectorAll('.nav-group-title')].filter((t) => visivel(P, t)).map((t) => t.textContent.replace(/[▼▶]/g, '').trim());
  console.log('  pilares visíveis: ' + titulos.join(' · '));
  ex('pilares na ordem do fluxo', JSON.stringify(titulos) === JSON.stringify(['APRENDIZADO', 'CLIENTES & DOCUMENTOS', 'CADASTRO & NOTA', 'IDENTIFICADOR DE CRÉDITO', 'PREÇOS', 'SUA CONTA']), titulos.join('|'));
  const vis = [...nav.querySelectorAll('.nav-item')].filter((e) => visivel(P, e));
  const ids = vis.map(idDo).filter(Boolean);
  console.log('  abas visíveis: ' + vis.length);
  const grupoDe = (id) => { const seq = [...nav.querySelectorAll('.nav-group-title, .nav-item')].filter((e) => visivel(P, e)); let i = seq.findIndex((e) => idDo(e) === id); while (i > 0) { i--; if (seq[i].classList.contains('nav-group-title')) return seq[i].textContent.replace(/[▼▶]/g, '').trim(); } return ''; };
  ex('Cadeia de Crédito embaixo de Identificador de Crédito', grupoDe('cadeia') === 'IDENTIFICADOR DE CRÉDITO', grupoDe('cadeia'));
  ex('Identificador de Crédito é pilar, não aba: só a Cadeia embaixo dele', ids.filter((i) => grupoDe(i) === 'IDENTIFICADOR DE CRÉDITO').join() === 'cadeia', ids.filter((i) => grupoDe(i) === 'IDENTIFICADOR DE CRÉDITO').join());
  ex('Inteligência Financeira (Dados, Identificador, DRE, Fluxo) fora do produto', ['fin_dados', 'fin_cred', 'fin_dre', 'fin_fluxo'].every((i) => !ids.includes(i)));
  ex('Formação, Precificação em Massa e Contrato embaixo de Preços', ['formpreco', 'precmassa', 'contrato'].every((i) => grupoDe(i) === 'PREÇOS'));
  ex('Auditor, Classificador e Simulador embaixo de Cadastro & Nota', ['auditorcad', 'classmassa', 'simnotas'].every((i) => grupoDe(i) === 'CADASTRO & NOTA'));
  ex('Cadastrar Cliente presente (abre pelo formulário próprio)', vis.some((e) => /perguntarTipoCadastro/.test(e.getAttribute('onclick') || '')));
  const fora = ['c05', 'dxh', 'c01', 'c02', 'radar', 'jornada', 'proposta', 'cr04', 'agro01', 'ind01', 'transacao', 'fin_dre', 'fin_fluxo', 'c10', 'tour', 'conhecimento', 'perguntas', 'bemvindo'];
  ex('nada do resto do CORE aparece no menu', fora.every((i) => !ids.includes(i)), fora.filter((i) => ids.includes(i)).join(','));
  ex('cada aba aparece uma vez só', new Set(ids).size === ids.length);
  ex('as supercategorias de plano do CORE não aparecem', [...nav.querySelectorAll('.nav-secao-js,.nav-super-js')].every((e) => !visivel(P, e)));
  ex('os itens originais foram guardados, não apagados', !!d.querySelector('#pcp-oculto .nav-item'));
  ex('abre nas Boas-Vindas do produto (como o CORE)', d.getElementById('page-pcp-bemvindo') && d.getElementById('page-pcp-bemvindo').classList.contains('active') && !d.getElementById('page-home').classList.contains('active'));
  ex('Boas-Vindas com o nome do produto, sem CORE', /INTELIGÊNCIA DE CADASTRO E PREÇOS/.test(d.getElementById('page-pcp-bemvindo').textContent) && !/CORE/.test(d.getElementById('page-pcp-bemvindo').textContent));
  const bvLinks = [...d.querySelectorAll('#page-pcp-bemvindo [onclick]')].map(idDo);
  ex('atalhos das Boas-Vindas abrem telas do produto', bvLinks.length >= 4 && bvLinks.every((i) => d.getElementById('page-' + i)), bvLinks.join(','));
  const topo = [...nav.querySelectorAll('.nav-item')].filter((e) => visivel(P, e)).slice(0, 2).map((e) => e.textContent.trim());
  ex('menu começa por Boas-Vindas e Como funciona', topo[0] === 'Boas-Vindas' && topo[1] === 'Como funciona', topo.join('|'));
  ex('tela de acesso diz o produto, não CORE', /Inteligência de Cadastro e Preços · Acesso/.test((d.getElementById('lh-login-produto') || {}).textContent || ''));
  const rods = [...d.querySelectorAll('main div')].filter((e) => /também está em texto no/.test(e.textContent) && e.querySelectorAll('strong').length === 2 && !e.closest('.page'));
  ex('rodapé que aponta o Guia do Consultor escondido', rods.length > 0 && rods.every((e) => !visivel(P, e)), String(rods.length));
  ex('aba do navegador com o nome do produto', /Inteligência de Cadastro e Preços/.test(d.title));
  ex('página inicial com os 4 passos e as 2 entregas', d.querySelectorAll('#page-pcp-home .pcp-passo').length === 4 && d.querySelectorAll('#page-pcp-home .pcp-entregas > div').length === 2);
  const linksIni = [...d.querySelectorAll('#page-pcp-home a[onclick]')].map(idDo);
  ex('todo link da página inicial abre tela real do produto', linksIni.length > 0 && linksIni.every((i) => d.getElementById('page-' + i) && P.LH_PRODUTO.pilares.some((p) => p.itens.some((x) => x[0] === i))), linksIni.filter((i) => !d.getElementById('page-' + i)).join(','));
  const semPag = ids.filter((i) => !d.getElementById('page-' + i));
  ex('toda aba do menu tem página', semPag.length === 0, semPag.join(','));
  P.abrirPagina('precmassa'); ex('aba do produto abre (Precificação em Massa)', d.getElementById('page-precmassa').classList.contains('active'));
  P.abrirPagina('cadeia'); ex('aba do produto abre (Cadeia de Crédito)', d.getElementById('page-cadeia').classList.contains('active'));
  P.abrirPagina('c05');
  ex('análise de fora fica trancada (Regime Ótimo não abre)', !d.getElementById('page-c05').classList.contains('active'));
  ex('e volta às Boas-Vindas com aviso', d.getElementById('page-pcp-bemvindo').classList.contains('active') && /não está neste produto/.test((d.getElementById('pcp-aviso') || {}).textContent || ''));
  P.LH_EMP_CNPJ = '11222333000144';
  P._LH_XML_NOTAS = [{ destCNPJ: '11222333000144', emitCNPJ: '99000000000191', emitCRT: '3', vProd: 60000 }, { destCNPJ: '11222333000144', emitCNPJ: '88000000000191', emitCRT: '1', vProd: 30000 }, { destCNPJ: '11222333000144', emitCNPJ: '', emitCPF: '12345678909', vProd: 10000 }];
  P.LH_IMPORT_CRT = { ok: true, pReg: 60, pSN: 30, nForn: 3 };
  try { P.lhC05AplicarCRT(); } catch (e) {}
  const e1 = P.LH_CADEIA.get().entrada;
  ex('Central → Regime Ótimo ESCONDIDO → Cadeia: o crédito chega mesmo sem a tela', e1.regular === 60 && e1.simples === 30 && !d.getElementById('page-c05').classList.contains('active'), JSON.stringify(e1));
  P.LH_CADEIA.lerDocumentos(true); const e2 = P.LH_CADEIA.get().entrada;
  ex('Cadeia lê as notas direto da Central (inclui compra de PF)', e2.regular === 60 && e2.simples === 30 && e2.pf === 10, JSON.stringify(e2));
  ex('e espelha nos campos do Regime Ótimo e do Dentro × Híbrido', d.getElementById('c05_forn_simples').value == 30 && d.getElementById('dxh_forn_simples').value == 30);
  ex('a busca global só acha o que está no produto', (P.BUSCA_INDEX || []).length > 0 && !(P.BUSCA_INDEX || []).some((x) => ['c05', 'dxh', 'c01', 'agro01'].includes(x.id)) && (P.BUSCA_INDEX || []).some((x) => x.id === 'cadeia'));
  ex('selo do produto no topo', /Inteligência de Cadastro e Preços/.test((d.getElementById('pcp-chip') || {}).textContent || ''));
  ex('botão de dúvida do CORE escondido no produto', !visivel(P, d.getElementById('lh-fab-perg')));
  ex('selo de versão diz o produto, não CORE', /Inteligência de Cadastro e Preços/.test(d.getElementById('lh-selo-versao').parentNode.textContent));
  ex('tela de boas-vindas do CORE não cobre o produto', !visivel(P, d.getElementById('lhwc')));

  console.log('--- CORE sem o parâmetro continua igual ---');
  const dc = C.document, navc = dc.querySelector('nav.nav-section');
  ex('sem modo produto', !navc.getAttribute('data-lh-produto') && !dc.getElementById('pcp-oculto') && !C.LH_PRODUTO);
  const idsC = [...navc.querySelectorAll('.nav-item[onclick]')].map(idDo).filter(Boolean);
  ex('menu completo do CORE (Regime Ótimo, Agro, Contencioso)', ['c05', 'agro01', 'transacao', 'cadeia', 'precmassa'].every((i) => idsC.includes(i)));
  C.abrirPagina('c05'); ex('Regime Ótimo abre normalmente no CORE', dc.getElementById('page-c05').classList.contains('active'));
  ex('página inicial do CORE intacta', !!dc.getElementById('page-home') && !dc.getElementById('page-pcp-home') && !dc.getElementById('page-pcp-bemvindo'));
  ex('tela de acesso do CORE continua dizendo CORE', /CORE · Acesso/.test(dc.getElementById('lh-login-produto').textContent));
  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado'); process.exit(falhou ? 1 : 0);
}, 16000);
