import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { WebSocketServer } from 'ws'

function websocketServerPlugin() {
  let wss: any = null;
  return {
    name: 'websocket-server',
    configureServer() {
      // Start WebSocket server on port 8080 for real-time local dev updates
      wss = new WebSocketServer({ port: 8080 });
      wss.on('connection', (ws: any) => {
        ws.on('message', (message: any) => {
          const data = message.toString();
          // Broadcast to all other clients
          wss.clients.forEach((client: any) => {
            if (client !== ws && client.readyState === 1) {
              client.send(data);
            }
          });
        });
      });
      console.log('WebSocket Sync Server running on ws://localhost:8080');
    },
    closeBundle() {
      if (wss) {
        wss.close();
      }
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), websocketServerPlugin()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
