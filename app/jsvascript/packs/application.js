import '@stylesheets/application'
import '@fortawesome/fontawesome-free/js/all'

import { Application } from 'stimulus'
import { definitionsFromContext } from 'stimulus/webpack-helpers'
import '../setups/react'
import toastr from 'toastr/toastr'
import index from 'cd-atwho'

toastr.options = {
  positionClass: 'toast-bottom-right',
  preventDuplicates: true,
  preventOpenDuplicates: true,
}

const application = Application.start()
const context = require.context('controllers', true, /\.js$/)
application.load(definitionsFromContext(context))
window.toastr = toastr

/* eslint-disable */
let containerScrollTops = {}

['click'].forEach((evt) => {
  document.addEventListener(evt, () => {
    document
      .querySelectorAll('[data-turbolinks-preserve-scroll-container]')
      .forEach((ele) => {
        containerScrollTops[ele.dataset.turbolinksPreserveScrollContainer] =
          ele.scrollTop
      })
  })
})

// cleanup select2
document.addEventListener('turbolinks:before-cache', () => {
  $('.is-select2').each((n, el) => {
    const $el = $(el)
    if ($el.select2) $el.select2('destroy')
  })
})

['turbolinks:load'].forEach((evt) => {
  document.addEventListener(evt, () => {
    document
      .querySelectorAll('[data-turbolinks-preserve-scroll-container]')
      .forEach((ele) => {
        const containerScrollTop =
          containerScrollTops[ele.dataset.turbolinksPreserveScrollContainer]
        if (containerScrollTop) ele.scrollTo(0, containerScrollTop)
      })

    containerScrollTops = {}
  })
})
/* eslint-enable */
