const SerialPort = require('serialport');
const struct = require('python-struct');
const lrc = require('./lrc');
const BYTES = require('./BYTES');
const BposEmitter = require('./bpos-emitter');

class Bpos {
    constructor(port, mid) {
        this.port = new SerialPort(port);
        this.emitter = new BposEmitter(this.port);
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
                        for (const channel of ['CON', 'EOT']) this.emitter.removeAllListeners(channel);
                        if (dataCON['RC'] == 0) {
                            resolve(dataPUR);
                        } else {
                            reject(dataCON);
                        }
                    })
                } else {
                    for (const channel of ['CON', 'EOT']) this.emitter.removeAllListeners(channel);
                    reject(dataPUR);
                }

            });

            this.emitter.on('EOT', () => {
                for (const channel of ['PUR', 'CON', 'EOT']) this.emitter.removeAllListeners(channel);
                reject('EOT');
            });
        });
    }

    cancelCardWaiting() {
        this.port.write(BYTES['EOT']);
    }

    cancel(invoice) {
        this.send(`REQ=CAN;INVOICE=${invoice};MID=${this.mid};`);
        return new Promise((resolve, reject) => {
            this.emitter.on('CAN', dataCAN => {
                for (const channel of ['CAN', 'EOT']) this.emitter.removeAllListeners(channel);
                if (dataCAN['RC'] == 0) {
                    resolve(dataCAN);
                } else {
                    reject(dataCAN);
                }
            });

            this.emitter.on('EOT', () => {
                for (const channel of ['CAN', 'EOT']) this.emitter.removeAllListeners(channel);
                reject('EOT');
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
            for (const channel of ['ACK', 'NAK']) this.emitter.removeAllListeners(channel);
        });

        let count = 1;
        this.emitter.on('NAK', () => {
            count++;
            this.request(message);
            if (count == 3) {
                for (const channel of ['ACK', 'NAK']) this.emitter.removeAllListeners(channel);
            }
        });
    };


    request(message) {
        const LL = struct.pack('!h', message.length + 3);
        this.port.write(BYTES['STX']);
        this.port.write(LL);
        this.port.write(message);
        this.port.write(lrc.calculate(message));
    }
}

module.exports = Bpos;
