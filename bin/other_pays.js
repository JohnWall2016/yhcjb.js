'use strict';

const dateFormat = require('dateformat');
const Xlsx = require('xlsx-populate');
const program = require('commander');

const Session = require('../lib/session');
const { 
    OtherPaysRequest, OtherPaysResponse,
    OtherPayListRequest, OtherPayListResponse,
    OtherPayListDetailRequest, OtherPayListDetailResponse,
    OtherPerPayListDetailRequest, OtherPerPayListDetailResponse
} = require('../lib/service');
const { appendToFileName } = require('../lib/util');

const personListXlsx = `D:\\代发管理\\雨湖区城乡居民基本养老保险代发人员名单.xlsx`;
const payListXlsx = `D:\\代发管理\\雨湖区城乡居民基本养老保险代发人员支付明细.xlsx`;

program
    .version('0.0.1')
    .description('代发数据导出制表程序');
program
    .command('personList')
    .arguments('<代发类型> <代发年月>')
    .description('正常代发人员名单导出')
    .action((type, yearMonth) => {
        exportPersonList(personListXlsx, type, yearMonth);
    });
program
    .command('payList')
    .arguments('<业务类型> <支付年月>')
    .description('代发支付明细导出')
    .action((type, yearMonth) => {
        if (Intl.Collator.supportedLocalesOf('zh').length === 0) {
            console.error(`Use 'node --icu-data-dir=node_modules/full-icu <this-script>' to support chinese ordering`);
            process.exit(-1);
        }
        exportPayList(payListXlsx, type, yearMonth);
    });
program
    .on('--help', () => {
        console.log(
            '\n说明\n'+
            '  代发类型: 801 - 独生子女, 802 - 乡村教师, 803 - 乡村医生, 807 - 电影放映员\n' +
            '  业务类型: DF0001 - 独生子女, DF0002 - 乡村教师, DF0003 - 乡村医生, DF0007 - 电影放映员\n' +
            '  代发年月|支付年月: 格式 YYYYMM, 如 201901'
        );
    });
program
    .parse(process.argv);

async function exportPersonList(personListXlsx, type, yearMonth) {
    let workbook = await Xlsx.fromFileAsync(personListXlsx);
    let sheet = workbook.sheet(0);

    let date = dateFormat(new Date(), 'yyyymmdd');
    let dateChn = dateFormat(new Date(), 'yyyy年m月d日');
    let reportDate = `制表时间：${dateChn}`;

    sheet.cell('G2').value(reportDate);

    Session.use('002', session => {
        let [startRow, currentRow] = [4, 4];
        let sum = 0;

        session.send(new OtherPaysRequest(type, '1', '1', {
            pagesize: 500,
            sorting: [{"dataKey":"aaf103","sortDirection":"ascending"}]
        }));
        let response = new OtherPaysResponse(session.get());
        response.datas.forEach(data => {
            if (!data.id) return;
            let payMount = 0;
            //console.log(`standard: ${data.standard}`)
            if (data.standard) {
                let startYear = Math.round(data.startYearMonth / 100);
                let startMonth = data.startYearMonth % 100;
                startMonth -= 1;
                if (startMonth == 0) {
                    startYear -= 1;
                    startMonth = 12;
                }
                if (data.endYearMonth) {
                    startYear = Math.round(data.endYearMonth / 100);
                    startMonth = data.endYearMonth % 100;
                }
                let m; 
                if (m = yearMonth.match(/^(\d\d\d\d)(\d\d)$/)) {
                    let endYear = parseInt(m[1]);
                    let endMonth = parseInt(m[2]);
                    payMount = ((endYear - startYear) * 12 + endMonth - startMonth) * data.standard;
                }
            } else if (data.totalSum == 5000) {
                return;
            }

            let row;
            if (currentRow > startRow)
                row = sheet.insertAndCopyRow(currentRow, startRow, true);
            else
                row = sheet.row(currentRow);
            
            row.cell('A').value(currentRow - startRow + 1);
            row.cell('B').value(data.region);
            row.cell('C').value(data.name);
            row.cell('D').value(data.idcard);
            row.cell('E').value(data.startYearMonth);
            row.cell('F').value(data.standard);
            row.cell('G').value(data.type);
            row.cell('H').value(data.jbStateChn);
            row.cell('I').value(data.endYearMonth);
            row.cell('J').value(data.totalSum);
            row.cell('K').value(payMount);

            sum += payMount;

            currentRow ++;
        });
        let row = sheet.insertAndCopyRow(currentRow, startRow);
        row.cell('A').value('');
        row.cell('C').value('共计');
        row.cell('D').value(currentRow - startRow);
        row.cell('F').value('');
        row.cell('J').value('合计');
        row.cell('K').value(sum);
    });

    let index = personListXlsx.lastIndexOf('.');
    let saveName;
    if (index > 0) {
        saveName = personListXlsx.substring(0, index);
        saveName += `(${OtherPaysResponse.getTypeName(type)})${date}` + personListXlsx.substring(index);
    } else {
        saveName = personListXlsx + `(${OtherPaysResponse.getTypeName(type)})${date}`;
    }
    workbook.toFileAsync(saveName);
}

async function exportPayList(payListXlsx, type, yearMonth) {
    const exportItems = [];
    let totalSum = 0;
    const typeChn = OtherPayListResponse.otherPayTypeChn(type);

    Session.use('002', session => {
        session.send(new OtherPayListRequest({
            type, yearMonth
        }));
        const payList = new OtherPayListResponse(session.get());
        payList.datas.forEach(data => {
            if (data.typeChn) {
                session.send(new OtherPayListDetailRequest(data.payList));
                const payListDetail = new OtherPayListDetailResponse(session.get());
                payListDetail.datas.forEach(detailData => {
                    if (detailData.region && detailData.payFlag === '0') {
                        session.send(new OtherPerPayListDetailRequest({
                            id: detailData.id,
                            payList: detailData.payList,
                            perPayList: detailData.perPayList
                        }));
                        const perPayListDetail = new OtherPerPayListDetailResponse(session.get());
                        let startYearMonth = 0;
                        let endYearMonth = 0;
                        const count = perPayListDetail.rowcount;
                        if (count > 0) {
                            startYearMonth = perPayListDetail.datas[0].yearMonth;
                            if (count > 1) {
                                endYearMonth = perPayListDetail.datas[count - 1].yearMonth;
                            } else {
                                endYearMonth = startYearMonth;
                            }
                        }
                        totalSum += detailData.payAmount;
                        exportItems.push({
                            region: detailData.region,
                            name: detailData.name,
                            idcard: detailData.idcard,
                            type: typeChn,
                            yearMonth: detailData.yearMonth,
                            startYearMonth,
                            endYearMonth,
                            payAmount: detailData.payAmount
                        });
                    }
                });
            }
        });
    });

    exportItems.sort((a, b) => a.region.localeCompare(b.region, 'zh'));
    
    let workbook = await Xlsx.fromFileAsync(payListXlsx);
    let sheet = workbook.sheet(0);

    let date = dateFormat(new Date(), 'yyyymmdd');
    let dateChn = dateFormat(new Date(), 'yyyy年m月d日');
    let reportDate = `制表时间：${dateChn}`;

    sheet.cell('G2').value(reportDate);

    let [startRow, currentRow] = [4, 4];

    for (const data of exportItems) {
        let row;
        if (currentRow > startRow)
            row = sheet.insertAndCopyRow(currentRow, startRow, true);
        else
            row = sheet.row(currentRow);

        row.cell('A').value(currentRow - startRow + 1);
        row.cell('B').value(data.region);
        row.cell('C').value(data.name);
        row.cell('D').value(data.idcard);
        row.cell('E').value(data.type);
        row.cell('F').value(data.yearMonth);
        row.cell('G').value(data.startYearMonth);
        row.cell('H').value(data.endYearMonth);
        row.cell('I').value(data.payAmount);

        currentRow ++;
    }
    let row = sheet.insertAndCopyRow(currentRow, startRow);
    row.cell('C').value('共计');
    row.cell('D').value(currentRow - startRow);
    row.cell('H').value('合计');
    row.cell('I').value(totalSum);

    workbook.toFileAsync(appendToFileName(payListXlsx, `(${typeChn})${date}`));
}