const Sequelize = require('sequelize');
const sequelize = require('./orm');

module.exports = sequelize.define('DirectoryRelation', {
    dir_id: {
        type: Sequelize.INTEGER,
        references: {
           model: 'Directory',
           key: 'dir_id',
        },
        primaryKey: true
    },
    ancestor: {
        type: Sequelize.INTEGER,
        references: {
           model: 'Directory',
           key: 'dir_id',
        },
        primaryKey: true
    },
    depth: Sequelize.INTEGER
}, {
        freezeTableName: true,
        timestamps: false
    });