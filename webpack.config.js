module.exports = {
  entry: './src/public/js/app/app.js',
  output: {
    filename: 'app.min.js',
  },
  module: {
    loaders: [{
      test: /^.+\.js$/,
      loader: 'babel-loader'
    }]
  }
}
