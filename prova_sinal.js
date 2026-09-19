/* ═══════════════════════════════════════════════════════════════════════════
   PROVA DO FAROL DO FUNIL

   O erro que esta prova existe para pegar: o site manda um evento que o banco
   não conhece. A lista branca da fn_sinal recusa em silêncio — nada quebra,
   nada aparece na tela, e a medição simplesmente não existe. Descobre-se
   semanas depois, olhando um funil com etapa zerada, quando a campanha já
   passou. Por isso os nomes dos eventos são conferidos um a um contra a lista
   que está escrita no banco (copiada aqui, e a divergência é o que reprova).

   E o erro de 19/09, que é a razão da metade nova desta prova: o farol passou
   em 22 verificações de TEXTO estando completamente mudo. sendBeacon devolvia
   true, o CORS recusava, e nada chegava ao banco. Prova que só lê o arquivo
   não prova que o sinal sai. Daí as verificações abaixo RODAREM o farol num
   navegador de mentira e olharem o que de fato saiu pela rede.

   E confere a promessa de privacidade: o farol não pode mandar IP, não pode
   mandar impressão digital de aparelho, e não pode mandar e-mail que a pessoa
   não digitou.
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const { JSDOM } = require('jsdom');
/* Os arquivos são procurados AO LADO desta prova, nunca num caminho absoluto:
   a versão anterior trazia o caminho da máquina onde nasceu escrito dentro e
   só rodava lá — em qualquer outra, quebrava antes da primeira verificação.
   Prova que não roda não prova nada. */
const daqui = (n) => require('path').join(__dirname, n);

/* a lista branca como está na fn_sinal (v838). Se mudar lá, muda aqui — e é
   esta cópia que faz a divergência aparecer em vez de sumir. */
const PERMITIDOS = [
  'site:visita', 'site:ver_planos', 'site:whatsapp', 'site:material',
  'site:demonstracao',
  'assinar:abriu', 'assinar:escolheu', 'assinar:recusou_termos',
  'assinar:digitou_email',
  'app:abriu', 'app:cadastro_iniciou'
];

let falhou = 0;
const ex = (nome, ok, detalhe) => {
  console.log('  ' + nome.padEnd(52, '.') + ' ' + (ok ? 'true' : 'FALHOU'
    + (detalhe ? ' · ' + detalhe : '')));
  if (!ok) falhou++;
};

const farol   = fs.readFileSync(daqui('sinal.js'), 'utf8');
const index   = fs.readFileSync(daqui('index.html'), 'utf8');
const assinar = fs.readFileSync(daqui('assinar.html'), 'utf8');

/* ── navegador de mentira ───────────────────────────────────────────────────
   Roda o farol de verdade e guarda tudo que ele tentou mandar, por qual
   caminho. É isto que pega o farol mudo. */
function navegador(op) {
  op = op || {};
  const dom = new JSDOM(op.html || '<!doctype html><html><body></body></html>', {
    url: op.url || 'https://lionheartintelligence.com.br/',
    runScripts: 'outside-only'
  });
  const w = dom.window;
  const saiu = { fetch: [], beacon: [] };

  for (const k of Object.keys(op.guardado || {})) {
    if (op.guardado[k] != null) w.localStorage.setItem(k, op.guardado[k]);
  }

  /* navegador moderno tem keepalive; passando semKeepalive, é um velho */
  if (op.semKeepalive) { delete w.Request; w.Request = undefined; }
  else w.Request = function (u) { this.url = u; this.keepalive = false; };

  /* Blob de mentira que deixa ler o que foi posto dentro dele */
  w.Blob = function (partes, o) { this.partes = partes; this.type = (o || {}).type || ''; };

  w.fetch = function (u, o) {
    saiu.fetch.push({ url: String(u), corpo: JSON.parse((o || {}).body || '{}'), op: o || {} });
    return { 'catch': function () { return this; } };
  };
  w.navigator.sendBeacon = function (u, b) {
    saiu.beacon.push({ url: String(u), corpo: JSON.parse((b && b.partes && b.partes[0]) || '{}') });
    return true;
  };

  w.eval(farol);
  return { dom, w, saiu };
}
const eventos = (saiu) => saiu.fetch.concat(saiu.beacon).map(x => x.corpo.e);
const clicar = (w, el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));

console.log('\n-- eventos --');
/* todo nome de evento que aparece no farol e nas páginas */
const usados = new Set();
for (const fonte of [farol, index, assinar]) {
  for (const m of fonte.matchAll(/['"]((?:site|assinar|app):[a-z_]+)['"]/g)) usados.add(m[1]);
}
ex('a lista branca copiada tem 11 eventos', PERMITIDOS.length === 11, PERMITIDOS.length + ' na cópia');
ex('o site declara pelo menos 5 eventos', usados.size >= 5, usados.size + ' encontrados');
const fora = [...usados].filter(e => !PERMITIDOS.includes(e));
ex('todo evento existe na lista branca do banco', fora.length === 0, 'fora da lista: ' + fora.join(', '));

for (const e of ['site:visita', 'site:ver_planos', 'site:whatsapp', 'site:demonstracao',
                 'assinar:abriu', 'assinar:escolheu', 'assinar:recusou_termos',
                 'assinar:digitou_email']) {
  ex('registra ' + e, usados.has(e));
}

console.log('\n-- privacidade --');
/* olha o CÓDIGO, não os comentários: o farol fala de IP justamente para dizer
   que não coleta, e a primeira versão desta prova reprovou por causa disso. */
const codigo = farol
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/.*$/gm, '$1 ');
ex('não coleta IP',                 !/\bip\b|ipify|myip|getIP/i.test(codigo));
ex('não faz impressão digital',     !/canvas|webgl|fingerprint|userAgent|screen\.|plugins/i.test(codigo));
ex('o id do visitante é aleatório', /getRandomValues|Math\.random/.test(farol));
ex('e-mail só quando a pessoa digitou', /extras\.m/.test(farol));
ex('o e-mail não é lido a cada tecla', !/addEventListener\(\s*'(input|keyup|keydown|keypress)'/.test(codigo));
ex('o farol diz o que faz (comentário LGPD)', /LGPD/.test(farol));

console.log('\n-- medir não derruba a página --');
ex('o farol inteiro está protegido', (farol.match(/try\s*{/g) || []).length >= 4);
ex('a chamada não é esperada',       /catch|keepalive|sendBeacon/.test(farol));
ex('carregado com defer nas duas páginas',
   /src="sinal\.js" defer/.test(index) && /src="sinal\.js" defer/.test(assinar));
ex('as chamadas nas páginas estão em try',
   /try\{[^}]*LH_SINAL/.test(assinar));

console.log('\n-- ligação com o servidor --');
ex('aponta para a função sinal', /functions\/v1\/sinal/.test(farol));
ex('o endereço do projeto confere',
   (farol.match(/dilrjxsbcejcgprajayo/g) || []).length >= 1);

/* ═══ o sinal SAI mesmo? (o erro de 19/09) ══════════════════════════════════ */
console.log('\n-- o sinal sai pela rede --');
{
  const { saiu } = navegador({ url: 'https://lionheartintelligence.com.br/' });
  ex('a visita é enviada', eventos(saiu).includes('site:visita'));
  /* ORDEM: fetch com keepalive é o principal, sendBeacon é a reserva.
     Se alguém inverter de novo, esta linha reprova — e é o ponto todo:
     sendBeacon devolve true quando ENFILEIRA, não quando entrega, então
     com ele na frente o plano B nunca roda e a falha vira silêncio. */
  ex('o caminho principal é fetch com keepalive',
     saiu.fetch.length === 1 && saiu.beacon.length === 0,
     'fetch ' + saiu.fetch.length + ' · beacon ' + saiu.beacon.length);
  ex('o fetch vai com keepalive ligado', !!(saiu.fetch[0] && saiu.fetch[0].op.keepalive));
  ex('vai para o endereço da função', !!(saiu.fetch[0] && /functions\/v1\/sinal$/.test(saiu.fetch[0].url)));
}
{
  const { saiu } = navegador({ semKeepalive: true });
  ex('navegador sem keepalive cai na reserva (sendBeacon)',
     saiu.beacon.length === 1 && saiu.fetch.length === 0,
     'fetch ' + saiu.fetch.length + ' · beacon ' + saiu.beacon.length);
}

/* ═══ a campanha sobrevive à navegação ══════════════════════════════════════ */
console.log('\n-- de onde veio (primeiro toque) --');
{
  const a = navegador({ url: 'https://lionheartintelligence.com.br/?de=linkedin' });
  ex('grava a campanha da URL', a.w.localStorage.getItem('lh_camp') === 'linkedin');
  ex('expõe window.LH_CAMPANHA', a.w.LH_CAMPANHA === 'linkedin');
  ex('a campanha vai junto do evento', a.saiu.fetch[0].corpo.k === 'linkedin');

  /* segunda visita, MESMO navegador, outra marca na URL: o primeiro toque
     vence. É a mesma regra do banco; se as pontas discordarem, o funil credita
     uma origem e o dinheiro aparece em outra. */
  const b = navegador({
    url: 'https://lionheartintelligence.com.br/?de=instagram',
    guardado: { lh_camp: a.w.localStorage.getItem('lh_camp') }
  });
  ex('segunda visita NÃO sobrescreve o primeiro toque',
     b.w.localStorage.getItem('lh_camp') === 'linkedin', 'ficou ' + b.w.LH_CAMPANHA);
  ex('e o evento continua creditando o primeiro', b.saiu.fetch[0].corpo.k === 'linkedin');

  const c = navegador({ url: 'https://lionheartintelligence.com.br/assinar.html',
                        guardado: { lh_camp: 'linkedin' } });
  ex('a origem sobrevive à página sem parâmetro', c.w.LH_CAMPANHA === 'linkedin');

  const d = navegador({ url: 'https://lionheartintelligence.com.br/' });
  ex('sem marca na URL, a origem é nula', d.w.LH_CAMPANHA === null);
  ex('utm_source também é aceito',
     navegador({ url: 'https://lionheartintelligence.com.br/?utm_source=google' }).w.LH_CAMPANHA === 'google');
}

/* ═══ demonstração x dúvida ═════════════════════════════════════════════════ */
console.log('\n-- demonstração não é dúvida --');
{
  const zap = 'https://wa.me/5553999823848?text=oi';
  const { w, saiu } = navegador({
    html: '<!doctype html><html><body>'
        + '<a id="demo" data-lh="demo" href="' + zap + '">Agende uma demonstração</a>'
        + '<a id="duvida" href="' + zap + '">Tenho uma dúvida</a>'
        + '<a id="planos" href="assinar.html">Ver planos</a>'
        + '</body></html>'
  });
  clicar(w, w.document.getElementById('demo'));
  ex('o botão de demonstração vira site:demonstracao', eventos(saiu).includes('site:demonstracao'));
  ex('e NÃO vira site:whatsapp', !eventos(saiu).includes('site:whatsapp'));
  clicar(w, w.document.getElementById('duvida'));
  ex('o zap comum continua site:whatsapp', eventos(saiu).includes('site:whatsapp'));
  clicar(w, w.document.getElementById('planos'));
  ex('ver planos continua registrado', eventos(saiu).includes('site:ver_planos'));

  /* o atributo é o que decide, não o endereço: os dois links têm o MESMO href */
  ex('a demonstração é achada por atributo, não por href',
     /\[data-lh="demo"\]/.test(farol) && !/demonstracao[\s\S]{0,80}href/.test(codigo));
  ex('os três botões de demonstração estão marcados no site',
     (index.match(/data-lh="demo"/g) || []).length === 3,
     (index.match(/data-lh="demo"/g) || []).length + ' marcados');
}

/* ═══ e-mail digitado na compra ═════════════════════════════════════════════ */
console.log('\n-- e-mail digitado na página de compra --');
{
  const pag = '<!doctype html><html><body><input id="email" type="email"></body></html>';
  const { w, saiu } = navegador({ url: 'https://lionheartintelligence.com.br/assinar.html', html: pag });
  const campo = w.document.getElementById('email');

  campo.value = 'nao-e-email';
  campo.dispatchEvent(new w.FocusEvent('blur'));
  ex('campo inválido não dispara nada', !eventos(saiu).includes('assinar:digitou_email'));

  campo.value = 'Contador@Escritorio.com.br';
  campo.dispatchEvent(new w.FocusEvent('blur'));
  ex('campo válido dispara assinar:digitou_email', eventos(saiu).includes('assinar:digitou_email'));
  const ev = saiu.fetch.concat(saiu.beacon).filter(x => x.corpo.e === 'assinar:digitou_email');
  ex('manda o e-mail no campo m', ev.length === 1 && ev[0].corpo.m === 'contador@escritorio.com.br');

  campo.dispatchEvent(new w.FocusEvent('blur'));
  campo.dispatchEvent(new w.FocusEvent('blur'));
  ex('dispara UMA vez por página',
     eventos(saiu).filter(e => e === 'assinar:digitou_email').length === 1);

  const fora2 = navegador({ url: 'https://lionheartintelligence.com.br/', html: pag });
  fora2.w.document.getElementById('email').value = 'x@y.com';
  fora2.w.document.getElementById('email').dispatchEvent(new fora2.w.FocusEvent('blur'));
  ex('fora da página de compra, não dispara',
     !eventos(fora2.saiu).includes('assinar:digitou_email'));
}

/* ═══ a campanha desce até o cadastro e a compra ════════════════════════════ */
console.log('\n-- a campanha chega ao servidor --');
ex('assinar.html manda a campanha no aceite', /campanha:\s*window\.LH_CAMPANHA\s*\|\|\s*null/.test(assinar));
ex('a página de materiais manda a campanha', /campanha:\s*window\.LH_CAMPANHA\s*\|\|\s*null/.test(index));

console.log('\n-- o site continua de pé --');
ex('index tem o arquivo do farol ao lado', fs.existsSync(daqui('sinal.js')));
ex('nenhuma página ficou com script sem fechar',
   (index.match(/<script/g) || []).length === (index.match(/<\/script>/g) || []).length &&
   (assinar.match(/<script/g) || []).length === (assinar.match(/<\/script>/g) || []).length);

console.log('\nRESULTADO: ' + (falhou ? falhou + ' FALHOU' : 'tudo aprovado') + '\n');
process.exit(falhou ? 1 : 0);
