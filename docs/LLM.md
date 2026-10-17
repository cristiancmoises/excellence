# Modelos de linguagem

## Resultado observado no servidor

Em 17 de outubro de 2026, o perfil selecionado Qwen3.5 2B acertou três pedidos
sintéticos no CT sem GPU: soma no destino solicitado (16,4 s), fórmula IF em
outro destino (17,6 s) e explicação em português sem propor alterações (14,9 s).
O modelo já estava carregado. Três exemplos não demonstram correção geral nem
garantem latência; carga concorrente e inicialização a frio podem demorar mais.
Configurações anteriores tiveram respostas incorretas ou timeout e não foram
aceitas como perfil final. A demonstração mantém seu limite de 30 segundos.

O assistente pode usar **Qwen3.5 2B local**, sem chave de API nem cobrança por tokens, por meio do Ollama. O modelo é uma opção compacta para explicar dados e propor fórmulas simples; revise os resultados. Computação e hospedagem ainda consomem recursos do servidor. Os adaptadores opcionais OpenAI-compatible Chat Completions, Anthropic Messages e Gemini generateContent continuam disponíveis quando configurados pelo operador.

Configure no ambiente do servidor, nunca no código do cliente. No Docker, variáveis de `.env` são interpoladas pelo Compose e encaminhadas ao contêiner. Reinicie após alterar.

## Modelo local: Qwen3.5 2B

```dotenv
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=qwen3.5:2b-q4_K_M
OLLAMA_NUM_THREAD=2
```

Instale previamente o modelo no serviço Ollama com `ollama pull qwen3.5:2b-q4_K_M`. O aplicativo não baixa modelos nem envia pedidos automaticamente. O artefato oficial usa quantização Q4_K_M, tem aproximadamente 1,9 GB e licença Apache 2.0; o uso de RAM inclui contexto e runtime além dos pesos. Consulte o [modelo oficial](https://ollama.com/library/qwen3.5:2b-q4_K_M). A tag pode mudar: registre o digest instalado ao operar uma implantação reproduzível.

Mantenha o Ollama na rede privada do servidor, sem publicar a porta 11434 na Internet. O navegador acessa apenas o servidor Excellence autenticado. `127.0.0.1` dentro do Docker aponta para o próprio contêiner; `ollama` é o hostname do serviço na mesma rede Docker. Ajuste o endereço à sua instalação.

O perfil local usa contexto de 4.096 tokens, resposta de até 768 tokens, temperatura zero e `think: false` para Qwen3/Qwen3.5. O JSON enviado ao modelo — pedido, intervalo e células — tem teto de 2.000 bytes UTF-8, menor que o limite geral de 500 células. Textos longos precisam de seleções menores. A entrada excessiva é recusada antes do envio; não há corte silencioso de células. Respostas truncadas ou fora do esquema também são recusadas. O tempo limite local é de 90 segundos, incluindo carregamento e resposta; não é uma promessa de latência. O modelo não recebe ferramentas ou imagens.

Se houver indisponibilidade, confira o serviço Ollama e a rede interna. Para erro de modelo não encontrado, confira `ollama list` e o nome configurado. Para limite de contexto ou resposta, reduza a seleção ou peça menos alterações. Falhas não acionam um provedor pago alternativo nem repetem o pedido automaticamente.

`OLLAMA_NUM_THREAD` controla o número de threads de CPU por pedido: o padrão é dois, com valores inteiros aceitos de um a quatro. Ajuste conforme a cota real de CPU do contêiner e meça pedidos representativos; mais threads não garantem menor latência. Uma entrada Ollama em `EXCELLENCE_LLM_PROVIDERS` pode sobrescrever esse valor com `numThread`.

O perfil JSON desativa explicitamente penalidades de presença, frequência e repetição (`presence_penalty: 0`, `frequency_penalty: 0`, `repeat_penalty: 1`), evitando herdar configurações que desencorajem repetir referências de células. As instruções incluem exemplos separados de fórmulas e explicação, mas exemplos e JSON estruturado não garantem uma resposta correta.

## OpenAI ou compatível (opcional)

```dotenv
OPENAI_API_KEY=sua-chave
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4.1-mini
```

Para vLLM, llama.cpp ou LM Studio com endpoint compatível, use a URL base do seu servidor (inclua `/v1` quando necessário) e o identificador de modelo correspondente. Uma chave vazia é aceita quando o serviço local não exige autenticação.

## Anthropic

```dotenv
ANTHROPIC_API_KEY=sua-chave
ANTHROPIC_MODEL=claude-sonnet-4-5
```

## Gemini

```dotenv
GEMINI_API_KEY=sua-chave
GEMINI_MODEL=gemini-2.5-flash
```

Os provedores externos acima são opcionais e podem cobrar pelo uso. Os nomes são exemplos configuráveis, não garantia de disponibilidade, acesso ou preço. Escolha um modelo disponível no provedor e que aceite o protocolo usado. A licença de cada modelo e serviço é independente da licença MIT do Excellence.

## Vários serviços compatíveis ao mesmo tempo

EXCELLENCE_LLM_PROVIDERS aceita um array JSON de até 10 objetos. Exemplo sem chaves reais:

```json
[
  {"id":"local","label":"Qwen3.5 2B · local","kind":"ollama","endpoint":"http://ollama:11434","model":"qwen3.5:2b-q4_K_M"},
  {"id":"remote","label":"Servidor compatível","kind":"openai","endpoint":"https://llm.example.org/v1","model":"modelo-disponivel","apiKey":"configure-no-ambiente"}
]
```

Quando essa variável é definida, ela substitui a descoberta pelas variáveis individuais. Ela pode conter segredos; não a publique nem a envie no chat. Endpoints são definidos pelo operador, não por requisições de usuários. Nenhuma chave ou URL de endpoint é retornada ao cliente.

## Uso e privacidade

1. Abra Assistente IA e escolha o modelo.
2. Defina um intervalo de até 500 células e revise o conteúdo que será enviado.
3. Escreva uma instrução e pressione Enviar seleção ao modelo.
4. Leia a explicação e cada alteração proposta.
5. Aplique a proposta revisada, ou descarte. Se os dados mudaram depois do pedido, solicite uma proposta nova.

O payload contém a instrução, o intervalo e os valores das células selecionadas. Não envia a pasta de trabalho inteira ou o nome da conta. O servidor verifica coordenadas, duplicatas e valores escalares, descartando campos extras antes da chamada. Com Ollama privado, essa seleção fica na infraestrutura do operador; um provedor externo configurado recebe a seleção quando escolhido.

A resposta é tratada como dados; não executa comandos, Python, VBA, JavaScript ou ferramentas do modelo. Propostas fora da seleção e fórmulas de acesso externo são rejeitadas. Funções sugeridas precisam estar na lista permitida do servidor, incluindo SUM, AVERAGE, IF, COUNTIF, SUMIF e funções comuns de texto, datas e busca. Isso limita capacidade, mas não comprova que o cálculo sugerido está correto. IA não é executada em fórmulas de célula e não faz chamadas automáticas por recálculo. A API privada exige sessão autenticada e proteção CSRF; a demonstração tem uma rota separada, limitada conforme abaixo.

A validação também normaliza endereços, recusa destinos duplicados, aspas ou parênteses desbalanceados e referências diretas à própria célula na mesma aba, inclusive dentro de intervalos. São verificações limitadas, não um analisador completo de fórmulas ou detector de ciclos: referências indiretas e ciclos entre abas não estão cobertos. Revise sempre o destino e o cálculo antes de aplicar.

## Assistente da demonstração pública

O operador pode habilitar `EXCELLENCE_DEMO_AI=true` no ambiente do servidor, junto de um provedor Ollama. O padrão é desativado. Sem essa opção ou sem Ollama configurado, a demonstração retorna indisponibilidade; não usa provedores pagos alternativos. O navegador só faz uma chamada após o visitante enviar explicitamente o pedido.

`POST /api/demo/ai/assist` aceita somente `{prompt, selection, cells}`. A resposta preserva `{message, proposal}`; a proposta continua sujeita a revisão e aplicação manual na planilha temporária. A rota não lê sessão, conta, arquivos ou pastas de trabalho privadas.

- Até 3 consultas por origem de conexão em uma janela móvel de 30 minutos, e 20 consultas globais de demonstração em uma hora.
- Até 300 caracteres de instrução, 20 células e 1.500 bytes UTF-8 do JSON completo. O leitor HTTP interrompe corpos acima de 2.048 bytes.
- Até 256 tokens de saída, 5 alterações propostas e 30 segundos de espera.
- Uma única consulta em andamento, compartilhada pelas APIs pública e privada. Pedidos concorrentes recebem 503, sem entrar em fila.

O SQLite persistente mantém os contadores e a reserva de inferência. Falhas do modelo também consomem cota; pedidos inválidos e recusados por ocupação não a consomem. Reiniciar o servidor ou trocar cookies não reinicia os limites. Quando o cliente desconecta, o servidor cancela o transporte ao modelo. Timeout, erro de rede ou resposta interrompida deixam a reserva ativa até completar 100 segundos desde o início da consulta, pois cancelar HTTP não comprova que o provedor parou de processar. A mesma expiração recupera reservas deixadas por um processo interrompido. A cota global mantém no máximo 20 registros ativos, sem armazenar prompts, células ou respostas nessa tabela.

Mantenha também `OLLAMA_NUM_PARALLEL=1` e uma fila pequena no serviço Ollama. A reserva limita requisições da aplicação; a configuração do provedor contém trabalho que eventualmente continue depois de uma desconexão ou além da expiração da reserva.

O limite por conexão usa apenas o endereço do socket, armazenado como hash; `X-Forwarded-For`, `X-Real-IP` e cookies não escolhem a identidade do limite. **Atrás de um proxy, os visitantes compartilham a cota do proxy: até 3 consultas por 30 minutos.** Não há configuração implícita de confiança nesses cabeçalhos. Separar visitantes no futuro exige validar o proxy imediato, sobrescrever um cabeçalho de IP no proxy e impedir acesso direto ao backend. Configure `EXCELLENCE_PUBLIC_URL` com a origem pública: pedidos sem o `Origin` exato ou marcados como cross-site são recusados. Origin sozinho não impede clientes automatizados; as cotas e os limites de trabalho também são aplicados no servidor.

Respostas 429 indicam cota esgotada; 503 indica serviço desativado, ausente ou ocupado; quando aplicável, `Retry-After` informa a espera em segundos. Erros do modelo retornam 502. Não há repetição automática. Essa proteção limita o custo computacional da demonstração; o proxy ainda deve limitar conexões e tráfego HTTP geral.

Contas que usam o mesmo servidor compartilham os provedores e o saldo de chaves configurados pelo operador. Há limite de 10 pedidos por minuto por conta; não há orçamento monetário por usuário. O consumo e os custos devem ser controlados no provedor.

Os testes de adaptadores usam servidores HTTP locais e cobrem esquema, limites, privacidade, erros e propostas recusadas. Eles não medem a qualidade nem a velocidade do modelo real; valide tarefas representativas e tempos na implantação.

Referências dos protocolos: [OpenAI Chat Completions](https://platform.openai.com/docs/api-reference/chat), [Anthropic Messages](https://docs.anthropic.com/en/api/messages), [Gemini](https://ai.google.dev/api/generate-content), [Ollama chat](https://docs.ollama.com/api/chat), [JSON estruturado](https://docs.ollama.com/capabilities/structured-outputs) e [controle de raciocínio](https://docs.ollama.com/capabilities/thinking). Documentação consultada durante a implementação; esses serviços podem mudar.
