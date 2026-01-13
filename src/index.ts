import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import createServer from './server.js';

const config = {
  tdlBin: process.env.TDL_BIN || 'tdl',
};

const server = createServer({ config });
const transport = new StdioServerTransport();

await server.connect(transport);
