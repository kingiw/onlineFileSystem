const Sequelize = require('sequelize');
const config = require('../config');

module.exports =  new Sequelize(config.database, config.dbuser, config.dbpwd, {
    host: config.dbhost,
    port: config.dbport,
    dialect: 'mysql',
    pool: {
        max: 5,
        min: 0,
        idle: 30000
    },
    logging: config.dbdebug,
    operatorsAliases: false
});