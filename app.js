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
let encrypt = require('./dbmodels/md5')

app.use(session({
    name: identityKey,
    secret: 'signature',    //用来对session id相关的cookie进行签名
    store: new FileStore(), //本地存储session
    saveUninitialized: false,   // 是否自动保存为初始化会话
    resave: false,  //是否每次都重新保存会话
    cookie: {
        maxAge: 300 * 1000   // 有效期，单位毫秒
    }
}))

//--------My toy------------------
let Users = require('./users');   // Temporarily used for test
//-----------------------------------

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
            var userInfo = await User.findOne({
                where: {
                    user: username,
                    password: password
                }
            });
            if (userInfo) {
                req.session.regenerate(function(err) {
                    if (err) {
                        return res.json({success: -1})
                    }
                    req.session.loginUser = username;
                    res.redirect('/');
                })
            }
            else {
                return res.json({success: -1, msg: 'Username or password incorrect, please try again.'})
            }
        } catch (err) {
            console.log('SQL ERROR.');
            return res.json({success: -1})
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
                res.redirect('signin');
            }).catch(err => {
                res.json({ success: -1, 'msg': 'Error occurs.' });
            })
    })

// Personal page
app.route('/:user')
    .get((req, res) => {
        let user = req.session.loginUser;
        if (!user) 
            return res.redirect('signin');
        if (user != req.params.user)
            return res.render('404', {
                layout: false
            });
        let path = req.query.path;
        if (!path)
            return res.redirect('/');
        try {
            let data = async function() {
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
                    where: {
                        parent_id: nowdir
                    },
                    order: [
                        ['name', 'ASC']
                    ]
                });
                var filesindir = await FileInDirectory.findAll({
                    where: {
                        dir_id: nowdir
                    },
                    include: [Files],
                    order: [
                        [Sequelize.literal("File.name"), 'ASC']
                    ]
                });
                for (let i of dirs) {
                    itemlist.push({ 'path': i.name, 'type': 'dir' });
                }
                for (let i of filesindir) {
                    itemlist.push({ 'path': i.name, 'type': 'file' });
                }
                return {
                    list: itemlist,
                    currentPath: path,
                    owner: user,
                    Authority: 4, 
                }
            }();
            return res.render('directory', data);
        } catch(err) {
            return res.json({success: -1, msg: 'Error occurs'});
        }
    })


app.route('/shared/:user')
    .get(function(req, res) {
        let user = req.session.loginUser;
        if (!user) 
            return res.redirect('signin');
        if (user != req.params.user)
            return res.status(404);
        let path = req.query.path;
        if (!path)
            return res.redirect('/');

        // I haven't done that yet
            
    })

// Toy of loading 
let upload = multer({
    dest: __dirname + '../public/uploads',
    limits: {fileSize: 1024 * 1024, files: 1},
})
app.route('/upload')
    .get(function(req, res) {
        res.render('upload');
    })
    .post(upload.single('file'), (req, res)=> {
        let file = req.file;
        let user = req.session.loginUser;
        if (!user)
            return res.redirect("signin");
        console.log(user);
        console.log(file);

        try {
            // You should write the file to the database here


            // Maybe the following code can help you understand:
            // let col = await loadCollection(COLLECTION_NAME, db);
            // let data = col.insert(file);
            // db.saveDatabase();
            
        } catch(err) {
            return res.json({success: -1, msg: 'Error occurs.'})
        }

        return res.json({success: 0});
 
    })

app.set('port', process.env.PORT || 8080);
app.listen(app.get('port'));
