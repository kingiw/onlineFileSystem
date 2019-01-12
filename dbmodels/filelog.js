const Sequelize = require('sequelize');
const sequelize = require('./orm');

module.exports = sequelize.define('FileLog', {
    log_id: {
        type: Sequelize.INTEGER,
        primaryKey: true
    },
    action: Sequelize.STRING(10),
    timestamp: Sequelize.STRING(255),
    user: {
        type: Sequelize.STRING(255),
        references: {
            model: 'User',
            key: 'user',
         },
    },
    file_id: {
        type: Sequelize.INTEGER,
        references: {
            model: 'File',
            key: 'file_id',
         },
    },
}, {
        freezeTableName: true,
        timestamps: false
    });