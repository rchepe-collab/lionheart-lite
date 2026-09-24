/* PROVA DO SUPORTE · v856
   Segura: o botão existe na barra do topo; texto curto não envia; a mensagem
   vai para o WhatsApp do suporte com quem é, plano, tela e o problema; e NÃO
   leva dado do cliente do escritório (nome da empresa, valores digitados).
   Uso: npm i --no-save jsdom && node prova_suporte.js */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
let falhou = 0;
const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(64, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const TOKEN = b64({ alg: 'none' }) + '.' + b64({ email: 'joana@escritorio-teste.com.br' }) + '.x';
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function rodar(html, bloqueia) {
  const w = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true,
    url: 'https://lionheartintelligence.com.br/app.html', virtualConsole: new VirtualConsole(),
    /* chaves com o carimbo do produto, como o login grava de verdade */
    beforeParse(w) { w.localStorage.setItem('LHCORE::lh_token', TOKEN); w.localStorage.setItem('LHCORE::lh_nome', 'Joana Teste'); w.localStorage.setItem('LHCORE::lh_plano', 'core'); } }).window;
  await espera(8000);
  const abertas = []; const hrefAntes = w.location.href;
  w.open = (u) => { abertas.push(u); return bloqueia ? null : {}; };
  const r = {};
  r.botao = !!w.document.querySelector('.topbar #lh-sup-btn');
  /* dado do cliente do escritório na tela: tem de ficar de fora */
  w.abrirPagina('c05'); await espera(300);
  const fat = w.document.getElementById('c05_fat'); if (fat) fat.value = '9876543';
  w.lhSupAbrir();
  r.abriu = w.document.getElementById('lhSupModal').style.display === 'flex';
  w.document.getElementById('lh-sup-oque').value = 'erro';
  w.lhSupEnviar();
  r.curtoBarrado = abertas.length === 0 && /Conte em uma frase/.test(w.document.getElementById('lh-sup-msg').textContent);
  w.document.getElementById('lh-sup-oque').value = 'Importei o PGDAS e o faturamento ficou zerado';
  w.document.getElementById('lh-sup-esperava').value = 'o faturamento preenchido';
  w.lhSupEnviar();
  r.url = abertas[0] || '';
  r.msg = r.url ? decodeURIComponent(r.url.split('?text=')[1] || '') : '';
  r.ficouNaFerramenta = w.location.href === hrefAntes;
  r.avisoBloqueio = /bloqueou a janela/.test(w.document.getElementById('lh-sup-msg').textContent);
  w.close();
  return r;
}
(async () => {
  console.log('\n-- suporte pelo WhatsApp --');
  const r = await rodar(APP, false);
  ex('botão "Suporte" na barra do topo', r.botao);
  ex('o botão abre o formulário', r.abriu);
  ex('texto curto demais não envia e explica por quê', r.curtoBarrado);
  ex('vai para o WhatsApp do suporte (53) 99982-3848', /^https:\/\/wa\.me\/5553999823848\?text=/.test(r.url), r.url.slice(0, 60));
  ex('a mensagem diz quem é: nome, e-mail e plano', /Joana Teste/.test(r.msg) && /joana@escritorio-teste\.com\.br/.test(r.msg) && /plano core/.test(r.msg), r.msg);
  ex('a mensagem diz a tela', /Tela: .*Regime/i.test(r.msg), r.msg.split('\n')[2]);
  ex('a mensagem leva o problema e o esperado', /faturamento ficou zerado/.test(r.msg) && /Esperava:\* o faturamento preenchido/.test(r.msg));
  ex('NÃO leva valor digitado na calculadora', !/9876543/.test(r.msg));
  ex('não tira a pessoa da ferramenta', r.ficouNaFerramenta);
  const b = await rodar(APP, true);
  ex('pop-up bloqueado: avisa e oferece o link, sem sair da ferramenta', b.avisoBloqueio && b.ficouNaFerramenta);
  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado');
  process.exit(falhou ? 1 : 0);
})();
