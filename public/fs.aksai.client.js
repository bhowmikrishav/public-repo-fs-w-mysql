class _Functional {
  static requestSync(req_type, url, json) {
    return new Promise(function(resolve, reject) {
      try {
        var req = new XMLHttpRequest();
        req.onreadystatechange = function() {
          //console.log(req.status, req.readyState, req.responseText);
          if((req.status==200) && (req.readyState == 4))
          resolve(req.responseText)
        };
        req.open(req_type, url, true)
        req.setRequestHeader("Content-Type", "application/json");
        req.send(JSON.stringify(json))
      } catch (e) {
        reject(e)
      }
    });
  }

  static gum_all_btns(){
    const btns =  document.getElementsByClassName('btn')
    for (var b in btns) {
      if(btns[b].type == 'submit')
        btns[b]["disabled"] = true;
    }
  }
  static un_gum_all_btns(){
    const btns =  document.getElementsByClassName('btn')
    for (var b in btns) {
      if(btns[b].type == 'submit')
        btns[b].removeAttribute("disabled");
    }
  }
}

function client_register(username, password, confirm_password) {
  return new Promise( async (resolve, reject) => {
    try {
      _Functional.gum_all_btns()
      //checking input
      if((typeof username!='string') || !username.length)throw Error('Invalid Username')
      if((typeof password!='string') || (password!=confirm_password))throw Error('Password Missmatch')

      const res = JSON.parse(await _Functional.requestSync('post', "/register", {"username":username, "password":password}))

      if(res.err) throw Error(res.err_msg)
      resolve(res)
      _Functional.un_gum_all_btns()
    } catch (e) {
      reject(`${e}`)
      _Functional.un_gum_all_btns()
    }
  });
}

async function client_login(username, password) {
  return new Promise( async (resolve, reject) => {
    try {
      _Functional.gum_all_btns()
      //checking input
      if((typeof username!='string') || !username.length)throw Error('Invalid Username')

      const res = JSON.parse(await _Functional.requestSync('post', "/login", {"username":username, "password":password}))

      if(res.err) throw Error(res.err_msg)
      resolve(res)
      _Functional.un_gum_all_btns()
    } catch (e) {
      reject(`${e}`)
      _Functional.un_gum_all_btns()
    }
  });
}

async function client_addfile(name, dir_id, buffer, file_blob) {
  const append_token = await new Promise(function(resolve, reject) {
    try {
      var req = new XMLHttpRequest();
      req.onreadystatechange = function() {
        if((req.status==200) && (req.readyState == 4))
        resolve(req.responseText)
      };
      req.open('POST', '/mk_file', true)
      /*req.setRequestHeader("Content-Type", "application/json")
      req.send(JSON.stringify({file_name:name, dir_id:dir_id}))*/
      const form = new FormData()
      form.append("file_name",name)
      form.append("dir_id",dir_id)
      form.append("afile",file_blob)
      req.send(form)
    } catch (e) {
      reject(e)
    }
  });
  console.log(append_token);
  return
}
