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
const L=(k,v)=>console.log('  '+k.padEnd(34,'.')+' '+v);
const ex=(k,v)=>{L(k,v); if(v!==true) mau=true;};

const A=montar('https://x/assinar.html');            // sem ?p= → escolhe
const B=montar('https://x/assinar.html?p=especialista'); // com ?p= → direto
setTimeout(()=>{
  const a=A.dom.window.document;
  console.log('--- SEM ?p= · a pessoa escolhe ---');
  ex('passo de escolha visível', a.getElementById('passo-plano').hidden===false);
  ex('passo de compra escondido', a.getElementById('passo-compra').hidden===true);
  const ops=[...a.getElementById('planos').querySelectorAll('.opcao')];
  ex('três planos na tela', ops.length===3);
  L('ordem', ops.map(o=>o.dataset.plano).join(' → '));
  ex('ordem é a da escada', ops.map(o=>o.dataset.plano).join()==='preparacao,consultoria,especialista');
  ex('mostra o menor preço/mês', ops[0].textContent.includes('199,00'));
  ex('diz que a escada é cumulativa', a.querySelector('.escada').textContent.includes('inclui tudo'));
  ops[1].dispatchEvent(new A.dom.window.Event('click'));
  setTimeout(()=>{
    ex('abriu a compra do escolhido', a.getElementById('rotulo').textContent==='Consultoria');
    ex('botão trocar aparece', a.getElementById('trocar').hidden===false);
    ex('economia do anual', a.getElementById('ciclos').textContent.includes('2.400,00'));

    const b=B.dom.window.document;
    console.log('--- COM ?p=especialista · veio de reunião ---');
    ex('pulou a escolha', b.getElementById('passo-plano').hidden===true);
    ex('plano certo', b.getElementById('rotulo').textContent==='Especialista');
    ex('sem botão trocar', b.getElementById('trocar').hidden===true);
    ex('economia 799×12−5988=3600', b.getElementById('ciclos').textContent.includes('3.600,00'));
    b.getElementById('email').value='cliente@escritorio.com.br';
    b.getElementById('email').dispatchEvent(new B.dom.window.Event('input'));
    b.getElementById('aceite').checked=true;
    b.getElementById('aceite').dispatchEvent(new B.dom.window.Event('change'));
    ex('botão destrava', b.getElementById('seguir').disabled===false);
    b.getElementById('seguir').click();
    setTimeout(()=>{
      ex('envia plano especialista', B.enviado && B.enviado.plano==='especialista');
      ex('envia ciclo anual', B.enviado && B.enviado.ciclo==='anual');
      ex('envia aceite true', B.enviado && B.enviado.aceite===true);
      console.log(mau?'RESULTADO: FALHOU':'RESULTADO: tudo aprovado');
      process.exitCode=mau?1:0;
    },60);
  },50);
},400);
