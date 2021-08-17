var FS = require('fs')
var JWT = require('jsonwebtoken')

const STREAM = require('stream');
//var JIMP = require('jimp');

var MANIFEST;
module.exports.MANIFEST = MANIFEST;

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

//starting Server
var SITEMAP
(async ()=>{
  MANIFEST = JSON.parse(await FS.readFileSync('manifest0.json', 'utf8'))
  SITEMAP = JSON.parse(await FS.readFileSync('public/sitemap.json', 'utf8'))
  fastify.register(require('fastify-cookie'), {
    secret: MANIFEST.TOKENIZERS.UNIVERSAL, // for cookies signature
    parseOptions: {}     // options for parsing cookies
  })
  fastify.listen(3000, "0.0.0.0");
  //testing
  test()
})()

const fastify = require('fastify')({
  logger: false
})
fastify.register(require('fastify-formbody'))
const qs = require('qs')
fastify.addContentTypeParser('*', function (request, payload, done) {
  done()
})

//html gets
const opts_html_gets = {
  handler: async function (request, reply) {
    return new Promise(async (resolve, reject) => {
      try {
        const path = request.url.replace(/\?\w+$/,"")

        if(!SITEMAP[path]) {
          throw Error(" : Un Registred Request")
        }
        var data = await FS.readFileSync(SITEMAP[path].file, 'utf8')
        if(SITEMAP[path].replace)
        for(var i in SITEMAP[path].replace){
          const value = SITEMAP[path].replace[i]
          data = data.replace(new RegExp(i, "g"), value)
        }
        reply.type(SITEMAP[path].type)
        resolve(data)
      } catch (e) {
        reject("Invalid URL"+e)
      }
    });
  }
}
fastify.get('/\*', opts_html_gets)

//ftp post reqs
const login_opts = {
  schema: {
    body: {
      properties: {
        "username": { type: 'string' },
        "password": { type: 'string' }
      }
    }
  }
}
class LoginValidation {
  static username(uname){
    const mats = uname.match(/[0-9a-zA-Z]/g)
    if(uname.length<1)throw Error('invalid username, Username has to be longer')
    if(mats.length!=uname.length)throw Error('invalid username, Apha numeric only')
    return mats.join('')
  }
  static password(pass){
    if(typeof pass != 'string')throw Error('bad request')
    return pass
  }
}

fastify.post('/register', login_opts, async (request, reply) => {
  try {
    const req = qs.parse(request.body)
    const username = LoginValidation.username(req.username)
    const password = LoginValidation.password(req.password)

    const user_id = await UserManager.mkUser(username, password)
    const verify_user_id = await UserManager.verify(username, password)

    if(user_id != verify_user_id) throw Error("Something went wrong ! (account validation failed)")

    return {err:0, username:username}
  } catch (e) {
    return {err:21, err_msg:`${e}`}
  }
})

fastify.post('/login', login_opts, async (request, reply) => {
  try {
    const req = qs.parse(request.body)
    const username = LoginValidation.username(req.username)
    const password = LoginValidation.password(req.password)

    const token = await UserManager.user_token(username, password)

    reply.setCookie('u_token', token.universal)

    return {err:0, u_token:token, username:username}
  } catch (e) {
    return {err:22, err_msg:`${e}`}
  }
})

fastify.post('/myroot', async (request, reply) => {
  try {
    const universal = JWT.verify(request.cookies.u_token, MANIFEST.TOKENIZERS.UNIVERSAL)
    const user_id = UserManager.verify_token(universal.local_token)
    const user_root = await UserManager.get_user_root(user_id)
    return {err:0, root:user_root}
  } catch (e) {
    console.error(e);
    return {err:31, err_msg: `${e}`}
  }
})

const read_dir_optn = {
  schema: {
    body: {
      properties: {
        "_id": { type: 'number' }
      }
    }
  }
}

fastify.post('/read_dir', read_dir_optn, async (request, reply) => {
  try {
    const universal = JWT.verify(request.cookies.u_token, MANIFEST.TOKENIZERS.UNIVERSAL)
    const user_id = UserManager.verify_token(universal.local_token)

    const req = qs.parse(request.body)
    const dir_id = req._id

    const dir = await FILE_SYSTEM.readDirSync(user_id, dir_id)
    //console.log(662, dir)
    return {err:0, name:dir.name, dir:dir.childs};

  } catch (e) {
    return {err:41, err_msg: `${e}`}
  }
})

//ftp get reqs
const mime_types = require('mime-types');
const { DB_Manager } = require("./src/DB_Manager");
fastify.get('/file\*', async (request, reply)=>{
  try {
    const universal = JWT.verify(request.cookies.u_token, MANIFEST.TOKENIZERS.UNIVERSAL)
    const user_id = UserManager.verify_token(universal.local_token)

    const req_parse = request.url.split('?')
    var req_params = {}
    for(var i in req_parse){
      const r = req_parse[i].split('='); req_params[r[0]] = r[1]
    }
    if(!req_params._id)throw Error('file _id undefined')

    const file_buffer = await FILE_SYSTEM.readFileSync(user_id, req_params._id)
    console.log(file_buffer.name, file_buffer.data)
    reply.header('Content-Type', file_buffer.mime || mime_types.lookup(file_buffer.name) ).send(file_buffer.data)
  } catch (e) {
    console.error(e);
    return {err:41, err_msg: `${e}`}
  }
})

fastify.register(require('fastify-multipart'))

fastify.post('/mk_file', async (request, reply)=>{
  try {
    const universal = JWT.verify(request.cookies.u_token, MANIFEST.TOKENIZERS.UNIVERSAL)
    const user_id = UserManager.verify_token(universal.local_token)

    const file = await request.file()
    const file_name = file.fields.file_name.value
    const dir_id = Number(file.fields.dir_id.value)
    const file_buffer = await file.fields.afile.toBuffer()
    console.log(file_name, dir_id, file_buffer.length)
    const new_file = await FILE_SYSTEM.mkFileSync(user_id, file_name, dir_id)
    console.log(`New file is ${new_file}`);
    try{await FILE_SYSTEM.appendFileSync(user_id, new_file, file_buffer)}
    catch(e){
      console.log("went worng",e);
      await FILE_SYSTEM.rmFileSync(user_id, new_file)
      throw e;
    }
    console.log("Then");
    return {err:0, file_id:new_file, dir_id:dir_id}
    //return {err:0}
  } catch (e) {
    return {err:51, err_msg: `${e}`}
  }
})

//unit tests
async function test (){
  try {
    console.log(Date.now());
      {//const conn = await DB_Manager.mk_new_connection()
      //const result_id = await DB_Manager.insert(MANIFEST.TABLES.USERS, {username:"risy6", password:"rusky"}, conn)
      //console.log(result_id);
      //const result = await DB_Manager.find(MANIFEST.TABLES.USERS, ["username", "password"], {password:"rusky"}, conn)
      //console.log(result);
      //const result1 = await DB_Manager.update_set(MANIFEST.TABLES.USERS, {password:"newpass"}, {username:"risy6", password:"rusky"}, conn)
      //console.log(result1);
      /*const result2 = await DB_Manager.find_delete(MANIFEST.TABLES.FILES, {})
      const result3 = await DB_Manager.find_delete(MANIFEST.TABLES.CHUNKS, {})
      const result4 = await DB_Manager.find_delete(MANIFEST.TABLES.USERS, {})*/
      //console.log(result2);
      //conn.end()
      }

    //var dir_id = await FILE_SYSTEM.mkDirSync(0, "root/1", 0)
    //console.log(dir_id)
    //const res = await FILE_SYSTEM.grantAccess(0, 1, dir_id)
    //console.log(res);
    //dir_id = await FILE_SYSTEM.mkDirSync(1, "ones file", dir_id)
    //console.log(dir_id)
    //const rem_res = await FILE_SYSTEM.rmDirSync(1, 14)
    //console.log(rem_res)
    //const user_id = await UserManager.mkUser('uvioale', 'povi')
    //console("_id", user_id, await UserManager.verify('uvidale', 'povi'))
    //const root = await UserManager.get_user_root(await UserManager.verify('uvijale', 'povi'));
    //const the_token = (await UserManager.user_token('uvioale', 'povi'));
    //console.log(UserManager.verify_token(the_token.local));
    //const file_id = await FILE_SYSTEM.mkFileSync(user_id, 'loki.png', root)
    //console.log("file_id",file_id);
    //await FILE_SYSTEM.appendFileSync(user_id, file_id, await FS.readFileSync('C:/Users/risha/Downloads/profilepic16X9.jpeg'))
    //FILE_SYSTEM.grantAccess(1, 2, file_id)
    //console.log(await FILE_SYSTEM.aboutFile(1, file_id));
    //await FILE_SYSTEM.grantPublicReadAccess(user_id, file_id)
    //const read = await FILE_SYSTEM.readFileSync(1, file_id)
    //await FS.writeFileSync('./test.png', read.data)
    //await FILE_SYSTEM.rmFileSync(1, file_id)
    //console.log(Date.now());
    //const childs = await FILE_SYSTEM.readDirSync(0, 5);
    //console.log(childs);
  } catch (e) {
    console.error(e);
  }
}
