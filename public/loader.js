function requestSync(req_type, url, form) {
  return new Promise(function(resolve, reject) {
    try {
      var xhttp = new XMLHttpRequest();
      xhttp.onreadystatechange = function() {
        //console.log(xhttp.status, xhttp.readyState, xhttp.responseText);
        if((xhttp.status==200) && (xhttp.readyState == 4))
        resolve(xhttp.responseText)
      };
      xhttp.open(req_type, url, true)
      xhttp.send(form)

    } catch (e) {
      reject(e)
    }
  });
}

function loader_bg_hide(bo) {
  if(bo)
  document.getElementById('loading_bg').hidden = true
  else
  document.getElementById('loading_bg').removeAttribute('hidden')
}

function get_loader_html() {
  return document.getElementsById('loader_bg')
}

function loadFile() {
  return new Promise( async (resolve, reject) => {
    try{
      const file_in = document.createElement('input')
      file_in.type = 'file'
      await new Promise(function(resolve, reject) {
        try {
          file_in.addEventListener('change', (e)=>{
            resolve()
          });
          file_in.click()
        } catch (e) {
          reject(e)
        }
      })
      console.log('val', file_in.files);
      const f = new FileReader()
      f.onload = async (e) => {
        resolve({name:file_in.files[0].name, data:e.target.result, file_blob:file_in.files[0]});
      }
      f.readAsArrayBuffer(file_in.files[0])
    } catch (e) {
      console.log(e);
      reject(e)
    }
  } )
}
