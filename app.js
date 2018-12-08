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
// let findUser = function(username, password) {
//     return users.find(function(item) {
//         return item.username == username && item.password === password;
//     });
// }
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
    .post((req, res) => {
        let username = req.body.username;
        let password = req.body.password;
        let sess = req.session;
        
        // Judge whether it's validate
        // Your code here
        //-------This is my toy, you should implement the similar function yourself -----
        //-------*user* is undefined if it's not validate, or it is the username
        let validate = Users.findUser(username, password);
        //------------------------------------


        if (validate) {
            req.session.regenerate(function(err) {
                if (err) {
                    return res.json({success: -1})
                }
                req.session.loginUser = username;
                res.redirect('/');
            })
        } else {
           return res.json({success: -1})
        }
    })

app.route('/logout').post((req, res) => {
    req.session.destroy(function(err) {
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
        let password = req.body.password;
        console.log(username, password);

        // Insert data to database
        // Your code here

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
