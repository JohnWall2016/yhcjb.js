'use strict';

const Xlsx = require('xlsx-populate');
const { Database, createFpDb, defineFpBook, defineFpHistoryBook, defineJbTable } = require('../lib/db');
const { createLogger, getFormattedDate } = require('../lib/util');
const fs = require('fs');

const log = createLogger('扶贫数据导入');

/**
 * 合并扶贫数据函数
 * @param { AsyncIterableIterator<> } data
 */
async function mergeFpData(tableName, data, recreate = false) {
    const db = createFpDb();
    const fpBook = defineFpBook(db, tableName);

    if (recreate) {
        log.info(`重新创建${tableName}`);
        await fpBook.sync({ force: true });
    } else {
        await fpBook.sync({ force: false });
    }

    log.info(`开始合并扶贫数据至: ${tableName}`);
    let index = 1;
    for await (const d of data) {
        log.info(`${index++} ${d.idcard} ${d.name}`);
        if (d.idcard) {
            let record = await fpBook.findOne({
                where: { idcard: d.idcard }
            });
            if (!record) {
                await fpBook.upsert(d);
            } else {
                for (const key in d) {
                    if (record[key]) delete d[key];
                }
                if (Object.keys(d).length > 0) {
                    await record.update(d);
                }
            }
        }
    }
    log.info(`结束合并扶贫数据至: ${tableName}`);

    await db.close();
}

/**
 * 导入扶贫数据函数
 * @param { AsyncIterableIterator<{idcard, name, birthDay, xzj, csq, address, type, detail, date}> } data
 */
async function importFpData(data, { recreate = false, type } = {}) {
    const db = createFpDb();
    const fpBook = defineFpHistoryBook(db);

    if (recreate) {
        log.info('重新创建扶贫历史数据底册');
        await fpBook.sync({ force: true });
    } else {
        await fpBook.sync({ force: false });
    }
    const typeMsg = type ? `: ${type}`: '';

    log.info(`开始导入扶贫数据${typeMsg}`);
    let index = 1;
    for await (const d of data) {
        log.info(`${index++} ${d.idcard} ${d.name}`);
        if (d.idcard) {
            let record = await fpBook.findOne({
                where: { idcard: d.idcard, type: d.type, date: d.date }
            });
            if (!record) {
                await fpBook.upsert(d);
            } else {
                await record.update(d);
            }
        }
    }
    log.info(`结束导入扶贫数据${typeMsg}`);

    await db.close();
}

/**
 * 迭代获取贫困数据
 * @param {*} param0 
 */
async function* fetchPkData({ date, xlsx, beginRow, endRow }) {
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
                idcard,
                name,
                birthDay,
                xzj, 
                csq,
                type: '贫困人口',
                detail: '是',
                date
            }

            yield data;
        }
    }
}

async function* fetchPkData2({ date, xlsx, beginRow, endRow }) {
    const workbook = await Xlsx.fromFileAsync(xlsx);
    const sheet = workbook.sheet(0);

    for (let index = beginRow; index <= endRow; index ++) {
        const row = sheet.row(index);
        if (row) {
            const name = row.cell('H').value(),
                idcard = String(row.cell('I').value()).substr(0, 18),
                birthDay = idcard.substr(6, 8),
                xzj = row.cell('C').value(),
                csq = row.cell('D').value();

            let data = {
                idcard,
                name,
                birthDay,
                xzj, 
                csq,
                type: '贫困人口',
                detail: '是',
                date
            }

            yield data;
        }
    }
}

/**
 * 迭代获取特困数据
 * @param {*} param0 
 */
async function* fetchTkData({ date, xlsx, beginRow, endRow }) {
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
                idcard,
                name,
                birthDay,
                xzj, 
                csq, 
                address,
                type: '特困人员',
                detail: '是',
                date
            }

            yield data;
        }
    }
}

async function* fetchTkData2({ date, xlsx, beginRow, endRow }) {
    const workbook = await Xlsx.fromFileAsync(xlsx);
    const sheet = workbook.sheet(0);

    for (let index = beginRow; index <= endRow; index ++) {
        const row = sheet.row(index);
        if (row) {
            const name = row.cell('C').value(),
                idcard = String(row.cell('D').value()),
                birthDay = idcard.substr(6, 8),
                xzj = row.cell('A').value(),
                csq = row.cell('B').value();

            let data = {
                idcard,
                name,
                birthDay,
                xzj, 
                csq,
                type: '特困人员',
                detail: '是',
                date
            }

            yield data;
        }
    }
}

/**
 * 迭代获取城市低保数据
 * @param {*} param0 
 */
async function* fetchCsdbData({ date, xlsx, beginRow, endRow }) {
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
                            idcard,
                            name,
                            birthDay,
                            xzj,
                            csq,
                            address,
                            detail: '城市',
                            date
                        };
                        if (type == '全额救助') {
                            data.type = '全额低保人员';
                        } else if (type == '差额救助') {
                            data.type = '差额低保人员';
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

/**
 * 迭代获取农村低保数据
 * @param {*} param0 
 */
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
                            idcard,
                            name,
                            birthDay,
                            xzj,
                            csq,
                            address,
                            detail: '农村',
                            date
                        }
                        if (type == '全额') {
                            data.type = '全额低保人员';
                        } else if (type == '差额') {
                            data.type = '差额低保人员';
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

/**
 * 迭代获取残疾数据
 * @param {*} param0 
 */
async function* fetchCjData({ date, xlsx, beginRow, endRow }) {
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

            let data = {
                idcard,
                name,
                birthDay,
                xzj,
                address,
                date
            }

            switch (level) {
                case '一级':
                case '二级':
                    data.type = '一二级残疾人员';
                    data.detail = level;
                    break;
                case '三级':
                case '四级':
                    data.type = '三四级残疾人员';
                    data.detail = level;
                    break;
                default:
                    log.error(`残疾级别有误:${index}行 ${level}`);
                    continue;
            }

            yield data;
        }
    }
}

/**
 * 合并扶贫数据
 * @param {string} tableName 
 * @param {string} date 
 * @param { { pkry: boolean, recreate: boolean } } param2
 *  pkry: 是否只合并贫困人员数据, recreate: 重建数据表
 */
function mergeData(tableName, date, { pkry = false, recreate = false } = {}) {
    const del = ['no', 'type', 'detail', 'date'];
    const mappings = {
        '贫困人口': {
            ins: { pkrk: '是', sypkry: '贫困人口' }, 
            map: { pkrk_date: 'date' }, 
            del
        },
        '特困人员': {
            ins: { tkry: '是', sypkry: '特困人员' }, 
            map: { tkry_date: 'date' },
            del
        },
        '全额低保人员': {
            ins: { sypkry: '低保对象' }, 
            map: { qedb: 'detail', qedb_date: 'date' },
            del
        },
        '差额低保人员':  {
            ins: { sypkry: '低保对象' }, 
            map: { cedb: 'detail', cedb_date: 'date' },
            del
        },
        '一二级残疾人员':  {
            map: { yejc: 'detail', yejc_date: 'date' },
            del
        },
        '三四级残疾人员':  {
            map: { ssjc: 'detail', ssjc_date: 'date' },
            del
        },
    };

    async function* fetchFunc(date) {
        const db = createFpDb();
        const fpHBook = defineFpHistoryBook(db);

        let types = Object.keys(mappings);
        if (pkry) {
            types = [ '贫困人口', '特困人员', '全额低保人员', '差额低保人员' ];
        }
        for (const type of types) {
            log.info(`开始获取并转换: ${type}`);
            let records = await fpHBook.findAll({
                where: { type, date }
            });

            const mapping = mappings[type];
            for (let data of records) {
                data = data.dataValues;
                Object.assign(data, mapping.ins);
                for (const [k, v] of Object.entries(mapping.map)) {
                    data[k] = data[v];
                }
                for (const k of mapping.del) {
                    delete data[k];
                }

                yield data;
            }
            log.info(`结束获取并转换: ${type}`);
        }

        await db.close();
    }

    mergeFpData(tableName, fetchFunc(date), recreate);
}

function importData({ type, fetchFunc, date, xlsx, beginRow, endRow, recreate = false }) {
    importFpData(fetchFunc({
        date, xlsx, beginRow: Number(beginRow), endRow: Number(endRow)
    }), { recreate, type });
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

async function affirmIdentity(tableName, date, findOptions) {
    const db = createFpDb();
    const fpBook = defineFpBook(db, tableName);
    await fpBook.sync({ force: false });

    log.info(`开始认定参保人员身份: ${tableName}`);

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

    log.info(`结束认定参保人员身份: ${tableName}`);

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

async function exportData(tableName, tmplXlsx, saveXlsx, findOptions) {
    const db = createFpDb();
    const fpBook = defineFpBook(db, tableName);
    await fpBook.sync({ force: false });

    log.info(`开始导出扶贫底册: ${tableName}=>${saveXlsx}`);

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

    log.info(`结束导出扶贫底册: ${tableName}=>${saveXlsx}`);

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

async function updateJbzt(tableName, date) {
    const db = createFpDb();

    const fpBook = defineFpBook(db, tableName);
    await fpBook.sync({ force: false });

    const jbTable = defineJbTable(db);
    await jbTable.sync({ force: false });

    const fpBookFlds = fpBook.getFieldNames();
    const jbTableFlds = jbTable.getFieldNames();

    log.info(`开始更新居保状态: ${tableName}`);

    for (const [cbzt, jfzt, jbzt] of jbztMap) {
        const sql = `
update ${fpBook.name}, ${jbTable.name}
   set ${fpBookFlds.jbcbqk}='${jbzt}', ${fpBookFlds.jbcbqk_date}='${date}'
 where ${fpBookFlds.idcard}=${jbTableFlds.idcard} 
   and ${jbTableFlds.cbzt}='${cbzt}'
   and ${jbTableFlds.jfzt}='${jfzt}'
   and (${fpBookFlds.jbcbqk_date} is null or 
        (${fpBookFlds.jbcbqk} is null or ${fpBookFlds.jbcbqk}<>'${jbzt}'))`;

        log.info(sql);

        await db.query(sql);
    }

    log.info(`结束更新居保状态: ${tableName}`);

    await db.close();
}

const jbsfMap = [
    ['贫困人口一级', '051'],
    ['特困一级',    '031'],
    ['低保对象一级', '061'],
    ['低保对象二级', '062'],
    ['残一级',      '021'],
    ['残二级',      '022']
]

async function exportSfbgxx(tableName, dir) {
    const tmplXlsx = 'D:\\精准扶贫\\批量信息变更模板.xlsx';
    const rowsPerXlsx = 500;

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    } else {
        log.info(`目录已存在: ${dir}`);
        return;
    }

    const db = createFpDb();

    const fpBook = defineFpBook(db, tableName);
    await fpBook.sync({ force: false });

    const jbTable = defineJbTable(db);
    await jbTable.sync({ force: false });

    const fpBookFlds = fpBook.getFieldNames();
    const jbTableFlds = jbTable.getFieldNames();

    log.info(`从 ${fpBook.name} 和 ${jbTable.name} 导出指信息变更表`);

    for (const [type, code] of jbsfMap) {
        const sql = `
select ${jbTableFlds.name} as name, ${jbTableFlds.idcard} as idcard
  from ${jbTable.name}, ${fpBook.name}
 where ${jbTableFlds.idcard}=${fpBookFlds.idcard}
   and ${fpBookFlds.jbrdsf}='${type}'
   and ${jbTableFlds.cbsf}<>'${code}'
   and ${jbTableFlds.cbzt}='1'
   and ${jbTableFlds.jfzt}='1'`;
        
        const result = await db.query(sql, {type: Database.QueryTypes.SELECT});

        const total = result.length;
        if (total > 0) {
            log.info(`导出 ${type} 批量信息变更表: ${total} 条`);

            const files = Math.ceil(total / rowsPerXlsx);
            for (let i = 0; i < files; i++) {
                let start = i * 500;
                let end = (i === files - 1) ? total : (i + 1) * 500;

                const workbook = await Xlsx.fromFileAsync(tmplXlsx);
                const sheet = workbook.sheet(0);
                let [startRow, currentRow] = [2, 2];
                for (let idx = start; idx < end; idx++) {
                    let row;
                    if (currentRow > startRow)
                        row = sheet.insertAndCopyRow(currentRow, startRow, true);
                    else
                        row = sheet.row(currentRow);
                    row.cell('A').value(result[idx].idcard);
                    row.cell('C').value(result[idx].name);
                    row.cell('H').value(code);
                    currentRow ++;
                }
                workbook.toFileAsync(`${dir}\\${type}批量信息变更表${i+1}.xlsx`);
            }
        }
    }

    log.info(`结束从 ${fpBook.name} 和 ${jbTable.name} 导出指信息变更表`);

    await db.close();
}

const program = require('commander');

program
    .version('0.0.1')
    .description('扶贫数据导库程序');

program
    .command('pkrk')
    .arguments('<date:yyyymm> <xlsx> <beginRow> <endRow>')
    .description('导入贫困人口数据')
    .usage(String.raw`201902 D:\\精准扶贫\\201902\\7372人贫困人口台账.xlsx 2 7373`)
    .action((date, xlsx, beginRow, endRow) => {
        importData({
            type: '贫困人口', fetchFunc: fetchPkData2,
            date, xlsx, beginRow, endRow
        });
    });

program
    .command('tkry')
    .arguments('<date:yyyymm> <xlsx> <beginRow> <endRow>')
    .description('导入特困人员数据')
    .usage(String.raw`201902 D:\\精准扶贫\\201902\\城乡特困201902.xlsx 2 949`)
    .action((date, xlsx, beginRow, endRow) => {
        importData({
            type: '特困人员', fetchFunc: fetchTkData2,
            date, xlsx, beginRow, endRow
        });
    });

program
    .command('csdb')
    .arguments('<date:yyyymm> <xlsx> <beginRow> <endRow>')
    .description('导入城市低保数据')
    .usage(String.raw`201902 D:\\精准扶贫\\201902\\2019年2月城市名册.xlsx 2 6531`)
    .action((date, xlsx, beginRow, endRow) => {
        importData({
            type: '城市低保', fetchFunc: fetchCsdbData,
            date, xlsx, beginRow, endRow
        });
    });

program
    .command('ncdb')
    .arguments('<date:yyyymm> <xlsx> <beginRow> <endRow>')
    .description('导入农村低保数据')
    .usage(String.raw`201902 D:\\精准扶贫\\201902\\2019年2月雨湖区农村低保名册.xlsx 2 2232`)
    .action((date, xlsx, beginRow, endRow) => {
        importData({
            type: '农村低保', fetchFunc: fetchNcdbData,
            date, xlsx, beginRow, endRow
        });
    });

program
    .command('cjry')
    .arguments('<date:yyyymm> <xlsx> <beginRow> <endRow>')
    .description('导入残疾人员数据')
    .usage(String.raw`201902 D:\\精准扶贫\\201902\\雨湖区全区残疾人20190219.xlsx 2 10212`)
    .action((date, xlsx, beginRow, endRow) => {
        importData({
            type: '残疾人员', fetchFunc: fetchCjData,
            date, xlsx, beginRow, endRow
        });
    });

program
    .command('hbdc')
    .arguments('<date:yyyymm>')
    .description('合并到扶贫历史数据底册')
    .action((date) => {
        mergeData('2019年度扶贫历史数据底册', date);
    });

program
    .command('scdc')
    .arguments('<date:yyyymm>')
    .description('生成当月扶贫数据底册')
    .action((date) => {
        mergeData(`扶贫数据底册${date}`, date, { pkry: true, recreate: true});
    });

program
    .command('rdsf')
    .arguments('<tabeName> <date:yyyymm> [idcards]')
    .description('认定居保身份')
    .usage(`2019年度扶贫历史数据底册 201902\n       rdsf 扶贫数据底册201903 201903`)
    .action((tableName, date) => {
        const idcards = process.argv.slice(5);
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
        affirmIdentity(tableName, date, findOptions);
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
    .action((tableName, date) => {
        updateJbzt(tableName, date);
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
    .arguments('<dir>')
    .description('导出居保参保身份变更信息表')
    .action(dir => {
        exportSfbgxx(dir);
    });

program.parse(process.argv);