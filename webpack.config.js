var webpack = require('webpack')
var path = require('path')
var BrowserSyncPlugin = require('browser-sync-webpack-plugin')
var HtmlWebpackPlugin = require('html-webpack-plugin')
var ExtractTextPlugin = require("extract-text-webpack-plugin")

module.exports = {
  entry: {
    'bundle.min': './index.js'
  },
  output: {
    path: path.join(__dirname, '/public'),
    filename: '[name].js'
  },
  module: {
    rules: [{
      test: /\.css$/,
      use: ExtractTextPlugin.extract({
        fallback: "style-loader",
        use: [{
          loader: "css-loader",
          options: {
            minimize: true
          }
        }]
      })
    }]
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'OSM tasking import - Perú',
      minify: {
        collapseWhitespace: true
      },
      // hash: true,
      excludeChunks: ['land'],
      template: '!!ejs-compiled-loader!src/views/index.ejs'
    }),
    new HtmlWebpackPlugin({
      title: 'land',
      minify: {
        collapseWhitespace: true
      },
      // hash: true,
      filename: 'land.html',
      template: '!!ejs-compiled-loader!src/views/land.ejs',
      inject: false
    }),
    new webpack.optimize.UglifyJsPlugin({
      include: /\.min\.js$/,
      minimize: true
    }),
    new ExtractTextPlugin({
      filename: "bundle.css",
      disable: false,
      allChunks: true
    }),
    new BrowserSyncPlugin({
      host: 'localhost',
      port: 3000,
      server: {
        baseDir: ['public']
      }
    })
  ]
}