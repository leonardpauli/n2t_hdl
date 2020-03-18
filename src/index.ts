import * as monaco from "monaco-editor";
import "./index.css";


import Viz from 'viz.js'

import {Module, render} from 'viz.js/full.render.js'
let viz = new Viz({Module, render})


import {hdl_tokenize} from './hdl_tokenize'
import {hdl_astify} from './hdl_astify'
import {
  example_chip_3_port_subscripting,
  lang_id,
  theme_id,
} from './monaco_register_hdl'
import {c, d, debounce, object_fromEntries, object_entries} from './utils'
import {ast_clean, ast_nodeedges_get, ast_clean_to_dot} from './ast_utils';



// @ts-ignore
self.MonacoEnvironment = {
  getWorkerUrl: function(moduleId, label) {
    if (label === "json") {
      return "./json.worker.bundle.js";
    }
    if (label === "css") {
      return "./css.worker.bundle.js";
    }
    if (label === "html") {
      return "./html.worker.bundle.js";
    }
    if (label === "typescript" || label === "javascript") {
      return "./ts.worker.bundle.js";
    }
    return "./editor.worker.bundle.js";
  }
}




const show_ed_btn = c('button', 'toggle', ['Show editor'])
const render_ast_btn = c('button', 'toggle', ['Render ast'])
const render_chips_btn = c('button', 'toggle', ['Render chips'])

const add_toggle = (el, key)=>
  el.addEventListener('click', ()=> {
    config[key] = !config[key]
    config_updated()
  })

add_toggle(show_ed_btn, 'show_ed')
add_toggle(render_ast_btn, 'render_ast')
add_toggle(render_chips_btn, 'render_chips')


const editor_el = d('editor')
const result_view_el = d('result-view ast')
const result_view_chips_el = d('result-view chips')
const editor_container_el = d('editor-container show', [editor_el])
const app_el = d('app', [
  d('header', [
    show_ed_btn,
    render_ast_btn,
    render_chips_btn,
  ]),
  d('main-content', [
    editor_container_el,
    result_view_el,
    result_view_chips_el,
  ]),
])

document.body.appendChild(app_el)





const welcome_text = `
/**
 // Created by Leonard Pauli, mar 2020
 // datasys (KTH course EP1200)
 // see datasys.now.sh and nand2tetris.org


 Welcome to this primitive HDL (Hardware Descriptive Language) editor!

 Some example chips are included, try writing "example"
  + hitting enter in the bottom of this file.

*/

// Under here!




`


const editor = monaco.editor.create(editor_el, {
  value: example_chip_3_port_subscripting || welcome_text,
  language: lang_id,
  theme: theme_id, // "vs-dark",
  readOnly: false,
  lineNumbers: "on",
  scrollBeyondLastLine: true,
});




let node_id_map_dot_click = null
result_view_el.addEventListener('click', e=> {
  const path = (e as unknown as {path: HTMLElement[]}).path
  const node_el = path.find(e=> e.classList && e.classList.contains('node'))
  if (!node_el) return
  const title_el = node_el.querySelector('title')
  if (!title_el) return
  const node_id = title_el.textContent
  if (!node_id_map_dot_click || !node_id_map_dot_click.has(node_id)) return
  const node = node_id_map_dot_click.get(node_id)

  // console.log(node)
  

  const get_sub_tokens = token=> {
    const subs = []
    object_entries(token).forEach(([k, v])=> {
      if (v && typeof v==='object') {
        if (Array.isArray(v)) return v.map(m=> subs.push(...get_sub_tokens(m)))
        if (v.value) return subs.push([v.offset, v.offset+v.value.length])
        if (v.type) return subs.push(...get_sub_tokens(v))
      } 
    })
    return subs
  }
  const tokens_mima = get_sub_tokens(node)
  if (!tokens_mima.length) return

  const [mi, ma] = tokens_mima
    .reduce(([mi, ma], [mi2, ma2])=> [
      Math.min(mi, mi2),
      Math.max(ma, ma2),
    ], [Number.MAX_SAFE_INTEGER, 0])

  const str = editor.getValue()
  let mi_row = null, mi_col = 0
  let ma_row = null, ma_col = 0
  let ind = 0, indnext = 0, rowcnt = 0
  let i = 0, ithres = 10000

  while (ind<=str.length && i++<ithres) {
    indnext = str.indexOf('\n', ind)
    if ((indnext<0 || indnext > mi) && mi_row===null) {
      mi_row = rowcnt
      mi_col = mi-ind
    }
    if ((indnext<0 || indnext > ma) && ma_row===null) {
      ma_row = rowcnt
      ma_col = ma-ind
      break
    }
    ind = indnext+1
    rowcnt++
  }
  if (i>=ithres) console.error(`ithres got over`)
  
  // console.log(mi_row, mi_col, ma_row, ma_col)

  const r: monaco.IRange = {
    startLineNumber: mi_row+1,
    startColumn: mi_col+1,
    endLineNumber: ma_row+1,
    endColumn: ma_col+1,
  }
  editor.setSelection(r)
  editor.focus()
})


const config = {
  show_ed: true,
  render_ast: false,
  render_chips: false,
}

const config_updated = ()=> {

  show_ed_btn.dataset.on = ''+config['show_ed']
  render_ast_btn.dataset.on = ''+config['render_ast']
  render_chips_btn.dataset.on = ''+config['render_chips']

  editor_container_el.classList.toggle('show', config.show_ed)
  result_view_el.classList.toggle('show', config.render_ast)
  result_view_chips_el.classList.toggle('show', config.render_chips)

  update_debounced()
}

setTimeout(()=> {config_updated()}, 100)


let update_locked = false
let update_attempted = false
const update_debounced = debounce(500)(()=> {
  if (update_locked) {
    update_attempted = true
    return
  }
  const v = editor.getValue()

  
  const tokens = hdl_tokenize(v)
  // text.map(v=> JSON.stringify(v)).join('\n')
  const ast = hdl_astify(tokens)
  const ast_cleaned = ast_clean(ast.ast)

  if (config.render_ast) {
    const ast_nodeedges = ast_nodeedges_get(ast_cleaned)
    const {dot, node_id_map_rev} = ast_clean_to_dot(ast_nodeedges, {rest_tokens: ast.rest_tokens})
    node_id_map_dot_click = node_id_map_rev
  
  
    update_locked = true
    update_attempted = false
    rerender_dot(dot).then(()=> {
      update_locked = false
      if (update_attempted) {
        update_attempted = false
        update_debounced()
      }
    })
    // rerender_dot(editor.getValue())
  }

  if (config.render_chips) {


  }
})
editor.onDidChangeModelContent(e=> {
  update_debounced()
})

const rerender_dot2 = text=> {
  ;[...(result_view_el.children as unknown as Array<HTMLElement>)].map(c=> c.remove())
  result_view_el.appendChild(new Text(
    text // JSON.stringify(text, null, 2)
  ))
  result_view_el.style.cssText = 'white-space: pre; overflow: scroll;'
}
const rerender_dot = dot=> viz.renderSVGElement(dot)
  .then(result=> {
    // console.log('viz result', result)
    ;[...(result_view_el.children as unknown as Array<HTMLElement>)].map(c=> c.remove())
    // console.log(result.tagName, result)
    if (result.tagName !== 'html')
      result_view_el.appendChild(result)
  })
  .catch(error=> {
    // "Create a new Viz instance (@see Caveats page for more info)""
    viz = new Viz({ Module, render })
    // console.error(error)
  });


window.addEventListener('resize', ()=> {
  editor.layout()
})