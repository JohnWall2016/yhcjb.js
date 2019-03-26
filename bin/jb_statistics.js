'use strict';

const program = require('commander');
const Xlsx = require('xlsx-populate');

program
    .version('0.0.1')
    .description('数据统计程序');

program
    .command('cert')
    .arguments('<xlsx> <beginRow> <endRow> <year:yyyy>')
    .description('统计认证数据')
    .action((xlsx, beginRow, endRow, year) => {
        certData(xlsx, beginRow, endRow, year);
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
    /湘潭市雨湖区((.*?镇)(.*?政府机关))/,
    /湘潭市雨湖区((.*?街道)办事处(.*?农场))/,
]

async function certData(xlsx, beginRow, endRow, year) {
    const workbook = await Xlsx.fromFileAsync(xlsx);
    const sheet = workbook.sheet(0);
    let result = new Map();

    for (let index = beginRow; index <= endRow; index ++) {
        const row = sheet.row(index);

        let certDate = row.cell('L').value(),
            area = row.cell('A').value(),
            type = row.cell('H').value(),
            m;

        if (certDate.indexOf(year) === 0) {
            for (let i = 0; i < reXzhq.length; i++) {
                m = area.match(reXzhq[i]);
                if (m) break;
            }
            if (!m) {
                console.log(`未匹配行政区划: ${area}`);
                process.exit(-1);
            }
            let [, , xzj] = m;
            let data = result.get(xzj);
            if (!data) {
                data = { inst: 0, phone: 0, other: 0 };
                result.set(xzj, data);
            }
            if (type === '01') data.inst += 1;
            else if (type === '02') data.phone += 1;
            else if (type === '05') data.other += 1;
        }
    }

    console.log(result);
    for (let [xzj, data] of result) {
        console.log(`${xzj}\t${data.phone}\t${data.inst}`);
    }
}