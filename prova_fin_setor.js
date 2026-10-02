/* PROVA v902 — TR09 parte 2: IPI (até 2026) e Imposto Seletivo (2027+) na indústria; calculadoras setoriais como afluentes
   (fixam o perfil); balancete → comissões; ajustes por ano/linha (sobrevivem ao recálculo) e cenários pessimista/base/otimista.
   Sabotagens: IPI em 2027; IS no exportado; cenário antes de 2027; ajuste zerado some; perfil digitado não cai pela setorial.
   Uso: npm i --no-save jsdom && node prova_fin_setor.js */
const { JSDOM, VirtualConsole } = require('jsdom'); const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
let falhou = 0; const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(86, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const perto = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1 : tol);
const w = new JSDOM(APP, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://lionheartintelligence.com.br/app.html', virtualConsole: new VirtualConsole() }).window;
w.fetch = () => new Promise(() => {}); w.HTMLElement.prototype.scrollIntoView = function () {}; w.scrollTo = function () {}; w.alert = () => {};
setTimeout(() => {
  const d = w.document, F = w.LH_FIN; w.LH_ALIQ_REF = 26.5; const O = { tipo: 'digitado', detalhe: 'prova', quando: '2026-10-01' };
  w.LH_EMP_CNPJ = '11111111000191'; w.localStorage.removeItem('LH_FIN::' + F.eid()); w.LH_PONTE.ultimo = {};
  ex('campos +ipi, is; os dois inputs existem', F.campos.length >= 37 && !!d.getElementById('fin_ipi') && !!d.getElementById('fin_is'));

  /* indústria: IPI e IS */
  F.set({ fat: 1200000, cresc: 0, infl: 0, regime: 'presumido', perfil: 'industria', icms: 18, recExp: 20, compras: 600000, comprasTrat: 'cheia', desp: 5, pessoal: 200000, prolab: 60000, ocup: 40000, adm: 20000, pRec: 30, pPag: 20, vista: 20, caixa0: 50000, ressarc: 60 }, O);
  const b26 = F.impostos(2026), b33 = F.impostos(2033);
  F.set({ ipi: 2, is: 5 }, O);
  const i26 = F.impostos(2026), i27 = F.impostos(2027), i33 = F.impostos(2033);
  ex('IPI de 2% entra em 2026 (24.000) e zera em 2027', perto(i26.ipiLiq, 24000) && i27.ipiLiq === 0 && perto(i26.total, b26.total + 24000), JSON.stringify([i26.ipiLiq, i27.ipiLiq]));
  ex('IS de 5% entra a partir de 2027 sobre a receita não exportada (1.200.000 × 0,8 × 5% = 48.000), sem crédito', i26.is === 0 && perto(i27.is, 48000) && perto(i33.total, b33.total + 48000) && i33.credTotal === b33.credTotal, JSON.stringify([i27.is, i33.total, b33.total]));
  F.set({ regime: 'simples', aliqDas: 8 }, O);
  ex('no Simples o IPI não aparece (está no DAS) mas o IS sim', F.impostos(2026).ipiLiq === 0 && perto(F.impostos(2030).is, 48000));
  F.set({ regime: 'presumido' }, O);
  w.abrirPagina('fin_dados');
  ex('as caixas de IPI e IS aparecem para indústria', d.getElementById('fin_ipi_box').style.display !== 'none');
  w.abrirPagina('fin_cred'); F.renderCred(); const bc = d.getElementById('fin_cred_result').textContent;
  ex('o Identificador mostra as linhas de IPI e Imposto Seletivo', /IPI líquido/.test(bc) && /Imposto Seletivo/.test(bc));
  F.set({ ipi: 0, is: 0, perfil: 'alimentacao' }, O);
  w.abrirPagina('fin_dados');
  ex('…e somem para bares (sem valor)', d.getElementById('fin_ipi_box').style.display === 'none');

  /* calculadoras setoriais como afluentes */
  const de = [...d.querySelectorAll('.lh-fin-btn')].map((x) => (x.getAttribute('onclick').match(/afluente\('([^']+)'/) || [])[1]);
  const setor = de.filter((x) => /^setor:/.test(x));
  ex('9 botões setoriais (Bares, Hotel, Hotel·eventos, Agências, Transporte, Agro×3, Indústria) + os 9 de antes', setor.length === 9 && de.length === 18, de.join(','));
  ex('estão nas páginas certas (bares, hotel, agro01, ind01)', ['bares', 'hotel', 'agro01', 'ind01'].every((p) => !!d.querySelector('#page-' + p + ' .lh-fin-btn')));
  F.set({ perfil: '' }, O);
  ex('clicar em Hotelaria fixa o perfil turismo (origem tela) e registra o afluente', F.afluente('setor:turismo:Hotelaria') === true && F.get().dados.perfil === 'turismo' && F.get().origem.perfil.tipo === 'tela' && F.afluentes().setor.perfil === 'turismo');
  F.set({ perfil: 'comercio' }, O);
  ex('sabotagem: perfil escolhido pelo contador não cai pela calculadora setorial', F.afluente('setor:agro:Insumos agro') === true && F.get().dados.perfil === 'comercio');
  w.abrirPagina('fin_dre'); F.renderDre();
  ex('o chip do afluente setorial aparece no DRE', /perfil da empresa/.test(d.getElementById('fin_dre_afluentes').textContent));
  F.removerAfluente('setor');

  /* balancete → comissões */
  w.LH_IMPORT_BALANCETE = { ok: true, receita: 200000, cred: 10000, itens: [{ nome: 'COMISSOES IFOOD', valor: 24000 }, { nome: 'PROPAGANDA', valor: 4000 }] };
  const st = F.get(); delete st.dados.comissao; delete st.origem.comissao; w.localStorage.setItem('LH_FIN::' + F.eid(), JSON.stringify(st));
  F.sugerir(false);
  ex('balancete: comissões 24.000 ÷ 200.000 = 12% (Central), e marketing continua 2%', F.get().dados.comissao === 12 && /Balancete/.test(F.get().origem.comissao.detalhe) && F.get().dados.despMkt === 2, JSON.stringify([F.get().dados.comissao, F.get().dados.despMkt]));
  w.LH_IMPORT_BALANCETE = null;

  /* ajustes por ano/linha */
  F.set({ perfil: 'comercio', comissao: 0, opVar: 0, recExp: 0, trat: 'cheia' }, O); F.limparAjustes(); F.cenario('base');
  const base = F.dre();
  F.ajustar('receita', 2029, 20);
  const A = F.dre();
  ex('ajuste de +20% na receita de 2029: só 2029 muda (receita × 1,2); 2028 e 2030 iguais', perto(A[3].receita, base[3].receita * 1.2) && perto(A[2].receita, base[2].receita) && perto(A[4].receita, base[4].receita), JSON.stringify([A[3].receita, base[3].receita]));
  ex('e o imposto de 2029 acompanha a receita ajustada (débito sobre a nova receita)', perto(A[3].imp.debito, A[3].receita * w.getAliq(2029).total));
  F.ajustar('fixos', 2033, -10); F.ajustar('comissao', 2030, 3);
  const B = F.dre();
  ex('fixos −10% em 2033; comissão +3 p.p. em 2030 (de 0 para 3%)', perto(B[7].fixos, base[7].fixos * 0.9) && perto(B[4].comissao, B[4].receita * 0.03) && B[4].aj.comissao === 3, JSON.stringify([B[7].fixos, base[7].fixos, B[4].comissao]));
  ex('os ajustes sobrevivem ao recálculo e ficam em dados.aj (viajam na nuvem)', F.nAjustes() === 3 && F.get().dados.aj.receita[2029] === 20);
  F.ajustar('receita', 2029, 0);
  ex('zerar o ajuste apaga a célula', F.nAjustes() === 2 && !(F.get().dados.aj.receita));
  w.abrirPagina('fin_dre'); F.renderDre(); const bd = d.getElementById('fin_dre_result');
  ex('a tabela de ajustes tem 5 linhas × 8 anos de inputs, 2 marcados; o DRE marca as células com ✎', bd.querySelectorAll('input.fin-aj').length === 40 && [...bd.querySelectorAll('input.fin-aj')].filter((i) => i.value !== '').length === 2 && (bd.textContent.match(/✎/g) || []).length === 2);
  F.limparAjustes();
  ex('limpar ajustes zera tudo', F.nAjustes() === 0 && perto(F.dre()[7].fixos, base[7].fixos));

  /* cenários */
  const C = F.cenarios();
  ex('três cenários: pessimista < base < otimista no lucro de 2033; base = DRE atual', C.pess[7].lucro < C.base[7].lucro && C.base[7].lucro < C.otim[7].lucro && perto(C.base[7].lucro, base[7].lucro));
  ex('pessimista: receita −10%, compras +5%, fixos +3% (2033); 2026 intocado (sabotagem: cenário antes de 2027)', perto(C.pess[7].receita, base[7].receita * 0.9) && perto(C.pess[7].cmv, base[7].cmv * 1.05) && perto(C.pess[7].fixos, base[7].fixos * 1.03) && perto(C.pess[0].receita, base[0].receita), JSON.stringify([C.pess[7].receita, base[7].receita]));
  F.cenario('pess');
  ex('aplicar o pessimista muda o DRE da tela (dados.cen) e o render diz "cenário pessimista"', F.get().dados.cen === 'pess' && perto(F.dre()[7].lucro, C.pess[7].lucro) && (F.renderDre(), /cenário pessimista/.test(d.getElementById('fin_dre_result').textContent)));
  ex('o bloco de cenários tem a tabela dos três e as 24 barras (8 anos × 3)', /Pessimista/.test(bd.textContent) && /Otimista/.test(bd.textContent) && d.getElementById('fin_dre_result').querySelectorAll('[title^="Pessimista"],[title^="Base"],[title^="Otimista"]').length === 24);
  F.cenario('base');
  ex('voltar ao base apaga dados.cen', F.get().dados.cen == null);
  const paleta = (w.PDF_PALETAS && w.PDF_PALETAS.dourado) || { primaria: '#c9a227', textoEscuro: '#111' };
  F.ajustar('receita', 2028, 5); F.cenario('otim');
  const r = w.buildPaginasFin({ escritorio: 'E', contador: 'J', crc: '1', contato: 'x', cor: 'dourado', logoData: null }, paleta, 5);
  ex('o PDF declara os ajustes e o cenário nas premissas', /1 ajuste\(s\) por ano\/linha/.test(r.html) && /cenário otimista/.test(r.html));
  F.limparAjustes(); F.cenario('base');

  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado'); process.exit(falhou ? 1 : 0);
}, 9000);
