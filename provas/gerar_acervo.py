#!/usr/bin/env python3
"""
Gerador de acervo sintético Lionheart — quatro pilares.
Cada pilar produz 12 extratos PGDAS-D (texto, como o pdf.js entregaria) e
NF-e de entrada e saída coerentes entre si.

Princípio: os números têm de FECHAR. Receita das notas = RPA do PGDAS,
RBT12 = soma dos 12 meses, tributos = RPA x alíquota efetiva do anexo.
Documento que não fecha testa o parser mas não testa o motor.
"""
import os, json, random, hashlib

random.seed(2609)  # determinístico: mesmo acervo toda vez

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'acervo')

# ─────────────────────────────────────────────────────────────────────
# tabelas do Simples Nacional (LC 123, anexos I a V) — faixa e deduzir
# ─────────────────────────────────────────────────────────────────────
ANEXOS = {
    'I':   [(180000,0.040,0),(360000,0.073,5940),(720000,0.095,13860),
            (1800000,0.107,22500),(3600000,0.143,87300),(4800000,0.19,378000)],
    'II':  [(180000,0.045,0),(360000,0.078,5940),(720000,0.10,13860),
            (1800000,0.112,22500),(3600000,0.147,85500),(4800000,0.30,720000)],
    'III': [(180000,0.060,0),(360000,0.112,9360),(720000,0.135,17640),
            (1800000,0.16,35640),(3600000,0.21,125640),(4800000,0.33,648000)],
    'V':   [(180000,0.155,0),(360000,0.18,4500),(720000,0.195,9900),
            (1800000,0.205,17100),(3600000,0.23,62100),(4800000,0.305,540000)],
}
# repartição por anexo (percentuais sobre o total, LC 123 anexo correspondente)
REPARTICAO = {
    'I':   dict(irpj=.055, csll=.035, cofins=.1274, pis=.0276, cpp=.42,  icms=.335, ipi=0,    iss=0),
    'II':  dict(irpj=.055, csll=.035, cofins=.1151, pis=.0249, cpp=.3750,icms=.32,  ipi=.075, iss=0),
    'III': dict(irpj=.04,  csll=.035, cofins=.1282, pis=.0278, cpp=.4340,icms=0,    ipi=0,    iss=.3350),
    'V':   dict(irpj=.25,  csll=.15,  cofins=.1410, pis=.0305, cpp=.2885,icms=0,    ipi=0,    iss=.1400),
}

def aliq_efetiva(rbt12, anexo):
    for teto, aliq, ded in ANEXOS[anexo]:
        if rbt12 <= teto:
            return max(0.0, (rbt12 * aliq - ded) / rbt12) if rbt12 else 0.0
    return ANEXOS[anexo][-1][1]

def br(v):
    return f'{v:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')

# ─────────────────────────────────────────────────────────────────────
# PILARES
# ─────────────────────────────────────────────────────────────────────
PILARES = {
    'comercio': dict(
        anexo='I', cnpj='11222333000181', nome='NORTE SUL COMERCIO DE FERRAGENS LTDA',
        uf='RS', mun='4315602', xmun='RIO GRANDE', cfop_venda='5102', cfop_compra='1102',
        base=180000, cresc=0.015, pct_compra=0.58, ncm='73181500',
        prod='PARAFUSO SEXTAVADO ACO CARBONO', devolucoes=2, export=0.0),
    'industria': dict(
        anexo='II', cnpj='22333444000172', nome='METALFORJA INDUSTRIA DE PECAS LTDA',
        uf='RS', mun='4314902', xmun='PORTO ALEGRE', cfop_venda='5101', cfop_compra='1101',
        base=245000, cresc=0.012, pct_compra=0.46, ncm='84813000',
        prod='VALVULA DE RETENCAO FUNDIDA', devolucoes=1, export=0.08),
    'servico': dict(
        anexo='III', cnpj='33444555000163', nome='ORION CONTABILIDADE E ASSESSORIA LTDA',
        uf='RS', mun='4314902', xmun='PORTO ALEGRE', cfop_venda='5933', cfop_compra='1556',
        base=68000, cresc=0.02, pct_compra=0.11, ncm='00000000',
        prod='SERVICOS CONTABEIS', devolucoes=0, export=0.0),
    'agro': dict(
        anexo='I', cnpj='44555666000154', nome='CAMPO ALTO AGRONEGOCIOS LTDA',
        uf='RS', mun='4318705', xmun='SANTA MARIA', cfop_venda='5101', cfop_compra='1101',
        base=310000, cresc=0.008, pct_compra=0.63, ncm='10059010',
        prod='MILHO EM GRAO A GRANEL', devolucoes=1, export=0.22),
}

def receitas_12m(p):
    """12 competências com sazonalidade — nunca uma reta, porque real não é reta."""
    saz = [0.82, 0.88, 1.04, 1.11, 1.18, 0.95, 0.91, 0.99, 1.07, 1.14, 1.21, 0.86]
    out = []
    for i in range(12):
        v = p['base'] * (1 + p['cresc']) ** i * saz[i] * random.uniform(0.96, 1.04)
        out.append(round(v, 2))
    return out

# ─────────────────────────────────────────────────────────────────────
# PGDAS-D — mesmo layout do extrato real
# ─────────────────────────────────────────────────────────────────────
def pgdas(p, pa_mes, pa_ano, rpa, rbt12, rba, ant12):
    an = p['anexo']
    aliq = aliq_efetiva(rbt12, an)
    total = rpa * aliq
    rep = REPARTICAO[an]
    t = {k: round(total * v, 2) for k, v in rep.items()}
    soma = round(sum(t.values()), 2)
    cnpj = p['cnpj']
    cf = f'{cnpj[:2]}.{cnpj[2:5]}.{cnpj[5:8]}/{cnpj[8:12]}-{cnpj[12:]}'
    linha = (f"{br(t['irpj'])} {br(t['csll'])} {br(t['cofins'])} {br(t['pis'])} "
             f"{br(t['cpp'])} {br(t['icms'])} {br(t['ipi'])} {br(t['iss'])} {br(soma)}")
    cab = 'IRPJ CSLL COFINS PIS/Pasep INSS/CPP ICMS IPI ISS Total'
    ant = ''
    for i in range(0, 12, 4):
        ant += ' '.join(f'{m:02d}/{pa_ano-1} {br(v)}' for m, v in
                        [(j + 1, ant12[j]) for j in range(i, min(i + 4, 12))]) + '\n'
    atividade = ('Prestação de serviços, exceto para o exterior'
                 if an in ('III', 'V') else
                 'Revenda de mercadorias, exceto para o exterior - Sem substituição tributária/tributação\n'
                 'monofásica/antecipação com encerramento de tributação (o substituto tributário do ICMS deve utilizar\n'
                 'essa opção)')
    return f""" Extrato do Simples Nacional
Gerado em 15/01/{pa_ano+1} 09:12:44
Apurado em 12/{pa_mes:02d}/{pa_ano} 10:31:02
Apuração Original
PGDAS-D 2018 Versão 2.2.27
1) Informações do Contribuinte
CNPJ Básico: {cf[:10]} Nome Empresarial: {p['nome']}
Data de Abertura: 14/03/2019 Regime de Apuração: Competência Optante pelo Simples Nacional: Sim
2) Informações da Apuração {cnpj}{pa_ano}{pa_mes:02d}001
Período de Apuração (PA): {pa_mes:02d}/{pa_ano}
2.1 Discriminativo de Receitas
Total de Receitas Brutas (R$) Mercado Interno Mercado Externo Total
Receita Bruta do PA (RPA) - Competência {br(rpa)} 0,00 {br(rpa)}
Receita bruta acumulada nos doze meses anteriores ao PA
(RBT12){br(rbt12)} 0,00 {br(rbt12)}
Receita bruta acumulada nos doze meses anteriores ao PA
proporcionalizada (RBT12p)
Receita bruta acumulada no ano-calendário corrente (RBA) {br(rba)} 0,00 {br(rba)}
Receita bruta acumulada no ano-calendário anterior
(RBAA){br(sum(ant12))} 0,00 {br(sum(ant12))}
Limite de receita bruta proporcionalizado 4.800.000,00 4.800.000,00
.
.
2.2) Receitas Brutas Anteriores (R$)
2.2.1) Mercado Interno
{ant}2.2.2) Mercado Externo
01/{pa_ano-1} 0,00 02/{pa_ano-1} 0,00 03/{pa_ano-1} 0,00 04/{pa_ano-1} 0,00
.
.
2.3) Folha de Salários Anteriores (R$)
{'Nenhuma' if an in ('I','II') else br(rbt12*0.29)}
.
.
2.4) Fator r
Fator r = {'Não se aplica' if an in ('I','II') else '0,29'}
.
.
2.5) Valores Fixos
Não se aplica
.
.
3) Informações dos Estabelecimentos - valores referentes às Receitas Informadas
CNPJ Estabelecimento: {cf}
Município: {p['xmun']} UF: {p['uf']}
Sublimite de Receita Anual (R$): 3.600.000,00 Impedido de recolher ICMS/ISS no DAS: Não
.
.
                                                                                      Página 1



Valor do Débito por Tributo para a Atividade (R$):
{atividade}
Receita Bruta Informada: R$ {br(rpa)}
{cab}
{linha}
Parcela 1: R$ {br(rpa)}
.
.
Informações por Estabelecimento
Valor Informado: {br(rpa)}
Total do Débito Declarado (exigível + suspenso)
{cab}
{linha}
Total do Débito com Exigibilidade Suspensa (R$)
{cab}
0,00 0,00 0,00 0,00 0,00 0,00 0,00 0,00 0,00
Total do Débito Exigível (R$)
{cab}
{linha}
.
.
4) Total Geral da Empresa
Total do Débito Declarado (exigível + suspenso) (R$)
{cab}
{linha}
"""

# ─────────────────────────────────────────────────────────────────────
# NF-e
# ─────────────────────────────────────────────────────────────────────
def nfe(p, nnf, dt, emit_cnpj, emit_nome, dest_cnpj, dest_nome, valor,
        cfop, tp_nf='1', crt='1', icms=0.0, pis=0.0, cof=0.0, ipi=0.0, uf_dest=None):
    uf_dest = uf_dest or p['uf']
    chave = ('43' + dt[2:4] + dt[5:7] + emit_cnpj + '55001' + f'{nnf:09d}' + '10601202')[:44]
    itens = f"""<det nItem="1"><prod><cProd>001</cProd><cEAN/><xProd>{p['prod']}</xProd>
<NCM>{p['ncm']}</NCM><CFOP>{cfop}</CFOP><uCom>UN</uCom><qCom>1.0000</qCom>
<vUnCom>{valor:.2f}</vUnCom><vProd>{valor:.2f}</vProd><indTot>1</indTot></prod>
<imposto><ICMS><ICMSSN102><orig>0</orig><CSOSN>102</CSOSN></ICMSSN102></ICMS>
<PIS><PISAliq><CST>01</CST><vBC>{valor:.2f}</vBC><pPIS>1.65</pPIS><vPIS>{pis:.2f}</vPIS></PISAliq></PIS>
<COFINS><COFINSAliq><CST>01</CST><vBC>{valor:.2f}</vBC><pCOFINS>7.60</pCOFINS><vCOFINS>{cof:.2f}</vCOFINS></COFINSAliq></COFINS>
{f'<IPI><IPITrib><CST>50</CST><vBC>{valor:.2f}</vBC><pIPI>5.00</pIPI><vIPI>{ipi:.2f}</vIPI></IPITrib></IPI>' if ipi else ''}
</imposto></det>"""
    return f"""<?xml version="1.0" encoding="UTF-8"?><nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe"><NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe Id="NFe{chave}" versao="4.00"><ide><cUF>43</cUF><cNF>{nnf:08d}</cNF><natOp>VENDA</natOp><mod>55</mod><serie>1</serie><nNF>{nnf}</nNF><dhEmi>{dt}T10:15:00-03:00</dhEmi><tpNF>{tp_nf}</tpNF><idDest>{'2' if uf_dest!=p['uf'] else '1'}</idDest><cMunFG>{p['mun']}</cMunFG><tpImp>1</tpImp><tpEmis>1</tpEmis><cDV>0</cDV><tpAmb>1</tpAmb><finNFe>1</finNFe><indFinal>1</indFinal><indPres>3</indPres><procEmi>0</procEmi><verProc>4.0.0.0</verProc></ide><emit><CNPJ>{emit_cnpj}</CNPJ><xNome>{emit_nome}</xNome><enderEmit><xLgr>RUA DAS INDUSTRIAS</xLgr><nro>100</nro><xBairro>CENTRO</xBairro><cMun>{p['mun']}</cMun><xMun>{p['xmun']}</xMun><UF>{p['uf']}</UF><CEP>96200000</CEP><cPais>1058</cPais><xPais>BRASIL</xPais></enderEmit><IE>1234567890</IE><CRT>{crt}</CRT></emit><dest><CNPJ>{dest_cnpj}</CNPJ><xNome>{dest_nome}</xNome><enderDest><xLgr>AVENIDA CENTRAL</xLgr><nro>2000</nro><xBairro>DISTRITO</xBairro><cMun>{p['mun']}</cMun><xMun>{p['xmun']}</xMun><UF>{uf_dest}</UF><CEP>90000000</CEP><cPais>1058</cPais><xPais>BRASIL</xPais></enderDest><indIEDest>1</indIEDest><IE>9876543210</IE></dest>{itens}<total><ICMSTot><vBC>{valor if icms else 0:.2f}</vBC><vICMS>{icms:.2f}</vICMS><vST>0.00</vST><vProd>{valor:.2f}</vProd><vFrete>0.00</vFrete><vIPI>{ipi:.2f}</vIPI><vPIS>{pis:.2f}</vPIS><vCOFINS>{cof:.2f}</vCOFINS><vNF>{valor:.2f}</vNF></ICMSTot></total><cobr><fat><nFat>{nnf}</nFat><vLiq>{valor:.2f}</vLiq></fat><dup><nDup>001</nDup><dVenc>{dt[:8]}28</dVenc><vDup>{valor:.2f}</vDup></dup></cobr><pag><detPag><tPag>15</tPag><vPag>{valor:.2f}</vPag></detPag></pag></infNFe></NFe><protNFe versao="4.00"><infProt><chNFe>{chave}</chNFe><dhRecbto>{dt}T10:20:00-03:00</dhRecbto><nProt>143260000000001</nProt><cStat>100</cStat><xMotivo>Autorizado o uso da NF-e</xMotivo></infProt></protNFe></nfeProc>"""

# ─────────────────────────────────────────────────────────────────────
def build():
    ANO = 2026
    resumo = {}
    for nome, p in PILARES.items():
        d = f'{BASE}/{nome}'
        os.makedirs(f'{d}/pgdas', exist_ok=True)
        os.makedirs(f'{d}/xml', exist_ok=True)
        rec = receitas_12m(p)
        ant = [round(v * 0.93, 2) for v in rec]     # ano anterior
        rba = 0
        for i, rpa in enumerate(rec):
            mes = i + 1
            rba += rpa
            janela = ant[i:] + rec[:i]               # 12 meses anteriores ao PA
            rbt12 = round(sum(janela), 2)
            open(f'{d}/pgdas/PGDAS-{ANO}{mes:02d}.txt', 'w').write(
                pgdas(p, mes, ANO, rpa, rbt12, round(rba, 2), ant))
        # notas: 6 saídas e 4 entradas por mês
        nnf = 1000
        tot_s = tot_e = 0.0
        for i, rpa in enumerate(rec):
            mes = i + 1
            for k in range(6):
                v = round(rpa / 6, 2)
                ufd = 'SP' if (p['export'] and k == 0) else p['uf']
                nnf += 1
                open(f'{d}/xml/S-{ANO}{mes:02d}-{nnf}.xml', 'w').write(
                    nfe(p, nnf, f'{ANO}-{mes:02d}-{5+k*4:02d}', p['cnpj'], p['nome'],
                        '55666777000145', 'CLIENTE COMPRADOR LTDA', v,
                        p['cfop_venda'], '1', '1', 0, round(v*.0065,2), round(v*.03,2),
                        round(v*.05,2) if p['anexo']=='II' else 0, ufd))
                tot_s += v
            compra_mes = rpa * p['pct_compra']
            for k in range(4):
                v = round(compra_mes / 4, 2)
                nnf += 1
                open(f'{d}/xml/E-{ANO}{mes:02d}-{nnf}.xml', 'w').write(
                    nfe(p, nnf, f'{ANO}-{mes:02d}-{3+k*6:02d}', '66777888000136',
                        'FORNECEDOR INDUSTRIAL SA', p['cnpj'], p['nome'], v,
                        p['cfop_compra'], '1', '3', round(v*.18,2),
                        round(v*.0165,2), round(v*.076,2), 0, p['uf']))
                tot_e += v
        # devoluções de venda (tpNF=0, emitidas pela própria empresa)
        for k in range(p['devolucoes']):
            nnf += 1
            v = round(rec[3+k] * 0.004, 2)
            open(f'{d}/xml/D-{ANO}0{4+k}-{nnf}.xml', 'w').write(
                nfe(p, nnf, f'{ANO}-0{4+k}-20', p['cnpj'], p['nome'],
                    '55666777000145', 'CLIENTE COMPRADOR LTDA', v,
                    '1202', '0', '1', 0, 0, 0, 0, p['uf']))
        resumo[nome] = dict(
            anexo=p['anexo'], cnpj=p['cnpj'],
            receita_ano=round(sum(rec), 2), rbt12_final=round(sum(rec), 2),
            compras_ano=round(tot_e, 2), devolucoes=p['devolucoes'],
            pgdas=12, xml=len(os.listdir(f'{d}/xml')))
    open(f'{BASE}/resumo.json', 'w').write(json.dumps(resumo, indent=1, ensure_ascii=False))
    for k, v in resumo.items():
        print(f"{k:10} anexo {v['anexo']:3}  receita/ano {br(v['receita_ano']):>14}  "
              f"compras {br(v['compras_ano']):>14}  {v['pgdas']} PGDAS  {v['xml']} XML  "
              f"{v['devolucoes']} devol.")

if __name__ == '__main__':
    build()
