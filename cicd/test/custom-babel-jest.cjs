const globalConfig = require(process.cwd() + '/babel.config.cjs')

module.exports = require('babel-jest').createTransformer({
  ...globalConfig,
  plugins: ['babel-plugin-rewire'],
})
