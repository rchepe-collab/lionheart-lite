/* ═══════════════════════════════════════════════════════════════════════════
   PROVA DO "ESQUECI MINHA SENHA" · v848

   Roda as duas portas — a do CORE (app.html) e a do painel.html — num
   navegador de mentira (jsdom), contra um servidor de mentira, e confere o
   fluxo de dois passos: pedir o código, redefinir a senha.

   O erro que esta prova existe para pegar é o clássico desse fluxo: a tela
   dizer, de algum jeito, se o e-mail existe. Pelo texto, pelo tempo ou por um
   estado diferente. Por isso o servidor de mentira VAZA DE PROPÓSITO: para o
   e-mail que não existe ele responde diferente e demora mais. A tela tem de
   ficar idêntica mesmo assim — ela não pode depender de o servidor ser
   discreto.

   TESTE AO CONTRÁRIO: cada verificação roda também contra uma cópia sabotada
   da página (a defesa correspondente arrancada) e TEM de reprovar. Verificação
   que passa com a defesa arrancada não verifica nada.

   Uso:  npm i --no-save jsdom && node prova_senha.js
   Sai 1 se qualquer verificação reprovar.
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
/* os arquivos são procurados AO LADO desta prova, nunca num caminho absoluto */
const daqui = (n) => require('path').join(__dirname, n);

let falhou = 0;
const ex = (nome, ok, detalhe) => {
  console.log('  ' + nome.padEnd(60, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (detalhe ? ' · ' + detalhe : '')));
  if (!ok) falhou++;
};

const NEUTRA = 'Se existir uma conta com esse e-mail, o código chega em instantes. Ele vale 15 minutos.';
const MOTIVOS = [
  'Código incorreto.',
  'O código expirou. Peça um novo.',
  'Código inválido ou já usado. Peça um novo.',
  'Tentativas demais. Peça um novo código.',
  'A nova senha precisa de ao menos 8 caracteres.'
];
/* o que a tela nunca pode dizer */
const REVELA = /n[ãa]o\s+(foi\s+)?(encontrad|existe|cadastrad|localizad|registrad)|inexistente|desconhecid|sem\s+conta\s+com/i;
const EXISTE = 'carlos@escritorio.com.br';
const INVENTADO = 'ninguem.aqui@nada.com.br';
const CODIGO = '430312';

/* ── as duas portas ─────────────────────────────────────────────────────────
   O CORE tem 9 MB: a porta de login é recortada pelos marcadores que ela
   mesma tem e roda sozinha. Se os marcadores sumirem, a prova quebra alto em
   vez de testar outra coisa. */
const APP = fs.readFileSync(daqui('app.html'), 'utf8');
const INI = 'LIONHEART — PORTA DE LOGIN';
const FIM = '<!-- ════════ FIM DA PORTA DE LOGIN ════════ -->';
function recortarPorta(src) {
  const i = src.indexOf(INI), f = src.indexOf(FIM);
  if (i < 0 || f < 0 || f < i) throw new Error('marcadores da porta de login não encontrados em app.html');
  return '<!doctype html><html><head><meta charset="utf-8"></head><body><!-- ' + src.slice(i, f + FIM.length) + '</body></html>';
}

const PAGINAS = [
  {
    nome: 'CORE',
    fonte: APP,
    montar: recortarPorta,
    url: 'https://lionheartintelligence.com.br/app.html',
    id: {
      link: 'lh-rec-link', painel: 'lh-rec', p1: 'lh-rec-p1', p2: 'lh-rec-p2', email: 'lh-rec-email',
      enviar: 'lh-rec-enviar', info: 'lh-rec-info', codigo: 'lh-rec-codigo', nova: 'lh-rec-nova',
      conf: 'lh-rec-conf', salvar: 'lh-rec-salvar', reenviar: 'lh-rec-reenviar', msg: 'lh-rec-msg',
      voltar: 'lh-rec-voltar', loginEmail: 'lh-login-email', loginSenha: 'lh-login-senha',
      loginBtn: 'lh-login-btn', loginMsg: 'lh-login-msg'
    },
    /* o trecho de código do fluxo, para a varredura de texto */
    trecho: (s) => s.slice(s.indexOf('id="lh-rec-link-caixa"'), s.indexOf(FIM)),
    sabotar: {
      leResposta: [[
        ".then(function(){ seguir(false); }, function(){ seguir(true); });",
        ".then(function(r){ return r.json(); }).then(function(d){ if(d && d.ok === false){ if(btn){ btn.disabled = false; } return _lhRecAviso(d.motivo); } seguir(false); }, function(){ seguir(true); });"
      ]],
      semPiso: [['var LH_REC_PISO_MS = 1200;', 'var LH_REC_PISO_MS = 0;']],
      dizNaoEncontrado: [[
        "var LH_REC_NEUTRA  = 'Se existir uma conta com esse e-mail, o código chega em instantes. Ele vale 15 minutos.';",
        "var LH_REC_NEUTRA  = 'E-mail não encontrado.';"
      ]],
      codigoLivre: [["if(!/^[0-9]{6}$/.test(codigo)) return", 'if(false) return']],
      senhaCurta: [['if(nova.length < 8) return', 'if(false) return']],
      semConfirmar: [['if(nova !== conf) return', 'if(false) return']],
      motivoTraduzido: [["_lhRecAviso((res && res.motivo) || 'Não foi possível redefinir a senha.');", "_lhRecAviso('Não foi possível redefinir a senha.');"]],
      entraSozinho: [["if(res && res.ok) return lhRecFechar('Senha redefinida. Entre com a senha nova.');",
                      "if(res && res.ok) return lhEntrarOk({ ok:true, token:'t-auto', nome:'x' });"]],
      codigoGuardado: [["if(!/^[0-9]{6}$/.test(codigo)) return _lhRecAviso('O código tem 6 dígitos, só números.');",
                        "if(!/^[0-9]{6}$/.test(codigo)) return _lhRecAviso('O código tem 6 dígitos, só números.'); try{ localStorage.setItem('lh_rec_codigo', codigo); }catch(e){}"]],
      codigoNaUrl: [["if(!/^[0-9]{6}$/.test(codigo)) return _lhRecAviso('O código tem 6 dígitos, só números.');",
                     "if(!/^[0-9]{6}$/.test(codigo)) return _lhRecAviso('O código tem 6 dígitos, só números.'); try{ history.replaceState(null, '', '?codigo=' + codigo); }catch(e){}"]],
      senhaSemNova: [['<input id="lh-rec-nova" type="password" autocomplete="new-password"', '<input id="lh-rec-nova" type="password" autocomplete="current-password"']],
      reenviarPreso: [['onclick="lhRecPasso(1)"', 'onclick="lhRecPasso(2)"']]
    }
  },
  {
    nome: 'PAINEL',
    fonte: fs.readFileSync(daqui('painel.html'), 'utf8'),
    montar: (s) => s,
    url: 'https://lionheartintelligence.com.br/painel.html',
    id: {
      link: 'rec-link', painel: 'porta-rec', p1: 'rec-p1', p2: 'rec-p2', email: 'rec-email',
      enviar: 'rec-enviar', info: 'rec-info', codigo: 'rec-codigo', nova: 'rec-nova',
      conf: 'rec-conf', salvar: 'rec-salvar', reenviar: 'rec-reenviar', msg: 'rec-msg',
      voltar: 'rec-voltar', loginEmail: 'email', loginSenha: 'senha',
      loginBtn: 'entrar', loginMsg: 'aviso-porta'
    },
    trecho: (s) => s.slice(s.indexOf('<div id="porta-login">'), s.indexOf('<!-- ═══ PAINEL ═══ -->'))
                 + s.slice(s.indexOf('/* ── esqueci minha senha'), s.indexOf('/* ── painel ──')),
    sabotar: {
      leResposta: [[
        ".then(function(){ seguir(false); }, function(){ seguir(true); });",
        ".then(function(r){ return r.json(); }).then(function(d){ if(d && d.ok === false){ btn.disabled = false; recAviso(d.motivo); return; } seguir(false); }, function(){ seguir(true); });"
      ]],
      semPiso: [['var REC_PISO_MS = 1200;', 'var REC_PISO_MS = 0;']],
      dizNaoEncontrado: [[
        "var REC_NEUTRA  = 'Se existir uma conta com esse e-mail, o código chega em instantes. Ele vale 15 minutos.';",
        "var REC_NEUTRA  = 'E-mail não encontrado.';"
      ]],
      codigoLivre: [["if(!/^[0-9]{6}$/.test(codigo)){", 'if(false){']],
      senhaCurta: [['if(nova.length < 8){', 'if(false){']],
      semConfirmar: [['if(nova !== conf){', 'if(false){']],
      motivoTraduzido: [["recAviso((d && d.motivo) || 'Não foi possível redefinir a senha.');", "recAviso('Não foi possível redefinir a senha.');"]],
      entraSozinho: [["if(d && d.ok){ recFechar('Senha redefinida. Entre com a senha nova.'); return; }",
                      "if(d && d.ok){ guardar('t-auto'); abrir('x'); return; }"]],
      codigoGuardado: [["recAviso('O código tem 6 dígitos, só números.'); return; }",
                        "recAviso('O código tem 6 dígitos, só números.'); return; } try{ localStorage.setItem('lh_rec_codigo', codigo); }catch(e){}"]],
      codigoNaUrl: [["recAviso('O código tem 6 dígitos, só números.'); return; }",
                     "recAviso('O código tem 6 dígitos, só números.'); return; } try{ history.replaceState(null, '', '?codigo=' + codigo); }catch(e){}"]],
      senhaSemNova: [['<input id="rec-nova" type="password" autocomplete="new-password">', '<input id="rec-nova" type="password" autocomplete="current-password">']],
      reenviarPreso: [["addEventListener('click', function(){ recPasso(1); });", "addEventListener('click', function(){ recPasso(2); });"]]
    }
  }
];

function sabotada(pag, chave) {
  let s = pag.fonte;
  for (const [de, para] of pag.sabotar[chave]) {
    if (s.split(de).length !== 2) throw new Error(pag.nome + ': a sabotagem "' + chave + '" não achou o alvo (uma vez só) — a prova ao contrário ficaria sem efeito');
    s = s.replace(de, para);
  }
  return s;
}

/* ── servidor de mentira ────────────────────────────────────────────────────
   Vaza de propósito: para o e-mail inventado responde "não encontrado" e
   demora bem mais. O servidor de verdade não faz isso — a tela é que não pode
   depender de ele não fazer. */
function servidor(dom, op) {
  return (url, opts) => {
    const corpo = JSON.parse((opts && opts.body) || '{}');
    dom.chamadas.push({ url: String(url), corpo });
    const responder = (o, ms) => new Promise((r) => setTimeout(() => r({ json: async () => o }), ms || 0));
    if (corpo.action === 'recuperar') {
      return corpo.email === EXISTE ? responder({ ok: true }, 5)
                                    : responder({ ok: false, motivo: 'E-mail não encontrado.' }, 400);
    }
    if (corpo.action === 'redefinir') {
      const r = (op.redefinir || []).shift() || { ok: true };
      return responder(r, 5);
    }
    if (corpo.action === 'verificar') return responder({ ok: false, motivo: 'Sessão expirada.' }, 1);
    /* login de verdade: se isto for chamado depois de redefinir, a tela entrou sozinha */
    return responder({ ok: true, token: 't-login', nome: 'Carlos', admin: 'dono' }, 1);
  };
}

function abrir(pag, src, op) {
  op = op || {};
  const vc = new VirtualConsole();
  const dom = new JSDOM(pag.montar(src), {
    runScripts: 'dangerously', url: pag.url, virtualConsole: vc,
    beforeParse(w) { w.fetch = (u, o) => servidor(dom, op)(u, o); }
  });
  dom.chamadas = [];
  const w = dom.window, d = w.document;
  const el = (k) => d.getElementById(pag.id[k]);
  const visivel = (e) => {
    for (let x = e; x && x.nodeType === 1; x = x.parentElement) {
      if (x.hidden || x.style.display === 'none') return false;
    }
    return !!e;
  };
  const digitar = (k, v) => { const e = el(k); e.value = v; e.dispatchEvent(new w.Event('input', { bubbles: true })); };
  const clicar = (k) => el(k).click();
  const chamadasDe = (acao) => dom.chamadas.filter((c) => c.corpo.action === acao);
  /* o que a tela mostra do fluxo: texto visível, que partes aparecem, botões */
  const retrato = () => {
    const partes = ['painel', 'p1', 'p2', 'msg', 'info', 'enviar', 'salvar', 'reenviar', 'voltar']
      .map((k) => k + ':' + visivel(el(k)) + (el(k).disabled ? ':off' : ''));
    const texto = [];
    const andar = (n) => {
      if (n.nodeType === 3) { if (n.textContent.trim()) texto.push(n.textContent.trim()); return; }
      if (n.nodeType !== 1 || !visivel(n) || n.tagName === 'SCRIPT' || n.tagName === 'STYLE') return;
      n.childNodes.forEach(andar);
    };
    andar(el('painel'));
    return JSON.stringify({ partes, texto, msg: el('msg').textContent, info: el('info').textContent });
  };
  return { dom, w, d, el, visivel, digitar, clicar, chamadasDe, retrato };
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
async function ate(cond, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < (ms || 4000)) { if (cond()) return true; await espera(10); }
  return cond();
}

/* passo 1 inteiro: digita no login, abre a recuperação, envia */
async function pedirCodigo(pag, src, email, op) {
  const p = abrir(pag, src, op);
  await espera(20);
  p.digitar('loginEmail', email);
  p.clicar('link');
  const t0 = Date.now();
  p.clicar('enviar');
  const chegou = await ate(() => p.visivel(p.el('p2')), 3000);
  p.tempo = Date.now() - t0;
  if (!chegou) await ate(() => !p.el('enviar').disabled, 1000);
  p.chegou = chegou;
  return p;
}

async function redefinir(pag, src, codigo, nova, conf, op) {
  const p = await pedirCodigo(pag, src, EXISTE, op);
  if (!p.chegou) return p;
  p.digitar('codigo', codigo);
  p.el('nova').value = nova;
  p.el('conf').value = conf;
  p.clicar('salvar');
  await espera(60);
  return p;
}

/* ── as verificações ────────────────────────────────────────────────────────
   Cada uma devolve [ok, detalhe] e roda igual contra a página e contra a
   cópia sabotada. */
const VERIFICA = [
  {
    nome: 'link "Esqueci minha senha" abaixo do Entrar, deslogado',
    async rodar(pag, src) {
      const p = abrir(pag, src); await espera(20);
      const l = p.el('link'), b = p.el('loginBtn');
      if (!l) return [false, 'sem link'];
      const abaixo = !!(b.compareDocumentPosition(l) & p.w.Node.DOCUMENT_POSITION_FOLLOWING);
      return [l.textContent.trim() === 'Esqueci minha senha' && abaixo && p.visivel(l) && p.visivel(b),
              'texto=' + l.textContent.trim() + ' abaixo=' + abaixo + ' visível=' + p.visivel(l)];
    }
  },
  {
    nome: 'abre na mesma página, e-mail já preenchido',
    async rodar(pag, src) {
      const p = abrir(pag, src); await espera(20);
      p.digitar('loginEmail', EXISTE); p.clicar('link');
      const ok = p.visivel(p.el('painel')) && p.visivel(p.el('p1')) && !p.visivel(p.el('p2'))
              && !p.visivel(p.el('loginBtn')) && p.el('email').value === EXISTE
              && p.w.location.href === pag.url;
      return [ok, 'e-mail=' + p.el('email').value];
    }
  },
  {
    nome: 'mesma mensagem, com e-mail existente ou inventado',
    sabotagem: 'leResposta',
    async rodar(pag, src) {
      const a = await pedirCodigo(pag, src, EXISTE);
      const b = await pedirCodigo(pag, src, INVENTADO);
      const ra = a.retrato(), rb = b.retrato().split(INVENTADO).join(EXISTE);
      const ok = a.chegou && b.chegou && ra === rb
              && a.el('info').textContent === NEUTRA && b.el('info').textContent === NEUTRA;
      return [ok, ok ? '' : 'existente=' + ra + ' | inventado=' + rb];
    }
  },
  {
    nome: 'mesmo tempo de resposta, com e-mail existente ou inventado',
    sabotagem: 'semPiso',
    async rodar(pag, src) {
      const a = await pedirCodigo(pag, src, EXISTE);
      const b = await pedirCodigo(pag, src, INVENTADO);
      const dif = Math.abs(a.tempo - b.tempo);
      return [a.chegou && b.chegou && dif < 150, 'existente=' + a.tempo + 'ms inventado=' + b.tempo + 'ms'];
    }
  },
  {
    nome: 'nunca escreve "não encontrado" ou equivalente',
    sabotagem: 'dizNaoEncontrado',
    async rodar(pag, src) {
      /* o código sem comentário: o comentário pode explicar o que a tela não
         diz, sem que a tela diga */
      const codigo = pag.trecho(src).replace(/<!--[\s\S]*?-->/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ');
      const noCodigo = REVELA.exec(codigo);
      const a = await pedirCodigo(pag, src, INVENTADO);
      const naTela = REVELA.exec(a.retrato());
      return [!noCodigo && !naTela, (noCodigo ? 'código: ' + noCodigo[0] : '') + (naTela ? ' tela: ' + naTela[0] : '')];
    }
  },
  {
    nome: 'código só com dígitos, 6 posições',
    sabotagem: 'codigoLivre',
    async rodar(pag, src) {
      const p = await pedirCodigo(pag, src, EXISTE);
      const c = p.el('codigo');
      const attrs = c.getAttribute('inputmode') === 'numeric' && c.getAttribute('maxlength') === '6';
      p.digitar('codigo', '12a4b5'); const filtra = c.value === '1245';
      p.digitar('codigo', '12345678'); const corta = c.value === '123456';
      p.el('nova').value = 'senhaboa123'; p.el('conf').value = 'senhaboa123';
      /* e sem o filtro do campo (colado por script, autocompletar): a tela barra igual */
      const barrados = ['abcdef', '12345', '12 456', '1234567'].every((v) => {
        c.value = v; p.clicar('salvar'); return p.chamadasDe('redefinir').length === 0 && p.el('msg').textContent !== '';
      });
      return [attrs && filtra && corta && barrados, 'atributos=' + attrs + ' filtra=' + filtra + ' corta=' + corta + ' barra=' + barrados];
    }
  },
  {
    nome: 'senha menor que 8 barrada antes do servidor',
    sabotagem: 'senhaCurta',
    async rodar(pag, src) {
      const p = await redefinir(pag, src, CODIGO, 'abc1234', 'abc1234');
      return [p.chegou && p.chamadasDe('redefinir').length === 0 && p.el('msg').textContent !== '',
              'chamadas=' + p.chamadasDe('redefinir').length];
    }
  },
  {
    nome: 'senha e confirmação diferentes não enviam',
    sabotagem: 'semConfirmar',
    async rodar(pag, src) {
      const p = await redefinir(pag, src, CODIGO, 'senhaboa123', 'senhaboa124');
      return [p.chegou && p.chamadasDe('redefinir').length === 0 && p.el('msg').textContent !== '',
              'chamadas=' + p.chamadasDe('redefinir').length];
    }
  },
  {
    nome: 'motivo de erro do servidor aparece como veio',
    sabotagem: 'motivoTraduzido',
    async rodar(pag, src) {
      const p = await pedirCodigo(pag, src, EXISTE, { redefinir: MOTIVOS.map((m) => ({ ok: false, motivo: m })) });
      const vistos = [];
      for (const m of MOTIVOS) {
        p.digitar('codigo', CODIGO); p.el('nova').value = 'senhaboa123'; p.el('conf').value = 'senhaboa123';
        p.clicar('salvar');
        await ate(() => p.el('msg').textContent !== '' && !p.el('salvar').disabled, 1000);
        vistos.push(p.el('msg').textContent);
      }
      const ok = MOTIVOS.every((m, i) => vistos[i] === m) && p.visivel(p.el('p2'));
      return [ok, ok ? '' : 'viu: ' + vistos.join(' | ')];
    }
  },
  {
    nome: 'sucesso volta ao login sem entrar sozinho',
    sabotagem: 'entraSozinho',
    async rodar(pag, src) {
      const p = await redefinir(pag, src, CODIGO, 'senhaboa123', 'senhaboa123', { redefinir: [{ ok: true }] });
      await espera(60);
      const semLogin = p.dom.chamadas.every((c) => c.corpo.action === 'recuperar' || c.corpo.action === 'redefinir' || c.corpo.action === 'verificar');
      const semToken = !p.w.localStorage.getItem('lh_token') && !p.w.sessionStorage.getItem('lh_logado');
      const naPorta = p.visivel(p.el('loginBtn')) && !p.visivel(p.el('painel'))
                   && p.el('loginEmail').value === EXISTE && p.el('loginSenha').value === ''
                   && p.el('loginMsg').textContent.trim() !== '';
      const fora = !p.d.getElementById('painel') || p.d.getElementById('painel').hidden;   /* painel.html: nada aberto */
      return [semLogin && semToken && naPorta && fora,
              'semLogin=' + semLogin + ' semToken=' + semToken + ' naPorta=' + naPorta + ' painelFechado=' + fora];
    }
  },
  {
    nome: 'código fora do armazenamento do navegador',
    sabotagem: 'codigoGuardado',
    async rodar(pag, src) { return rastroDoCodigo(pag, src, 'armazenamento'); }
  },
  {
    nome: 'código fora da URL',
    sabotagem: 'codigoNaUrl',
    async rodar(pag, src) { return rastroDoCodigo(pag, src, 'url'); }
  },
  {
    nome: 'senha nova com autocomplete="new-password"',
    sabotagem: 'senhaSemNova',
    async rodar(pag, src) {
      const p = abrir(pag, src); await espera(20);
      const a = p.el('nova').getAttribute('autocomplete'), b = p.el('conf').getAttribute('autocomplete');
      return [a === 'new-password' && b === 'new-password', 'nova=' + a + ' conf=' + b];
    }
  },
  {
    nome: '"Não recebi o código" volta ao passo 1',
    sabotagem: 'reenviarPreso',
    async rodar(pag, src) {
      const p = await pedirCodigo(pag, src, EXISTE);
      p.digitar('codigo', '123');
      p.clicar('reenviar');
      const ok = p.chegou && p.visivel(p.el('p1')) && !p.visivel(p.el('p2'))
              && p.el('email').value === EXISTE && p.el('reenviar').textContent.trim() === 'Não recebi o código';
      return [ok, 'passo1=' + p.visivel(p.el('p1'))];
    }
  }
];

/* um erro com o código, depois o acerto: e em nenhum momento o código pode
   estar na URL, no histórico ou no armazenamento */
async function rastroDoCodigo(pag, src, onde) {
  const p = await redefinir(pag, src, CODIGO, 'senhaboa123', 'senhaboa123',
                            { redefinir: [{ ok: false, motivo: 'Código incorreto.' }, { ok: true }] });
  await ate(() => p.el('msg').textContent !== '', 1000);
  const urlMeio = p.w.location.href;
  p.digitar('codigo', CODIGO); p.el('nova').value = 'senhaboa123'; p.el('conf').value = 'senhaboa123';
  p.clicar('salvar');
  await espera(80);
  const foiNoCorpo = p.chamadasDe('redefinir').some((c) => c.corpo.codigo === CODIGO);   /* sanidade: o código sai, pelo corpo */
  if (onde === 'url') {
    const naUrl = [urlMeio, p.w.location.href].concat(p.dom.chamadas.map((c) => c.url)).some((u) => u.indexOf(CODIGO) >= 0);
    return [p.chegou && foiNoCorpo && !naUrl, 'corpo=' + foiNoCorpo + ' url=' + (naUrl ? urlMeio : 'limpa')];
  }
  const guardado = [p.w.localStorage, p.w.sessionStorage].some((st) => {
    for (let i = 0; i < st.length; i++) { const k = st.key(i); if ((k + '=' + st.getItem(k)).indexOf(CODIGO) >= 0) return true; }
    return false;
  });
  return [p.chegou && foiNoCorpo && !guardado, 'corpo=' + foiNoCorpo + ' guardado=' + guardado];
}

(async () => {
  for (const pag of PAGINAS) {
    console.log('\n' + pag.nome);
    for (const v of VERIFICA) {
      let r;
      try { r = await v.rodar(pag, pag.fonte); } catch (e) { r = [false, 'erro: ' + e.message]; }
      ex(v.nome, r[0], r[1]);
    }
    console.log('  — ao contrário: a defesa arrancada, a verificação tem de reprovar');
    for (const v of VERIFICA) {
      if (!v.sabotagem) continue;
      let r;
      try { r = await v.rodar(pag, sabotada(pag, v.sabotagem)); }
      catch (e) { ex('sem ' + v.sabotagem, false, e.message); continue; }
      ex('sem ' + v.sabotagem + ' → reprova', !r[0], r[0] ? 'passou com a defesa arrancada' : '');
    }
  }
  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado');
  process.exit(falhou ? 1 : 0);
})();
