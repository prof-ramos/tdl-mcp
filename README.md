# tdl-mcp

Servidor Model Context Protocol (MCP) que expõe as funcionalidades do CLI `tdl` (Telegram
Downloader) para agentes de IA.

## Pré-requisitos

- Node.js >= 18
- `tdl` CLI instalado e no seu PATH.

## Instalação

```bash
npm install
npm run build
```

## Ferramentas Disponíveis

- `tdl_exec`: Executor universal (argv).
- `tdl_help`: Ajuda e descoberta de comandos.
- `tdl_download`: Download de arquivos via URL.
- `tdl_chat_ls`: Listar chats.
- `tdl_chat_export`: Exportar histórico de chat.
- `tdl_chat_users`: Exportar usuários de canais/grupos.
- `tdl_upload`: Upload de arquivos para o Telegram.

## Configuração no Codex/MCP Client

Adicione a seguinte configuração ao seu cliente MCP:

- **Command**: `node /caminho/para/tdl-mcp/dist/server.js`
- **Env**: (Opcional) `TDL_BIN` se o binário não estiver no PATH padrão.

## Desenvolvimento

```bash
npm run dev
```
