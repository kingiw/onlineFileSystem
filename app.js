let express = require('express');
let app = express();

let bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

let hbs = require('hbs');
app.set('view engine', 'html');
app.engine('html', hbs.__express);

let multer = require('multer');

let session = require('express-session');
let FileStore = require('session-file-store')(session);
let identityKey = '1234567890';

let User = require('./dbmodels/user');
let Directory = require('./dbmodels/directory');
let FileInDirectory = require('./dbmodels/fileindirectory');
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

app.use(express.static('public'));



//Index
app.get('/', (req, res) => {
    let sess = req.session;
    let loginUser = sess.loginUser;
    let isLogin = !!loginUser;  // is loginUser undefined
    if (isLogin) {
        Directory.findOne({
            where: {
                name: loginUser,
                user: loginUser
            }
        }).then(homedirectory => {
            console.log(JSON.stringify(homedirectory));
            Directory.findAll({
                where: {
                    parent_id: homedirectory.dir_id
                }
            }).then(dir_items => {
                FileInDirectory.findAll({
                    where: {
                        dir_id: homedirectory.dir_id
                    }
                }).then(file_items => {
                    for (d in dir_items) {
                        console.log(JSON.stringify(d));
                    }
                    for (f in dir_items) {
                        console.log(JSON.stringify(f));
                    }
                });
            });
        });
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
    .post((req, res) => {
        let username = req.body.username;
        let password = encrypt.md5(req.body.password);
        let sess = req.session;
        
        // Judge whether it's validate
        User.findOne({
            where: {
                user: username,
                password: password
            }
        }).then(userInfo => {
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
                return res.json({success: -1})
            }
        }).catch(err => {
            console.log('SQL ERROR.');
            return res.json({success: -1})
        });
    })

app.route('/logout').post((req, res) => {
    req.session.destroy(err => {
        if (err) {
            res.json({success: -1});
            return;
        }
        res.clearCookie(identityKey);
        res.redirect('/');
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

        // Insert data to database
        // Your code here
        User.create({
            user: username,
            password: password
        }).then(p => {
            console.log('created.' + JSON.stringify(p));
            var max_i = 0
            Directory.findAll()
                .then(directories => {
                    for (let d in directories) {
                        if (d.dir_id > max_i) {
                            max_i = d.dir_id
                        }
                        if (d.user == username) {
                            console.log('failed: user directory created');
                            return;
                        }
                    }
                    max_i += 1
                    Directory.create({
                        dir_id: max_i,
                        name: username,
                        user: username,
                        parent_id: null
                    }).then(p => {
                        console.log('created.' + JSON.stringify(p));
                    }).catch(err => {
                        console.log('failed: ' + err);
                    });
                })
                .catch(err => {
                    console.log('failed: ' + err);
                });
        }).catch(err => {
            console.log('failed: ' + err);
        });
        res.redirect('/');
    })



// Toy of loading 
let uploading = multer({
    dest: __dirname + '../public/uploads',
    limits: {fileSize: 1024 * 1024, files: 1},
})
app.route('/upload')
    .get(function(req, res) {
        res.render('upload');
    })
    .post((req, res)=> {
        console.log('get something');
        res.send('Done');
    })

app.set('port', process.env.PORT || 8080);
app.listen(app.get('port'));
