/* PROVA v924/v925 — ITFE etapa 3: O que é obrigatório (piso), Diagnóstico, Plano de Ação (5W2H) e Radar de Prazos,
   trazidos do ITFE v194. Confere:
   1. as 4 telas no menu do ITFE (pilar "Diagnóstico & Plano") e fora do menu do CORE;
   2. o paywall do CORE (LH_PLANO) continua inteiro — o plano 5W2H se chama LH_PLANO5W2H;
   3. prazos do Simples iguais aos da tela Dentro × Híbrido (15/10, 30/10, 20/12/2026), nada de setembro/30/11;
   4. nenhuma menção a Fecomércio, Carlos ou citação de lei nas 4 telas;
   5. o segmento do ITFE vira o setor do diagnóstico e do piso (agro incluído);
   6. o diagnóstico respondido vira plano e o plano puxa as pendências.
   Uso: npm i --no-save jsdom && node prova_etapa3.js */
const { JSDOM, VirtualConsole } = require('jsdom'); const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
const EMP = fs.readFileSync(path.join(__dirname, 'empresario.html'), 'utf8');
let falhou = 0; const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(82, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const abre = (html, url) => { const w = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url, virtualConsole: new VirtualConsole(),
    beforeParse(win) { try { win.localStorage.setItem('LHCORE::lh_token', 'x.eyJlbWFpbCI6InRAdC5jb20ifQ.x'); win.sessionStorage.setItem('lh_logado', 'sim'); } catch (e) {} } }).window;
  w.fetch = () => new Promise(() => {}); w.HTMLElement.prototype.scrollIntoView = function () {}; w.scrollTo = function () {}; return w; };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const idDo = (el) => ((el.getAttribute('onclick') || '').match(/abrirPagina\(\s*['"]([\w-]+)['"]/) || [])[1];
const PGS = ['piso', 'diagnostico', 'plano', 'prazos'];
const PGS25 = ['jornadaemp', 'swot', 'fichacontador'];
(async () => {
  const E = abre(EMP, 'https://lionheartintelligence.com.br/empresario.html');
  const C = abre(APP, 'https://lionheartintelligence.com.br/app.html');
  await espera(15000);
  console.log('--- PROVA: ITFE etapa 3 (v924) ---');
  const navE = E.document.querySelector('nav.nav-section');
  const tit = [...navE.querySelectorAll('.nav-group-title[data-pcp]')].find((t) => /DIAGN/i.test(t.textContent));
  const itensE = [...navE.querySelectorAll('.nav-item[data-pcp]')].map(idDo);
  ex('ITFE: pilar "Diagnóstico & Plano" com as 4 telas', !!tit && PGS.every((p) => itensE.includes(p)), itensE.join(','));
  const itensC = [...C.document.querySelectorAll('nav.nav-section .nav-item[onclick]')].map(idDo);
  ex('CORE: as 4 telas não aparecem no menu', PGS.every((p) => !itensC.includes(p)));
  for (const W of [E, C]) ex((W === E ? 'ITFE' : 'CORE') + ': paywall LH_PLANO intacto e plano em LH_PLANO5W2H', typeof W.LH_PLANO.liberado === 'function' && typeof W.LH_PLANO.cardConvite === 'function' && Array.isArray(W.LH_PLANO5W2H));
  /* prazos */
  E.abrirPagina('prazos'); await espera(900);
  const tz = E.document.getElementById('page-prazos').textContent;
  ex('prazos: opção pelo Simples 15/10, híbrido 30/10 e cancelamento até 20/12/2026', /15\/10\/2026/.test(tz) && /30\/10\/2026/.test(tz) && /20\/12\/2026/.test(tz));
  ex('prazos: sem a janela velha de setembro nem o 30/11', !/30\/09\/2026|30\/11\/2026|01–30\/09/.test(tz));
  const ds = E.LH_PRAZOS.map((p) => p.d); ex('prazos: linha do tempo em ordem de data', ds.every((d, i) => i === 0 || ds[i - 1] <= d));
  /* segmento → setor */
  E.LH_EMP_SEGMENTO('agro'); E.localStorage.removeItem('LHCORE::lh_diag2'); E.localStorage.removeItem('lh_diag2'); E.__psRamoManual = false;
  E.abrirPagina('piso'); await espera(900);
  ex('piso: segmento Agro vira o setor Agro', E.LH_ADEQ_RAMO === 'agro' && !!E.document.querySelector('#piso_host .ps-b.on') && /Agro/.test([...E.document.querySelectorAll('#piso_host .ps-b.on')].map((b) => b.textContent).join(' ')));
  E.abrirPagina('diagnostico'); await espera(1200);
  ex('diagnóstico: segmento Agro vira o setor Agro', /Agro/.test((E.document.querySelector('#dg2_host .dg2-st.on') || {}).textContent || ''));
  E.LH_EMP_SEGMENTO('servicos'); E.LH_EMP_SUBRAMO('turismo'); E.localStorage.removeItem('LHCORE::lh_diag2'); E.localStorage.removeItem('lh_diag2');
  E.abrirPagina('diagnostico'); await espera(1200);
  ex('diagnóstico: Serviços · Hotelaria e turismo vira Turismo', /Turismo/.test((E.document.querySelector('#dg2_host .dg2-st.on') || {}).textContent || ''));
  /* texto: nada de Fecomércio, Carlos, lei */
  for (const p of PGS) { E.abrirPagina(p); await espera(700);
    const t = E.document.getElementById('page-' + p).textContent;
    ex(p + ': sem Fecomércio/Carlos/encontro e sem citação de lei', !/Fecom|Carlos|encontro|LC 214|Tema 69|Res\. CGSN|ADCT|Decreto \d/.test(t), (t.match(/.{30}(Fecom|Carlos|encontro|LC 214|Tema 69|Res\. CGSN|ADCT|Decreto \d).{30}/) || [])[0]); }
  /* diagnóstico → plano */
  E.abrirPagina('diagnostico'); await espera(900);
  const vistos = {}; [...E.document.querySelectorAll('#dg2_host [onclick^="dg2Resp"]')].forEach((b) => { const m = b.getAttribute('onclick').match(/dg2Resp\('([^']+)',\s*(\d+)/); if (m && !vistos[m[1]] && m[2] === '0') { vistos[m[1]] = 1; E.dg2Resp(m[1], 0); } });
  await espera(600);
  const pl = E.LH_DIAG2.plano();
  ex('diagnóstico respondido gera plano com selo (resolve/orienta/fora)', pl.length > 5 && pl.every((a) => ['resolve', 'orienta', 'fora'].includes(a.selo)), pl.length + ' ações');
  const permit = new Set(itensE.concat(['pcp-bemvindo', 'precmassa', 'prazos']));
  const fora = pl.filter((a) => a.calc && !permit.has(a.calc)).map((a) => a.calc);
  ex('toda ação com calculadora aponta para uma tela do ITFE', fora.length === 0, fora.join(','));
  ex('nenhuma ação de recuperação de crédito "resolvida" pela ferramenta', !pl.some((a) => /recupera/i.test(a.txt) && a.selo === 'resolve'));
  E.abrirPagina('plano'); await espera(600); E.lhImportarDiagPlano(); await espera(600);
  ex('Plano de Ação puxa as pendências do diagnóstico', E.LH_PLANO5W2H.length >= pl.length, E.LH_PLANO5W2H.length + ' no plano');
  ex('Plano de Ação tem o botão do piso obrigatório', /piso obrigatório/i.test(E.document.getElementById('page-plano').textContent));
  console.log('--- v925: Jornada, Quadro Estratégico e Pedir dados ao contador ---');
  ex('ITFE: Jornada, Quadro Estratégico e Pedir dados ao contador no menu', PGS25.every((p) => itensE.includes(p)));
  ex('CORE: as 3 telas não aparecem no menu e não há LH_PCP_PODE', PGS25.every((p) => !itensC.includes(p)) && typeof C.LH_PCP_PODE === 'undefined');
  for (const [seg, st, deve] of [['industria', 'industria', /CAPEX/], ['agro', 'agro', /Funrural/]]) {
    E.LH_EMP_SEGMENTO(seg); E.abrirPagina('pcp-bemvindo'); E.abrirPagina('jornadaemp'); await espera(5500);
    const sel = E.document.getElementById('je_setor'), pg = E.document.getElementById('page-jornadaemp');
    const linhas = [...pg.querySelectorAll('#je_matriz_core .jm-svc')];
    const pids = [...pg.querySelectorAll('[data-pid]')].map((x) => x.getAttribute('data-pid'));
    ex('Jornada · ' + seg + ': setor vem do segmento e a matriz traz ' + deve.source, sel.value === st && linhas.length > 8 && deve.test(linhas.map((l) => l.textContent).join('|')), sel.value + ' · ' + linhas.length + ' linhas');
    ex('Jornada · ' + seg + ': nenhum link para tela trancada no ITFE', pids.length > 0 && pids.every((p) => E.LH_PCP_PODE(p)), pids.filter((p) => !E.LH_PCP_PODE(p)).join(','));
    ex('Jornada · ' + seg + ': sem Fecomércio, "setembro" ou lei', !/Fecom|setembro|Lei 15|17 regimes/.test(pg.textContent));
  }
  /* Quadro Estratégico: Forças e Fraquezas saem do diagnóstico novo */
  E.abrirPagina('diagnostico'); await espera(600); E.dg2Setor('agro'); await espera(400);
  E.abrirPagina('swot'); await espera(600);
  const sw = E.document.getElementById('page-swot').textContent, sc = E.LH_DIAG2.score();
  const fracas = Object.keys(sc.porBloco).filter((b) => sc.porBloco[b].respondidas && sc.porBloco[b].pct < 40).map((b) => E.LH_DIAG2.blocos[b].n);
  ex('Quadro Estratégico: Forças/Fraquezas vêm das notas do diagnóstico (' + sc.respondidas + ' respostas)', sc.respondidas > 0 && /respondidas/.test(sw) && fracas.every((n) => sw.includes(n + ' atrasada')), fracas.join(','));
  ex('Quadro Estratégico: fraquezas trazem as ações que faltam do plano', E.LH_DIAG2.plano().slice(0, 4).every((a) => sw.includes('Falta: ' + a.txt)));
  ex('Quadro Estratégico: oportunidades e ameaças do setor (agro)', /Insumos agropecuários/.test(sw) && /caixa da safra/.test(sw));
  /* Ficha do contador: só as telas do ITFE */
  E.abrirPagina('fichacontador'); await espera(500); E.fcPreview(); await espera(200);
  const prev = E.document.getElementById('fc_preview').textContent, nC = +((prev.match(/Completa:\s*(\d+)/) || [])[1] || 0);
  ex('Pedir dados ao contador: lista só campos das telas do ITFE', nC > 50 && nC < 700, nC + ' campos');
  ex('Pedir dados ao contador: inclui os Dados da Empresa (DRE)', /Dados da Empresa/.test(prev) || [...E.document.querySelectorAll('#page-fin_dados input')].length > 0);
  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado'); process.exit(falhou ? 1 : 0);
})();
