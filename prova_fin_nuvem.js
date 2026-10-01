/* PROVA v899 — Inteligência Financeira na nuvem (tv_fin via despachante: fin-salvar / fin-carregar).
   A empresa vai como hash (o CNPJ não sai do navegador); salvar local agenda o envio; abrir uma aba carrega do servidor
   uma vez por empresa; conflito: o mais recente vence; recusa de plano vira cadeado, não erro.
   Uso: npm i --no-save jsdom && node prova_fin_nuvem.js */
const { JSDOM, VirtualConsole } = require('jsdom'); const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
let falhou = 0; const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(86, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const w = new JSDOM(APP, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://lionheartintelligence.com.br/app.html', virtualConsole: new VirtualConsole() }).window;
w.fetch = () => new Promise(() => {}); w.HTMLElement.prototype.scrollIntoView = function () {}; w.scrollTo = function () {}; w.alert = () => {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
setTimeout(async () => {
  const d = w.document, F = w.LH_FIN; const O = { tipo: 'digitado', detalhe: 'prova', quando: '2026-10-01' };
  /* servidor de mentira */
  const banco = {}; const chamadas = []; let recusarPlano = false;
  w.LH_EMP_CNPJ = '11222333000181';
  w.LH_PONTE.modo = () => 'servidor';
  w.LH_PONTE.chamar = (calc, ent) => { chamadas.push({ calc, ent: JSON.parse(JSON.stringify(ent)) });
    if (recusarPlano) return Promise.resolve({ ok: false, recusa: 'plano', motivo: 'Disponível no plano Especialista.' });
    if (calc === 'fin-salvar') { banco[ent.entidade] = { dados: ent.dados, afluentes: ent.afluentes, origem: ent.origem, quando: new Date().toISOString() }; return Promise.resolve({ ok: true, resultado: { ok: true, id: 1, quando: banco[ent.entidade].quando } }); }
    if (calc === 'fin-carregar') { const r = banco[ent.entidade]; return Promise.resolve({ ok: true, resultado: r ? { ok: true, dados: r.dados, afluentes: r.afluentes, origem: r.origem, quando: r.quando } : { ok: true, vazio: true } }); }
    return Promise.resolve({ ok: false, motivo: 'calc desconhecida' }); };

  const h = F.hashEid();
  ex('a empresa vai como hash: 25 caracteres hex com prefixo, determinístico, sem os dígitos do CNPJ', /^h[0-9a-f]{24}$/.test(h) && h === F.hashEid() && h.indexOf('11222333') < 0 && h.indexOf('000181') < 0, h);

  w.localStorage.removeItem('LH_FIN::' + F.eid());
  F.set({ fat: 1200000, regime: 'presumido', compras: 660000 }, O);
  await sleep(1600);
  const sv = chamadas.filter((c) => c.calc === 'fin-salvar');
  ex('salvar local agenda UM envio (debounce) com entidade=hash, dados, afluentes e origem', sv.length === 1 && sv[0].ent.entidade === h && sv[0].ent.dados.fat === 1200000 && sv[0].ent.origem.fat.tipo === 'digitado', String(sv.length));
  ex('nenhum campo proibido no topo da chamada (cnpj, nome, email…) e nenhum valor de 14 dígitos', Object.keys(sv[0].ent).every((k) => ['entidade', 'dados', 'afluentes', 'origem'].indexOf(k) >= 0) && !JSON.stringify(sv[0].ent.entidade).match(/\d{14}/));
  w.abrirPagina('fin_dados');
  ex('o selo diz "salvo no servidor"', /salvo no servidor/.test(d.getElementById('fin_nuvem').textContent), d.getElementById('fin_nuvem').textContent);

  /* nova máquina: local vazio → carrega do servidor */
  await sleep(100);   /* o carregar automático de abrirPagina termina antes de simular a máquina nova */
  w.localStorage.removeItem('LH_FIN::' + F.eid());
  const ok = await F.nuvemCarregar(true);
  ex('em outro navegador (local vazio), abrir a aba carrega do servidor: faturamento 1.200.000 volta', ok === true && F.get().dados.fat === 1200000 && F.get().origem.fat.tipo === 'digitado');
  ex('e marca a origem de nuvem', /carregado do servidor/.test(d.getElementById('fin_nuvem').textContent));

  /* conflito: local mais novo que o servidor vence */
  await sleep(30);
  F.set({ fat: 1300000 }, O);   /* salva local (quando = agora) e agenda envio */
  const antes = chamadas.length;
  const ok2 = await F.nuvemCarregar(true);   /* servidor ainda tem 1.200.000, mais antigo */
  ex('conflito: local mais recente NÃO é sobrescrito pelo servidor', ok2 === false && F.get().dados.fat === 1300000);
  await sleep(1600);
  ex('…e o envio agendado leva o 1.300.000 ao servidor', banco[h].dados.fat === 1300000 && chamadas.length > antes);

  /* servidor mais novo vence */
  banco[h].dados.fat = 1500000; banco[h].quando = new Date(Date.now() + 60000).toISOString();
  const ok3 = await F.nuvemCarregar(true);
  ex('conflito: servidor mais recente vence e a tela recebe 1.500.000', ok3 === true && F.get().dados.fat === 1500000 && d.getElementById('fin_fat').value === '1500000');

  /* carregar só uma vez por empresa (sem force) */
  const n0 = chamadas.filter((c) => c.calc === 'fin-carregar').length; await F.nuvemCarregar(); await F.nuvemCarregar();
  ex('sem force, não repete a chamada de carregar para a mesma empresa', chamadas.filter((c) => c.calc === 'fin-carregar').length === n0);

  /* recusa de plano: cadeado, nada quebra, local continua */
  recusarPlano = true; F.set({ fat: 1600000 }, O); await sleep(1600);
  ex('recusa de plano vira cadeado no selo e o local continua valendo', /🔒/.test(d.getElementById('fin_nuvem').textContent) && F.get().dados.fat === 1600000 && banco[h].dados.fat === 1500000);
  recusarPlano = false;

  /* modo local (sem servidor): nada é enviado */
  w.LH_PONTE.modo = () => 'local'; const n1 = chamadas.length; F.set({ fat: 1700000 }, O); await sleep(1600);
  ex('sem servidor, nada é enviado e o selo diz "só neste navegador"', chamadas.length === n1 && /só neste navegador/.test(d.getElementById('fin_nuvem').textContent));

  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado'); process.exit(falhou ? 1 : 0);
}, 9000);
