/* ═══════════════════════════════════════════════════════════════════════════
   PROVA DO PAINEL DO DONO

   Roda a página num navegador de mentira (jsdom) com um servidor de mentira,
   e confere os três caminhos que importam:
     1. dono entra e vê os números que o servidor mandou — nem um a mais;
     2. suporte é barrado NA PORTA, antes de qualquer número aparecer;
     3. sessão vencida volta para a porta em vez de mostrar tela vazia.

   E confere o que a página promete não ter: chave secreta, número escrito,
   biblioteca de fora.
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const { JSDOM } = require('jsdom');

let falhou = 0;
const ex = (nome, ok, detalhe) => {
  console.log('  ' + nome.padEnd(54, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (detalhe ? ' · ' + detalhe : '')));
  if (!ok) falhou++;
};
const html = fs.readFileSync('painel.html', 'utf8');

/* o que o banco devolveria para o dono */
const RESPOSTA = {
  ok: true, dias: 30,
  funil: [
    { n: 1, etapa: 'Visitas ao site', qtd: 120 }, { n: 2, etapa: 'Clicou em ver planos', qtd: 40 },
    { n: 3, etapa: 'Abriu a página de compra', qtd: 25 }, { n: 4, etapa: 'Escolheu um plano', qtd: 12 },
    { n: 5, etapa: 'Aceitou e recebeu o link do Asaas', qtd: 6 }, { n: 6, etapa: 'Pagou', qtd: 2 },
    { n: 7, etapa: 'Baixou material', qtd: 9 }, { n: 8, etapa: 'Criou conta', qtd: 11 }
  ],
  abandonou: [{ email: 'x@y.com', plano: 'especialista', ciclo: 'anual', quando: '2026-09-18T10:00:00Z', tentativas: 2, tem_conta: false }],
  assinantes: { livre: 7, preparacao: 1, consultoria: 1, especialista: 0, parceiro: 1, core: 1 },
  receita_mensal: 798,
  atencao: [{ empresa: 'Carlos', plano: 'parceiro', valido_ate: '2026-12-31', aviso: 'cortesia vence em 3 dia(s)' }],
  uso: { calculos: 340, pessoas: 4, top: [{ calc: 'c05', vezes: 80 }, { calc: 'c01', vezes: 44 }] }
};

/* servidor de mentira: decide pelo corpo da chamada */
function servidor(papel, sessaoValida) {
  return async (url, opts) => {
    const corpo = JSON.parse((opts && opts.body) || '{}');
    const responder = (o) => ({ json: async () => o });
    if (String(url).endsWith('/login')) {
      if (corpo.action === 'verificar') return responder(sessaoValida ? { ok: true, nome: 'Ricardo', admin: papel } : { ok: false, motivo: 'Sessão expirada.' });
      if (corpo.email === 'dono@x.com') return responder({ ok: true, nome: 'Ricardo', admin: 'dono', token: 't-dono' });
      if (corpo.email === 'sup@x.com')  return responder({ ok: true, nome: 'Suporte', admin: 'suporte', token: 't-sup' });
      return responder({ ok: false, motivo: 'Email ou senha incorretos.' });
    }
    if (String(url).endsWith('/calcular')) {
      const auth = (opts.headers || {})['Authorization'] || '';
      if (!auth.replace('Bearer ', '')) return responder({ ok: false, recusa: 'identidade', motivo: 'Sessão ausente.' });
      if (corpo.calc !== 'painel') return responder({ ok: false, recusa: 'modulo' });
      return responder(papel === 'dono' ? { ok: true, resultado: RESPOSTA } : { ok: true, resultado: { ok: false, motivo: 'Painel restrito à direção.' } });
    }
    return responder({ ok: false });
  };
}

function montar(papel, sessaoValida, tokenGuardado) {
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://lionheartintelligence.com.br/painel.html' });
  const w = dom.window;
  if (tokenGuardado) w.localStorage.setItem('lh_token', tokenGuardado);
  w.fetch = servidor(papel, sessaoValida);
  const scripts = [...dom.window.document.querySelectorAll('script')].map(s => s.textContent);
  for (const s of scripts) w.eval(s);
  return dom;
}
const espera = (ms) => new Promise(r => setTimeout(r, ms));
const $ = (dom, id) => dom.window.document.getElementById(id);

(async () => {
  console.log('\n-- o que a página não pode ter --');
  ex('nenhuma chave de serviço',       !/service_role|SERVICE_KEY|eyJhbGciOi/.test(html));
  ex('nenhuma biblioteca de fora',     !/<script[^>]+src=["']https?:/.test(html));
  ex('nenhum número de negócio escrito', !/R\$\s?\d/.test(html.replace(/<script[\s\S]*<\/script>/, '')));
  ex('não é indexada por buscador',    /noindex/.test(html));

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
  ex('as 8 etapas do funil', dom.window.document.querySelectorAll('#funil .etapa').length === 8);
  ex('conversão da etapa 2 = 33% da anterior', /33%/.test(dom.window.document.querySelectorAll('#funil .pct')[1].textContent));
  ex('lista de quem abandonou', $(dom, 't-abandonou').querySelectorAll('tr').length === 1 && /x@y\.com/.test($(dom, 't-abandonou').textContent));
  ex('marca quem não tem conta', /sem conta/.test($(dom, 't-abandonou').textContent));
  ex('o que pede decisão hoje', /Carlos/.test($(dom, 't-atencao').textContent) && /3 dia/.test($(dom, 't-atencao').textContent));
  ex('top de uso', $(dom, 't-uso').querySelectorAll('tr').length === 2);
  ex('nada vindo de fora vira HTML (escape)', !/<script/.test($(dom, 't-abandonou').innerHTML));

  console.log('\n-- 2 · o suporte é barrado na porta --');
  dom = montar('suporte', false, null);
  await espera(20);
  $(dom, 'email').value = 'sup@x.com'; $(dom, 'senha').value = 'segredo';
  $(dom, 'entrar').click();
  await espera(60);
  ex('continua na porta', !$(dom, 'porta').hidden && $(dom, 'painel').hidden);
  ex('diz que é só da direção', /direção/.test($(dom, 'aviso-porta').textContent));
  ex('não guardou token', !dom.window.localStorage.getItem('lh_token'));
  ex('nenhum número foi desenhado', $(dom, 'k-pagantes').textContent === '—');

  console.log('\n-- 3 · sessão vencida volta para a porta --');
  dom = montar('dono', false, 't-velho');
  await espera(60);
  ex('mostra a porta, não tela vazia', !$(dom, 'porta').hidden);
  ex('esqueceu o token velho', !dom.window.localStorage.getItem('lh_token'));

  console.log('\n-- 4 · sessão válida do CORE entra direto --');
  dom = montar('dono', true, 't-dono');
  await espera(80);
  ex('entrou sem pedir senha', $(dom, 'porta').hidden && !$(dom, 'painel').hidden);
  ex('mostra quem é', /Ricardo/.test($(dom, 'quem').textContent));

  console.log('\nRESULTADO: ' + (falhou ? falhou + ' FALHOU' : 'tudo aprovado') + '\n');
  process.exit(falhou ? 1 : 0);
})();
