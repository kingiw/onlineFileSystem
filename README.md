
## 工具
后端使用express.js + MySQL。
前端UI框架: Semantic UI。


## 基本约定
1. 支持用户注册登录。
2. 每一个用户拥有一个自己的根目录, 路径为`/`。
3. 所有的文件与文件夹有都有路径, 所有的文件与文件夹的一级目录都**必须**是根目录。
4. 域名约定如下:
```
Index: https://domain
Sign up: https://domain/signup
Sign in: https://domain/signin
Directories Contents: https://domain/user/[user]?path=[path]
Directories Managements: https://domain/user/manage/[user]?path=[path]
Shared files or directories: https://domain/shared/[user]?dir_id=[dir_id]
```
举例说明: Dexan上传了一个名为`1.txt`的文件到`/dir`文件夹下, 则该文件的路径为`/dir/1.txt`。kingiw分享了一个文件夹给Dexan, 则Dexan账户下访问该文件夹的方式为`https://domain/user/shared/Dexan?id=[dir_id]`, 其中`dir_id`是文件夹的主键, 下文会再阐述。


5. 所有用户的文件夹对每个用户状态有三种: **不可读写**, **只读**, **可写**, **所有权**。它们三者的权限分别是:

|权限级别|允许动作|
|---|---|
|不可读写(0)|不可访问该文件夹的所有信息|
|只读(1)|用户可以访问该文件夹下的所有信息, **但该文件夹下的子文件夹的访问权限由子文件夹决定**, 用户可以下载该文件夹下的所有文件。|
|可写(2)|包含只读权限下的所有动作, 且用户可以上传文件, 删除文件, 重命名子文件夹, **可以删除该文件夹下的子文件夹, 不管该用户对该子文件夹的权限如何**, 但不能删除该文件夹本身。|
|所有权(3)|包含可写权限下的所有动作, 且用户可以控制该文件夹的分享权限。|


默认每个用户对自己的所有文件夹都有所有权权限，在没有分享的情况下默认所有用户对其他用户的文件夹只有不可读写的权限。

6. **分享**。用户对拥有所有权的文件夹可执行分享操作, 授予或撤销其他用户对该文件夹的只读或可写权限。
7. **下文中所有与“用户组”有关的功能可以暂时先不做。**


## 文件夹功能
1. 用户可以在某个文件夹下上传文件。
2. 用户可以在文件夹中递归创建新的子文件夹。
3. 分享文件夹给某个用户或用户组。
4. 删除文件与子文件夹。

## 文件功能
1. 下载。只要用户对该文件所在文件夹有只读或以上级别的权限, 用户可以通过直接访问该文件的**域名**来下载。若用户没有相关权限, 则用户在访问该域名时会返回错误信息。
2. 删除。

## 用户组(可以先不做)
1. 设置多个用户作为一个用户组。


## 数据库结构

加粗值为主键, 外键会特别标出。有一些显而易见的内容我省略不写。

|关系名|属性|备注|
|---|---|---|
|User|**user**, password|适当可以加一些其他的|
|Directory|**dir_id**(int), name(char(255)), user(char(255), FK Ref User, not null)|注意name是文件夹名字而不是路径, user表示对这个文件夹拥有所有权的用户|
|File|**file_id**(int), name(char(255)), update_time(char(255)), user(char(255), FK Ref User), size(int), data(blob)|user表示上传该文件的用户, size表示文件大小, data表示文件数据本身|
|FileInDirectory|**file_id**, **dir_id**|表示文件file_id在文件夹dir_id下|
|ReadOnly|**user**, **dir_id**|表示用户user对文件夹dir_id有只读全写|
|Writable|**user**, **dir_id**|表示用户user对文件夹dir_id有写权限|
|Log|**log_id**, time, info(char(255))|记录日志, 这个表可有可无。time表示产生日志的时间。info是日志信息, 视作字符串即可。|
|Group|**group_id**, user|表示用户组group_id是由user设立的|
|UserInGroup|**user**, **group_id**|表示user是group_id分组内的成员|


