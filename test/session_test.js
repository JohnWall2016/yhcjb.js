'use strict';

const { Session, Service } = require('../lib/session');

Session.using('002', s => {
    s.send(Service.Grinfo('430311195702091516'));
    console.log(s.get());
});