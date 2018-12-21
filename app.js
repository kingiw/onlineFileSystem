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

let uploadpath = '/public/uploads';

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
        let validate = await dbi.validateUser(username, password);
        if (validate.success == 0) {
            req.session.regenerate(function (err) {
                if (err) {
                    return res.json({ success: -1, msg: 'Error occurs while regenerate session.'})
                }
                req.session.loginUser = username;
                return res.send({ success: 0 })
            })
        }
        else
            return res.send(validate);
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
    .post(async (req, res) => {
        let username = req.body.username;
        let password = encrypt.md5(req.body.password);
        return res.json(await dbi.createUser(username, password));
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
app.route('/shared/:user')
    .get(async (req, res) => {
        let user = req.session.loginUser;
        if (!user)
            return res.redirect('/signin');
        if (user != req.params.user)
            return res.render('404', {
                layout: false
            });
        let path = req.query.path;
        if (!path || path == '') {
            let data = await dbi.getSharedList(user);
            if (data.success == 0)
                return res.render('shareddirectory', data);
            else
                return res.json({ success: -1, msg: data.msg });
        }
        else {
            let data = await dbi.getItemList(Number(path), user);
            if (data.success == 0)
                return res.render('shareddirectory', data);
            else
                return res.json({ success: -1, msg: data.msg });
        }
    });

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
        let data = await dbi.getItemListByPath(path, user);
        if (data.success == 0)
            return res.render('directory', data);
        else
            return res.json({ success: -1, msg: data.msg });
    })

// loading files
let upload = multer({
    dest: '.' + uploadpath,
    limits: {fileSize: 1024 * 1024, files: 1},
})
app.route('/upload')
    .get((req, res) => {
        return res.render('upload');
    })
    .post(upload.single('file'), async (req, res)=> {
        let file = req.file;
        let path = req.body.path;
        let user = req.session.loginUser;
        if (!user)
            return res.redirect("signin");
        
        if (file) {
            var status=await dbi.createFileByPath(
                name=file.originalname,
                dir_path=path,
                update_time=new Date().toUTCString(),
                user=user,
                path=file.path,
                size=file.size
            )
        }
        else {
            var status = {
                success: -1,
                msg: 'No file selected.'
            }
        }
        if (status.success == 0)
            res.redirect('back');
        else
            return res.json(status);
    })


app.route('/download')
    .get(async (req, res) => {
        let path = req.query.path;
        let t = path.split('/');
        if (t.length != 2) {
            res.json({
                success: -1,
                msg: 'invaild path.'
            })
        }
        let f_id = t[1];
        let dir_id = t[0];
        let user = req.session.loginUser;
    
        let data = await dbi.getFile(f_id, dir_id, user);
        if (data.success == 0) {
            return res.download(data.path, data.name);
        }
        else {
            return res.send(data);
        }
    })
    .post(async (req, res) => {
        let f_id = req.body.file_id;
        let dir_id = req.body.dir_id;
        let user = req.session.loginUser;
    
        let data = await dbi.getFile(f_id, dir_id, user);
        if (data.success == 0) {
            return res.download(data.path, data.name);
        }
        else {
            return res.send(data);
        }
    });


app.route('/mkdir').post(async (req, res) => {
    let dirname = req.body.dirname;
    let path = req.body.path;
    let user = req.session.loginUser;

    // Your code here
    // input: currentPath, dirName, user (Judge duplicate name)
    // Output: success or not
    // You should throw a error message!
    return res.send(await dbi.makedirectory(dirname, path, user))
})
    

app.route('/user/manage/:user').get(async (req, res) => {
    let path = req.query.path;
    let user = req.session.loginUser;
    console.log(user);
    // Return a list of authority list 
    // Just like this:
    // Authority level
    // 1: read only
    // 2: writable
    data = await dbi.getAuthorityList(path, user);
    res.render('manage', data);
})

app.route('authority').post((req, res) => {
    let owner = req.session.loginUser;
    let target = req.body.target;
    let authority = req.body.authority;
    let dir_id = req.body.dir_id; 
    // input: dir_id, user(owner), targetUser, authority
    // Output: success or not
})


app.set('port', process.env.PORT || 8080);
app.listen(app.get('port'));


