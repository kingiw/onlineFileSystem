const Sequelize = require('sequelize');
const sequelize = require('./orm');

module.exports = sequelize.define('FileInDirectory', {
    file_id: {
        type: Sequelize.INTEGER,
        primaryKey: true
    },
    dir_id: {
        type: Sequelize.INTEGER,
        primaryKey: true
    },
}, {
        freezeTableName: true,
        timestamps: false
    });