# Documentação de Ferramentas (Tools)

Este documento descreve todas as ferramentas disponíveis no servidor MCP do `tdl`.

## Ferramentas Gerais

### `tdl_exec`
Executor universal que permite executar qualquer comando do tdl. Use como fallback para funcionalidades não mapeadas.

**Parâmetros:**
- `argv` (obrigatório): Array de argumentos para executar.
- `namespace`: Namespace do Telegram (padrão: "default").
- `cwd`: Diretório de trabalho.
- `timeoutSec`: Timeout em segundos (padrão: 300, máx: 3600).
- `response_format`: Formato de resposta (`markdown` ou `json`).

**Exemplo:**
```json
{ "argv": ["chat", "ls", "--limit", "1"] }
```

### `tdl_help`
Exibe ajuda sobre comandos do tdl.

**Parâmetros:**
- `namespace`: Namespace do Telegram.
- `command`: Comando específico para obter ajuda (ex: `dl`, `forward`, `chat`).
- `response_format`: Formato de resposta.

### `tdl_version`
Exibe a versão instalada da CLI `tdl` e do servidor.

**Parâmetros:**
- `response_format`: Formato de resposta.

### `tdl_whoami`
Exibe informações detalhadas sobre o usuário autenticado e a sessão atual.

**Parâmetros:**
- `namespace`: Namespace do Telegram.
- `verbose`: Se `true`, exibe detalhes extras de configuração e app.
- `response_format`: Formato de resposta.

---

## Autenticação e Sistema

### `tdl_login`
Realiza o login no Telegram.
*Nota: Login via código SMS (interativo) não é suportado via MCP devido à natureza assíncrona. Use `desktop` ou `qr`.*

**Parâmetros:**
- `type`: Modo de login (padrão: `desktop`).
  - `desktop`: Rouba a sessão do Telegram Desktop oficial local.
  - `qr`: Gera um QR Code (texto) para ser escaneado pelo app móvel.
- `desktopPath`: Caminho manual para a pasta do Telegram Desktop (se não detectado automaticamente).
- `passcode`: Senha local (passcode) do Telegram Desktop, se houver.
- `namespace`: Namespace do Telegram.
- `timeoutSec`: Timeout (padrão: 60s).

### `tdl_backup`
Realiza backup dos dados da sessão do `tdl` para um diretório seguro.

**Parâmetros:**
- `target` (obrigatório): Caminho do diretório de destino para o backup.
- `namespace`: Namespace do Telegram.

### `tdl_extension`
Gerencia extensões do `tdl` (instalação e remoção).

**Parâmetros:**
- `command`: Ação a realizar (`install`, `remove`, `list`, `upgrade`).
- `args`: Argumentos para a ação (ex: URL do repositório ou nome da extensão).
- `timeoutSec`: Timeout (padrão: 300s).

---

## Chat e Mensagens

### `tdl_chat_ls`
Lista todos os chats disponíveis na conta.

**Parâmetros:**
- `namespace`: Namespace do Telegram.
- `response_format`: Formato de resposta.

### `tdl_chat_export`
Exporta histórico de mensagens de um chat para JSON. Essencial para análise de conteúdo antes de downloads.

**Parâmetros:**
- `chat`: Chat ID ou domínio (padrão: Saved Messages).
- `output`: Arquivo JSON de saída (padrão: `tdl-export.json`).
- `type`: Tipo de exportação (`time`, `id`, `last`).
- `limit`: Quantidade de mensagens.
- `filter`: Filtro de expressão.
- `input`: Array de IDs de entrada (se type for `id`).
- `reply`: ID do post para resposta.
- `topic`: ID do tópico.
- `all`: Exportar todas as mensagens (atenção ao tempo de execução).
- `raw`: Exportar estrutura raw da API.
- `withContent`: Exportar com conteúdo da mensagem.

### `tdl_chat_users`
Exporta lista de usuários de canais ou supergrupos.

**Parâmetros:**
- `chat` (obrigatório): Domain ID do canal/supergrupo.
- `output`: Arquivo JSON de saída (padrão: `tdl-users.json`).
- `raw`: Exportar estrutura raw da API.

---

## Operações de Arquivo (Download/Upload/Forward)

### `tdl_download`
Download de arquivos via URL do Telegram ou Chat.

**Parâmetros:**
- `url`: Array de URLs de mensagens/arquivos para download.
- `dir`: Diretório de destino local.
- `threads`: Número de threads de download.
- `namespace`: Namespace do Telegram.
- `timeoutSec`: Timeout (padrão: 600s).

### `tdl_upload`
Upload de arquivos locais para o Telegram.

**Parâmetros:**
- `path` (obrigatório): Array de caminhos locais (arquivos ou diretórios).
- `chat`: Chat ID ou domínio de destino (padrão: Saved Messages).
- `to`: Destino via expressão de roteamento.
- `topic`: ID do tópico.
- `caption`: Legenda para o arquivo.
- `photo`: Enviar como foto comprimida (em vez de arquivo).
- `remove`: Deletar arquivo local após upload com sucesso.

### `tdl_forward`
Encaminha mensagens e arquivos entre chats dentro do Telegram.

**Parâmetros:**
- `from` (obrigatório): Array de links ou caminho para arquivos JSON exportados.
- `to` (obrigatório): Destino (Chat ID ou expressão).
- `mode`: Modo (`direct` mantém remetente, `clone` copia conteúdo).
- `edit`: Expressão para editar a mensagem/legenda no destino.
- `dryRun`: Simular a operação sem enviar.
