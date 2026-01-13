# tdl-mcp

Servidor Model Context Protocol (MCP) que expõe as funcionalidades do CLI `tdl` (Telegram Downloader) para agentes de IA.

## Pré-requisitos

- Node.js >= 18
- `tdl` CLI instalado e no seu PATH.

## Instalação

```bash
npm install
npm run build
```

## Ferramentas Disponíveis

O servidor fornece ferramentas para gerenciar autenticação, chats, downloads, uploads e mais.

📄 **[Consulte a documentação completa das ferramentas em docs/TOOLS.md](docs/TOOLS.md)**

Resumo das capacidades:
*   **Sistema:** `tdl_exec`, `tdl_help`, `tdl_version`, `tdl_whoami`
*   **Auth:** `tdl_login` (Desktop/QR), `tdl_backup`
*   **Chat:** `tdl_chat_ls`, `tdl_chat_export`, `tdl_chat_users`
*   **Ações:** `tdl_download`, `tdl_upload`, `tdl_forward`
*   **Extensões:** `tdl_extension`

## Configuração no Cliente MCP

Adicione a seguinte configuração ao seu cliente MCP (Claude Desktop, Codex, etc):

- **Command**: `node /caminho/para/tdl-mcp/dist/index.js`
- **Env** (opcional): `TDL_BIN` se o binário `tdl` não estiver no PATH padrão.

## Desenvolvimento

```bash
# Desenvolvimento com hot-reload
npm run dev

# Build para produção
npm run build

# Iniciar servidor
npm start
```

## Roadmap

Funcionalidades planejadas ou pendentes de implementação:

- [ ] **Login Interativo (SMS):** Suporte para fluxo de autenticação via código SMS (atualmente suporta apenas Desktop Session e QR Code).
- [ ] **MCP Resources:** Implementar o endpoint `resources/list` e `resources/read` para permitir que o Agente leia o conteúdo dos arquivos baixados diretamente via protocolo, sem depender de acesso direto ao sistema de arquivos.
- [ ] **Parsing Estruturado:** Evoluir os wrappers para converter a saída de texto do `tdl` em objetos JSON nativos, facilitando o processamento pelo Agente.
- [ ] **Eventos/Watch:** Implementar sistema de notificações para monitorar novos chats ou mensagens em tempo real.

## Segurança

- Usa `spawn()` com `shell: false` (sem execução de shell) para prevenir injeção de comandos.
- Limites de tamanho: validação rigorosa de argumentos.
- Timeout configurável por execução (padrão seguro, máx: 3600s).
- Limite de resposta: truncamento automático de saídas gigantes para não estourar o contexto do LLM.