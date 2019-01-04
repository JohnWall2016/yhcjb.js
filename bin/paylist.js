'use strict';

const Xlsx = require('xlsx-populate')
const { Session, Service } = require('../lib/session');
const { fromJson, Data, DyshInfo } = Service;

if (process.argv.length != 3) {
    console.log('node <this file> YearMonth');
    console.log('  YearMonth: YYYYMM, 201901');
    process.exit(-1);
}

const yearMonth = process.argv[2];

const infoXlsx = 'D:\\待遇核定\\信息核对报告表模板.xlsx';
const saveXlsx = `D:\\待遇核定\\信息核对报告表模板${yearMonth}.xlsx`;

function downloadPaylist() {
    Xlsx.fromFileAsync(infoXlsx)
        .then(workbook => {
            let sheet = workbook.sheet(0);
            let [startRow, currentRow] = [4, 4];

            Session.use('002', s => {
                s.send(DyshInfo.request({
                    shzt: '0',
                    options: {
                        pagesize: 500,
                        sorting: [{"dataKey":"aaa027","sortDirection":"ascending"}]
                    }
                }));
                let rep = fromJson(s.get());
                rep.datas.forEach((value, index) => {
                    let row;
                    if (currentRow > startRow)
                        row = sheet.insertAndCopyRow(currentRow, startRow, true);
                    else
                        row = sheet.row(currentRow);
                    let data = new Data(value, DyshInfo.response);
                    
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

const outputDir = '';

function splitPaylist() {


}

downloadPaylist();