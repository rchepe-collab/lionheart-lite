/* PROVA DA CADEIA DE CRÉDITO · v870 — um estado, três telas, uma leitura de documentos
   1. espelho: o que se digita no Regime Ótimo aparece no Dentro × Híbrido e na Cadeia (e vice-versa), sem loop;
   2. leitura de documentos: entrada pelo CRT/CPF do emitente das notas de compra; saída pelo CPF × CNPJ × exterior do
      destinatário das notas de venda (regime do PJ estimado pela fatia manual); escreve nas três telas de uma vez;
   3. a conta: creditável = regular + importação + 20% do Simples; crédito perdido = 80% do Simples + PF;
   4. a Precificação usa a parcela creditável no custo do ano;
   5. persistência no navegador e "adotar" (não apaga o que a tela já tinha);
   6. a página renderiza o retrato com a origem de cada lado.
   Uso: npm i --no-save jsdom && node prova_cadeia.js */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
let falhou = 0;
const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(74, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const perto = (a, b, t) => Math.abs((+a) - (+b)) <= (t === undefined ? 0.06 : t);
const EMP = '11222333000181';
const NOTAS = [
  { emitCNPJ: EMP, destCPF: '12345678901', destCNPJ: '', vProd: 400, idDest: '1' },
  { emitCNPJ: EMP, destCNPJ: '99888777000155', vProd: 500, idDest: '1' },
  { emitCNPJ: EMP, destCNPJ: '99888777000199', vProd: 100, idDest: '3', destUF: 'EX' },
  { emitCNPJ: '55666777000100', emitCRT: '3', destCNPJ: EMP, vProd: 800 },
  { emitCNPJ: '55666777000200', emitCRT: '1', destCNPJ: EMP, vProd: 150 },
  { emitCPF: '98765432100', destCNPJ: EMP, vProd: 50 }];
function rodar(html, pre) {
  return new Promise((ok) => {
    const w = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://lionheartintelligence.com.br/app.html', virtualConsole: new VirtualConsole() }).window;
    w.fetch = () => new Promise(() => {}); w.HTMLElement.prototype.scrollIntoView = function () {}; w.scrollTo = function () {};
    if (pre) pre(w);
    setTimeout(() => {
      const out = { erro: '' }; const $ = (id) => w.document.getElementById(id); const v = (id) => ($(id) || {}).value;
      const dig = (id, val) => { const e = $(id); e.value = String(val); e.dispatchEvent(new w.Event('input')); };
      try {
        w.abrirPagina('c05');
        setTimeout(() => {
          try {
            out.adotado = w.LH_CADEIA.get();
            dig('c05_forn_regular', 70); dig('c05_forn_simples', 30);
            out.esp1 = { dxh: v('dxh_forn_regular') + '/' + v('dxh_forn_simples'), cad: v('cad_forn_regular') + '/' + v('cad_forn_simples'), origem: w.LH_CADEIA.get().origem.entrada };
            w.abrirPagina('dxh'); dig('dxh_cli_b2c', 55); dig('dxh_cli_regular', 45);
            out.esp2 = { c05: v('c05_cli_regular') + '/' + v('c05_cli_b2c'), cad: v('cad_cli_regular') + '/' + v('cad_cli_b2c') };
            w.LH_EMP_CNPJ = EMP; w._LH_XML_NOTAS = NOTAS.map((n) => Object.assign({}, n));
            out.leu = w.LH_CADEIA.lerDocumentos(true); out.g = w.LH_CADEIA.get();
            out.campos = { c05cli: v('c05_cli_regular'), dxhb2c: v('dxh_cli_b2c'), c05exp: v('c05_export'), dxhforn: v('dxh_forn_regular'), cadpf: v('cad_forn_pf') };
            out.c33 = w.LH_CADEIA.calcular(2033); out.c27 = w.LH_CADEIA.calcular(2027);
            out.ls = w.localStorage.getItem('LH_CADEIA::' + (w.LH_PERSIST && w.LH_PERSIST.entidade ? w.LH_PERSIST.entidade() : EMP)) || w.localStorage.getItem('LH_CADEIA::geral') || Object.keys(w.localStorage).filter((k) => k.indexOf('LH_CADEIA::') === 0).map((k) => w.localStorage.getItem(k))[0];
            /* precificação com a cadeia: custo 60 → crédito só sobre 83% */
            out.preco = w.lhPreco({ trat: 'cheia', preco: 100, icms: 18, pis: 3.65, custo: 60 }, 2033, { regime: 'presumido', creditavel: out.c33.creditavel }, 'margem');
            out.precoSem = w.lhPreco({ trat: 'cheia', preco: 100, icms: 18, pis: 3.65, custo: 60 }, 2033, { regime: 'presumido' }, 'margem');
            w.abrirPagina('precmassa'); out.cfgCred = (function () { try { const c = w.LH_CADEIA.calcular(2033); return c.creditavel; } catch (e) { return null; } })();
            out.pmInfo = ($('pm_cadeia_info') || {}).textContent || '';
            w.abrirPagina('cadeia');
            setTimeout(() => { out.tela = ($('cad-result') || {}).textContent || ''; out.origemE = ($('cad_origem_entrada') || {}).textContent || ''; out.origemS = ($('cad_origem_saida') || {}).textContent || ''; w.close(); ok(out); }, 500);
          } catch (e) { out.erro = e.message + ' ' + (e.stack || '').split('\n')[1]; w.close(); ok(out); }
        }, 500);
      } catch (e) { out.erro = e.message; w.close(); ok(out); }
    }, 8000);
  });
}
(async () => {
  const r = await rodar(APP);
  ex('carregou sem erro', !r.erro, r.erro);
  if (!r.erro) {
    console.log('\n-- espelho entre as três telas --');
    ex('70/30 digitado no Regime Ótimo aparece no Dentro × Híbrido e na Cadeia', r.esp1.dxh === '70/30' && r.esp1.cad === '70/30', JSON.stringify(r.esp1));
    ex('origem registrada como manual, na tela Regime Ótimo', r.esp1.origem && r.esp1.origem.tipo === 'manual' && /Regime/.test(r.esp1.origem.detalhe), JSON.stringify(r.esp1.origem));
    ex('45/55 digitado no Dentro × Híbrido aparece no Regime Ótimo e na Cadeia', r.esp2.c05 === '45/55' && r.esp2.cad === '45/55', JSON.stringify(r.esp2));
    console.log('\n-- leitura de documentos --');
    ex('leu entradas e saídas', r.leu === true);
    ex('entrada: 80% regular · 15% Simples · 5% produtor rural PF (CRT e CPF do emitente)', r.g.entrada.regular === 80 && r.g.entrada.simples === 15 && r.g.entrada.pf === 5, JSON.stringify(r.g.entrada));
    ex('saída: 40% consumidor · 10% exportação · 50% PJ dividido 35/15 (fatia Simples padrão 30%)', r.g.saida.b2c === 40 && r.g.saida.exportacao === 10 && r.g.saida.regular === 35 && r.g.saida.simples === 15, JSON.stringify(r.g.saida));
    ex('origem "documentos" nos dois lados, com contagem de notas', r.g.origem.entrada.tipo === 'documentos' && /3 notas/.test(r.g.origem.entrada.detalhe) && r.g.origem.saida.tipo === 'documentos' && /3 notas/.test(r.g.origem.saida.detalhe), JSON.stringify(r.g.origem));
    ex('a leitura escreveu nas três telas (c05_cli_regular 35 · dxh_cli_b2c 40 · c05_export 10 · dxh_forn_regular 80 · cad_forn_pf 5)', r.campos.c05cli === '35' && r.campos.dxhb2c === '40' && r.campos.c05exp === '10' && r.campos.dxhforn === '80' && r.campos.cadpf === '5', JSON.stringify(r.campos));
    console.log('\n-- a conta --');
    ex('2033: creditável 83% das compras (80 + 20% de 15); crédito 22,0% do valor comprado; perdido 4,5%', perto(r.c33.creditavel, 0.83, 0.001) && perto(r.c33.credEntradaPct, 22.0) && perto(r.c33.perdidoPct, 4.5), JSON.stringify(r.c33));
    ex('2027: mesma cadeia, alíquota 8,8% → crédito 7,3%', perto(r.c27.credEntradaPct, 7.3), r.c27.credEntradaPct);
    ex('saída: 35% recuperável pelo cliente · 55% custo final · 10% exportação', r.c33.recuperavelSaida === 35 && perto(r.c33.custoFinalSaida, 55) && r.c33.exportacao === 10);
    console.log('\n-- precificação usa a cadeia --');
    /* custo 60 × (1 − 0,0365 × 0,83) = 58,18 (contra 57,81 com crédito integral) */
    ex('custo do ano com 83% creditável = 58,18 (sem cadeia seria 57,81)', perto(r.preco.custo, 58.18) && perto(r.precoSem.custo, 57.81), r.preco.custo + ' / ' + r.precoSem.custo);
    ex('manter margem: preço 2033 sobe de 95,50 (crédito integral) para 96,11 (cadeia real)', perto(r.preco.finalCli, 96.11) && perto(r.precoSem.finalCli, 95.50), r.preco.finalCli + ' / ' + r.precoSem.finalCli);
    ex('a aba de Precificação mostra a cadeia lida', /83% das compras/.test(r.pmInfo) && /35% das vendas/.test(r.pmInfo), r.pmInfo);
    console.log('\n-- persistência e tela --');
    ex('estado gravado no navegador (localStorage)', !!r.ls && /"regular":80/.test(r.ls), String(r.ls).slice(0, 80));
    ex('página Cadeia renderiza o retrato com KPIs e tabela por ano', /Retrato da cadeia/.test(r.tela) && /80%/.test(r.tela) && /2033/.test(r.tela) && /Crédito perdido/.test(r.tela));
    ex('origem visível em cada lado ("lido dos documentos")', /lido dos documentos/.test(r.origemE) && /lido dos documentos/.test(r.origemS), r.origemE + ' | ' + r.origemS);
  }
  console.log('\n-- persistência entre sessões e "adotar" --');
  const PRE = JSON.stringify({ entrada: { regular: 61, simples: 39, importacao: 0, pf: 0 }, saida: { regular: null, simples: null, b2c: null, exportacao: null, governo: null }, origem: { entrada: { tipo: 'documentos', detalhe: 'x', quando: '2026-09-27' }, saida: null }, pjSimplesPct: null });
  const r2 = await rodar(APP, (w) => { try { w.localStorage.setItem('LH_CADEIA::geral', PRE); } catch (e) {} });
  ex('estado salvo volta na sessão seguinte e preenche o Regime Ótimo (61/39)', r2.adotado && r2.adotado.entrada.regular === 61 || /61/.test(String(r2.esp1 && r2.esp1.dxh)), JSON.stringify(r2.adotado && r2.adotado.entrada));
  console.log('\n-- ao contrário --');
  const sab = async (nome, alvo, troca, teste) => {
    if (APP.split(alvo).length !== 2) throw new Error('sabotagem "' + nome + '" não achou o alvo');
    const s = await rodar(APP.replace(alvo, troca)); ex(nome, !s.erro && teste(s), s.erro);
  };
  await sab('espelho desligado → 70/30 não chega ao Dentro × Híbrido → reprova', "e.addEventListener('input', function(){ if(mudo) return; lerDeCampo(lado,id); });", "",
    (s) => s.esp1.dxh !== '70/30');
  await sab('CPF do emitente ignorado → produtor rural vira regular → reprova', "if(String(nt.emitCPF||'').replace(/\\D/g,'')) s.pf+=v; else if", "if(false) s.pf+=v; else if",
    (s) => s.g.entrada.pf !== 5);
  await sab('exportação não reconhecida (idDest 3) → cai em PJ → reprova', "if(String(nt.idDest||'')==='3' || String(nt.destUF||'').toUpperCase()==='EX') s.exportacao+=v;", "if(false) s.exportacao+=v;",
    (s) => s.g.saida.exportacao !== 10);
  await sab('crédito do Simples contado como integral → creditável 95% → reprova', "var credEnt=(reg+imp)*tFora + sn*tFora*0.20;", "var credEnt=(reg+imp+sn)*tFora;",
    (s) => !perto(s.c33.credEntradaPct, 22.0));
  await sab('precificação ignora a cadeia → custo volta a 57,81 → reprova', "var fCred=(regime==='simples')?1:(1 - pisEmb*(1-fPis)*cred - stEmb*(1-fIcms)*cred);", "var fCred=(regime==='simples')?1:(1 - pisEmb*(1-fPis) - stEmb*(1-fIcms));",
    (s) => !perto(s.preco.custo, 58.18));
  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado');
  process.exit(falhou ? 1 : 0);
})();
