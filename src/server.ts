import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { spawn } from 'child_process';
import * as z from 'zod';

const TDL_BIN = process.env.TDL_BIN || 'tdl';
const CHARACTER_LIMIT = 25000;

const server = new McpServer({
  name: 'tdl-mcp-server',
  version: '1.0.0',
});

interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
}

/**
 * Executa um comando via spawn com timeout.
 */
async function runCmd(argv: string[], cwd?: string, timeoutSec: number = 300): Promise<RunResult> {
  return new Promise((resolve) => {
    const child = spawn(TDL_BIN, argv, {
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
      resolve({
        stdout,
        stderr,
        exitCode: code,
        timedOut,
      });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        stdout,
        stderr: stderr + `\nError: ${err.message}`,
        exitCode: -1,
        timedOut,
      });
    });
  });
}

/**
 * Formata a saída para o agente.
 */
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

  return {
    content: [{ type: 'text' as const, text }],
  };
}

/**
 * Tool: tdl_exec
 */
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
    const result = await runCmd(finalArgv, cwd, timeoutSec);
    return formatResponse(result, response_format);
  }
);

/**
 * Tool: tdl_help
 */
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
    const result = await runCmd(finalArgv, undefined, 30);
    return formatResponse(result, response_format);
  }
);

/**
 * Tool: tdl_download
 */
server.tool(
  'tdl_download',
  {
    namespace: z.string().max(128).optional(),
    url: z.array(z.string()).optional(),
    dir: z.string().optional(),
    include: z.array(z.string()).optional(),
    exclude: z.array(z.string()).optional(),
    group: z.boolean().optional(),
    restart: z.boolean().optional(),
    continue: z.boolean().optional(),
    threads: z.number().int().min(1).max(128).optional(),
    limit: z.number().int().min(1).max(100).optional(),
    timeoutSec: z.number().min(1).max(3600).default(600),
    response_format: z.enum(['markdown', 'json']).default('markdown'),
  },
  async ({
    namespace,
    url,
    dir,
    include,
    exclude,
    group,
    restart,
    continue: cont,
    threads,
    limit,
    timeoutSec,
    response_format,
  }) => {
    const argv = ['dl'];
    if (url) url.forEach((u) => argv.push('-u', u));
    if (dir) argv.push('-d', dir);
    if (include) argv.push('-i', include.join(','));
    if (exclude) argv.push('-e', exclude.join(','));
    if (group) argv.push('--group');
    if (restart) argv.push('--restart');
    if (cont) argv.push('--continue');
    if (threads) argv.push('-t', threads.toString());
    if (limit) argv.push('-l', limit.toString());

    const finalArgv = namespace ? ['-n', namespace, ...argv] : argv;
    const result = await runCmd(finalArgv, undefined, timeoutSec);
    return formatResponse(result, response_format);
  }
);

/**
 * Tool: tdl_chat_ls
 */
server.tool(
  'tdl_chat_ls',
  {
    namespace: z.string().max(128).optional(),
    response_format: z.enum(['markdown', 'json']).default('markdown'),
  },
  async ({ namespace, response_format }) => {
    const argv = ['chat', 'ls'];
    const finalArgv = namespace ? ['-n', namespace, ...argv] : argv;
    const result = await runCmd(finalArgv, undefined, 60);
    return formatResponse(result, response_format);
  }
);

/**
 * Tool: tdl_chat_export
 */
server.tool(
  'tdl_chat_export',
  {
    namespace: z.string().max(128).optional(),
    chat: z.string().describe('ID ou link do chat'),
    response_format: z.enum(['markdown', 'json']).default('markdown'),
  },
  async ({ namespace, chat, response_format }) => {
    const argv = ['chat', 'export', '-u', chat];
    const finalArgv = namespace ? ['-n', namespace, ...argv] : argv;
    const result = await runCmd(finalArgv, undefined, 120);
    return formatResponse(result, response_format);
  }
);

/**
 * Tool: tdl_upload
 */
server.tool(
  'tdl_upload',
  {
    namespace: z.string().max(128).optional(),
    path: z.array(z.string()).min(1),
    chat: z.string().describe('ID ou link do chat de destino'),
    timeoutSec: z.number().min(1).max(3600).default(600),
    response_format: z.enum(['markdown', 'json']).default('markdown'),
  },
  async ({ namespace, path, chat, timeoutSec, response_format }) => {
    const argv = ['up', '-u', chat];
    path.forEach((p) => argv.push('-p', p));
    const finalArgv = namespace ? ['-n', namespace, ...argv] : argv;
    const result = await runCmd(finalArgv, undefined, timeoutSec);
    return formatResponse(result, response_format);
  }
);

/**
 * Tool: tdl_chat_users
 */
server.tool(
  'tdl_chat_users',
  {
    namespace: z.string().max(128).optional(),
    chat: z.string().describe('ID ou link do canal/grupo'),
    response_format: z.enum(['markdown', 'json']).default('markdown'),
  },
  async ({ namespace, chat, response_format }) => {
    const argv = ['chat', 'users', '-u', chat];
    const finalArgv = namespace ? ['-n', namespace, ...argv] : argv;
    const result = await runCmd(finalArgv, undefined, 120);
    return formatResponse(result, response_format);
  }
);

// Conectar via STDIO
const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  console.error('tdl-mcp: ready');
});
