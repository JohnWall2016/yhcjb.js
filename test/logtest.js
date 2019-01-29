'use strict';

it.output = [];

it.log = function(msg) {
    this.output.push(msg);
}

beforeEach(function() {
    it.output.splice(0);
});

afterEach(function() {
    console.log("--------------------------------------------------------");
    for (const msg of it.output) {
        console.log(msg);
    }
    console.log("--------------------------------------------------------");
});


module.exports.it = it;