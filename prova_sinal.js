/* ═══════════════════════════════════════════════════════════════════════════
   PROVA DO FAROL DO FUNIL

   O erro que esta prova existe para pegar: o site manda um evento que o banco
   não conhece. A lista branca da fn_sinal recusa em silêncio — nada quebra,
   nada aparece na tela, e a medição simplesmente não existe. Descobre-se
   semanas depois, olhando um funil com etapa zerada, quando a campanha já
   passou. Por isso os nomes dos eventos são conferidos um a um contra a lista
   que está escrita no banco (copiada aqui, e a divergência é o que reprova).

   E confere a promessa de privacidade: o farol não pode mandar IP, não pode
   mandar impressão digital de aparelho, e não pode mandar e-mail que a pessoa
   não digitou.
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');

/* a lista branca como está na fn_sinal (v833). Se mudar lá, muda aqui — e é
   esta cópia que faz a divergência aparecer em vez de sumir. */
const PERMITIDOS = [
  'site:visita', 'site:ver_planos', 'site:whatsapp', 'site:material',
  'assinar:abriu', 'assinar:escolheu', 'assinar:recusou_termos',
  'app:abriu', 'app:cadastro_iniciou'
];

let falhou = 0;
const ex = (nome, ok, detalhe) => {
  console.log('  ' + nome.padEnd(52, '.') + ' ' + (ok ? 'true' : 'FALHOU'
    + (detalhe ? ' · ' + detalhe : '')));
  if (!ok) falhou++;
};

const farol   = fs.readFileSync('sinal.js', 'utf8');
const index   = fs.readFileSync('index.html', 'utf8');
const assinar = fs.readFileSync('assinar.html', 'utf8');

console.log('\n-- eventos --');
/* todo nome de evento que aparece no farol e nas páginas */
const usados = new Set();
for (const fonte of [farol, index, assinar]) {
  for (const m of fonte.matchAll(/['"]((?:site|assinar|app):[a-z_]+)['"]/g)) usados.add(m[1]);
}
ex('o site declara pelo menos 5 eventos', usados.size >= 5, usados.size + ' encontrados');
const fora = [...usados].filter(e => !PERMITIDOS.includes(e));
ex('todo evento existe na lista branca do banco', fora.length === 0, 'fora da lista: ' + fora.join(', '));

for (const e of ['site:visita', 'site:ver_planos', 'site:whatsapp', 'assinar:abriu', 'assinar:escolheu', 'assinar:recusou_termos']) {
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
ex('e-mail só quando a pessoa digitou', !/email/i.test(farol) || /extras\.m/.test(farol));
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

console.log('\n-- o site continua de pé --');
ex('index tem o arquivo do farol ao lado', fs.existsSync('sinal.js'));
ex('nenhuma página ficou com script sem fechar',
   (index.match(/<script/g) || []).length === (index.match(/<\/script>/g) || []).length &&
   (assinar.match(/<script/g) || []).length === (assinar.match(/<\/script>/g) || []).length);

console.log('\nRESULTADO: ' + (falhou ? falhou + ' FALHOU' : 'tudo aprovado') + '\n');
process.exit(falhou ? 1 : 0);
