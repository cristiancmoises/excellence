# Modelos de linguagem

O Excellence usa quatro adaptadores HTTP: OpenAI-compatible Chat Completions, Anthropic Messages, Gemini generateContent e Ollama chat. Os protocolos são testados com servidores HTTP locais. Não foram feitas chamadas pagas/reais sem credenciais do operador.

Configure no ambiente do servidor, nunca no código do cliente. No Docker, variáveis de `.env` são interpoladas pelo Compose e encaminhadas ao contêiner. Reinicie após alterar.

## OpenAI ou compatível

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

## Ollama

```dotenv
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3:8b
```

127.0.0.1 dentro do Docker aponta para o próprio contêiner. Use o hostname do serviço Ollama na mesma rede ou um endereço do host acessível. No Docker Desktop, host.docker.internal costuma ser a opção; em GNU/Linux a configuração de host-gateway depende do ambiente. Não foi instalado nem baixado nenhum modelo nesta entrega.

Os nomes acima são exemplos configuráveis, não garantia de disponibilidade, acesso ou preço. Escolha um modelo disponível no seu provedor e que aceite o protocolo usado. O modelo e o serviço podem exigir licença própria, capacidade de hardware e/ou pagamento; isso é independente da licença MIT do Excellence.

## Vários serviços compatíveis ao mesmo tempo

EXCELLENCE_LLM_PROVIDERS aceita um array JSON de até 10 objetos. Exemplo sem chaves reais:

```json
[
  {"id":"local","label":"Modelo local","kind":"ollama","endpoint":"http://ollama:11434","model":"qwen3:8b"},
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

O payload contém a instrução, o intervalo e os valores das células selecionadas. Não envia a pasta de trabalho inteira ou o nome da conta. A resposta é tratada como dados; não executa comandos, Python, VBA, JavaScript ou ferramentas do modelo. Propostas fora da seleção e fórmulas de acesso externo são rejeitadas. IA não é executada em fórmulas de célula e não faz chamadas automáticas por recálculo.

Contas que usam o mesmo servidor compartilham os provedores e o saldo de chaves configurados pelo operador. Há limite de 10 pedidos por minuto por conta; não há orçamento monetário por usuário. O consumo e os custos devem ser controlados no provedor.

Referências dos protocolos: [OpenAI Chat Completions](https://platform.openai.com/docs/api-reference/chat), [Anthropic Messages](https://docs.anthropic.com/en/api/messages), [Gemini](https://ai.google.dev/api/generate-content), [Ollama](https://docs.ollama.com/api/chat). Documentação consultada durante a implementação; esses serviços podem mudar.
