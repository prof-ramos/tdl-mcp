# Contexto do Projeto: tdl-mcp

## Visão Geral
`tdl-mcp` é um servidor **Model Context Protocol (MCP)** que faz a interface com a CLI do **`tdl` (Telegram Downloader)**. Ele permite que agentes de IA interajam com as funcionalidades do Telegram — como download de arquivos, gerenciamento de chats e upload de conteúdo — através de um protocolo padronizado.

## Stack Tecnológica
*   **Runtime:** Node.js (>= 18)
*   **Linguagem:** TypeScript (ES2022, Modo Estrito)
*   **Bibliotecas Principais:**
    *   `@modelcontextprotocol/sdk`: Para implementação do servidor MCP.
    *   `zod`: Para validação de esquema.
    *   `@smithery/cli` & `@smithery/sdk`: Para construção e execução do servidor MCP.

## Estrutura do Projeto
*   **`src/`**: Diretório do código-fonte.
    *   `src/server.ts`: O ponto de entrada principal para o servidor MCP.
*   **`dist/`**: Saída JavaScript compilada.
*   **`smithery.yaml`**: Configuração para a ferramenta de build Smithery.
*   **`AGENTS.md`**: Diretrizes para agentes de IA que trabalham neste repositório.

## Primeiros Passos

### Pré-requisitos
1.  **Node.js**: Versão 18 ou superior.
2.  **CLI `tdl`**: Deve estar instalado e acessível no `PATH` do sistema.

### Instalação e Build
```bash
# Instalar dependências
npm install

# Build do projeto (saída para dist/)
npm run build
```

### Executando o Servidor
```bash
# Executar o servidor compilado
npm start
# OU diretamente:
node dist/server.js
```

## Fluxo de Desenvolvimento

### Desenvolvimento com Hot-Reload
Para executar o servidor em modo de desenvolvimento com recarregamento automático (via Smithery):
```bash
npm run dev
```

### Diretrizes de Commit
*   Siga o estilo de commits convencionais (ex: `feat: setup tdl-mcp server`).
*   Inclua um resumo conciso e notas de teste nos Pull Requests.

## Ferramentas MCP Disponíveis

O servidor expõe as seguintes ferramentas para o agente de IA:

*   **`tdl_exec`**: Executor universal para qualquer comando `tdl`.
*   **`tdl_help`**: Recupera informações de ajuda para comandos `tdl`.
*   **`tdl_download`**: Faz o download de arquivos de URLs do Telegram.
*   **`tdl_forward`**: Encaminha mensagens/arquivos entre chats.
*   **`tdl_upload`**: Faz o upload de arquivos para o Telegram.
*   **`tdl_chat_ls`**: Lista os chats disponíveis.
*   **`tdl_chat_export`**: Exporta o histórico do chat para JSON.
*   **`tdl_chat_users`**: Exporta listas de usuários de canais/grupos.
*   **`tdl_whoami`**: Exibe informações sobre o usuário e conta autenticada.
*   **`tdl_version`**: Exibe a versão instalada da CLI `tdl`.
*   **`tdl_login`**: Realiza login no Telegram (modos desktop, QR code).
*   **`tdl_backup`**: Realiza backup dos dados do tdl para um diretório.
*   **`tdl_extension`**: Gerencia extensões do tdl (instalar, remover, listar).

## Convenções de Código
*   **Indentação:** 2 espaços.
*   **Estilo:** Padrão TypeScript (sem linter explícito configurado, manter consistência).
*   **Segurança:**
    *   Usa `spawn()` com `shell: false` para prevenir injeção de shell.
    *   Validação de entrada rigorosa via esquemas Zod.
    *   Timeouts configuráveis para todas as operações.