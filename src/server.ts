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

  return server.server; // Retorna o objeto interno do servidor (@modelcontextprotocol/sdk)
}
