class TableBodyController {
  constructor(id) {
    this.body = document.getElementById(id)
    this.components = this.body.innerHTML.match(/\{{\w+}}/g)
    this.row_html_model = this.body.innerHTML
    this.body.removeAttribute('hidden')
    console.log(this.components)
    this.row_data_collection = []
    this.row_html_collection = []
    this.first_paint()
  }
  first_paint(){
    this.body.innerHTML = `<tr>${this.row_html_collection.join('</tr><tr>')}</tr>`
  }
  append_row(options){
    var model = this.row_html_model

    this.row_data_collection.push(options)

    for (var i in this.components) {
      model = model.replace(`${this.components[i]}`, (options[`${this.components[i].replace(/{{/,'').replace(/\}\}$/,'')}`]||''))
    }

    this.row_html_collection.push(model)

    const tr = document.createElement("tr")
    tr.innerHTML = model

    this.body.appendChild(tr)
  }
}

class CellBodyController {
  constructor(id, data = {}) {
    this.body = document.getElementById(id)
    this.html_model = this.body.innerHTML
    this.components = this.html_model.match(/\{{\w+}}/g)
    this.data = data
    this.paint()
  }
  paint(){
    var html = this.html_model
    for (var i in this.components) {
      html = html.replace(this.components[i], this.data[this.components[i].replace(/^{{/,'').replace(/\}\}$/,'')] || '&nbsp')
    }
    this.body.innerHTML = html;
  }
  update_data(data){
    for(var i in data){
      this.data[i] = data[i]
    }
    this.paint()
  }
}
