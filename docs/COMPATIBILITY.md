# Compatibilidade — 0.1.0-rc.1

Esta versão é uma suíte de planilhas funcional com escopo delimitado. Não existe certificação de equivalência com Microsoft Excel, nem cobertura completa dos formatos Office.

| Recurso | Editor / formato nativo | XLSX |
|---|---|---|
| Valores numéricos, texto, booleanos | Sim | Importa / exporta |
| Texto rico e múltiplas linhas | Sim | Conteúdo e estilos básicos preservados |
| Fórmulas do motor FortuneSheet | Sim, com nomes em inglês | Fórmula e resultado em cache; Excel pode recalcular |
| Abas, nomes e referências entre abas | Sim | Nomes e fórmulas preservados |
| Formato numérico, fonte, cor e preenchimento | Sim | Conversão básica |
| Alinhamento, quebra de texto e dimensões | Sim | Conversão básica |
| Células mescladas | Sim | Importa / exporta |
| Bordas | Sim | Conversão não implementada |
| Comentários | Sim | Notas simples suportadas; não são comentários encadeados |
| Filtros, validações e formatação condicional | Recursos do motor | Regras não preservadas na conversão |
| Gráficos Excellence | Colunas, linhas e rosca, até 20 | Não exportados para XLSX |
| Resumos por grupo | Nova aba agregada e estática | Valores da aba exportados |
| Tabelas dinâmicas Excel | Não | Não preservadas |
| VBA, macros, ActiveX, suplementos | Não | Não executados nem preservados |
| Power Query, Power Pivot, DAX, conexões externas | Não | Não preservados |
| Arquivos XLS antigos, XLSB, XLSM, ODS, criptografados | Não | Somente XLSX não criptografado |
| Gráficos / imagens importados | Não | Não preservados |
| Coedição em tempo real / compartilhamento | Não | Contas isoladas; conflitos entre sessões tratados |
| Impressão paginada / PDF nativo | Não | Exporte e use aplicativo compatível para paginação |
| Todas as funções e matrizes dinâmicas Excel | Não garantido | Funções fora da cobertura podem resultar em erros |
| Menus totalmente em português | Shell em PT-BR; grade parcialmente em inglês | Não aplicável |

## Limites explícitos

- 30 abas; 10.000 linhas e 256 colunas por aba.
- Até 100.000 células preenchidas por arquivo, somadas entre abas.
- Documento persistido: até 8 MiB de JSON UTF-8. Importação: até 10 MiB; XLSX declarações ZIP de até 64 MiB descompactados.
- 100 arquivos ou 50 MiB de documentos atuais por conta, até 100 contas por instalação.
- Até 20 revisões por documento. O histórico usa armazenamento adicional: no pior caso, aproximadamente 1 GiB por conta além dos documentos atuais, antes de overhead do SQLite e backups. Provisione e monitore o disco.
- IA: até 500 células enviadas, 100 alterações propostas, instrução de até 8.000 caracteres, prazo de 45 segundos.
- CSV exporta resultados de fórmulas. Textos começando com caracteres interpretáveis como fórmulas recebem apóstrofo. CSV não preserva estilos, gráficos ou múltiplas abas.

Nomes de funções são em inglês. Os testes de navegador cobrem SUM, AVERAGE, COUNT, IF, SUMIF, VLOOKUP, IFERROR, ROUND, aritmética e referências entre abas; isso não é certificação de todas as funções do motor.

O limite de células é uma proteção, não um benchmark de performance validado. A grade pode consumir bastante RAM com regiões grandes. Não foi certificado o desempenho no limite máximo, em dispositivos móveis ou com fórmulas profundamente encadeadas.

Arquivos importantes devem manter seu original. A conversão pode perder recursos não modelados mesmo quando o arquivo abre sem erro. Recursos não implementados são lacunas da versão, não itens entregues como concluídos.
