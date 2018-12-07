let express = require('express');
let app = express();
let bodyParser = require('body-parser')
app.use(express.static('static'))
app.use(bodyParser.urlencoded({ extended: false}))
app.use(bodyParser.json())
let templatePath = __dirname + '/templates/'

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
        "success": 0,
    }
    res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});
    res.end(JSON.stringify(response))
})

let server = app.listen(8080, function() {
    let host = server.address().address;
    let port = server.address().port;
    console.log("%s %s", host, port);
})

