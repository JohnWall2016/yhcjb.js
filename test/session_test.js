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
        idcard: '430311195812281513',
        shzt: '0',
        options: {
            pagesize: 500,
            sorting: [{"dataKey":"aaa027","sortDirection":"ascending"}]
        }
    }));
    let rep = fromJson(s.get());
    if (rep.datas && rep.datas[0]) {
        DyshInfo.paymentInfo(rep.datas[0]).then(v => {
            console.log(v);
        });
    }
    // rep.datas.forEach(v => {
    //     let data = new Data(v, DyshInfo.response);
    //     console.log(data);
    // })
})