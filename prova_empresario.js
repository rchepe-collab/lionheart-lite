/* PROVA v916 — ITFE (empresario.html), a ferramenta do empresário gerada do app.html.
   1. o empresario.html está em dia com a receita (ninguém editou à mão, ninguém esqueceu de gerar);
   2. menu do empresário: pilares e abas da lista fechada em 04/10/2026, nada de contador/advogado;
   3. segmento filtra o menu; tranca nas análises de fora;
   4. MESMA COZINHA: alíquota da transição e fatia do DAS dão o mesmo número no CORE e no ITFE.
   Uso: npm i --no-save jsdom && node prova_empresario.js */
const { JSDOM, VirtualConsole } = require('jsdom'); const fs = require('fs'), path = require('path');
const { gerar } = require('./ferramentas/gerar_empresario.js');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
const EMP = fs.readFileSync(path.join(__dirname, 'empresario.html'), 'utf8');
let falhou = 0; const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(82, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const abre = (html, url) => { const w = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url, virtualConsole: new VirtualConsole() }).window;
  w.fetch = () => new Promise(() => {}); w.HTMLElement.prototype.scrollIntoView = function () {}; w.scrollTo = function () {}; return w; };
const visivel = (w, el) => { for (let e = el; e && e !== w.document.body; e = e.parentElement) { if (e.id === 'pcp-oculto' || w.getComputedStyle(e).display === 'none') return false; } return true; };
const idDo = (el) => ((el.getAttribute('onclick') || '').match(/abrirPagina\(\s*['"]([\w-]+)['"]/) || [])[1];

console.log('--- PROVA: ITFE · ferramenta do empresário ---');
ex('empresario.html é exatamente o que a receita gera do app.html', EMP === gerar(APP));
ex('arquivo carimbado como GERADO', /ARQUIVO GERADO por ferramentas\/gerar_empresario\.js/.test(EMP.slice(0, 3000)));

const E = abre(EMP, 'https://lionheartintelligence.com.br/empresario.html');
const C = abre(APP, 'https://lionheartintelligence.com.br/app.html');

setTimeout(() => {
  const d = E.document, nav = d.querySelector('nav.nav-section');
  ex('produto empresario ligado pelo arquivo (sem parâmetro na URL)', nav.getAttribute('data-lh-produto') === 'empresario');
  const titulos = [...nav.querySelectorAll('.nav-group-title')].filter((t) => visivel(E, t)).map((t) => t.textContent.replace(/[▼▶]/g, '').trim());
  console.log('  pilares: ' + titulos.join(' · '));
  ex('pilares do empresário na ordem', titulos.slice(0, 8).join('|') === 'APRENDIZADO|MINHA EMPRESA|CADASTRO & CRÉDITO|REGIME|PREÇO|CAIXA|SÓCIO|FINANCEIRO' && /^SEU SEGMENTO/.test(titulos[8]) && titulos[9] === 'SUA CONTA', titulos.join('|'));
  const ids = () => [...nav.querySelectorAll('.nav-item')].filter((e) => visivel(E, e)).map(idDo).filter(Boolean);
  const comuns = ['videos', 'importsped', 'auditorcad', 'classmassa', 'cadeia', 'dxh', 'c05', 'formpreco', 'c02', 'c04', 'calc03', 'c01', 'n33', 'c08', 'c06', 'fin_dados', 'fin_cred', 'fin_dre', 'fin_fluxo'];
  ex('todas as abas comuns da lista estão no menu', comuns.every((i) => ids().includes(i)), comuns.filter((i) => !ids().includes(i)).join(','));
  ex('Cadastrar minha empresa presente', [...nav.querySelectorAll('.nav-item')].some((e) => visivel(E, e) && /perguntarTipoCadastro/.test(e.getAttribute('onclick') || '')));
  const fora = ['n15', 'n16', 'sucessorio', 'transacao', 'prescricao', 'decisor', 'cr01', 'cr04', 'monofasico', 'ins', 'ind03', 'ind04', 'ind05', 'agro04', 'agro07', 'empresas', 'proposta', 'motor360', 'c10', 'radar', 'jornada', 'tour', 'basetecnica', 'glossario', 'conhecimento', 'perguntas'];
  ex('nada de advogado, recuperação de crédito ou escritório no menu', fora.every((i) => !ids().includes(i)), fora.filter((i) => ids().includes(i)).join(','));
  ex('nenhuma menção a Fecomércio no menu', !/fecom[eé]rcio/i.test(nav.textContent.replace(d.getElementById('pcp-oculto').textContent, '')));
  const wraps = [...nav.querySelectorAll('.nav-cat-wrap')].filter((w) => { const t = w.querySelector('.nav-group-title'); return t && t.getAttribute('data-pcp') && visivel(E, t); });
  ex('ITFE abre com os pilares recolhidos (' + wraps.length + ')', wraps.length >= 9 && wraps.every((w) => w.classList.contains('lh-collapsed')), wraps.filter((w) => !w.classList.contains('lh-collapsed')).map((w) => w.textContent.trim().slice(0, 20)).join('|'));
  ex('abre nas Boas-Vindas do ITFE', d.getElementById('page-pcp-bemvindo').classList.contains('active') && /INTELIGÊNCIA TRIBUTÁRIA E FINANCEIRA EMPRESARIAL/.test(d.getElementById('page-pcp-bemvindo').textContent));
  ex('Boas-Vindas pergunta o segmento (4 botões)', d.querySelectorAll('#pcp-segmentos button[data-seg]').length === 4);
  ex('tela de acesso diz ITFE, não CORE', /ITFE · Inteligência Tributária e Financeira Empresarial · Acesso/.test(d.getElementById('lh-login-produto').textContent));
  ex('título do arquivo é o do ITFE', /ITFE/.test(EMP.match(/<title>[^<]*<\/title>/)[0]));

  /* v920 · segmento + sub-ramo (Farsul, Fiergs, Fecomércio) */
  const segIds = {
    comercio: ['classif', 'raiox360', 'simnotas', 'antecip', 'medicamento', 'combustivel', 'difal', 'import'],
    servicos: ['fatorR', 'art127', 'bares', 'hotel', 'hotelev', 'agviagem', 'transpax', 'logcarga', 'antecip'],
    industria: ['ind01', 'ind06', 'ind08', 'ind11', 'ind09', 'ind02', 'export', 'capex', 'ind07', 'seletivo'],
    agro: ['agro03', 'agroSuper1', 'agro14sent', 'agroSuper4', 'agro01', 'agro08', 'agro12', 'agro06', 'agroSuper5'] };   /* v923: agro09 e agro02 fora até validar o crédito presumido */
  const todosSeg = [...new Set([].concat(...Object.values(segIds)))];
  ex('sem segmento escolhido, mostra todas as do segmento', todosSeg.every((i) => ids().includes(i)), todosSeg.filter((i) => !ids().includes(i)).join(','));
  for (const k of Object.keys(segIds)) {
    E.LH_EMP_SEGMENTO(k);
    const v = ids(); const outros = todosSeg.filter((i) => !segIds[k].includes(i));
    ex('segmento ' + k + ' (sem sub-ramo): as ' + segIds[k].length + ' do segmento, nenhuma de outro', segIds[k].every((i) => v.includes(i)) && outros.every((i) => !v.includes(i)), outros.filter((i) => v.includes(i)).join(',') + ' / falta ' + segIds[k].filter((i) => !v.includes(i)).join(','));
  }
  const SUB = [
    ['agro', 'coop', ['agro12', 'agro01', 'agro08'], ['agro06']],
    ['agro', 'graos', ['agro06', 'agroSuper5', 'agro01'], ['agro12']],
    ['industria', 'incentivo', ['ind09', 'ind02', 'ind01'], ['export', 'capex', 'seletivo']],
    ['industria', 'exporta', ['export', 'ind01'], ['ind09', 'capex']],
    ['comercio', 'farmacia', ['medicamento', 'classif'], ['combustivel', 'difal', 'import']],
    ['comercio', 'posto', ['combustivel'], ['medicamento']],
    ['servicos', 'turismo', ['hotel', 'hotelev', 'agviagem', 'antecip'], ['bares', 'fatorR', 'logcarga']],
    ['servicos', 'liberal', ['fatorR', 'art127'], ['hotel', 'bares']] ];
  E.LH_EMP_SEGMENTO('agro'); E.LH_EMP_SUBRAMO('');
  ex('v923: Crédito Presumido do Produtor e Barter fora do menu do ITFE', !ids().includes('agro09') && !ids().includes('agro02'));
  for (const [sg, sb, tem, nao] of SUB) {
    E.LH_EMP_SEGMENTO(sg); E.LH_EMP_SUBRAMO(sb);
    const v = ids();
    ex('sub-ramo ' + sg + ' · ' + sb + ': mostra as certas e esconde as outras', tem.every((i) => v.includes(i)) && nao.every((i) => !v.includes(i)), 'falta ' + tem.filter((i) => !v.includes(i)).join(',') + ' / sobra ' + nao.filter((i) => v.includes(i)).join(','));
  }
  ex('Boas-Vindas mostra os sub-ramos do segmento escolhido', d.querySelectorAll('#pcp-subramos button[data-sub]').length === 6 && /Profissional liberal/.test(d.getElementById('pcp-subramos').textContent));
  ex('trocar de segmento limpa o sub-ramo', (() => { E.LH_EMP_SEGMENTO('agro'); return !d.querySelector('#pcp-subramos button.on'); })());
  E.LH_EMP_SEGMENTO('agro'); E.LH_EMP_SUBRAMO('leite');
  ex('título do pilar diz segmento e sub-ramo', /SEU SEGMENTO · AGRO · LEITE/.test(d.getElementById('pcp-seg-titulo').textContent), d.getElementById('pcp-seg-titulo').textContent);
  ex('com segmento e sub-ramo, o empresário vê até 32 abas', (() => { const n = ids().length; return n >= 24 && n <= 32; })(), String(ids().length));

  ex('seletor de tema no topo (4 temas)', d.querySelectorAll('#pcp-temas button[data-tema]').length === 4);
  E.LH_EMP_TEMA('musgo'); ex('tema verde musgo aplica no ITFE', d.documentElement.getAttribute('data-pcp-tema') === 'musgo' && d.querySelector('#pcp-temas button.on').getAttribute('data-tema') === 'musgo');
  E.LH_EMP_TEMA('marinho'); E.LH_EMP_TEMA('violeta'); E.LH_EMP_TEMA('onyx');
  ex('volta ao Onyx', d.documentElement.getAttribute('data-pcp-tema') === 'onyx');
  ex('o CORE não ganha seletor de tema', !C.document.getElementById('pcp-temas') && !C.document.documentElement.getAttribute('data-pcp-tema'));
  E.abrirPagina('c05'); ex('Regime Ótimo abre no ITFE', d.getElementById('page-c05').classList.contains('active'));
  E.abrirPagina('formpreco'); ex('Formação de Preço abre a página da Precificação', d.getElementById('page-precmassa').classList.contains('active'));
  E.abrirPagina('n15'); ex('Holding (advogado) fica trancada e volta às Boas-Vindas', !d.getElementById('page-n15').classList.contains('active') && d.getElementById('page-pcp-bemvindo').classList.contains('active'));
  E.abrirPagina('cr04'); ex('Créditos Plenos (contador) fica trancada', !d.getElementById('page-cr04').classList.contains('active'));
  const vis = [...nav.querySelectorAll('.nav-item')].filter((e) => visivel(E, e));
  ex('toda aba visível tem ícone', vis.every((e) => { const g = e.querySelector('.pcp-ic svg'); return g && g.children.length; }), vis.filter((e) => !e.querySelector('.pcp-ic svg')).map((e) => e.textContent.trim()).join('|'));

  console.log('--- mesma cozinha: CORE × ITFE ---');
  const anos = [2026, 2027, 2029, 2033];
  const aliqE = anos.map((a) => JSON.stringify(E.getAliq ? E.getAliq(a) : null)), aliqC = anos.map((a) => JSON.stringify(C.getAliq ? C.getAliq(a) : null));
  ex('curva da transição (getAliq) idêntica nos dois', aliqE.join() === aliqC.join() && aliqE[0] !== 'null', aliqE[3]);
  const fE = JSON.stringify(E.LH_fatiaDAS && E.LH_fatiaDAS('I', 1200000, 2033)), fC = JSON.stringify(C.LH_fatiaDAS && C.LH_fatiaDAS('I', 1200000, 2033));
  ex('fatia do DAS (Anexo I, 2033) idêntica nos dois', fE === fC && fE !== 'null', fE);
  ex('CORE sem produto continua igual', !C.document.querySelector('nav.nav-section').getAttribute('data-lh-produto') && !C.LH_PRODUTO);
  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado'); process.exit(falhou ? 1 : 0);
}, 16000);
