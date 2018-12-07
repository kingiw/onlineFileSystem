let express = require('express');
let app = express();
let bodyParser = require('body-parser')
app.use(express.static('static'))
app.use(bodyParser.urlencoded({ extended: false}))
app.use(bodyParser.json())
let templatePath = __dirname + '/templates/'

const User = require('./dbmodels/user');

app.get('/', function(req, res){
    res.send('Hello world')
})
app.get('/signin', function(req, res) {
    res.sendFile(templatePath + 'signin.html')
})

app.get('/signup', function(req, res) {
    res.sendFile(templatePath + 'signup.html')
})

app.post('/sign-in', function(req, res){
    let username = req.body.username
    let password = req.body.password;
    console.log(username);
    console.log(password);
    var response = {
        "user": req.body.username,
        "password": req.body.password
      };
    User.findOne({
        where: {
            user: response.user,
            password: response.password
        }
    }).then(userInfo => {
        if (userInfo) {
            console.log('Login Success.');
        }
        else {
            console.log('Login Failed.');
        }
    }).catch(err => {
        response.status = 'ERROR';
        console.log('Login ERROR.');
        res.end(JSON.stringify(response));
    });
    res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});
    res.end(JSON.stringify(response))
})

let server = app.listen(8080, function() {
    let host = server.address().address;
    let port = server.address().port;
    console.log("%s %s", host, port);
})

