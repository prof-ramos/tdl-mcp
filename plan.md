# Planejamento completo: servidor MCP para `tdl` (Telegram Downloader)

## 1) Objetivo
Criar um servidor MCP (Model Context Protocol) que exponha as funcionalidades do CLI `tdl` como ferramentas para agentes (Codex CLI e outros clientes MCP), com:
- **Cobertura total** via um tool universal (`tdl_exec`).
- **Usabilidade alta** via tools tipados (wrappers) para casos comuns.
- **Segurança e previsibilidade** (timeouts, allowlist opcional, limites de path, sem `shell=true`).
- **Operação via STDIO** (padrão para Codex CLI) e opção futura de HTTP.
- **Compatibilidade MCP** com boas práticas (naming, annotations, truncation).

## 2) Escopo
### 2.1 Ferramentas MCP (mínimo viável)
1) **`tdl_exec`**: executor universal que recebe `argv` e (opcionalmente) `namespace`.
2) **`tdl_help`**: `tdl --help` e `tdl <cmd> --help` para descoberta de flags/ajuda.

### 2.2 Ferramentas MCP (wrappers recomendados)
- **`tdl_download`** (mapeia `tdl dl`)
- **`tdl_forward`** (mapeia `tdl forward`)
- **`tdl_upload`** (mapeia `tdl up`)
- **`tdl_chat_ls`** (mapeia `tdl chat ls`)
- **`tdl_chat_export`** (mapeia `tdl chat export`)
- **`tdl_chat_users`** (mapeia `tdl chat users`)

> Estratégia: os wrappers melhoram a qualidade da chamada (menos erro de flags). O `tdl_exec` garante cobertura de 100% e funciona como fallback.

### 2.3 Fora de escopo (por enquanto)
- UI, dashboards, persistência.
- Integração com storage cloud.
- “Autenticação” de Telegram além do que o `tdl` já faz.
- HTTP server (pode entrar como fase 2).

## 3) Requisitos técnicos
### 3.1 Linguagem e dependências
- TypeScript (Node 18+)
- `@modelcontextprotocol/sdk`
- `zod`
- `tsx` (dev) e `typescript` (build)

### 3.2 Execução do `tdl`
- Usar `spawn()` com `shell: false`.
- Binário configurável por env: `TDL_BIN` (default: `tdl`).
- Timeout por execução (default 300s; configurável por tool).
- Capturar `stdout`, `stderr`, `exit_code` e devolver como texto.

### 3.3 Segurança/guardrails (implementação recomendada)
Implementar já no MVP:
- **Sem shell**.
- **Limites de tamanho**: `argv` máx. 200 itens, cada item máx. 2048 chars.
- **Timeout** hard max 3600s.
- **Limite de resposta**: `CHARACTER_LIMIT = 25000` com truncamento e instrução de como reduzir a saída.

Implementar como toggle (feature flag):
- **Allowlist de subcomandos** (ex.: `dl`, `forward`, `up`, `chat`, `help`).
- **Restrição de diretórios** para escrita/leitura (quando `cwd` ou paths forem usados).

## 4) Arquitetura
### 4.1 Estrutura do repositório
```
repo/
  package.json
  tsconfig.json
  src/
    index.ts
  README.md
```

### 4.2 Design do servidor MCP
- Criar `McpServer({ name: "tdl-mcp-server", version })`.
- Registrar tools com schemas Zod.
- Conectar com `StdioServerTransport()`.

### 4.3 Contratos dos tools
#### `tdl_exec`
Input:
- `namespace?` (string)
- `argv` (string[])
- `cwd?` (string)
- `timeoutSec?` (number)
- `response_format?` ("markdown" | "json")
Output:
- Markdown: `exit_code` + seções `[stdout]` e `[stderr]`.
- JSON: `{ exit_code, stdout, stderr, timed_out, duration_ms }`.

#### `tdl_help`
Input:
- `namespace?`
- `command?` (ex.: `dl`, `forward`, `chat`)
- `response_format?` ("markdown" | "json")
Output:
- Markdown: help formatado.
- JSON: `{ exit_code, stdout, stderr }`.

Wrappers:
- Cada wrapper traduz inputs para flags do `tdl`.
- Sempre expor `namespace?` e `timeoutSec?`.
- Todos os schemas com `.strict()` e mensagens de erro claras.
- Incluir `response_format?` quando o output puder ser grande.

### 4.4 Annotations MCP
Definir annotations em todos os tools:
- `tdl_exec`: `readOnlyHint: false`, `destructiveHint: false`, `idempotentHint: false`, `openWorldHint: true`.
- `tdl_help`: `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true`.
- Wrappers: ajustar `readOnlyHint` conforme efeito (download/upload/forward alteram estado).

### 4.5 Tratamento de erros
- Retornar `isError: true` com mensagem acionável quando falhar.
- Mensagens devem sugerir próximos passos (ex.: “tente `tdl_help` para ver flags”).
- Timeout deve reportar `timed_out: true` e instrução para reduzir escopo.

## 5) Plano de implementação (passo a passo)
### Fase 0 — Preparação
1) Criar repo `mcp-tdl`.
2) Definir Node version (>=18) e TypeScript.

### Fase 1 — MVP (2 tools)
1) Implementar runner `runCmd()` com `spawn()`.
2) Implementar `tdlRun()` que injeta `-n <namespace>` quando informado.
3) Implementar `tdl_exec`.
4) Implementar `tdl_help`.
5) Log mínimo em `stderr` (“ready”).
6) Implementar `response_format` e truncamento por `CHARACTER_LIMIT`.

Critérios de aceite:
- `tdl_exec` executa `tdl --help` via `argv: ["--help"]`.
- Resposta inclui `exit_code`.
- Timeout mata processo travado.

### Fase 2 — Wrappers essenciais
1) Implementar `tdl_download` cobrindo flags comuns.
2) Implementar `tdl_forward`.
3) Implementar `tdl_upload`.
4) Implementar `tdl_chat_ls`, `tdl_chat_export`, `tdl_chat_users`.

Critérios de aceite:
- Cada wrapper gera `argv` correto e delega para `tdlRun()`.
- Inputs inválidos são barrados pelo Zod.

### Fase 3 — Hardening
1) Allowlist opcional (config env `TDL_ALLOWLIST=1`).
2) Restrição de path (env `TDL_BASEDIR=/data`).
3) Truncar outputs acima de `CHARACTER_LIMIT` com mensagem de orientação.
4) Testes manuais e smoke tests.

## 6) Testes (smoke)
Executar localmente:
- `tdl_help` sem command e com `dl`.
- `tdl_exec` com `argv: ["chat","ls","--help"]`.
- `tdl_download` com `--help` via `tdl_exec` para validar flags.

## 7) Integração com Codex CLI
### 7.1 Rodar servidor
- Dev: `npm i && npm run dev`
- Prod: `npm run build && npm start`

### 7.2 Configurar MCP no Codex
Adicionar o servidor MCP na configuração do Codex (exemplo conceitual; ajustar ao formato do seu ambiente):
- Comando: `node /caminho/para/dist/server.js`
- Env: `TDL_BIN=tdl` (ou caminho completo)

> Se você estiver usando a configuração global do Codex (ex.: `~/.codex/config.toml`), registrar o MCP como server STDIO.

Critérios de aceite:
- Codex lista o servidor MCP.
- Codex consegue chamar `tdl_help` e recebe resposta.

## 8) Entregáveis
- Repositório com código TypeScript.
- `README.md` com:
  - Pré-requisitos (Node, `tdl` instalado)
  - Como rodar (dev/prod)
  - Como configurar no Codex
  - Lista de tools e exemplos de payload

## 9) Prompt pronto para enviar ao Codex
Copie/cole o texto abaixo no Codex CLI para ele gerar o projeto completo.

---

**Tarefa:** Crie um repositório Node+TypeScript chamado `mcp-tdl` que implementa um servidor MCP via STDIO para controlar o CLI `tdl`.

**Requisitos obrigatórios:**
1) Usar `@modelcontextprotocol/sdk` e `zod`.
2) Criar `src/server.ts` com `McpServer` + `StdioServerTransport`.
3) Implementar execução do `tdl` com `spawn()` (`shell: false`). Binário via env `TDL_BIN` (default `tdl`).
4) Implementar timeouts por execução (`timeoutSec`, default 300s, max 3600s). Matar processo no timeout.
5) Capturar `stdout`, `stderr`, `exit_code` e retornar como tool result em texto.
6) Implementar validação Zod:
   - `argv`: array 1..200, cada item 1..2048 chars.
   - `namespace?`: 1..128.
7) Tools MCP:
   - `tdl_exec` com inputs `{ namespace?, argv, cwd?, timeoutSec?, response_format? }`.
   - `tdl_help` com inputs `{ namespace?, command?, response_format? }` (executa `tdl --help` ou `tdl <command> --help`).
8) Adicionar wrappers (tools) com schemas razoáveis e mapeamento para argv, delegando para `tdlRun()`:
   - `tdl_download` -> `tdl dl`
   - `tdl_forward` -> `tdl forward`
   - `tdl_upload` -> `tdl up`
   - `tdl_chat_ls` -> `tdl chat ls`
   - `tdl_chat_export` -> `tdl chat export`
   - `tdl_chat_users` -> `tdl chat users`
9) Criar `package.json`, `tsconfig.json`, scripts `dev/build/start` e `README.md` com instruções.

**Notas de implementação:**
- Implementar uma função `tdlRun({ namespace?, argv, cwd?, timeoutSec? })` que injeta `-n <namespace>` quando fornecido.
- Nunca usar `exec()` nem `shell: true`.
- Escrever um log curto no `stderr` quando iniciar (ex.: `tdl-mcp: ready`).
- Incluir `response_format?` ("markdown" | "json") nos tools e truncar acima de 25k chars.
- Sempre definir annotations MCP nos tools.

**Saída esperada:**
- Todos os arquivos do projeto prontos para `npm install`, `npm run dev`, `npm run build`, `npm start`.
