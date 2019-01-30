'use strict';

const { it } = require('./logtest');

describe('js test', function() {
    it('getMoneyChn', function() {
        const { getMoneyChn } = require('../lib/util');
        it.log(getMoneyChn(10.03));
    });

    it('class mixin', function() {
        class Person {
            constructor(name) { this.name = name; }
            whoAmI() { return `I'm ${this.name}`; }
        }
        Person.prototype.greeting = function() {
            return `Hello from ${this.name}`;
        }
        const john = new Person('John');
        it.log(john.whoAmI());
        it.log(john.greeting());
    });

    it.only('test tmp file', function() {
        const fs = require('fs');
        const tmp = require('tmp');
        const tmpFile = tmp.fileSync({
            keep: true
        });
        it.log(`${tmpFile.name}`);
        fs.writeSync(tmpFile.fd, 'abcd\nefgh\n');
        fs.closeSync(tmpFile.fd);
    });
});