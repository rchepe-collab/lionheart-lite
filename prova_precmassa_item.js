/* PROVA DO CARTÃO "UM ITEM" — a Formação de Preço dentro da Precificação em Massa · v879
   1. o menu "Formação de Preço" abre a página da Precificação em Massa (mesmo motor) com o cartão do item;
   2. parafuso (100, custo 60, ICMS 18, Presumido): classifica pelo NCM (integral, 000 · 000001), 2027 = 103,96 com IBS/CBS 6,89
      sobre os 78,35 (art. 12 §2º V) e ICMS 18,71; 2033 = 99,11; conta aberta igual à do catálogo; os três caminhos;
   3. NBS de hospedagem → −40% (200 · 200048) e a descrição vem da base; combustível ad rem → recusa explicada;
   4. sem NCM → regra geral; o exemplo do encontro (R$ 100, ICMS 17) roda;
   5. o cartão usa o que está em "Como você vende" (regime, estratégia, leitura): Simples → preço não muda; leitura PLP → 102,44.
   Uso: npm i --no-save jsdom && node prova_precmassa_item.js */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
let falhou = 0;
const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(82, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const perto = (a, b, t) => Math.abs((+a) - (+b)) <= (t === undefined ? 0.011 : t);
function rodar(html) {
  return new Promise((ok) => {
    const w = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://lionheartintelligence.com.br/app.html', virtualConsole: new VirtualConsole() }).window;
    w.fetch = () => new Promise(() => {}); w.HTMLElement.prototype.scrollIntoView = function () {}; w.scrollTo = function () {};
    setTimeout(() => {
      const out = { erro: '' };
      try {
        const d = w.document, $ = (id) => d.getElementById(id), S = (id, v) => { const e = $(id); if (e) e.value = v; };
        w.abrirPagina('formpreco');
        out.ativa = [...d.querySelectorAll('.page.active')].map((p) => p.id);
        const kp = () => [...$('pmi_res').querySelectorAll('.kpi-card')].map((e) => e.textContent.replace(/\s+/g, ' ').trim());
        const linhas = () => [...$('pmi_res').querySelectorAll('tbody tr')].filter((x) => x.querySelectorAll('td').length).map((x) => [...x.querySelectorAll('td')].map((c) => c.textContent.trim()));
        S('pmi_cod', '73181500'); S('pmi_desc', 'PARAFUSO SEXTAVADO'); S('pmi_preco', 100); S('pmi_custo', 60); S('pmi_icms', 18); S('pm_regime', 'presumido'); S('pm_estr', 'fica'); S('pm_leitura', 'fisco');
        w.lhPmItemClassifica(); out.classe = $('pmi_class').textContent; w.lhPmItem(); out.kpi = kp(); out.linhas = linhas(); out.caminhos = [...$('pmi_res').querySelectorAll('div[style*="border-radius:12px"] > div:first-child')].map((e) => e.textContent);
        out.html = $('pmi_res').innerHTML;
        S('pm_leitura', 'plp'); w.lhPmItem(); out.kpiPlp = kp(); S('pm_leitura', 'fisco');
        S('pm_regime', 'simples'); w.lhPmItem(); out.kpiSn = kp(); S('pm_regime', 'presumido');
        S('pmi_cod', '1.0303.11.00'); S('pmi_desc', ''); w.lhPmItemClassifica(); out.nbs = { classe: $('pmi_class').textContent, desc: $('pmi_desc').value };
        S('pmi_cod', '27101259'); S('pmi_desc', 'GASOLINA'); w.lhPmItemClassifica(); w.lhPmItem(); out.adrem = $('pmi_res').textContent;
        S('pmi_cod', ''); S('pmi_desc', 'coisa qualquer'); out.semNcm = w.lhPmItemClassifica();
        S('pmi_cod', '10063021'); S('pmi_desc', 'ARROZ TIPO 1'); w.lhPmItemClassifica(); out.arroz = $('pmi_class').textContent;
        w.lhPmItemExemplo(); out.exemplo = kp();
        w.abrirPagina('precmassa'); out.precmassaSoItem = $('page-precmassa').classList.contains('pm-so-item');
      } catch (e) { out.erro = e.message + ' ' + (e.stack || '').split('\n')[1]; }
      w.close(); ok(out);
    }, 9000);
  });
}
(async () => {
  const r = await rodar(APP);
  ex('carregou sem erro', !r.erro, r.erro);
  if (!r.erro) {
    ex('"Formação de Preço" abre a página da Precificação em Massa (uma página, um motor)', r.ativa.join(',') === 'page-precmassa', r.ativa.join(','));
    ex('parafuso classificado pelo NCM: integral · 000 · 000001', /Tributação integral/.test(r.classe) && /000 · 000001/.test(r.classe), r.classe.slice(0, 100));
    ex('KPI hoje 100,00 · fica 78,35 · lucro 18,35', /Hoje100,00fica 78,35 · lucro 18,35/.test(r.kpi[0]), r.kpi[0]);
    ex('KPI 2027: 103,96 · IBS/CBS 6,89 fora · ICMS/ISS 18,71 dentro (art. 12 §2º V)', /103,96IBS\/CBS 6,89 fora · ICMS\/ISS 18,71 dentro/.test(r.kpi[1]), r.kpi[1]);
    ex('KPI 2033: 99,11 (−0,89%) · fica 78,35 · lucro 20,54', /99,11-0,89% · fica 78,35 · lucro 20,54/.test(r.kpi[2]), r.kpi[2]);
    ex('KPI líquido PJ 2033 = 78,35, recupera 20,76', /78,35o cliente regular recupera 20,76/.test(r.kpi[3]), r.kpi[3]);
    ex('os três caminhos: segurar · repassar · dividir (repasse 50%)', r.caminhos.length === 3 && /Segurar/.test(r.caminhos[0]) && /Repassar/.test(r.caminhos[1]) && /Dividir \(repasse 50%\)/.test(r.caminhos[2]), r.caminhos.join(' | '));
    ex('dividir: preço 99,56 (metade da diferença)', /99,56/.test(r.html), '');
    const l27 = r.linhas.find((l) => l[0] === '2027') || [], l33 = r.linhas.find((l) => l[0] === '2033') || [];
    ex('conta aberta 2027: 18% · 0 (CBS substitui) · 97,06 · 8,8% = 6,89 · 103,96 · 78,35 · custo 57,81 · lucro 20,54', l27[1] === '18%' && l27[3] === '97,06' && /6,89/.test(l27[4]) && l27[5] === '103,96' && l27[7] === '57,81' && l27[8] === '20,54', l27.join(' | '));
    ex('conta aberta 2033: 0% · 78,35 · 26,5% = 20,76 · 99,11', l33[1] === '0%' && l33[3] === '78,35' && /20,76/.test(l33[4]) && l33[5] === '99,11', l33.join(' | '));
    ex('leitura PLP muda o 2027 para 102,44 (dupla exclusão)', /102,44/.test(r.kpiPlp[1]), r.kpiPlp[1]);
    ex('Simples: o preço não muda (100,00 em 2027 e 2033)', /100,00/.test(r.kpiSn[1]) && /100,00/.test(r.kpiSn[2]), r.kpiSn[1] + ' ' + r.kpiSn[2]);
    ex('NBS 1.0303.11.00 → −40% · 200 · 200048, descrição da base', /Redução 40%/.test(r.nbs.classe) && /200 · 200048/.test(r.nbs.classe) && /hospedagem/i.test(r.nbs.desc), r.nbs.classe.slice(0, 80) + ' / ' + r.nbs.desc);
    ex('gasolina (ad rem) → recusa explicada', /não se precifica pela alíquota geral/.test(r.adrem) && /ad rem/.test(r.adrem), r.adrem.slice(0, 120));
    ex('sem NCM → regra geral (cheia, art. 14)', r.semNcm && r.semNcm.trat === 'cheia' && /regra geral/.test(r.semNcm.fonte), JSON.stringify(r.semNcm));
    ex('arroz (1006.30.21) → cesta básica, alíquota zero · 200 · 200003', /Alíquota ZERO/.test(r.arroz) && /200 · 200003/.test(r.arroz), r.arroz.slice(0, 100));
    ex('exemplo do encontro (R$ 100 · ICMS 17): roda, 2027 = 104,02', /104,02/.test(r.exemplo[1]), r.exemplo[1]);
    ex('abrir "Precificação em Massa" mostra a página inteira (sem o modo só-item)', r.precmassaSoItem === false, String(r.precmassaSoItem));
  }
  console.log('\n-- ao contrário --');
  const sab = async (nome, alvo, troca, teste) => {
    if (APP.split(alvo).length !== 2) throw new Error('sabotagem "' + nome + '" não achou o alvo');
    const s = await rodar(APP.replace(alvo, troca)); ex(nome, !s.erro && teste(s), s.erro);
  };
  await sab('o item deixa de classificar pelo NCM (cmBuscaTrat ignorado) → arroz vira integral → reprova', "var t=(typeof cmBuscaTrat==='function')?cmBuscaTrat(dig,desc):null;", "var t=null;",
    (s) => !/Alíquota ZERO/.test(s.arroz || ''));
  await sab('o cartão deixa de usar o motor do catálogo (lhPmCalcular) → sem conta aberta → reprova', "var c=window.lhPmCalcular(f,cfg); if(!c.anos[2033])", "var c={anos:{}}; if(true)",
    (s) => !(s.linhas && s.linhas.length));
  await sab('"Formação de Preço" volta a abrir a página antiga → reprova', "if(id==='formpreco'){\n     var lib=true;", "if(false){\n     var lib=true;",
    (s) => s.ativa.join(',') !== 'page-precmassa');
  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado');
  process.exit(falhou ? 1 : 0);
})();
