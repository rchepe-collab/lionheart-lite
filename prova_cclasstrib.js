/* PROVA DA TABELA cClassTrib · v860
   Segura que a tabela oficial embarcada (LH_CCLASSTRIB, IT RT 2025.002 de 22/06/2026, 164 códigos em 18 CST)
   SOBREVIVE ao carregamento — o Auditor de Cadastro (v39) redefinia window.LH_CCLASSTRIB com outro formato e
   apagava a tabela: a consulta por código (colar 6 dígitos) e lhLerClassTrib devolviam "não consta na amostra"
   para qualquer código. E que a nota simulada e o auditor continuam achando o mapa (agora LH_CCLASSTRIB_MAPA).
   Uso: npm i --no-save jsdom && node prova_cclasstrib.js */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
let falhou = 0;
const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(66, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const ESPERADO = { '200': 54, '410': 38, '550': 25, '820': 9, '620': 7, '000': 5, '011': 5 };

function rodar(html) {
  return new Promise((ok) => {
    const w = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true,
      url: 'https://lionheartintelligence.com.br/app.html', virtualConsole: new VirtualConsole() }).window;
    w.fetch = () => new Promise(() => {});
    setTimeout(() => {
      const out = { erro: '' };
      try {
        const t = w.LH_CCLASSTRIB || {};
        const chaves = Object.keys(t).filter((k) => /^\d{6}$/.test(k));
        const porCst = {}; chaves.forEach((k) => { porCst[k.slice(0, 3)] = (porCst[k.slice(0, 3)] || 0) + 1; });
        out.total = chaves.length; out.csts = Object.keys(porCst).length; out.porCst = porCst;
        out.temMapaNoLugarErrado = !!t.mapa;
        out.mapa = !!(w.LH_CCLASSTRIB_MAPA && w.LH_CCLASSTRIB_MAPA.mapa && w.LH_CCLASSTRIB_MAPA.mapa.cheia);
        out.versao = w.LH_CCLASSTRIB_VERSAO || '';
        out.bares = typeof w.lhLerClassTrib === 'function' ? w.lhLerClassTrib('200047') : null;
        out.novo = t['550025'] || ''; out.setedig = Object.keys(t).some((k) => /^\d{7}$/.test(k));
        /* a nota simulada: um item padrão continua com 000 · 000001 e agora carrega a descrição oficial */
        const idx = (nome) => w.LH_CLASSIF_PRODUTOS.findIndex((p) => p.n === nome);
        try { w.abrirPagina('simnotas'); } catch (e) {}
        w.document.getElementById('snv_prod').value = String(idx('Comércio - Varejo Geral'));
        w.document.getElementById('snv_qtd').value = 1; w.document.getElementById('snv_vu').value = 100; w.snAddV();
        w.snvRender([{ ok: true, nota_de_venda: { ibs: 0.1, cbs: 8.7 }, tributo_velho: { valor: 0 } }], w.snvLerEntradas());
        const td = w.document.querySelector('#snv_lista td.sn-cod');
        out.tdTexto = td ? td.textContent.trim() : ''; out.tdTitle = td ? td.getAttribute('title') : '';
      } catch (e) { out.erro = e.message; }
      w.close(); ok(out);
    }, 8000);
  });
}
(async () => {
  console.log('\n-- a tabela oficial sobrevive ao carregamento --');
  const r = await rodar(APP);
  ex('carregou sem erro', !r.erro, r.erro);
  ex('LH_CCLASSTRIB tem 164 códigos de 6 dígitos', r.total === 164, String(r.total));
  ex('em 18 CST', r.csts === 18, String(r.csts));
  for (const c in ESPERADO) ex('CST ' + c + ' tem ' + ESPERADO[c] + ' códigos (distribuição publicada)', r.porCst[c] === ESPERADO[c], String(r.porCst[c]));
  ex('nenhum código de 7 dígitos (o 5100002 da versão antiga)', !r.setedig);
  ex('a tabela não foi trocada pelo mapa do auditor', !r.temMapaNoLugarErrado);
  ex('o mapa do auditor existe em LH_CCLASSTRIB_MAPA', r.mapa);
  ex('versão declarada', /22\/06\/2026/.test(r.versao), r.versao);
  ex('lhLerClassTrib(200047) = Bares e Restaurantes', !!r.bares && /Bares e Restaurantes/.test(r.bares.descricao), r.bares && r.bares.descricao);
  ex('lhLerClassTrib(200047) tem CST 200 e tratamento', !!r.bares && r.bares.cst === '200' && !!r.bares.tratamento);
  ex('código novo de junho/2026 presente (550025 Renaval)', /Renaval/.test(r.novo), r.novo);
  console.log('\n-- a nota simulada usa o mapa e a descrição oficial --');
  ex('item padrão → 000 · 000001', r.tdTexto === '000 · 000001', r.tdTexto);
  ex('o tooltip traz a descrição oficial do código', /tributadas integralmente/.test(r.tdTitle), r.tdTitle);
  console.log('\n-- ao contrário --');
  const sab = async (nome, alvo, troca, teste) => {
    if (APP.split(alvo).length !== 2) throw new Error('sabotagem "' + nome + '" não achou o alvo');
    const s = await rodar(APP.replace(alvo, troca)); ex(nome, teste(s), s.erro || JSON.stringify({ total: s.total, td: s.tdTexto }));
  };
  await sab('auditor volta a se chamar LH_CCLASSTRIB → a tabela some → reprova',
    'window.LH_CCLASSTRIB_MAPA = {\n versao:"IT 2025.002', 'window.LH_CCLASSTRIB = {\n versao:"IT 2025.002',
    (s) => s.total !== 164 || s.temMapaNoLugarErrado);
  await sab('um código a menos → reprova', " '550025':'", " '550025x':'", (s) => s.total !== 164);
  await sab('nota sem a tabela oficial → tooltip vazio → reprova', "if(typeof o==='string') r.oficial=o;", "if(false) r.oficial=o;",
    (s) => !/tributadas integralmente/.test(s.tdTitle));
  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado');
  process.exit(falhou ? 1 : 0);
})();
