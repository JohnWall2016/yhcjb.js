'use strict';

const fs = require('fs');
const path = require('path');
const Xlsx = require('xlsx-populate');
const program = require('commander');
const { stop } = require('../lib/util');

program
    .version('0.0.1')
    .description('待遇领取人员资格认证表生成程序');

program
    .command('dyrz')
    .arguments('<xlsx> <beginRow> <endRow>')
    .description('生成待遇领取人员资格认证表')
    .action((xlsx, beginRow, endRow) => {
        generateTables(xlsx, beginRow, endRow);
    });

program.parse(process.argv);

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

const rootDir = 'D:\\待遇认证\\2019年';
const tmplXlsx = path.join(rootDir, '城乡居民基本养老保险待遇领取人员资格认证表（表二）.xlsx');
const outputDir = path.join(rootDir, '2019年度雨湖区城乡居民基本养老保险待遇领取人员资格认证表（表二）');

async function generateTables(xlsx, beginRow, endRow) {
    let workbook = await Xlsx.fromFileAsync(xlsx);
    let sheet = workbook.sheet(0);

    // 生成分组映射表
    console.log('生成分组映射表');
    let map = {};
    for (let index = beginRow; index <= endRow; index++) {
        if (sheet.row(index).cell('G').value() != '1') continue;
        let value = sheet.row(index).cell('A').value();
        let m;
        for (let i = 0; i < reXzhq.length; i++) {
            m = value.match(reXzhq[i]);
            if (m) break;
        }
        if (!m) {
            stop(`未匹配行政区划: ${value}`);
        } else {
            let [, , xzj, csq] = m;
            if (!map[xzj]) {
                map[xzj] = {}
            };
            if (!map[xzj][csq]) {
                map[xzj][csq] = [index];
            } else {
                map[xzj][csq].push(index);
            }
        }
    }

    // 生成分组目录并分别生成待遇领取人员资格认证表
    console.log('生成分组目录并分别生成待遇领取人员资格认证表');
    if (fs.existsSync(outputDir)) {
        fs.renameSync(outputDir, outputDir + '.orig');
    }
    fs.mkdirSync(outputDir);

    for (let xzj of Object.keys(map)) {
        console.log(`${xzj}:`);
        fs.mkdirSync(path.join(outputDir, xzj));

        for (let csq of Object.keys(map[xzj])) {
            console.log(`  ${csq}: ${map[xzj][csq]}`);

            let outWorkbook = await Xlsx.fromFileAsync(tmplXlsx);
            let outSheet = outWorkbook.sheet(0);
            let [startRow, currentRow, index] = [5, 5, 0];

            outSheet.cell('C2').value(`${xzj}${csq}`);

            map[xzj][csq].forEach(rowIndex => {
                let row = sheet.row(rowIndex);
                console.log(`    ${index+1} ${row.cell('C').value()} ${row.cell('D').value()}`);
                
                let outRow;
                if (currentRow > startRow)
                    outRow = outSheet.insertAndCopyRow(currentRow, startRow, true);
                else
                    outRow = outSheet.row(currentRow);
                outRow.cell('A').value(index + 1);
                outRow.cell('B').value(row.cell('C').value());
                outRow.cell('C').value(`${row.cell('E').value() == '1' ? '男' : '女'}`);
                outRow.cell('D').value(`${row.cell('D').value()}`);
                outRow.cell('E').value(row.cell('A').value());
                outRow.cell('M').value(`上次认证时间：${row.cell('J').value()}`);

                currentRow ++;
                index ++;
            });

            outWorkbook.toFileAsync(path.join(outputDir, xzj, `${csq}.xlsx`));
        }
    }
}