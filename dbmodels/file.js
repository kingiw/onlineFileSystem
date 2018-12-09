const Sequelize = require('sequelize');
const sequelize = require('./orm');

module.exports = sequelize.define('File', {
    file_id: {
        type: Sequelize.INTEGER,
        primaryKey: true
    },
    name: Sequelize.STRING(255),
    update_time: Sequelize.STRING(255),
    user: Sequelize.STRING(255),
    size: Sequelize.INTEGER,
    data: Sequelize.BLOB
}, {
        freezeTableName: true,
        timestamps: false
    });