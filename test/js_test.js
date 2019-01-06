'use strict';
/*
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
*/
/*
const yearMonth = process.argv[2];

const [year, month] = (function() {
    let m
    if (m = yearMonth.match(/^(\d\d\d\d)(\d\d)$/)) {
        return [m[1], `${m[2][0]=='0'?m[2].substr(1):m[2]}`];
    } else {
        console.error('年月格式有误');
        process.exit(-1);
    }
})();
console.log(year, month);

const name = `${year}年${month}月待遇核定数据`;
console.log(name);

const dateFormat = require('dateformat');
console.log(`${dateFormat(new Date(), 'yyyy-mm-dd HH:MM:ss')}`);
*/

const util = require('util');
const setImmediatePromise = util.promisify(setImmediate);
console.log(setImmediate[util.promisify.custom] == setImmediatePromise);
setImmediatePromise(['hello', 'world']).then(([a, b]) => {
    console.log(a, b);
});