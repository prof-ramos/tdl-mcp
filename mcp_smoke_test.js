const { spawn } = require('child_process');
const path = require('path');

const serverPath = path.join(__dirname, 'dist', 'server.js');
const serverProcess = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'inherit'] // Stdin/out via pipe, stderr para ver logs
});

let buffer = '';

serverProcess.stdout.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop(); // Guarda o resto incompleto

  for (const line of lines) {
    if (!line.trim()) continue;
    
    try {
      const message = JSON.parse(line);
      console.log('Recebido:', JSON.stringify(message, null, 2));

      // Se recebemos a resposta do initialize, pedimos a lista de tools
      if (message.id === 1 && message.result) {
        console.log('Inicialização bem sucedida. Solicitando ferramentas...');
        const toolsListRequest = {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list'
        };
        serverProcess.stdin.write(JSON.stringify(toolsListRequest) + '\n');
      } 
      // Se recebemos a resposta das tools, validamos e encerramos
      else if (message.id === 2 && message.result) {
        console.log(`Sucesso! Encontradas ${message.result.tools.length} ferramentas.`);
        message.result.tools.forEach(t => console.log(`- ${t.name}`));
        
        // Encerra graciosamente
        process.exit(0);
      }
    } catch (e) {
      console.error('Erro ao processar linha:', line, e);
    }
  }
});

// Envia handshake inicial
const initRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'test-client',
      version: '1.0.0'
    }
  }
};

console.log('Iniciando servidor e enviando handshake...');
serverProcess.stdin.write(JSON.stringify(initRequest) + '\n');

// Timeout de segurança
setTimeout(() => {
  console.error('Timeout do teste excedido.');
  serverProcess.kill();
  process.exit(1);
}, 5000);
