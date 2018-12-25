USE DCWEB;
create table if not exists User(
    user varchar(255) not null,
    password varchar(255) not null,
    PRIMARY KEY(user)
);
create table if not exists Directory(
    dir_id int not null,
    name varchar(255) not null,
    user varchar(255),
    PRIMARY KEY(dir_id),
    CONSTRAINT FK_Directory_User foreign key(user) references User(user) on delete set null
);
create table if not exists DirectoryRelation(
    dir_id int not null,
    ancestor int not null,
    depth int not null,
    PRIMARY KEY(dir_id, ancestor),
    CONSTRAINT FK_DR_D foreign key(dir_id) references Directory(dir_id) on delete cascade,
    CONSTRAINT FK_DR_A foreign key(ancestor) references Directory(dir_id) on delete cascade
);
create table if not exists File(
    file_id int not null,
    name varchar(255) not null,
    update_time varchar(255) not null,
    user varchar(255),
    size int,
    data blob,
    PRIMARY KEY(file_id),
    CONSTRAINT FK_File_User foreign key(user) references User(user) on delete set null
);
create table if not exists FileInDirectory(
    file_id int not null,
    dir_id int not null,
    PRIMARY KEY(file_id, dir_id),
    CONSTRAINT FK_FileInDirectory_File foreign key(file_id) references File(file_id) on delete cascade,
    CONSTRAINT FK_FileInDirectory_Directory foreign key(dir_id) references Directory(dir_id) on delete cascade
);
create table if not exists Privilege(
    user varchar(255) not null,
    dir_id int not null,
    priv int,
    PRIMARY KEY(user, dir_id),
    CONSTRAINT FK_Privilege_User foreign key(user) references User(user) on delete cascade,
    CONSTRAINT FK_Privilege_Directory foreign key(dir_id) references Directory(dir_id) on delete cascade
);