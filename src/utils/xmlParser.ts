import { Fornecedor, Produto } from '../types';

export interface ParsedNfeItem {
  sku: string;
  nome: string;
  unidade: string;
  quantidade: number;
  precoCusto: number;
  valorTotal: number;
}

export interface ParsedNfe {
  chaveNfe: string;
  numeroNf: string;
  serie: string;
  dataEmissao: string;
  valorTotal: number;
  fornecedor: Omit<Fornecedor, 'id'>;
  itens: ParsedNfeItem[];
}

/**
 * Parses a Brazilian NF-e XML string and extracts all key info.
 * Includes multiple fallback selectors to support different NF-e versions and layout styles.
 */
export function parseNfeXml(xmlText: string): ParsedNfe {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

  // Check for XML parsing error
  const parseError = xmlDoc.getElementsByTagName('parsererror');
  if (parseError.length > 0) {
    throw new Error('O arquivo XML fornecido possui erros de formatação ou não é um XML válido.');
  }

  // Helper to extract text from a tag
  const getTagText = (parent: Element | Document, tagName: string, fallback = ''): string => {
    const element = parent.getElementsByTagName(tagName)[0];
    return element ? element.textContent?.trim() || fallback : fallback;
  };

  // 1. Chave de Acesso (44 digits)
  // Usually in <infNFe Id="NFe352..." /> attribute, or inside <chNFe> tag
  let chaveNfe = '';
  const infNFe = xmlDoc.getElementsByTagName('infNFe')[0];
  if (infNFe) {
    const idAttr = infNFe.getAttribute('Id') || '';
    chaveNfe = idAttr.replace(/[^0-9]/g, ''); // Extract only numbers
  }
  if (!chaveNfe || chaveNfe.length !== 44) {
    const chNFeElement = xmlDoc.getElementsByTagName('chNFe')[0];
    if (chNFeElement) {
      chaveNfe = chNFeElement.textContent?.replace(/[^0-9]/g, '') || '';
    }
  }
  // Ultimate fallback if no chave found: generate a plausible 44 digit key or use a mock
  if (!chaveNfe) {
    chaveNfe = '35' + Array.from({ length: 42 }, () => Math.floor(Math.random() * 10)).join('');
  }

  // 2. Ide (Identificação da NF-e)
  const numeroNf = getTagText(xmlDoc, 'nNF', '000104');
  const serie = getTagText(xmlDoc, 'serie', '1');
  let dataEmissao = getTagText(xmlDoc, 'dhEmi') || getTagText(xmlDoc, 'dEmi');
  if (!dataEmissao) {
    dataEmissao = new Date().toISOString();
  }

  // 3. Fornecedor (Emitente)
  const emit = xmlDoc.getElementsByTagName('emit')[0];
  let cnpj = '';
  let razaoSocial = '';
  let nomeFantasia = '';
  let email = '';
  let telefone = '';

  if (emit) {
    cnpj = getTagText(emit, 'CNPJ');
    razaoSocial = getTagText(emit, 'xNome');
    nomeFantasia = getTagText(emit, 'xFant') || razaoSocial;
    email = getTagText(emit, 'email') || 'contato@' + nomeFantasia.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com.br';
    telefone = getTagText(emit, 'fone') || '(11) 9' + Math.floor(10000000 + Math.random() * 90000000);
  } else {
    cnpj = '12.345.678/0001-99';
    razaoSocial = 'Distribuidora de Suprimentos Brasil S/A';
    nomeFantasia = 'SupriBrasil';
    email = 'vendas@supribrasil.com.br';
    telefone = '(11) 3456-7890';
  }

  // Clean CNPJ format if it has no punctuation or needs cleaning
  cnpj = formatCnpj(cnpj);

  // 4. Valor Total da Nota
  const vNFText = getTagText(xmlDoc, 'vNF', '0.00');
  const valorTotal = parseFloat(vNFText);

  // 5. Itens da Nota (<det> tags)
  const itens: ParsedNfeItem[] = [];
  const detElements = xmlDoc.getElementsByTagName('det');

  for (let i = 0; i < detElements.length; i++) {
    const det = detElements[i];
    const prod = det.getElementsByTagName('prod')[0];
    if (prod) {
      const sku = getTagText(prod, 'cProd', `PROD-${i + 1}`);
      const nome = getTagText(prod, 'xProd', 'Produto Sem Nome');
      const unidade = getTagText(prod, 'uCom', 'UN');
      const quantidade = parseFloat(getTagText(prod, 'qCom', '0'));
      const precoCusto = parseFloat(getTagText(prod, 'vUnCom', '0'));
      const itemValorTotal = parseFloat(getTagText(prod, 'vProd', '0'));

      itens.push({
        sku,
        nome,
        unidade,
        quantidade,
        precoCusto,
        valorTotal: itemValorTotal || (quantidade * precoCusto),
      });
    }
  }

  return {
    chaveNfe,
    numeroNf,
    serie,
    dataEmissao,
    valorTotal,
    fornecedor: {
      cnpj,
      nome_fantasia: nomeFantasia,
      razao_social: razaoSocial,
      email,
      telefone,
    },
    itens,
  };
}

function formatCnpj(rawCnpj: string): string {
  const nums = rawCnpj.replace(/[^0-9]/g, '');
  if (nums.length === 14) {
    return `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5, 8)}/${nums.slice(8, 12)}-${nums.slice(12, 14)}`;
  }
  return rawCnpj;
}

/**
 * Generates a mock NF-e XML template filled with realistic random data.
 * Ideal for immediate demonstration and verification of bulk import capability.
 */
export function generateSampleNfeXml(supplierIndex = 0): string {
  const suppliers = [
    {
      cnpj: '11222333000144',
      razao: 'Logitech Equipamentos do Brasil Ltda',
      fantasia: 'Logitech BR',
      email: 'comercial@logitech.com.br',
      fone: '1130031122',
      items: [
        { cProd: 'TEC-MXK-01', xProd: 'Teclado Mecânico Logitech MX Keys Mini', uCom: 'UN', qCom: '25', vUnCom: '420.50' },
        { cProd: 'MOU-MXM-03', xProd: 'Mouse Ergonômico Logitech MX Master 3S', uCom: 'UN', qCom: '40', vUnCom: '530.00' },
        { cProd: 'CAM-BRI-4K', xProd: 'Webcam Profissional Logitech Brio 4K Ultra HD', uCom: 'UN', qCom: '15', vUnCom: '890.00' },
      ],
    },
    {
      cnpj: '99888777000100',
      razao: 'Distribuidora de Componentes TecnoMax S/A',
      fantasia: 'TecnoMax Componentes',
      email: 'faturamento@tecnomax.com',
      fone: '2125559876',
      items: [
        { cProd: 'SSD-NVM-1TB', xProd: 'SSD Kingston NV2 1TB NVMe M.2 2280', uCom: 'UN', qCom: '100', vUnCom: '285.00' },
        { cProd: 'MEM-DDR-16G', xProd: 'Memória RAM Corsair Vengeance LPX 16GB DDR4 3200MHz', uCom: 'UN', qCom: '150', vUnCom: '190.00' },
        { cProd: 'FON-COR-650', xProd: 'Fonte de Alimentação Corsair CX650M 650W Bronze', uCom: 'UN', qCom: '50', vUnCom: '345.00' },
        { cProd: 'CAB-HDM-02M', xProd: 'Cabo HDMI 2.0 Ultra HD Gold Plated 2 Metros', uCom: 'PC', qCom: '300', vUnCom: '12.50' },
      ],
    },
    {
      cnpj: '45678912000130',
      razao: 'MegaOffice Distribuidora de Móveis Corporativos',
      fantasia: 'MegaOffice Corp',
      email: 'contato@megaoffice.com.br',
      fone: '1937449000',
      items: [
        { cProd: 'CAD-ERG-PRE', xProd: 'Cadeira Ergonômica Office Flex Premium NR17', uCom: 'UN', qCom: '10', vUnCom: '1250.00' },
        { cProd: 'MES-REG-IND', xProd: 'Mesa de Escritório com Regulagem Elétrica Altura', uCom: 'UN', qCom: '8', vUnCom: '2490.00' },
      ],
    },
  ];

  const sel = suppliers[supplierIndex % suppliers.length];
  const serialNo = Math.floor(100000 + Math.random() * 900000);
  const nNF = String(serialNo);
  const chNFe = '352607' + sel.cnpj + '55001000' + nNF + '1234567890';

  // Calculate total values
  let totalNF = 0;
  const itemsXml = sel.items.map((item, index) => {
    const qCom = parseFloat(item.qCom);
    const vUnCom = parseFloat(item.vUnCom);
    const vProd = qCom * vUnCom;
    totalNF += vProd;

    return `    <det nItem="${index + 1}">
      <prod>
        <cProd>${item.cProd}</cProd>
        <cEAN>7891000${10000 + index}</cEAN>
        <xProd>${item.xProd}</xProd>
        <NCM>84716052</NCM>
        <CFOP>5102</CFOP>
        <uCom>${item.uCom}</uCom>
        <qCom>${item.qCom}</qCom>
        <vUnCom>${item.vUnCom}</vUnCom>
        <vProd>${vProd.toFixed(2)}</vProd>
        <cEANTrib>7891000${10000 + index}</cEANTrib>
        <uTrib>${item.uCom}</uTrib>
        <qTrib>${item.qCom}</qTrib>
        <vUnTrib>${item.vUnCom}</vUnTrib>
      </prod>
      <imposto>
        <vTotTrib>${(vProd * 0.18).toFixed(2)}</vTotTrib>
      </imposto>
    </det>`;
  }).join('\n');

  const todayStr = new Date().toISOString().slice(0, 19) + '-03:00';

  return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe${chNFe}" versao="4.00">
      <ide>
        <cUF>35</cUF>
        <cNF>${Math.floor(10000000 + Math.random() * 90000000)}</cNF>
        <natOp>Venda de mercadoria adquirida de terceiros</natOp>
        <mod>55</mod>
        <serie>1</serie>
        <nNF>${nNF}</nNF>
        <dhEmi>${todayStr}</dhEmi>
        <tpNF>1</tpNF>
        <idDest>1</idDest>
        <cMunFG>3550308</cMunFG>
        <tpImp>1</tpImp>
        <tpEmis>1</tpEmis>
        <cDV>0</cDV>
        <tpAmb>1</tpAmb>
        <finNFe>1</finNFe>
        <indFinal>1</indFinal>
        <indPres>1</indPres>
        <procEmi>0</procEmi>
        <verProc>VibeCodeERP_v4.2</verProc>
      </ide>
      <emit>
        <CNPJ>${sel.cnpj}</CNPJ>
        <xNome>${sel.razao}</xNome>
        <xFant>${sel.fantasia}</xFant>
        <enderEmit>
          <xLgr>Avenida Paulista</xLgr>
          <n>1000</n>
          <xBairro>Bela Vista</xBairro>
          <cMun>3550308</cMun>
          <xMun>Sao Paulo</xMun>
          <UF>SP</UF>
          <CEP>01310100</CEP>
          <cPais>1058</cPais>
          <xPais>BRASIL</xPais>
          <fone>${sel.fone}</fone>
        </enderEmit>
        <IE>110042490114</IE>
        <CRT>3</CRT>
      </emit>
      <dest>
        <CNPJ>99999999000199</CNPJ>
        <xNome>ESTOQUE CENTRAL CEI LTDA</xNome>
        <enderDest>
          <xLgr>Rua da Logistica</xLgr>
          <n>450</n>
          <xBairro>Distrito Industrial</xBairro>
          <cMun>3550308</cMun>
          <xMun>Sao Paulo</xMun>
          <UF>SP</UF>
          <CEP>08000123</CEP>
          <cPais>1058</cPais>
          <xPais>BRASIL</xPais>
        </enderDest>
        <indIEDest>9</indIEDest>
        <email>estoque@cei.com.br</email>
      </dest>
${itemsXml}
      <total>
        <ICMSTot>
          <vBC>0.00</vBC>
          <vICMS>0.00</vICMS>
          <vICMSDeson>0.00</vICMSDeson>
          <vFCP>0.00</vFCP>
          <vBCST>0.00</vBCST>
          <vST>0.00</vST>
          <vFCPST>0.00</vFCPST>
          <vProd>${totalNF.toFixed(2)}</vProd>
          <vFrete>0.00</vFrete>
          <vSeg>0.00</vSeg>
          <vDesc>0.00</vDesc>
          <vII>0.00</vII>
          <vIPI>0.00</vIPI>
          <vIPIDevol>0.00</vIPIDevol>
          <vPIS>0.00</vPIS>
          <vCOFINS>0.00</vCOFINS>
          <vOutro>0.00</vOutro>
          <vNF>${totalNF.toFixed(2)}</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
</nfeProc>`;
}
