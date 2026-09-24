/* ═══════════════════════════════════════════════════════════════════════════
   PROVA DO BACKUP · v854
   O que ela segura: baixar o backup e restaurá-lo devolve TUDO — as
   calculadoras e o resumo dos documentos da Central — e o arquivo não leva a
   sessão de acesso.

   Três defeitos que ela prende (achados com o backup real de 24/09):
   1. o recarregar da restauração disparava o beforeunload, que gravava a tela
      aberta (vazia) por cima da mesma calculadora que o backup trouxera;
   2. o autosave da Central (6 s) regravava o resumo só com o que estava na
      tela — com cliente sem CNPJ no cadastro, sobrava um campo e 16 sumiam;
   3. o arquivo levava o token de acesso.

   Dados 100% sintéticos. Roda contra a página e contra cópias sabotadas.
   Uso: npm i --no-save jsdom && node prova_backup.js
   ═══════════════════════════════════════════════════════════════════════════ */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
const CNPJ = '11222333000181';
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
let falhou = 0;
const ex = (nome, ok, det) => { console.log('  ' + (nome + ' ').padEnd(64, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (det ? ' — ' + det : ''))); if (!ok) falhou++; };

function abrir(html, pre) {
  return new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true,
    url: 'https://lionheartintelligence.com.br/app.html', virtualConsole: new VirtualConsole(),
    beforeParse(w) { for (const [k, v] of Object.entries(pre || {})) w.localStorage.setItem(k, v); } }).window;
}
function despejar(w) { const o = {}, ls = w.localStorage; for (let i = 0; i < ls.length; i++) { const k = ls.key(i); o[k] = ls.getItem(k); } return o; }
const val = (w, id, v) => { const e = w.document.getElementById(id); if (v !== undefined) e.value = v; return e && e.value; };

async function rodar(html) {
  const r = {};
  /* A · o usuário trabalha e baixa o backup */
  const a = abrir(html, {});
  await espera(8000);
  a.localStorage.setItem('lh_token', 'TOKEN-SINTETICO');
  a.abrirPagina('c05'); await espera(300);
  val(a, 'c05_fat', '1234567'); val(a, 'c05_seg', 'comercio_atacado'); val(a, 'c05_folha', '42000');
  a.LH_PERSIST.salvarPagina('c05');
  a.LH_CENTRAL_PROC = { cnpj: CNPJ, raiz: CNPJ.slice(0, 8) };
  a.localStorage.setItem('lh_cnpj_ativo', CNPJ);
  /* o resumo da Central guarda campos de OUTRA tela (a DxH, apurados dos documentos):
     é isso que o autosave da Regime Ótimo não pode apagar. É o retrato do backup real
     de 24/09 — 17 campos guardados, a tela aberta só tinha 1. */
  a.abrirPagina('dxh'); await espera(300);
  val(a, 'dxh_rbt12', '2740604'); val(a, 'dxh_fat', '292766'); val(a, 'dxh_anexo', 'I');
  a.LH_centralSalvar();
  a.abrirPagina('c05'); await espera(300);
  a.LH_centralSalvar();
  const central0 = JSON.parse(a.localStorage.getItem('lh_central_' + CNPJ) || '{}').campos || {};
  const bkp = JSON.stringify({ _app: 'Lionheart', _versao: 1, dados: a.lhBkpColeta() });
  a.close();
  r.semToken = !/TOKEN-SINTETICO/.test(bkp);

  /* B · outro navegador, limpo, com a Regime Ótimo aberta: restaura */
  const b = abrir(html, {});
  await espera(8000);
  b.abrirPagina('c05'); await espera(300);
  b.confirm = () => true;
  b.lhBkpRestaurar({ files: [new b.File([bkp], 'b.json', { type: 'application/json' })], value: '' });
  await espera(1500);
  b.dispatchEvent(new b.Event('beforeunload'));
  const d = despejar(b); b.close();

  /* C · recarregou; espera passar o autosave da Central (6 s) */
  const c = abrir(html, d);
  await espera(2000);
  /* o usuário já mexe num campo antes do autosave: o resumo não pode encolher para ele */
  val(c, 'c05_socios', '3');
  /* o autosave da Central roda de 6 em 6 s — aqui ele é chamado na mão, para a prova
     não depender do relógio (em máquina lenta o timer atrasa e a prova passaria vazia) */
  const salvou = c.LH_centralSalvar();
  await espera(7000);
  c.abrirPagina('c05'); await espera(500);
  r.fat = val(c, 'c05_fat'); r.seg = val(c, 'c05_seg'); r.folha = val(c, 'c05_folha');
  const central1 = JSON.parse(c.localStorage.getItem('lh_central_' + CNPJ) || '{}').campos || {};
  r.centralAntes = Object.keys(central0).length;
  r.centralTemDxh = central0.dxh_rbt12 === '2740604' && central0.c05_fat === '1234567';
  r.centralInteira = r.centralTemDxh && Object.keys(central0).every((k) => central1[k] === central0[k]);
  r.centralDet = JSON.stringify(central1);
  r.autosaveRodou = salvou === true;
  c.close();
  return r;
}
/* ── CENÁRIO 2 · o caso real do backup de 24/09, sem depender de relógio ──
   Cliente sem CNPJ no cadastro. O resumo da Central guarda 17 campos apurados dos
   documentos (aqui: 3 da DxH + o segmento da Regime Ótimo). A Regime Ótimo está
   aberta SEM ter sido restaurada — só o segmento de fábrica na tela — e o autosave
   roda. O guardado não pode encolher nem trocar o segmento apurado pelo de fábrica. */
async function cenario2(html) {
  const guardado = { cnpj: CNPJ, raiz: CNPJ.slice(0, 8), quando: '2026-09-24T11:20:20.568Z',
    campos: { dxh_rbt12: '2740604', dxh_fat: '292766', dxh_anexo: 'I', c05_seg: 'comercio_atacado' } };
  /* as chaves nascem já com o carimbo do produto, como no navegador de verdade */
  const w = abrir(html, { ['LHCORE::lh_central_' + CNPJ]: JSON.stringify(guardado), 'LHCORE::lh_cnpj_ativo': CNPJ });
  await espera(8000);
  w.abrirPagina('c05'); await espera(300);
  const seg = w.document.getElementById('c05_seg');
  const r = { telaDeFabrica: seg && seg.value === 'servicos_gerais' && seg.options[seg.selectedIndex].defaultSelected };
  if (!r.telaDeFabrica) { seg.value = 'servicos_gerais'; }   /* garante a precondição do caso */
  /* o usuário mexe num campo (como no caso real) — sem isso o autosave não tem o que gravar */
  val(w, 'c05_socios', '3');
  w.LH_CENTRAL_PROC = { cnpj: CNPJ, raiz: CNPJ.slice(0, 8) };
  r.rodou = w.LH_centralSalvar() === true;
  const depois = JSON.parse(w.localStorage.getItem('lh_central_' + CNPJ) || '{}').campos || {};
  r.dxhFicou = depois.dxh_rbt12 === '2740604' && depois.dxh_fat === '292766' && depois.dxh_anexo === 'I';
  r.segFicou = depois.c05_seg === 'comercio_atacado';
  r.det = JSON.stringify(depois);
  w.close();
  return r;
}
const checar2 = (r) => [
  ['cenário 2: a Regime Ótimo abriu com o segmento de fábrica (precondição)', r.telaDeFabrica],
  ['cenário 2: o autosave rodou', r.rodou],
  ['cenário 2: os campos da DxH apurados dos documentos não somem', r.dxhFicou, r.det],
  ['cenário 2: o segmento de fábrica não apaga o segmento apurado', r.segFicou, r.det]
];

const checar = (r) => [
  ['o arquivo de backup não leva o token de acesso', r.semToken],
  ['Regime Ótimo volta com o faturamento', r.fat === '1234567', 'c05_fat=' + r.fat],
  ['Regime Ótimo volta com o segmento', r.seg === 'comercio_atacado', 'c05_seg=' + r.seg],
  ['Regime Ótimo volta com a folha', r.folha === '42000', 'c05_folha=' + r.folha],
  ['o autosave da Central de fato rodou (a prova não passa vazia)', r.autosaveRodou],
  ['o resumo guardado tinha campos da DxH e da Regime Ótimo juntos', r.centralTemDxh, 'central0 sem dxh_rbt12/c05_fat'],
  ['resumo da Central sobrevive ao autosave depois de voltar', r.centralInteira, 'antes ' + r.centralAntes + ' campos · agora ' + r.centralDet]
];
function sabotar(chave) {
  const alvo = {
    beforeunloadGrava: ['    if(window.__LH_RESTAURANDO) return;\n', ''],
    centralTroca: ['    if(antigo && antigo.campos){ campos = Object.assign({}, antigo.campos, campos); }', ''],
    levaToken: ['if(LH_BKP_FORA.test(k))continue;', ''],
    salvaFabrica: ["if(e.tagName==='SELECT'){ var o=e.options[e.selectedIndex]; if(o && o.defaultSelected) return; }", '']
  }[chave];
  if (APP.split(alvo[0]).length !== 2) throw new Error('sabotagem ' + chave + ' não achou o alvo');
  return APP.replace(alvo[0], alvo[1]);
}

(async () => {
  console.log('\n-- backup: baixar e restaurar devolve tudo --');
  for (const [n, ok, det] of checar(await rodar(APP))) ex(n, ok, det);
  console.log('\n-- cenário 2: cliente sem CNPJ, tela de fábrica, autosave --');
  for (const [n, ok, det] of checar2(await cenario2(APP))) ex(n, ok, det);
  console.log('\n-- ao contrário: cada defesa arrancada tem de reprovar --');
  const esperado = { beforeunloadGrava: 1, centralTroca: 6, levaToken: 0 };
  for (const [k, idx] of Object.entries(esperado)) {
    const r = checar(await rodar(sabotar(k)));
    ex('sem ' + k + ' → reprova', !r[idx][1]);
  }
  /* as duas defesas da Central, no cenário que não depende de relógio */
  for (const [k, idx] of Object.entries({ centralTroca: 2, salvaFabrica: 3 })) {
    const r = checar2(await cenario2(sabotar(k)));
    ex('sem ' + k + ' → cenário 2 reprova', !r[idx][1], r[idx][2]);
  }
  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado');
  process.exit(falhou ? 1 : 0);
})();
