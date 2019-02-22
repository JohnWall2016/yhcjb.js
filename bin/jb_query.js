'use strict';

const Session = require('../lib/session');
const Xlsx = require('xlsx-populate');
const { GrinfoRequest, GrinfoResponse, 
    PausePayInfoRequest, PausePayInfoResponse,
    SuspectedDeathInfoRequest, SuspectedDeathInfoResponse
} = require('../lib/service');
const { appendToFileName, previousMonth, substractMonth,
    padZeroStr,    
} = require('../lib/util');

/*
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
*/

async function updateInheritanceTable({ xlsx, startRow, endRow }) {
    
    const workbook = await Xlsx.fromFileAsync(xlsx);
    const sheet = workbook.sheet(0);

    Session.use('002', session => {
        for (let index = startRow; index < endRow; index++) {
            const row = sheet.row(index);
            const idcard = row.cell('B').value();

            session.send(new GrinfoRequest(idcard));
            let response = new GrinfoResponse(session.get());
            if (response.datas.length <= 0) continue;
            let info = response.datas[0];

            console.log(`${info.xzqh}|${info.dwmc}|${info.state}`);
            row.cell('E').value(info.xzqh);
            row.cell('F').value(info.dwmc);
            row.cell('G').value(info.state);

            let deathTime = row.cell('D').value();
            session.send(new PausePayInfoRequest(idcard));
            response = new PausePayInfoResponse(session.get());
            if (response.datas.length > 0) {
                info = response.datas[0];
                console.log(`${info.idcard}|${info.name}|${info.pauseTime}|${info.pauseReasonChn}|${info.memo}`);

                row.cell('H').value('暂停');
                let pauseTime = info.pauseTime;
                row.cell('I').value(pauseTime);
                try {
                    let delta = substractMonth(deathTime, previousMonth(pauseTime));
                    console.log(`${deathTime} - ${pauseTime} + 1 = ${delta}`);
                    row.cell('J').value(delta);
                } catch (err) {
                    console.log(`无法计算时间差, ${deathTime} - ${pauseTime}: ${err}`);
                }
                row.cell('K').value(info.pauseReasonChn);
                row.cell('L').value(info.memo);
            }

            session.send(new SuspectedDeathInfoRequest(idcard));
            response = new SuspectedDeathInfoResponse(session.get());
            if (response.datas.length > 0) {
                info = response.datas[0];
                let sdTime = padZeroStr(info.deathTime, 8);
                row.cell('M').value(sdTime);
                try {
                    let delta = substractMonth(deathTime, previousMonth(sdTime.substr(0, 6)));
                    console.log(`${deathTime} - ${sdTime} + 1 = ${delta}`);
                    row.cell('N').value(delta);
                } catch (err) {
                    console.log(`无法计算时间差, ${deathTime} - ${sdTime}: ${err}`);
                }
            }
        }
    });
    workbook.toFileAsync(appendToFileName(xlsx, '.new'));
}

