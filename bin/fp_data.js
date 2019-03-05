'use strict';

const Xlsx = require('xlsx-populate');
const { Database, createFpDb, defineFpBook, defineJbTable } = require('../lib/db');
const { createLogger, getFormattedDate } = require('../lib/util');

const log = createLogger('扶贫数据导入');

/**
 * 导库函数
 * @param { AsyncIterableIterator<{index, idcard, name, detail, complain}> } data
 */
async function mergeFpData(data, { recreate = false, type } = {}) {
    const db = createFpDb();
    const fpBook = defineFpBook(db);

    if (recreate) {
        log.info('重新创建扶贫数据底册');
        await fpBook.sync({ force: true });
    } else {
        await fpBook.sync({ force: false });
    }
    const typeMsg = type ? `: ${type}`: '';

    log.info(`开始合并扶贫数据${typeMsg}`);
    for await (const {index, idcard, name, detail, complain} of data) {
        log.info(`${index} ${idcard} ${name}`);
        if (idcard) {
            let record = await fpBook.findOne({
                where: { idcard }
            });
            if (!record) {
                await fpBook.upsert(detail);
            } else {
                for (const key in detail) {
                    if (record[key]) delete detail[key];
                }
                if (Object.keys(detail).length > 0) {
                    await record.update(detail);
                } else if (complain) {
                    log.info(`${idcard} ${name}: 没有合并任何字段`);
                }
            }
        }
    }
    log.info(`结束合并扶贫数据${typeMsg}`);

    await db.close();
}

async function* fetchPkData({ date, xlsx, beginRow, endRow, complain }) {
    const workbook = await Xlsx.fromFileAsync(xlsx);
    const sheet = workbook.sheet(0);

    for (let index = beginRow; index <= endRow; index ++) {
        const row = sheet.row(index);
        if (row) {
            const name = row.cell('E').value(),
                idcard = String(row.cell('F').value()),
                birthDay = idcard.substr(6, 8),
                xzj = row.cell('C').value(),
                csq = row.cell('D').value();

            let data = {
                index: index - beginRow + 1,
                idcard,
                name,
                detail: {
                    idcard, name, birthDay,
                    xzj, csq,
                    pkrk: '是', 
                    pkrk_date: date,
                    sypkry: '贫困人口'
                },
                complain
            }

            yield data;
        }
    }
}

async function* fetchTkData({ date, xlsx, beginRow, endRow, complain }) {
    const workbook = await Xlsx.fromFileAsync(xlsx);
    const sheet = workbook.sheet(0);

    for (let index = beginRow; index <= endRow; index ++) {
        const row = sheet.row(index);
        if (row) {
            const name = row.cell('F').value(),
                idcard = String(row.cell('G').value()),
                birthDay = idcard.substr(6, 8),
                xzj = row.cell('B').value(),
                csq = row.cell('C').value(),
                address = row.cell('D').value();

            let data = {
                index: index - beginRow + 1,
                idcard,
                name,
                detail: {
                    name, idcard, birthDay,
                    xzj, csq, address,
                    tkry: '是',
                    tkry_date: date,
                    sypkry: '特困人员'
                },
                complain
            }

            yield data;
        }
    }
}

async function* fetchCsdbData({ date, xlsx, beginRow, endRow, complain }) {
    const workbook = await Xlsx.fromFileAsync(xlsx);
    const sheet = workbook.sheet(0);

    const colNameIdcards = [['H','I'],['J','K'],['L','M'],['N','O'],['P','Q']]
    for (let index = beginRow; index <= endRow; index ++) {
        const row = sheet.row(index);
        if (row) {
            const xzj = row.cell('A').value(),
                csq = row.cell('B').value(),
                address = row.cell('D').value();

            let type = row.cell('F').value();
            if (type) type = type.trim();
            if (type != '全额救助' && type != '差额救助') {
                log.error(`城市低保类型有误:${index}行 ${type}`);
                continue;
            }

            for (const [colName, colIdcard] of colNameIdcards) {
                const name = row.cell(colName).value();
                let idcard = String(row.cell(colIdcard).value());
                if (name && idcard) {
                    idcard = idcard.trim().toUpperCase();
                    if (idcard.length == 18) {
                        const birthDay = idcard.substr(6, 8);
                        let data = {
                            index,
                            idcard,
                            name,
                            detail: {
                                name, idcard, birthDay,
                                xzj, csq, address
                            },
                            complain
                        }
                        if (type == '全额救助') {
                            data.detail.qedb = '城市';
                            data.detail.qedb_date = date;
                            data.detail.sypkry = '低保对象';
                        } else if (type == '差额救助') {
                            data.detail.cedb = '城市';
                            data.detail.cedb_date = date;
                            data.detail.sypkry = '低保对象';
                        }
                        yield data;
                    } else {
                        log.error(`城市低保身份证号码有误:${index}行 ${idcard}`);
                    }
                }
            }
        }
    }
}

module.exports.fetchCsdbData = fetchCsdbData;

async function* fetchNcdbData({ date, xlsx, beginRow, endRow, complain }) {
    const workbook = await Xlsx.fromFileAsync(xlsx);
    const sheet = workbook.sheet(0);

    const colNameIdcards = [['H','I'],['J','K'],['L','M'],['N','O'],['P','Q'],['R','S'],['T','U']]
    for (let index = beginRow; index <= endRow; index ++) {
        const row = sheet.row(index);
        if (row) {
            const xzj = row.cell('A').value(),
                csq = row.cell('B').value(),
                address = row.cell('D').value();

            let type = row.cell('F').value();
            if (type) type = type.trim();
            if (type != '全额' && type != '差额') {
                log.error(`农村低保类型有误:${index}行 ${type}`);
                continue;
            }

            for (const [colName, colIdcard] of colNameIdcards) {
                const name = row.cell(colName).value();
                let idcard = String(row.cell(colIdcard).value());
                if (name && idcard) {
                    idcard = idcard.trim().toUpperCase();
                    if (idcard.length == 18) {
                        const birthDay = idcard.substr(6, 8);
                        let data = {
                            index,
                            idcard,
                            name,
                            detail: {
                                name, idcard, birthDay,
                                xzj, csq, address
                            },
                            complain
                        }
                        if (type == '全额') {
                            data.detail.qedb = '农村';
                            data.detail.qedb_date = date;
                            data.detail.sypkry = '低保对象';
                        } else if (type == '差额') {
                            data.detail.cedb = '农村';
                            data.detail.cedb_date = date;
                            data.detail.sypkry = '低保对象';
                        }
                        yield data;
                    } else {
                        log.error(`农村低保身份证号码有误:${index}行 ${idcard}`);
                    }
                }
            }
        }
    }
}

async function* fetchCjData({ date, xlsx, beginRow, endRow, complain }) {
    const workbook = await Xlsx.fromFileAsync(xlsx);
    const sheet = workbook.sheet(0);

    for (let index = beginRow; index <= endRow; index ++) {
        const row = sheet.row(index);
        if (row) {
            const name = row.cell('A').value(),
                idcard = String(row.cell('B').value()).substr(0, 18),
                birthDay = idcard.substr(6, 8),
                xzj = row.cell('G').value(),
                address = row.cell('F').value(),
                level = row.cell('D').value().trim();

            const detail = {
                idcard, name, birthDay,
                xzj, address,
            }

            switch (level) {
                case '一级':
                case '二级':
                    detail.yejc = level;
                    detail.yejc_date = date;
                    break;
                case '三级':
                case '四级':
                    detail.ssjc = level;
                    detail.ssjc_date = date;
                    break;
                default:
                    log.error(`残疾级别有误:${index}行 ${level}`);
                    continue;
            }

            let data = {
                index: index - beginRow + 1,
                idcard,
                name,
                detail,
                complain
            }

            yield data;
        }
    }
}

function mergeData({ type, fetchFunc, date, xlsx, beginRow, endRow,
    complain = false, recreate = false }) {
    mergeFpData(
        fetchFunc({
            date, xlsx,
            beginRow: Number(beginRow),
            endRow:   Number(endRow),
            complain
        }),
        { recreate, type }
    );
}

const typeMap = {
    pkrk: {
        name: '贫困人口',
        jbsf: '贫困人口一级'
    },
    tkry: {
        name: '特困人员',
        jbsf: '特困一级'
    },
    qedb: {
        name: '全额低保人员',
        jbsf: '低保对象一级'
    },
    yejc: {
        name: '一二级残疾人员',
        jbsf: '残一级'
    },
    cedb: {
        name: '差额低保人员',
        jbsf: '低保对象二级'
    },
    ssjc: {
        name: '三四级残疾人员',
        jbsf: '残二级'
    }
 }

async function affirmIdentity(date, findOptions) {
    const db = createFpDb();
    const fpBook = defineFpBook(db);
    await fpBook.sync({ force: false });

    log.info('开始认定参保人员身份');

    const data = await fpBook.findAll(findOptions);
    let i = 1;
    for (const d of data) {
        let jbrdsf;
        for (const type in typeMap) {
            if (d[type]) {
                jbrdsf = typeMap[type].jbsf;
                break;
            }
        }

        if (d.jbrdsf !== jbrdsf) {
            if (d.jbrdsf) { // hoist level
                log.info(`${i++} ${d.idcard} ${d.name} ${jbrdsf} <= ${d.jbrdsf}`);
                await d.update({ jbrdsf, jbrdsf_last_date: date });
            } else { // newly affirm
                log.info(`${i++} ${d.idcard} ${d.name} ${jbrdsf}`);
                await d.update({ jbrdsf, jbrdsf_first_date: date });
            }
        }
    }

    log.info('结束认定参保人员身份');

    await db.close();
}

const exportMap = ({
    A: 'index',
    B: 'no',
    C: 'xzj',
    D: 'csq',
    E: 'address',
    F: 'name',
    G: 'idcard',
    H: 'birthDay',
    I: 'pkrk',
    J: 'pkrk_date',
    K: 'tkry',
    L: 'tkry_date',
    M: 'qedb',
    N: 'qedb_date',
    O: 'cedb',
    P: 'cedb_date',
    Q: 'yejc',
    R: 'yejc_date',
    S: 'ssjc',
    T: 'ssjc_date',
    U: 'sypkry',
    V: 'jbrdsf',
    W: 'jbrdsf_first_date',
    X: 'jbrdsf_last_date',
    Y: 'jbcbqk',
    Z: 'jbcbqk_date'
});

async function exportData(tmplXlsx, saveXlsx, findOptions) {
    const db = createFpDb();
    const fpBook = defineFpBook(db);
    await fpBook.sync({ force: false });

    log.info('开始导出扶贫底册');

    const data = await fpBook.findAll(findOptions);
    const workbook = await Xlsx.fromFileAsync(tmplXlsx);
    const sheet = workbook.sheet(0);
    let [startRow, currentRow] = [3, 3];
    for (const d of data) {
        let row;
        if (currentRow > startRow)
            row = sheet.insertAndCopyRow(currentRow, startRow, false);
        else
            row = sheet.row(currentRow);

        d.index = currentRow - startRow + 1;

        log.info(`${d.index} ${d.idcard} ${d.name}`);

        for (const key in exportMap) {
            const value = exportMap[key];
            const data = d[value];
            if (data) row.cell(key).value(data);
        }

        currentRow ++;
    }

    await workbook.toFileAsync(saveXlsx);

    log.info('结束导出扶贫底册');

    await db.close();
}

async function importJbdata(xlsx, startRow, endRow, recreate) {
    const db = createFpDb();
    const jbTable = defineJbTable(db);

    if (recreate) {
        log.info('重新创建居保参保人员明细表');
        await jbTable.sync({ force: true });
    }
    else {
        await jbTable.sync({ force: false });
    }

    log.info('开始导入居保参保人员明细表');

    await db.loadXlsx({
        tableName: jbTable.name,
        xlsx, startRow, endRow,
        mappings: {
            A: 'S', B: 'S', C: 'S', D: 'S',
            E: 'S', F: 'S', H: 'S', J: 'S',
            K: 'S', N: 'S'
        }
    });

    log.info('结束导入居保参保人员明细表');

    await db.close();
}

const jbztMap = [
    [1, 3, '正常待遇'],[2, 3, '暂停待遇'],[4, 3, '终止参保'],
    [1, 1, '正常缴费'],[2, 2, '暂停缴费']
];

async function updateJbzt(date) {
    const db = createFpDb();

    const fpBook = defineFpBook(db);
    await fpBook.sync({ force: false });

    const jbTable = defineJbTable(db);
    await jbTable.sync({ force: false });

    const fpBookFlds = fpBook.getFieldNames();
    const jbTableFlds = jbTable.getFieldNames();

    for (const [cbzt, jfzt, jbzt] of jbztMap) {
        const sql = `
update ${fpBook.name}, ${jbTable.name}
   set ${fpBookFlds.jbcbqk} = '${jbzt}', ${fpBookFlds.jbcbqk_date} = '${date}'
 where ${fpBookFlds.idcard}=${jbTableFlds.idcard} and
       ${jbTableFlds.cbzt}='${cbzt}' and ${jbTableFlds.jfzt}='${jfzt}' and
       (${fpBookFlds.jbcbqk_date} is null or 
        (${fpBookFlds.jbcbqk} is null or ${fpBookFlds.jbcbqk} <> '${jbzt}'))`;

        log.info(sql);

        await db.query(sql);
    }

    await db.close();
}

const program = require('commander');

program
    .version('0.0.1')
    .description('扶贫数据导库程序');

program
    .command('pkrk')
    .arguments('<date:yyyymm> <xlsx> <beginRow> <endRow>')
    .description('合并贫困人口数据')
    .usage(String.raw`201902 D:\\精准扶贫\\201902\\7372人贫困人口台账.xlsx 2 7373`)
    .action((date, xlsx, beginRow, endRow) => {
        mergeData({
            type: '贫困人口', fetchFunc: fetchPkData,
            date, xlsx, beginRow, endRow
        });
    });

program
    .command('tkry')
    .arguments('<date:yyyymm> <xlsx> <beginRow> <endRow>')
    .description('合并特困人员数据')
    .usage(String.raw`201902 D:\\精准扶贫\\201902\\城乡特困201902.xlsx 2 949`)
    .action((date, xlsx, beginRow, endRow) => {
        mergeData({
            type: '特困人员', fetchFunc: fetchTkData,
            date, xlsx, beginRow, endRow
        });
    });

program
    .command('csdb')
    .arguments('<date:yyyymm> <xlsx> <beginRow> <endRow>')
    .description('合并城市低保数据')
    .usage(String.raw`201902 D:\\精准扶贫\\201902\\2019年2月城市名册.xlsx 2 6531`)
    .action((date, xlsx, beginRow, endRow) => {
        mergeData({
            type: '城市低保', fetchFunc: fetchCsdbData,
            date, xlsx, beginRow, endRow
        });
    });

program
    .command('ncdb')
    .arguments('<date:yyyymm> <xlsx> <beginRow> <endRow>')
    .description('合并农村低保数据')
    .usage(String.raw`201902 D:\\精准扶贫\\201902\\2019年2月雨湖区农村低保名册.xlsx 2 2232`)
    .action((date, xlsx, beginRow, endRow) => {
        mergeData({
            type: '农村低保', fetchFunc: fetchNcdbData,
            date, xlsx, beginRow, endRow
        });
    });

program
    .command('cjry')
    .arguments('<date:yyyymm> <xlsx> <beginRow> <endRow>')
    .description('合并残疾人员数据')
    .usage(String.raw`201902 D:\\精准扶贫\\201902\\雨湖区全区残疾人20190219.xlsx 2 10212`)
    .action((date, xlsx, beginRow, endRow) => {
        mergeData({
            type: '残疾人员', fetchFunc: fetchCjData,
            date, xlsx, beginRow, endRow
        });
    });

program
    .command('rdsf')
    .arguments('<date:yyyymm> [idcards]')
    .description('认定居保身份')
    .usage(String.raw`201902`)
    .action((date) => {
        const idcards = process.argv.slice(4);
        let findOptions = {}
        if (idcards.length > 0) {
            const where = [];
            for (const idcard of idcards) {
                where.push({ idcard });
            }
            findOptions = {
                where: {
                  [Database.Op.or]: where
                }
            }
        }
        affirmIdentity(date, findOptions);
    });

program
    .command('drjb')
    .arguments('<xlsx> <beginRow> <endRow> [\'recreate\']')
    .description('导入居保参保人员明细表')
    .usage(String.raw`D:\\精准扶贫\\居保参保人员明细表20190305A.xlsx 2 49858 recreate`)
    .usage(String.raw`D:\\精准扶贫\\居保参保人员明细表20190305B.xlsx 2 48726`)
    .action((xlsx, beginRow, endRow, recreate) => {
        importJbdata(xlsx, beginRow, endRow, recreate === 'recreate');
    });

program
    .command('jbzt')
    .arguments('<date:yyyymmdd>')
    .description('更新居保参保状态')
    .action((date) => {
        updateJbzt(date);
    });

program
    .command('dcsj')
    .arguments('[idcards]')
    .description('导出扶贫底册数据')
    .action(() => {
        const idcards = process.argv.slice(3);
        let findOptions = {}
        if (idcards.length > 0) {
            const where = [];
            for (const idcard of idcards) {
                where.push({ idcard });
            }
            findOptions = {
                where: {
                  [Database.Op.or]: where
                }
            }
        }
        const tmplXlsx = 'D:\\精准扶贫\\雨湖区精准扶贫底册模板.xlsx';
        const saveXlsx = `D:\\精准扶贫\\雨湖区精准扶贫底册${getFormattedDate()}.xlsx`;
        exportData(tmplXlsx, saveXlsx, findOptions);
    });

program
    .command('sfbg')
    .arguments('<dir> <rddate:yyyymm> <sfdate:yyyymmdd>')
    .description('导出居保参保身份变更信息表')
    .action((dir, rddate, sfdate) => {
        // export data whose created or changed affirming identity date equals rddate
        //               and created JB identity date equals or after sfdate.
    });

program.parse(process.argv);