const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  const isDevelopment = !isProduction;

  return {
    entry: {
      background: './src/background/background.ts',
      content: './src/content/content.ts',
      popup: './src/popup/index.tsx',
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name]/[name].js',
      clean: true,
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: isDevelopment,
              compilerOptions: {
                sourceMap: isDevelopment,
              },
            },
          },
          exclude: /node_modules|tests/,
        },
        {
          test: /\.css$/,
          oneOf: [
            {
              include: [
                path.resolve(__dirname, 'src/content'),
                path.resolve(__dirname, 'src/components'),
              ],
              issuer: /content\.ts$/,
              use: [
                'to-string-loader',
                {
                  loader: 'css-loader',
                  options: {
                    sourceMap: isDevelopment,
                  },
                },
              ],
            },
            {
              use: [
                isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
                {
                  loader: 'css-loader',
                  options: {
                    sourceMap: isDevelopment,
                  },
                },
              ],
            },
          ],
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'assets/images/[name][ext]',
          },
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'assets/fonts/[name][ext]',
          },
        },
      ],
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.jsx'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'src/manifest.json',
            to: 'manifest.json',
            transform(content) {
              const manifest = JSON.parse(content.toString());
              if (isDevelopment) {
                manifest.name += ' (Dev)';
              }
              return JSON.stringify(manifest, null, 2);
            },
          },
          {
            from: 'src/content/styles.css',
            to: 'content/styles.css',
            noErrorOnMissing: true,
          },
          {
            from: 'src/assets',
            to: 'assets',
            noErrorOnMissing: true,
          },
        ],
      }),
      new HtmlWebpackPlugin({
        template: 'src/popup/popup.html',
        filename: 'popup/popup.html',
        chunks: ['popup'],
        inject: true,
        publicPath: '..',
      }),
      new MiniCssExtractPlugin({
        filename: '[name]/[name].css',
      }),
    ],
    devtool: isDevelopment ? 'inline-cheap-module-source-map' : false,
    optimization: {
      splitChunks: false,
      minimize: isProduction,
      sideEffects: false,
    },
    target: ['web', 'es2020'],
    experiments: {
      topLevelAwait: true,
    },
    performance: {
      hints: isProduction ? 'warning' : false,
      maxAssetSize: 1024 * 1024,
      maxEntrypointSize: 1024 * 1024,
    },
    stats: {
      errorDetails: true,
      children: false,
      modules: false,
    },
  };
};
