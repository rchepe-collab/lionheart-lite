/* PROVA DE ESTRESSE · v869 — catálogo misto (agro, indústria, serviços por NBS, comércio, varejo, turismo)
   106 itens sintéticos "difíceis de precificar", congelados com o resultado esperado de cada um (tratamento, status,
   cClassTrib e preço de prateleira em 2033 no Presumido com ICMS médio 18). O que o teste de 27/09 revelou e o v869
   corrigiu: agro do Anexo IX (plural da lei × singular do cadastro; marcador agropecuário fecha o CONFERIR; sementes
   dos capítulos 7/10/12; máquinas não são insumo), IS não é benefício condicionado (automóvel, cigarro), PcD pelo NCM
   (cadeira de rodas, aparelho auditivo), livros/jornais imunes pelo NCM, absorvente = zero (art. 146), medicamento
   −60% firme com zero só para a lista, regimes específicos de serviço (planos de saúde, seguros, leasing) fora da
   alíquota geral, engenharia/arquitetura −30% sem o veto de "construção".
   Uso: npm i --no-save jsdom && node prova_estresse.js */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
let falhou = 0;
const ex = (n, ok, d) => { console.log('  ' + (n + ' ').padEnd(78, '.') + ' ' + (ok ? 'true' : 'FALHOU' + (d ? ' — ' + d : ''))); if (!ok) falhou++; };
const H = ["CODIGO", "DESCRICAO", "NCM", "NBS", "PRECO_VENDA", "CUSTO", "ALIQUOTA_ICMS", "CST_ICMS", "CST_PIS_COFINS", "IPI", "SETOR"];
/* cod, desc, ncm, nbs, preco, custo, icms, cst_icms, cst_pis, ipi, setor | trat esperado, status esperado, cClassTrib esperado, prateleira 2033 (null = não precificado) */
const T = [
  ["AGR001", "SEMENTE DE SOJA SC 40KG", "12011000", "", 380, 247.0, 12, "000", "06", 0, "agro", "red60", "BENEFICIO_IDENTIFICADO", "200038", 369.85],
  ["AGR002", "SEMENTE DE MILHO HIBRIDO SC 60K SEM", "10051000", "", 900, 585.0, 12, "000", "06", 0, "agro", "red60", "BENEFICIO_IDENTIFICADO", "200038", 875.95],
  ["AGR003", "FERTILIZANTE NPK 04-14-08 50KG", "31052000", "", 190, 123.5, 0, "040", "06", 0, "agro", "red60", "BENEFICIO_IDENTIFICADO", "200038", 172.31],
  ["AGR004", "UREIA AGRICOLA 50KG", "31021010", "", 150, 97.5, 0, "040", "06", 0, "agro", "red60", "BENEFICIO_IDENTIFICADO", "200038", 136.04],
  ["AGR005", "HERBICIDA GLIFOSATO 20L", "38089324", "", 480, 312.0, 0, "040", "06", 0, "agro", "red60", "BENEFICIO_IDENTIFICADO", "200038", 435.32],
  ["AGR006", "INSETICIDA AGRICOLA 5L", "38089199", "", 620, 403.0, 0, "040", "06", 0, "agro", "red60", "BENEFICIO_IDENTIFICADO", "200038", 562.29],
  ["AGR007", "RACAO BOVINA 40KG", "23099090", "", 95, 61.75, 0, "040", "06", 0, "agro", "red60", "BENEFICIO_IDENTIFICADO", "200038", 86.16],
  ["AGR008", "SAL MINERAL BOVINO 25KG", "23099010", "", 110, 71.5, 0, "040", "06", 0, "agro", "red60", "BENEFICIO_IDENTIFICADO", "200038", 99.76],
  ["AGR009", "TRATOR AGRICOLA 75CV", "87019300", "", 280000, 182000.0, 12, "000", "01", 0, "agro", "cheia", "CONFIRMADO", "000001", 298767.7],
  ["AGR010", "PLANTADEIRA 7 LINHAS", "84323900", "", 95000, 61750.0, 12, "000", "01", 0, "agro", "cheia", "REGRA_GERAL", "000001", 101367.61],
  ["AGR011", "PULVERIZADOR COSTAL 20L", "84244100", "", 350, 227.5, 18, "000", "01", 0, "agro", "cheia", "REGRA_GERAL", "000001", 346.89],
  ["AGR012", "SOJA EM GRAO SC 60KG", "12019000", "", 150, 97.5, 0, "051", "06", 0, "agro", "cheia", "REVISAO_TRIBUTARIA", "000001", null],
  ["AGR013", "MILHO EM GRAO SC 60KG", "10059010", "", 70, 45.5, 0, "051", "06", 0, "agro", "difer", "BENEFICIO_IDENTIFICADO", "515001", 57.4],
  ["AGR014", "LEITE CRU RESFRIADO L", "04012010", "", 2.4, 1.56, 0, "051", "06", 0, "agro", "zero", "BENEFICIO_IDENTIFICADO", "200003", 1.97],
  ["AGR015", "BOI GORDO ARROBA", "01022919", "", 280, 182.0, 0, "051", "06", 0, "agro", "cheia", "REVISAO_TRIBUTARIA", "000001", null],
  ["AGR016", "CALCARIO AGRICOLA TON", "25210000", "", 120, 78.0, 0, "040", "06", 0, "agro", "red60", "BENEFICIO_IDENTIFICADO", "200038", 108.83],
  ["AGR017", "INOCULANTE SOJA 200ML", "30029040", "", 25, 16.25, 0, "040", "06", 0, "agro", "cheia", "REVISAO_TRIBUTARIA", "000001", null],
  ["AGR018", "VACINA AFTOSA DOSE", "30021200", "", 3.5, 2.27, 0, "040", "06", 0, "agro", "red60", "BENEFICIO_IDENTIFICADO", "200038", 3.17],
  ["AGR019", "SEMEN BOVINO DOSE", "05111000", "", 60, 39.0, 0, "040", "06", 0, "agro", "red60", "BENEFICIO_IDENTIFICADO", "200038", 54.42],
  ["AGR020", "MUDA DE EUCALIPTO UN", "06029089", "", 1.2, 0.78, 0, "040", "06", 0, "agro", "red60", "BENEFICIO_IDENTIFICADO", "200038", 1.09],
  ["AGR021", "PINTO DE 1 DIA UN", "01051110", "", 3.2, 2.08, 0, "040", "06", 0, "agro", "red60", "BENEFICIO_IDENTIFICADO", "200038", 2.9],
  ["AGR022", "ARAME FARPADO 500M", "73130000", "", 320, 208.0, 18, "000", "01", 0, "agro", "cheia", "REGRA_GERAL", "000001", 317.16],
  ["AGR023", "ADUBO ORGANICO 25KG", "31010000", "", 40, 26.0, 0, "040", "06", 0, "agro", "red60", "BENEFICIO_IDENTIFICADO", "200038", 36.28],
  ["AGR024", "OLEO DIESEL S10 L", "27101921", "", 6.2, 4.03, 12, "060", "04", 0, "agro", "adrem", "REVISAO_TRIBUTARIA", "620001", null],
  ["AGR025", "GLP 13KG", "27111910", "", 110, 71.5, 12, "060", "04", 0, "agro", "adrem", "REVISAO_TRIBUTARIA", "620001", null],
  ["IND026", "BOBINA ACO LAMINADO A QUENTE TON", "72083900", "", 4200, 2730.0, 18, "000", "01", 5, "industria", "cheia", "REGRA_GERAL", "000001", 4162.74],
  ["IND027", "CHAPA GALVANIZADA 1,2MM", "72104900", "", 95, 61.75, 18, "000", "01", 5, "industria", "cheia", "REGRA_GERAL", "000001", 94.16],
  ["IND028", "MOTOR ELETRICO TRIFASICO 5CV", "85015210", "", 1800, 1170.0, 18, "000", "01", 10, "industria", "cheia", "REGRA_GERAL", "000001", 1784.03],
  ["IND029", "COMPRESSOR DE AR 10PES", "84148011", "", 2400, 1560.0, 18, "000", "01", 10, "industria", "cheia", "REGRA_GERAL", "000001", 2378.71],
  ["IND030", "PAINEL SOLAR 550W", "85414300", "", 750, 487.5, 0, "040", "06", 0, "industria", "cheia", "REGRA_GERAL", "000001", 777.98],
  ["IND031", "INVERSOR SOLAR 5KW", "85044090", "", 4500, 2925.0, 18, "000", "01", 15, "industria", "cheia", "REGRA_GERAL", "000001", 4460.07],
  ["IND032", "BOMBA CENTRIFUGA 2CV", "84137010", "", 1200, 780.0, 18, "000", "01", 10, "industria", "cheia", "REGRA_GERAL", "000001", 1189.35],
  ["IND033", "VALVULA ESFERA INOX 2", "84818095", "", 180, 117.0, 18, "000", "01", 10, "industria", "cheia", "CONFIRMADO", "000001", 178.4],
  ["IND034", "EMBALAGEM PLASTICA PET 500ML MIL", "39233000", "", 320, 208.0, 18, "000", "01", 15, "industria", "cheia", "CONFIRMADO", "000001", 317.16],
  ["IND035", "PAPEL OFFSET 75G RESMA", "48025610", "", 28, 18.2, 18, "000", "01", 0, "industria", "cheia", "CONFIRMADO", "000001", 27.75],
  ["IND036", "TINTA EPOXI INDUSTRIAL 18L", "32089010", "", 680, 442.0, 18, "000", "01", 10, "industria", "cheia", "REGRA_GERAL", "000001", 673.97],
  ["IND037", "CIMENTO CP-V 50KG", "25232910", "", 38, 24.7, 12, "060", "01", 4, "industria", "cheia", "CONFIRMADO", "000001", 40.55],
  ["IND038", "VIDRO FLOAT 6MM M2", "70052900", "", 85, 55.25, 18, "000", "01", 0, "industria", "cheia", "CONFIRMADO", "000001", 84.25],
  ["IND039", "PNEU CAMINHAO 295/80R22.5", "40112090", "", 1900, 1235.0, 18, "060", "04", 0, "industria", "cheia", "REGRA_GERAL", "000001", 1970.87],
  ["IND040", "BATERIA AUTOMOTIVA 60AH", "85071000", "", 450, 292.5, 18, "060", "04", 0, "industria", "cheia", "REGRA_GERAL", "000001", 466.79],
  ["IND041", "CAMINHAO 3/4 DIESEL", "87042190", "", 320000, 208000.0, 12, "000", "04", 0, "industria", "cheia+IS", "CONFIRMADO", "000001", 356224],
  ["IND042", "AUTOMOVEL HATCH 1.0 FLEX", "87032100", "", 85000, 55250.0, 12, "060", "04", 0, "industria", "cheia+IS", "CONFIRMADO", "000001", 94622],
  ["IND043", "CIGARRO CX 20 UN", "24022000", "", 12, 7.8, 25, "060", "04", 300, "industria", "cheia+IS", "CONFIRMADO", "000001", 11.39],
  ["IND044", "REFRIGERANTE COLA LATA", "22021000", "", 4, 2.6, 18, "060", "04", 0, "industria", "cheia+IS", "CONFIRMADO", "000001", 4.15],
  ["IND045", "MEDICAMENTO DIPIRONA 500MG 10CP", "30049069", "", 7, 4.55, 18, "060", "04", 0, "industria", "red60", "BENEFICIO_IDENTIFICADO", "200032", 6.35],
  ["IND046", "MEDICAMENTO INSULINA CANETA", "30043100", "", 90, 58.5, 18, "060", "04", 0, "industria", "red60", "BENEFICIO_IDENTIFICADO", "200032", 81.62],
  ["IND047", "FRALDA GERIATRICA G 8 UN", "96190000", "", 32, 20.8, 18, "060", "01", 0, "industria", "red60", "BENEFICIO_IDENTIFICADO", "200035", 27.73],
  ["IND048", "CADEIRA DE RODAS MANUAL", "87131000", "", 1500, 975.0, 0, "040", "06", 0, "industria", "zero", "BENEFICIO_IDENTIFICADO", "200007", 1230],
  ["IND049", "APARELHO AUDITIVO DIGITAL", "90214000", "", 4500, 2925.0, 0, "040", "06", 0, "industria", "zero", "BENEFICIO_IDENTIFICADO", "200007", 3690],
  ["IND050", "PROTESE DE QUADRIL", "90213190", "", 12000, 7800.0, 0, "040", "06", 0, "industria", "zero", "BENEFICIO_IDENTIFICADO", "200004", 9840],
  ["IND051", "OCULOS DE GRAU RECEITA", "90049010", "", 350, 227.5, 18, "000", "01", 0, "industria", "red60", "BENEFICIO_IDENTIFICADO", "200030", 303.29],
  ["IND052", "ABSORVENTE INTERNO 16 UN", "96190000", "", 14, 9.1, 18, "000", "06", 0, "industria", "zero", "BENEFICIO_IDENTIFICADO", "200013", 11.48],
  ["IND053", "LIVRO DIDATICO", "49019900", "", 85, 55.25, 0, "040", "06", 0, "industria", "imune", "BENEFICIO_IDENTIFICADO", "410008", 69.7],
  ["IND054", "JORNAL DIARIO", "49021000", "", 4, 2.6, 0, "040", "06", 0, "industria", "imune", "BENEFICIO_IDENTIFICADO", "410008", 3.28],
  ["IND055", "ARMACAO DE OCULOS", "90031100", "", 250, 162.5, 18, "000", "01", 0, "industria", "cheia", "REGRA_GERAL", "000001", 247.78],
  ["IND056", "MAQUINA DE LAVAR 12KG", "84501100", "", 2200, 1430.0, 18, "000", "01", 10, "industria", "cheia", "CONFIRMADO", "000001", 2180.48],
  ["IND057", "SMARTPHONE 128GB", "85171310", "", 2500, 1625.0, 18, "000", "01", 0, "industria", "cheia", "CONFIRMADO", "000001", 2477.82],
  ["IND058", "TV LED 50", "85287220", "", 2300, 1495.0, 18, "000", "01", 15, "industria", "cheia", "CONFIRMADO", "000001", 2279.59],
  ["IND059", "CAMISETA ALGODAO", "61091000", "", 49, 31.85, 18, "000", "01", 0, "industria", "cheia", "CONFIRMADO", "000001", 48.57],
  ["IND060", "TENIS ESPORTIVO", "64041100", "", 299, 194.35, 18, "000", "01", 0, "industria", "cheia", "CONFIRMADO", "000001", 296.35],
  ["IND061", "BRINQUEDO BONECA", "95030021", "", 89, 57.85, 18, "000", "01", 0, "industria", "cheia", "CONFIRMADO", "000001", 88.21],
  ["IND062", "SOFA 3 LUGARES", "94016100", "", 1800, 1170.0, 18, "000", "01", 5, "industria", "cheia", "REGRA_GERAL", "000001", 1784.03],
  ["IND063", "BICICLETA ARO 29", "87120010", "", 2200, 1430.0, 18, "000", "01", 10, "industria", "cheia", "REGRA_GERAL", "000001", 2180.48],
  ["IND064", "PERFUME 100ML", "33030010", "", 320, 208.0, 18, "000", "04", 0, "industria", "cheia", "CONFIRMADO", "000001", 331.94],
  ["IND065", "SHAMPOO ANTICASPA", "33051000", "", 25, 16.25, 18, "060", "04", 0, "industria", "cheia", "CONFIRMADO", "000001", 25.93],
  ["IND066", "RACAO CAO PREMIUM 15KG", "23091000", "", 220, 143.0, 18, "060", "01", 0, "industria", "cheia", "CONFIRMADO", "000001", 218.05],
  ["IND067", "AGUA MINERAL 20L", "22011000", "", 12, 7.8, 18, "060", "04", 0, "industria", "cheia", "CONFIRMADO", "000001", 12.45],
  ["IND068", "VINHO TINTO 750ML", "22042100", "", 45, 29.25, 25, "060", "04", 0, "industria", "cheia+IS", "CONFIRMADO", "000001", 42.69],
  ["IND069", "CERVEJA LATA 350ML", "22030000", "", 4, 2.6, 25, "060", "04", 0, "industria", "cheia+IS", "CONFIRMADO", "000001", 3.8],
  ["IND070", "CARNE BOVINA KG", "02013000", "", 42, 27.3, 12, "000", "06", 0, "industria", "zero", "BENEFICIO_IDENTIFICADO", "200003", 36.96],
  ["IND071", "FEIJAO 1KG", "07133390", "", 9, 5.85, 12, "000", "06", 0, "industria", "zero", "BENEFICIO_IDENTIFICADO", "200003", 7.92],
  ["IND072", "OURO BARRA 10G", "71081210", "", 5500, 3575.0, 18, "000", "01", 0, "industria", "cheia+IS", "CONFIRMADO", "000001", 5451.2],
  ["IND073", "PETROLEO CRU BARRIL", "27090010", "", 400, 260.0, 0, "040", "04", 0, "industria", "cheia+IS", "CONFIRMADO", "000001", 414.92],
  ["IND074", "GASOLINA C L", "27101259", "", 6.3, 4.09, 25, "060", "04", 0, "industria", "adrem", "REVISAO_TRIBUTARIA", "620001", null],
  ["IND075", "ETANOL HIDRATADO L", "22071010", "", 4.2, 2.73, 25, "060", "04", 0, "industria", "adrem", "REVISAO_TRIBUTARIA", "620001", null],
  ["IND076", "ENERGIA ELETRICA KWH", "27160000", "", 0.9, 0.59, 25, "000", "01", 0, "industria", "cheia", "REGRA_GERAL", "000001", 0.81],
  ["SER077", "DIARIA HOTEL QUARTO DUPLO", "", "1.0303.11.00", 350, 175.0, "5", "", "01", "", "servicos", "red40", "BENEFICIO_IDENTIFICADO", "200048", 370.56],
  ["SER078", "REFEICAO RESTAURANTE A LA CARTE", "", "1.0301.10.00", 65, 32.5, "5", "", "01", "", "servicos", "red40", "BENEFICIO_IDENTIFICADO", "200047", 68.82],
  ["SER079", "PACOTE TURISTICO AGENCIA", "", "1.0402.11.90", 1800, 900.0, "5", "", "01", "", "servicos", "red40", "BENEFICIO_IDENTIFICADO", "200049", 1905.74],
  ["SER080", "PASSAGEM ONIBUS INTERESTADUAL", "", "1.0402.11.90", 180, 90.0, "5", "", "01", "", "servicos", "red40", "BENEFICIO_IDENTIFICADO", "200049", 190.57],
  ["SER081", "HONORARIOS ADVOCATICIOS CRIMINAL", "", "1.1301.10.00", 5000, 2500.0, "5", "", "01", "", "servicos", "red30", "BENEFICIO_IDENTIFICADO", "200052", 5414.77],
  ["SER082", "HONORARIOS CONTABEIS MENSAL", "", "1.1302.21.00", 900, 450.0, "5", "", "01", "", "servicos", "red30", "BENEFICIO_IDENTIFICADO", "200052", 974.66],
  ["SER083", "ESCRITURACAO FISCAL MENSAL", "", "1.1302.22.00", 600, 300.0, "5", "", "01", "", "servicos", "red30", "BENEFICIO_IDENTIFICADO", "200052", 649.77],
  ["SER084", "PROJETO ENGENHARIA RESIDENCIAL", "", "1.1403.21.10", 12000, 6000.0, "5", "", "01", "", "servicos", "red30", "BENEFICIO_IDENTIFICADO", "200052", 12995.45],
  ["SER085", "CONSULTORIA GESTAO ESTRATEGICA", "", "1.1401.11.00", 8000, 4000.0, "5", "", "01", "", "servicos", "cheia", "REGRA_GERAL", "000001", 9244.62],
  ["SER086", "MENSALIDADE ENSINO FUNDAMENTAL", "", "1.2201.20.00", 1200, 600.0, "5", "", "01", "", "servicos", "red60", "BENEFICIO_IDENTIFICADO", "200028", 1212.4],
  ["SER087", "EJA MENSALIDADE", "", "1.2203.10.00", 400, 200.0, "5", "", "01", "", "servicos", "red60", "BENEFICIO_IDENTIFICADO", "200028", 404.13],
  ["SER088", "CONSULTA MEDICA", "", "1.2301.21.00", 300, 150.0, "5", "", "01", "", "servicos", "red60", "BENEFICIO_IDENTIFICADO", "200029", 303.1],
  ["SER089", "PLANO DE SAUDE INDIVIDUAL", "", "1.0910.10.00", 650, 325.0, "5", "", "01", "", "servicos", "cheia", "REVISAO_TRIBUTARIA", "000001", null],
  ["SER090", "SEGURO DE VIDA MENSAL", "", "1.0903.11.00", 120, 60.0, "5", "", "01", "", "servicos", "cheia", "REVISAO_TRIBUTARIA", "000001", null],
  ["SER091", "ARRENDAMENTO MERCANTIL VEICULO", "", "1.0901.51.11", 1500, 750.0, "5", "", "01", "", "servicos", "cheia", "REVISAO_TRIBUTARIA", "000001", null],
  ["SER092", "CONSTRUCAO CASA TERREA M2", "", "1.0101.11.00", 2500, 1250.0, "5", "", "01", "", "servicos", "cheia", "REGRA_GERAL", "000001", 2888.94],
  ["SER093", "ASSINATURA SOFTWARE SAAS MENSAL", "", "1.1502.20.00", 199, 99.5, "5", "", "01", "", "servicos", "cheia", "CONFIRMADO", "000001", 229.96],
  ["SER094", "LICENCA DE USO SOFTWARE", "", "1.1103.22.00", 1200, 600.0, "5", "", "01", "", "servicos", "cheia", "REGRA_GERAL", "000001", 1386.69],
  ["SER095", "CAMPANHA PUBLICIDADE", "", "1.1406.11.00", 15000, 7500.0, "5", "", "01", "", "servicos", "cheia", "CONFIRMADO", "000001", 17333.66],
  ["SER096", "LIMPEZA PREDIAL MENSAL", "", "1.1803.10.00", 4500, 2250.0, "5", "", "01", "", "servicos", "cheia", "REGRA_GERAL", "000001", 5200.1],
  ["SER097", "CONSULTORIA EM SEGURANCA", "", "1.1802.20.00", 3000, 1500.0, "5", "", "01", "", "servicos", "cheia", "REGRA_GERAL", "000001", 3466.73],
  ["SER098", "FRETE RODOVIARIO GRANEL TON", "", "1.0501.11.10", 180, 90.0, "5", "", "01", "", "servicos", "cheia", "REGRA_GERAL", "000001", 208],
  ["SER099", "ORGANIZACAO DE FEIRA", "", "1.1806.62.00", 50000, 25000.0, "5", "", "01", "", "servicos", "red60", "BENEFICIO_IDENTIFICADO", "200039", 50516.55],
  ["SER100", "MENSALIDADE ACADEMIA", "", "1.2602.30.00", 120, 60.0, "5", "", "01", "", "servicos", "cheia", "CONFIRMADO", "000001", 138.67],
  ["SER101", "CORTE DE CABELO", "", "1.2602.10.00", 50, 25.0, "5", "", "01", "", "servicos", "cheia", "CONFIRMADO", "000001", 57.78],
  ["SER102", "CONSULTA VETERINARIA", "", "1.1405.90.00", 150, 75.0, "5", "", "01", "", "servicos", "red30", "BENEFICIO_IDENTIFICADO", "200052", 162.44],
  ["SER103", "ESTACIONAMENTO HORA", "", "1.0604.30.00", 12, 6.0, "5", "", "01", "", "servicos", "cheia", "REGRA_GERAL", "000001", 13.87],
  ["SER104", "STREAMING VIDEO MENSAL", "", "1.1703.32.00", 40, 20.0, "5", "", "01", "", "servicos", "cheia", "REGRA_GERAL", "000001", 46.22],
  ["SER105", "LOCACAO EQUIPAMENTO TELECOM", "", "1.1101.60.00", 800, 400.0, "5", "", "01", "", "servicos", "cheia", "REGRA_GERAL", "000001", 924.46],
  ["SER106", "CONSULTORIA FINANCEIRA", "", "1.1401.12.00", 5000, 2500.0, "5", "", "01", "", "servicos", "cheia", "REGRA_GERAL", "000001", 5777.89]
];
function rodar(html) {
  return new Promise((ok) => {
    const w = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://lionheartintelligence.com.br/app.html', virtualConsole: new VirtualConsole() }).window;
    w.fetch = () => new Promise(() => {}); w.HTMLElement.prototype.scrollIntoView = function () {}; w.scrollTo = function () {};
    setTimeout(() => {
      const out = { erro: '', by: {} };
      try {
        w.abrirPagina('classmassa'); w.cmProcessar([H].concat(T.map((t) => t.slice(0, 11))));
        const poll = () => { if (!w.CM_ULTIMO) return setTimeout(poll, 100);
          try { w.abrirPagina('precmassa'); w.document.getElementById('pm_regime').value = 'presumido'; w.document.getElementById('pm_icms').value = '18'; w.document.getElementById('pm_estr').value = 'fica'; w.lhPmRender();
            const P = w.PM_ULTIMO, pr = {}; P.rows.forEach((r) => { pr[r.f.cod] = r; });
            w.CM_ULTIMO.itens.forEach((i) => { const mp = w.cmCclassPorFonte(i.trat, i.fonte || ''); out.by[i.cod] = { trat: i.trat || '', st: w.cmStatusFinal(i), cc: String(mp[1]).replace('*', ''), p33: pr[i.cod] ? +pr[i.cod].c.anos[2033].finalCli.toFixed(2) : null, fonte: String(i.fonte || '') }; });
            out.fora = P.fora.map((f) => f.cod + ': ' + f.motivo);
          } catch (e) { out.erro = e.message + ' ' + (e.stack || '').split('\n')[1]; }
          w.close(); ok(out); };
        setTimeout(poll, 200);
      } catch (e) { out.erro = e.message; w.close(); ok(out); }
    }, 8000);
  });
}
(async () => {
  const r = await rodar(APP);
  ex('carregou, classificou e precificou sem erro', !r.erro, r.erro);
  if (!r.erro) {
    const setores = {}; T.forEach((t) => { (setores[t[10]] = setores[t[10]] || []).push(t); });
    Object.keys(setores).forEach((s) => {
      console.log('\n-- ' + s + ' (' + setores[s].length + ' itens) --');
      setores[s].forEach((t) => { const g = r.by[t[0]] || {}; const ok = g.trat === t[11] && g.st === t[12] && g.cc === t[13] && ((t[14] === null && g.p33 === null) || (t[14] !== null && g.p33 !== null && Math.abs(g.p33 - t[14]) < 0.011));
        ex(t[0] + ' ' + t[1].slice(0, 30).padEnd(30) + ' → ' + t[11] + ' · ' + t[12] + ' · ' + t[13] + (t[14] === null ? ' · fora' : ' · 2033 ' + t[14]), ok, JSON.stringify(g).slice(0, 200)); });
    });
    const n = T.filter((t) => t[14] !== null).length;
    ex(n + ' de ' + T.length + ' precificados; os ' + (T.length - n) + ' de fora têm motivo (ad rem, regime específico, destinação)', r.fora.length === T.length - n && r.fora.every((f) => /ad rem|regime espec|revis/.test(f)), r.fora.join(' / '));
  }
  console.log('\n-- ao contrário --');
  const sab = async (nome, alvo, troca, teste) => {
    if (APP.split(alvo).length !== 2) throw new Error('sabotagem "' + nome + '" não achou o alvo');
    const s = await rodar(APP.replace(alvo, troca)); ex(nome, !s.erro && teste(s), s.erro);
  };
  await sab('marcador agro desligado → ureia volta a "regra geral" → reprova', "if(/anexo ix|agropecu|insumo/.test(f)) return CM_MARCADOR.agro.test(dn);", "if(/anexo ix|agropecu|insumo/.test(f)) return false;",
    (s) => s.by.AGR004.trat !== 'red60' || s.by.AGR004.st !== 'BENEFICIO_IDENTIFICADO');
  await sab('índice de capítulos desligado → semente de milho vira regra geral → reprova', "if(!hit && CM_IDX.cap && CM_IDX.cap[k.slice(0,2)] && cmNcmValido(k)) hit=CM_IDX.cap[k.slice(0,2)];", "",
    (s) => s.by.AGR002.trat !== 'red60');
  await sab('regime específico de serviço desligado → plano de saúde vira regra geral → reprova', "if(esp.test(desc)) return {trat:'especifico',", "if(false) return {trat:'especifico',",
    (s) => s.by.SER089.st !== 'REVISAO_TRIBUTARIA');
  await sab('IS volta a ser "benefício condicionado" → automóvel em revisão → reprova', "if(hit.trat && hit.trat!=='cheia' && hit.trat!=='cheia+IS' && desc){", "if(hit.trat && hit.trat!=='cheia' && desc){",
    (s) => s.by.IND042.st !== 'CONFIRMADO');
  await sab('regra firme da saúde menstrual removida → absorvente volta a −60% → reprova', "if(/^9619/.test(k) && /absorvent", "if(false && /absorvent",
    (s) => s.by.IND052.trat !== 'zero');
  console.log(falhou ? '\nRESULTADO: ' + falhou + ' reprovada(s)' : '\nRESULTADO: tudo aprovado');
  process.exit(falhou ? 1 : 0);
})();
