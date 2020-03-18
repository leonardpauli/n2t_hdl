import * as monaco from "monaco-editor";
import "./index.css";

import {language} from './hdl_lang';


import Viz from 'viz.js'

import {Module, render} from 'viz.js/full.render.js'
let viz = new Viz({Module, render})



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
};



type node_list = Array<string | Node>
const c = (tag: 0 | string, className: string, _opt: Object | node_list, _sub?: node_list): HTMLElement => {
  const sub = (_sub || _opt) as node_list, opt = _sub?_opt:{}
  const e = document.createElement(tag || 'div')
  if (className) e.className = className
  sub.forEach(m=> {
    m&&e.appendChild(typeof m==='string'?document.createTextNode(m):m)
  })
  Object.keys(opt).forEach(k=> {
    if (k==='style'&&typeof opt[k]==='object') {
      Object.keys(opt[k]).forEach(_k=> {
        e[k][_k]=opt[k][_k]
      })
    } else {
      e.setAttribute(k, opt[k])
    }
  })
  return e
}
const d = (className: string, _opt: Object | node_list = [], _sub?: node_list): HTMLElement => {
  return c(0, className, _opt, _sub)
}



const editor_el = d('editor')
const result_view_el = d('result-view')
const app_el = d('app', [
  d('header', []),
  d('main-content', [
    d('editor-container', [editor_el]),
    result_view_el,
  ]),
])

document.body.appendChild(app_el)




const example_chip_3_port_subscripting = `
/*
  Imagine you have 4 different assignments
    (could be described binary with 2 bits (4=2^2))
  and each assignent have 8 different possible answers
    (could be described binary with 3 bits (8=2^3))
  Now, you want to make a chip that checks the answer,
    given the assignment number and answer guess.
*/
CHIP answer_checker {  
  // We could then group 2 ports together and call them the "assignment channel".
  //   + 3 ports together and call them the "answer channel".
  IN assignment[2], answer[3];

  // The output is just 1 bit (true/false, ie. correct or not)
  OUT correct;

  PARTS:
  // To get the first bit of the 2 assignent bits, we write assignent[0]
  Nand(a=assignent[0], b=assignent[1], out=some_port);
  // we can't write assignent[2] here, as that would be the 3rd bit, and we only got 2 (ie. 0, 1)

  // some chips has channels as inputs, if they're the same size,
  // then we can skip the [] part, but otherwise, we have to specify
  // what parts of the channel we want to connect
  FunChip(input_channel[0..1]=assignent); // same as...
  FunChip(input_channel[0..1]=assignent[0..1]); // same as...
  FunChip(input_channel[0]=assignent[0], input_channel[1]=assignent[1]);
  
  // You may connect multiple ports together
  OtherChip(in[0]=answer[1..2], in[1..2]=answer[0..1], in[3..5]=answer);

  // To really create this answer_checker chip,
  // some muxes and other block would be helpful,
  // create them first! :)
  MagicLogic(out=correct);
}`

const lang_id = 'hdl'
monaco.languages.register({ id: lang_id });
monaco.languages.setMonarchTokensProvider(lang_id, language)
monaco.languages.registerCompletionItemProvider(lang_id, {
  provideCompletionItems: (
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    context: monaco.languages.CompletionContext,
    token: monaco.CancellationToken,
  ): monaco.languages.ProviderResult<monaco.languages.CompletionList>=> {
    const suggestions: monaco.languages.CompletionItem[] = [{
      label: 'chip',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: [
        'CHIP ${1:name} {',
        '\tIN ${2:inputs};',
        '\tOUT ${3:outputs};',
        '',
        '\tPARTS:',
        '\t$0',
        '}',
      ].join('\n'),
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Custom chip definition',
      range: null as monaco.IRange,
    }, {
      label: 'example_chip_1',
      kind: monaco.languages.CompletionItemKind.Text,
      insertText:
`CHIP example_chip_1 { // imagine the chip as a "black box" with inputs and outputs
  IN my_a, my_b; // two signals goes in
  OUT my_output; // in this case, one signal goes out (but you could list multiple if you wanted to)

  PARTS:
  // connect my_a to the port called "a" on a chip called "Nand", etc
  // Also create an internal cable/connection called "my_nanded_output",
  //  such that we may connect the two internal chips (Nand and Not) together
  Nand(a=my_a, b=my_b, out=my_nanded_output);
  // lastly, connect the internal Not chip's output to the "outside" / our output
  Not(in=my_nanded_output, out=my_output);
}`,
      range: null as monaco.IRange,
    }, {
      label: 'example_chip_2_nand_wrapper',
      kind: monaco.languages.CompletionItemKind.Text,
      insertText:
`
// The nand chip is our fundamental building block
// In hardware, it's created using transistors, look it up :)
CHIP my_nand {
  IN a, b;
  OUT out;

  PARTS:
  // Possibly a bit silly, the only thing we've accomplished
  // is creating hiding the real Nand chip in another one with
  // our name ("my_nand")
  // We pass all signals that come to us (a, b) to the real Nand,
  // and then send the result out.
  Nand(a=a, b=b, out=out);
}`,
      range: null as monaco.IRange,
    }, {
      label: 'example_chip_3_port_subscripting',
      kind: monaco.languages.CompletionItemKind.Text,
      insertText: example_chip_3_port_subscripting,
      range: null as monaco.IRange,
    }]
    return {suggestions}
  }
})

const theme_id = lang_id+'-theme'
monaco.editor.defineTheme(theme_id, {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'delimiter.bracket', foreground: 'AAAAAA' }, // fontStyle: bold
    { token: 'operator.equal', foreground: '89DDFF' },
    { token: 'class', foreground: 'FFCB6B' },
    { token: 'delimiter.parenthesis', foreground: '89DDFF' },
    { token: 'delimiter.separator', foreground: 'AAAAAA' },
    { token: 'keyword', foreground: 'C792EA' },
    { token: 'identifier.own', foreground: 'F07178' },
    { token: 'identifier.other', foreground: 'F0E1A8' },
  ],
  colors: {},
})


const editor = monaco.editor.create(editor_el, {
  value: example_chip_3_port_subscripting ||
`
/**
 // Created by Leonard Pauli, mar 2020
 // datasys (KTH course EP1200)
 // see datasys.now.sh and nand2tetris.org


 Welcome to this primitive HDL (Hardware Descriptive Language) editor!

 Some example chips are included, try writing "example"
  + hitting enter in the bottom of this file.

*/

// Under here!




`,
  language: lang_id,
  theme: theme_id, // "vs-dark",
  readOnly: false,
  lineNumbers: "on",
  scrollBeyondLastLine: true,
});


const debounce = (ms=0)=> (fn: Function)=> {
  let t: number = 0
  return ()=> {
    clearTimeout(t)
    t = setTimeout(()=> {
      fn()
    }, ms)
  }
}



const hdl_tokenize = text=> {
  const identifier = /^[A-Za-z_][A-Za-z_0-9]*/
  const whitespace_char = /^[ \t\n\r\f]+/
  const comment_line = /^\/\/[^\n]*\n?/
  const comment_block_start = /^\/\*/

  const contexts = {
    root: [
      {include: 'whitespace'},
      {include: 'chip'},
    ],
    whitespace: [
      [whitespace_char, 'whitespace_char'],
      [comment_line, 'comment_line'],
      [comment_block_start, 'comment_block_start', {push: 'comment_block'}]
    ],
    comment_block: [
      [/^([^*]+|\*([^\/]|$))+/, 'comment.block.body'],
      [/^\*\//, 'comment.block.end', {pop: 1}],
    ],
    chip: [
      [identifier, 'id'],
      {include: 'whitespace'},
      [/^\{/, 'chip.body.open', {push: 'chip_body'}],
    ],
    chip_body: [
      [/^\}/, 'chip.body.close', {pop: 2}],
      {include: 'whitespace'},
      [identifier, 'chip.section.id', {push: 'chip_section'}],
    ],
    chip_section: [
      {include: 'whitespace'},
      [identifier, 'id'],
      [/^\[/, 'subscript.open', {push: 'subscript'}],
      [/^,/, 'operator.comma'],
      [/^;/, 'chip.section.separator', {pop: 1}],
      [/^:/, 'chip.section.block.open', {push: 'chip_section_block'}],
    ],
    subscript: [
      {include: 'whitespace'},
      [/^\d+/, 'uint'],
      [/^\.\./, 'operator.range'],
      [/^\]/, 'subscript.close', {pop: 1}],
    ],
    chip_section_block: [
      {include: 'whitespace'},
      [identifier, 'id'],
      [/^\(/, 'part.open', {push: 'part'}],
      [/^;/, 'part.separator'],
      [/^\}/, 'chip.body.close', {pop: 3}],
    ],
    part: [
      {include: 'whitespace'},
      [identifier, 'id'],
      [/^\[/, 'subscript.open', {push: 'subscript'}],
      [/^=/, 'operator.equal'],
      [/^,/, 'operator.comma'],
      [/^\)/, 'part.close', {pop: 1}],
    ],
  }

  const contexts_inverse_map = new WeakMap()
  Object.keys(contexts).map(k=> contexts_inverse_map.set(contexts[k], k))

  const tokens = []
  let i = 0, context = contexts.root, context_stack = []
  let ii = 0
  const loop_limit = 1000
  while (ii++<loop_limit && i<text.length) {
    const items = []
    items.push(...context.slice().reverse())
    let item = null
    while ((item = items.pop()) && ii++<loop_limit) {
      if (Array.isArray(item)) {
        const [regex, id, opt = {}] = item
        const str = text.slice(i)
        const m = str.match(regex)
        if (m) {
          tokens.push({
            m: m[0], i, id,
            // stack: [...context_stack, context].map(c=> contexts_inverse_map.get(c)),
          })
          i+=m[0].length
          if (opt.pop) {
            for (let pi=opt.pop; pi>0; pi--) {
              // tokens.push({pop: 1})
              context = context_stack.pop()
            }
            break;
          } else if (opt.push) {
            // tokens.push({push: opt.push})
            context_stack.push(context)
            context = contexts[opt.push]
            break;
          }
        }
      } else {
        if (item.include) {
          const ctx = contexts[item.include]
          items.push(...ctx.slice().reverse())
        }
      }
    }
  }
  if (ii>=loop_limit) console.error('loop_limit of '+loop_limit+' reached, please increase (or fix potential cycle)')
  return tokens
}

const hdl_astify = _tokens=> {

  const whitespace_get = (token, tokens)=> {
    if (token.id=='whitespace_char') {
      return contexts.whitespace(tokens)
    }
    if (token.id=='comment_line') {
      return contexts.comment_line(tokens)
    }
    if (token.id=='comment_block_start') {
      return contexts.comment_block(tokens)
    }
  }

  const tokens = _tokens.slice()
  const contexts = {
    root: (tokens)=> {
      const ast = {type: 'root', list: []}

      let token = null
      while ((token = tokens[0])) {
        const wast = whitespace_get(token, tokens)
        if (wast) {
          ast.list.push(wast)
          continue
        }
        if (token.id=='id') {
          const sub = contexts.chip(tokens)
          if (sub) {
            ast.list.push(sub)
            continue
          }
        }
        break
      }

      return ast
    },
    whitespace: tokens=> ({type: 'whitespace', token: tokens.shift()}),
    comment_line: tokens=> ({type: 'comment_line', token: tokens.shift()}),
    comment_block: tokens=> {
      const ast = {type: 'comment_block', start: tokens.shift(), body: null, end: null}
      let token = null
      while ((token = tokens.shift())) {
        if (token.push=='comment_block') continue
        if (token.id=='comment.block.body') {ast.body = token; continue}
        if (token.id=='comment.block.end') {ast.end = token; break}
      }
      return ast
    },
    chip: tokens=> {
      const ast = {type: 'chip', id: null, sections: [], tokens: []}
      if (tokens[0].m!=='CHIP') return false
      ast.tokens.push(tokens.shift())

      let token = null
      while ((token = tokens[0])) {
        const wast = whitespace_get(token, tokens)
        if (wast) {
          ast.tokens.push(wast)
          continue
        }
        if (token.id==='id') {
          ast.id = tokens.shift()
          continue
        }
        if (token.id==='chip.body.open') {
          ast.tokens.push(tokens.shift());
          break;
        }
        
        throw new Error('unexpected id '+ token.id)
      }

      while ((token = tokens[0])) {
        const wast = whitespace_get(token, tokens)
        if (wast) {ast.sections.push(wast); continue}
        if (token.id==='chip.body.close') {
          ast.tokens.push(tokens.shift());
          break;
        }
        if (token.id==='chip.section.id') {
          ast.sections.push(contexts.section(tokens))
          continue
        }
        if (token.id==='chip.section.separator') {
          ast.tokens.push(contexts.separator(tokens))
          continue
        }
        // throw new Error('unexpected id '+ token.id)
        break
      }

      return ast
    },
    section: (tokens)=> {
      const ast = {type: 'section', kind: tokens.shift(), parts: [], block_open: null, otherTokens: []}

      let token = null
      while ((token = tokens[0])) {
        const wast = whitespace_get(token, tokens)
        if (wast) {ast.parts.push(wast); continue}
        else if (token.id==='chip.section.block.open') {
          if (ast.block_open) {
            throw new Error('already openend')
          }
          // if (ast.parts.length) {
          //   throw new Error('no parts before block open')
          // }
          ast.block_open = tokens.shift()
          tokens.shift() // {"push":"chip_section_block"}
          continue
        }
        if (token.id==='operator.comma') {
          ast.parts.push(contexts.separator(tokens))
          continue
        }
        if (token.id==='chip.section.separator') {
          break
        }
        if (token.id==='part.separator') {
          // assumes ast.block_open
          ast.otherTokens.push(contexts.separator(tokens))
          continue
        }
        else if (token.id==='id') {
          if (ast.block_open) {
            ast.parts.push(contexts.section_part(tokens))
          } else {
            ast.parts.push(contexts.section_port(tokens))
          }
          continue
        }
        // throw new Error('unexpected id '+ token.id)
        break
      }
    
      return ast
    },
    // operator.comma
    // chip.section.separator
    separator: (tokens)=> ({type: 'separator', token: tokens.shift()}),
    section_part: (tokens)=> {
      const ast = {type: 'section_part', id: tokens.shift(), body: null, otherTokens: []}

      let token = null
      while ((token = tokens[0])) {
        const wast = whitespace_get(token, tokens)
        if (wast) {ast.otherTokens.push(wast); continue}
        else if (token.id==='part.open') {
          ast.body = contexts.section_part_body(tokens)
          break
        }
        // throw new Error('unexpected id '+ token.id)
        break
      }

      return ast
    },
    section_part_body: (tokens)=> {
      const ast = {type: 'section_part_body', connections: [], open: tokens.shift(), close: null, otherTokens: []}

      let token = null
      while ((token = tokens[0])) {
        const wast = whitespace_get(token, tokens)
        if (wast) {ast.otherTokens.push(wast); continue}
        if (token.id==='part.close') {
          ast.close = tokens.shift()
          break
        } 
        if (token.id==='id') {
          ast.connections.push(contexts.connection(tokens))
          continue
        } else if (token.id==='operator.comma') {
          ast.otherTokens.push(contexts.separator(tokens))
          continue
        }
        // throw new Error('unexpected id '+ token.id)
        break
      }

      return ast
    },
    connection: (tokens)=> {
      const ast = {type: 'connection', origin: null, target: null, otherTokens: []}

      let token = null
      while ((token = tokens[0])) {
        const wast = whitespace_get(token, tokens)
        if (wast) {ast.otherTokens.push(wast); continue}
         else
        if (token.id==='id') {
          const subast = contexts.section_port(tokens)
          if (!ast.origin) ast.origin = subast
          else {
            ast.target = subast
            break
          }
          continue
        } else if (token.id === 'operator.equal') {
          ast.otherTokens.push(contexts.operator_equal(tokens))
          continue
        }

        // throw new Error('unexpected id '+ token.id)
        break
      }

      return ast
    },
    section_port: (tokens)=> {
      const ast = {type: 'section_port', id: tokens.shift(), subscript: null}

      let token = null
      while ((token = tokens[0])) {
        // const wast = whitespace_get(token, tokens)
        // if (wast) {ast.parts.push(wast); continue}
        //  else
        if (token.id==='subscript.open') {
          if (ast.subscript) throw new Error('already subscript')
          ast.subscript = contexts.subscript(tokens)
          continue
        }

        // throw new Error('unexpected id '+ token.id)
        break
      }

      return ast
    },
    subscript: (tokens)=> {
      const ast = {type: 'subscript', open: tokens.shift(), start: null, range: null, end: null, close: null, otherTokens: []}

      let token = null
      while ((token = tokens[0])) {
        const wast = whitespace_get(token, tokens)
        if (wast) {ast.otherTokens.push(wast); continue}
        else if (token.id==='subscript.close') {
          ast.close = tokens.shift()
          break
        } else if (token.id==='uint') {
          const subast = contexts.uint(tokens)
          if (!ast.start) ast.start = subast
          else ast.end = subast
          continue
        } else if (token.id==='operator.range') {
          ast.range = contexts.operator_range(tokens)
          continue
        }

        throw new Error('unexpected id '+ token.id)
      }

      return ast
    },
    uint: (tokens)=> ({type: 'uint', token: tokens.shift()}),
    operator_range: (tokens)=> ({type: 'operator_range', token: tokens.shift()}),
    operator_equal: (tokens)=> ({type: 'operator_equal', token: tokens.shift()}),
  }

  const ast = contexts.root(tokens)
  const rest_tokens = tokens
  return {ast, rest_tokens}

  /*
  const contexts = {
    root: (ctx, item)=> {
      if (item.token) {
        const id = item.token.id
        if (id==='whitespace_char') {
          return {queue: [{type: 'whitespace', token}, ]}
        } else if (id === 'comment_block_start') {
          return {type: 'comment_block', token}
        }
      }

      if (!ast.type) {
        ast.type = 'root'
        ast.list = []
      }

      if (subast) {
        ast.list.push(subast)
        return
      }

      
    },
    whitespace: (ast, token)=> {

    },
    comment_block: (ast, token)=> {

    },
  }
  

  const context_initial = 'root'
  const ctx = {
    context_stack: [context_initial],
    ast: {},
  }

  const tokens = _tokens.slice()
  const queue = []
  
  let context = contexts[context_initial]
  let item = null
  while ((item = queue.pop()) || (tokens.length && (item = {token: tokens.shift()})) {
    const res = context(ctx, item)
    if (res.queue) queue.push(...res.queue)
  }
  
  return ctx.ast*/
}


const object_fromEntries = xs=> {
  const ret = {}
  xs.forEach(([k, v])=> ret[k] = v)
  return ret
}
const object_entries = obj=> {
  return Object.keys(obj).map(k=> [k, obj[k]])
}

const ast_clean = ast=> {
  if (typeof ast === 'object') {
    if (ast===null) return null
    if (Array.isArray(ast)) {
      return ast.map(ast_clean).filter(Boolean)
    }
    if (typeof ast.m === 'string') {
      return {value: ast.m, offset: ast.i}
    }
    if (ast.type) {
      let _ast = {...ast}
      if (_ast.type==='whitespace') return null
      // if (_ast.type==='chip') _ast = {}
      if (_ast.type==='subscript') delete _ast.range
      if (_ast.type==='connection') delete _ast.otherTokens
      if (_ast.type==='section_part_body') delete _ast.otherTokens
      if (_ast.type==='separator') return null
      if (_ast.open) delete _ast.open
      if (_ast.close) delete _ast.close
      return object_fromEntries(object_entries(_ast)
        .map(([k, v])=> [k, ast_clean(v)])
        // .filter(([k, v])=> !!v)
      )
    }
    throw new Error('unhandled type')
  }
  return ast
}

const ast_nodeedges_get = (ast_cleaned)=> {

  const nodes = []
  const edges = []

  const queue = []
  queue.push({parent: null, ast: ast_cleaned, key: null})

  let item
  while ((item = queue.pop())) {
    if (typeof item.ast !== 'object') {
      throw new Error(`not object ${typeof item.ast}, ${Object.keys(item)}`)
    }
    if (item.ast===null) continue
    if (Array.isArray(item.ast)) {
      queue.push(...item.ast.map(target=> ({parent: item.parent, ast: target, key: item.key})))
      // edges.push(...item.ast.map(target=> ({origin: item.parent, target, key: item.key})))
      continue
    }
    if (typeof item.ast.value === 'string') {
      continue

      nodes.push(item.ast)
      edges.push({origin: item.parent, target: item.ast, key: item.key})
      continue
    }
    if (item.ast.type) {
      nodes.push(item.ast)
      edges.push({origin: item.parent, target: item.ast, key: item.key})
      object_entries(item.ast).filter(([k])=> k!=='type').map(([k, v])=> {
        queue.push({parent: item.ast, ast: v, key: k})
      })
      continue
    }
    throw new Error(`unhandled type ${typeof item.ast}, ${Object.keys(item.ast)}`)
  }

  return {nodes, edges}
}

const ast_clean_to_dot = ({nodes, edges}, {rest_tokens})=> {

  const node_id_map = new WeakMap()
  const node_id_map_rev = new Map()
  nodes.forEach((n, i)=> {
    node_id_map.set(n, 'n'+i)
    node_id_map_rev.set('n'+i, n)
  })

  const dot = `
digraph ast {
  rankdir=LR;
  node [shape="ellipse"];

  ${ nodes.map(n=> {
    const id = node_id_map.get(n)
    const clean = s=> (s || '').slice(0, 30).replace(/["<>\\|\n\{\}]/g, '')
    const label = clean(n.type || n.value)
    if (!n.type) {
      return `"${id}" [shape="ellipse", label="${label}"]`
    }
    const ukeys = new Set(edges.filter(e=> e.origin == n).map(e=> e.key))
    const list = Array.from(ukeys.values()).map(k=> `<${k}> ${k}`).concat(object_entries(n)
      .filter(([k, v])=> v && typeof v.value === 'string').map(([k, v])=> `${k}: ${clean(v.value)}`))

    return `"${id}" [shape="record", label="{{${[label, ...list].join(' | ')}}}"]`
  }).join(';\n') };

  
  ${ edges.map(e=> `"${node_id_map.get(e.origin)}":"${e.key}":e -> "${node_id_map.get(e.target)}":w`).join(';\n') };

}`
return {dot, node_id_map, node_id_map_rev}
// [label="${e.key}"]
}


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
  
  const tokens_mima = object_entries(node)
  .map(([k, v])=> v && typeof v==='object' && v.value? [v.offset, v.offset+v.value.length]: null)
  .filter(Boolean)
  
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

const update_debounced = debounce(500)(()=> {
  const v = editor.getValue()
  const tokens = hdl_tokenize(v)
  // text.map(v=> JSON.stringify(v)).join('\n')
  const ast = hdl_astify(tokens)
  const ast_cleaned = ast_clean(ast.ast)
  const ast_nodeedges = ast_nodeedges_get(ast_cleaned)
  const {dot, node_id_map_rev} = ast_clean_to_dot(ast_nodeedges, {rest_tokens: ast.rest_tokens})
  node_id_map_dot_click = node_id_map_rev
  rerender_dot(dot)
  // rerender_dot(editor.getValue())
})
editor.onDidChangeModelContent(e=> {
  update_debounced()
})
update_debounced()

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