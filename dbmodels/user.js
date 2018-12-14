const Sequelize = require('sequelize');
const sequelize = require('./orm');

module.exports = sequelize.define('User', {
    user: {
        type: Sequelize.STRING(255),
        primaryKey: true
    },
    password: Sequelize.STRING(255)
}, {
        freezeTableName: true,
        timestamps: false
    });