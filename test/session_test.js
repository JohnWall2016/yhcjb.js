'use strict';

const Xlsx = require('xlsx-populate')
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

const inXslx = 'D:\\待遇核定\\养老金计算表模板.xlsx';
const outXlsx = 'D:\\待遇核定\\养老金计算表模板.out.xlsx';

Session.use('002', s => {
    let idcard = '430311195812311524';//'430311195812281513'; 
    s.send(DyshInfo.request({
        idcard,
        shzt: '0',
        options: {
            pagesize: 500,
            sorting: [{"dataKey":"aaa027","sortDirection":"ascending"}]
        }
    }));
    let rep = fromJson(s.get());
    if (rep.datas && rep.datas[0]) {
        DyshInfo.paymentInfo(rep.datas[0]).then(v => {
            Xlsx.fromFileAsync(inXslx)
                .then(workbook => {
                    let sheet = workbook.sheet(0);
                    sheet.cell('A5').value(v[1]);
                    sheet.cell('B5').value(v[2]);
                    sheet.cell('C5').value(v[3]);
                    sheet.cell('F5').value(v[4]);
                    sheet.cell('H5').value(v[5]);
                    sheet.cell('K5').value(v[6]);

                    sheet.cell('A8').value(v[7]);
                    sheet.cell('B8').value(v[8]);
                    sheet.cell('C8').value(v[9]);
                    sheet.cell('E8').value(v[10]);
                    sheet.cell('F8').value(v[11]);
                    sheet.cell('G8').value(v[12]);
                    sheet.cell('H8').value(v[13]);
                    sheet.cell('I8').value(v[14]);
                    sheet.cell('J8').value(v[15]);
                    sheet.cell('K8').value(v[16]);
                    sheet.cell('L8').value(v[17]);

                    sheet.cell('A11').value(v[18]);
                    sheet.cell('B11').value(v[19]);
                    sheet.cell('C11').value(v[20]);
                    sheet.cell('D11').value(v[21]);
                    sheet.cell('E11').value(v[22]);
                    sheet.cell('F11').value(v[23]);
                    sheet.cell('G11').value(v[24]);
                    sheet.cell('H11').value(v[25]);
                    sheet.cell('I11').value(v[26]);
                    sheet.cell('J11').value(v[27]);
                    sheet.cell('K11').value(v[28]);
                    sheet.cell('L11').value(v[29]);

                    s.send(Service.BankAccountInfo.request(idcard));
                    let r = fromJson(s.get());
                    if (r.data && r.data[0]) {
                        let d = new Data(r.data[0], Service.BankAccountInfo.response);
                        sheet.cell('B15').value(d.name);
                        sheet.cell('F15').value(d.bankType);
                        sheet.cell('J15').value(d.card);
                    } else {
                        sheet.cell('B15').value('未绑定银行账户');
                    }

                    workbook.toFileAsync(outXlsx);
                });

        });
    }
    // rep.datas.forEach(v => {
    //     let data = new Data(v, DyshInfo.response);
    //     console.log(data);
    // })
})