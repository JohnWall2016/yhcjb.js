'use strict';

const fs = require('fs');
const path = require('path');

const dateFormat = require('dateformat');
const Xlsx = require('xlsx-populate');
const program = require('commander');

const Session = require('../lib/session');
const { 
    DyshInfoRequest, DyshInfoResponse, 
    BankAccountInfoRequest, BankAccountInfoResponse  
} = require('../lib/service');

function stop(msg, code = -1) {
    console.error(msg);
    process.exit(code);
}

function getYearMonth(yearMonth) {
    let m
    if (m = yearMonth.match(/^(\d\d\d\d)(\d\d)$/)) {
        return [m[1], `${m[2][0]=='0'?m[2].substr(1):m[2]}`];
    } else {
        stop('年月格式有误');
    }
}

const rootDir = 'D:\\待遇核定';
const infoXlsx = `${rootDir}\\信息核对报告表模板.xlsx`;
const payInfoXslx = `${rootDir}\\养老金计算表模板.xlsx`;

program
    .version('0.0.1')
    .description('信息核对报告表和养老金计算表生成程序')
program
    .command('download')
    .arguments('<年月>')
    .description(
        '从业务系统下载信息核对报告表'
    )
    .action((yearMonth) => {
        getYearMonth(yearMonth);
        const saveXlsx = `${rootDir}\\信息核对报告表模板${yearMonth}.xlsx`;
        downloadPaylist(infoXlsx, saveXlsx);
    })
program
    .command('split')
    .arguments('<年月> <开始行> <结束行>')
    .description(
        '对下载的信息表分组并生成养老金计算表'
    )
    .action((yearMonth, start, end) => {
        const [year, month] = getYearMonth(yearMonth);
        if ((start = parseInt(process.argv[4])) &&
            (end = parseInt(process.argv[5]))) {
            const saveXlsx = `${rootDir}\\信息核对报告表模板${yearMonth}.xlsx`;
            const outputDir = `${rootDir}\\${year}年${month}月待遇核定数据`;
            splitPaylist(infoXlsx, saveXlsx, payInfoXslx, outputDir, start, end);
        } else {
            stop('split 命令后应跟 开始 结束 行号');
        }
    })
program.on('--help', () => {
    console.log(
        '\n说明\n'+
        '  年月: 格式 YYYYMM, 如 201901'
    );
})
program.parse(process.argv);

function downloadPaylist(infoXlsx, saveXlsx) {
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

async function splitPaylist(infoXlsx, saveXlsx, payInfoXslx, outputDir, start, end) {
    let workbook = await Xlsx.fromFileAsync(saveXlsx);
    let sheet = workbook.sheet(0);

    // 生成分组映射表
    console.log('生成分组映射表');
    let map = {};
    for (let index = start; index <= end; index++) {
        let value = sheet.row(index).cell('D').value();
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

    // 生成分组目录并分别生成信息核对报告表
    console.log('生成分组目录并分别生成信息核对报告表');
    if (fs.existsSync(outputDir)) {
        fs.renameSync(outputDir, outputDir + '.orig');
    }
    fs.mkdirSync(outputDir);

    for (let xzj of Object.keys(map)) {
        console.log(`${xzj}:`);
        fs.mkdirSync(path.join(outputDir, xzj));

        for (let csq of Object.keys(map[xzj])) {
            console.log(`  ${csq}: ${map[xzj][csq]}`);
            fs.mkdirSync(path.join(outputDir, xzj, csq));

            let outWorkbook = await Xlsx.fromFileAsync(infoXlsx);
            let outSheet = outWorkbook.sheet(0);
            let [startRow, currentRow] = [4, 4];

            map[xzj][csq].forEach((rowIndex, index) => {
                let outRow;
                if (currentRow > startRow)
                    outRow = outSheet.insertAndCopyRow(currentRow, startRow, true);
                else
                    outRow = outSheet.row(currentRow);

                let row = sheet.row(rowIndex);

                console.log(`    ${index+1} ${row.cell('C').value()} ${row.cell('B').value()}`);

                outRow.cell('A').value(index + 1);
                outRow.cell('B').value(row.cell('B').value());
                outRow.cell('C').value(row.cell('C').value());
                outRow.cell('D').value(row.cell('D').value());
                outRow.cell('E').value(row.cell('E').value());
                outRow.cell('F').value(row.cell('F').value());
                outRow.cell('G').value('是 [ ]');
                outRow.cell('H').value('否 [ ]');
                outRow.cell('I').value('是 [ ]');
                outRow.cell('J').value('否 [ ]');
                outRow.cell('L').value(row.cell('L').value());

                currentRow ++;
            });

            outWorkbook.toFileAsync(path.join(outputDir, xzj, csq, `${csq}信息核对报告表.xlsx`));
        }
    }

    // 按分组生成养老金养老金计算表
    console.log('按分组生成养老金养老金计算表');
    Session.use('002', session => {
        function getPaymentReport(name, idcard, outdir, retry = 3) {
            session.send(new DyshInfoRequest({
                idcard,
                shzt: '0'
            }));
            let dyshInfo = new DyshInfoResponse(session.get());
            if (dyshInfo.datas && dyshInfo.datas[0]) {
                session.send(new BankAccountInfoRequest(idcard));
                let bankAccountInfo = new BankAccountInfoResponse(session.get());
                let payInfo = dyshInfo.datas[0].paymentInfo;
                while (!payInfo) {
                    if (--retry > 1) {
                        payInfo = dyshInfo.datas[0].paymentInfo;
                    } else {
                        throw new Error('养老金计算信息无效');
                    }
                }
                Xlsx.fromFileAsync(payInfoXslx).then(workbook => {
                    let sheet = workbook.sheet(0);
                    sheet.cell('A5').value(payInfo[1]);
                    sheet.cell('B5').value(payInfo[2]);
                    sheet.cell('C5').value(payInfo[3]);
                    sheet.cell('F5').value(payInfo[4]);
                    sheet.cell('H5').value(payInfo[5]);
                    sheet.cell('K5').value(payInfo[6]);

                    sheet.cell('A8').value(payInfo[7]);
                    sheet.cell('B8').value(payInfo[8]);
                    sheet.cell('C8').value(payInfo[9]);
                    sheet.cell('E8').value(payInfo[10]);
                    sheet.cell('F8').value(payInfo[11]);
                    sheet.cell('G8').value(payInfo[12]);
                    sheet.cell('H8').value(payInfo[13]);
                    sheet.cell('I8').value(payInfo[14]);
                    sheet.cell('J8').value(payInfo[15]);
                    sheet.cell('K8').value(payInfo[16]);
                    sheet.cell('L8').value(payInfo[17]);

                    sheet.cell('A11').value(payInfo[18]);
                    sheet.cell('B11').value(payInfo[19]);
                    sheet.cell('C11').value(payInfo[20]);
                    sheet.cell('D11').value(payInfo[21]);
                    sheet.cell('E11').value(payInfo[22]);
                    sheet.cell('F11').value(payInfo[23]);
                    sheet.cell('G11').value(payInfo[24]);
                    sheet.cell('H11').value(payInfo[25]);
                    sheet.cell('I11').value(payInfo[26]);
                    sheet.cell('J11').value(payInfo[27]);
                    sheet.cell('K11').value(payInfo[28]);
                    sheet.cell('L11').value(payInfo[29]);

                    sheet.cell('H12').value(
                        `制表时间：${dateFormat(new Date(), 'yyyy-mm-dd HH:MM:ss')}`
                    );

                    if (bankAccountInfo.datas && 
                        bankAccountInfo.datas[0] &&
                        bankAccountInfo.datas[0].name) {
                        let d = bankAccountInfo.datas[0];
                        //console.log(`${d.name} ${d.bankType} ${d.bankName}`);
                        if (d.name) sheet.cell('B15').value(d.name);
                        let bankName = d.bankName;
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
                }).catch(err => {
                    console.error(`${idcard} ${name} 获得养老金计算信息岀错: ${err}`);
                    console.error(err);
                });
            } else {
                console.error(`${idcard} ${name} 未查到该人员核定数据`);
            }
        }

        for (let xzj of Object.keys(map)) {
            for (let csq of Object.keys(map[xzj])) {
                map[xzj][csq].forEach(index => {
                    let row = sheet.row(index);
                    let name = row.cell('B').value();
                    let idcard = row.cell('C').value();

                    console.log(`  ${idcard} ${name}`);
                    getPaymentReport(name, idcard, path.join(outputDir, xzj, csq));
                });
            }
        }
    });
}