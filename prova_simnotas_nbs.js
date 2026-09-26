/* PROVA DO SERVIÇO (NBS) NA NOTA SIMULADA · v863
   1. escolher um serviço do grupo "⌘ SERVIÇOS (NBS)" na nota de venda NÃO estoura (antes: reading 'n');
   2. hospedagem (NBS 1.0303.11.00, base diz "nd") entra como −40% (15,9%) e sai 200 · 200048;
   3. um NBS sem regime mapeado entra na regra geral (26,5%) com o aviso "confira" na tela;
   4. item escolhido pela base NCM carrega o balde: alimento −60% sai 200 · 200034 (antes: 000 · 000001).
   Uso: npm i --no-save jsdom && node prova_simnotas_nbs.js */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
let falhou = 0;
const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(70, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
function rodar(html) {
  return new Promise((ok) => {
    const w = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true,
      url: 'https://lionheartintelligence.com.br/app.html', virtualConsole: new VirtualConsole() }).window;
    w.fetch = () => new Promise(() => {}); w.HTMLElement.prototype.scrollIntoView = function () {};
    setTimeout(() => {
      const d = w.document, $ = (id) => d.getElementById(id), out = { erro: '', add: {} };
      try {
        try { w.abrirPagina('simnotas'); } catch (e) {}
        setTimeout(() => {
          try {
            const sel = $('snv_prod');
            const opt = (re) => [...sel.options].find((o) => String(o.value).indexOf('NBS:') === 0 && re.test(o.textContent));
            const add = (o, vu) => { w.SN_V.length = 0; sel.value = o.value; sel.dispatchEvent(new w.Event('change')); $('snv_qtd').value = 1; $('snv_vu').value = vu; let e = ''; try { w.snAddV(); } catch (x) { e = x.message; } return { erro: e, it: w.SN_V[0], av: ($('snv_ncmav') || {}).textContent || '' }; };
            out.nOpt = [...sel.options].filter((o) => String(o.value).indexOf('NBS:') === 0).length;
            const h = opt(/hospedagem em quartos/i); out.hospLabel = h ? h.textContent : '';
            out.add.hosp = h ? add(h, 500) : { erro: 'opção não achada' };
            const nd = opt(/constru[cç][aã]o de edifica[cç][oõ]es residenciais de um/i); out.ndLabel = nd ? nd.textContent : '';
            out.add.nd = nd ? add(nd, 1000) : { erro: 'opção não achada' };
            const nc = [...sel.options].find((o) => String(o.value).indexOf('NCM:') === 0 && /red|60%|Redu/i.test(o.textContent) && /1006|arroz|carne|leite|queijo|frango/i.test(o.textContent));
            out.ncmLabel = nc ? nc.textContent : '';
            out.add.ncm = nc ? add(nc, 100) : { erro: 'opção não achada' };
            ['hosp', 'nd', 'ncm'].forEach((k) => { const it = out.add[k].it; if (it) { const c = w.snCodigos(it); out.add[k].cod = c.cst + ' · ' + c.cclass; out.add[k].aliq = it.aliq; out.add[k].nome = it.nome; out.add[k].b = it.b; delete out.add[k].it; } });
          } catch (e) { out.erro = e.message + ' ' + (e.stack || '').split('\n')[1]; }
          w.close(); ok(out);
        }, 3200);
      } catch (e) { out.erro = e.message; w.close(); ok(out); }
    }, 8000);
  });
}
(async () => {
  const r = await rodar(APP);
  ex('carregou sem erro', !r.erro, r.erro);
  if (!r.erro) {
    ex('o seletor da nota tem o grupo de serviços NBS (> 900)', r.nOpt > 900, String(r.nOpt));
    console.log('\n-- hospedagem (NBS 1.0303.11.00, base "nd") --');
    ex('adicionar não estoura', !r.add.hosp.erro, r.add.hosp.erro);
    ex('entra como −40% (15,9%)', r.add.hosp.aliq === 15.9, String(r.add.hosp.aliq));
    ex('código 200 · 200048 (hotelaria)', r.add.hosp.cod === '200 · 200048', r.add.hosp.cod);
    ex('o nome traz o NBS', /NBS 1\.0303\.11\.00/.test(r.add.hosp.nome || ''), r.add.hosp.nome);
    ex('o rótulo do dropdown mostra 15,9%', /15,9%/.test(r.hospLabel), r.hospLabel.slice(-40));
    console.log('\n-- NBS sem regime mapeado (construção residencial) --');
    ex('adicionar não estoura', !r.add.nd.erro, r.add.nd.erro);
    ex('entra na regra geral (26,5%)', r.add.nd.aliq === 26.5, String(r.add.nd.aliq));
    ex('código 000 · 000001', r.add.nd.cod === '000 · 000001', r.add.nd.cod);
    ex('a tela avisa "confira" e "regra geral"', /confira/i.test(r.add.nd.av) && /regra geral/i.test(r.add.nd.av), r.add.nd.av.slice(0, 100));
    ex('o rótulo do dropdown diz "regra geral — confira"', /regra geral — confira/.test(r.ndLabel), r.ndLabel.slice(-50));
    console.log('\n-- item da base NCM (−60%) --');
    ex('adicionar não estoura', !r.add.ncm.erro, r.add.ncm.erro + ' ' + r.ncmLabel.slice(0, 60));
    ex('carrega o balde 60', r.add.ncm.b === '60', String(r.add.ncm.b));
    ex('código 200 · 2000xx (não 000001)', /^200 · 2000/.test(r.add.ncm.cod || ''), r.add.ncm.cod);
  }
  console.log('\n-- ao contrário --');
  const sab = async (nome, alvo, troca, teste) => {
    if (APP.split(alvo).length !== 2) throw new Error('sabotagem "' + nome + '" não achou o alvo');
    const s = await rodar(APP.replace(alvo, troca)); ex(nome, !s.erro && teste(s), s.erro);
  };
  await sab('camada removida do SN_DA_BASE → serviço volta a estourar → reprova',
    "if(sel && String(sel.value).indexOf('NBS:')===0){\n     var x=achaNBS(sel.value);", "if(false){\n     var x=achaNBS(sel.value);",
    (s) => !!s.add.hosp.erro);
  await sab('família de hotelaria apagada → hospedagem cai na regra geral → reprova',
    "trat:'red40', art:'Arts. 277-283 LC 214 — hotelaria (−40%, sem crédito ao cliente)'", "trat:'cheia', art:'x'",
    (s) => s.add.hosp.aliq !== 15.9 || s.add.hosp.cod !== '200 · 200048');
  await sab('balde não gravado no item da base → alimento sai 000001 → reprova',
    "it.b=BALDE[b.trat]||'PADRAO';", "it.b='PADRAO';",
    (s) => !/^200 · 2000/.test(s.add.ncm.cod || ''));
  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado');
  process.exit(falhou ? 1 : 0);
})();
