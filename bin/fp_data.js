'use strict';

const Xlsx = require('xlsx-populate');
const { createFpDb, defineFpBook } = require('../lib/db');
const { createLogger } = require('../lib/util');

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
                    pkrk_date: date
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
                    tkry_date: date
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
                        } else if (type == '差额救助') {
                            data.detail.cedb = '城市';
                            data.detail.cedb_date = date;
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
                        } else if (type == '差额') {
                            data.detail.cedb = '农村';
                            data.detail.cedb_date = date;
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

const program = require('commander');

program
    .version('0.0.1')
    .description('扶贫数据导库程序');

// pkrk 201902 D:\精准扶贫\201902\7372人贫困人口台账.xlsx 2 7373
program
    .command('pkrk')
    .arguments('<date> <xlsx> <beginRow> <endRow>')
    .description('合并贫困人口数据')
    .action((date, xlsx, beginRow, endRow) => {
        mergeData({
            type: '贫困人口', fetchFunc: fetchPkData,
            date, xlsx, beginRow, endRow
        });
    });

// tkry 201902 D:\精准扶贫\201902\城乡特困201902.xlsx 2 949
program
    .command('tkry')
    .arguments('<date> <xlsx> <beginRow> <endRow>')
    .description('合并特困人员数据')
    .action((date, xlsx, beginRow, endRow) => {
        mergeData({
            type: '特困人员', fetchFunc: fetchTkData,
            date, xlsx, beginRow, endRow
        });
    });

// csdb 201902 D:\精准扶贫\201902\2019年2月城市名册.xlsx 2 6531
program
    .command('csdb')
    .arguments('<date> <xlsx> <beginRow> <endRow>')
    .description('合并城市低保数据')
    .action((date, xlsx, beginRow, endRow) => {
        mergeData({
            type: '城市低保', fetchFunc: fetchCsdbData,
            date, xlsx, beginRow, endRow
        });
    });

// ncdb 201902 D:\精准扶贫\201902\2019年2月雨湖区农村低保名册.xlsx 2 2232
program
    .command('ncdb')
    .arguments('<date> <xlsx> <beginRow> <endRow>')
    .description('合并农村低保数据')
    .action((date, xlsx, beginRow, endRow) => {
        mergeData({
            type: '农村低保', fetchFunc: fetchNcdbData,
            date, xlsx, beginRow, endRow
        });
    });
