Example

const port = '/dev/ttyACM0';

const merchant_id = '1111111';

const terminal = new Bpos(port, merchant_id);



// Purchase

const sum = 100;

terminal.purchase(sum).then(
    result => {
        console.log(result);
    },
    error => {
        console.log(error);
    }
);


// Cancel card waiting

terminal.cancelCardWaiting();



// Cancel

terminal.cancel(sum).then(
    result => {
        console.log(result);
    },
    error => {
        console.log(error);
    }
);



// Z-report

terminal.settlement().then(
    result => {
        console.log(result);
    },
    error => {
        console.log(error);
    }
);


