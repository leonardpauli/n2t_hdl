import {c, d, debounce, object_fromEntries, object_entries} from './utils'

export const ast_clean = ast=> {
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

export const ast_nodeedges_get = (ast_cleaned)=> {

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

export const ast_clean_to_dot = ({nodes, edges}, {rest_tokens})=> {

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

  ${ nodes.slice().reverse().map(n=> {
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
