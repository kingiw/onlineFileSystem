## 2018秋季学期数据库项目报告

数据科学与计算机学院  计算机科学与技术

刘梓晖(16337166) 區炜彬(16337202)



### 简介

我们的项目是基于关系型数据库MySQL做的一个简单的web端云文件管理与共享平台。使用的Express框架搭建，UI使用了Semantic-UI。本篇报告将主要介绍所开发项目的主要功能，**着重讲述数据库部分的设计思想**，并简要概述网页设计以及网页效果。

**您可以通过访问cloud.a来使用我们的项目。如果网页无法打开或出现任何Bug，请务必联系我们！**

项目源代码请查看https://github.com/kingiw/onlineFileSystem，里面包含了这个项目的**所有代码**以及我们**开发过程记录**（repo->insights）。



### 核心功能

##### 云端文件管理

用户在网站上拥有属于自己的一个简易文件系统，他们可以在其中创建文件夹，上传文件到云端，从云端上下载文件到本地。（但由于我们服务器硬件设备的限制，我们暂时只能够允许用户上传不大于1Mb的文件）

##### 文件共享

用户可以给其他用户以多种权限分享自己的一个或多个文件夹给其他用户。

在具体的使用中，用户A可以给用户B分享自己某个文件夹的**只读**权限，那么用户B将可以查看并下载该文件夹下的文件，但用户B并不能够上传自己的文件到该文件夹中。用户A也可以向用户B分享自己某个文件夹的**可写**权限，那么用户B不仅可以查看或下载该文件夹中的文件，还能够把自己的文件上传到该文件夹中。

**您可以查看附带在提交内容当中的视频查看功能效果。也可以亲自到网站上**

### 数据库设计

在我们的项目中，数据库中的关系包括以下若干。

##### User

定义了用户的用户名与密码。

```mysql
create table if not exists User(
    user varchar(255) not null,
    password varchar(255) not null,
    PRIMARY KEY(user)
);
```

##### Directory

定义了一个文件夹的信息。

```mysql
create table if not exists Directory(
    dir_id int not null,
    name varchar(255) not null,
    user varchar(255),
    PRIMARY KEY(dir_id),
    CONSTRAINT FK_Directory_User foreign key(user) references User(user) on delete set null
);
```

##### DirectoryRelation

这个关系用于记录一个文件夹的祖先文件夹以及其在文件夹树当中的深度，主要用于解决在关系型数据库中实现对树状数据结构的存储问题。后文有对此的详细解释。

```mysql
create table if not exists DirectoryRelation(
    dir_id int not null,
    ancestor int not null,
    depth int not null,
    PRIMARY KEY(dir_id, ancestor),
    CONSTRAINT FK_DR_D foreign key(dir_id) references Directory(dir_id) on delete cascade,
    CONSTRAINT FK_DR_A foreign key(ancestor) references Directory(dir_id) on delete cascade
);
```

##### File

定义用户上传的文件的信息。

```mysql
create table if not exists File(
    file_id int not null,
    name varchar(255) not null,
    update_time varchar(255) not null,
    user varchar(255),
    size int,
    path varchar(255),	-- The path that contains the file.
    PRIMARY KEY(file_id),
    CONSTRAINT FK_File_User foreign key(user) references User(user) on delete set null
);
```

##### FileInDirectory

记录File与Directory之间的关系，表示某个文件被存放在某个文件夹中。

```mysql
create table if not exists FileInDirectory(
    file_id int not null,
    dir_id int not null,
    PRIMARY KEY(file_id, dir_id),
    CONSTRAINT FK_FileInDirectory_File foreign key(file_id) references File(file_id) on delete cascade,
    CONSTRAINT FK_FileInDirectory_Directory foreign key(dir_id) references Directory(dir_id) on delete cascade
);
```

##### Privilege

记录每个用户对每一个文件夹的权限值。我们对于权限值的规定如下：

|权限级别|允许动作|
|---|:--|
|不可读写(0)|不可访问该文件夹的所有信息。|
|只读(1)|用户可以访问该文件夹下的所有信息, **但该文件夹下的子文件夹的访问权限由子文件夹决定**, 用户可以下载该文件夹下的所有文件。|
|可写(2)|包含只读权限下的所有动作, 且用户可以上传文件, 删除文件, 重命名子文件夹, **可以删除该文件夹下的子文件夹, 不管该用户对该子文件夹的权限如何**, 但不能删除该文件夹本身。|
|所有权(3)|包含可写权限下的所有动作, 且用户可以控制该文件夹的分享权限。默认只有文件夹的拥有者具有该权限，且该权限不可被分享。|

其关系中的属性定义如下：

```mysql
create table if not exists Privilege(
    user varchar(255) not null,
    dir_id int not null,
    priv int,
    PRIMARY KEY(user, dir_id),
    CONSTRAINT FK_Privilege_User foreign key(user) references User(user) on delete cascade,
    CONSTRAINT FK_Privilege_Directory foreign key(dir_id) references Directory(dir_id) on delete cascade
);
```

##### FileLog

用于记录每一次上传/下载的日志。

```mysql
create table if not exists FileLog(
    log_id int not null,
    action char(10) not null,
    timestamp varchar(255) not null,
    user varchar(255),
    file_id int,
    PRIMARY KEY(log_id)
);
```

##### PrivilegeLog

```mysql
create table if not exists PrivilegeLog(
    log_id int not null,
    action char(10) not null,
    timestamp varchar(255) not null,
    newval int,
    dir_id int,
    user varchar(255),
    targetuser varchar(255),
    PRIMARY KEY(log_id)
);
```



### 前端与后端的搭建

我们的网站采用的Nodejs(Express)+SQL的框架，前端UI使用Semantic-UI。以下

##### 前端模版渲染

模板渲染框架采用了nodejs自带的[express-handlebars](https://www.npmjs.com/package/express-handlebars)实现。

```javascript
let exphbs = require('express-handlebars'); // 引用express-handlebars库
//声明模版引擎
app.engine('hbs', exphbs({
    layoutsDir: 'views',	//模板文件的路径
    defaultLayout: 'layout', //默认layout的文件名
    extname: '.hbs' //模板文件的拓展名
}));
app.set('view engine', 'hbs');
```

这里详述一下`defaultLayout`。它表示一个“框架文件”，每次渲染模板时，都会把内容放入到`{{body}}`部分。

```html
<!-- views/layout.hbs -->
<!DOCTYPE html>
<html>
<head>
    <!-- HTML的默认配置信息，样式表信息 -->
</head>
<body>
    <div class="ui container"> <!-- Semantic UI 框架的最外层DOM-->
        {{{body}}}
    </div>
</body>
<!-- 一些Js脚本信息 -->
</html>
```

在express下重新声明模板渲染的机制，在每次加载网页时都会重新渲染模板。详情请看代码。

##### 登录账户的cookie

为了提高用户体验，我们专门做了登录账户的cookie以实现短期内免密登录。

```javascript
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
```



##### 上传与下载文件

这部分我们使用了nodejs自带的[multer](https://www.npmjs.com/package/multer)库来实现。

##### 密码的处理

根据老师上课所说，我们没有在数据库中直接存用户的密码明文，而是存储了md5加密后的密文。这样防止数据库信息被盗取时导致用户密码的明文泄漏。另外，为了避免用户使用常见密码，导致可以使用某些md5 cracker破解，每次处理对密码进行加密时是使用“账户+密码”相连：

```javascript
let password = encrypt.md5(req.body.username + req.body.password);
```



### 待改进工作

1. 暂时不支持对文件的删除功能。
2. 暂时不支持用户组操作。
3. **不支持中文文件名与文件夹名! 请不要尝试上传中文文件名的文件。**
4. 使用分布式数据库提高项目的可适用程度。

##### 

### 队员分工

刘梓晖：负责提出项目设想，网站前端设计，网站后端接口设计。

區炜彬：负责对数据库的设计，为网站后端提供了数据库读写API，负责服务器端项目部署工作。

### 网站展示

您可以查看提交内容中附带的视频文件了解网站功能。

您也可以访问http://cloud.alayse.org/来亲自尝试一下。我们事先在网站中准备了一些帐号供使用，账号名分别为`bob`，`alice`， `john`，他们的登陆密码都是`123456`。当然您也可以注册您自己的账户。







### 说在最后

尽管我们已经做过很多测试，但因为这个项目完全是从零做起的，只是一个简易的demo，且同时我们的服务器确实也比较渣，所以我们不确保网站会不会因为突然出现意料之外的问题。如果遇到问题，恳请您原谅。