/* PROVA v892 — Inteligência Financeira (TR08): Dados Estratégicos + Identificador de Créditos, parte impostos.
   Confere à mão: a linha de imposto usa a curva do Mestre (getAliq), o mix do catálogo ou do setor, a Cadeia de Crédito
   e o DAS do híbrido — nunca a mistura "carga atual × (1−mix) + reforma × mix" do ITFE. Sabotagens: a mistura, o crédito
   contado onde não há (Simples), o digitado perdendo para o importado.
   Uso: npm i --no-save jsdom && node prova_fin_motor.js */
const { JSDOM, VirtualConsole } = require('jsdom'); const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
let falhou = 0; const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(86, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const perto = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1 : tol);
const w = new JSDOM(APP, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://lionheartintelligence.com.br/app.html', virtualConsole: new VirtualConsole() }).window;
w.fetch = () => new Promise(() => {}); w.HTMLElement.prototype.scrollIntoView = function () {}; w.scrollTo = function () {};
setTimeout(() => {
  const d = w.document, F = w.LH_FIN;
  ex('LH_FIN existe, com impostos/serie/sugerir/set', !!F && ['impostos', 'serie', 'sugerir', 'set', 'renderCred'].every((k) => typeof F[k] === 'function'));
  ex('LH_PONTE.ultimo existe (resultado estruturado por função, para os afluentes)', !!(w.LH_PONTE && w.LH_PONTE.ultimo && typeof w.LH_PONTE.ultimo === 'object'));
  ex('_disparar guarda o último resultado antes de desenhar', /LH_PONTE\.ultimo\[nomeFn\]\s*=\s*\{\s*resultado:\s*res\.resultado/.test(String(w.LH_PONTE._disparar)));
  /* menu e páginas */
  const ids = [...d.querySelectorAll('.nav-item[onclick]')].map((e) => (e.getAttribute('onclick').match(/abrirPagina\('([^']+)'/) || [])[1]);
  ex('grupo INTELIGÊNCIA FINANCEIRA no menu, depois de Cadastro & Preço, com as duas abas', ids.indexOf('fin_dados') > ids.indexOf('classmassa') && ids.indexOf('fin_cred') === ids.indexOf('fin_dados') + 1 && [...d.querySelectorAll('.nav-group-title')].some((t) => /INTELIGÊNCIA FINANCEIRA/.test(t.textContent)));
  ex('as páginas existem e abrem', !!d.getElementById('page-fin_dados') && !!d.getElementById('page-fin_cred') && (w.abrirPagina('fin_cred'), d.getElementById('page-fin_cred').classList.contains('active')));
  ex('a busca encontra o Identificador pela pergunta', (w.BUSCA_INDEX || []).some((x) => x.id === 'fin_cred' && /crédito eu perco/i.test(x.nome)));

  /* ── empresa-base: Presumido, comércio, ICMS 18, fat 1,2 mi, compras 660 mil, despesas 8%, sem Cadeia (100%) ── */
  w.LH_ALIQ_REF = 26.5;
  F.set({ fat: 1200000, cresc: 0, regime: 'presumido', tipo: 'comercio', icms: 18, trat: 'cheia', recExp: 0, compras: 660000, comprasTrat: 'cheia', desp: 8, st: 0 }, { tipo: 'digitado', detalhe: 'prova', quando: '2026-10-01' });
  const A27 = w.getAliq(2027), A30 = w.getAliq(2030), A33 = w.getAliq(2033);
  const y26 = F.impostos(2026), y27 = F.impostos(2027), y30 = F.impostos(2030), y33 = F.impostos(2033);
  ex('2026 (ano-teste): débito e crédito zerados; imposto = ICMS líquido + PIS/COFINS cumulativo', y26.debito === 0 && y26.credTotal === 0 && perto(y26.icmsLiq, (1200000 - 660000) * 0.18) && perto(y26.pisLiq, 1200000 * 0.0365), JSON.stringify([y26.icmsLiq, y26.pisLiq]));
  ex('2027: débito = receita × 8,8% (curva do Mestre), não uma mistura com a carga atual', perto(y27.debito, 1200000 * A27.total) && perto(A27.total, 0.088, 0.0005), y27.debito + ' / ' + A27.total);
  ex('2027: PIS/COFINS some (fPis = 0); ICMS continua inteiro (fIcms = 1)', y27.pisLiq === 0 && perto(y27.icmsLiq, (1200000 - 660000) * 0.18), JSON.stringify([y27.pisLiq, y27.icmsLiq]));
  ex('2027: crédito = compras × 8,8% + despesas (8% da receita) × 8,8%', perto(y27.credCompras, 660000 * A27.total) && perto(y27.credDesp, 96000 * A27.total), JSON.stringify([y27.credCompras, y27.credDesp]));
  ex('2027: saldo = débito − crédito; a pagar = saldo (positivo)', perto(y27.saldo, y27.debito - y27.credTotal) && perto(y27.aPagar, y27.saldo) && y27.credor === 0);
  ex('2030: ICMS líquido × fatia vigente do ano (curva), IBS/CBS pela alíquota do ano', perto(y30.icmsLiq, (1200000 - 660000) * 0.18 * A30.pcVelhoEstadual) && perto(y30.debito, 1200000 * A30.total), JSON.stringify([y30.icmsLiq, A30.pcVelhoEstadual]));
  ex('2033: só IBS/CBS (ICMS e PIS zerados); débito = receita × referência', y33.icmsLiq === 0 && y33.pisLiq === 0 && perto(y33.debito, 1200000 * A33.total) && perto(A33.total, 0.265, 0.0005), JSON.stringify([y33.icmsLiq, y33.debito]));
  const lucroConf = 1200000 * 0.265 - 660000 * 0.265 - 96000 * 0.265;
  ex('2033 conferido à mão: a pagar = (1.200.000 − 660.000 − 96.000) × 26,5% = ' + Math.round(lucroConf), perto(y33.aPagar, lucroConf), String(y33.aPagar));
  ex('série de 8 anos, total = velho + a pagar (sem contar o crédito duas vezes)', F.serie().length === 8 && perto(y30.total, y30.icmsLiq + y30.pisLiq + y30.aPagar));

  /* ── cenário muda a referência: 28% em 2033 ── */
  w.LH_ALIQ_REF = 28; try { w.LIONHEART_TABELAS.cenarios_aliquota.ativo = w.LIONHEART_TABELAS.cenarios_aliquota.ativo; } catch (e) {}
  const y33b = F.impostos(2033); const A33b = w.getAliq(2033);
  ex('o Identificador segue o cenário ativo (getAliq), sem alíquota própria', perto(y33b.debito, 1200000 * A33b.total) && y33b.fontes.aliqRef === 28, String(A33b.total));
  w.LH_ALIQ_REF = 26.5;

  /* ── Cadeia de Crédito: 70% regular, 25% Simples, 5% PF → creditável 75%, perdido 25% ── */
  w.LH_CADEIA.set('entrada', { regular: 70, simples: 25, importacao: 0, pf: 5 }, { tipo: 'manual', detalhe: 'prova', quando: '2026-10-01' });
  const c33 = F.impostos(2033);
  ex('crédito das compras passa pela parcela creditável da Cadeia (0,70 + 0,25×0,2 = 0,75)', perto(c33.cred, 0.75, 0.001) && perto(c33.credCompras, 660000 * 0.75 * A33.total), JSON.stringify([c33.cred, c33.credCompras]));
  ex('crédito perdido = compras × 26,5% × (0,25×0,8 + 0,05) = ' + Math.round(660000 * 0.265 * 0.25), perto(c33.perdido, 660000 * 0.265 * 0.25), String(c33.perdido));
  ex('ICMS da compra também credita só a parcela da Cadeia', perto(F.impostos(2026).icmsLiq, (1200000 * 0.18 - 660000 * 0.18 * 0.75)), String(F.impostos(2026).icmsLiq));
  w.LH_CADEIA.set('entrada', { regular: null, simples: null, importacao: null, pf: null }, null);

  /* ── exportador 60%: saldo credor ── */
  F.set({ recExp: 60 }, { tipo: 'digitado', detalhe: 'prova', quando: '2026-10-01' });
  const e33 = F.impostos(2033);
  ex('exportação imune na saída, crédito mantido: saldo credor = crédito − débito', perto(e33.debito, 1200000 * 0.4 * 0.265) && e33.credor > 0 && perto(e33.credor, e33.credTotal - e33.debito) && e33.aPagar === 0, JSON.stringify([e33.debito, e33.credor]));
  F.set({ recExp: 0 }, { tipo: 'digitado', detalhe: 'prova', quando: '2026-10-01' });

  /* ── Lucro Real: PIS/COFINS não-cumulativo ── */
  F.set({ regime: 'real' }, { tipo: 'digitado', detalhe: 'prova', quando: '2026-10-01' });
  ex('Lucro Real hoje: 9,25% sobre receita − compras − despesas', perto(F.impostos(2026).pisLiq, (1200000 - 660000 - 96000) * 0.0925), String(F.impostos(2026).pisLiq));

  /* ── Simples puro: DAS, sem débito nem crédito ── */
  F.set({ regime: 'simples', aliqDas: 8.5 }, { tipo: 'digitado', detalhe: 'prova', quando: '2026-10-01' });
  const s33 = F.impostos(2033);
  ex('Simples puro: imposto = receita × DAS; débito, crédito, ICMS e PIS zerados (sabotagem: crédito onde não há)', perto(s33.das, 1200000 * 0.085) && s33.debito === 0 && s33.credTotal === 0 && s33.icmsLiq === 0 && s33.pisLiq === 0 && perto(s33.total, s33.das));

  /* ── Simples híbrido (art. 41): DAS residual + IBS/CBS por fora ── */
  F.set({ regime: 'hibrido', aliqDas: 10, hibAnexo: 'I', hibRbt: 1200000 }, { tipo: 'digitado', detalhe: 'prova', quando: '2026-10-01' });
  const fat = w.LH_fatiaDAS('I', 1200000, 2033); const h27 = F.impostos(2027), h33 = F.impostos(2033);
  const pisH = 10 * fat.federal / 100, icmsH = 10 * fat.base / 100;
  ex('híbrido 2027: DAS perde só a fatia federal (LH_fatiaDAS, a mesma do Dentro × Híbrido)', perto(h27.das, 1200000 * (10 - pisH) / 100) && h27.hib && h27.hib.faixa === fat.faixa, JSON.stringify([h27.das, pisH]));
  ex('híbrido 2033: DAS perde federal e ICMS/ISS; IBS/CBS por fora com crédito como no regular', perto(h33.das, 1200000 * (10 - pisH - icmsH) / 100) && perto(h33.debito, 1200000 * 0.265) && perto(h33.credCompras, 660000 * 0.265), JSON.stringify([h33.das, h33.debito]));

  /* ── mix do catálogo vence o setor ── */
  F.set({ regime: 'presumido', trat: 'red60' }, { tipo: 'digitado', detalhe: 'prova', quando: '2026-10-01' });
  const m33 = F.impostos(2033);
  ex('sem catálogo: alíquota de saída pelo setor (red60 → 10,6%)', perto(m33.tMix, 0.106, 0.0005) && m33.fontes.mixFonte === 'setor', String(m33.tMix));
  w.PM_ULTIMO = { rows: [{ c: { anos: { 2033: { hojeCli: 100, tFora: 0.265 } } } }, { c: { anos: { 2033: { hojeCli: 300, tFora: 0.106 } } } }], cfg: { regime: 'presumido' } };
  const m33b = F.impostos(2033);
  ex('com catálogo precificado: mix ponderado pelo preço (100×26,5 + 300×10,6)/400 = 14,575%', perto(m33b.tMix, 0.14575, 0.0005) && m33b.fontes.mixFonte === 'catalogo', String(m33b.tMix));
  w.PM_ULTIMO = null;

  /* ── Dados Estratégicos: digitado vence o importado; Central preenche o vazio ── */
  w.LH_IMPORT_PGDAS = { ok: true, rbt12: 900000, aliqEfetiva: 0.072, cnpj: '00000000000000' };
  d.getElementById('c05_folha').value = '20000';
  F.set({ fat: 1200000 }, { tipo: 'digitado', detalhe: 'digitado', quando: '2026-10-01' });
  F.set({ pessoal: null, regime: '', aliqDas: null }, { tipo: 'digitado', detalhe: 'x', quando: '2026-10-01' }); const st0 = F.get(); delete st0.origem.pessoal; delete st0.origem.regime; delete st0.origem.aliqDas;
  w.localStorage.setItem('LH_FIN::' + F.eid(), JSON.stringify(st0));
  const n = F.sugerir(false); const st = F.get();
  ex('sugerir preenche o vazio pela Central/telas (pessoal = folha × 12, regime = Simples do PGDAS, DAS = 7,2%)', n >= 2 && st.dados.pessoal === 240000 && st.dados.regime === 'simples' && st.dados.aliqDas === 7.2 && st.origem.pessoal.tipo === 'tela' && st.origem.regime.tipo === 'central', JSON.stringify([n, st.dados.pessoal, st.dados.regime, st.dados.aliqDas]));
  ex('e não encosta no que foi digitado (faturamento continua 1.200.000, não o RBT12)', st.dados.fat === 1200000 && st.origem.fat.tipo === 'digitado');
  ex('o selo de origem aparece no campo', (w.abrirPagina('fin_dados'), /eSocial|folha/.test(d.querySelector('.fin-selo[data-f="pessoal"]').textContent)));
  ex('guardado por empresa (LH_FIN::<entidade>)', !!w.localStorage.getItem('LH_FIN::' + F.eid()));

  /* ── a aba desenha: tabela de 8 anos, KPIs e decisões ── */
  F.set({ fat: 1200000, regime: 'presumido', compras: 660000, desp: 8, recExp: 60 }, { tipo: 'digitado', detalhe: 'prova', quando: '2026-10-01' });
  w.abrirPagina('fin_cred'); F.renderCred();
  const box = d.getElementById('fin_cred_result');
  ex('tabela com as 8 colunas de ano e a linha "IBS/CBS a pagar"', box.querySelectorAll('thead th').length === 9 && /IBS\/CBS a pagar/.test(box.textContent));
  ex('KPI de saldo credor e a decisão de ressarcimento aparecem para o exportador', /Saldo credor/.test(box.textContent) && /ressarc/i.test(box.textContent) && /Exportação & Saldo Credor/.test(box.textContent));
  ex('"De onde veio" e "Premissas" carimbam a conta', /De onde veio/.test(d.getElementById('fin_cred_fontes').textContent) && /Premissas desta conta/.test(box.textContent));
  ex('sem faturamento, a aba pede os Dados em vez de inventar número', (F.set({ fat: null }, { tipo: 'digitado', detalhe: 'x', quando: '2026-10-01' }), F.renderCred(), /Faltam os Dados/.test(box.textContent)));

  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado'); process.exit(falhou ? 1 : 0);
}, 9000);
