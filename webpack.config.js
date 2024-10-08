const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    aframe: './src/aframe-scene.js',
    quizz: './src/quizz-scene.js',
    presentation: './src/reveal-presentation.js'
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
      
    ]
  },
  plugins: [
    
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'public', to: '' }
      ],
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    }),
    new webpack.NormalModuleReplacementPlugin(/node:/, (resource) => {
      const mod = resource.request.replace(/^node:/, "");
      switch (mod) {
        case "path":
          resource.request = "path-browserify";
          break;
        case "url":
          resource.request = "url/";
          break;
        default:
          throw new Error(`Not found ${mod}`);
      }
    }),
  ],
  resolve: {
    fallback: {
      "fs" : false,
      "ws": false,
      "url": require.resolve("url/"),
      "net": false,
      "tls": false,
      "path": require.resolve("path-browserify"),
      "zlib": require.resolve("browserify-zlib"),
      "stream": require.resolve("stream-browserify"),
      "http": require.resolve("stream-http"),
      "https": require.resolve("https-browserify"),
      "crypto": require.resolve("crypto-browserify"),
      "buffer": require.resolve("buffer/")
    },
    alias: {
      '@cmcrobotics/homie-lit': '@cmcrobotics/homie-lit'
    },
    mainFields: ['module', 'browser', 'main']
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    compress: true,
    port: 9000,
  }
};
