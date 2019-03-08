'use strict';

const program = require('commander');
const Xlsx = require('xlsx-populate');
const Session = require('../lib/session');
const { GrinfoRequest, GrinfoResponse } = require('../lib/service');
const { appendToFileName } = require('../lib/util');
const fs = require('fs'), path = require('path');

program
    .version('0.0.1')
    .description('待遇人员信息核实程序');

program
    .command('fetch')
    .arguments('<xlsx> <beginRow> <endRow>')
    .description('获取并更新居保状态信息')
    .action((xlsx, beginRow, endRow) => {
        fetch(xlsx, beginRow, endRow);
    });

program
    .command('split')
    .arguments("<type:'sfzt'|'sczt'> <xlsx> <beginRow> <endRow>")
    .description('核查信息按街道分组')
    .action((type, xlsx, beginRow, endRow) => {
        split(type, xlsx, beginRow, endRow);
    });

program.parse(process.argv);

async function fetch(xlsx, beginRow, endRow) {
    const workbook = await Xlsx.fromFileAsync(xlsx);
    const sheet = workbook.sheet(0);

    Session.use('002', session => {
        for (let index = beginRow; index <= endRow; index ++) {
            const row = sheet.row(index);
            if (row) {
                const name = row.cell('C').value();
                const idcard = row.cell('D').value();
                let state = '', czmc = '';

                session.send(new GrinfoRequest(idcard));
                let response = new GrinfoResponse(session.get());

                let info = response.datas[0];
                if (!info || !info.idcard) {
                    state = '未查询到信息';
                } else {
                    czmc = info.czmc;
                    state = info.state;
                }

                console.log(`${idcard} ${name} ${state} ${czmc}`);
                row.cell('E').value(czmc);
                row.cell('F').value(state);
            }
        }
    });

    workbook.toFileAsync(appendToFileName(xlsx, '.new'));
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

const xzqhMap = {
    "长城乡":     "43030201",
    "昭潭街道":   "43030202",
    "先锋街道":   "43030203",
    "万楼街道":   "43030204",
    "楠竹山镇":   "43030206",
    "姜畲镇":     "43030207",
    "鹤岭镇":     "43030208",
    "城正街街道": "43030209",
    "雨湖路街道": "43030210",
    "云塘街道":   "43030212",
    "窑湾街道":   "43030213",
    "广场街道":   "43030215",
}

const rootDir = 'D:\\数据核查\\待遇领取人员信息核实\\核实数据';

async function split(type, xlsx, beginRow, endRow) {
    let workbook = await Xlsx.fromFileAsync(xlsx);
    let sheet = workbook.sheet(0);

    console.log('生成分组映射表');
    let map = {};
    for (let index = beginRow; index <= endRow; index++) {
        let value = sheet.row(index).cell('E').value();
        let reason = sheet.row(index).cell('G').value();
        if (reason || !value) continue;
        let m;
        for (let i = 0; i < reXzhq.length; i++) {
            m = value.match(reXzhq[i]);
            if (m) break;
        }
        if (!m) {
            stop(`未匹配行政区划: ${value}`);
        } else {
            let [, , xzj] = m;
            if (!map[xzj]) {
                map[xzj] = [];
            };
            map[xzj].push(index);
        }
    }

    console.log('生成分组文件');
    let outputDir = '', tmplXlsx = '', infoXlsx = '', fileName = '';
    switch (type) {
        case 'sfzt':
            outputDir = `${rootDir}\\身份状态疑点信息`;
            tmplXlsx = `${rootDir}\\身份状态疑点信息核查情况汇总表模板.xlsx`;
            infoXlsx = `${rootDir}\\身份状态疑点信息核查情况表模板.xlsx`;
            fileName = '身份状态疑点信息核查情况汇总表.xlsx';
            break;
        case 'sczt':
            outputDir = `${rootDir}\\生存状态疑点信息`;
            tmplXlsx = `${rootDir}\\生存状态疑点信息核查情况汇总表模板.xlsx`;
            infoXlsx = `${rootDir}\\生存状态疑点信息核查情况表模板.xlsx`;
            fileName = '生存状态疑点信息核查情况汇总表.xlsx';
            break;
        default:
            console.error('未知疑点信息类型');
            break;
    }
    if (fs.existsSync(outputDir)) {
        fs.renameSync(outputDir, outputDir + '.orig');
    }
    fs.mkdirSync(outputDir);

    for (let xzj of Object.keys(map)) {
        console.log(`${xzj}:`);
        fs.mkdirSync(path.join(outputDir, xzj));
        
        let outWorkbook = await Xlsx.fromFileAsync(tmplXlsx);
        let outSheet = outWorkbook.sheet(0);
        let [startRow, currentRow] = [4, 4];

        outSheet.cell('D2').value(xzj);

        for (let index = 0; index < map[xzj].length; index ++) {
            let rowIndex = map[xzj][index];
            let outRow;
            if (currentRow > startRow)
                outRow = outSheet.insertAndCopyRow(currentRow, startRow, true);
            else
                outRow = outSheet.row(currentRow);

            let row = sheet.row(rowIndex);

            console.log(`  ${index+1} ${row.cell('D').value()} ${row.cell('C').value()}`);

            outRow.cell('A').value(index + 1);
            ['B', 'C', 'D', 'E', 'F'].forEach(col => {
                outRow.cell(col).value(row.cell(col).value());
            });

            let infoWorkbook = await Xlsx.fromFileAsync(infoXlsx);
            let infoSheet = infoWorkbook.sheet(0);

            const idcard = row.cell('D').value();
            const name = row.cell('C').value();
            const code = xzqhMap[xzj];

            infoSheet.cell('C2').value(idcard);
            infoSheet.cell('D6').value(code);
            infoSheet.cell('I6').value(xzj);
            infoSheet.cell('D7').value(name);
            infoSheet.cell('I7').value(idcard);

            infoWorkbook.toFileAsync(path.join(outputDir, xzj, `${index+1}.${name}[${idcard}]核查情况表.xlsx`));

            currentRow ++;
        }

        outWorkbook.toFileAsync(path.join(outputDir, xzj, `0.${xzj}${fileName}`));
    }
}