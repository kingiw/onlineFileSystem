let Sequelize = require('sequelize');
let sequelize = require('./dbmodels/orm');
let User = require('./dbmodels/user');
let Directory = require('./dbmodels/directory');
let DirectoryRelation = require('./dbmodels/directoryrelation');
Directory.hasMany(DirectoryRelation, { foreignKey: 'dir_id', as: 'DR' });
DirectoryRelation.belongsTo(Directory, { foreignKey: 'dir_id', as: 'DR' });
Directory.hasMany(DirectoryRelation, { foreignKey: 'ancestor', as: 'ancestorDir' });
DirectoryRelation.belongsTo(Directory, { foreignKey: 'ancestor', as: 'ancestorDir' });
let Files = require('./dbmodels/file');
User.hasMany(Directory, { foreignKey: 'user' });
User.hasMany(Files, { foreignKey: 'user' });
Directory.belongsTo(User, { foreignKey: 'user' });
Files.belongsTo(User, { foreignKey: 'user' });
let FileInDirectory = require('./dbmodels/fileindirectory');
Directory.hasMany(FileInDirectory, { foreignKey: 'dir_id' });
FileInDirectory.belongsTo(Directory, { foreignKey: 'dir_id' });
Files.hasMany(FileInDirectory, { foreignKey: 'file_id' });
FileInDirectory.belongsTo(Files, { foreignKey: 'file_id' });
let Privilege = require('./dbmodels/privilege');
User.hasMany(Privilege, { foreignKey: 'user' });
Privilege.belongsTo(User, { foreignKey: 'user' });
Directory.hasMany(Privilege, { foreignKey: 'dir_id' });
Privilege.belongsTo(Directory, { foreignKey: 'dir_id' });
let FileLog = require('./dbmodels/filelog');
let PrivilegeLog = require('./dbmodels/privilegelog');

let util_l = require('./util');
Date.prototype.toString = function () { return util_l.dateFormat(this, 'yyyy-MM-dd hh:mm:ss') };

let DEBUG = true;

function checkError(msg, debugon=DEBUG) {
    try {
        if (msg&&debugon) {
            throw new Error(msg);
        }
    } catch (err) {
        console.log(err);
    }
}

function fixpath(path) {
    if (!path || path == '')
        return '/';
    return path;
}

async function filelog(user, file_id, action, t) {
    let result = await FileLog.findOne({
        attributes: [[sequelize.fn('MAX', sequelize.col('log_id')), 'log_id']],
        transaction: t
    })
    let max_i = result.log_id + 1;
    await FileLog.create({
        log_id: max_i,
        action: action,
        timestamp: new Date().toString(),
        user: user,
        file_id: file_id
    }, { transaction: t });
    return true;
}

async function privilegelog(user, targetuser, dir_id, newval, action, t) {
    let result = await PrivilegeLog.findOne({
        attributes: [[sequelize.fn('MAX', sequelize.col('log_id')), 'log_id']],
        transaction: t
    })
    let max_i = result.log_id + 1;
    await PrivilegeLog.create({
        log_id: max_i,
        action: action,
        timestamp: new Date().toString(),
        newval: newval,
        dir_id: dir_id,
        user: user,
        targetuser: targetuser
    }, { transaction: t });
    return true;
}

async function pathTodirID(path, user) {
    let tmppath = path;
    if (!tmppath)
        tmppath = '/';
    if (tmppath[0] != '/')
        tmppath = '/' + tmppath;
    let path_dirs = tmppath.split('/');
    if (path_dirs[0] == '') {
        path_dirs[0] = '/';
    }
    if (path_dirs[path_dirs.length - 1] == '') {
        path_dirs.pop();
    }
    let possibleresult = await Directory.findAll({
        attributes: [
            [Sequelize.literal("Directory.dir_id"), 'dir_id'],
            [Sequelize.literal("Directory.name"), 'name'],
            [Sequelize.literal("Directory.user"), 'user'],
        ],
        where: {
            name: { [Sequelize.Op.eq]: path_dirs[path_dirs.length - 1] },
            user: { [Sequelize.Op.eq]: user }
        },
        include: [
            {
                model: DirectoryRelation,
                as: 'DR',
                attributes: [
                    ['depth', 'depth']
                ],
                where: {
                    depth: { [Sequelize.Op.eq]: path_dirs.length - 1 }
                }
            }
        ],
        order: [
            [Sequelize.literal("Directory.dir_id"), 'ASC']
        ]
    }).catch(err => {
        throw new Error(err.message);
    });
    let possibleID = [];
    for (let i of possibleresult) {
        possibleID.push(i.dataValues['dir_id']);
    }
    possibleresult = await Directory.findAll({
        attributes: [
            [Sequelize.literal("Directory.dir_id"), 'dir_id'],
        ],
        where: {
            dir_id: {
                [Sequelize.Op.in]: possibleID
            }
        },
        include: [
            {
                model: DirectoryRelation,
                as: 'DR',
                attributes: [
                    ['depth', 'depth']
                ],
                include: [
                    {
                        model: Directory,
                        as: 'ancestorDir',
                        attributes: [
                            ['name', 'ancestor']
                        ],
                    }
                ]
            }
        ],
        order: [
            [Sequelize.literal("dir_id"), 'ASC']
        ]
    }).catch(err => {
        throw new Error(err.message);
    });
    for (let i of possibleresult) {
        let ck_i = 0;
        if (i.DR.length < path_dirs.length)
            continue;
        for (let j of i.DR) {
            if (j.ancestorDir.dataValues['ancestor'] == path_dirs[path_dirs.length - 1 - j.depth]) {
                ck_i++;
            }
            else {
                break;
            }
        }
        if (ck_i >= path_dirs.length) {
            return i.dir_id;
        }
    }
    return null;
}

async function updateAuthorityInTran(dir_id, user, targetUser, authority, tran) {
    if (targetUser != user && authority==3) {
        throw new Error('Full privilege(3) could only given to owner.')
    }
    let ck_exist = await Privilege.findAll({
        where: {
            dir_id: { [Sequelize.Op.eq]: dir_id }
        },
        transaction: tran
    })
    let opc = true;
    if (ck_exist && ck_exist.length > 0) {
        let hostPriv = 0, targetPriv = 0;
        for (let i of ck_exist) {
            if (i.user == user)
                hostPriv = i.priv;
            if (i.user == targetUser)
                targetPriv = i.priv;
        }
        if (hostPriv < 3)
            throw new Error('Permission denied.');
        else {
            if (targetPriv > 0)
                opc = false;
        }
    }
    if (opc) {
        await Privilege.create({
            user: targetUser,
            dir_id: dir_id,
            priv: authority
        }, { transaction: tran });
        await privilegelog(user, targetUser, dir_id, authority, 'CREATE', tran);
    }
    else {
        if (targetUser == user) {
            throw new Error('Failed.')
        }
        await Privilege.update(
            {
                priv: authority
            },
            {
                where: {
                    user: { [Sequelize.Op.eq]: targetUser },
                    dir_id: { [Sequelize.Op.eq]: dir_id }
                },
                transaction: tran
            }
        );
        await privilegelog(user, targetUser, dir_id, authority, 'UPDATE', tran);
    }
}

module.exports = {
    // This async function would check if pair(username,password) exists
    // Input: username, password
    // Return:{
    //      success, msg
    // }
    // Possible msg: SQL Error, 'Username or password incorrect...'
    validateUser: async function (username, password) {
        let msg = null, status = 0;
        let userInfo = await User.findOne({
            where: {
                user: { [Sequelize.Op.eq]: username },
                password: { [Sequelize.Op.eq]: password }
            }
        }).catch(err => {
            status = -1;
            msg = err.message;
        });
        if (!userInfo) {
            status = -1;
            msg = 'Username or password incorrect, please try again.';
        }
        checkError(msg);
        return {
            success: status,
            msg: msg
        }
    },

    // This async function would create user as pair(username,password)
    // and create correspon rootdirectory, directoryrelation, authority
    // Input: username, password
    // Return:{
    //      success, msg
    // }
    // Possible msg: SQL Error, 'Failed to set authority!'
    createUser: async function (username, password) {
        let status = 0;
        let msg = null;
        await sequelize.transaction(async t => {
            // Insert data to database
            // Your code here
            await User.create({
                user: username,
                password: password
            }, {transaction: t});
            let result = await Directory.findOne({
                attributes: [[sequelize.fn('MAX', sequelize.col('dir_id')), 'dir_id']],
                transaction: t
            })
            let max_i = result.dir_id + 1;
            await Directory.create({
                dir_id: max_i,
                name: '/',
                user: username
            }, {transaction: t});
            await DirectoryRelation.create({
                dir_id: max_i,
                ancestor: max_i,
                depth: 0
            }, { transaction: t });
            await updateAuthorityInTran(max_i, username, username, 3, t).catch(err => {
                throw new Error('Failed to set authority!');
            });
        }).catch(err => {
            status = -1;
            msg = err.message;
        })
        checkError(msg);
        return {
            success: status,
            msg: msg
        }
    },

    // This async function would get all item(file/dir) in directory
    // will check authority, failed when <1
    // Input: dir_id, user
    // Return:{
    //      success, msg,
    //      list,   //[{name,id,dir} and {name,id,file,time}]
    //      dir_id, owner, Authority
    // }
    // Possible msg: SQL Error, 'Permission denied.'
    getItemList: async function (dir_id, user) {
        let status = 0;
        let msg = null;
        let ck = await this.checkAuthority(dir_id, user);
        let ownship = await this.checkDir(dir_id);
        let itemlist = [];
        console.log("Authority:", ck.authority);
        if (ck.authority >= 1 && status == 0) {
            let dirs = await Directory.findAll({
                attributes: ['name', 'dir_id'],
                include: [
                    {
                        model: DirectoryRelation,
                        as: 'DR',
                        attributes: [
                            ['depth', 'depth']
                        ],
                        where: {
                            depth: { [Sequelize.Op.eq]: 1 },
                            ancestor: { [Sequelize.Op.eq]: dir_id }
                        }
                    }
                ],
                order: [
                    ['name', 'ASC']
                ]
            }).catch(err => {
                status = -1;
                msg = err.message;
            });
            let filesindir = await FileInDirectory.findAll({
                attributes: [
                    ['file_id', 'file_id'],
                    [Sequelize.literal("File.update_time"), 'update_time'],
                    [Sequelize.literal("File.name"), 'name']
                ],
                where: {
                    dir_id: { [Sequelize.Op.eq]: dir_id }
                },
                include: [
                    {
                        model: Files,
                        attributes: ['file_id']
                    }
                ],
                order: [
                    [Sequelize.literal("File.name"), 'ASC']
                ]
            }).catch(err => {
                status = -1;
                msg = err.message;
            });
            for (let i of dirs) {
                itemlist.push({ 'name': i.dataValues['name'], 'dir':1, 'id':i.dataValues['dir_id']});
            }
            for (let i of filesindir) {
                itemlist.push({ 'name': i.dataValues['name'], 'time': i.dataValues['update_time'], 'file': 1, 'id': i.dataValues['file_id'] });
            }
        }
        else {
            status = -1;
            msg = 'Permission denied.';
        }
        checkError(msg);
        ret = {
            success: status,
            msg: msg,
            list: itemlist,
            currentDir: ownship.name,
            dir_id : dir_id,
            owner: ownship.owner,
            // Authority: ck.authority, 
        }
        if (ck.authority == 2)
            ret.writable = true;
        return ret;
    },

    // This async function would get all item(file/dir) in directory by path
    // will call getItemList()
    // thus will also check authority, failed when <1
    // Input: path, user
    // Return:{
    //      success, msg,
    //      list,   //[{name,id,dir} and {name,id,file,time}]
    //      currentPath, dir_id, owner, Authority
    // }
    // Possible msg: SQL Error, 'invaild path.', 'Permission denied.'
    getItemListByPath: async function (path, user) {
        let status = 0;
        let msg = null;
        let tmppath = fixpath(path);
        let nowdir = await pathTodirID(tmppath, user).catch(err => {
            status = -1;
            msg = err.message;
        });
        if (nowdir == null && status == 0) {
            status = -1;
            msg = 'invaild path.';
        }
        let result;
        if (status == 0) {
            result = await this.getItemList(nowdir, user);
            if (result.success != 0) {
                status = result.success;
                msg = result.msg;
            }
        }
        else {
            result = {
                success: status,
                msg: msg,
                list: [],  
                dir_id : nowdir,
                owner: user,
                Authority: 3, 
            }
        }
        checkError(msg);
        return {
            success: status,
            msg: msg,
            list: result.list,  
            currentPath: tmppath,
            dir_id : result.dir_id,
            owner: result.owner,
            Authority: result.Authority, 
        }
    },

    // This async function would insert file into directory
    // will check authority, failed when <2
    // Input: name, dir_id, update_time, user, path, size
    // Return:{
    //      success, msg
    // }
    // Possible msg: SQL Error, 'Permission denied.'
    createFile: async function (name, dir_id, update_time, user, path, size) {
        let status = 0;
        let msg = null;
        let ck = await this.checkAuthority(dir_id, user);
        if (ck.authority > 1) {
            await sequelize.transaction(async t => {
                let result = await FileInDirectory.findOne({
                    attributes: [[sequelize.fn('MAX', sequelize.col('file_id')), 'file_id']],
                    transaction: t
                })
                let max_i = result.file_id + 1;
                await Files.create({
                    file_id: max_i,
                    name: name,
                    update_time: update_time,
                    user: user,
                    size: size,
                    path: path
                }, { transaction: t });
                await FileInDirectory.create({
                    file_id: max_i,
                    dir_id: dir_id
                }, { transaction: t });
                await filelog(user, max_i, 'CREATE', t);
            }).catch(err => {
                status = -1;
                msg = err.message;
            });
        }
        else {
            status = -1;
            msg = 'Permission denied';
        }
        checkError(msg);
        return {
            success: status,
            msg: msg
        }
    },

    // This async function would insert file into directory by path
    // will call createFile()
    // thus will also check authority, failed when <2
    // Input: name, dir_path, update_time, user, path, size
    // Return:{
    //      success, msg
    // }
    // Possible msg: SQL Error, 'invaild path.', 'Permission denied.'
    createFileByPath: async function (name, dir_path, update_time, user, path, size) {
        let status = 0;
        let msg = null;
        let tmppath = fixpath(dir_path);
        let dir_id = await pathTodirID(tmppath, user).catch(err => {
            status = -1;
            msg = err.message;
        });
        if (dir_id == null && status == 0) {
            status = -1;
            msg = 'invaild path.';
        }
        if (status == 0) {
            let result = await this.createFile(name, dir_id, update_time, user, path, size);
            status = result.success;
            msg = result.msg;
        }
        checkError(msg);
        return {
            success: status,
            msg: msg
        }
    },

    // This async function would create dir in directory
    // and create correspon directoryrelation, authority
    // have no authority check
    // will check dirname, failed if have '/' or be empty or duplicate
    // Input: dirname, path, user
    // Return:{
    //      success, msg
    // }
    // Possible msg: SQL Error, 'invaild path.', 'invaild dirname.', 'duplicate name.', 'Failed to set authority!'
    makedirectory: async function (dirname, path, user) {
        let status = 0;
        let msg = null;
        await sequelize.transaction(async t => {
            if (dirname == '' || dirname.includes('/')) {
                throw new Error('invaild dirname.');
            }
            let nowdir = await pathTodirID(path, user);
            if (nowdir == null) {
                throw new Error('invaild path.');
            }
            let result = await Directory.findOne({
                attributes: [
                    ['name', 'name']
                ],
                where: {
                    name: { [Sequelize.Op.eq]: dirname }
                },
                include: [
                    {
                        model: DirectoryRelation,
                        as: 'DR',
                        attributes: [
                            ['depth', 'depth']
                        ],
                        where: {
                            depth: { [Sequelize.Op.eq]: 1 },
                            ancestor: { [Sequelize.Op.eq]: nowdir }
                        }
                    }
                ],
                transaction: t
            })
            if (result) {
                throw new Error('duplicate name.');
            }
            result = await Directory.findOne({
                attributes: [[sequelize.fn('MAX', sequelize.col('dir_id')), 'dir_id']],
                transaction: t
            })
            let max_i = result.dir_id + 1;
            await Directory.create({
                dir_id: max_i,
                name: dirname,
                user: user
            }, { transaction: t });
            result = await DirectoryRelation.findAll({
                where: {
                    dir_id: { [Sequelize.Op.eq]: nowdir }
                },
                transaction: t
            });
            for (let i of result) {
                await DirectoryRelation.create({
                    dir_id: max_i,
                    ancestor: i.ancestor,
                    depth: i.depth + 1
                }, { transaction: t });
            }
            await DirectoryRelation.create({
                dir_id: max_i,
                ancestor: max_i,
                depth: 0
            }, { transaction: t });
            await updateAuthorityInTran(max_i, user, user, 3, t).catch(err => {
                throw new Error('Failed to set authority!');
            });
        }).catch(err => {
            console.log(err);
            status = -1;
            msg = err.message;
        });
        checkError(msg);
        return {
            success: status,
            msg: msg
        }
    },

    // This async function would update authority pair(dir_id,user,authority)
    // if not exists, will create pair
    // will check authority, failed when <3
    // Input: dir_id, user, targetUser, authority
    // Return:{
    //      success, msg
    // }
    // Possible msg: SQL Error, 'Permission denied.'
    updateAuthority: async function (dir_id, user, targetUser, authority) {
        let status = 0;
        let msg = null;
        let ck = await this.checkUser(user);
        if (ck.success != 0) {
            status = -1;
            msg = 'user not exists.';
        }
        if (status == 0) {
            let ck = await this.checkUser(targetUser);
            if (ck.success != 0) {
                status = -1;
                msg = 'target user not exists.';
            }
        }
        if (status == 0) {
            await sequelize.transaction(async t => {
                await updateAuthorityInTran(dir_id, user, targetUser, authority, t);
            }).catch(err => {
                console.log(err);
                status = -1;
                msg = err.message;
            })
        }
        checkError(msg);
        return {
            success: status,
            msg: msg
        }
    },

    // This async function would return authority pair(dir_id,user,authority)
    // if not exists, will regard as authority=0
    // if SQL error occurs, will set authority=-1
    // Input: dir_id, user
    // Return:{
    //      authority, msg
    // }
    // Possible msg: SQL Error
    checkAuthority: async function (dir_id, user) {
        let status = 0;
        let msg = null;
        let ck_exist = await Privilege.findOne({
            where: {
                dir_id: { [Sequelize.Op.eq]: dir_id },
                user: { [Sequelize.Op.eq]: user }
            }
        }).catch(err => {
            status = -1;
            msg = err.message;
        });
        if (status == 0 && ck_exist) {
            status = ck_exist.priv;
        }
        checkError(msg);
        return {
            authority: status,
            msg: msg
        }
    },

    // This async function would return owner and name of directory
    // Input: dir_id
    // Return:{
    //      success, msg,
    //      owner, name
    // }
    // Possible msg: SQL Error, 'No owner or directory not exists.'
    checkDir: async function (dir_id) {
        let status = 0;
        let owner = null;
        let name = null;
        let msg = null;
        let ck_exist = await Directory.findOne({
            where: {
                dir_id: { [Sequelize.Op.eq]: dir_id },
            }
        }).catch(err => {
            status = -1;
            msg = err.message;
        });
        if (ck_exist) {
            owner = ck_exist.user;
            name = ck_exist.name;
        }
        else {
            status = -1;
            msg = 'No owner or directory not exists.';
        }
        checkError(msg);
        return {
            success: status,
            msg: msg,
            owner: owner,
            name: name
        }
    },

    // This async function would return authority pair list of directory
    // will check authority, failed when <3
    // Input: path, user
    // Return:{
    //      success, msg,
    //      list,   //[{user,authority}] order by authority desc
    //      currentPath
    // }
    // Possible msg: SQL Error, 'Permission denied.'
    getAuthorityList: async function (path, user) {
        let status = 0;
        let msg = null;
        let tmppath = fixpath(path);
        let dir_id = await pathTodirID(tmppath, user).catch(err => {
            status = -1;
            msg = err.message;
        });
        let poi = []
        if (status == 0) {
            let ck = await this.checkAuthority(dir_id, user);
            if (ck.authority < 3) {
                status = -1;
                msg = 'Permission denied.';
            }
            if (status == 0) {
                let alllist = await Privilege.findAll({
                    attributes: [
                        'user', 'priv'
                    ],
                    where: {
                        dir_id: { [Sequelize.Op.eq]: dir_id }
                    },
                    order: [
                        ['priv', 'DESC']
                    ]
                }).catch(err => {
                    status = -1;
                    msg = err.message;
                });
                if (status == 0) {
                    for (let i of alllist) {
                        poi.push({
                            user: i.user,
                            authority: i.priv
                        })
                    }
                }
            }
        }
        checkError(msg);
        return { success: status, msg: msg, list: poi, currentPath: tmppath, dir_id: dir_id};
    },

    // This async function would return data of file
    // will check authority, failed when <1
    // Input: file_id, dir_id, user
    // Return:{
    //      success, msg,
    //      path, name
    // }
    // Possible msg: SQL Error, 'Permission denied.', 'Failed to get file.'
    getFile: async function (f_id, dir_id, user) {
        let status = 0;
        let msg = null;
        let ck = await this.checkAuthority(dir_id, user);
        if (ck.authority < 1) {
            status = -1;
            msg = 'Permission denied.';
        }
        if (status == 0) {
            let ck = await FileInDirectory.findOne({
                where: {
                    file_id: { [Sequelize.Op.eq]: f_id },
                    dir_id: { [Sequelize.Op.eq]: dir_id }
                }
            })
            if (!ck) {
                status = -1;
                msg = 'invaild action.';
            }
        }
        let result;
        if (status == 0) {
            result = await Files.findOne({
                where: {
                    file_id: { [Sequelize.Op.eq]: f_id }
                },
                attributes: ['name', 'path']
            });
            if (result == null || result == undefined) {
                status = -1;
                msg = 'Failed to get file.';
                result = {
                    path: null,
                    name: null,
                }
            }
        }
        else {
            result = {
                path: null,
                name: null,
            }
        }
        sequelize.transaction(async t => {
            await filelog(user, f_id, 'GET', t);
        }).catch(err => {
            console.log('Failed to log.');
        });
        checkError(msg);
        return {
            success: status,
            msg: msg,
            path: result.path,
            name: result.name
        }
    },

    checkUser: async function (user) {
        let status = 0;
        let msg = null;
        let ck = await User.findOne({
            where: {
                user: { [Sequelize.Op.eq]: user }
            }
        }).catch(err => {
            status = -1;
            msg = err.message;
        })
        if (status != 0 || !ck) {
            status = -1;
            msg = 'Failed to find such user.';
        }
        return {
            success: status,
            msg: msg
        }
    },

    getSharedList: async function (user) {
        let status = 0;
        let msg = null;
        let itemlist = [];
        let result = await Privilege.findAll({
            attributes: [
                'dir_id', 'priv'
            ],
            where: {
                user: { [Sequelize.Op.eq]: user },
                priv: {
                    [Sequelize.Op.in]: [1, 2]
                }
            },
            include: [
                {
                    model: Directory,
                    attributes: [
                        'name',
                        ['user', 'owner']
                    ]
                }
            ]
        }).catch(err => {
            status = -1;
            msg = err.message;
        });
        if (status == 0) {
            for (let i of result) {
                itemlist.push({
                    id: i.dir_id,
                    name: i.Directory.name,
                    owner: i.Directory.dataValues['owner'],
                    authority: (i.priv == 1) ? 'Read Only' : 'Writable'
                })
            }
        }
        console.log({
            success: status,
            msg: msg,
            list: itemlist,
            owner: user,
            // currentDir: 'Others sharing directories',
            isSharedIndex: 'True'
        });
        return {
            success: status,
            msg: msg,
            list: itemlist,
            owner: user,
            // currentDir: 'Others sharing directories',
            isSharedIndex: 'True'
        }
    },

    getFileLog: async function () {
        let status = 0;
        let msg = null;
        let result = await FileLog.findAll({
            attributes: [
                'log_id', 'action', 'timestamp', 'user', 'file_id'
            ]
        }).catch(err => {
            status = -1;
            msg = err.message;
        });
        let loglist = [];
        if (status == 0) {
            for (let i of result) {
                loglist.push({
                    log_id: i.log_id,
                    action: i.action,
                    timestamp: i.timestamp,
                    user: i.user,
                    file_id: i.file_id
                });
            }
        }
        return {
            success: status,
            msg: msg,
            loglist: loglist
        }
    },

    getAuthorityLog: async function () {
        let status = 0;
        let msg = null;
        let result = await PrivilegeLog.findAll({
            attributes: [
                'log_id', 'action', 'timestamp', 'newval', 'dir_id', 'user', 'targetuser'
            ]
        }).catch(err => {
            status = -1;
            msg = err.message;
        });
        let loglist = [];
        if (status == 0) {
            for (let i of result) {
                loglist.push({
                    log_id: i.log_id,
                    action: i.action,
                    timestamp: i.timestamp,
                    user: i.user,
                    targetuser: i.targetuser,
                    dir_id: i.dir_id,
                    newval: i.newval
                });
            }
        }
        return {
            success: status,
            msg: msg,
            loglist: loglist
        }
    },
}