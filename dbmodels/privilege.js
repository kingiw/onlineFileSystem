const Sequelize = require('sequelize');
const sequelize = require('./orm');

module.exports = sequelize.define('Privilege', {
    user: {
        type: Sequelize.STRING(255),
        references: {
           model: 'User',
           key: 'user',
        },
        primaryKey: true
    },
    dir_id: {
        type: Sequelize.INTEGER,
        references: {
           model: 'Directory',
           key: 'dir_id',
        },
        primaryKey: true
    },
    priv: Sequelize.INTEGER
}, {
        freezeTableName: true,
        timestamps: false
    });