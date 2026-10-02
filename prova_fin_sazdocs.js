/* PROVA v905 — sazonalidade lida dos documentos (razão: PGDAS receita_declarada / XML receita_bruta, 12+ competências);
   calculadoras setoriais levam faturamento, repasses, insumos e exportação aos Dados (só o vazio); PDF ganha a 3ª página
   financeira (96 meses, cenários de caixa e de resultado). Sabotagens: 11 meses não bastam; digitado não é sobrescrito pela setorial.
   Uso: npm i --no-save jsdom && node prova_fin_sazdocs.js */
const { JSDOM, VirtualConsole } = require('jsdom'); const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
let falhou = 0; const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(86, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const perto = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1 : tol);
const w = new JSDOM(APP, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://lionheartintelligence.com.br/app.html', virtualConsole: new VirtualConsole() }).window;
w.fetch = () => new Promise(() => {}); w.HTMLElement.prototype.scrollIntoView = function () {}; w.scrollTo = function () {}; w.alert = () => {};
setTimeout(() => {
  const d = w.document, F = w.LH_FIN; w.LH_ALIQ_REF = 26.5; const O = { tipo: 'digitado', detalhe: 'prova', quando: '2026-10-01' };
  const CNPJ = '11111111000191'; w.LH_EMP_CNPJ = CNPJ; w.localStorage.clear(); w.LH_PONTE.ultimo = {};
  /* razão de mentira: 11 meses de PGDAS → não basta; 24 meses com dezembro forte → curva */
  const raz = (meses) => { const r = { cnpj: CNPJ, competencias: {}, origens: {}, agregados: {}, atualizado: new Date().toISOString() }; meses.forEach(([c, v]) => { r.competencias[c] = { receita_declarada: { v: v, origens: { PGDAS: 1 } } }; }); w.localStorage.setItem('lh_razao_' + CNPJ, JSON.stringify(r)); };
  const m11 = []; for (let i = 1; i <= 11; i++) m11.push(['2025-' + String(i).padStart(2, '0'), 100000]);
  raz(m11);
  ex('sem 12 competências, sazDocs() não existe (11 meses não bastam)', F.sazDocs() == null);
  const m24 = []; for (let y = 2024; y <= 2025; y++) for (let i = 1; i <= 12; i++) m24.push([y + '-' + String(i).padStart(2, '0'), (i === 12 ? 200000 : i === 2 ? 60000 : 100000)]);
  raz(m24);
  const sz = F.sazDocs();
  ex('com 24 meses (dez = 2×, fev = 0,6×): curva lida da razão, fonte PGDAS, pico dez, vale fev', sz && sz.fonte === 'PGDAS' && sz.meses === 24 && sz.forte === 12 && sz.fraco === 2 && perto(sz.pesos[11] / sz.pesos[1], 200000 / 60000, 0.02), JSON.stringify(sz));
  ex('pesos normalizados para média 1', perto(sz.pesos.reduce((a, b) => a + b, 0) / 12, 1, 0.01));
  ex('o select tem a opção "Pelos documentos" e a Central sugere saz = docs', !!d.querySelector('#fin_saz option[value="docs"]') && F.sugestoes().some((x) => x.k === 'saz' && x.v === 'docs' && /PGDAS/.test(x.det)));
  F.set({ fat: 1200000, cresc: 0, infl: 0, regime: 'presumido', perfil: 'comercio', icms: 18, trat: 'cheia', compras: 600000, pessoal: 200000, prolab: 60000, ocup: 40000, adm: 20000, pRec: 30, pPag: 20, vista: 40, caixa0: 50000, ressarc: 60 }, O);
  F.sugerir(false);
  ex('sugerir preenche saz = docs (Central)', F.get().dados.saz === 'docs' && F.get().origem.saz.tipo === 'central');
  const fx = F.fluxo();
  ex('o Fluxo usa a curva dos documentos: dezembro é o mês de maior entrada, fevereiro o menor', JSON.stringify(F.pesosSaz()) === JSON.stringify(sz.pesos) && fx[1].mensal[11] - fx[1].mensal[10] > fx[1].mensal[1] - fx[1].mensal[0]);
  w.abrirPagina('fin_fluxo'); F.renderFluxo();
  ex('o KPI "Pior mês" diz "documentos: pico dez, vale fev"', /documentos: pico dez, vale fev/.test(d.getElementById('fin_fluxo_result').textContent));

  /* setoriais levam números */
  w.localStorage.removeItem('LH_FIN::' + F.eid());
  w.LH_PONTE.ultimo.calcularAgViagem = { ent: { setor: 'agviagem', faturamento: 2000000, deducao: 1500000, carga_atual_pct: 8, credito_pct: 10 }, resultado: { ok: true }, quando: '2026-10-02T10:00:00Z' };
  ex('Agências de viagem leva faturamento 2.000.000 e repasse 75% aos Dados (origem tela)', F.afluente('setor:turismo:Agências de viagem') === true && F.get().dados.fat === 2000000 && F.get().dados.repasse === 75 && F.get().origem.fat.tipo === 'tela' && F.afluentes().setor.levados.length === 2, JSON.stringify(F.get().dados));
  w.LH_PONTE.ultimo.calcularAgroSuper1 = { ent: { receita_anual: 3000000, insumos_anual: 1800000, pct_compradores_creditam: 50, pct_exportacao: 40 }, resultado: { ok: true }, quando: '2026-10-02T11:00:00Z' };
  F.set({ fat: 2500000 }, O);
  ex('Agro decisor: faturamento digitado (2.500.000) não é sobrescrito; insumos 1.800.000 e exportação 40% entram', F.afluente('setor:agro:Agro · decisor do produtor') === true && F.get().dados.fat === 2500000 && F.get().dados.compras === 1800000 && F.get().dados.recExp === 40, JSON.stringify(F.get().dados));

  /* PDF 3 páginas */
  const paleta = (w.PDF_PALETAS && w.PDF_PALETAS.dourado) || { primaria: '#c9a227', textoEscuro: '#111' };
  F.set({ pessoal: 100000, pRec: 30, pPag: 20, caixa0: 5000, cmin: 2 }, O);
  const r = w.buildPaginasFin({ escritorio: 'E', contador: 'J', crc: '1', contato: 'x', cor: 'dourado', logoData: null }, paleta, 5);
  const box = d.createElement('div'); box.innerHTML = r.html; const pg = box.querySelectorAll('.pdf-page');
  ex('o PDF financeiro tem 3 páginas; a 3ª traz o gráfico dos 96 meses, cenários de caixa e de resultado', r.paginas === 3 && pg.length === 3 && !!pg[2].querySelector('svg polyline') && /Cenários de caixa/.test(pg[2].textContent) && /Estresse/.test(pg[2].textContent) && /Cenários de resultado/.test(pg[2].textContent) && /Pessimista/.test(pg[2].textContent));
  ex('a 3ª página diz o capital necessário e a sazonalidade usada', /Capital necessário: R\$/.test(pg[2].textContent) || /não cai abaixo/.test(pg[2].textContent));
  ex('a numeração segue (5, 6, 7)', /7/.test([...pg[2].children].pop().textContent));

  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado'); process.exit(falhou ? 1 : 0);
}, 9000);
