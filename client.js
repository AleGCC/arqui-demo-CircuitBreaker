const http = require('http');

class CircuitBreaker {
    constructor(service, options = {}) {
        this.service = service;
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        this.nextAttempt = 0;
        
        this.options = {
            failureThreshold: 2,  // 2 fallos para abrir
            successThreshold: 1,  // 1 éxito para cerrar
            timeout: 3000,       // 3 segundos en OPEN
            ...options
        };
    }

    async call() {
        // Verificar estado OPEN
        if (this.state === 'OPEN') {
            if (Date.now() >= this.nextAttempt) {
                this.state = 'HALF_OPEN';
                console.log('🟡 Circuito HALF_OPEN: Probando servicio...');
            } else {
                throw new Error('🔴 Circuito abierto. Intento bloqueado');
            }
        }

        // Intentar llamada
        try {
            const result = await this.service();
            this.handleSuccess();
            return `✅ ${result}`;
        } catch (err) {
            this.handleFailure();
            throw err;
        }
    }

    handleSuccess() {
        this.failureCount = 0;
        if (this.state === 'HALF_OPEN') {
            this.successCount++;
            if (this.successCount >= this.options.successThreshold) {
                this.closeCircuit();
            }
        }
    }

    handleFailure() {
        this.failureCount++;
        this.successCount = 0;

        if (this.failureCount >= this.options.failureThreshold && this.state !== 'OPEN') {
            this.openCircuit();
        }
    }

    openCircuit() {
        this.state = 'OPEN';
        this.nextAttempt = Date.now() + this.options.timeout;
        console.log(`🚨 Circuito ABIERTO (Fallos: ${this.failureCount})`);
    }

    closeCircuit() {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        console.log('🟢 Circuito CERRADO');
    }
}

// Llamar al servicio HTTP
const callService = () => {
    return new Promise((resolve, reject) => {
        const req = http.get('http://localhost:3000/api', (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(data);
                } else {
                    reject(new Error(`Código de estado ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.end();
    });
};

// Circuit Breaker
const runClient = async () => {
    const breaker = new CircuitBreaker(callService, {
        failureThreshold: 2,
        successThreshold: 1,
        timeout: 5000
    });

    console.log('Cliente iniciado con Circuit Breaker');
    console.log('Configuración:');
    console.log(`- Fallos para abrir: ${breaker.options.failureThreshold}`);
    console.log(`- Éxitos para cerrar: ${breaker.options.successThreshold}`);
    console.log(`- Tiempo en abierto: ${breaker.options.timeout}ms\n`);

    let count = 0;
    const maxCalls = 30;

    const interval = setInterval(async () => {
        count++;
        if (count > maxCalls) {
            clearInterval(interval);
            console.log('\nDemo completada');
            return;
        }

        try {
            const result = await breaker.call();
            console.log(`[${count}] ${result} (Estado: ${breaker.state})`);
        } catch (err) {
            console.log(`[${count}] ${err.message} (Estado: ${breaker.state})`);
        }
    }, 1000);
};

runClient();