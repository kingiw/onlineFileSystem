let express = require('express');
let app = express();

let bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

let exphbs = require('express-handlebars');
app.engine('hbs', exphbs({
    layoutsDir: 'views',
    defaultLayout: 'layout',
    extname: '.hbs' 
}));
app.set('view engine', 'hbs');


let multer = require('multer');

let session = require('express-session');
let FileStore = require('session-file-store')(session);
let identityKey = '1234567890';

let Sequelize = require('sequelize');
let sequelize = require('./dbmodels/orm');
let User = require('./dbmodels/user');
let Directory = require('./dbmodels/directory');
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
let encrypt = require('./dbmodels/md5');

let fs = require('fs');

app.use(session({
    name: identityKey,
    secret: 'signature',    //用来对session id相关的cookie进行签名
    store: new FileStore(), //本地存储session
    saveUninitialized: false,   // 是否自动保存为初始化会话
    resave: false,  //是否每次都重新保存会话
    cookie: {
        maxAge: 3600 * 1000   // 有效期，单位毫秒
    }
}))


app.use(express.static('public'));



//Index
app.get('/', (req, res) => {
    let sess = req.session;
    let loginUser = sess.loginUser;
    let isLogin = !!loginUser;  // is loginUser undefined
    if (isLogin) {
        res.render('index', {
            username: loginUser || ''
        });
    } else {
        res.redirect('/signin');
    }
    
})

//Sign In
app.route('/signin')
    .get((req, res) => {
        res.render('signin');
    })
    .post(async (req, res) => {
        let username = req.body.username;
        let password = encrypt.md5(req.body.password);
        let sess = req.session;
        
        // Judge whether it's validate
        try {
            let validate = await async function () {
                var userInfo = await User.findOne({
                    where: {
                        user: username,
                        password: password
                    }
                }).catch(err => {
                    return -1;
                });
                if (userInfo == -1) {
                    return null;
                }
                if (userInfo) {
                    return true;
                }
                else {
                    return false;
                }
            }();
            if (validate == null || validate == undefined) {
                throw new Error();
            }
            if (validate) {
                req.session.regenerate(function (err) {
                    if (err) {
                        return res.json({ success: -1, msg: 'Error occurs while regenerate session.'})
                    }
                    req.session.loginUser = username;
                    return res.send({ success: 0 })
                })
            }
            else {
                return res.send({ success: -1, msg: 'Username or password incorrect, please try again.' })
            }
        } catch (err) {
            console.log(err);
            return res.send({success: -1, msg: 'Unknown error occurs!'})
        };
    })

app.route('/logout').post((req, res) => {
    req.session.destroy(err => {
        if (err) {
            res.json({success: -1});
            return;
        }
        res.clearCookie(identityKey);
        res.redirect('back');
    })
})

//Sign up
app.route('/signup')
    .get((req, res) => {
        res.render('signup');
    })
    .post((req, res) => {
        let username = req.body.username;
        let password = encrypt.md5(req.body.password);
        console.log(username, password);
        sequelize.transaction(async t => {
                // Insert data to database
                // Your code here
                var newuser = await User.create({
                    user: username,
                    password: password
                }, {transaction: t});
                console.log('created.' + JSON.stringify(newuser));
                var max_i = 0
                var directories = await Directory.findAll();
                for (var d of directories) {
                    if (d.dir_id > max_i) {
                        max_i = d.dir_id
                    }
                    if (d.user == username) {
                        console.log('failed: user directory created');
                        Error;
                    }
                }
                max_i += 1
                var homedirectory = await Directory.create({
                    dir_id: max_i,
                    name: '/',
                    user: username,
                    parent_id: null
                }, {transaction: t});
                console.log('created.' + JSON.stringify(homedirectory));
            }).then(p => {
                console.log("123");
                res.json({success: 0});
            }).catch(err => {
                res.json({ success: -1, 'msg': 'Error occurs.' });
            })
    })

//To Root Directory
app.route('/root').get((req, res) => {
    let user = req.session.loginUser;
    if (!user) 
        return res.redirect('signin');
    else
        return res.redirect('/user/' + user);
})


/*
Display the directories shared to current user
app.route('/user/shared/:owner')
    .get(function(req, res) {
        let user = req.session.loginUser;
        if (!user) 
            return res.redirect('signin');
        if (user != req.params.user)
            return res.status(404);
        let path = req.query.path;

        // index page of shared
        if (!path)
            
            // Input: path, user

            // Get info of the share index page
            // Directory Name | Owner | Authority

       
            
    })
*/

// Display the directories shared to current user
app.route('/user/shared/:user')
    .get(function(req, res) {
        let user = req.session.loginUser;
        if (!user)
            return 
    })

// Personal page
app.route('/user/:user')
    .get(async (req, res) => {
        let user = req.session.loginUser;
        if (!user) 
            return res.redirect('/signin');
        if (user != req.params.user)
            return res.render('404', {
                layout: false
            });
        let path = req.query.path;
        if (!path)
            path = '/';
        try {
            let data = await async function() {
                // You should read the database and return the file list in *path*
                // Your code here
                var homedirectory = await Directory.findOne({
                    where: {
                        name: '/',
                        user: user
                    }
                });
                var nowdir = homedirectory.dir_id;
                var path_dirs = path.split('/');
                console.log(path_dirs);
                for (let p of path_dirs) {
                    if (p == '' || p == undefined || p == null){
                        break;
                    }
                    var nextdirectory = await Directory.findOne({
                        where: {
                            name: p,
                            parent_id: nowdir
                        }
                    })
                    if (nextdirectory) {
                        nowdir = nextdirectory.dir_id;
                    }
                    else {
                        throw new Error();
                    }
                }
                var itemlist = [];
                var dirs = await Directory.findAll({
                    attributes: ['name', 'dir_id'],
                    where: {
                        parent_id: nowdir
                    },
                    order: [
                        ['name', 'ASC']
                    ]
                });
                var filesindir = await FileInDirectory.findAll({
                    attributes: [
                        ['file_id', 'file_id'],
                        [Sequelize.literal("File.name"), 'name']
                    ],
                    where: {
                        dir_id: nowdir
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
                });
                for (let i of dirs) {
                    itemlist.push({ 'name': i.dataValues['name'], 'dir':1, 'id':i.dataValues['dir_id']});
                }
                for (let i of filesindir) {
                    itemlist.push({ 'name': i.dataValues['name'], 'file':1, 'id':i.dataValues['file_id']});
                }
                return {
                    list: itemlist,  
                    // [{'name': ..., 'id':...}]
                    currentPath: path, // Hotspot!!!! How to get Full path
                    dir_id : nowdir,
                    owner: user, // Who owns the directory
                    Authority: 3, 
                }
            }();
            return res.render('directory', data);
        } catch(err) {
            return res.json({success: -1, msg: 'Error occurs'});
        }
    })

// loading files
let upload = multer({
    dest: __dirname + '/public/uploads',
    limits: {fileSize: 1024 * 1024, files: 1},
})
app.route('/upload')
    .get((req, res) => {
        return res.render('upload');
    })
    .post(upload.single('file'), (req, res)=> {
        let file = req.file;
        let user = req.session.loginUser;
        if (!user)
            return res.redirect("signin");
        // Given Path
        console.log(user);
        console.log(file);

        target = {
            name: file.originalname,
            dir_id: 1,
            update_time: new Date().toUTCString(),
            user: user,
            path: file.path,
            size: file.size,
        };
        sequelize.transaction(async t => {
            let f = fs.readFileSync(target.path);
            var max_i = 0
            var allfiles = await FileInDirectory.findAll();
            for (let file of allfiles) {
                if (file.file_id > max_i) {
                    max_i = file.file_id
                }
            }
            let newfile = await Files.create({
                file_id: max_i + 1,
                name: target.name,
                update_time: target.update_time,
                user: target.user,
                size: target.size,
                data: f
            }, { transaction: t });
            let newfile_dir = await FileInDirectory.create({
                file_id: max_i + 1,
                dir_id: target.dir_id
            }, { transaction: t });
        }).then(r => {
            fs.unlink(target.path);
            // return res.json({success: 0});
            res.redirect('back');
        }).catch(er => {
            console.log(er);
            return res.json({success: -1, msg: 'Error occurs.'})
        });
    })


app.route('download')
    // input: file_id
    // Return: {buf: data, name: name}
    let file_id = 1;

    // Your code here



app.route('/mkdir').post((req, res) => {
    let dirname = req.body.dirname;
    let path = req.body.path;

    let success = false;
    // Your code here
    // input: currentPath, dirName, user (Judge duplicate name)
    // Output: success or not
    // You should throw a error message!

    if (success) {
        return redirect('back');
    } else {
        return res.send({success: -1, msg: "Error occurs."})
    }
})
    

//app.route('authority')
    // input: dir_id, user(owner), targetUser, authority
    // Output: success or not


app.set('port', process.env.PORT || 8080);
app.listen(app.get('port'));
