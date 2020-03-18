export const hdl_tokenize = text=> {
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
      [/^\d+/, 'uint'],
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
  const loop_limit = 30000
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
  // TODO: some incomplete syntaxes run amok, please fix (though should really do it with a proper parser instead)
  if (ii>=loop_limit) console.error('loop_limit of '+loop_limit+' reached, please increase (or fix potential cycle)')
  return tokens
}
