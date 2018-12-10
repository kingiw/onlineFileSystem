const Sequelize = require('sequelize');
const sequelize = require('./orm');

module.exports = sequelize.define('Privilege', {
    user: {
        type: Sequelize.STRING(255),
        primaryKey: true
    },
    dir_id: {
        type: Sequelize.INTEGER,
        primaryKey: true
    },
    priv: Sequelize.INTEGER
}, {
        freezeTableName: true,
        timestamps: false
    });