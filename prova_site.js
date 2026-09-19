const fs=require('fs'), {JSDOM}=require('jsdom');
/* Os arquivos são procurados AO LADO desta prova, nunca num caminho absoluto:
   a versão anterior trazia o caminho da máquina onde nasceu escrito dentro e
   só rodava lá — em qualquer outra, quebrava antes da primeira verificação.
   Prova que não roda não prova nada. */
const daqui = (n) => require('path').join(__dirname, n);
const dom=new JSDOM(fs.readFileSync(daqui('index.html'),'utf8'),
  {runScripts:'dangerously',url:'https://lionheartintelligence.com.br/',pretendToBeVisual:true});
setTimeout(()=>{
  const d=dom.window.document; let mau=false;
  const L=(k,v)=>console.log('  '+k.padEnd(34,'.')+' '+v);
  const ex=(k,v)=>{L(k,v); if(v!==true) mau=true;};
  console.log('--- PROVA: o site ---');
  ex('menu existe', !!d.querySelector('.menu'));
  const links=[...d.querySelectorAll('.menu a')];
  L('itens do menu', links.map(a=>a.textContent.trim()).join(' · '));
  ex('toda âncora tem destino', links.filter(a=>a.getAttribute('href').startsWith('#'))
      .every(a=>!!d.querySelector(a.getAttribute('href'))));
  ex('menu leva a assinar', links.some(a=>a.getAttribute('href')==='assinar.html'));
  ex('nenhum link morto #contato', !d.querySelector('a[href="#contato"]'));
  ex('logo na barra', !!d.querySelector('.pb-marca img'));
  console.log('  -- linha do tempo --');
  const anos=[...d.querySelectorAll('.tl-ano')];
  ex('seis anos', anos.length===6);
  ex('abre em 2026', anos.find(b=>b.dataset.ano==='2026').getAttribute('aria-selected')==='true');
  const p=d.getElementById('tl-palco');
  ex('2026 fala de teste', /teste/i.test(p.textContent));
  anos.find(b=>b.dataset.ano==='2033').dispatchEvent(new dom.window.Event('click'));
  ex('2033 troca o conteúdo', /extintos/i.test(p.textContent));
  ex('2033 fica marcado', anos.find(b=>b.dataset.ano==='2033').getAttribute('aria-selected')==='true');
  ex('2026 desmarcado', anos.find(b=>b.dataset.ano==='2026').getAttribute('aria-selected')==='false');
  anos.find(b=>b.dataset.ano==='2029').dispatchEvent(new dom.window.Event('click'));
  ex('2029 fala de 90%', /90%/.test(p.textContent));
  ex('não promete alíquota fechada', !/IBS de \d+[,.]?\d*%/.test(d.body.textContent));
  console.log('  -- produtos --');
  ex('seção existe', !!d.getElementById('produtos'));
  ex('no menu (via suspenso)', !!d.getElementById('drop-produtos'));
  const vds=[...d.querySelectorAll('#produtos .vid video')];
  ex('dois videos em Produtos', vds.length===2);
  ex('nenhum carrega antes do play', vds.every(v=>v.getAttribute('preload')==='none'));
  ex('os dois tem capa', vds.every(v=>/video\/[a-z-]+-capa\.jpg/.test(v.getAttribute('poster')||'')));
  ex('os dois tem controles', vds.every(v=>v.hasAttribute('controls')));
  ex('split antes do regime (ordem dos planos)',
      /split-payment/.test(vds[0].innerHTML) && /regime-otimo/.test(vds[1].innerHTML));
  ex('sem youtube nem iframe externo', !/youtube|iframe/i.test(d.body.innerHTML));
  ex('legenda do regime traz os numeros',
      /824\.600/.test([...d.querySelectorAll('.vid figcaption')][1].textContent));
  ex('legenda do split fala de caixa',
      /caixa/i.test([...d.querySelectorAll('.vid figcaption')][0].textContent));
  const abas=[...d.querySelectorAll('.pr-aba')];
  ex('três abas', abas.length===3);
  ex('abre em Adequação', abas[0].getAttribute('aria-selected')==='true');
  const pp=d.getElementById('pr-palco');
  ex('Adequação mostra 17 da Reforma', /17/.test(pp.textContent));
  ex('nomeia Split Payment Cash Gap', /Split Payment Cash Gap/.test(pp.textContent));
  ex('nomeia Auditor de Cadastro', /Auditor de Cadastro/.test(pp.textContent));
  ex('cada pilar tem lista', [...pp.querySelectorAll('.pr-bloco')].every(b=>b.querySelector('.pr-lista')));
  ex('produtos é a 1ª seção', d.querySelectorAll('section')[0].id==='produtos');
  ex('CTA leva ao plano certo', !!pp.querySelector('a[href="assinar.html?p=preparacao"]'));
  console.log('  -- menu suspenso --');
  const dp=d.getElementById('drop-produtos');
  ex('existe', !!dp);
  ex('é o 1º do menu', d.querySelector('.menu').firstElementChild.id==='drop-produtos');
  ex('nasce fechado', dp.getAttribute('data-aberto')!=='1');
  ex('tem os três produtos', dp.querySelectorAll('.drop button').length===3);
  dp.querySelector('button').dispatchEvent(new dom.window.Event('click'));
  ex('abre no clique', dp.getAttribute('data-aberto')==='1');
  ex('aria-expanded segue', dp.querySelector('button').getAttribute('aria-expanded')==='true');
  const esp=[...dp.querySelectorAll('.drop button')].find(b=>b.dataset.pl==='especialista');
  esp.dispatchEvent(new dom.window.Event('click'));
  ex('escolhe a aba certa', /Agroneg/.test(pp.textContent));
  ex('fecha ao escolher', dp.getAttribute('data-aberto')==='0');
  ex('abas lado a lado continuam', d.querySelectorAll('.pr-aba').length===3);
  abas[2].dispatchEvent(new dom.window.Event('click'));
  ex('Especialista troca', /Agroneg/.test(pp.textContent));
  ex('agro com 26, não 31', /26/.test(pp.textContent));
  ex('nomeia Funrural', /Funrural/.test(pp.textContent));
  ex('nomeia Motor 360', /Motor 360/.test(pp.textContent));
  ex('nomeia Sentinela do Teto', /Sentinela do Teto/.test(pp.textContent));
  ex('total 153, não 164', /153/.test(pp.textContent) && !/164/.test(pp.textContent));
  ex('CTA do especialista', !!pp.querySelector('a[href="assinar.html?p=especialista"]'));
  console.log('  -- agendar demonstração --');
  const wz=d.querySelector('.conversa a');
  ex('bloco existe', !!wz);
  ex('número certo', /wa\.me\/5553999823848/.test(wz.getAttribute('href')));
  ex('abre em aba nova com noopener', wz.target==='_blank' && /noopener/.test(wz.rel));
  ex('mensagem já preenchida', /text=/.test(wz.getAttribute('href')));
  ex('é o último elemento da página', d.querySelector('#comecar a[href="assinar.html"]')
      .compareDocumentPosition(wz)===4);
  ex('id comecar não está duplicado',
      [...d.querySelectorAll('section[id="comecar"]')].length===1);
  ex('toda âncora do menu existe',
      [...d.querySelectorAll('.menu a[href^="#"]')].every(a=>!!d.querySelector(a.getAttribute('href'))));
  console.log('  -- botão flutuante --');
  const fl=d.getElementById('flutua');
  ex('caixa flutuante existe', !!fl);
  ex('tem os dois botoes', fl.querySelectorAll('a').length===2);
  ex('primeiro leva a assinar', fl.querySelector('.flutua').getAttribute('href')==='assinar.html');
  ex('segundo e a demonstracao', /wa\.me\/5553999823848/.test(fl.querySelector('.flutua-2').getAttribute('href')));
  ex('nasce escondida', !fl.classList.contains('vis'));
  ex('tres convites no site', d.querySelectorAll('a[href*="wa.me/5553999823848"]').length===3);
  ex('um convite apos as dores', !!d.querySelector('#solucoes a[href*="wa.me"]'));
  dom.window.scrollY=300; dom.window.dispatchEvent(new dom.window.Event('scroll'));
  ex('aparece com 300px de rolagem', fl.classList.contains('vis'));
  dom.window.scrollY=100; dom.window.dispatchEvent(new dom.window.Event('scroll'));
  ex('some de volta no topo', !fl.classList.contains('vis'));
  console.log('  -- quem faz --');
  ex('seção existe', !!d.getElementById('quemfaz'));
  ex('no menu', [...d.querySelectorAll('.menu a')].some(a=>a.getAttribute('href')==='#quemfaz'));
  ex('dois fundadores', d.querySelectorAll('#quemfaz .fundadores > div').length===2);
  ex('não diz banca tributária', !/banca tribut/i.test(d.getElementById('quemfaz').textContent));
  ex('não afirma número de consultores', !/mil consultores/i.test(d.body.textContent));
  ex('sem nome próprio', !/Ricardo|Chepe|Carlos/i.test(d.getElementById('quemfaz').textContent));
  ex('vem antes de Como começar', d.getElementById('quemfaz').compareDocumentPosition(d.getElementById('comecar'))===4);
  console.log('  -- como começar --');
  ex('seção existe', !!d.getElementById('comecar'));
  ex('três passos', d.querySelectorAll('#comecar .passos li').length===3);
  ex('CTA para assinar', !!d.querySelector('#comecar a[href="assinar.html"]'));
  ex('js removeu a classe nojs', !d.body.classList.contains('nojs'));
  console.log(mau?'RESULTADO: FALHOU':'RESULTADO: tudo aprovado');
  process.exitCode=mau?1:0;
},500);
