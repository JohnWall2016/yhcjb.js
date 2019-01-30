'use strict';

const { it } = require('./logtest');
const Sequelize = require('sequelize');

describe('sequelize test', function() {

    function createFpDb() {
        return new Sequelize({
            dialect:  'mysql',
            host:     'localhost',
            port:     3306,
            database: 'jzfp',
            username: 'root',
            password: 'root',
            define:   {
                charset: 'utf8'
            },
            operatorsAliases: false
        });
    }

    /**
     * @param { Sequelize.Sequelize } db 
     */
    function defineFpTable(db) {
        return db.define('扶贫数据台账20190128', {
            no: {
                type:  Sequelize.INTEGER,
                field: '序号',
                primaryKey: true
            },
            district: {
                type:  Sequelize.STRING,
                field: '区划'
            },
            area: {
                type:  Sequelize.STRING,
                field: '区域'
            },
            address: {
                type:  Sequelize.STRING,
                field: '地址'
            },
            name: {
                type:  Sequelize.STRING,
                field: '姓名'
            },
            idcard: {
                type:  Sequelize.STRING,
                field: '身份证号码',
                //primaryKey: true
            },
            type: {
                type:  Sequelize.STRING,
                field: '人员类型'
            }
        }, { 
            freezeTableName: true,
            createdAt: false,
            updatedAt: false
        });
    }

    it.only('create jzfp table', function(done) {
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

    it.only('load from xlsx', function(done) {
        const { Sequelize } = require('../lib/db');
        const db = new Sequelize({
            dialect:  'mysql',
            host:     'localhost',
            port:     3306,
            database: 'jzfp',
            username: 'root',
            password: 'root',
            define:   {
                charset: 'utf8'
            },
            operatorsAliases: false
        });
        db.loadXlsx({
            tableName: '扶贫数据台账20190128',
            xlsx: 'D:\\精准扶贫\\20190128扶贫数据台账（不含残疾类人员）.xlsx',
            startRow: 2,
            endRow: 19232,
            mappings: {
                A: 'N',
                B: 'S',
                C: 'S',
                D: 'S',
                E: 'S',
                F: 'S',
                G: 'S'
            }
        }).then(() => {
            db.close();
            it.log('导入成功');
            done();
        }, err => {
            db.close();
            it.log(err);
            done(err);
        });
    });

});