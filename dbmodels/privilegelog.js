const Sequelize = require('sequelize');
const sequelize = require('./orm');

module.exports = sequelize.define('PrivilegeLog', {
    log_id: {
        type: Sequelize.INTEGER,
        primaryKey: true
    },
    action: Sequelize.STRING(10),
    timestamp: Sequelize.STRING(255),
    newval: Sequelize.INTEGER,
    dir_id: {
        type: Sequelize.INTEGER,
        references: {
            model: 'Directory',
            key: 'dir_id',
         },
    },
    user: {
        type: Sequelize.STRING(255),
        references: {
            model: 'User',
            key: 'user',
         },
    },
    targetuser: {
        type: Sequelize.STRING(255),
        references: {
            model: 'User',
            key: 'user',
         },
    },
}, {
        freezeTableName: true,
        timestamps: false
    });