/* PROVA v907 — páginas públicas do site: simples-hibrido.html (mini app Dentro × Híbrido) e roteiro-teste.html.
   Abrem como documento completo, rodam o script (a faixa "sem JS" some), os casos e os anos recalculam, as abas trocam.
   Uso: npm i --no-save jsdom && node prova_paginas_publicas.js */
const { JSDOM, VirtualConsole } = require('jsdom'); const fs = require('fs'), path = require('path');
let falhou = 0; const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(86, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const abre = (f) => new JSDOM(fs.readFileSync(path.join(__dirname, f), 'utf8'), { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://lionheartintelligence.com.br/' + f, virtualConsole: new VirtualConsole() }).window;
const s = abre('simples-hibrido.html'), d = s.document;
ex('simples-hibrido: documento completo (doctype, viewport, título) e sem dado de cliente', /^<!doctype html>/i.test(fs.readFileSync(path.join(__dirname, 'simples-hibrido.html'), 'utf8')) && !!d.querySelector('meta[name=viewport]') && d.title === 'Simples ou Híbrido 2027');
ex('o script roda: a faixa "sem JS" fica escondida e o resultado aparece', d.getElementById('semJS').hidden === true && /R\$/.test(d.getElementById('dTot').textContent));
d.querySelector('[data-caso="loja"]').click(); const loja = d.getElementById('vTit').textContent;
d.querySelector('[data-caso="distrib"]').click(); const dist = d.getElementById('vTit').textContent;
ex('casos recalculam: loja → ficar dentro; distribuidora → híbrido; caso marcado e "Caso em uso"', /dentro/i.test(loja) && /híbrido/i.test(dist) && d.querySelector('[data-caso="distrib"]').getAttribute('aria-pressed') === 'true' && /Distribuidora/.test(d.getElementById('casoUso').textContent), loja + ' | ' + dist);
const das27 = d.getElementById('hDas').textContent; d.querySelector('#anos [data-ano="2033"]').click();
ex('trocar o ano muda o DAS do híbrido e a alíquota por fora (2033 = 26,5)', d.getElementById('hDas').textContent !== das27 && d.getElementById('ref').value === '26.5');
d.getElementById('tab-aprender').click();
ex('as abas trocam (Aprendizado visível, Na prática escondida) e a tabela do DAS tem 7 anos', d.getElementById('pratica').hidden && !d.getElementById('aprender').hidden && d.querySelectorAll('#fatiaTb tr').length === 7);
const r = abre('roteiro-teste.html'), rd = r.document;
ex('roteiro-teste: roda, 15 exercícios, faixa "sem JS" escondida', rd.getElementById('semJS').hidden === true && rd.querySelectorAll('section.ex').length === 15);
console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado'); process.exit(falhou ? 1 : 0);
