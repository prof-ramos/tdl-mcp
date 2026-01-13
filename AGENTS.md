# Diretrizes do Repositório

## Estrutura do Projeto & Organização de Módulos
- `src/` contém a implementação do servidor MCP em TypeScript (entrada: `src/server.ts`).
- `dist/` é a saída compilada criada pela etapa de build.
- Arquivos de configuração na raiz: `package.json` (scripts/dependências), `tsconfig.json` (configurações TS), `smithery.yaml` (runtime Smithery).

## Comandos de Build, Teste e Desenvolvimento
- `npm run dev` — executa o servidor de desenvolvimento Smithery apontando para `src/server.ts`.
- `npm run build` — compila o servidor para `dist/` via Smithery.
- `npm run start` — executa o servidor compilado a partir de `dist/server.js`.

## Estilo de Codificação & Convenções de Nomenclatura
- Linguagem: TypeScript (ES2022, `moduleResolution` NodeNext, `strict` ativado).
- Indentação: 2 espaços, sem tabs.
- Prefira nomes claros e descritivos para ferramentas e auxiliares (ex: `runCmd`, `formatResponse`).
- Nenhum formatador/linter está configurado; mantenha as edições consistentes com o estilo existente.

## Diretrizes de Teste
- Nenhum framework de teste ou diretório de teste está presente no momento.
- Se você adicionar testes, documente o executor e adicione um script no `package.json` (ex: `npm test`).

## Diretrizes de Commit & Pull Request
- Mensagens de commit seguem um estilo convencional visto no histórico, ex: `feat: setup tdl-mcp server and smithery configuration`.
- PRs devem incluir um resumo conciso, notas de teste (ou "não executado") e links para issues relevantes.

## Notas de Segurança & Configuração
- O servidor gera o processo da CLI `tdl`; configure o binário via `configSchema` (`tdlBin`) ou configuração do Smithery.
- Tenha cuidado com argumentos fornecidos pelo usuário e diretórios de trabalho para evitar a execução não intencional de comandos.