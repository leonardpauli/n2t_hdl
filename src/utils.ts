export type node_list = Array<string | Node>
export const c = (tag: 0 | string, className: string, _opt: Object | node_list, _sub?: node_list): HTMLElement => {
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
export const d = (className: string, _opt: Object | node_list = [], _sub?: node_list): HTMLElement => {
  return c(0, className, _opt, _sub)
}

export const debounce = (ms=0)=> (fn: Function)=> {
  let t: number = 0
  return ()=> {
    clearTimeout(t)
    t = setTimeout(()=> {
      fn()
    }, ms)
  }
}

export const object_fromEntries = xs=> {
  const ret = {}
  xs.forEach(([k, v])=> ret[k] = v)
  return ret
}
export const object_entries = obj=> {
  return Object.keys(obj).map(k=> [k, obj[k]])
}
