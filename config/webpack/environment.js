const { environment } = require('@rails/webpacker')

const webpack = require('webpack')
const path = require('path')

environment.plugins.append('Provide',
  new webpack.ProvidePlugin({
    $: 'jquery',
    jQuery: 'jquery',
    Popper: ['popper.js', 'default']
  }))

environment.config.merge({
  resolve: {
    alias: {
      '@apps': path.resolve(process.cwd(), 'app/javascript/apps'),
      '@components': path.resolve(process.cwd(), 'app/javascript/components'),
      '@elements': path.resolve(process.cwd(), 'app/javascript/elements'),
      '@helpers': path.resolve(process.cwd(), 'app/javascript/helpers'),
      '@hooks': path.resolve(process.cwd(), 'app/javascript/hooks'),
      '@services': path.resolve(process.cwd(), 'app/javascript/services'),
      '@stylesheets': path.resolve(process.cwd(), 'app/javascript/stylesheets')
    }
  }
})

module.exports = environment
