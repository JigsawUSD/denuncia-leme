/**
 * Denúncia Leme - Google Apps Script Backend
 * Recebe denúncias do site e armazena no Google Sheets
 */

/**
 * Endpoint para receber denúncias via POST
 * @param {Object} e Evento do request
 * @return {HtmlService.Output} Resposta JSON
 */
function doPost(e) {
  try {
    // Parsear o JSON recebido
    const data = JSON.parse(e.postData.contents);

    // Validar campos obrigatórios
    if (!data.protocolo || !data.categoria || !data.descricao) {
      return HtmlService.createHtmlOutput(
        JSON.stringify({success: false, error: 'Campos obrigatórios faltando'}),
        {contentType: 'application/json'}
      );
    }

    // Obter ou criar a planilha
    const sheet = getOrCreateSheet();

    // Verificar se o protocolo já existe (evitar duplicatas)
    if (protocoloExists(sheet, data.protocolo)) {
      return HtmlService.createHtmlOutput(
        JSON.stringify({success: false, error: 'Protocolo já existe'}),
        {contentType: 'application/json'}
      );
    }

    // Preparar dados para inserção
    const rowData = [
      data.protocolo,
      new Date(), // timestamp de recebimento
      data.categoria,
      data.descricao,
      data.foto || '', // foto (base64 ou URL)
      data.nome || '', // nome (opcional)
      data.anonimo !== undefined ? data.anonimo : true, // anonimo (padrão: true)
      data.timestamp || new Date().toISOString() // timestamp original
    ];

    // Inserir nova linha
    sheet.appendRow(rowData);

    // Resposta de sucesso
    return HtmlService.createHtmlOutput(
      JSON.stringify({success: true, message: 'Denúncia recebida com sucesso'}),
      {contentType: 'application/json'}
    );

  } catch (error) {
    console.error('Erro no doPost:', error);
    return HtmlService.createHtmlOutput(
      JSON.stringify({success: false, error: 'Erro interno do servidor'}),
      {contentType: 'application/json'}
    );
  }
}

/**
 * Obtém a planilha "Denúncias Leme" ou cria se não existir
 * @return {GoogleAppsScript.Spreadsheet.Sheet} Planilha para armazenar denúncias
 */
function getOrCreateSheet() {
  const spreadsheetName = 'Denúncias Leme';
  let spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  // Se não for a planilha ativa, tentar obter pelo nome
  if (spreadsheet.getName() !== spreadsheetName) {
    spreadsheet = SpreadsheetApp.openByName(spreadsheetName);
  }

  // Se ainda não existir, criar nova
  if (!spreadsheet) {
    spreadsheet = SpreadsheetApp.create(spreadsheetName);
    // Compartilhar com o próprio usuário (opcional)
    // spreadsheet.addEditor(Session.getActiveUser().getEmail());
  }

  // Obter ou criar a aba "Denúncias"
  let sheet = spreadsheet.getSheetByName('Denúncias');
  if (!sheet) {
    sheet = spreadsheet.insertSheet('Denúncias');
    // Criar cabeçalhos
    const headers = [
      'Protocolo',
      'Data Recebimento',
      'Categoria',
      'Descrição',
      'Foto',
      'Nome',
      'Anônimo',
      'Timestamp Original'
    ];
    sheet.appendRow(headers);
    // Formatando cabeçalhos em negrito
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }

  return sheet;
}

/**
 * Verifica se um protocolo já existe na planilha
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet Planilha para verificar
 * @param {string} protocolo Protocolo a ser verificado
 * @return {boolean} True se o protocolo já existe
 */
function protocoloExists(sheet, protocolo) {
  const data = sheet.getDataRange().getValues();
  // Começar na linha 2 (pular cabeçalhos)
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === protocolo) {
      return true;
    }
  }
  return false;
}

/**
 * Função para gerar relatório de denúncias por categoria
 * Pode ser chamada manualmente ou agendada
 */
function gerarRelatorioDenuncias() {
  const sheet = getOrCreateSheet();
  const data = sheet.getDataRange().getValues();

  // Pular cabeçalhos
  const denuncias = data.slice(1);

  // Contar por categoria
  const contagemPorCategoria = {};
  denuncias.forEach(denuncia => {
    const categoria = denuncia[2]; // Categoria está na posição 2 (índice base 0)
    if (categoria) {
      contagemPorCategoria[categoria] = (contagemPorCategoria[categoria] || 0) + 1;
    }
  });

  // Log do relatório
  Logger.log('=== RELATÓRIO DE DENÚNCIAS ===');
  Logger.log(`Total de denúncias: ${denuncias.length}`);
  Logger.log('');
  Logger.log('Por categoria:');
  for (const [categoria, quantidade] of Object.entries(contagemPorCategoria)) {
    Logger.log(`- ${categoria}: ${quantidade}`);
  }

  // Também retornar como objeto para uso em outras funções
  return {
    total: denuncias.length,
    porCategoria: contagemPorCategoria
  };
}

/**
 * Função de teste para verificar se o endpoint está funcionando
 * @return {string} Mensagem de teste
 */
function testEndpoint() {
  return 'Endpoint do Apps Script está funcionando!';
}

/**
 * Configuração inicial (executar uma vez para permissões)
 */
function setup() {
  // Esta função só serve para pedir autorizações necessárias
  // quando executada pela primeira vez
  const sheet = getOrCreateSheet();
  Logger.log('Planilha configurada: ' + sheet.getName());
}