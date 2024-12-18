process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const environment = require('./environment');

environment.loaders.append('eslint', {
  enforce: 'pre',
  test: /\.js$/,
  exclude: /node_modules/,
  loader: 'eslint-loader',
  options: {
    quiet: true,
    emitWarning: true,
    failOnError: false,
    failOnWarning: false,
  },
});

module.exports = environment.toWebpackConfig();
