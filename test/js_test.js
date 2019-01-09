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
/*
const util = require('util');
const setImmediatePromise = util.promisify(setImmediate);
console.log(setImmediate[util.promisify.custom] == setImmediatePromise);
setImmediatePromise(['hello', 'world']).then(([a, b]) => {
    console.log(a, b);
});
*/
/*
class Response {
    constructor(json) {
        Object.assign(this, JSON.parse(json));
        this._datas = this.datas;
        let self = this;
        this.datas = new Proxy(this._datas, {
            get: function(target, name) {
                if (!target || !target[name]) {
                    return undefined;
                }
                return new Proxy(target[name], {
                    get: function(target, name) {
                        let field;
                        if (self.constructor.datasMap &&
                            (field = self.constructor.datasMap[name])) {
                            return target[field];
                        }
                        return target[name];
                    }
                });
            }
        });
    }
}

Response.datasMap = {
    'A': 'a'
}

class Response2 extends Response {}
Response2.datasMap = {
    'B': 'b', ...Response.datasMap
}

let r = new Response2(`{"r":"fine", "datas":[{"a": 1, "b": 2}]}`);
console.log(r.r, r.datas[0].A, r.datas[0].a, r.datas[0].B, r.datas[1]);
*/
const dateFormat = require('dateformat');
console.log(`${dateFormat(new Date(), 'yyyy-mm-dd HH:MM:ss')}`);

let date = dateFormat(new Date(), 'yyyymmdd');
let dateChinese = dateFormat(new Date(), 'yyyy年m月d日');
let dateChinese2 = dateFormat(new Date(2019, 10, 10), 'yyyy年m月d日');
console.log(date, dateChinese, dateChinese2);