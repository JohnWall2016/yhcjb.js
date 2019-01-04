'use strict';

let x = 'd';
['a', 'b', 'c'].forEach(v => {
    let name = v;
    new Promise(resolve => {
        setTimeout(() => resolve(), 2000);
    }).then(() => {
        console.log(`then: ${v} ${name} ${x}`);
    })
});
x = 'e';
