const path = require('path');
const webpack = require('webpack');

const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = {
  mode: isDevelopment ? 'development' : 'production',
  target: 'electron-preload',
  entry: './src/preload/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist', 'preload'),
    filename: 'index.js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: 'ts-loader',
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json'],
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  externals: {
    electron: 'commonjs2 electron',
  },
  node: {
    __dirname: false,
    __filename: false,
  },
  devtool: isDevelopment ? 'source-map' : false,
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    }),
  ],
};