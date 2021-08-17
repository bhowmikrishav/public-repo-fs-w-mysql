var MYSQL = require('mysql');

var conn = MYSQL.createConnection(require('./manifest.json'))

conn.connect((err)=>{
  if(err){console.log(err); return;}
  conn.query(`
    CREATE TABLE files(
      uid int unsigned NOT NULL,
      _id int unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
      dir_id int unsigned NOT NULL,
      name TINYTEXT NOT NULL,
      type char(1) NOT NULL,
      meta JSON
    );

    CREATE TABLE chunks(
      file_id int unsigned NOT NULL,
      ind int  unsigned NOT NULL,
      data LONGBLOB
    );

    CREATE TABLE users(
      id int unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
      username varchar(32) NOT NULL UNIQUE KEY,
      password varchar(32) NOT NULL
    );

    CREATE TABLE users_root(
       uid int unsigned NOT NULL UNIQUE,
       root_dir_id int unsigned NOT NULL
    );

    `, (error, results) => {
    if(error){console.log(error); conn.end(); return;}
    console.log(results);
    conn.end()
  })
})
