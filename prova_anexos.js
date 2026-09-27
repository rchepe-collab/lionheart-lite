/* PROVA DOS ANEXOS DA LC 214 · v862
   Segura que a lista de exceções da ferramenta (quem tem benefício) está COMPLETA contra o texto oficial da
   LC 214/2025 (compilado com a LC 227/2026), anexo por anexo, e que o Classificador em massa enxerga cada código.
   Contagem oficial (26/09/2026): I 94 · IV 77 · V 21 · VI 64 · VII 49 · VIII 7 · IX 85 · XII 29 · XIII 7 · XV 24.
   Uso: npm i --no-save jsdom && node prova_anexos.js */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
let falhou = 0;
const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(70, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const OFICIAL = { I: 94, IV: 77, V: 21, VI: 64, VII: 49, VIII: 7, IX: 86, XII: 29, XIII: 7, XV: 24 };   /* IX: 85 códigos + item 10 (sementes) por capítulos 7/10/12 (v869) */
const TRAT = { I: 'zero', IV: 'red60', V: 'red60', VI: 'red60', VII: 'red60', VIII: 'red60', IX: 'red60', XII: 'zero', XIII: 'zero', XV: 'zero' };
/* casos que o arquivo da Fossati e a conciliação mostraram */
const CASOS = [
  ['38089419', 'AGUA SANITARIA 2L', 'red60', '200035', 'Anexo VIII'],
  ['34011900', 'SABAO EM BARRA GLICERINADO', 'red60', '200035', 'Anexo VIII'],
  ['02109990', 'CHARQUE CARNE SECA', 'zero', '200003', 'Anexo I — faltava'],
  ['03063100', 'CAMARAO CONGELADO', 'red60', '200034', 'Anexo VII — faltava'],
  ['90181410', 'CAMARA GAMA CINTILOGRAFIA', 'zero', '200004', 'Anexo XII — base dizia −60%'],
  ['39269030', 'BOLSA PARA DRENAGEM', 'red60', '200030', 'Anexo IV — faltava'],
  ['31010000', 'BIOFERTILIZANTE ORGANICO', 'red60', '200038', 'Anexo IX'],
  ['91021190', 'RELOGIO BRAILLE PCD', 'red60', '200031', 'Anexo V — faltava'],
  ['73181500', 'PARAFUSO SEXTAVADO', 'cheia', '000001', 'regra geral'],
  /* produto específico sob NCM genérico: só com a descrição da lei */
  ['84798999', 'FUNIL METALICO', 'cheia', '000001', 'Anexo IV cita 8479.89.99 só p/ reprocessador de hemodiálise'],
  ['84798999', 'REPROCESSADOR DE FILTROS DE HEMODIALISE', 'red60', '200030', 'Anexo IV item 41'],
  ['39174090', 'CONECTOR DE MANGUEIRA COM ENGATE', 'cheia', '000001', 'Anexo IV cita 3917.40 só p/ conector completo com tampa'],
  ['28151100', 'SODA CAUSTICA 1KG', 'cheia', '000001', 'Anexo IX cita 2815.11 como insumo agro (hidróxido de sódio p/ uso agropecuário)'],
  ['28151100', 'HIDROXIDO DE SODIO USO AGROPECUARIO CORRETIVO', 'red60', '200038', 'Anexo IX item 8 — descrição confirma'],
  /* v869: sementes (Anexo IX item 10, capítulos 7/10/12) só com a palavra na descrição; máquinas agrícolas não são insumo */
  ['10051000', 'SEMENTE DE MILHO HIBRIDO SC 60K', 'red60', '200038', 'Anexo IX item 10'],
  ['10051000', 'MILHO PIPOCA 500G', 'cheia', '000001', 'cap. 10 sem "semente" → regra geral'],
  ['87019300', 'TRATOR AGRICOLA 75CV', 'cheia', '000001', 'máquina não é insumo'],
  ['31021010', 'UREIA AGRICOLA 50KG', 'red60', '200038', 'Anexo IX item 2 — marcador agro fecha o CONFERIR'],
  ['87131000', 'CADEIRA DE RODAS MANUAL', 'zero', '200007', 'Anexo XIII'],
  ['49019900', 'LIVRO DIDATICO', 'imune', '410008', 'art. 9º IV'],
  ['96190000', 'ABSORVENTE INTERNO 16 UN', 'zero', '200013', 'art. 146 saúde menstrual'],
  ['87032100', 'AUTOMOVEL HATCH 1.0 FLEX', 'cheia+IS', '000001', 'IS não é benefício condicionado'],
  /* v867: Anexo I item 16 cita 1905.90.90 só para o pão francês — bolo e croissant no mesmo NCM são regra geral */
  ['19059090', 'PAO FRANCES KG', 'zero', '200003', 'Anexo I item 16'],
  ['19059090', 'BOLO DE CHOCOLATE KG', 'cheia', '000001', 'mesmo NCM, não é pão francês'],
  ['19059090', 'CROISSANT UNIDADE', 'cheia', '000001', 'mesmo NCM, não é pão francês'],
];
function rodar(html) {
  return new Promise((ok) => {
    const w = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true,
      url: 'https://lionheartintelligence.com.br/app.html', virtualConsole: new VirtualConsole() }).window;
    w.fetch = () => new Promise(() => {});
    setTimeout(() => {
      const out = { erro: '', porAnexo: {}, casos: [], stats: null };
      try {
        const L = w.LH_ANEXOS_LEI; out.stats = w.LH_ANEXOS_STATS;
        const base = w.LH_NCM_BASE.itens; const idx = {};
        base.forEach((x) => { const k = String(x.ncm || '').replace(/\D/g, ''); if (k && !idx[k]) idx[k] = x; });
        /* por anexo: todo código da lei está na base com o tratamento da lei */
        const porAnexo = {};
        (L ? L.itens : []).forEach((e) => {
          const a = e.a; porAnexo[a] = porAnexo[a] || { lei: new Set(), ok: 0, falta: [], diverge: [] };
          porAnexo[a].lei.add(e.cap || e.ncm);
          const x = idx[e.ncm.replace(/\D/g, '')];
          if (!x) porAnexo[a].falta.push(e.ncm);
          else if (x.trat !== e.trat && !(x.trat === 'zero' && e.trat === 'red60')) porAnexo[a].diverge.push(e.ncm + ':' + x.trat);
          else porAnexo[a].ok++;
        });
        for (const a in porAnexo) out.porAnexo[a] = { lei: porAnexo[a].lei.size, ok: porAnexo[a].ok, falta: porAnexo[a].falta, diverge: porAnexo[a].diverge };
        /* o classificador em massa: caminho real (cmBuscaTrat → cmCclassPorFonte) */
        CASOS.forEach(([ncm, desc, trat, cclass]) => {
          let got = null;
          try { const h = w.cmBuscaTrat(ncm, desc); const t = h ? (h.trat || h) : null; const tr = typeof t === 'string' ? t : (h && h.trat);
            const m = w.cmCclassPorFonte(tr, (h && h.fonte) || ''); got = { trat: tr, cst: m[0], cclass: String(m[1]).replace('*', ''), fonte: String((h && h.fonte) || '') }; } catch (e) { got = { erro: e.message }; }
          out.casos.push([ncm, desc, trat, cclass, got]);
        });
      } catch (e) { out.erro = e.message + ' ' + (e.stack || '').split('\n')[1]; }
      w.close(); ok(out);
    }, 8000);
  });
}
(async () => {
  const r = await rodar(APP);
  ex('carregou sem erro', !r.erro, r.erro);
  if (!r.erro) {
    console.log('\n-- cada anexo da lei está inteiro na ferramenta --');
    for (const a in OFICIAL) {
      const p = r.porAnexo[a] || { lei: 0, ok: 0, falta: ['(anexo ausente)'], diverge: [] };
      ex('Anexo ' + a + ': ' + OFICIAL[a] + ' códigos na lei', p.lei === OFICIAL[a], String(p.lei));
      ex('Anexo ' + a + ': todos na base com o tratamento da lei (' + TRAT[a] + ')', p.falta.length === 0 && p.diverge.length === 0, 'faltam ' + p.falta.slice(0, 4) + ' · divergem ' + p.diverge.slice(0, 4));
    }
    ex('camada aplicada (novos > 150, corrigidos ≥ 1)', !!r.stats && r.stats.novos > 150 && r.stats.corrigidos >= 1, JSON.stringify(r.stats));
    console.log('\n-- o classificador em massa enxerga os códigos novos --');
    r.casos.forEach(([ncm, desc, trat, cclass, got]) => ex(ncm + ' ' + desc.slice(0, 26) + ' → ' + trat + ' · ' + cclass, !!got && got.trat === trat && got.cclass === cclass, JSON.stringify(got)));
    const pvc = r.casos.find(([n, d]) => d === 'CONECTOR DE MANGUEIRA COM ENGATE')[4];
    ex('conexão de PVC fica regra geral em silêncio (não vai para revisão)', !!pvc && !/CONFERIR|N\u00c3O confirma|condicionado/i.test(pvc.fonte), pvc && pvc.fonte.slice(0, 90));
  }
  console.log('\n-- ao contrário --');
  const sab = async (nome, alvo, troca, teste) => {
    if (APP.split(alvo).length !== 2) throw new Error('sabotagem "' + nome + '" não achou o alvo');
    const s = await rodar(APP.replace(alvo, troca)); ex(nome, !s.erro && teste(s), s.erro);
  };
  await sab('camada não aplicada → anexos IX e VI ficam incompletos → reprova',
    "if(window.LH_FISCAL) aplicar(); else document.addEventListener('DOMContentLoaded', aplicar);", "if(false) aplicar();",
    (s) => (s.porAnexo.IX || { falta: [1] }).falta.length > 0 || !s.porAnexo.IX);
  await sab('um código do Anexo VII removido → contagem cai → reprova',
    "{a:'VII',i:'1',ncm:'0306.31.00'", "{a:'XVI',i:'1',ncm:'0306.31.00'",
    (s) => s.porAnexo.VII.lei !== 49);
  await sab('lei deixa de vencer no código exato (IV/VI/IX vs base "cheia") → reprova',
    "if(x.trat!==e.trat && !(x.trat==='zero' && e.trat==='red60')){ x.trat=e.trat;", "if(false){ x.trat=e.trat;",
    (s) => (s.porAnexo.IV.diverge.length + s.porAnexo.VI.diverge.length + s.porAnexo.IX.diverge.length) > 0);
  await sab('regra do produto específico desligada → conexão de PVC vira −60% → reprova',
    "if(hit.esp && hit.kw && hit.kw.length){", "if(false){",
    (s) => s.casos.some(([ncm, desc, trat, cclass, got]) => desc === 'CONECTOR DE MANGUEIRA COM ENGATE' && got && (got.trat !== 'cheia' || /CONFERIR|N\u00c3O confirma|condicionado/i.test(got.fonte))));
  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado');
  process.exit(falhou ? 1 : 0);
})();
