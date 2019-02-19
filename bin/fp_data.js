'use strict';

const Xlsx = require('xlsx-populate');
const { Database, createFpDb, defineFpBook } = require('../lib/db');

/**
 * 导库函数
 * @param { AsyncIterableIterator<{name, idcard, xzj, csq}> } data
 */
async function importData(data, { force = false } = {}) {
    const db = createFpDb();
    const fpBook = defineFpBook(db);
    await fpBook.sync({ force });

    for await (const info of data) {
        console.log(`${info.idcard} ${info.name}`);
        if (info.idcard) {
            let record = await fpBook.findOne({
                where: { idcard: info.idcard }
            });
            if (force) {
                if (!record) {
                    await fpBook.upsert(info);
                } else {
                    console.error(`${info.idcard} 身份证号码已存在！`);
                }
            } else {
                if (record) {
                    await record.update({ ...info, name: record.name });
                } else {
                    await fpBook.upsert(info);
                }
            }
        }
    }

    await db.close();
}

async function* fetchFpData({ date, xlsx, beginRow, endRow }) {
    const workbook = await Xlsx.fromFileAsync(xlsx);
    const sheet = workbook.sheet(0);

    for (let index = beginRow; index <= endRow; index ++) {
        const row = sheet.row(index);
        if (row) {
            let info = {
                name:      row.cell('E').value(),
                idcard:    String(row.cell('F').value()),
                xzj:       row.cell('C').value(),
                csq:       row.cell('D').value(),
                pkrk:      '是',
                pkrk_date: date
            }
            yield info;
        }
    }
}

async function* fetchTkData({ date, xlsx, beginRow, endRow }) {
    const workbook = await Xlsx.fromFileAsync(xlsx);
    const sheet = workbook.sheet(0);

    for (let index = beginRow; index <= endRow; index ++) {
        const row = sheet.row(index);
        if (row) {
            let info = {
                name:      row.cell('F').value(),
                idcard:    String(row.cell('G').value()),
                xzj:       row.cell('B').value(),
                csq:       row.cell('C').value(),
                tkry:      '是',
                tkry_date: date
            }
            yield info;
        }
    }
}

/*
importData(
    fetchFpData({
        date:     '201902',
        xlsx:     'D:\\精准扶贫\\201902\\7372人贫困人口台账.xlsx',
        beginRow: 2,
        endRow:   7373
    })
);
*/
