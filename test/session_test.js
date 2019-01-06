'use strict';

const Xlsx = require('xlsx-populate')
const { Session, Service } = require('../lib/session');
const { fromJson, Data, DyshInfo, BankAccountInfo } = Service;
const dateFormat = require('dateformat');
const path = require('path');

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

Session.use('002', session => {
    function getPaymentReport(name, idcard, outdir, retry = 3) {
        session.send(DyshInfo.request({
            idcard,
            shzt: '0'
        }));
        let dyshInfo = fromJson(session.get());
        if (dyshInfo.datas && dyshInfo.datas[0]) {
            session.send(BankAccountInfo.request(idcard));
            let bankAccountInfo = fromJson(session.get());
            DyshInfo.paymentInfo(dyshInfo.datas[0]).then(v => {
                if (!v) throw new Error('养老金计算信息无效');
                Xlsx.fromFileAsync(inXslx).then(workbook => {
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

                    sheet.cell('H12').value(
                        `制表时间：${dateFormat(new Date(), 'yyyy-mm-dd HH:MM:ss')}`
                    );

                    if (bankAccountInfo.data && bankAccountInfo.data[0]) {
                        let d = new Data(bankAccountInfo.data[0], BankAccountInfo.response);
                        if (d.name) sheet.cell('B15').value(d.name);
                        let bankName = BankAccountInfo.bankName(d.bankType);
                        if (bankName) sheet.cell('F15').value(bankName);
                        let card = d.card;
                        if (card) {
                            let l = card.length;
                            if (l > 7) {
                                card = card.substr(0, 3) + '*'.repeat(l - 7) + card.substr(l - 4);
                            } else if (l > 4) {
                                card = '*'.repeat(l - 4) + card.substr(l - 4);
                            }
                            sheet.cell('J15').value(card);
                        }
                    } else {
                        sheet.cell('B15').value('未绑定银行账户');
                    }

                    workbook.toFileAsync(path.join(outdir, `${name}[${idcard}]养老金计算表.xlsx`));
                });
            }).catch(err => {
                console.error(`${idcard} ${name} 获得养老金计算信息岀错: ${err}`);
                if (retry > 1) {
                    getPaymentReport(name, idcard, outdir, --retry);
                } else {
                    console.error(`${idcard} ${name} 无法获得养老金计算信息`);
                }
                });
        } else {
            console.error(`${idcard} ${name} 未查到该人员核定数据`);
        }
    }

    [['张某', '430311195812311524'], ['李某', '430311195812281513']]
        .forEach(([name, idcard]) => getPaymentReport(name, idcard));
});