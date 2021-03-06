'use strict';

const { it } = require('./logtest');
const { Database, createFpDb, defineFpBook, defineFpHistoryBook, Model } = require('../lib/db');

describe('sequelize test', function() {

    /**
     * @param { Database } db 
     */
    function defineFpTable(db) {
        return db.define('扶贫数据台账20190128', {
            no: {
                field: '序号',
                type:  Database.INTEGER,
                //primaryKey: true
            },
            district: {
                field: '区划',
                type:  Database.STRING
            },
            area: {
                field: '区域',
                type:  Database.STRING
            },
            address: {
                field: '地址',
                type:  Database.STRING
            },
            name: {
                field: '姓名',
                type:  Database.STRING
            },
            idcard: {
                field: '身份证号码',
                type:  Database.STRING,
                primaryKey: true
            },
            birthDay: {
                field: '出生日期',
                type:  Database.INTEGER,
            },
            type: {
                field: '人员类型',
                type:  Database.STRING
            }
        }, { 
            freezeTableName: true,
            createdAt: false,
            updatedAt: false
        });
    }

    it('create jzfp table', function(done) {
        const db = createFpDb();
        const fpTable = defineFpTable(db);        
        fpTable.sync({ force: true }).then(
            async res => {
                it.log(`${res.name} 创建成功`);
                await db.close();
                done();
            }
        );
    });

    it('insert data to jzfp table', function(done) {
        const db = createFpDb();
        const fpTable = defineFpTable(db);
        fpTable.sync().then(async res => {
            await fpTable.create({
                no: 0,
                district: 'district',
                area: 'area',
                address: 'address',
                name: 'name',
                idcard: 'idcard',
                type: 'type'
            });
            const p = await fpTable.findOne({
                where: { name: 'name' }
            });
            it.log(`${p.name} ${p.idcard}`);
            await db.close();
            done();
        });
    });

    it('load from xlsx', function(done) {
        const db = createFpDb();
        db.loadXlsx({
            tableName: '扶贫数据台账20190128',
            xlsx: 'D:\\精准扶贫\\20190128扶贫数据台账（不含残疾类人员）.xlsx',
            startRow: 2,
            endRow: 19231,
            mappings: {
                A: 'N',
                B: 'S',
                C: 'S',
                D: 'S',
                E: 'S',
                F: 'S',
                G: 'N',
                H: 'S'
            }
        }).then(async () => {
            it.log('导入成功');
            await db.close();
            done();
        }, async err => {
            it.log(err);
            await db.close();
            done(err);
        });
    });

    it('get fpBook schema', async function() {
        const db = createFpDb();
        const fpBook = defineFpBook(db);

        await fpBook.sync();

        function getFieldName(field) {
            let fld = this.rawAttributes[field];
            if (fld) {
                return `${fld.Model.name}.${fld.field}`;
            }
            return fld;
        }

        fpBook.f = getFieldName;

        it.log(fpBook.f('jbrdsf'));
        

        await db.close();
    });

    it('get fpBook fieldNames', async function() {
        const db = createFpDb();
        const fpBook = defineFpBook(db);

        await fpBook.sync();

        const fpBookFn = fpBook.getFieldNames();

        it.log(fpBookFn.jbrdsf);
        it.log(fpBook.rawAttributes);

        await db.close();
    });

    it.only('get fpHistoryBook data', async function() {
        const db = createFpDb();
        const fpBook = defineFpHistoryBook(db);
        await fpBook.sync();
        //const idcard = '430302196512212012';
        //const idcard = '430321194211134524'; 
        //const idcard = '430302193805312021'; 
        const idcard = '430321193910090562';
        let date = String(Number(idcard.substr(6, 6)) + 6000);
        const p = await fpBook.findAll({
            where: {
                [Database.Op.and]: [
                    { idcard },
                    { type: {
                        [Database.Op.or]:  [ '贫困人口', '特困人员', '全额低保人员', '差额低保人员' ]
                    } },
                    { date: {
                        [Database.Op.gte]: date
                    } }
                ]
            }
        });
        it.log(p);
        await db.close();
    });

});