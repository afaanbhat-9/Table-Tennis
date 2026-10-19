import http from 'http';

// Helper to fetch CDP target
function getWebSocketDebuggerUrl(): Promise<string> {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const list = JSON.parse(data);
          const page = list.find((t: any) => t.type === 'page');
          if (page && page.webSocketDebuggerUrl) {
            resolve(page.webSocketDebuggerUrl);
          } else {
            reject(new Error('No page target found'));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  try {
    const wsUrl = await getWebSocketDebuggerUrl();
    console.log('Found Edge CDP WebSocket URL:', wsUrl);
  } catch (err: any) {
    console.log('CDP not available or not running:', err.message);
  }
}

main();
