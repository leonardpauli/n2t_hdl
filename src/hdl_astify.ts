export const hdl_astify = _tokens=> {

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
        else if (token.id==='uint') {
          if (!ast.origin) throw new Error('uint can be origin')
          else {
            ast.target = contexts.uint(tokens)
            break
          }
        } else if (token.id==='id') {
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
