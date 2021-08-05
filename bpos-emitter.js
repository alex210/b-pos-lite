const EventEmitter = require('events');
const lrc = require('./lrc');
const BYTES = require('./BYTES');

class BposEmitter extends EventEmitter {
    constructor(port) {
        super();
        this.port = port;
        this.listenEvent();
        this.listenResponse();
    }

    listenEvent() {
        this.port.on('data', response => {
            for (let byte in BYTES) {
                if (response == BYTES[byte]) {
                    this.emit(byte);
                    break;
                }
            }
        });
    }

    listenResponse() {
        let LL = null;
        let length = 0;
        let message = Buffer.alloc(0);

        this.port.on('data', response => {
            if(response[0] === 0 || response[0] === 2 || LL) {
                if (response[0] === 2) response = response.slice(1);
                if (!LL) LL = response[1] + 3;
                length += response.length;
                message = Buffer.concat([message, response]);

                if (length >= LL) {
                    if (length == LL) {
                        const data = this.checkLRC(message);
                        if (data['RESP']) {
                            this.emit(data['RESP'], data);
                        }
                    }
                    LL = null;
                    length = 0;
                    message = Buffer.alloc(0);
                }
            }
        });
    }

    checkLRC(data) {
        const message = data.toString().substr(2).slice(0, -1);
        const arrayHex = new Uint16Array(data);
        const receivedLRC = arrayHex[arrayHex.length - 1];
        const verifiedLRC = lrc.calculate(message, false);

        if (receivedLRC === verifiedLRC) {
            this.port.write(BYTES['ACK']);
            return this.parseResponse(message);
        }
        this.port.write(BYTES['NAK']);
        return false;
    }

    parseResponse(response) {
        const items = response.split(';');
        const data = {};
        for (let item of items) {
            const arr = item.split('=');
            if (arr[0]) {
                data[arr[0]] = arr[1];
            }
        }
        return data;
    }
}

module.exports = BposEmitter;
