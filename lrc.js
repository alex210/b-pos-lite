function getBytes(x) {
    const bytes = [];
    let i = 4;
    do {
        bytes[--i] = x & (255);
        x = x >> 8;
    } while (i);
    return bytes;
}

module.exports.calculate = function(str, toBytes=true) {
    const bytes = [];
    let lrc = 0x00;
    for (let i = 0; i < str.length; i++) {
        bytes.push(str.charCodeAt(i));
    }
    for (let i = 0; i < str.length; i++) {
        lrc ^= bytes[i];
    }

    return toBytes ? getBytes(lrc) : lrc;
};
