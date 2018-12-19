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

let encrypt = require('./dbmodels/md5');
let dbi = require('./dbi')

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
            let validate = await dbi.validateUser(username, password);
            if (validate == null || validate == undefined) {
                throw new Error('SQL Engine Error');
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
                throw new Error('Username or password incorrect, please try again.');
            }
        } catch (err) {
            console.log(err);
            return res.send({success: -1, msg: err.message})
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
        dbi.createUser(username, password)
            .then(p => {
                res.json({success: 0});
            }).catch(err => {
                res.json({ success: -1, msg: err.message });
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
        // Avoid no slash
        if (path[0] != '/')
            path = '/' + path;
        try {
            var msg = null;
            let data = await dbi.findAllItemInDir(path, user)
                .catch(err => {
                    console.log(err);
                    msg = err.message;
                });
            if (msg) {
                throw new Error(msg);
            }
            return res.render('directory', data);
        } catch(err) {
            return res.json({success: -1, msg: err.message});
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
        let path = req.body.path;
        let user = req.session.loginUser;
        if (!user)
            return res.redirect("signin");
        // Given Path
        console.log(user);
        console.log(path);
        console.log(path);

        dbi.createFile(
            name=file.originalname,
            dir_id=1,
            update_time=new Date().toUTCString(),
            user=user,
            path=file.path,
            size=file.size
        ).then(r => {
            // return res.json({success: 0});
            res.redirect('back');
        }).catch(err => {
            console.log(err);
            return res.json({success: -1, msg: err.message})
        });
    })


app.route('download')
    // input: file_id
    // Return: {buf: data, name: name}
    let file_id = 1;

    // Your code here
    // this is a async function, it would return a promise
    // not test yet!!!
async function tmp(f_id) {
    var result = await Files.findOne({
        where: {
            file_id: f_id
        },
        attributes: ['name', 'data']
    });
    if (result == null || result == undefined) {
        return false;
    }
    return {
        buf: result.data,
        name: result.name
    }
};


app.route('/mkdir').post(async (req, res) => {
    let dirname = req.body.dirname;
    let path = req.body.path;
    let user = req.session.loginUser;

    // Your code here
    // input: currentPath, dirName, user (Judge duplicate name)
    // Output: success or not
    // You should throw a error message!
    dbi.makedirectory(dirname, path, user)
        .then(p => {
            return res.send({success: 0});
        }).catch(err => {
            console.log(err)
            return res.send({ success: -1, msg: err.message })
        });
})
    

//app.route('authority')
    // input: dir_id, user(owner), targetUser, authority
    // Output: success or not


app.set('port', process.env.PORT || 8080);
app.listen(app.get('port'));
