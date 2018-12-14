const Sequelize = require('sequelize');
const sequelize = require('./orm');

module.exports = sequelize.define('Directory', {
    dir_id: {
        type: Sequelize.INTEGER,
        primaryKey: true
    },
    name: Sequelize.STRING(255),
    user: Sequelize.STRING(255)
}, {
        freezeTableName: true,
        timestamps: false
    });