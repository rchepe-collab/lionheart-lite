const fs=require('fs'), {JSDOM}=require('jsdom');
/* Os arquivos são procurados AO LADO desta prova, nunca num caminho absoluto:
   a versão anterior trazia o caminho da máquina onde nasceu escrito dentro e
   só rodava lá — em qualquer outra, quebrava antes da primeira verificação.
   Prova que não roda não prova nada. */
const daqui = (n) => require('path').join(__dirname, n);
const dom=new JSDOM(fs.readFileSync(daqui('regime-otimo.html'),'utf8'),
 {runScripts:'dangerously',url:'https://x/demo/regime-otimo.html',pretendToBeVisual:true});
const w=dom.window, d=w.document; let mau=false;
const ex=(k,v)=>{console.log('  '+k.padEnd(34,'.')+' '+v); if(v!==true) mau=true;};
setTimeout(()=>{
  console.log('--- PROVA: demonstração ---');
  ex('três regimes', d.querySelectorAll('.reg').length===3);
  ex('seis campos', d.querySelectorAll('.campo').length===6);
  ex('três controles', d.querySelectorAll('.barra .btn').length===3);
  const p=d.getElementById('contas');
  ex('contas nascem fechadas', !p.classList.contains('on'));
  d.getElementById('b-contas').dispatchEvent(new w.Event('click'));
  ex('abre no clique', p.classList.contains('on'));
  ex('fator R nas contas', /540\.000/.test(p.textContent));
  ex('dedução 35.640', /35\.640/.test(p.textContent));
  ex('diferença 219.900', /219\.900/.test(p.textContent));
  ex('não promete resultado', !/garant/i.test(d.body.textContent));
  ex('avisa que é ilustrativo', /ilustrativo/i.test(d.body.textContent));
  ex('CTA consultoria', !!d.querySelector('a[href*="assinar.html?p=consultoria"]'));
  setTimeout(()=>{
    const s=d.querySelector('.reg[data-r="simples"]');
    ex('Simples apareceu', s.classList.contains('on'));
    ex('Simples é o vencedor', s.classList.contains('venceu'));
    const v=s.querySelector('[data-v]').textContent;
    console.log('   valor exibido:', v);
    ex('valor near 252.360', /25[0-2]\./.test(v));
    console.log(mau?'RESULTADO: FALHOU':'RESULTADO: tudo aprovado');
    dom.window.close(); process.exit(mau?1:0);
  }, 13500);
}, 400);
