CREATE DATABASE onefile;

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
  _id int unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username varchar(32) NOT NULL UNIQUE KEY,
  password varchar(32) NOT NULL
);
CREATE TABLE users_root(
  uid int unsigned NOT NULL UNIQUE KEY,
  root_dir_id int unsigned NOT NULL UNIQUE KEY
);

SELECT uid, _id, type, meta FROM files LIMIT 10;

SELECT * FROM users LIMIT 10;
SELECT * FROM users_root LIMIT 10;

SELECT file_id, ind, OCTET_LENGTH(data) FROM chunks;

DROP TABLE files;
DROP TABLE chunks;
DROP TABLE users;
DROP TABLE users_root;
