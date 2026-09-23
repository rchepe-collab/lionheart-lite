/* ═══════════════════════════════════════════════════════════════════════════
   PROVA DO PAINEL DO DONO

   Roda a página num navegador de mentira (jsdom) com um servidor de mentira,
   e confere os três caminhos que importam:
     1. dono entra e vê os números que o servidor mandou — nem um a mais;
     2. suporte (e quem não tem papel) é barrado NA PORTA, antes de qualquer
        número aparecer; o sócio (v849) entra, com o selo "somente leitura";
     3. sessão vencida volta para a porta em vez de mostrar tela vazia.

   E confere o que a página promete não ter: chave secreta, número escrito,
   biblioteca de fora.

   As verificações novas (v2) existem por dois motivos, e os dois são de
   confiança, não de layout:
     · PERCENTUAL COM AMOSTRA PEQUENA. Com 2 pessoas numa etapa e 1 na
       seguinte, a página estampava "50%" — parece taxa de conversão, é duas
       pessoas. Painel que mente com confiança é pior que painel vazio.
     · O SELO DAS BASES. Quem baixou material consentiu; quem abandonou a
       compra, não (Termos v1.0, cláusula 9.2 — comunicação comercial não está
       entre as finalidades). O selo tem de vir do servidor e tem de viajar
       junto no CSV, porque é fora da tela que a regra é esquecida.
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const { JSDOM } = require('jsdom');
/* Os arquivos são procurados AO LADO desta prova, nunca num caminho absoluto:
   a versão anterior trazia o caminho da máquina onde nasceu escrito dentro e
   só rodava lá — em qualquer outra, quebrava antes da primeira verificação.
   Prova que não roda não prova nada. */
const daqui = (n) => require('path').join(__dirname, n);

let falhou = 0;
const ex = (nome, ok, detalhe) => {
  console.log('  ' + nome.padEnd(54, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (detalhe ? ' · ' + detalhe : '')));
  if (!ok) falhou++;
};
const html = fs.readFileSync(daqui('painel.html'), 'utf8');
/* o código sem comentário nenhum: a página fala de CDN e de biblioteca
   justamente para dizer que não usa — e a primeira versão desta prova
   reprovou por causa disso, igual à do farol. */
const codigo = html
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/\/\*[\s\S]*?\*\//g, ' ');

/* o que o banco devolveria para o dono.
   O funil atravessa o limiar dos 20 de propósito: as etapas 2 a 5 têm
   anterior >= 20 (percentual aparece) e as 6 em diante não têm (some). */
const RESPOSTA = {
  ok: true, dias: 30,
  serie: [
    { dia: '2026-09-15', visitas: 12 }, { dia: '2026-09-16', visitas: 31 },
    { dia: '2026-09-17', visitas: 8 },  { dia: '2026-09-18', visitas: 25 },
    { dia: '2026-09-19', visitas: 44 }
  ],
  origens: [
    { origem: 'linkedin', visitas: 19, ver_planos: 7, demonstracao: 2, abriu_compra: 4, escolheu: 2 },
    { origem: null,       visitas: 73, ver_planos: 20, demonstracao: 1, abriu_compra: 14, escolheu: 6 },
    { origem: 'instagram', visitas: 28, ver_planos: 13, demonstracao: 4, abriu_compra: 7, escolheu: 2 }
  ],
  dinheiro: {
    recebido: 1234.50, pagamentos: 3, ticket_medio: 411.50,
    por_plano: [
      { plano: 'especialista', ciclo: 'anual',  pagamentos: 1, valor: 990.00 },
      { plano: 'preparacao',   ciclo: 'mensal', pagamentos: 2, valor: 244.50 }
    ]
  },
  funil: [
    { n: 1,  etapa: 'Visitas ao site',                  qtd: 120 },
    { n: 2,  etapa: 'Clicou em ver planos',             qtd: 40 },
    { n: 3,  etapa: 'Abriu a página de compra',         qtd: 25 },
    { n: 4,  etapa: 'Digitou o e-mail',                 qtd: 20 },
    { n: 5,  etapa: 'Escolheu um plano',                qtd: 10 },
    { n: 6,  etapa: 'Pediu demonstração',               qtd: 4 },
    { n: 7,  etapa: 'Aceitou e recebeu o link do Asaas', qtd: 3 },
    { n: 8,  etapa: 'Pagou',                            qtd: 2 },
    { n: 9,  etapa: 'Baixou material',                  qtd: 9 },
    { n: 10, etapa: 'Criou conta',                      qtd: 5 }
  ],
  leads_material: {
    pode_campanha: true,
    lista: [
      { email: 'lead@escritorio.com.br', telefone: '53999990000', nome: 'Ana',
        material: 'calendario-transicao', origem: 'linkedin',
        quando: '2026-09-18T12:00:00Z', consentiu: true, virou_conta: false }
    ]
  },
  abandonou: {
    pode_campanha: false,
    lista: [
      { email: 'x@y.com', plano: 'especialista', ciclo: 'anual', origem: 'instagram',
        quando: '2026-09-18T10:00:00Z', tentativas: 2, tem_conta: false }
    ]
  },
  assinantes: { livre: 7, preparacao: 1, consultoria: 1, especialista: 0, parceiro: 1, core: 1 },
  receita_mensal: 798,
  atencao: [{ empresa: 'Carlos', plano: 'parceiro', valido_ate: '2026-12-31', aviso: 'cortesia vence em 3 dia(s)' }],
  uso: { calculos: 340, pessoas: 4, top: [{ calc: 'c05', vezes: 80 }, { calc: 'c01', vezes: 44 }] }
};
const copia = (o) => JSON.parse(JSON.stringify(o));

/* servidor de mentira: decide pelo corpo da chamada.
   dom_pediuNumeros conta quantas vezes a página pediu os números: barrar NA
   PORTA quer dizer nem pedir — se a porta abrisse e só o servidor recusasse,
   a tela voltaria à porta do mesmo jeito e a prova passaria à toa. */
let dom_pediuNumeros = { n: 0 };
function servidor(papel, sessaoValida, resposta) {
  return async (url, opts) => {
    const corpo = JSON.parse((opts && opts.body) || '{}');
    const responder = (o) => ({ json: async () => o });
    if (String(url).endsWith('/login')) {
      if (corpo.action === 'verificar') return responder(sessaoValida ? { ok: true, nome: 'Ricardo', admin: papel } : { ok: false, motivo: 'Sessão expirada.' });
      if (corpo.email === 'dono@x.com') return responder({ ok: true, nome: 'Ricardo', admin: 'dono', token: 't-dono' });
      if (corpo.email === 'sup@x.com')  return responder({ ok: true, nome: 'Suporte', admin: 'suporte', token: 't-sup' });
      if (corpo.email === 'socio@x.com') return responder({ ok: true, nome: 'Sócia', admin: 'socio', token: 't-socio' });
      if (corpo.email === 'nada@x.com')  return responder({ ok: true, nome: 'Cliente', admin: null, token: 't-nada' });
      return responder({ ok: false, motivo: 'Email ou senha incorretos.' });
    }
    if (String(url).endsWith('/calcular')) {
      const auth = (opts.headers || {})['Authorization'] || '';
      if (!auth.replace('Bearer ', '')) return responder({ ok: false, recusa: 'identidade', motivo: 'Sessão ausente.' });
      if (corpo.calc !== 'painel') return responder({ ok: false, recusa: 'modulo' });
      dom_pediuNumeros.n++;
      /* como fn_painel desde a v849: dono e sócio leem */
      return responder(papel === 'dono' || papel === 'socio' ? { ok: true, resultado: resposta } : { ok: true, resultado: { ok: false, motivo: 'Painel restrito à direção.' } });
    }
    return responder({ ok: false });
  };
}

function montar(papel, sessaoValida, tokenGuardado, resposta, outroHtml) {
  const dom = new JSDOM(outroHtml || html, { runScripts: 'outside-only', url: 'https://lionheartintelligence.com.br/painel.html' });
  const w = dom.window;
  if (tokenGuardado) w.localStorage.setItem('lh_token', tokenGuardado);
  dom.chamadasDeRede = 0;
  dom.pediuNumeros = dom_pediuNumeros = { n: 0 };
  const real = servidor(papel, sessaoValida, resposta || RESPOSTA);
  w.fetch = (u, o) => { dom.chamadasDeRede++; return real(u, o); };

  /* pega o CSV no ar: nada é gravado em disco, o arquivo nasce e morre aqui */
  dom.baixado = null;
  let ultimoBlob = null;
  w.Blob = function (partes) { this.partes = partes; };
  Object.defineProperty(w, 'URL', {
    configurable: true, writable: true,
    value: { createObjectURL(b) { ultimoBlob = b; return 'blob:prova'; }, revokeObjectURL() {} }
  });
  w.HTMLAnchorElement.prototype.click = function () {
    if (this.download) dom.baixado = { nome: this.download, texto: ((ultimoBlob || {}).partes || []).join('') };
  };

  const scripts = [...dom.window.document.querySelectorAll('script')].map(s => s.textContent);
  for (const s of scripts) w.eval(s);
  return dom;
}
const espera = (ms) => new Promise(r => setTimeout(r, ms));
const $ = (dom, id) => dom.window.document.getElementById(id);
const qsa = (dom, sel) => [...dom.window.document.querySelectorAll(sel)];

async function comOPainelAberto(resposta) {
  const dom = montar('dono', true, 't-dono', resposta);
  await espera(80);
  return dom;
}

(async () => {
  console.log('\n-- o que a página não pode ter --');
  const soMarcacao = html.replace(/<script[\s\S]*<\/script>/, '');
  ex('nenhuma chave de serviço',       !/service_role|SERVICE_KEY|eyJhbGciOi/.test(html));
  ex('nenhuma biblioteca de fora',     !/<script[^>]+src=["']https?:/.test(html));
  ex('nenhum número de negócio escrito', !/R\$\s?\d/.test(soMarcacao));
  ex('não é indexada por buscador',    /noindex/.test(html));
  /* o selo não pode estar escrito na marcação: ele vem de pode_campanha */
  ex('o texto do selo não está na marcação',
     !/pode entrar em campanha|sem autorização de marketing/i.test(soMarcacao));

  console.log('\n-- 1 · o dono entra --');
  let dom = montar('dono', false, null);
  await espera(20);
  ex('sem sessão, mostra a porta', !$(dom, 'porta').hidden && $(dom, 'painel').hidden);
  $(dom, 'email').value = 'dono@x.com'; $(dom, 'senha').value = 'segredo';
  $(dom, 'entrar').click();
  await espera(60);
  ex('depois do login, mostra o painel', $(dom, 'porta').hidden && !$(dom, 'painel').hidden);
  ex('guardou o token do CORE', dom.window.localStorage.getItem('lh_token') === 't-dono');
  ex('apagou a senha do campo', $(dom, 'senha').value === '');
  ex('pagantes = Adequação + Consultoria + Especialista', $(dom, 'k-pagantes').textContent === '2');
  ex('receita mensal formatada em reais', /R\$\s?798/.test($(dom, 'k-mrr').textContent));
  ex('cortesias = parceiro + interno', $(dom, 'k-cortesia').textContent === '2');
  ex('o que pede decisão hoje', /Carlos/.test($(dom, 't-atencao').textContent) && /3 dia/.test($(dom, 't-atencao').textContent));
  ex('top de uso', $(dom, 't-uso').querySelectorAll('tr').length === 2);
  ex('nada vindo de fora vira HTML (escape)', !/<script/.test($(dom, 't-abandonou').innerHTML));

  console.log('\n-- 2 · dinheiro --');
  ex('recebido sai do que o servidor mandou', /1\.234,50/.test($(dom, 'k-recebido').textContent),
     $(dom, 'k-recebido').textContent);
  ex('pagamentos sai do servidor', $(dom, 'k-pagamentos').textContent === '3');
  ex('ticket médio sai do servidor', /411,50/.test($(dom, 'k-ticket').textContent),
     $(dom, 'k-ticket').textContent);
  ex('uma linha por plano pago', $(dom, 't-planos').querySelectorAll('tr').length === 2);
  ex('o valor do plano vem do servidor', /990,00/.test($(dom, 't-planos').textContent));
  ex('a página explica a diferença entre MRR e recebido',
     /Receita mensal recorrente é o que os planos ativos prometem/.test(html)
     && /Recebido é o dinheiro que entrou no período/.test(html));

  console.log('\n-- 3 · visitas por dia (gráfico) --');
  ex('a série virou gráfico SVG', !!$(dom, 'grafico').querySelector('svg.graf'));
  ex('o gráfico é escrito à mão, não baixado', !/cdn|chart\.js|d3\.|plotly|highcharts/i.test(codigo));
  ex('desenha a linha com vários dias', !!$(dom, 'grafico').querySelector('polyline'));
  ex('um ponto por dia', $(dom, 'grafico').querySelectorAll('circle').length === 5);
  {
    const rotulosY = [...$(dom, 'grafico').querySelectorAll('text[text-anchor="end"]')].map(t => t.textContent);
    ex('o eixo Y começa em zero', rotulosY[0] === '0', rotulosY.join(' · '));
    ex('o eixo Y chega ao topo da série', rotulosY[rotulosY.length-1] === '50', rotulosY.join(' · '));
  }
  ex('rótulo de data curto', /19\/09/.test($(dom, 'grafico').textContent));
  ex('o total do período fica ao lado do título', /120/.test($(dom, 'g-total').textContent),
     $(dom, 'g-total').textContent);
  {
    /* UM PONTO SÓ É UM PONTO: reta ligando um dado a nada finge tendência */
    const r1 = copia(RESPOSTA); r1.serie = [{ dia: '2026-09-19', visitas: 12 }];
    const d1 = await comOPainelAberto(r1);
    ex('com um dia só, desenha o ponto', d1.window.document.querySelectorAll('#grafico circle').length === 1);
    ex('com um dia só, NÃO desenha linha', !d1.window.document.querySelector('#grafico polyline'));
    const r0 = copia(RESPOSTA); r0.serie = [];
    const d0 = await comOPainelAberto(r0);
    ex('sem série, diz que está vazio em vez de gráfico torto',
       !d0.window.document.querySelector('#grafico svg') && /Nenhuma visita/.test($(d0, 'grafico').textContent));
  }

  console.log('\n-- 4 · de onde veio --');
  {
    const linhas = $(dom, 't-origens').querySelectorAll('tr');
    ex('uma linha por origem', linhas.length === 3, linhas.length + ' linhas');
    ex('ordenado por visitas (a maior primeiro)', /73/.test(linhas[0].textContent));
    ex('sem marca na URL vira (direto)', /\(direto\)/.test($(dom, 't-origens').textContent));
    ex('mostra as colunas do funil por origem',
       /linkedin/.test($(dom, 't-origens').textContent) && /instagram/.test($(dom, 't-origens').textContent));
    ex('a página explica a regra do primeiro toque',
       /origem é a do primeiro toque/i.test(html));
  }

  console.log('\n-- 5 · funil: 10 etapas e o percentual honesto --');
  {
    const etapas = qsa(dom, '#funil .etapa');
    const pct = qsa(dom, '#funil .pct').map(e => e.textContent.trim());
    ex('as 10 etapas do funil', etapas.length === 10, etapas.length + ' etapas');
    /* A VERIFICAÇÃO MAIS IMPORTANTE DO LOTE */
    ex('percentual APARECE quando a anterior tem 120', /33%/.test(pct[1]), pct[1]);
    ex('percentual APARECE quando a anterior tem 40',  /63%/.test(pct[2]), pct[2]);
    ex('percentual APARECE quando a anterior tem exatos 20', /50%/.test(pct[4]), pct[4]);
    ex('percentual SOME quando a anterior tem 10', pct[5] === '', pct[5]);
    ex('percentual SOME quando a anterior tem 4',  pct[6] === '', pct[6]);
    ex('percentual SOME quando a anterior tem 3',  pct[7] === '', pct[7]);
    ex('percentual SOME quando a anterior tem 2',  pct[8] === '', pct[8]);
    ex('a primeira etapa nunca tem percentual', pct[0] === '', pct[0]);
    ex('só as etapas com amostra mostram percentual',
       pct.filter(t => t !== '').length === 4, pct.filter(t => t !== '').length + ' com percentual');
    /* o número cru continua aparecendo: esconder o percentual não é esconder o dado */
    ex('o número cru continua na tela', qsa(dom, '#funil .qtd').map(e => e.textContent).join(',') ===
       '120,40,25,20,10,4,3,2,9,5');
  }
  {
    /* teste ao contrário: com a base de hoje (tudo pequeno) não pode sobrar
       percentual nenhum na tela */
    const r = copia(RESPOSTA);
    r.funil = r.funil.map((e, i) => ({ n: i + 1, etapa: e.etapa, qtd: i === 0 ? 2 : 1 }));
    const d = await comOPainelAberto(r);
    ex('com a base pequena de hoje, nenhum percentual aparece',
       qsa(d, '#funil .pct').every(e => e.textContent.trim() === ''));
    ex('e mesmo assim as 10 etapas aparecem', qsa(d, '#funil .etapa').length === 10);
  }

  console.log('\n-- 6 · as duas bases, e o selo que vem do servidor --');
  {
    ex('são duas tabelas distintas',
       !!$(dom, 't-material') && !!$(dom, 't-abandonou') && $(dom, 't-material') !== $(dom, 't-abandonou'));
    ex('cada base tem a sua seção', !!$(dom, 's-material') && !!$(dom, 's-abandonou')
       && !$(dom, 's-material').contains($(dom, 't-abandonou')));
    ex('quem baixou material aparece', /lead@escritorio\.com\.br/.test($(dom, 't-material').textContent));
    ex('quem abandonou aparece', /x@y\.com/.test($(dom, 't-abandonou').textContent));
    ex('as listas não se misturam',
       !/x@y\.com/.test($(dom, 't-material').textContent)
       && !/lead@escritorio/.test($(dom, 't-abandonou').textContent));
    ex('a origem aparece nas duas bases',
       /linkedin/.test($(dom, 't-material').textContent) && /instagram/.test($(dom, 't-abandonou').textContent));
    ex('marca quem não tem conta', /sem conta/.test($(dom, 't-abandonou').textContent));

    ex('selo verde: material tem consentimento',
       /pode entrar em campanha/i.test($(dom, 'selo-material').textContent)
       && /(^|\s)pode(\s|$)/.test($(dom, 'selo-material').className),
       $(dom, 'selo-material').className + ' · ' + $(dom, 'selo-material').textContent);
    ex('selo âmbar: abandono não tem autorização',
       /sem autorização de marketing/i.test($(dom, 'selo-abandonou').textContent)
       && /nao-pode/.test($(dom, 'selo-abandonou').className),
       $(dom, 'selo-abandonou').className + ' · ' + $(dom, 'selo-abandonou').textContent);

    /* TESTE AO CONTRÁRIO: se o selo estivesse escrito no HTML, virar a marca
       do servidor não mudaria nada — e esta verificação passaria à toa. */
    const r = copia(RESPOSTA);
    r.leads_material.pode_campanha = false;
    r.abandonou.pode_campanha = true;
    const d = await comOPainelAberto(r);
    ex('virando pode_campanha, o selo do material vira âmbar',
       /nao-pode/.test($(d, 'selo-material').className)
       && /sem autorização/i.test($(d, 'selo-material').textContent));
    ex('virando pode_campanha, o selo do abandono vira verde',
       /pode entrar em campanha/i.test($(d, 'selo-abandonou').textContent));

    /* na dúvida (servidor não mandou a marca), a resposta é NÃO */
    const r2 = copia(RESPOSTA);
    delete r2.leads_material.pode_campanha;
    const d2 = await comOPainelAberto(r2);
    ex('sem a marca do servidor, o selo é o restritivo',
       /nao-pode/.test($(d2, 'selo-material').className));
  }

  console.log('\n-- 7 · exportar CSV --');
  {
    /* o CSV nasce no navegador: nenhuma chamada de rede durante a exportação */
    const antesDoCsv = dom.chamadasDeRede;
    $(dom, 'csv-abandonou').click();
    const arq = dom.baixado;
    ex('o CSV do abandono é gerado no navegador', !!arq && /\.csv$/.test(arq.nome), arq && arq.nome);
    ex('a primeira linha avisa que a base não tem autorização',
       !!arq && /^#[^\r\n]*SEM AUTORIZAÇÃO DE MARKETING/i.test(arq.texto.replace(/^﻿/, '')),
       arq && arq.texto.split('\r\n')[0]);
    ex('o CSV traz a linha da pessoa', !!arq && /x@y\.com/.test(arq.texto));
    ex('o CSV traz a origem', !!arq && /instagram/.test(arq.texto));
    ex('o CSV do abandono não traz a base de material', !!arq && !/lead@escritorio/.test(arq.texto));

    dom.baixado = null;
    $(dom, 'csv-material').click();
    const arq2 = dom.baixado;
    ex('o CSV do material também é gerado', !!arq2 && /\.csv$/.test(arq2.nome));
    ex('e leva o selo de consentimento na primeira linha',
       !!arq2 && /^#[^\r\n]*PODE ENTRAR EM CAMPANHA/i.test(arq2.texto.replace(/^﻿/, '')),
       arq2 && arq2.texto.split('\r\n')[0]);
    ex('o CSV do material traz a linha da pessoa', !!arq2 && /lead@escritorio\.com\.br/.test(arq2.texto));
    ex('nenhum servidor é chamado para exportar',
       dom.chamadasDeRede === antesDoCsv, (dom.chamadasDeRede - antesDoCsv) + ' chamada(s) durante a exportação');
  }

  console.log('\n-- 8 · só dono e sócio passam da porta --');
  /* entra pelo login e, com o papel que o servidor devolver, confere se
     ficou barrado na porta sem ver nem pedir número nenhum */
  async function pelaPorta(papel, email, outroHtml) {
    const d = montar(papel, false, null, null, outroHtml);
    await espera(20);
    $(d, 'email').value = email; $(d, 'senha').value = 'segredo';
    $(d, 'entrar').click();
    await espera(60);
    return d;
  }
  const barrado = (d) =>
    !$(d, 'porta').hidden && $(d, 'painel').hidden
    && /direção/.test($(d, 'aviso-porta').textContent)
    && !d.window.localStorage.getItem('lh_token')
    && d.pediuNumeros.n === 0
    && $(d, 'k-pagantes').textContent === '—'
    && !/lead@escritorio|x@y\.com/.test(d.window.document.body.textContent);

  dom = await pelaPorta('suporte', 'sup@x.com');
  ex('suporte: continua na porta', !$(dom, 'porta').hidden && $(dom, 'painel').hidden);
  ex('suporte: diz que é só da direção', /direção/.test($(dom, 'aviso-porta').textContent));
  ex('suporte: não guardou token', !dom.window.localStorage.getItem('lh_token'));
  ex('suporte: nem pediu os números ao servidor', dom.pediuNumeros.n === 0, dom.pediuNumeros.n + ' pedido(s)');
  ex('suporte: nenhum número foi desenhado', $(dom, 'k-pagantes').textContent === '—');
  ex('suporte: nenhuma base vazou',
     !/lead@escritorio|x@y\.com/.test(dom.window.document.body.textContent));

  dom = await pelaPorta(null, 'nada@x.com');
  ex('sem papel: barrado na porta, sem token nem número', barrado(dom));

  dom = await pelaPorta('socio', 'socio@x.com');
  ex('sócio: entra no painel', $(dom, 'porta').hidden && !$(dom, 'painel').hidden);
  ex('sócio: guardou o token', dom.window.localStorage.getItem('lh_token') === 't-socio');
  ex('sócio: vê os números', $(dom, 'k-pagantes').textContent === '2');
  ex('sócio: selo "somente leitura" no cabeçalho',
     !$(dom, 'leitura').hidden && /somente leitura/.test($(dom, 'leitura').textContent)
     && dom.window.document.querySelector('.topo').contains($(dom, 'leitura')));

  dom = await pelaPorta('dono', 'dono@x.com');
  ex('dono: NÃO leva o selo de somente leitura', $(dom, 'leitura').hidden);

  console.log('\n-- 8b · a mesma regra ao reabrir com a sessão guardada --');
  for (const [papel, rotulo] of [['suporte', 'suporte'], [null, 'sem papel']]) {
    const d = montar(papel, true, 't-guardado');
    await espera(80);
    ex(rotulo + ': sessão guardada não abre o painel',
       !$(d, 'porta').hidden && $(d, 'painel').hidden && d.pediuNumeros.n === 0);
    ex(rotulo + ': e o token guardado é esquecido', !d.window.localStorage.getItem('lh_token'));
  }
  {
    const d = montar('socio', true, 't-socio');
    await espera(80);
    ex('sócio: sessão guardada entra direto', $(d, 'porta').hidden && !$(d, 'painel').hidden);
    ex('sócio: com o selo de somente leitura', !$(d, 'leitura').hidden);
  }

  console.log('\n-- 8c · teste ao contrário: a porta é que barra --');
  {
    /* PORTA ESCANCARADA: se podeVer deixasse todo mundo passar, as
       verificações acima têm de reprovar — senão estariam passando à toa */
    const aberta = html.replace(/function podeVer\(papel\)\{[^}]*\}/, 'function podeVer(papel){ return true; }');
    ex('(a mutação da porta pegou)', aberta !== html);
    const dSup = await pelaPorta('suporte', 'sup@x.com', aberta);
    ex('com a porta aberta, o suporte deixaria de ser barrado', !barrado(dSup));
    const dNada = await pelaPorta(null, 'nada@x.com', aberta);
    ex('com a porta aberta, quem não tem papel também', !barrado(dNada));

    /* SÓ O DONO NA LISTA: o sócio tem de voltar a ser barrado — prova que
       é a lista de papéis que o deixa entrar, e não um acaso */
    const soDono = html.replace(/var PAPEIS_DO_PAINEL = \[[^\]]*\];/, "var PAPEIS_DO_PAINEL = ['dono'];");
    ex('(a mutação da lista pegou)', soDono !== html);
    const dSoc = await pelaPorta('socio', 'socio@x.com', soDono);
    ex('sem "socio" na lista, o sócio é barrado', barrado(dSoc));
    const dSocGuardado = montar('socio', true, 't-socio', null, soDono);
    await espera(80);
    ex('e a sessão guardada do sócio também', !$(dSocGuardado, 'porta').hidden && dSocGuardado.pediuNumeros.n === 0);
  }

  console.log('\n-- 9 · sessão vencida volta para a porta --');
  dom = montar('dono', false, 't-velho');
  await espera(60);
  ex('mostra a porta, não tela vazia', !$(dom, 'porta').hidden);
  ex('esqueceu o token velho', !dom.window.localStorage.getItem('lh_token'));

  console.log('\n-- 10 · sessão válida do CORE entra direto --');
  dom = montar('dono', true, 't-dono');
  await espera(80);
  ex('entrou sem pedir senha', $(dom, 'porta').hidden && !$(dom, 'painel').hidden);
  ex('mostra quem é', /Ricardo/.test($(dom, 'quem').textContent));
  ex('dono pela sessão guardada: sem selo de somente leitura', $(dom, 'leitura').hidden);

  console.log('\nRESULTADO: ' + (falhou ? falhou + ' FALHOU' : 'tudo aprovado') + '\n');
  process.exit(falhou ? 1 : 0);
})();
