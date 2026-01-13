import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { spawn } from 'child_process';
import * as z from 'zod';

const CHARACTER_LIMIT = 25000;

// Esquema de configuração para o Smithery
export const configSchema = z.object({
  tdlBin: z.string().default('tdl').describe('Caminho para o binário do tdl'),
});

interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
}

async function runCmd(
  bin: string,
  argv: string[],
  cwd?: string,
  timeoutSec: number = 300
): Promise<RunResult> {
  return new Promise((resolve) => {
    const child = spawn(bin, argv, {
      cwd,
      shell: false,
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutSec * 1000);

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code, timedOut });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ stdout, stderr: stderr + `\nError: ${err.message}`, exitCode: -1, timedOut });
    });
  });
}

function formatResponse(result: RunResult, format: 'markdown' | 'json' = 'markdown') {
  let stdout = result.stdout;
  let stderr = result.stderr;
  let truncated = false;

  if (stdout.length + stderr.length > CHARACTER_LIMIT) {
    stdout = stdout.substring(0, CHARACTER_LIMIT / 2);
    stderr = stderr.substring(0, CHARACTER_LIMIT / 2);
    truncated = true;
  }

  if (format === 'json') {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            exit_code: result.exitCode,
            stdout,
            stderr,
            timed_out: result.timedOut,
            truncated,
          }),
        },
      ],
    };
  }

  let text = `Exit Code: ${result.exitCode}\n`;
  if (result.timedOut)
    text += `**AVISO: Comando interrompido por timeout (${result.timedOut}s)**\n`;
  if (truncated) text += `**AVISO: Saída truncada (limite de ${CHARACTER_LIMIT} chars)**\n`;
  if (stdout) text += `\n### stdout\n\`\`\`\n${stdout}\n\`\`\`\n`;
  if (stderr) text += `\n### stderr\n\`\`\`\n${stderr}\n\`\`\`\n`;

  return { content: [{ type: 'text' as const, text }] };
}

/**
 * Factory function padrão para o Smithery
 */
export default function createServer({ config }: { config: z.infer<typeof configSchema> }) {
  // Log de inicialização conforme plano
  console.error('tdl-mcp: ready');
  const server = new McpServer({
    name: 'tdl-mcp-server',
    version: '1.0.0',
  });

  const TDL_BIN = config.tdlBin;

  server.tool(
    'tdl_exec',
    {
      argv: z.array(z.string().max(2048)).min(1).max(200),
      namespace: z.string().max(128).optional(),
      cwd: z.string().optional(),
      timeoutSec: z.number().min(1).max(3600).default(300),
      response_format: z.enum(['markdown', 'json']).default('markdown'),
    },
    async ({ argv, namespace, cwd, timeoutSec, response_format }) => {
      const finalArgv = namespace ? ['-n', namespace, ...argv] : argv;
      const result = await runCmd(TDL_BIN, finalArgv, cwd, timeoutSec);
      return formatResponse(result, response_format);
    }
  );

  server.tool(
    'tdl_help',
    {
      namespace: z.string().max(128).optional(),
      command: z.string().optional(),
      response_format: z.enum(['markdown', 'json']).default('markdown'),
    },
    async ({ namespace, command, response_format }) => {
      const argv = command ? [command, '--help'] : ['--help'];
      const finalArgv = namespace ? ['-n', namespace, ...argv] : argv;
      const result = await runCmd(TDL_BIN, finalArgv, undefined, 30);
      return formatResponse(result, response_format);
    }
  );

  server.tool(
    'tdl_download',
    {
      namespace: z.string().max(128).optional(),
      url: z.array(z.string()).optional(),
      dir: z.string().optional(),
      threads: z.number().int().optional(),
      timeoutSec: z.number().min(1).max(3600).default(600),
      response_format: z.enum(['markdown', 'json']).default('markdown'),
    },
    async (args) => {
      const argv = ['dl'];
      if (args.url) args.url.forEach((u) => argv.push('-u', u));
      if (args.dir) argv.push('-d', args.dir);
      if (args.threads) argv.push('-t', args.threads.toString());
      const finalArgv = args.namespace ? ['-n', args.namespace, ...argv] : argv;
      const result = await runCmd(TDL_BIN, finalArgv, undefined, args.timeoutSec);
      return formatResponse(result, args.response_format);
    }
  );

  server.tool(
    'tdl_chat_ls',
    {
      namespace: z.string().max(128).optional(),
      response_format: z.enum(['markdown', 'json']).default('markdown'),
    },
    async ({ namespace, response_format }) => {
      const argv = ['chat', 'ls'];
      const finalArgv = namespace ? ['-n', namespace, ...argv] : argv;
      const result = await runCmd(TDL_BIN, finalArgv, undefined, 60);
      return formatResponse(result, response_format);
    }
  );

  // tdl_forward - Encaminhar mensagens/arquivos
  server.tool(
    'tdl_forward',
    {
      namespace: z.string().max(128).optional(),
      from: z.array(z.string()).min(1).describe('Links ou arquivos JSON exportados para encaminhar'),
      to: z.string().describe('Destino (CHAT ou expressão de roteamento)'),
      desc: z.boolean().optional().describe('Encaminhar em ordem reversa'),
      dryRun: z.boolean().optional().describe('Simular sem enviar'),
      edit: z.string().max(1024).optional().describe('Editar mensagem/caption com expressão'),
      mode: z.enum(['direct', 'clone']).optional().describe('Modo de encaminhamento'),
      silent: z.boolean().optional().describe('Enviar silenciosamente'),
      single: z.boolean().optional().describe('Não detectar mensagens agrupadas'),
      timeoutSec: z.number().min(1).max(3600).default(600),
      response_format: z.enum(['markdown', 'json']).default('markdown'),
    },
    async (args) => {
      const argv = ['forward'];
      if (args.from) args.from.forEach((f) => argv.push('--from', f));
      if (args.to) argv.push('--to', args.to);
      if (args.desc) argv.push('--desc');
      if (args.dryRun) argv.push('--dry-run');
      if (args.edit) argv.push('--edit', args.edit);
      if (args.mode) argv.push('--mode', args.mode);
      if (args.silent) argv.push('--silent');
      if (args.single) argv.push('--single');
      const finalArgv = args.namespace ? ['-n', args.namespace, ...argv] : argv;
      const result = await runCmd(TDL_BIN, finalArgv, undefined, args.timeoutSec);
      return formatResponse(result, args.response_format);
    }
  );

  // tdl_upload - Upload de arquivos para Telegram
  server.tool(
    'tdl_upload',
    {
      namespace: z.string().max(128).optional(),
      path: z.array(z.string()).min(1).describe('Diretórios ou arquivos para upload'),
      chat: z.string().optional().describe('Chat ID ou domínio (padrão: Saved Messages)'),
      to: z.string().optional().describe('Destino via expressão de roteamento'),
      topic: z.number().int().optional().describe('ID do tópico (requer --chat)'),
      caption: z.string().max(4096).optional().describe('Legenda para o arquivo'),
      photo: z.boolean().optional().describe('Enviar como foto em vez de arquivo'),
      remove: z.boolean().optional().describe('Remover arquivos após upload'),
      include: z.array(z.string()).optional().describe('Incluir apenas estas extensões'),
      exclude: z.array(z.string()).optional().describe('Excluir estas extensões'),
      timeoutSec: z.number().min(1).max(3600).default(600),
      response_format: z.enum(['markdown', 'json']).default('markdown'),
    },
    async (args) => {
      const argv = ['up'];
      if (args.path) args.path.forEach((p) => argv.push('-p', p));
      if (args.chat) argv.push('-c', args.chat);
      if (args.to) argv.push('--to', args.to);
      if (args.topic) argv.push('--topic', args.topic.toString());
      if (args.caption) argv.push('--caption', args.caption);
      if (args.photo) argv.push('--photo');
      if (args.remove) argv.push('--rm');
      if (args.include) args.include.forEach((e) => argv.push('-i', e));
      if (args.exclude) args.exclude.forEach((e) => argv.push('-e', e));
      const finalArgv = args.namespace ? ['-n', args.namespace, ...argv] : argv;
      const result = await runCmd(TDL_BIN, finalArgv, undefined, args.timeoutSec);
      return formatResponse(result, args.response_format);
    }
  );

  // tdl_chat_export - Exportar histórico de chat
  server.tool(
    'tdl_chat_export',
    {
      namespace: z.string().max(128).optional(),
      chat: z.string().optional().describe('Chat ID ou domínio (padrão: Saved Messages)'),
      output: z.string().optional().describe('Arquivo JSON de saída (padrão: tdl-export.json)'),
      type: z.enum(['time', 'id', 'last']).optional().describe('Tipo de exportação'),
      filter: z.string().max(1024).optional().describe('Filtro de expressão'),
      input: z.array(z.number().int()).optional().describe('Dados de entrada (depende do tipo)'),
      reply: z.number().int().optional().describe('ID do post para resposta'),
      topic: z.number().int().optional().describe('ID do tópico'),
      all: z.boolean().optional().describe('Exportar todas as mensagens'),
      raw: z.boolean().optional().describe('Exportar estrutura raw da API'),
      withContent: z.boolean().optional().describe('Exportar com conteúdo da mensagem'),
      timeoutSec: z.number().min(1).max(3600).default(600),
      response_format: z.enum(['markdown', 'json']).default('markdown'),
    },
    async (args) => {
      const argv = ['chat', 'export'];
      if (args.chat) argv.push('-c', args.chat);
      if (args.output) argv.push('-o', args.output);
      if (args.type) argv.push('-T', args.type);
      if (args.filter) argv.push('-f', args.filter);
      if (args.input) args.input.forEach((i) => argv.push('-i', i.toString()));
      if (args.reply) argv.push('--reply', args.reply.toString());
      if (args.topic) argv.push('--topic', args.topic.toString());
      if (args.all) argv.push('--all');
      if (args.raw) argv.push('--raw');
      if (args.withContent) argv.push('--with-content');
      const finalArgv = args.namespace ? ['-n', args.namespace, ...argv] : argv;
      const result = await runCmd(TDL_BIN, finalArgv, undefined, args.timeoutSec);
      return formatResponse(result, args.response_format);
    }
  );

  // tdl_chat_users - Exportar usuários de canais/grupos
  server.tool(
    'tdl_chat_users',
    {
      namespace: z.string().max(128).optional(),
      chat: z.string().describe('Domain ID do canal/supergrupo'),
      output: z.string().optional().describe('Arquivo JSON de saída (padrão: tdl-users.json)'),
      raw: z.boolean().optional().describe('Exportar estrutura raw da API'),
      timeoutSec: z.number().min(1).max(3600).default(300),
      response_format: z.enum(['markdown', 'json']).default('markdown'),
    },
    async (args) => {
      const argv = ['chat', 'users'];
      if (args.chat) argv.push('-c', args.chat);
      if (args.output) argv.push('-o', args.output);
      if (args.raw) argv.push('--raw');
      const finalArgv = args.namespace ? ['-n', args.namespace, ...argv] : argv;
      const result = await runCmd(TDL_BIN, finalArgv, undefined, args.timeoutSec);
      return formatResponse(result, args.response_format);
    }
  );

  server.tool(
    'tdl_whoami',
    {
      namespace: z.string().max(128).optional(),
      verbose: z.boolean().optional().describe('Saída detalhada incluindo User, Config e AppConfig'),
      response_format: z.enum(['markdown', 'json']).default('markdown'),
    },
    async ({ namespace, verbose, response_format }) => {
      const argv = ['whoami'];
      if (verbose) argv.push('-v');
      const finalArgv = namespace ? ['-n', namespace, ...argv] : argv;
      const result = await runCmd(TDL_BIN, finalArgv, undefined, 30);
      return formatResponse(result, response_format);
    }
  );

  server.tool(
    'tdl_version',
    {
      response_format: z.enum(['markdown', 'json']).default('markdown'),
    },
    async ({ response_format }) => {
      const result = await runCmd(TDL_BIN, ['version'], undefined, 10);
      return formatResponse(result, response_format);
    }
  );

  server.tool(
    'tdl_login',
    {
      namespace: z.string().max(128).optional(),
      type: z.enum(['desktop', 'qr', 'code']).default('desktop').describe('Modo de login: desktop (roubar sessão), qr (exibir QR), code (interativo/não suportado totalmente)'),
      desktopPath: z.string().optional().describe('Caminho opcional para a pasta do Telegram Desktop'),
      passcode: z.string().optional().describe('Senha local (passcode) do Telegram Desktop se houver'),
      timeoutSec: z.number().min(1).max(600).default(60),
      response_format: z.enum(['markdown', 'json']).default('markdown'),
    },
    async ({ namespace, type, desktopPath, passcode, timeoutSec, response_format }) => {
      const argv = ['login', '-T', type];
      if (desktopPath) argv.push('-d', desktopPath);
      if (passcode) argv.push('-p', passcode);
      const finalArgv = namespace ? ['-n', namespace, ...argv] : argv;
      // Timeout curto para QR code não ficar pendurado para sempre, mas suficiente para renderizar
      const result = await runCmd(TDL_BIN, finalArgv, undefined, timeoutSec);
      return formatResponse(result, response_format);
    }
  );

  server.tool(
    'tdl_backup',
    {
      namespace: z.string().max(128).optional(),
      target: z.string().min(1).describe('Caminho de destino para o backup'),
      timeoutSec: z.number().min(1).max(3600).default(600),
      response_format: z.enum(['markdown', 'json']).default('markdown'),
    },
    async ({ namespace, target, timeoutSec, response_format }) => {
      const argv = ['backup', target];
      const finalArgv = namespace ? ['-n', namespace, ...argv] : argv;
      const result = await runCmd(TDL_BIN, finalArgv, undefined, timeoutSec);
      return formatResponse(result, response_format);
    }
  );

  server.tool(
    'tdl_extension',
    {
      command: z.enum(['install', 'remove', 'list', 'upgrade']).describe('Ação da extensão'),
      args: z.array(z.string()).optional().describe('Argumentos para a ação (ex: URL ou nome)'),
      timeoutSec: z.number().min(1).max(600).default(300),
      response_format: z.enum(['markdown', 'json']).default('markdown'),
    },
    async ({ command, args, timeoutSec, response_format }) => {
      const argv = ['extension', command];
      if (args) argv.push(...args);
      // Extensions geralmente não usam namespace flag do tdl core, mas depende da implementação.
      // Vou assumir que não usam -n aqui, pois gerenciam o binário tdl em si.
      const result = await runCmd(TDL_BIN, argv, undefined, timeoutSec);
      return formatResponse(result, response_format);
    }
  );

  return server.server; // Retorna o objeto interno do servidor (@modelcontextprotocol/sdk)
}

// Export para Smithery: indica se o servidor mantém estado entre chamadas
export const stateful = false;

