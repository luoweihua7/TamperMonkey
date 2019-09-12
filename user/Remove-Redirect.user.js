// ==UserScript==
// @name         外链直接打开
// @version      1.1.0
// @description  外链直接打开
// @author       larify
// @run-at       document-end
// @include      *
// @downloadURL  https://github.com/luoweihua7/TamperMonkey/raw/master/user/Remove-Redirect.user.js
// @grant        unsafeWindow

// ==/UserScript==

;(function() {
  let configs = [
    {
      domain: 'zhihu.com',
      elements: ['a.external', 'a.LinkCard'],
      replacer(url) {
        let tmp = url.split('target=')

        if (tmp.length === 2) {
          return decodeURIComponent(tmp[1])
        }
      }
    },
    {
      domain: 'juejin.im',
      elements: ['a'],
      replacer(url) {
        let tmp = url.split('target=')

        if (tmp.length === 2) {
          return decodeURIComponent(tmp[1])
        }
      }
    }
  ]

  let win
  if (typeof window !== 'undefined' && window.top === window) {
    win = window
  } else if (typeof unsafeWindow !== 'undefined') {
    win = unsafeWindow
  }

  let config = []
  let host = win.location.hostname
  configs.forEach(conf => {
    if (host.includes(conf.domain)) {
      config.push(conf)
    }
  })

  if (config.length === 0) return

  const removeLinkRedirect = () => {
    config.forEach(conf => {
      let elements = []
      conf.elements.forEach(selector => {
        elements = elements.concat([...document.querySelectorAll(selector)])
      })

      // 替换为原始URL
      elements.forEach(link => {
        let url = conf.replacer(link.href)
        if (url) {
          link.href = url
        }
      })
    })
  }

  setTimeout(() => {
    let bodyEl = document.querySelector('body')
    let observer = new MutationObserver(removeLinkRedirect)

    observer.observe(bodyEl, { childList: true, subtree: true })
    removeLinkRedirect()
  }, 500)
})()
