'use strict';

const Session = require('../lib/session');
const Xlsx = require('xlsx-populate');
const { GrinfoRequest, GrinfoResponse } = require('../lib/service');
const { appendToFileName } = require('../lib/util');

async function queryToFile({xlsxFile, idcardColumn, memoColumn, startRow, endRow}) {
    const workbook = await Xlsx.fromFileAsync(xlsxFile);
    const sheet = workbook.sheet(0);

    Session.use('002', session => {
        for (let index = startRow; index <= endRow; index++) {
            const row = sheet.row(index);
            const idcard = row.cell(idcardColumn).value();
            session.send(new GrinfoRequest(idcard));
            const response = new GrinfoResponse(session.get());
            let message, name
            if (!response || response.datas.length == 0) {
                message = '未查询到参保信息';
            } else {
                //console.log(response.datas[0]);
                name = response.datas[0].name;
                message = response.datas[0].state;
            }
            row.cell(memoColumn).value(message);
            console.log(`${index} ${idcard} ${name} ${message}`);
        }
    });
    workbook.toFileAsync(appendToFileName(xlsxFile, '.new'));
}

queryToFile({
    xlsxFile: 'D:\\暂停终止\\20190110\\区社保局被征地农民20190110.xlsx',
    idcardColumn: 'G', memoColumn: 'P',
    startRow: 3, endRow: 76
});