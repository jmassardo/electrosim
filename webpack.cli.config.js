const path = require('path');
const webpack = require('webpack');

const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = {
  mode: isDevelopment ? 'development' : 'production',
  target: 'node',
  entry: './src/cli/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist', 'cli'),
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
    // Keep node modules as externals for CLI
    ...require('webpack-node-externals')(),
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
    new webpack.BannerPlugin({
      banner: '#!/usr/bin/env node',
      raw: true,
    }),
  ],
};