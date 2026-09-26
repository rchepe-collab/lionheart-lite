/* PROVA DO RESOLVEDOR DE cClassTrib · v861
   Segura que o código de cada item sai da NATUREZA do item (anexo/dispositivo legal) e existe na tabela oficial
   (IT RT 2025.002, 22/06/2026), nas três telas que mostram código:
   · Simulador de Notas (snCodigos) · Auditor de Cadastro (acEscolhe) · Classificador em massa (cmCclassPorFonte).
   Antes, −30% saía 200011 (nutrição enteral p/ órgão público), −40% saía 200031 (acessibilidade PcD),
   monofásico saía 220001 (incorporação imobiliária) e todo −60% saía 200003 (cesta básica).
   Uso: npm i --no-save jsdom && node prova_cclass_resolve.js */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
let falhou = 0;
const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(70, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };

/* catálogo de produtos (nome exato) → código esperado */
const CATALOGO = {
  'Comércio - Varejo Geral': '000001', 'Tecnologia - Software e TI': '000001',
  'Advocacia e Consultoria Jurídica': '200052', 'Contabilidade e Auditoria': '200052', 'Engenharia e Consultoria Técnica': '200052',
  'Hospedagem — Hotel/Pousada': '200048', 'Bares e Restaurantes — preparados no local': '200047',
  'Transporte Intermunicipal/Interestadual — passageiros': '200049', 'Parques de Diversão e Temáticos': '200048',
  'Saúde - Consultas Médicas': '200029', 'Saúde - Exames e Diagnósticos': '200029',
  'Educação - Ensino Superior': '200028', 'Educação - Idiomas e Cursos': '200028',
  'Medicamentos (Lista CMED)': '200032', 'Dispositivos Médicos e Acessórios': '200030',
  'Agropecuária - Insumos Agropecuários': '200038', 'Agropecuária - Produção Animal/Vegetal': '200036',
  'Alimentos para Consumo Humano': '200034', 'Produtos de Higiene para Baixa Renda': '200035',
  'Eventos e Feiras — organização': '200039',
  'Cesta Básica - Arroz': '200003', 'Cesta Básica - Carnes': '200003', 'Produtos Hortícolas e Frutas': '200014', 'Ovos': '200014',
  'Medicamentos para Doenças Graves': '200009', 'Produtos de Higiene Menstrual': '200013', 'Automóveis para Taxistas (PcD)': '200015',
  'Bares — alcoólicas / revenda sem preparo / catering PJ': '000001'
};
/* textos da base de NCM (fonte) → código esperado no Classificador em massa */
const MASSA = [
  ['zero', 'Anexo I — cesta básica nacional', '200003'],
  ['zero', 'Anexo XV — hortícolas, frutas e ovos (alíquota ZERO, art. 148)', '200014'],
  ['zero', 'Anexo XII — dispositivos médicos (alíquota ZERO)', '200004'],
  ['zero', 'Anexo XIII — dispositivos de acessibilidade PCD (alíquota ZERO)', '200007'],
  ['zero', 'Alíquota zero SÓ para os fármacos da lista taxativa (Anexo) — medicamentos', '200009'],
  ['zero', 'Imunidade constitucional', '410008', 'Livros'],
  ['red60', 'Anexo VII LC 214 — alimentos com redução 60%', '200034'],
  ['red60', 'Redução 60% — dispositivos médicos (a validar lista zero)', '200030'],
  ['red60', 'Redução 60% — insumos agropecuários', '200038'],
  ['red60', 'Redução 60% — Anexo de medicamentos', '200032'],
  ['imune', 'Exportação imune com manutenção de crédito', '410004'],
  ['imune', 'Art. 9º, IV LC 214 — imunidade constitucional (livros, jornais, periódicos)', '410008'],
  ['difer', 'Agro — diferimento/insumo (interno) · imune exportação', '515001'],
  ['adrem', 'Regime específico — monofásico AD REM (R$/litro) Gasolina', '620001'],
  ['adrem', 'Imposto Seletivo — bebida alcoólica (art. 409+). Cerveja', '000001'],
  ['cheia', 'Art. 14 — regra geral', '000001']
];

function rodar(html) {
  return new Promise((ok) => {
    const w = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true,
      url: 'https://lionheartintelligence.com.br/app.html', virtualConsole: new VirtualConsole() }).window;
    w.fetch = () => new Promise(() => {});
    w.HTMLElement.prototype.scrollIntoView = function () {};
    setTimeout(() => {
      const out = { erro: '', cat: {}, massa: [], varre: { cat: [], ncm: [] }, auditor: {} };
      try {
        const T = w.LH_CCLASSTRIB || {};
        const idx = (n) => w.LH_CLASSIF_PRODUTOS.findIndex((p) => p.n === n);
        /* Simulador de Notas: pelo mesmo caminho da tela (snItem → snCodigos) */
        for (const nome in CATALOGO) {
          const p = w.LH_CLASSIF_PRODUTOS[idx(nome)];
          if (!p) { out.cat[nome] = 'SEM PRODUTO'; continue; }
          out.cat[nome] = w.snCodigos({ nome: p.n, lab: '', art: p.art, b: p.b }).cclass;
        }
        /* varredura: TODO produto do catálogo sai com código que existe e CST coerente */
        w.LH_CLASSIF_PRODUTOS.forEach((p) => { const c = w.snCodigos({ nome: p.n, lab: '', art: p.art, b: p.b });
          if (typeof T[c.cclass] !== 'string' || c.cst !== c.cclass.slice(0, 3)) out.varre.cat.push(p.n + '→' + c.cclass); });
        /* Classificador em massa */
        MASSA.forEach(([trat, fonte, esp, desc]) => { out.massa.push([trat, fonte, esp, w.cmCclassPorFonte(trat, (desc ? desc + ' ' : '') + fonte)]); });
        /* varredura: TODO item da base de NCM passa pela autoauditoria (código existe e família do CST bate) */
        (w.LH_NCM_BASE.itens || []).forEach((it) => { const m = w.cmCclassPorFonte(it.trat, (it.desc || '') + ' ' + (it.fonte || ''));
          const c = String(m[1]).replace('*', '');
          if (c.indexOf('CONFIRMAR') >= 0) return;
          const a = w.cmAutoAudit(it.trat, m[0], c); if (!a.ok) out.varre.ncm.push(it.ncm + ' ' + it.trat + ' → ' + m[0] + '/' + c + ' · ' + a.motivo); });
        /* Auditor de Cadastro (acEscolhe) com um item do catálogo */
        const bar = w.LH_CLASSIF_PRODUTOS[idx('Bares e Restaurantes — preparados no local')];
        w._acRes = [{ n: bar.n, desc: bar.n, b: bar.b, art: bar.art }];
        const box = w.document.getElementById('ac_result') || (() => { const d = w.document.createElement('div'); d.id = 'ac_result'; w.document.body.appendChild(d); return d; })();
        w.acEscolhe(0); out.auditor.html = box.textContent;
        out.mapa = { red30: w.LH_CCLASSTRIB_MAPA.mapa.red30.cclass, red40: w.LH_CCLASSTRIB_MAPA.mapa.red40.cclass, mono: w.LH_CCLASSTRIB_MAPA.mapa.mono.cclass, monoCst: w.LH_CCLASSTRIB_MAPA.mapa.mono.cst };
      } catch (e) { out.erro = e.message + ' ' + (e.stack || '').split('\n')[1]; }
      w.close(); ok(out);
    }, 8000);
  });
}
(async () => {
  const r = await rodar(APP);
  ex('carregou sem erro', !r.erro, r.erro);
  if (!r.erro) {
    console.log('\n-- Simulador de Notas: código pela natureza do item --');
    for (const nome in CATALOGO) ex(nome.slice(0, 44) + ' → ' + CATALOGO[nome], r.cat[nome] === CATALOGO[nome], r.cat[nome]);
    ex('varredura: todo o catálogo sai com código oficial e CST coerente', r.varre.cat.length === 0, r.varre.cat.slice(0, 4).join(' | '));
    console.log('\n-- Classificador em massa --');
    r.massa.forEach(([trat, fonte, esp, got]) => ex(trat + ' · ' + fonte.slice(0, 40) + ' → ' + esp, String(got[1]).replace('*', '') === esp && got[0] === esp.slice(0, 3), got.join('/')));
    ex('varredura: toda a base de NCM passa na autoauditoria', r.varre.ncm.length === 0, r.varre.ncm.length + ' · ' + r.varre.ncm.slice(0, 3).join(' | '));
    console.log('\n-- Auditor de Cadastro --');
    ex('Bares e Restaurantes → 200047 na tela do auditor', /200047/.test(r.auditor.html) && !/200031/.test(r.auditor.html), r.auditor.html.slice(0, 160));
    ex('o auditor mostra a descrição oficial do código', /Bares e Restaurantes/.test(r.auditor.html));
    console.log('\n-- mapa de reserva corrigido --');
    ex('−30% → 200052 (não 200011)', r.mapa.red30 === '200052', r.mapa.red30);
    ex('−40% → 200047 (não 200031)', r.mapa.red40 === '200047', r.mapa.red40);
    ex('monofásico → 620 · 620001 (não 220001)', r.mapa.mono === '620001' && r.mapa.monoCst === '620', r.mapa.monoCst + '/' + r.mapa.mono);
  }
  console.log('\n-- ao contrário --');
  const sab = async (nome, alvo, troca, teste) => {
    if (APP.split(alvo).length !== 2) throw new Error('sabotagem "' + nome + '" não achou o alvo');
    const s = await rodar(APP.replace(alvo, troca)); ex(nome, !s.erro && teste(s), s.erro);
  };
  await sab('sem o resolvedor na nota (volta ao mapa) → hotel sai 200047 genérico → reprova',
    "if(typeof window.lhCClassResolve==='function'){\n    var x=window.lhCClassResolve((it&&it.b)||'PADRAO'", "if(false){\n    var x=window.lhCClassResolve((it&&it.b)||'PADRAO'",
    (s) => s.cat['Hospedagem — Hotel/Pousada'] !== '200048' || s.cat['Saúde - Consultas Médicas'] !== '200029');
  await sab('regra de hotelaria removida → reprova', "if(R(/hotel|hosped|pousad|parque|resort/)) return r('200048');", '',
    (s) => s.cat['Hospedagem — Hotel/Pousada'] !== '200048');
  await sab('diferimento agro de volta a 510001 → reprova', "return R(/energia/)? r('510001') : r('515001'", "return R(/energia/)? r('510001') : r('510001'",
    (s) => s.massa.some(([t, f, e, g]) => t === 'difer' && String(g[1]).replace('*', '') !== e));
  await sab('código inexistente numa regra → varredura pega → reprova', "if(R(/anexo viii|higien|fralda|sabonete|bucal|absorv/)) return r('200035');", "if(R(/anexo viii|higien|fralda|sabonete|bucal|absorv/)) return r('200099');",
    (s) => s.varre.cat.length > 0 || s.varre.ncm.length > 0);
  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado');
  process.exit(falhou ? 1 : 0);
})();
