const struct = require('python-struct');
const lrc = require('./lrc');
const BYTES = require('./BYTES');
const BposEmitter = require('./bpos-emitter');
const net = require('net');

class Bpos {
    constructor(ip, port, mid) {
        this.ip = ip;
        this.port = port;
        this.client = new net.Socket();
        this.emitter = new BposEmitter(this.client);
        this.mid = mid;
    }

    purchase(amount) {
        this.send(`REQ=PUR;AMOUNT=${amount};MID=${this.mid};`);
        return new Promise((resolve, reject) => {
            this.emitter.on('PUR', dataPUR => {
                this.emitter.removeAllListeners('PUR');
                if (dataPUR['RC'] == 0 && dataPUR['INVOICE']) {
                    this.send(`REQ=CON;INVOICE=${dataPUR['INVOICE']};`);
                    this.emitter.on('CON', dataCON => {
                        this.emitter.removeAllListeners('CON', 'EOT');
                        if (dataCON['RC'] == 0) {
                            resolve(dataPUR);
                        } else {
                            reject(dataCON);
                        }
                    })
                } else {
                    reject(dataPUR);
                }

            });

            this.emitter.on('EOT', () => {
                this.emitter.removeAllListeners('PUR', 'CON', 'EOT');
                reject();
            });
        });
    }

    cancelCardWaiting() {
        this.write(BYTES['EOT']);
    }

    cancel(invoice) {
        this.send(`REQ=CAN;INVOICE=${invoice};MID=${this.mid};`);
        return new Promise((resolve, reject) => {
            this.emitter.on('CAN', dataCAN => {
                this.emitter.removeAllListeners('CAN');
                if (dataCAN['RC'] == 0) {
                    resolve(dataCAN);
                } else {
                    reject(dataCAN);
                }
            });
        });
    }

    settlement() {
        this.send(`REQ=SET;MID=${this.mid};`);
        return new Promise((resolve, reject) => {
            this.emitter.on('SET', dataSET => {
                this.emitter.removeAllListeners('SET');
                if (dataSET['RC'] == 0) {
                    resolve(dataSET);
                } else {
                    reject(dataSET);
                }
            });
        });
    }

    send(message) {
        this.request(message);

        this.emitter.on('ACK', () => {
            this.emitter.removeAllListeners('ACK', 'NAK');
        });

        let count = 1;
        this.emitter.on('NAK', () => {
            count++;
            this.request(message);
            if (count == 3) {
                this.emitter.removeAllListeners('ACK', 'NAK');
            }
        });
    };


    request(message) {
        const buff = Buffer.from(message, "utf-8");
        const LL = struct.pack('!h', message.length + 3);
        this.write(BYTES['STX'] + LL + buff + Buffer.from(lrc.calculate(message)));
    }

    write(data) {
        if (this.client.connecting) {
            this.client.write(data);
        } else {
            this.client.connect(this.port, this.ip, () => {
                this.client.write(data);
            });
        }
    }
}

module.exports = Bpos;
