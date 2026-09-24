/* PROVA DA TRILHA DE VÍDEOS · v855
   Segura: a ordem combinada, nenhum cartão "em breve", todo vídeo e capa existem
   no repositório, e as duas contagens (aba e tela inicial) dizem o número real.
   Uso: npm i --no-save jsdom && node prova_trilha.js */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
let falhou = 0;
const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(62, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const ORDEM = ['menu', 'backup', 'cadastro', 'centrais-analises', 'importar-documentos',
               'preencher-centrais', 'jornada-cliente', 'diagnostico', 'proposta', 'painel-escritorio'];
const w = new JSDOM(APP, { runScripts: 'dangerously', pretendToBeVisual: true,
  url: 'https://lionheartintelligence.com.br/app.html', virtualConsole: new VirtualConsole() }).window;
setTimeout(() => {
  const pg = w.document.getElementById('page-videos');
  const vids = [...pg.querySelectorAll('video source')].map((s) => s.getAttribute('src').replace(/^video\/|\.mp4$/g, ''));
  console.log('\n-- trilha de vídeos --');
  ex('10 vídeos na ordem combinada', JSON.stringify(vids) === JSON.stringify(ORDEM), vids.join(','));
  ex('nenhum cartão "em breve"', !/em breve/i.test(pg.textContent));
  /* só a linha do rótulo: div sem filhos cujo texto começa com VÍDEO */
  const rot = [...pg.querySelectorAll('div')].filter((d) => !d.children.length)
    .map((d) => d.textContent.trim()).filter((t) => /^VÍDEO \d+ · /.test(t));
  ex('rótulos numerados de 1 a 10, sem repetir', rot.length === 10 && rot.every((t, i) => t.startsWith('VÍDEO ' + (i + 1) + ' · ')), rot.join(' | '));
  const falta = ORDEM.flatMap((a) => [a + '.mp4', a + '-capa.jpg']).filter((f) => !fs.existsSync(path.join(__dirname, 'video', f)));
  ex('todo vídeo e toda capa existem em video/', falta.length === 0, falta.join(', '));
  const grandes = ORDEM.filter((a) => fs.statSync(path.join(__dirname, 'video', a + '.mp4')).size > 25e6);
  ex('nenhum vídeo acima de 25 MB', grandes.length === 0, grandes.join(', '));
  try { w.abrirPagina('videos'); } catch (e) {}
  setTimeout(() => {
    const txt = w.document.body.textContent;
    ex('a aba diz "10 vídeos disponíveis"', /10 vídeos disponíveis/.test(txt));
    const ini = w.document.getElementById('lh-inicio-videos-conta');
    ex('a tela inicial diz 10 vídeos', !!ini && /^10 vídeos/.test(ini.textContent.trim()), ini && ini.textContent);
    console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado');
    process.exit(falhou ? 1 : 0);
  }, 1500);
}, 8000);
