const fs=require('fs'), {JSDOM}=require('jsdom');
const PLANOS={ok:true,termo_versao:'1.0',planos:[
 {plano:'preparacao',rotulo:'Adequação',promessa:'Reforma 2026, cadastro, preço e compliance.',ordem:1,
  ciclos:[{ciclo:'anual',preco_mes:'199.00',preco_cobrado:'2388.00'},{ciclo:'mensal',preco_mes:'299.00',preco_cobrado:'299.00'}]},
 {plano:'consultoria',rotulo:'Consultoria',promessa:'Regime, sócio, crédito, patrimonial.',ordem:2,
  ciclos:[{ciclo:'anual',preco_mes:'299.00',preco_cobrado:'3588.00'},{ciclo:'mensal',preco_mes:'499.00',preco_cobrado:'499.00'}]},
 {plano:'especialista',rotulo:'Especialista',promessa:'Setores: serviços, agro, indústria.',ordem:3,
  ciclos:[{ciclo:'anual',preco_mes:'499.00',preco_cobrado:'5988.00'},{ciclo:'mensal',preco_mes:'799.00',preco_cobrado:'799.00'}]}]};
function montar(url){ let env=null;
  const dom=new JSDOM(fs.readFileSync('/home/claude/lite/assinar.html','utf8'),
   {runScripts:'dangerously',url,beforeParse(w){
     w.fetch=(u,o)=>{ if(String(u).includes('o=planos')) return Promise.resolve({json:()=>Promise.resolve(PLANOS)});
       env=JSON.parse(o.body); return Promise.resolve({json:()=>Promise.resolve({ok:true,link:'https://www.asaas.com/c/X'})}); };
   }});
  return {dom, get enviado(){return env;}}; }
let mau=false;
const L=(k,v)=>console.log('  '+k.padEnd(36,'.')+' '+v);
const ex=(k,v)=>{L(k,v); if(v!==true) mau=true;};
const A=montar('https://x/assinar.html');
const B=montar('https://x/assinar.html?p=especialista');
setTimeout(()=>{
 try{
  const a=A.dom.window.document;
  console.log('--- SEM ?p= · escolha com proposta de valor ---');
  ex('passo de escolha visível', a.getElementById('passo-plano').hidden===false);
  const ops=[...a.getElementById('planos').querySelectorAll('.opcao')];
  ex('três planos', ops.length===3);
  ex('ordem da escada', ops.map(o=>o.dataset.plano).join()==='preparacao,consultoria,especialista');
  ex('menor preço/mês do Adequação', ops[0].textContent.includes('199,00'));
  ex('preço em elemento próprio', !!ops[0].querySelector('.valor .cifra'));
  ex('diz "a partir de"', ops[0].textContent.includes('a partir de'));
  ex('convite para escolher', ops[0].textContent.includes('Escolher este plano'));
  ex('selo de preço de fundador', a.querySelector('.fundador').textContent.includes('31 de dezembro de 2026'));
  ex('tem botão de voltar ao site', !!a.querySelector('.voltar[href="./"]'));
  ex('o botão de voltar TEM estilo', /\.voltar\{/.test(fs.readFileSync('/home/claude/lite/assinar.html','utf8')));
  ex('logo também volta', !!a.querySelector('.faixa a[href="./"]'));
  ex('escada cumulativa dita', a.querySelector('.linha-fina').textContent.includes('inclui tudo'));
  console.log('  -- propostas de valor --');
  ops.forEach((o,i)=>{
    const li=o.querySelectorAll('li').length;
    const conta=(o.querySelector('.conta')||{}).textContent||'';
    L(ops[i].dataset.plano+': itens/contagem', li+' itens · "'+conta+'"');
    if(li<4) mau=true;
    if(!conta) mau=true;
  });
  ex('Adequação fala de split payment', ops[0].textContent.includes('Split payment'));
  ex('Consultoria fala de honorário', ops[1].textContent.includes('honorário'));
  ex('Especialista fala de agro 26 soluções', ops[2].textContent.includes('26 soluções próprias'));
  ex('sem HTML cru escapando', !a.getElementById('planos').innerHTML.includes('&lt;li&gt;'));
  ex('bloco grátis existe no passo 1', !!a.querySelector('.gratis'));
  ex('grátis vem DEPOIS dos planos', a.querySelector('.gratis').compareDocumentPosition(a.getElementById('planos'))===2);
  ex('grátis está dentro do passo 1', a.getElementById('passo-plano').contains(a.querySelector('.gratis')));
  ops[1].dispatchEvent(new A.dom.window.Event('click'));
  setTimeout(()=>{
   try{
    ex('abre o plano escolhido', a.getElementById('rotulo-plano').textContent==='Consultoria');
    ex('economia 499×12−3588', a.getElementById('ciclos').textContent.includes('2.400,00'));
    const b=B.dom.window.document;
    console.log('--- COM ?p=especialista · veio de reunião ---');
    ex('pulou a escolha', b.getElementById('passo-plano').hidden===true);
    ex('plano certo', b.getElementById('rotulo-plano').textContent==='Especialista');
    ex('sem botão trocar', b.getElementById('trocar').hidden===true);
    ex('quem veio por link NÃO vê o grátis', b.getElementById('passo-plano').hidden===true);
    ex('economia 799×12−5988', b.getElementById('ciclos').textContent.includes('3.600,00'));
    b.getElementById('email').value='cliente@escritorio.com.br';
    b.getElementById('email').dispatchEvent(new B.dom.window.Event('input'));
    ex('travado só com e-mail', b.getElementById('seguir').disabled===true);
    b.getElementById('aceite').checked=true;
    b.getElementById('aceite').dispatchEvent(new B.dom.window.Event('change'));
    ex('destrava com e-mail + aceite', b.getElementById('seguir').disabled===false);
    b.getElementById('seguir').click();
    setTimeout(()=>{
      ex('envia plano', B.enviado && B.enviado.plano==='especialista');
      ex('envia ciclo', B.enviado && B.enviado.ciclo==='anual');
      ex('envia aceite', B.enviado && B.enviado.aceite===true);
      console.log(mau?'RESULTADO: FALHOU':'RESULTADO: tudo aprovado');
      process.exitCode=mau?1:0;
    },60);
   }catch(e){ console.log('ERRO:',e.message); process.exitCode=1; }
  },60);
 }catch(e){ console.log('ERRO:',e.message); process.exitCode=1; }
},450);
