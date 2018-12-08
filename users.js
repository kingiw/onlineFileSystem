let account = [
    {username: 'kingiw', password: '123456'},
]

module.exports = {
    findUser: function(username, password) {
        user = account.find(function(item) {
            return item.username === username && item.password === password;
        })
        return (user != undefined);
    }
}
