const path = require('path');

module.exports = {
  watch: true,
  entry: './components/ordering_graph/index.ts',
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.(glsl|vs|fs)$/,
        use: 'ts-shader-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, '/..', 'Users', 'toebn', 'source', 'repos', 'soro-s', 'build', 'msvc-release', 'server_resources', 'components', 'ordering_graph'),
    library: {
      name: 'webpackSigmaGraph',
      type: 'umd',
    },
  },
};
