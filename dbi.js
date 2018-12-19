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

let fs = require('fs');

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

async function pathTodirID(path, user) {
    var tmppath = path;
    if (!tmppath)
        tmppath = '/';
    if (tmppath[0] != '/')
        tmppath = '/' + tmppath;
    var path_dirs = tmppath.split('/');
    if (path_dirs[0] == '') {
        path_dirs[0] = '/';
    }
    if (path_dirs[path_dirs.length - 1] == '') {
        path_dirs.pop();
    }
    var possibleresult = await Directory.findAll({
        attributes: [
            [Sequelize.literal("Directory.dir_id"), 'dir_id'],
            [Sequelize.literal("Directory.name"), 'name'],
            [Sequelize.literal("Directory.user"), 'user'],
        ],
        where: {
            name: path_dirs[path_dirs.length - 1],
            user: user
        },
        include: [
            {
                model: DirectoryRelation,
                as: 'DR',
                attributes: [
                    ['depth', 'depth']
                ],
                where: {
                    depth: path_dirs.length - 1
                }
            }
        ],
        order: [
            [Sequelize.literal("Directory.dir_id"), 'ASC']
        ]
    }).catch(err => {
        throw new Error(err.message);
    });
    var possibleID = [];
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
        var ck_i = 0;
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
    var ck_exist = await Privilege.findAll({
        where: {
            dir_id: dir_id
        },
        transaction: tran
    })
    var opc = true;
    if (ck_exist && ck_exist.length > 0) {
        var hostPriv = 0, targetPriv = 0;
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
            user: user,
            dir_id: dir_id,
            priv: authority
        }, { transaction: tran });
    }
    else {
        await Privilege.update(
            {
                priv: authority
            },
            {
                where: {
                    user: targetUser,
                    dir_id: dir_id
                },
                transaction: tran
            }
        );
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
        var msg = null, status = 0;
        var userInfo = await User.findOne({
            where: {
                user: username,
                password: password
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
        var status = 0;
        var msg = null;
        await sequelize.transaction(async t => {
            // Insert data to database
            // Your code here
            var newuser = await User.create({
                user: username,
                password: password
            }, {transaction: t});
            let result = await Directory.findOne({
                attributes: [[sequelize.fn('MAX', sequelize.col('dir_id')), 'dir_id']],
                transaction: t
            })
            var max_i = result.dir_id + 1;
            var homedirectory = await Directory.create({
                dir_id: max_i,
                name: '/',
                user: username
            }, {transaction: t});
            var homeDR = await DirectoryRelation.create({
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
        var status = 0;
        var msg = null;
        let ck = await this.checkAuthority(dir_id, user);
        let ownship = await this.checkOwner(dir_id);
        var itemlist = [];
        if (ck.authority >= 1) {
            var dirs = await Directory.findAll({
                attributes: ['name', 'dir_id'],
                include: [
                    {
                        model: DirectoryRelation,
                        as: 'DR',
                        attributes: [
                            ['depth', 'depth']
                        ],
                        where: {
                            depth: 1,
                            ancestor: dir_id
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
            var filesindir = await FileInDirectory.findAll({
                attributes: [
                    ['file_id', 'file_id'],
                    [Sequelize.literal("File.update_time"), 'update_time'],
                    [Sequelize.literal("File.name"), 'name']
                ],
                where: {
                    dir_id: dir_id
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
        return {
            success: status,
            msg: msg,
            list: itemlist,  
            dir_id : dir_id,
            owner: ownship.owner,
            Authority: ck.authority, 
        }
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
        var status = 0;
        var msg = null;
        var tmppath = fixpath(path);
        var nowdir = await pathTodirID(tmppath, user).catch(err => {
            status = -1;
            msg = err.message;
        });
        if (nowdir == null && status == 0) {
            status = -1;
            msg = 'invaild path.';
        }
        if (status == 0) {
            var result = await this.getItemList(nowdir, user);
            if (result.success != 0) {
                status = result.success;
                msg = result.msg;
            }
        }
        else {
            var result = {
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
            status: status,
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
    // will remove file from disk at success, will not at failed
    // Input: name, dir_id, update_time, user, path, size
    // Return:{
    //      success, msg
    // }
    // Possible msg: SQL Error, 'Permission denied.'
    createFile: async function (name, dir_id, update_time, user, path, size) {
        var status = 0;
        var msg = null;
        let ck = await this.checkAuthority(dir_id, user);
        if (ck.authority > 1) {
            await sequelize.transaction(async t => {
                let f = fs.readFileSync(path);
                let result = await FileInDirectory.findOne({
                    attributes: [[sequelize.fn('MAX', sequelize.col('file_id')), 'file_id']],
                    transaction: t
                })
                var max_i = result.file_id + 1;
                let newfile = await Files.create({
                    file_id: max_i,
                    name: name,
                    update_time: update_time,
                    user: user,
                    size: size,
                    data: f
                }, { transaction: t });
                let newfile_dir = await FileInDirectory.create({
                    file_id: max_i,
                    dir_id: dir_id
                }, { transaction: t });
            }).then(r => {
                fs.unlink(path);
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
    // will remove file from disk at success, will not at failed
    // Input: name, dir_path, update_time, user, path, size
    // Return:{
    //      success, msg
    // }
    // Possible msg: SQL Error, 'invaild path.', 'Permission denied.'
    createFileByPath: async function (name, dir_path, update_time, user, path, size) {
        var status = 0;
        var msg = null;
        var tmppath = fixpath(dir_path);
        var dir_id = await pathTodirID(tmppath, user).catch(err => {
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
        var status = 0;
        var msg = null;
        await sequelize.transaction(async t => {
            if (dirname == '' || dirname.includes('/')) {
                throw new Error('invaild dirname.');
            }
            var nowdir = await pathTodirID(path, user);
            if (nowdir == null) {
                throw new Error('invaild path.');
            }
            var result = await Directory.findOne({
                attributes: [
                    ['name', 'name']
                ],
                where: {
                    name: dirname
                },
                include: [
                    {
                        model: DirectoryRelation,
                        as: 'DR',
                        attributes: [
                            ['depth', 'depth']
                        ],
                        where: {
                            depth: 1,
                            ancestor: nowdir
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
            var max_i = result.dir_id + 1;
            await Directory.create({
                dir_id: max_i,
                name: dirname,
                user: user
            }, { transaction: t });
            result = await DirectoryRelation.findAll({
                where: {
                    dir_id: nowdir
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
        var status = 0;
        var msg = null;
        await sequelize.transaction(async t => {
            await updateAuthorityInTran(dir_id, user, targetUser, authority, t);
        }).catch(err => {
            console.log(err);
            status = -1;
            msg = err.message;
        })
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
        var status = 0;
        var msg = null;
        let ck_exist = await Privilege.findOne({
            where: {
                dir_id: dir_id,
                user: user
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

    // This async function would return owner of directory
    // Input: dir_id
    // Return:{
    //      success, msg,
    //      owner
    // }
    // Possible msg: SQL Error, 'No owner or directory not exists.'
    checkOwner: async function (dir_id) {
        var status = 0;
        var owner = null;
        var msg = null;
        let ck_exist = await Privilege.findOne({
            where: {
                dir_id: dir_id,
                priv: 3
            }
        }).catch(err => {
            status = -1;
            msg = err.message;
        });
        if (ck_exist) {
            owner = ck_exist.user;
        }
        else {
            status = -1;
            msg = 'No owner or directory not exists.';
        }
        checkError(msg);
        return {
            success: status,
            msg: msg,
            owner: owner
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
        var status = 0;
        var msg = null;
        var tmppath = fixpath(path);
        var dir_id = await pathTodirID(tmppath, user).catch(err => {
            status = -1;
            msg = err.message;
        });
        if (status == 0) {
            var poi = []
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
                        dir_id: dir_id
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
        return { success: status, msg: msg, list: poi, currentPath: tmppath };
    },

    // This async function would return data of file
    // will check authority, failed when <1
    // Input: file_id, dir_id, user
    // Return:{
    //      success, msg,
    //      buf,    //if original file is empty, will be null
    //      name
    // }
    // Possible msg: SQL Error, 'Permission denied.', 'Failed to get file.'
    getFile: async function (f_id, dir_id, user) {
        var status = 0;
        var msg = null;
        let ck = await this.checkAuthority(dir_id, user);
        if (ck.authority < 1) {
            status = -1;
            msg = 'Permission denied.';
        }
        if (status == 0) {
            var result = await Files.findOne({
                where: {
                    file_id: f_id
                },
                attributes: ['name', 'data']
            });
            if (result == null || result == undefined) {
                status = -1;
                msg = 'Failed to get file.';
                result = {
                    data: null,
                    name: null,
                }
            }
        }
        else {
            var result = {
                data: null,
                name: null,
            }
        }
        checkError(msg);
        return {
            success: status,
            msg: msg,
            buf: result.data,
            name: result.name
        }
    },
}