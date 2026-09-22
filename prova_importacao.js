#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   PROVA DA IMPORTAÇÃO · v846
   Carrega o app.html inteiro em jsdom, alimenta o motor pelo mesmo caminho da
   ferramenta (parsers reais + lhImportXML_aggregate real) e confere o que
   chega nos campos das calculadoras.

   Acervo: provas/acervo/ — sintético, determinístico, empresas inventadas.
   Gerado por provas/gerar_acervo.py (mesma semente, mesmo acervo).

   Uso:  npm i --no-save jsdom && node prova_importacao.js
   Sai 1 se qualquer verificação reprovar.

   ── SOBRE O RETRATO "ANTES" ───────────────────────────────────────────────
   Toda verificação compara o DOM antes e depois do motor. Sem isso a prova dá
   alarme falso: muitos campos já nascem com valor no HTML, e classificar
   "vazio depois" como defeito acusa o motor de falhas que não são dele.
   Foi assim que dois falsos positivos quase entraram no lote de 21/09
   (obra/portos com PIS e COFINS zerados — que é o CERTO no Simples, porque
   tudo está no DAS).
   ══════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const RAIZ    = __dirname;
const APP     = path.join(RAIZ, 'app.html');
const ACERVO  = path.join(RAIZ, 'provas', 'acervo');

let falhas = 0, passes = 0;
const ok   = (m) => { passes++; console.log('  ✓ ' + m); };
const bad  = (m) => { falhas++; console.log('  ✗ ' + m); };
const eq   = (cond, m) => cond ? ok(m) : bad(m);

/* ── o detectarTipo vive num fechamento: extraído do arquivo ─────────────── */
function extrairDetectar(src) {
  const i = src.indexOf('function detectarTipo(nome, conteudo){');
  if (i < 0) throw new Error('detectarTipo não encontrado em app.html');
  let d = 0, j = i;
  for (;;) {
    const c = src[j];
    if (c === '{') d++;
    else if (c === '}') { d--; if (d === 0) { j++; break; } }
    j++;
  }
  const mod = { exports: {} };
  new Function('module', src.slice(i, j) + '\nmodule.exports = detectarTipo;')(mod);
  return mod.exports;
}

function carregar(src) {
  const vc = new VirtualConsole();           // silencia o ruído do canvas
  return new JSDOM(src, {
    runScripts: 'dangerously', pretendToBeVisual: true,
    url: 'https://lionheartintelligence.com.br/app.html', virtualConsole: vc,
  }).window;
}

const espera = (ms) => new Promise(r => setTimeout(r, ms));
const num = (v) => { const x = parseFloat(String(v).replace(/\./g,'').replace(',','.')); return isNaN(x) ? null : x; };

/* ── alimenta o motor como a ferramenta faz ─────────────────────────────── */
function alimentar(w, detectar, pilar) {
  const d = path.join(ACERVO, pilar);
  const pgs = fs.readdirSync(path.join(d,'pgdas')).sort()
    .map(f => w.parsePGDAS(fs.readFileSync(path.join(d,'pgdas',f),'utf8')))
    .filter(r => r && r.ok);
  w.LH_IMPORT_PGDAS = Object.assign({}, pgs[pgs.length-1], { _n: pgs.length });

  const notas = [];
  for (const f of fs.readdirSync(path.join(d,'xml'))) {
    const t = fs.readFileSync(path.join(d,'xml',f),'utf8');
    if (detectar(f,t) !== 'NFe') continue;
    const r = w.parseNFeXML(t);
    (Array.isArray(r) ? r : [r]).forEach(n => n && notas.push(n));
  }
  w._LH_XML_NOTAS = notas; w.LH_XML_NOTAS = notas;
  w.LH_IMPORT_XML = w.lhImportXML_aggregate(notas);
  return { pgs, notas, agregado: w.LH_IMPORT_XML };
}

function retrato(w) {
  const r = {};
  Object.values(w.LH_PREFILL_MAP || {}).forEach(m =>
    Object.values(m).forEach(id => {
      if (typeof id !== 'string') return;
      const e = w.document.getElementById(id);
      if (e) r[id] = String(e.value);
    }));
  return r;
}

/* ══════════════════════════════════════════════════════════════════════════ */
(async function () {
  const src = fs.readFileSync(APP, 'utf8');
  const detectar = extrairDetectar(src);
  const meta = JSON.parse(fs.readFileSync(path.join(ACERVO,'resumo.json'),'utf8'));

  /* ───── 1 · DETECÇÃO DE TIPO ───────────────────────────────────────────── */
  console.log('\n1 · detecção de tipo');
  const casos = [
    ['PGDAS-D',     'PGDAS',      'PGDAS-D\nRBT12 1.000,00\nALIQUOTA EFETIVA 8%'],
    ['SPED Fiscal', 'SPEDFiscal', '|0000|018|0|\n|C190|000|1102|18,00|\n|E110|180,00|'],
    ['EFD-Contrib', 'EFD',        '|0000|006|0|\n|0111|1|1|\n|M200|5000,00|'],
    ['ECF',         'ECF',        '|0000|LECF|123|\n|M300|100|LUCRO|1,00|'],
    ['ECD',         'ECD',        '|0000|LECD|123|\n|I050|01012026|01|A|1|1.1.01|CAIXA|'],
    ['NF-e',        'NFe',        '<?xml version="1.0"?><nfeProc><NFe><infNFe/></NFe></nfeProc>'],
    ['NFS-e',       'NFSE',       '<?xml version="1.0"?><ListaNfse><Servico><ItemListaServico>17.01</ItemListaServico></Servico></ListaNfse>'],
    ['CT-e',        'CTE',        '<?xml version="1.0"?><cteProc><CTe><infCte/><vTPrest>1</vTPrest></CTe></cteProc>'],
    ['Reinf',       'REINF',      '<?xml version="1.0"?><Reinf><evtServTom><vlrTotalRetPrinc>1</vlrTotalRetPrinc></evtServTom></Reinf>'],
    ['eSocial',     'eSocial',    '<?xml version="1.0"?><eSocial><evtRemun><codCateg>101</codCateg></evtRemun></eSocial>'],
    ['Balancete',   'Balancete',  'Conta;Descricao;Saldo\n1.1.01;CAIXA;1,00\n1.1.02;BANCOS;2,00\n3.1.01;RECEITA;3,00'],
    ['vazio',       'DESCONHECIDO', ''],
  ];
  for (const [nome, esperado, txt] of casos)
    eq(detectar('a.txt', txt) === esperado, `${nome} → ${esperado}`);

  /* o ECD não pode ter roubado o ECF: os dois são SPED com |0000| */
  eq(detectar('a.txt','|0000|LECF|1|\n|M300|1|X|1,00|') === 'ECF',
     'ECD não engoliu o ECF (regressão da v846)');

  /* ── teste ao contrário: sem o ramo do ECD, a regra acima tem de reprovar ── */
  const semECD = extrairDetectar(src.replace("if(/\\|LECD\\||\\|I050\\|/.test(c)) return 'ECD';", ''));
  eq(semECD('a.txt','|0000|LECD|1|\n|I050|1|') !== 'ECD',
     'ao contrário: removendo o ramo do ECD, a detecção de ECD falha');

  /* ───── 2 · LABELS ─────────────────────────────────────────────────────── */
  console.log('\n2 · todo tipo reconhecido tem rótulo');
  const mLab = src.match(/var LABELS=\{[\s\S]*?\};/);
  eq(!!mLab, 'bloco LABELS encontrado');
  if (mLab) for (const t of ['REINF','NFSE','CTE','ECD','NFe','PGDAS','EFD','SPEDFiscal','ECF','Balancete','eSocial'])
    eq(new RegExp('\\b'+t+'\\s*:').test(mLab[0]), `rótulo para ${t}`);

  /* ───── 3 · O MOTOR, PILAR A PILAR ─────────────────────────────────────── */
  for (const pilar of Object.keys(meta)) {
    console.log(`\n3 · motor · ${pilar} (anexo ${meta[pilar].anexo})`);
    const w = carregar(src);
    await espera(5000);

    const { pgs, agregado } = alimentar(w, detectar, pilar);
    eq(pgs.length === 12, `12 PGDAS lidos (${pgs.length})`);

    /* o acervo tem de fechar consigo mesmo — senão a prova não prova nada */
    const rpa = pgs.reduce((s,p) => s + (p.rpa||0), 0);
    eq(Math.abs(rpa - meta[pilar].receita_ano) < 1,
       `RPA somado fecha com o acervo (${rpa.toFixed(2)})`);

    const antes = retrato(w);
    w.LH_aplicarDocsNasCalcs(true);
    const MAP = w.LH_PREFILL_MAP || {};

    /* 3a · ESCALA — a regra que existe por causa do ×2 */
    const anual = w.LH_IMPORT_PGDAS.rbt12;
    let foraEscala = [];
    for (const [tela, m] of Object.entries(MAP)) {
      if (!m.fat) continue;
      const el = w.document.getElementById(m.fat);
      if (!el) continue;
      const v = num(el.value);
      if (v === null || v === 0) continue;
      const esperado = m.escala === 'mensal' ? anual/12 : m.escala === 'anual' ? anual : null;
      if (esperado && Math.abs(v - esperado)/esperado > 0.05)
        foraEscala.push(`${tela}.${m.fat}=${v} (esperava ~${Math.round(esperado)} em escala ${m.escala})`);
    }
    eq(foraEscala.length === 0,
       `nenhum campo de faturamento fora de escala${foraEscala.length?': '+foraEscala.slice(0,3).join(' | '):''}`);

    /* 3b · O MOTOR NUNCA APAGA VALOR QUE JÁ EXISTIA
       É a regra que teria pegado o bug do `atual` no dia em que ele entrou:
       hot_atual tinha 6,65 e o motor deixava em branco. */
    const apagados = [];
    for (const m of Object.values(MAP))
      for (const id of Object.values(m)) {
        if (typeof id !== 'string') continue;
        const el = w.document.getElementById(id);
        if (!el) continue;
        const a = antes[id], dep = String(el.value);
        if (a && a !== '' && dep === '') apagados.push(`${id}: "${a}" → vazio`);
      }
    eq(apagados.length === 0,
       `nenhum campo perdeu valor que já tinha${apagados.length?': '+apagados.slice(0,3).join(' | '):''}`);

    /* 3c · o campo `atual` recebe número, não texto */
    const atuais = Object.entries(MAP).filter(([,m]) => m.atual)
      .map(([tela,m]) => [tela, m.atual, w.document.getElementById(m.atual)])
      .filter(([,,el]) => el);
    const ruins = atuais.filter(([,,el]) => num(el.value) === null || num(el.value) <= 0);
    eq(atuais.length > 0 && ruins.length === 0,
       `${atuais.length} campos de carga atual com número válido${ruins.length?' — falharam: '+ruins.map(r=>r[1]).join(', '):''}`);

    /* 3d · identidade: CNPJ e NOME juntos */
    for (const papel of ['cnpj','nome']) {
      const alvos = Object.entries(MAP).filter(([,m]) => m[papel])
        .map(([tela,m]) => [tela, m[papel], w.document.getElementById(m[papel])])
        .filter(([,,el]) => el);
      const vazios = alvos.filter(([,,el]) => !String(el.value).trim());
      eq(alvos.length > 0 && vazios.length === 0,
         `${papel}: ${alvos.length} campo(s) preenchido(s)${vazios.length?' — vazios: '+vazios.map(v=>v[1]).join(', '):''}`);
    }

    /* 3e · DEVOLUÇÃO não entra como receita */
    const esperaDevol = meta[pilar].devolucoes;
    eq((agregado.nDevol||0) === esperaDevol,
       `${esperaDevol} devolução(ões) reconhecida(s) (achou ${agregado.nDevol||0})`);
    if (esperaDevol > 0)
      eq((agregado.vDevol||0) > 0 && agregado.vNFSaida > 0 && agregado.vNFSaida < agregado.vNF,
         'devolução abate a receita em vez de somar');

    /* 3f · todo id do mapa existe no documento (pega mapa morto, como a c10) */
    /* Cuidado: o mapa guarda, lado a lado com os ids, declarações que NÃO são
       campo — escala ('anual'/'mensal'/'periodo') e tipo ('merc'/'serv').
       Sem excluí-las a prova reprova o app por um erro que é dela. */
    const NAO_E_CAMPO = new Set(['anual','mensal','periodo','merc','serv']);
    const mortos = [];
    for (const [tela, m] of Object.entries(MAP))
      for (const [papel, id] of Object.entries(m)) {
        if (typeof id !== 'string') continue;
        if (/escala/i.test(papel) || papel === 'tipo') continue;
        if (NAO_E_CAMPO.has(id)) continue;
        if (!/^[a-zA-Z][\w-]*$/.test(id)) continue;      // só o que parece id
        if (!w.document.getElementById(id)) mortos.push(`${tela}.${papel}=${id}`);
      }
    eq(mortos.length === 0,
       `todo alvo do mapa existe no documento${mortos.length?' — mortos: '+mortos.slice(0,4).join(', '):''}`);

    w.close();
  }

  /* ───── 4 · ENCODING ───────────────────────────────────────────────────── */
  console.log('\n4 · leitura de arquivo');
  /* Só a Central genérica (lerArquivo) muda: ela recebe XML, que declara UTF-8.
     SPED, ECF, ECD e balancete em texto são ISO-8859-1 POR ESPECIFICAÇÃO da
     Receita — ali o latin-1 é o certo e não pode ser "consertado". Por isso a
     verificação é ancorada em lerArquivo, e não no arquivo inteiro. */
  const mLer = src.match(/function lerArquivo\(f\)\{[\s\S]*?\n  \}/);
  eq(!!mLer, 'função lerArquivo encontrada');
  if (mLer) {
    eq(/readAsText\(f,\s*['"]UTF-8['"]\)/.test(mLer[0]),
       'lerArquivo: texto é lido primeiro como UTF-8');
    eq(/�/.test(mLer[0]) || /\\uFFFD/.test(mLer[0]),
       'lerArquivo: cai para ISO-8859-1 ao ver o caractere de substituição');
  }
  /* e os leitores de SPED continuam em latin-1 — regressão ao contrário */
  eq(/lhSPEDFiscal_onFile[\s\S]{0,2500}?readAsText\(f,\s*'ISO-8859-1'\)/.test(src),
     'SPED Fiscal segue em ISO-8859-1, como manda a especificação');

  /* ───── 5 · ARQUIVO ILEGÍVEL APARECE ──────────────────────────────────── */
  console.log('\n5 · arquivo que não pôde ser lido não some');
  const usos = (src.match(/grupos\.ERRO/g) || []).length;
  eq(usos >= 2, `grupos.ERRO é lido, não só preenchido (${usos} usos)`);
  eq(/Não foi possível ler/.test(src), 'o resumo da importação mostra os ilegíveis');
  eq(/leitura de PDF indisponível/.test(src),
     'o caso do PDF (biblioteca externa fora do ar) tem aviso próprio');

  /* ══════════════════════════════════════════════════════════════════════ */
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`${passes} passaram · ${falhas} reprovaram`);
  if (falhas) { console.log('PROVA REPROVADA'); process.exit(1); }
  console.log('PROVA APROVADA');
})().catch(e => { console.error('\nERRO NA PROVA:', e && e.stack || e); process.exit(1); });
