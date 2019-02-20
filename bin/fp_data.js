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

async function* fetchFpData({ date, xlsx, beginRow, endRow, complain }) {
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

mergeFpData(
    fetchFpData({
        date:     '201902',
        xlsx:     'D:\\精准扶贫\\201902\\7372人贫困人口台账.xlsx',
        beginRow: 2,
        endRow:   7373,
        complain: true
    }),
    {
        recreate: true,
        type: '贫困人口'
    }
);

/*
mergeFpData(
    fetchTkData({
        date:     '201902',
        xlsx:     'D:\\精准扶贫\\201902\\城乡特困TEST.xlsx',
        beginRow: 2,
        //endRow:   7373
        endRow: 4,
        complain: true
    }),
    {
        recreate: false,
        type: '特困人员'
    }
);
*/