let crypto=require('crypto')

module.exports = {
    md5_randomsuffix: function (){
        return Math.random().toString().slice(2, 5);
    },
    md5: function (pwd) {
        let md5 = crypto.createHash('md5');
        return md5.update(pwd).digest('hex')
    }
}