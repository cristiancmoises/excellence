# Operação

## Primeiro acesso

Use `docker compose logs excellence` para ver o token inicial, ou o terminal do aplicativo local. O token só cria a primeira conta. Depois do setup, o endpoint retorna conflito para novas tentativas. Não envie o log contendo o token enquanto a instalação estiver sem administrador.

Contas usam scrypt com salt individual, sessões de até 12 horas, cookies HttpOnly/SameSite=Strict e tokens CSRF. Admin cria contas em Configurações; usuários só acessam seus próprios arquivos. Administrador pode excluir contas e arquivos, mas não recebe uma interface para ler arquivos de outros usuários. Não há MFA, recuperação de senha por email ou SSO nesta versão.

## Expor na web com HTTPS

Por padrão a porta publicada é 127.0.0.1:3210. Use um proxy reverso, por exemplo Nginx Proxy Manager, e um domínio sob seu controle. Crie `.env` copiando `.env.example` e defina:

```dotenv
EXCELLENCE_PUBLIC_URL=https://excellence.example.org
EXCELLENCE_SECURE_COOKIE=true
```

Recrie o serviço:

```sh
docker compose up -d --build
```

O proxy deve encaminhar o Host público original. O protocolo e a origem pública são definidos em EXCELLENCE_PUBLIC_URL; o aplicativo não confia em X-Forwarded-* para decisões de acesso. Não acrescente barra final ou caminho ao URL. Se proxy e Excellence estão em redes Docker diferentes, conecte-os à mesma rede com a configuração do seu ambiente e use excellence:3210 como upstream. O Compose entregue não altera redes de outros projetos.

Para acesso direto por outro computador, ajuste EXCELLENCE_BIND=0.0.0.0 e EXCELLENCE_ALLOWED_HOSTS com os hostnames/IPs usados; configure HTTPS antes de enviar senhas por rede não confiável. Cookies Secure exigem HTTPS no navegador.

## Dados

Servidor direto: `EXCELLENCE_DATA_DIR` ou diretório `data` do projeto.
Aplicativo GNU/Linux: `$XDG_DATA_HOME/excellence/data` ou `~/.local/share/excellence/data`.
Aplicativo Windows: `%LOCALAPPDATA%\Excellence\data`.
Docker: volume `excellence-data`, montado em `/data`.

O banco SQLite usa WAL. Não copie apenas o arquivo `.sqlite` enquanto estiver em escrita. Dados e backups não são criptografados pelo aplicativo; use os controles do sistema operacional para discos e cópias.

A recuperação local guarda um rascunho por conta no armazenamento do navegador; o acesso depende do perfil e origem do navegador. Ela pode falhar por espaço ou política do navegador. O servidor continua sendo o destino de salvamento, e fechar com alterações pendentes deve gerar aviso.

## Backup consistente

O helper usa a API SQLite online backup e executa `PRAGMA integrity_check` no resultado. Para servidor direto, com EXCELLENCE_DATA_DIR apontando para o diretório correto:

```sh
node scripts/backup.mjs
```

No Docker, crie a pasta de backups com permissão de escrita para o usuário UID 1000 do contêiner. Defina a variável de destino no comando:

```sh
docker compose exec -e EXCELLENCE_BACKUP_DIR=/backups excellence node scripts/backup.mjs
```

A saída é o caminho do arquivo criado. A pasta `backups` está ligada ao host. Para não depender de permissões desse bind mount, grave em `/data/backups` e copie o arquivo retornado com `docker compose cp`. Copie backups para outro dispositivo e ensaie a restauração. Backups incluem contas, hashes de senha, arquivos, histórico e atividades; proteja o acesso. Não há agendamento ou retenção automática de backups.

## Restaurar backup

1. Pare o servidor e preserve uma cópia do diretório atual.
2. Verifique a integridade do backup com SQLite antes de substituir.
3. Substitua `excellence.sqlite` no diretório de dados pelo backup. Somente com o processo parado, remova os antigos `excellence.sqlite-wal` e `excellence.sqlite-shm` para que não sejam reaplicados ao arquivo restaurado.
4. Preserve as permissões do usuário do serviço e reinicie.
5. Entre, abra arquivos e confirme valores, fórmulas e revisões. Troque a senha se precisar revogar sessões de um backup antigo.

## Atualizar

Faça backup. Extraia a nova versão em outro diretório e use o mesmo volume/diretório de dados; rode o instalador local ou `docker compose up -d --build`. Não execute duas versões sobre o mesmo banco para migrar. A versão atual usa esquema 1 e não implementa migração de versões futuras.

## Verificações operacionais

`GET /health` retorna app=excellence e status=ok. Monitore espaço em disco, backups, reinícios, latência e erros do proxy. O log de atividades na interface registra ações, não o conteúdo de células nem as chaves dos provedores. O Compose usa usuário sem privilégios, filesystem da imagem somente leitura, volume separado, capabilities removidas e healthcheck.

O build Docker e o script Windows requerem execução nos ambientes de destino antes de uma liberação de produção. Um CI preparado não é prova de que esses ambientes foram testados.
