'use strict';

const { Session, Service } = require('../lib/session');
const { fromJson, Data, DyshInfo } = Service;

/*
Session.use('002', s => {
    s.send(Service.Grinfo({idcard: '430311195702091516'}));
    let rep = s.get();
    console.log(rep);
    let data = new Data(fromJson(rep).datas[0]);
    console.log(data);
    console.log(data.idcard);
});
*/

Session.use('002', s => {
    s.send(DyshInfo.request({
        shzt: '0',
        options: {
            pagesize: 500,
            sorting: [{"dataKey":"aaa027","sortDirection":"ascending"}]
        }
    }));
    let rep = fromJson(s.get());
    let data = new Data(rep.datas[0], DyshInfo.response);
    console.log(data.idcard, data.retireDate);
})
