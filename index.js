var FS = require('fs')
var JWT = require('jsonwebtoken')

var MYSQL = require('mysql')
const STREAM = require('stream')
//var JIMP = require('jimp');

var MANIFEST = require('manifest.json')

class DB_Manager {
  static mk_new_connection(){
    return new Promise(function(resolve, reject) {
      try{
        var conn = MYSQL.createConnection(MANIFEST.DB_CONFIG)
        conn.connect((err)=>{
          if(err){reject(err); return;}
          resolve(conn)
        })
      }catch(e){
        reject(e)
      }
    });
  }
  static insert(tablename, dataset, conn){
    return new Promise(async (resolve, reject) => {
      try{
        var connabsent = (!conn)
        if (connabsent) conn = await DB_Manager.mk_new_connection()

        conn.query(`INSERT INTO ${tablename} SET ? ;`, dataset, (error, results) => {
          if(error){reject(error); conn.end(); return;}
          if (connabsent) conn.end();
          resolve(results.insertId)
        })

      }catch(e){
        reject(e)
      }
    });
  }
  static find(tablename, outputs, dataset, conn){
    return new Promise(async (resolve, reject) => {
      try {
        var connabsent = (!conn)
        if (connabsent) conn = await DB_Manager.mk_new_connection()

        var query = `SELECT ${outputs.join(', ')} FROM ${tablename}`, q_diminsh = false
        for (var i in dataset) {
          if(!q_diminsh){query+=' WHERE'}
          if(q_diminsh){query+=' &&'}
          query+=` ${i} = ?`
          q_diminsh = true
        }
        console.log(query);
        conn.query(query, Object.values(dataset), (error, results)=>{
          if(error){reject(error); conn.end(); return;}
          if (connabsent) conn.end();
          resolve(results)
        })

      } catch (e) {
        reject(e)
      }
    });
  }
  static update_set(tablename, new_dataset, dataset, conn){
    return new Promise(async (resolve, reject) => {
      try {
        var connabsent = (!conn)
        if (connabsent) conn = await DB_Manager.mk_new_connection()

        var query = `UPDATE ${tablename} SET ?`, q_diminsh = false
        for (var i in dataset) {
          if(!q_diminsh){query+=' WHERE'}
          if(q_diminsh){query+=' &&'}
          query+=` ${i} = ?`
          q_diminsh = true
        }
        console.log(query);
        conn.query(query, [new_dataset].concat(Object.values(dataset)), (error, results)=>{
          if(error){reject(error); conn.end(); return;}
          if (connabsent) conn.end();
          resolve(results)
        })

      } catch (e) {
        reject(e)
      }
    });
  }
  static find_delete(tablename, dataset, conn){
    return new Promise(async (resolve, reject) => {
      try {
        var connabsent = (!conn)
        if (connabsent) conn = await DB_Manager.mk_new_connection()
        var query = `DELETE FROM ${tablename}`, q_diminsh = false
        for (var i in dataset) {
          if(!q_diminsh){query+=' WHERE'}
          if(q_diminsh){query+=' &&'}
          query+=` ${i} = ?`
          q_diminsh = true
        }
        console.log(query);
        conn.query(query, Object.values(dataset), (error, results)=>{
          if(error){reject(error); conn.end(); return;}
          if (connabsent) conn.end();
          resolve(results)
        })

      } catch (e) {
        reject(e)
      }
    });
  }
}

class FILE_SYSTEM {
  static best_fit( l, n){
    var best_fit=n;
    for(var i=n; i>(n/2); i--){
      if(!(l%i)){
        best_fit = i
        break
      }
      if((l%best_fit) < (l%i)){
        best_fit = i
      }
    }
    return best_fit
  }

  static mkDirSync(uid, name, dir_id = 0){
    return new Promise(async (resolve, reject) => {
      try {
        if(dir_id!==0){
          const _dir = await DB_Manager.find(MANIFEST.TABLES.FILES, ['uid', 'type', 'meta'], {_id:dir_id})
          console.log(_dir);
          if( (!_dir.length) || (_dir[0].type != 'd') ){
            throw Error('Invalid id for Directory')
          }
          console.log(_dir[0].uid, uid);
          if(_dir[0].uid !== uid){
            const access_granted = JSON.parse(_dir[0].meta).access.includes(uid)
            if(!access_granted){
              throw Error('Permission Denied')
            }
          }
        }else{
          if(uid != 0){
            throw Error('Permission Denied : Users can not access beyond root')
          }
        }
        const insert_id = await DB_Manager.insert(MANIFEST.TABLES.FILES,{
              uid:uid, dir_id:dir_id, name:name, type:'d',  meta:JSON.stringify({iat:Date.now(), access:[0], user_readable:[], public_readable:false})
            })
        resolve(insert_id)
      } catch (e) {
        reject(e)
      }
    });
  }
  static rmDirSync(uid, _id){
    return new Promise(async (resolve, reject) => {
      try {

        const this_dir = await DB_Manager.find(MANIFEST.TABLES.FILES, ['uid', 'type', 'dir_id'], {_id:_id})
        console.log(this_dir);
        if( (!this_dir.length) || (this_dir[0].type != 'd') ){
          throw Error('Invalid id for Directory')
        }
        const parent_dir = await DB_Manager.find(MANIFEST.TABLES.FILES, ['uid', 'type', 'meta'], {_id:this_dir[0].dir_id})

        if( (!parent_dir.length) || (parent_dir[0].type != 'd') ){
          throw Error('Invalid id for Parent Directory')
        }

        if(parent_dir[0].uid !== uid){
          const access_granted = (this_dir[0].uid==uid)
          if(!access_granted){
            throw Error('Permission Denied')
          }
        }

        const files = await DB_Manager.find( MANIFEST.TABLES.FILES, ['type'], {dir_id:_id})
        if(files.length > 0){
          throw Error('This Directory is no Empty')
        }

        const result = await DB_Manager.find_delete(MANIFEST.TABLES.FILES, {_id:_id})
        resolve(result)

      } catch (e) {
        reject(e)
      }
    });
  }
  static mkFileSync(uid, name, dir_id){
    return new Promise(async (resolve, reject) => {
      try {
        const _dir = await DB_Manager.find(MANIFEST.TABLES.FILES, ['uid', 'type', 'meta'], {_id:dir_id})
        if(dir_id!==0){
          console.log(_dir);
          if( (!_dir.length) || (_dir[0].type != 'd') ){
            throw Error('Invalid id for Directory')
          }
          console.log(_dir[0].uid, uid);
          if(_dir[0].uid !== uid){
            const access_granted = JSON.parse(_dir[0].meta).access.includes(uid)
            if(!access_granted){
              throw Error('Permission Denied')
            }
          }
        }else{
          throw Error('Prohibited spot')
        }
        const meta = JSON.parse(_dir[0].meta)
        const reader_set = new Set(meta.access.concat(meta.user_readable)), access_set = new Set([0, _dir[0].uid, uid])
        access_set.delete(uid)
        const insert_id = await DB_Manager.insert(MANIFEST.TABLES.FILES,{
              uid:uid, dir_id:dir_id, name:name, type:'f',  meta:JSON.stringify({iat:Date.now(), touch:Date.now(), chunks:[], access:[...access_set], user_readable:[...reader_set], public_readable:false})
            })
        resolve(insert_id)
      } catch (e) {
        reject(e)
      }
    });
  }
  static appendFileSync(uid, _id, datain){
    return new Promise(async (resolve, reject) => {
      try {
        const file = await DB_Manager.find(MANIFEST.TABLES.FILES, ['_id', 'uid', 'type', 'meta'], {_id:_id})

        if( (!file.length) || (file[0].type!='f')){
          throw Error("File not Found")
        }

        var meta = JSON.parse(file[0].meta)

        if(file[0].uid != uid){
          const includes = meta.access.includes(uid)
          if(!includes){
            throw Error("Permission Denied")
          }
        }

        var datain_pointer = 0//, chunk_pointer = 0
        datain = Buffer.from(datain)
        var chunk_data

        var MAX_CHUNK_SIZE = MANIFEST.FS.MAX_CHUNK_SIZE
        if(datain.length>MANIFEST.FS.MAX_CHUNK_SIZE)
          MAX_CHUNK_SIZE = FILE_SYSTEM.best_fit(datain.length,MAX_CHUNK_SIZE)

        //console.log("MAX_CHUNK_SIZE",MAX_CHUNK_SIZE);
        while(datain_pointer < datain.length){
          chunk_data = datain.subarray(datain_pointer, datain_pointer+=MANIFEST.FS.MAX_CHUNK_SIZE)
          meta.chunks.push(chunk_data.length)
          //console.log(chunk_data.length);
          await DB_Manager.insert(MANIFEST.TABLES.CHUNKS, { file_id:_id, ind:meta.chunks.length, data:chunk_data})
        }
        meta["touch"] = Date.now()
        //console.log(_id);
        await DB_Manager.update_set(MANIFEST.TABLES.FILES, {meta:JSON.stringify(meta)}, {_id:_id})
        resolve(false)

      } catch (e) {
        reject(e)
      }
    });
  }
  static clearFileSync(uid, _id){
    return new Promise(async (resolve, reject) => {
      try {
        const file = await DB_Manager.find(MANIFEST.TABLES.FILES, ['_id', 'uid', 'type', 'meta'], {_id:_id})

        if( (!file.length) || (file[0].type!='f')){
          throw Error("File not Found")
        }

        var meta = JSON.parse(file[0].meta)

        if(file[0].uid != uid){
          const includes = meta.access.includes(uid)
          if(!includes){
            throw Error("Permission Denied")
          }
        }
        meta.chunks = []
        await DB_Manager.find_delete(MANIFEST.TABLES.CHUNKS, {file_id:file[0]._id})
        await DB_Manager.update_set(MANIFEST.TABLES.FILES, {meta:JSON.stringify(meta)}, {_id:_id})
        resolve(false)
      } catch (e) {
        reject(e)
      }
    });
  }
  static rmFileSync(uid, _id){
    return new Promise(async(resolve, reject) => {
      try{
        await FILE_SYSTEM.clearFileSync(uid, _id)
        await DB_Manager.find_delete(MANIFEST.TABLES.FILES, {_id:_id})
        resolve(false)
      }catch(e){
        reject(e)
      }
    });
  }

  static aboutFile(uid, _id){
    return new Promise(async (resolve, reject) => {
      try {
        const file = await DB_Manager.find(MANIFEST.TABLES.FILES, ['_id', 'uid', 'type', 'meta'], {_id:_id})

        if( (!file.length) || (file[0].type!='f')){
          throw Error("File not Found")
        }

        var meta = JSON.parse(file[0].meta)

        if(file[0].uid != uid){
          const includes = meta.access.includes(uid) || meta.user_readable.includes(uid) || meta.public_readable
          if(!includes){
            throw Error("Permission Denied")
          }
        }

        resolve({uid:file[0].uid, touch:meta.touch, size:meta.chunks.reduce( (a, b)=>{return a+b} ) })

      } catch (e) {
        reject(e)
      }

    });
  }
  static readFileSync(uid, _id){
    return new Promise(async (resolve, reject) => {
      try {
        const file = await DB_Manager.find(MANIFEST.TABLES.FILES, ['_id', 'uid', 'name', 'meta'], {_id:_id, type:'f'})

        if( (!file.length) ){
          throw Error("File not Found")
        }

        var meta = JSON.parse(file[0].meta)

        if(file[0].uid != uid){
          const includes = meta.access.includes(uid) || meta.user_readable.includes(uid) || meta.public_readable
          if(!includes){
            throw Error("Permission Denied")
          }
        }
        var data = []

        for (var i = 1; i <= meta.chunks.length; i++) {
          const chunk = await DB_Manager.find(MANIFEST.TABLES.CHUNKS, ['data'], {file_id:_id, ind:i})
          console.log(chunk);
          data.push(Buffer.from(chunk[0].data))
        }

        resolve({uid:file[0].uid, name:file[0].name, mime:meta.mime, touch:meta.touch, size:meta.chunks.length?meta.chunks.reduce( (a, b)=>{return a+b} ):0, data: Buffer.concat(data) })
      } catch (e) {
        reject(e)
      }
    });
  }
  static readDirSync(uid, dir_id){
    return new Promise(async (resolve, reject) => {
      try {
        const dir = await DB_Manager.find(MANIFEST.TABLES.FILES, ['_id', 'uid', 'name', 'meta'], {_id:dir_id, type:'d'})

        if( (!dir.length)){
          throw Error("Dir not Found")
        }

        var meta = JSON.parse(dir[0].meta)

        if(dir[0].uid != uid){
          const includes = meta.access.includes(uid) || meta.user_readable.includes(uid) || meta.public_readable
          if(!includes){
            throw Error("Permission Denied")
          }
        }

        const dir_childs = await DB_Manager.find(MANIFEST.TABLES.FILES, ['_id', 'uid', 'type', 'name', 'meta'], {dir_id:dir_id})

        resolve({name:dir[0].name, childs:dir_childs})

      } catch (e) {
        reject(e)
      }
    })
  }

  static grantAccess(from_uid, to_uids, f_id){
    return new Promise(async (resolve, reject) => {
      try{
        if(!f_id){
          throw Error("Fudamental anomaly broke")
        }
        const file = await DB_Manager.find(MANIFEST.TABLES.FILES, ['type', 'meta'], {uid:from_uid, _id:f_id})
        if(!file.length){
          throw Error("file or access to innode is absent")
        }
        if(from_uid!==0)
        if(file[0].uid != from_uid){
          throw Error("Permission Denied")
        }
        var meta = JSON.parse(file[0].meta)
        if(!meta.access.includes(to_uids)){meta.access.push(to_uids)}
        const res = DB_Manager.update_set(MANIFEST.TABLES.FILES, {meta:JSON.stringify(meta)}, {uid:from_uid, _id:f_id})
        resolve(res)
      }catch(e){
        reject(e)
      }
    });

  }
  static grantReadAccess(from_uid, to_uids, f_id){
    return new Promise(async (resolve, reject) => {
      try{
        if(!f_id){
          throw Error("Fudamental anomaly broke")
        }
        const file = await DB_Manager.find(MANIFEST.TABLES.FILES, ['type', 'meta'], {uid:from_uid, _id:f_id})
        if(!file.length){
          throw Error("file or access to innode is absent")
        }
        if(from_uid!==0)
        if(file[0].uid != from_uid){
          throw Error("Permission Denied")
        }
        var meta = JSON.parse(file[0].meta)
        if(!meta.user_readable.includes(to_uids)){meta.user_readable.push(to_uids)}
        const res = DB_Manager.update_set(MANIFEST.TABLES.FILES, {meta:JSON.stringify(meta)}, {uid:from_uid, _id:f_id})
        resolve(res)
      }catch(e){
        reject(e)
      }
    });

  }
  static grantPublicReadAccess(from_uid, f_id){
    return new Promise(async (resolve, reject) => {
      try{
        if(!f_id){
          throw Error("Fudamental anomaly broke")
        }
        const file = await DB_Manager.find(MANIFEST.TABLES.FILES, ['type', 'meta'], {uid:from_uid, _id:f_id})
        if(!file.length){
          throw Error("file or access to innode is absent")
        }
        var meta = JSON.parse(file[0].meta)
        meta.public_readable = true;
        console.log(meta);
        const res = DB_Manager.update_set(MANIFEST.TABLES.FILES, {meta:JSON.stringify(meta)}, {uid:from_uid, _id:f_id})
        resolve(res)
      }catch(e){
        reject(e)
      }
    });
  }
}

class UserManager {
  static mkUser(username, password){
    return new Promise(async(resolve, reject) => {
      try {
        const new_uid = await DB_Manager.insert(MANIFEST.TABLES.USERS, {username:username, password:password})
        const new_root_dir_id = await FILE_SYSTEM.mkDirSync(0, `root_${new_uid}`, 0)
        await FILE_SYSTEM.grantAccess(0, new_uid, new_root_dir_id)
        await DB_Manager.insert(MANIFEST.TABLES.USERS_ROOT, {uid:new_uid, root_dir_id:new_root_dir_id})
        const readme_file_id = await FILE_SYSTEM.mkFileSync(0, 'README.md', new_root_dir_id)
        await FILE_SYSTEM.appendFileSync(0, readme_file_id, await FS.readFileSync('./samples/README.md'))
        resolve(new_uid)
      } catch (e) {
        reject(e)
      }
    })
  }
  static get_user_root(user_id){
    return new Promise(async(resolve, reject) => {
      try {
        const this_user = await DB_Manager.find(MANIFEST.TABLES.USERS, ["_id"], {_id:user_id})
        if(this_user.length<1){throw Error("user not found")}
        const root_id = await DB_Manager.find(MANIFEST.TABLES.USERS_ROOT, ["root_dir_id"], {uid:this_user[0]._id})
        if(root_id[0]<1){throw Error("root not found")}
        resolve(root_id[0].root_dir_id)
      } catch (e) {
        reject(e)
      }
    })
  }
  static verify(username, password){
    return new Promise(async (resolve, reject)=> {
      try {
        const this_user = await DB_Manager.find(MANIFEST.TABLES.USERS, ["_id", "password"], {username:username})
        if(this_user.length<1){throw Error("user not found")}
        if(this_user[0].password != password){throw Error("Incorrect Password")}
        resolve(this_user[0]._id)
      } catch (e) {
          reject(e)
      }
    });
  }
  static user_token(username, password, expires='8h'){
    return new Promise(async (resolve, reject) => {
      try {
        const uid = await UserManager.verify(username, password)
        const JFS_local_token = JWT.sign({DB_UID:MANIFEST.DB_UID, user_id:uid}, MANIFEST.TOKENIZERS.LOCAL, {expiresIn:expires})
        const JFS_universal_token = JWT.sign({INSTANCE_CONNECTION_CONFIG:MANIFEST.INSTANCE_CONNECTION_CONFIG, local_token:JFS_local_token}, MANIFEST.TOKENIZERS.UNIVERSAL, {expiresIn:expires})
        resolve({universal:JFS_universal_token, local:JFS_local_token})
      } catch (e) {
        reject(e)
      }
    });
  }
  static verify_token(local_token){
    const token = JWT.verify(local_token, MANIFEST.TOKENIZERS.LOCAL)
    if(token.DB_UID != MANIFEST.DB_UID){
      throw Error("Wrong JFS")
    }
    return token.user_id
  }
}

module.exports.DB_Manager = DB_Manager;
module.exports.FILE_SYSTEM = FILE_SYSTEM;
module.exports.UserManager = UserManager;
