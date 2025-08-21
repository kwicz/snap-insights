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
      // Chrome extensions don't support eval-based source maps
      devtoolModuleFilenameTemplate: isDevelopment
        ? 'webpack://[namespace]/[resource-path]?[loaders]'
        : undefined,
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: isDevelopment, // Faster builds in dev
              compilerOptions: {
                sourceMap: isDevelopment,
              },
            },
          },
          exclude: /node_modules|tests/,
        },
        {
          test: /\.css$/,
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
              // Allow manifest transformation for different environments
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
        inject: 'body',
        minify: isProduction
          ? {
              removeComments: true,
              collapseWhitespace: true,
              removeRedundantAttributes: true,
              useShortDoctype: true,
              removeEmptyAttributes: true,
              removeStyleLinkTypeAttributes: true,
              keepClosingSlash: true,
              minifyJS: true,
              minifyCSS: true,
              minifyURLs: true,
            }
          : false,
      }),
      ...(isProduction
        ? [
            new MiniCssExtractPlugin({
              filename: '[name]/[name].css',
            }),
          ]
        : []),
    ],
    // Chrome extensions require inline source maps for development
    devtool: isDevelopment ? 'inline-cheap-module-source-map' : false,
    optimization: {
      splitChunks: false, // Chrome extensions don't support code splitting
      minimize: isProduction,
      sideEffects: false,
    },
    // Chrome extension specific settings
    target: ['web', 'es2020'],
    experiments: {
      topLevelAwait: true, // Enable top-level await for modern Chrome extensions
    },
    performance: {
      hints: isProduction ? 'warning' : false,
      maxAssetSize: 1024 * 1024, // 1MB
      maxEntrypointSize: 1024 * 1024, // 1MB
    },
    stats: {
      errorDetails: true,
      children: false,
      modules: false,
    },
  };
};
