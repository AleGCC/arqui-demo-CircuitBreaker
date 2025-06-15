const http = require('http');

const PORT = 3000;
const FAILURE_RATE = 0.5; // 50% de probabilidad de fallo

const server = http.createServer((req, res) => {
    if (req.url === '/api') {
        const requestTime = new Date().toISOString();
        console.log(`[${requestTime}] 📥 Solicitud recibida a /api`);

        setTimeout(() => {
            if (Math.random() < FAILURE_RATE) {
                console.log(`[${requestTime}] ❌ Respondiendo error 500`);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error interno del servidor');
            } else {
                const responseData = { 
                    data: 'Éxito desde el servidor',
                    timestamp: Date.now()
                };
                console.log(`[${requestTime}] ✅ Respondiendo éxito 200`, JSON.stringify(responseData));
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(responseData));
            }
        }, 300);
    } else {
        console.log(`[${new Date().toISOString()}] ⚠️ Ruta no encontrada: ${req.url}`);
        res.writeHead(404);
        res.end();
    }
});

server.listen(PORT, () => {
    console.log(`\n Servidor escuchando en http://localhost:${PORT}`);
    console.log('Endpoints:');
    console.log(`  GET /api - Servicio con ${FAILURE_RATE * 100}% de fallos`);
    console.log('\n Monitor de solicitudes:');
});