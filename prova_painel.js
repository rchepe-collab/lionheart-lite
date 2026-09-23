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
    { origem: '(direto)', visitas: 73, ver_planos: 20, demonstracao: 1, abriu_compra: 14, escolheu: 6 },
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

/* ── o eco da v850 ─────────────────────────────────────────────────────
   Como fn_painel: valida, aplica e DEVOLVE o que aplicou (de, ate, dias,
   filtro_etapa, filtro_origem). No período pronto, ate − de = dias; no
   livre, ate é inclusivo. opc.sabotar deixa a prova mentir no eco, para
   mostrar que a tela segue o eco e não o clique. */
const ETAPAS_OK = ['site:ver_planos','site:demonstracao','assinar:abriu',
                   'assinar:escolheu','assinar:digitou_email','assinar:recusou_termos'];
const hojeSP = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const somaDias = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const entre = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5);
function ecoar(ent, resposta) {
  const e = ent || {};
  let de, ate, dias;
  if (e.de) {
    ate = e.ate || hojeSP();
    if (e.ate && e.ate < e.de) return { ok: false, motivo: 'A data final é anterior à inicial.' };
    if (entre(e.de, ate) > 730) return { ok: false, motivo: 'Período máximo de 2 anos.' };
    de = e.de; dias = entre(de, ate) + 1;
  } else {
    dias = Math.min(Math.max(Number(e.dias) || 30, 1), 365);
    ate = hojeSP(); de = somaDias(ate, -dias);
  }
  const etp = (e.etapa || '').trim();
  if (etp && !ETAPAS_OK.includes(etp)) return { ok: false, motivo: 'Etapa desconhecida: ' + etp };
  return Object.assign(copia(resposta), { ok: true, dias, de, ate, filtro_etapa: etp, filtro_origem: (e.origem || '').trim() });
}

function servidor(papel, sessaoValida, resposta, opc) {
  opc = opc || {};
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
      if (opc.pedidos) opc.pedidos.push(corpo.entradas || {});
      /* como fn_painel desde a v849: dono e sócio leem */
      if (!(papel === 'dono' || papel === 'socio')) return responder({ ok: true, resultado: { ok: false, motivo: 'Painel restrito à direção.' } });
      let eco = ecoar(corpo.entradas, resposta);
      if (eco.ok && opc.sabotar) eco = opc.sabotar(eco);
      return responder({ ok: true, resultado: eco });
    }
    return responder({ ok: false });
  };
}

function montar(papel, sessaoValida, tokenGuardado, resposta, outroHtml, opc) {
  const dom = new JSDOM(outroHtml || html, { runScripts: 'outside-only', url: 'https://lionheartintelligence.com.br/painel.html' });
  const w = dom.window;
  if (tokenGuardado) w.localStorage.setItem('lh_token', tokenGuardado);
  dom.chamadasDeRede = 0;
  dom.pediuNumeros = dom_pediuNumeros = { n: 0 };
  dom.pedidos = [];
  const real = servidor(papel, sessaoValida, resposta || RESPOSTA, Object.assign({ pedidos: dom.pedidos }, opc || {}));
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
    ex('sem marca na URL vira Acesso direto', /Acesso direto/.test($(dom, 't-origens').textContent));
    ex('o código cru não aparece na tabela', !/\(direto\)/.test($(dom, 't-origens').textContent));
    ex('o código fica no title da célula', !!$(dom, 't-origens').querySelector('td[title="código: linkedin"]'));
    ex('mostra as colunas do funil por origem',
       /LinkedIn · postagem/.test($(dom, 't-origens').textContent) && /Instagram/.test($(dom, 't-origens').textContent));
    ex('título novo da seção', /De onde vieram os visitantes/.test(html));
    {
      /* a função mora dentro do IIFE da página: extrai o trecho e avalia à parte */
      const i0 = html.indexOf('var ORIGENS = {'), i1 = html.indexOf('function celOrigem');
      const w = { eval: (x) => new Function(html.slice(i0, i1) + '; return ' + x)() };
      ex('nome: li-direto', w.eval("nomeOrigem('li-direto')") === 'LinkedIn · mensagem direta');
      ex('nome: email-direto', w.eval("nomeOrigem('email-direto')") === 'E-mail direto');
      ex('nome: whatsapp', w.eval("nomeOrigem('whatsapp')") === 'WhatsApp');
      ex('nome: vazio é Acesso direto', w.eval("nomeOrigem('')") === 'Acesso direto');
      ex('nome: parceiro p01', w.eval("nomeOrigem('p01')") === 'Parceiro 01');
      ex('nome: parceiro p01-wa', w.eval("nomeOrigem('p01-wa')") === 'Parceiro 01 · WhatsApp');
      ex('nome: parceiro p01-li', w.eval("nomeOrigem('p01-li')") === 'Parceiro 01 · LinkedIn');
      ex('código desconhecido aparece como veio', w.eval("nomeOrigem('feira-poa')") === 'feira-poa');
    }
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
       /LinkedIn · postagem/.test($(dom, 't-material').textContent) && /Instagram/.test($(dom, 't-abandonou').textContent));
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


  console.log('\n-- 11 · filtros: período livre, etapa e origem (v850) --');
  const ultimoPedido = (d) => d.pedidos[d.pedidos.length - 1] || {};
  const clicar = async (d, el) => { el.click(); await espera(40); };
  const escolherEtapa = async (d, v) => {
    const sel = $(d, 'f-etapa'); sel.value = v;
    sel.dispatchEvent(new d.window.Event('change')); await espera(40);
  };
  const botaoOrigem = (d, v) => qsa(d, '#f-origens button').find(b => b.getAttribute('data-origem') === v);
  const botaoDias = (d, n) => qsa(d, '.periodo button[data-dias]').find(b => b.getAttribute('data-dias') === String(n));
  const pressionado = (b) => !!b && b.getAttribute('aria-pressed') === 'true';
  const recorte = (d) => $(d, 'recorte').hidden ? '' : $(d, 'recorte').textContent;
  const hoje = hojeSP(), ontem = somaDias(hoje, -4);
  const curta = (x) => x.slice(8, 10) + '/' + x.slice(5, 7);
  async function aplicarLivre(d, de, ate) {
    $(d, 'p-livre').click();
    $(d, 'f-de').value = de; $(d, 'f-ate').value = ate;
    await clicar(d, $(d, 'f-aplicar'));
  }

  /* o roteiro inteiro, sobre uma página e um servidor quaisquer; devolve o
     que foi pedido e o que ficou na tela a cada passo */
  async function roteiro(outroHtml, opc, papel) {
    const d = montar(papel || 'dono', true, 't-' + (papel || 'dono'), null, outroHtml, opc);
    await espera(80);
    const o = { d, inicio: copia(ultimoPedido(d)) };
    await clicar(d, botaoDias(d, 7));
    o.p7 = copia(ultimoPedido(d));
    o.tela7 = { b7: pressionado(botaoDias(d, 7)), b30: pressionado(botaoDias(d, 30)) };
    await escolherEtapa(d, 'site:demonstracao');
    o.pEtapa = copia(ultimoPedido(d));
    await clicar(d, botaoOrigem(d, 'linkedin'));
    o.pOrigem = copia(ultimoPedido(d));
    o.telaTres = {
      origemLinkedin: pressionado(botaoOrigem(d, 'linkedin')),
      todas: pressionado(botaoOrigem(d, '')),
      etapa: $(d, 'f-etapa').value,
      recorte: recorte(d), b7: pressionado(botaoDias(d, 7))
    };
    await aplicarLivre(d, ontem, hoje);
    o.pLivre = copia(ultimoPedido(d));
    o.telaLivre = {
      livre: pressionado($(d, 'p-livre')),
      algumPronto: qsa(d, '.periodo button[data-dias]').some(pressionado),
      recorte: recorte(d), de: $(d, 'f-de').value, ate: $(d, 'f-ate').value
    };
    await escolherEtapa(d, '');
    o.pSemEtapa = copia(ultimoPedido(d));
    await clicar(d, botaoOrigem(d, ''));
    o.pSemOrigem = copia(ultimoPedido(d));
    o.telaFim = { recorte: recorte(d), todas: pressionado(botaoOrigem(d, '')), livre: pressionado($(d, 'p-livre')) };
    return o;
  }
  /* as regras dos parâmetros, cada uma um booleano */
  const regrasParametros = (o) => ({
    'o primeiro pedido é 30 dias, sem filtro': o.inicio.dias === 30 && !o.inicio.etapa && !o.inicio.origem && !o.inicio.de,
    'o botão 7 dias manda dias=7': o.p7.dias === 7 && !o.p7.de,
    'a etapa manda etapa=site:demonstracao': o.pEtapa.etapa === 'site:demonstracao',
    'etapa + período: mantém dias=7': o.pEtapa.dias === 7,
    'a origem manda origem=linkedin': o.pOrigem.origem === 'linkedin',
    'origem + etapa + período juntos': o.pOrigem.etapa === 'site:demonstracao' && o.pOrigem.dias === 7,
    'Personalizado manda de e ate, sem dias': o.pLivre.de === ontem && o.pLivre.ate === hoje && !('dias' in o.pLivre),
    'período livre + etapa + origem juntos': o.pLivre.etapa === 'site:demonstracao' && o.pLivre.origem === 'linkedin',
    'Todos tira a etapa e mantém o período livre': !('etapa' in o.pSemEtapa) && o.pSemEtapa.de === ontem && o.pSemEtapa.origem === 'linkedin',
    'Todas tira a origem': !('origem' in o.pSemOrigem) && o.pSemOrigem.de === ontem
  });
  const regrasEstado = (o) => ({
    'o botão 7 dias fica marcado (e o 30 não)': o.tela7.b7 && !o.tela7.b30,
    'a origem ativa fica marcada (e Todas não)': o.telaTres.origemLinkedin && !o.telaTres.todas,
    'o seletor de etapa mostra a etapa ativa': o.telaTres.etapa === 'site:demonstracao',
    'o recorte diz a etapa': /só quem pediu demonstração/.test(o.telaTres.recorte),
    'o recorte diz a origem (pelo nome)': /origem LinkedIn · postagem/.test(o.telaTres.recorte),
    'Personalizado marcado, nenhum botão pronto': o.telaLivre.livre && !o.telaLivre.algumPronto,
    'o recorte diz as datas do período livre':
      o.telaLivre.recorte.indexOf(curta(ontem) + ' a ' + curta(hoje)) === 0,
    'o recorte combina os três': /só quem pediu demonstração · origem LinkedIn · postagem/.test(o.telaLivre.recorte),
    'os campos de data mostram o que foi aplicado': o.telaLivre.de === ontem && o.telaLivre.ate === hoje,
    'sem filtro, o recorte é só o período': o.telaFim.todas && !/só quem|origem/.test(o.telaFim.recorte) && o.telaFim.livre
  });

  const honesto = await roteiro();
  {
    console.log('  · cada filtro manda o parâmetro certo');
    const rp = regrasParametros(honesto);
    for (const k in rp) ex(k, rp[k], JSON.stringify(honesto));
    console.log('  · o estado ativo vem do eco');
    const re = regrasEstado(honesto);
    for (const k in re) ex(k, re[k]);
  }
  {
    console.log('  · ao contrário: página que não manda o parâmetro reprova');
    const semEtapa  = html.replace('if(etapa)  x.etapa  = etapa;', '');
    const semOrigem = html.replace('if(origem) x.origem = origem;', '');
    const semDe     = html.replace("x.de = muda.de; if(muda.ate) x.ate = muda.ate;", 'x.dias = 30;');
    ex('(as três mutações pegaram)', semEtapa !== html && semOrigem !== html && semDe !== html);
    const oE = regrasParametros(await roteiro(semEtapa));
    ex('sem mandar etapa, a regra da etapa reprova', !oE['a etapa manda etapa=site:demonstracao']);
    const oO = regrasParametros(await roteiro(semOrigem));
    ex('sem mandar origem, a regra da origem reprova', !oO['a origem manda origem=linkedin']);
    const oD = regrasParametros(await roteiro(semDe));
    ex('sem mandar de/ate, a regra do período livre reprova', !oD['Personalizado manda de e ate, sem dias']);
  }
  {
    console.log('  · ao contrário: sabotar o eco tem de reprovar');
    /* o servidor recebe os filtros certos mas diz que não aplicou nenhum,
       e troca o período livre por 30 dias: a tela tem de acreditar nele */
    const sab = await roteiro(null, { sabotar: (e) => Object.assign(e, {
      filtro_etapa: '', filtro_origem: '',
      dias: 30, ate: hojeSP(), de: somaDias(hojeSP(), -30) }) });
    const re = regrasEstado(sab);
    ex('eco sabotado: 7 dias deixa de aparecer marcado', !re['o botão 7 dias fica marcado (e o 30 não)']);
    ex('eco sabotado: a origem não aparece como ativa', !re['a origem ativa fica marcada (e Todas não)']);
    ex('eco sabotado: o seletor não finge a etapa', !re['o seletor de etapa mostra a etapa ativa']);
    ex('eco sabotado: o recorte não diz a etapa', !re['o recorte diz a etapa']);
    ex('eco sabotado: o recorte não diz a origem', !re['o recorte diz a origem']);
    ex('eco sabotado: Personalizado não aparece marcado', !re['Personalizado marcado, nenhum botão pronto']);
    ex('eco sabotado: o recorte não mostra as datas pedidas', !re['o recorte diz as datas do período livre']);
    /* e os pedidos continuaram certos: quem mentiu foi o eco, não o clique */
    ex('eco sabotado: a página pediu certo mesmo assim',
       sab.pOrigem.origem === 'linkedin' && sab.pLivre.de === ontem);
  }

  console.log('\n-- 12 · erro do servidor aparece como veio --');
  {
    const d = montar('dono', true, 't-dono');
    await espera(80);
    await aplicarLivre(d, hoje, ontem);   /* até antes de de */
    ex('mostra o motivo exatamente como veio',
       $(d, 'carregando').textContent === 'A data final é anterior à inicial.', $(d, 'carregando').textContent);
    ex('continua no painel (erro de filtro não é porta)', $(d, 'porta').hidden && !$(d, 'painel').hidden);
    ex('não esqueceu o token', d.window.localStorage.getItem('lh_token') === 't-dono');
    ex('não mostra números de um recorte que não foi aplicado', $(d, 'conteudo').hidden && $(d, 'recorte').hidden);
    ex('os controles voltam ao último eco (30 dias)',
       pressionado(botaoDias(d, 30)) && !pressionado($(d, 'p-livre')));
    await aplicarLivre(d, '2020-01-01', hoje);
    ex('outro motivo, outro texto — nada escrito na página',
       $(d, 'carregando').textContent === 'Período máximo de 2 anos.'
       && !/anterior à inicial|Período máximo/.test(codigo), $(d, 'carregando').textContent);
    const sel = $(d, 'f-etapa'); const op = d.window.document.createElement('option');
    op.value = 'site:inventada'; sel.appendChild(op);
    await escolherEtapa(d, 'site:inventada');
    ex('etapa desconhecida: o motivo do servidor, inteiro',
       $(d, 'carregando').textContent === 'Etapa desconhecida: site:inventada');
    ex('e o seletor volta para o que o eco diz (Todos)', $(d, 'f-etapa').value === '');
    await clicar(d, botaoDias(d, 90));
    ex('depois do erro, um filtro válido volta a desenhar', !$(d, 'conteudo').hidden && pressionado(botaoDias(d, 90)));

    /* ao contrário: a regra antiga (recusa → porta) reprovaria aqui */
    const velha = html.replace('if(!filtrado){', 'if(true){');
    ex('(a mutação pegou)', velha !== html);
    const dv = montar('dono', true, 't-dono', null, velha);
    await espera(80);
    await aplicarLivre(dv, hoje, ontem);
    ex('com a regra antiga, o erro de filtro derrubaria a sessão',
       !$(dv, 'porta').hidden && !dv.window.localStorage.getItem('lh_token'));
  }

  console.log('\n-- 13 · faixa de origens --');
  {
    const d = await comOPainelAberto();
    const vals = qsa(d, '#f-origens button').map(b => b.getAttribute('data-origem'));
    ex('Todas + uma por origem da resposta', vals.join('|') === '|linkedin|(direto)|instagram', vals.join('|'));
    ex('a faixa aparece com mais de uma origem', !$(d, 'f-origens').hidden);
    ex('Todas começa marcada', pressionado(botaoOrigem(d, '')));
    const r1 = copia(RESPOSTA); r1.origens = [r1.origens[0]];
    const d1 = await comOPainelAberto(r1);
    ex('uma origem só: a faixa some', $(d1, 'f-origens').hidden);
    const r2 = copia(RESPOSTA); r2.origens = r2.origens.slice(0, 2);
    const d2 = await comOPainelAberto(r2);
    ex('ao contrário: com duas, a faixa volta', !$(d2, 'f-origens').hidden);
  }

  console.log('\n-- 14 · "base inteira" e a nota do funil --');
  {
    const d = await comOPainelAberto();
    const marcas = () => qsa(d, '.marca-base').filter(m => !m.hidden).length;
    const notas = () => qsa(d, '#funil .etapa').map(e => !!e.querySelector('.so-email'));
    ex('sem filtro, nenhuma marca "base inteira"', marcas() === 0);
    ex('sem filtro, nenhuma nota no funil', notas().every(x => !x));
    await escolherEtapa(d, 'site:ver_planos');
    ex('com etapa: assinantes, receita, livre, cortesias e atenção marcados', marcas() === 5, marcas() + ' marcas');
    ex('a marca diz "base inteira"', qsa(d, '.marca-base').every(m => /base inteira/.test(m.textContent)));
    const n = notas();
    ex('com etapa: nota nas etapas 7 a 10', n.slice(6).every(Boolean), n.join(','));
    ex('ao contrário: nenhuma nota nas etapas 1 a 6', n.slice(0, 6).every(x => !x), n.join(','));
    ex('a nota diz o que conta', /contam só quem deixou o e-mail na compra/.test($(d, 'funil').textContent));
    await escolherEtapa(d, '');
    await clicar(d, botaoOrigem(d, 'instagram'));
    ex('só com origem: marca aparece', marcas() === 5);
    ex('só com origem: nota do funil não (não há etapa)', notas().every(x => !x));
    await clicar(d, botaoOrigem(d, ''));
    ex('ao contrário: tirando os filtros, as marcas somem', marcas() === 0);
  }

  console.log('\n-- 15 · percentual abaixo de 20 continua escondido com filtro --');
  {
    const d = await comOPainelAberto();
    await escolherEtapa(d, 'site:demonstracao');
    const pct = qsa(d, '#funil .pct').map(e => e.textContent.trim());
    ex('com filtro e amostra grande, os mesmos 4 percentuais', pct.filter(Boolean).length === 4, pct.join(','));
    const r = copia(RESPOSTA);
    r.funil = r.funil.map((e, i) => ({ n: i + 1, etapa: e.etapa, qtd: i === 0 ? 19 : 12 }));
    const d2 = await comOPainelAberto(r);
    await escolherEtapa(d2, 'site:demonstracao');
    ex('com filtro e anterior abaixo de 20, nenhum percentual',
       qsa(d2, '#funil .pct').every(e => e.textContent.trim() === ''));
    const r3 = copia(RESPOSTA);
    r3.funil = r3.funil.map((e, i) => ({ n: i + 1, etapa: e.etapa, qtd: i === 0 ? 20 : 12 }));
    const d3 = await comOPainelAberto(r3);
    await escolherEtapa(d3, 'site:demonstracao');
    ex('ao contrário: com exatos 20 na anterior, o percentual aparece',
       /60%/.test(qsa(d3, '#funil .pct')[1].textContent));
  }

  console.log('\n-- 16 · o sócio usa os filtros --');
  {
    const o = await roteiro(null, null, 'socio');
    const rp = regrasParametros(o), re = regrasEstado(o);
    ex('sócio: todos os parâmetros chegam certos', Object.values(rp).every(Boolean),
       Object.keys(rp).filter(k => !rp[k]).join(' | '));
    ex('sócio: o estado ativo vem do eco', Object.values(re).every(Boolean),
       Object.keys(re).filter(k => !re[k]).join(' | '));
    ex('sócio: continua com o selo de somente leitura', !$(o.d, 'leitura').hidden);
    const soDono = html.replace(/var PAPEIS_DO_PAINEL = \[[^\]]*\];/, "var PAPEIS_DO_PAINEL = ['dono'];");
    const dv = montar('socio', true, 't-socio', null, soDono);
    await espera(80);
    ex('ao contrário: sem "socio" na lista, nenhum filtro chega ao servidor', dv.pedidos.length === 0);
  }

  console.log('\nRESULTADO: ' + (falhou ? falhou + ' FALHOU' : 'tudo aprovado') + '\n');
  process.exit(falhou ? 1 : 0);
})();
