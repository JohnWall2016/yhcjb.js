'use strict';

const Xlsx = require('xlsx-populate')
const Session = require('../lib/session');
const { DyshInfoRequest, DyshInfoResponse } = require('../lib/service');

if (process.argv.length != 3) {
    console.error('node <this file> 年月');
    console.error('  年月: 格式 YYYYMM, 如 201901');
    process.exit(-1);
}

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

const infoXlsx = 'D:\\待遇核定\\信息核对报告表模板.xlsx';
const saveXlsx = `D:\\待遇核定\\信息核对报告表模板${yearMonth}.xlsx`;
const outputDir = `D:\\待遇核定\\${year}年${month}月待遇核定数据`;

function downloadPaylist() {
    Xlsx.fromFileAsync(infoXlsx).then(workbook => {
        let sheet = workbook.sheet(0);
        let [startRow, currentRow] = [4, 4];

        Session.use('002', session => {
            session.send(new DyshInfoRequest({
                shzt: '0',
                options: {
                    pagesize: 500,
                    sorting: [{"dataKey":"aaa027","sortDirection":"ascending"}]
                }
            }));
            let dyshInfo = new DyshInfoResponse(session.get());
            dyshInfo.datas.forEach((data, index) => {
                let row;
                if (currentRow > startRow)
                    row = sheet.insertAndCopyRow(currentRow, startRow, true);
                else
                    row = sheet.row(currentRow);
                                    
                console.log(`${index+1} ${data.idcard} ${data.name}`);

                row.cell('A').value(index + 1);
                row.cell('B').value(data.name);
                row.cell('C').value(data.idcard);
                row.cell('D').value(data.xzqh);
                row.cell('E').value(data.payAmount);
                row.cell('F').value(data.payMonth);
                row.cell('G').value('是 [ ]');
                row.cell('H').value('否 [ ]');
                row.cell('I').value('是 [ ]');
                row.cell('J').value('否 [ ]');

                currentRow ++;
            });
        });
        workbook.toFileAsync(saveXlsx);
    });
}

const reXzhq = [
    /湘潭市雨湖区((.*?乡)(.*?村))/,
    /湘潭市雨湖区((.*?乡)(.*?政府机关))/,
    /湘潭市雨湖区((.*?街道)办事处(.*?社区))/,
    /湘潭市雨湖区((.*?街道)办事处(.*?政府机关))/,
    /湘潭市雨湖区((.*?镇)(.*?社区))/,
    /湘潭市雨湖区((.*?镇)(.*?居委会))/,
    /湘潭市雨湖区((.*?镇)(.*?村))/,
    /湘潭市雨湖区((.*?街道)办事处(.*?村))/,
    /湘潭市雨湖区((.*?镇)(.*?政府机关))/
]

function splitPaylist() {


}

downloadPaylist();