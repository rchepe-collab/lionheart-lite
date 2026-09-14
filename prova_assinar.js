const fs=require('fs'), {JSDOM}=require('jsdom');
const CAT={ok:true,plano:'consultoria',rotulo:'Consultoria',promessa:'Regime, sócio, crédito e patrimonial.',
  termo_versao:'1.0',ciclos:[{ciclo:'anual',preco_mes:'299.00',preco_cobrado:'3588.00'},
                             {ciclo:'mensal',preco_mes:'499.00',preco_cobrado:'499.00'}]};
let enviado=null;
const dom=new JSDOM(fs.readFileSync('/home/claude/lite/assinar.html','utf8'),{
  runScripts:'dangerously', url:'https://lionheartintelligence.com.br/assinar.html?p=consultoria',
  beforeParse(w){
    w.fetch=(u,o)=>{ if(String(u).includes('o=catalogo')) return Promise.resolve({json:()=>Promise.resolve(CAT)});
      enviado=JSON.parse(o.body); return Promise.resolve({json:()=>Promise.resolve({ok:true,link:'https://www.asaas.com/c/88w0y8jriov213fy'})}); };
  }});
setTimeout(()=>{
  const d=dom.window.document, L=(k,v)=>console.log('  '+k.padEnd(30,'.')+' '+v);
  let mau=false; const ex=(k,v)=>{L(k,v); if(v!==true) mau=true;};
  console.log('--- PROVA: página de compra ---');
  ex('plano lido da URL', d.getElementById('rotulo').textContent==='Consultoria');
  ex('promessa na tela', d.getElementById('promessa').textContent.length>10);
  const cs=[...d.querySelectorAll('.ciclo')];
  ex('dois ciclos', cs.length===2);
  ex('anual pré-selecionado', cs.find(b=>b.dataset.ciclo==='anual').getAttribute('aria-pressed')==='true');
  const anual=cs.find(b=>b.dataset.ciclo==='anual').textContent;
  L('linha do anual', anual.replace(/\s+/g,' ').trim().slice(0,90));
  ex('economia calculada (499×12−3588=2400)', anual.includes('2.400,00'));
  const btn=d.getElementById('seguir');
  ex('botão começa travado', btn.disabled===true);
  d.getElementById('email').value='teste@escritorio.com.br';
  d.getElementById('email').dispatchEvent(new dom.window.Event('input'));
  ex('ainda travado só com e-mail', btn.disabled===true);
  d.getElementById('aceite').checked=true;
  d.getElementById('aceite').dispatchEvent(new dom.window.Event('change'));
  ex('destrava com e-mail + aceite', btn.disabled===false);
  ex('link do Termo aponta para a página', !!d.querySelector('a[href="termos.html"]'));
  btn.click();
  setTimeout(()=>{
    ex('enviou aceite=true', enviado && enviado.aceite===true);
    ex('enviou o plano certo', enviado && enviado.plano==='consultoria');
    ex('enviou o ciclo escolhido', enviado && enviado.ciclo==='anual');
    ex('e-mail em minúsculas', enviado && enviado.email==='teste@escritorio.com.br');
    console.log(mau?'RESULTADO: FALHOU':'RESULTADO: tudo aprovado');
    process.exitCode=mau?1:0;
  },60);
},400);
