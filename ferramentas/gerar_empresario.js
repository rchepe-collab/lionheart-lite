/* RECEITA v916 · gera empresario.html (ITFE · ferramenta do empresário) a partir do app.html (CORE).

   "Separar o salão, cozinha única" (decisão do Ricardo, 04/10/2026): o empresário tem arquivo,
   endereço, nome, menu e textos próprios — mas as CONTAS são as do CORE. Por isso este arquivo
   não é editado à mão: toda versão nova do app.html passa por esta receita, e o ITFE sai com
   as mesmas alíquotas, tabelas e correções.

   O que a receita faz (e só isso):
   1. grava window.LH_PRODUTO_FIXO='empresario' no topo — o bloco de produto do app.html
      (PRODUTOS.empresario) monta menu, Boas-Vindas, segmento e tranca a partir daí;
   2. troca o <title>;
   3. carimba o arquivo como GERADO.
   Tudo o que é do empresário (menu, textos, segmentos) mora no app.html, no bloco PRODUTOS,
   para continuar sendo uma fonte só.

   Uso:  node ferramentas/gerar_empresario.js        (grava empresario.html)
         node ferramentas/gerar_empresario.js --check (só confere se o empresario.html está em dia) */
const fs = require('fs'), path = require('path');
const RAIZ = path.join(__dirname, '..');
const TITULO_CORE = '<title>Lionheart CORE — Suite Tributária para o Contador</title>';
const TITULO_ITFE = '<title>Lionheart ITFE · Inteligência Tributária e Financeira Empresarial</title>';

function gerar(app) {
  const i = app.indexOf('<head>');
  if (i < 0 || i > 5000) throw new Error('receita: <head> do app.html não encontrado no topo');
  if (app.indexOf(TITULO_CORE) < 0) throw new Error('receita: <title> do CORE mudou — atualizar TITULO_CORE');
  if (app.indexOf('PRODUTOS.empresario=') < 0) throw new Error('receita: o app.html não tem o produto "empresario"');
  const carimbo = '\n<!-- ARQUIVO GERADO por ferramentas/gerar_empresario.js a partir do app.html — NÃO EDITAR À MÃO.\n' +
                  '     Mude o app.html (bloco PRODUTOS) e rode a receita de novo. -->\n' +
                  "<script>window.LH_PRODUTO_FIXO='empresario';</script>\n";
  let out = app.slice(0, i + 6) + carimbo + app.slice(i + 6);
  out = out.replace(TITULO_CORE, TITULO_ITFE);
  return out;
}
module.exports = { gerar };

if (require.main === module) {
  const app = fs.readFileSync(path.join(RAIZ, 'app.html'), 'utf8');
  const novo = gerar(app);
  const destino = path.join(RAIZ, 'empresario.html');
  if (process.argv.includes('--check')) {
    const atual = fs.existsSync(destino) ? fs.readFileSync(destino, 'utf8') : '';
    if (atual !== novo) { console.log('empresario.html DESATUALIZADO — rode: node ferramentas/gerar_empresario.js'); process.exit(1); }
    console.log('empresario.html em dia com o app.html'); process.exit(0);
  }
  fs.writeFileSync(destino, novo);
  console.log('empresario.html gerado (' + (novo.length / 1e6).toFixed(1) + ' MB)');
}
