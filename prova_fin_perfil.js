/* PROVA v901 — TR09 parte 1: perfil da empresa detectado pelos sinais (XML CFOP, NFS-e, PGDAS anexo, calculadora setorial,
   segmento do Regime Ótimo) com seletor que vence; ICMS × ISS e presunção pelo perfil; comissões de plataforma como
   dedução que credita (2027+, regular); custos variáveis de operação antes da margem; rótulos por perfil no DRE, Fluxo e PDF;
   o select 'fin_tipo' duplicado (colidia com a calculadora de serviços financeiros) saiu dos Dados.
   Sabotagens: comissão creditada no Simples; perfil da tela contradizendo documento; digitado sobrescrito pela detecção.
   Uso: npm i --no-save jsdom && node prova_fin_perfil.js */
const { JSDOM, VirtualConsole } = require('jsdom'); const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
let falhou = 0; const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(86, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const perto = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1 : tol);
const w = new JSDOM(APP, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://lionheartintelligence.com.br/app.html', virtualConsole: new VirtualConsole() }).window;
w.fetch = () => new Promise(() => {}); w.HTMLElement.prototype.scrollIntoView = function () {}; w.scrollTo = function () {}; w.alert = () => {};
setTimeout(() => {
  const d = w.document, F = w.LH_FIN; w.LH_ALIQ_REF = 26.5; const O = { tipo: 'digitado', detalhe: 'prova', quando: '2026-10-01' };
  w.LH_EMP_CNPJ = '11111111000191'; w.localStorage.removeItem('LH_FIN::' + F.eid());
  w.LH_PONTE.ultimo = {}; w._LH_XML_NOTAS = null; w.LH_IMPORT_NFSE = null; w.LH_IMPORT_PGDAS = null;

  /* ── o bug do id duplicado ── */
  ex('os Dados não têm mais um select fin_tipo (o único fin_tipo é o da calculadora de serviços financeiros)', !d.querySelector('#page-fin_dados #fin_tipo') && !!d.querySelector('#page-fin #fin_tipo, #fin_tipo'));
  ex('o seletor de perfil existe, com 6 perfis + automático, e os 3 campos novos estão em LH_FIN.campos (37 com os da v902)', d.querySelectorAll('#fin_perfil option').length === 7 && ['perfil', 'comissao', 'opVar'].every((k) => F.campos.indexOf(k) >= 0) && F.campos.length === 41 && !!d.getElementById('fin_comissao') && !!d.getElementById('fin_opVar'));
  const PS = F.perfis();
  ex('seis perfis: comércio, indústria, serviços, agro, alimentação, turismo — turismo e serviços são ISS, os outros ICMS', Object.keys(PS).length === 6 && PS.turismo.tipo === 'servico' && PS.servico.tipo === 'servico' && PS.alimentacao.tipo === 'comercio' && PS.agro.tipo === 'comercio' && PS.industria.tipo === 'comercio');

  /* ── detecção ── */
  ex('sem sinal nenhum: comércio, com aviso "sem sinais"', F.perfil().perfil === 'comercio' && /sem sinais/.test(F.perfil().de) && F.perfil().auto === true);
  d.getElementById('c05_seg').value = 'alimentacao';
  ex('segmento do Regime Ótimo = alimentação → perfil Bares/restaurantes (tela)', F.perfil().perfil === 'alimentacao' && /segmento/.test(F.perfil().de), F.perfil().de);
  w.LH_PONTE.ultimo.calcularHotel = { resultado: { ok: true }, ent: {}, quando: '2026-09-30T10:00:00Z' };
  ex('calculadora Hotelaria rodada vence o segmento → turismo', F.perfil().perfil === 'turismo' && /Hotel|turismo/.test(F.perfil().de), F.perfil().de);
  w.LH_PONTE.ultimo.calcularBares = { resultado: { ok: true }, ent: {}, quando: '2026-10-01T10:00:00Z' };
  ex('a calculadora mais recente decide (Bares depois de Hotel) → alimentação', F.perfil().perfil === 'alimentacao', F.perfil().de);
  w._LH_XML_NOTAS = [
    { emitCNPJ: '11111111000191', destCNPJ: '22222222000100', tpNF: '1', itens: [{ cfop: '5101', vProd: 7000, vIPI: 350 }, { cfop: '5102', vProd: 3000 }] },
    { emitCNPJ: '33333333000100', destCNPJ: '11111111000191', tpNF: '0', itens: [{ cfop: '1101', vProd: 9000 }] } ];
  ex('XML de venda com 70% em CFOP 5101/IPI define o eixo indústria — mas Bares (tela) é compatível com ICMS e dá o nome: alimentação', F.perfil().perfil === 'alimentacao' && /eixo: XML de venda/.test(F.perfil().de), F.perfil().de);
  delete w.LH_PONTE.ultimo.calcularBares; d.getElementById('c05_seg').value = 'servicos_gerais';
  ex('sem tela compatível com ICMS: Hotel (ISS) contradiz o XML (ICMS) → o documento vence: indústria', F.perfil().perfil === 'industria' && /vence Hotelaria/.test(F.perfil().de), F.perfil().de);
  ex('a nota de compra (CFOP 1101, 9.000) não conta como venda', /70%/.test(F.perfil().de), F.perfil().de);
  w._LH_XML_NOTAS = [{ emitCNPJ: '11111111000191', destCNPJ: '', tpNF: '1', itens: [{ cfop: '5102', vProd: 10000 }] }];
  delete w.LH_PONTE.ultimo.calcularHotel;
  ex('só revenda (5102) → comércio', F.perfil().perfil === 'comercio' && /revenda/.test(F.perfil().de), F.perfil().de);
  w.LH_IMPORT_NFSE = { ok: true, base: 50000, iss: 2500, notas: 10 };
  ex('NFS-e de 50.000 acima das NF-e de 10.000 → serviços', F.perfil().perfil === 'servico' && /NFS-e/.test(F.perfil().de), F.perfil().de);
  w.LH_IMPORT_NFSE = { ok: true, base: 5000, iss: 250, notas: 2 };
  ex('NFS-e menor que as NF-e → segue comércio', F.perfil().perfil === 'comercio', F.perfil().de);
  w._LH_XML_NOTAS = null; w.LH_IMPORT_NFSE = null; w.LH_IMPORT_PGDAS = { ok: true, cnpj: '11111111000191', anexo: 'II', rbt12: 1000000 };
  ex('PGDAS Anexo II → indústria', F.perfil().perfil === 'industria' && /Anexo II/.test(F.perfil().de), F.perfil().de);
  w.LH_IMPORT_PGDAS = null;

  /* ── seletor vence ── */
  F.set({ perfil: 'turismo' }, O);
  w.LH_PONTE.ultimo.calcularBares = { resultado: { ok: true }, ent: {}, quando: '2026-10-01T10:00:00Z' };
  ex('perfil escolhido (turismo) vence a detecção (Bares rodada)', F.perfil().perfil === 'turismo' && F.perfil().auto === false);
  w.abrirPagina('fin_dados');
  ex('o selo do perfil diz "escolhido por você" e avisa que os sinais apontavam alimentação; os rótulos mudam (OTAs)', /escolhido por você/.test(d.getElementById('fin_perfil_det').textContent) && /apontavam Bares/.test(d.getElementById('fin_perfil_det').textContent) && /OTAs/.test(d.getElementById('fin_rot_comissao').textContent), d.getElementById('fin_perfil_det').textContent);
  F.set({ perfil: '' }, O); delete w.LH_PONTE.ultimo.calcularBares;
  w.abrirPagina('fin_dados');
  ex('voltando ao automático, o selo mostra "→ Comércio · sinal: …"', /→/.test(d.getElementById('fin_perfil_det').textContent) && /Comércio/.test(d.getElementById('fin_perfil_det').textContent), d.getElementById('fin_perfil_det').textContent);

  /* ── motor: ICMS × ISS, presunção, comissão, operação ── */
  w.localStorage.removeItem('LH_FIN::' + F.eid());
  F.set({ fat: 1200000, cresc: 0, infl: 0, regime: 'presumido', perfil: 'alimentacao', icms: 18, compras: 400000, comprasTrat: 'cheia', desp: 5, cartao: 2, pessoal: 240000, prolab: 60000, ocup: 60000, adm: 24000, pRec: 2, pPag: 20, vista: 90, inad: 0, caixa0: 50000, ressarc: 60, estoque: 7 }, O);
  const base33 = F.impostos(2033), baseD = F.dre(), baseF = F.fluxo();
  ex('alimentação é ICMS: o imposto velho inclui ICMS líquido (2026) e a presunção é 8/12', F.impostos(2026).icmsLiq > 0 && /8%/.test(baseD[0].irpjDe) && baseD[0].perfil === 'alimentacao');
  F.set({ comissao: 20, opVar: 6 }, O);
  const c33 = F.impostos(2033), c26 = F.impostos(2026), D = F.dre(), Fx = F.fluxo();
  ex('comissão de 20% = 240.000 sai da receita (dedução) e operação de 6% = 72.000 sai antes da margem', perto(D[0].comissao, 240000) && perto(D[0].opVar, 72000) && perto(D[0].recLiq, baseD[0].recLiq - 240000) && perto(D[0].margem, baseD[0].margem - 240000 - 72000), JSON.stringify([D[0].comissao, D[0].opVar, D[0].recLiq, baseD[0].recLiq]));
  ex('a comissão credita IBS/CBS em 2033 (240.000 × 26,5% = 63.600) e o saldo a pagar cai', perto(c33.credComissao, 63600) && perto(c33.aPagar, base33.aPagar - 63600), JSON.stringify([c33.credComissao, c33.aPagar, base33.aPagar]));
  ex('2026 (ano-teste) não credita a comissão', c26.credComissao === 0);
  ex('o ponto de equilíbrio sobe com comissão e operação (margem de contribuição menor)', D[0].pe > baseD[0].pe);
  ex('no Fluxo, comissão e operação saem do caixa', perto(Fx[0].saidas, baseF[0].saidas + 240000 + 72000 - (baseD[0].irpj - D[0].irpj)) && perto(Fx[0].comissao, 240000), JSON.stringify([Fx[0].saidas, baseF[0].saidas]));
  F.set({ regime: 'simples', aliqDas: 8 }, O);
  ex('sabotagem: no Simples a comissão não credita', F.impostos(2033).credComissao === 0 && F.impostos(2033).credTotal === 0);
  F.set({ regime: 'presumido' }, O);

  /* ── turismo: ISS, presunção 32 ── */
  F.set({ perfil: 'turismo', icms: 5 }, O);
  const t26 = F.impostos(2026), tD = F.dre();
  ex('turismo é ISS: sem crédito de ICMS das compras (ISS cumulativo) e presunção 32%', perto(t26.icmsLiq, 1200000 * 0.05 * t26.fIcms) && /32%/.test(tD[0].irpjDe), JSON.stringify([t26.icmsLiq, tD[0].irpjDe]));

  /* ── telas: rótulos por perfil e leitura setorial ── */
  F.set({ perfil: 'alimentacao', icms: 18 }, O);
  w.abrirPagina('fin_dre'); F.renderDre(); const bd = d.getElementById('fin_dre_result').textContent;
  ex('o DRE mostra as linhas com nome do perfil: comissões (iFood, Rappi), insumos (CMV / ficha técnica), operação (embalagem, entrega, gás)', /Comissões de plataformas \(iFood, Rappi\)/.test(bd) && /Insumos \(CMV \/ ficha técnica\)/.test(bd) && /embalagem, entrega, gás/.test(bd));
  ex('leitura setorial para bares: cada ponto de comissão em R$, CMV na faixa, redução de 40% (arts. 274–275), link Bares', /O que o DRE diz para bares/.test(bd) && /Cada ponto de comissão/.test(bd) && /28–35%/.test(bd) && /274–275/.test(bd) && /Bares e Restaurantes/.test(bd));
  ex('KPI "Perfil" no topo do DRE', /Perfil/.test(bd) && /escolhido nos Dados/.test(bd));
  w.abrirPagina('fin_fluxo'); F.renderFluxo(); const bf = d.getElementById('fin_fluxo_result').textContent;
  ex('o Fluxo mostra Insumos (CMV), Operação variável e Comissões de plataforma', /Insumos \(CMV\)/.test(bf) && /Operação variável/.test(bf) && /Comissões de plataforma/.test(bf));
  w.abrirPagina('fin_cred'); F.renderCred(); const bc = d.getElementById('fin_cred_result').textContent;
  ex('o Identificador mostra a linha de crédito das comissões', /crédito das comissões de plataforma/.test(bc));

  /* ── sugestão de tratamento pelo perfil ── */
  const st = F.get(); delete st.dados.trat; delete st.origem.trat; w.localStorage.setItem('LH_FIN::' + F.eid(), JSON.stringify(st));
  F.sugerir(false);
  ex('perfil alimentação sugere tratamento red40 (só no vazio, origem tela · perfil)', F.get().dados.trat === 'red40' && /perfil/.test(F.get().origem.trat.detalhe), JSON.stringify(F.get().origem.trat));
  F.set({ trat: 'cheia' }, O); F.sugerir(false);
  ex('tratamento digitado não é sobrescrito pelo perfil', F.get().dados.trat === 'cheia');

  /* ── PDF ── */
  const paleta = (w.PDF_PALETAS && w.PDF_PALETAS.dourado) || { primaria: '#c9a227', textoEscuro: '#111' };
  const r = w.buildPaginasFin({ escritorio: 'E', contador: 'J', crc: '1', contato: 'x', cor: 'dourado', logoData: null }, paleta, 5);
  ex('o PDF traz o perfil, as comissões, os insumos (CMV) e a operação variável', /Perfil: <b>Bares, restaurantes, alimentação/.test(r.html) && /Comissões de plataformas/.test(r.html) && /Insumos \(CMV \/ ficha técnica\)/.test(r.html) && /Custos variáveis de operação/.test(r.html));

  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado'); process.exit(falhou ? 1 : 0);
}, 9000);
