// Application-owned API and workbook validation messages. User content is never translated.
const english = {
  'Usuário: 3 a 48 letras, números, ponto, hífen ou sublinhado.': 'Username: use 3–48 letters, numbers, dots, hyphens or underscores.',
  'Use uma senha de 12 a 256 caracteres.': 'Use a password with 12–256 characters.',
  'Muitas tentativas. Aguarde um minuto.': 'Too many attempts. Wait one minute.',
  'Título obrigatório, até 120 caracteres.': 'A title is required, up to 120 characters.',
  'A pasta de trabalho excede 8 MB.': 'The workbook exceeds 8 MB.',
  'Use application/json.': 'Use application/json.',
  'Corpo muito grande.': 'The request body is too large.',
  'JSON inválido.': 'Invalid JSON.',
  'Host obrigatório.': 'The Host header is required.',
  'Host inválido.': 'Invalid Host header.',
  'Host não autorizado. Configure EXCELLENCE_PUBLIC_URL no servidor.': 'Host not allowed. Configure EXCELLENCE_PUBLIC_URL on the server.',
  'Origem não autorizada.': 'Origin not allowed.',
  'Requisição entre sites bloqueada.': 'Cross-site request blocked.',
  'O assistente da demonstração está indisponível.': 'The demo assistant is unavailable.',
  'Não foi possível obter uma proposta válida do modelo local.': 'The local model could not return a valid proposal.',
  'Instalação já configurada.': 'This installation is already configured.',
  'Token de instalação inválido.': 'Invalid setup token.',
  'Usuário ou senha incorretos.': 'Incorrect username or password.',
  'Entre para continuar.': 'Sign in to continue.',
  'Token CSRF inválido. Atualize a página.': 'Invalid CSRF token. Refresh the page.',
  'Senha atual incorreta.': 'Incorrect current password.',
  'Acesso de administrador necessário.': 'Administrator access is required.',
  'Usuário já existe.': 'This username already exists.',
  'Limite de 100 usuários.': 'The limit of 100 users has been reached.',
  'Não é possível remover sua própria conta.': 'You cannot remove your own account.',
  'Arquivo não encontrado.': 'File not found.',
  'Arquivo alterado em outra sessão. Reabra ou salve uma cópia.': 'This file changed in another session. Reopen it or save a copy.',
  'Versão não encontrada.': 'Version not found.',
  'Cota de armazenamento atingida.': 'Storage quota reached.',
  'Cota de 100 arquivos ou 50 MB por usuário atingida.': 'The per-user quota of 100 files or 50 MB has been reached.',
  'Arquivo alterado por outra sessão.': 'This file changed in another session.',
  'Provedor não configurado.': 'Provider not configured.',
  'Não foi possível obter uma proposta válida do provedor.': 'The provider could not return a valid proposal.',
  'Endpoint não encontrado.': 'Endpoint not found.',
  'Método não permitido.': 'Method not allowed.',
  'Execute npm run build antes de iniciar.': 'Run npm run build before starting.',
  'Falha ao salvar dados.': 'Could not save data.',
  'Requisição inválida.': 'Invalid request.',
  'O assistente está ocupado. Aguarde a consulta atual terminar.': 'The assistant is busy. Wait for the current request to finish.',
  'O limite global da demonstração foi atingido (20 consultas por hora).': 'The global demo limit has been reached (20 requests per hour).',
  'Limite da demonstração compartilhada: 3 consultas a cada 30 minutos.': 'Shared demo limit: 3 requests every 30 minutes.',
  'Descreva a tarefa em até 8.000 caracteres.': 'Describe the task in up to 8,000 characters.',
  'Selecione até 500 células para a IA.': 'Select up to 500 cells for the assistant.',
  'Seleção excede o limite da IA.': 'The selection exceeds the assistant limit.',
  'Célula inválida na seleção.': 'Invalid cell in the selection.',
  'Células fora da seleção ou repetidas.': 'Cells are outside the selection or repeated.',
  'Valor inválido na seleção.': 'Invalid value in the selection.',
  'Envie apenas o pedido, intervalo e células da demonstração.': 'Send only the demo task, range and cells.',
  'A demonstração aceita pedidos de até 300 caracteres.': 'The demo accepts tasks up to 300 characters.',
  'Selecione até 20 células na demonstração.': 'Select up to 20 cells in the demo.',
  'Reduza a seleção e o pedido da demonstração (limite de 1.500 bytes).': 'Reduce the demo selection and task (1,500-byte limit).',
  'A demonstração exige um modelo local.': 'The demo requires a local model.',
  'Consulta cancelada. Aguarde o servidor liberar o assistente.': 'Request cancelled. Wait for the server to release the assistant.',
  'Ollama local indisponível. Peça ao administrador para verificar o serviço e a conexão interna.': 'Local Ollama is unavailable. Ask the administrator to check the service and internal connection.',
  'Provedor indisponível. Confira a conexão do servidor.': 'The provider is unavailable. Check the server connection.',
  'O modelo local não foi encontrado. Peça ao administrador para conferir o modelo instalado no Ollama.': 'The local model was not found. Ask the administrator to check the model installed in Ollama.',
  'Resposta do provedor excede o limite.': 'The provider response exceeds the limit.',
  'A resposta do modelo foi interrompida. Reduza a seleção e tente novamente.': 'The model response was interrupted. Reduce the selection and try again.',
  'A seleção excede o contexto local; reduza o intervalo ou o texto do pedido (até 2.000 bytes juntos).': 'The selection exceeds the local context. Reduce the range or task text (up to 2,000 bytes combined).',
  'O provedor não retornou JSON válido. Tente novamente com um pedido menor.': 'The provider did not return valid JSON. Try a smaller task.',
  'O provedor não retornou o formato esperado.': 'The provider did not return the expected format.',
  'O modelo atingiu o limite de resposta. Peça menos alterações por vez.': 'The model reached its response limit. Request fewer changes at a time.',
  'Provedor não retornou texto.': 'The provider did not return text.',
  'O modelo não retornou JSON válido. Tente novamente com um pedido menor.': 'The model did not return valid JSON. Try a smaller task.',
  'O modelo não retornou o formato esperado.': 'The model did not return the expected format.',
  'A demonstração aceita no máximo 5 alterações por resposta.': 'The demo accepts up to 5 changes per response.',
  'A proposta usa uma função não permitida. Peça uma fórmula com funções comuns da planilha.': 'The proposal uses a function that is not allowed. Request a formula with common spreadsheet functions.',
  'Intervalo inválido. Use A1:B10.': 'Invalid range. Use A1:B10.',
  'Intervalo fora do limite (10.000 linhas, 256 colunas).': 'Range outside the limits (10,000 rows, 256 columns).',
  'Número de abas inválido (1–30).': 'Invalid number of sheets (1–30).',
  'Aba inválida.': 'Invalid sheet.',
  'Nome ou identificador de aba inválido ou repetido.': 'Invalid or duplicate sheet name or identifier.',
  'Planilha muito grande.': 'The spreadsheet is too large.',
  'Muitas colunas.': 'Too many columns.',
  'Células inválidas.': 'Invalid cells.',
  'Coordenada de célula inválida ou repetida.': 'Invalid or duplicate cell coordinate.',
  'Limite de 100.000 células preenchidas.': 'The limit of 100,000 populated cells has been reached.',
  'Fórmula inválida.': 'Invalid formula.',
  'Valor de célula inválido.': 'Invalid cell value.',
  'Texto de célula muito longo.': 'The cell text is too long.',
  'Mesclagem fora dos limites.': 'Merged cells are outside the limits.',
  'Dimensão de linha ou coluna inválida.': 'Invalid row or column dimension.',
  'Intervalo muito grande.': 'The range is too large.',
  'Agregação inválida.': 'Invalid aggregation.',
  'Fórmula incompleta: confira parênteses e aspas.': 'Incomplete formula: check parentheses and quotes.',
  'A fórmula proposta referencia a própria célula. Escolha outro destino.': 'The proposed formula references its own cell. Choose another destination.',
  'A IA pode sugerir até 100 células.': 'The assistant can propose up to 100 cells.',
  'Célula inválida na proposta.': 'Invalid cell in the proposal.',
  'Proposta altera células fora da seleção ou repetidas.': 'The proposal changes cells outside the selection or repeats cells.',
  'Valor inválido na proposta.': 'Invalid value in the proposal.',
  'Fórmulas externas não são aceitas em propostas de IA.': 'External formulas are not allowed in assistant proposals.',
  'Metadados inválidos.': 'Invalid metadata.',
  'Metadados de gráficos inválidos.': 'Invalid chart metadata.',
  'Configuração de gráfico inválida.': 'Invalid chart configuration.',
  'Intervalo de gráfico inválido.': 'Invalid chart range.',
};

export function requestLanguage(header = '') {
  const choices = String(header).split(',').map((entry, order) => {
    const [tag, ...parameters] = entry.trim().toLowerCase().split(';');
    const quality = parameters.find(value => value.trim().startsWith('q='));
    return { tag, order, quality: quality ? Number(quality.trim().slice(2)) : 1 };
  }).filter(({ quality }) => Number.isFinite(quality) && quality > 0 && quality <= 1)
    .sort((a, b) => b.quality - a.quality || a.order - b.order);
  for (const { tag } of choices) {
    if (tag === 'pt' || tag === 'pt-br') return 'pt-BR';
    if (tag === 'en' || tag.startsWith('en-')) return 'en';
  }
  return 'en';
}

export function translateError(message, language = 'en') {
  if (language === 'pt-BR') return message;
  if (Object.hasOwn(english, message)) return english[message];
  const timeout = /^O modelo excedeu (\d+) segundos\. Reduza a seleção ou tente novamente quando o servidor estiver livre\.$/.exec(message);
  if (timeout) return `The model exceeded ${timeout[1]} seconds. Reduce the selection or try again when the server is free.`;
  const ollama = /^Ollama respondeu HTTP (\d+)\. Confira o serviço local e a memória disponível\.$/.exec(message);
  if (ollama) return `Ollama returned HTTP ${ollama[1]}. Check the local service and available memory.`;
  const provider = /^Provedor respondeu HTTP (\d+)\. Confira credenciais, modelo e saldo no servidor\.$/.exec(message);
  if (provider) return `The provider returned HTTP ${provider[1]}. Check credentials, model and balance on the server.`;
  return message;
}
