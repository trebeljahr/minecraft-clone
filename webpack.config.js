// Global imports
const webpack = require("webpack");
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");

// Paths
const entry = "./src/js/app.js";
const includePath = path.join(__dirname, "src/js");
const nodeModulesPath = path.join(__dirname, "node_modules");

let outputPath = path.join(__dirname, "src/public/js");
let publicPath = "/js/";

module.exports = (env) => {
  let devtool = "inline-source-map";
  let mode = "development";
  let stats = "minimal";
  let plugins = [
    new webpack.DefinePlugin({
      __ENV__: JSON.stringify(env.NODE_ENV),
    }),
  ];

  if (env.NODE_ENV === "prod") {
    devtool = "hidden-source-map";
    mode = "production";
    stats = "none";
    outputPath = `${__dirname}/build/js`;
    publicPath = "js/";
  }

  console.log("Webpack build -");
  console.log(`    - ENV: ${env.NODE_ENV}`);
  console.log(`    - outputPath  ${outputPath}`);
  console.log(`    - includePath ${includePath}`);
  console.log(`    - nodeModulesPath: ${nodeModulesPath}`);

  return {
    entry: [entry],
    output: {
      path: outputPath,
      publicPath,
      filename: "[name].bundle.js",
      chunkFilename: "[name].bundle.js",
    },

    mode,
    module: {
      rules: [
        {
          test: /\.js?$/,
          use: {
            loader: "babel-loader",
          },
          include: includePath,
          exclude: nodeModulesPath,
        },
        {
          test: /\.(s*)css$/,
          use: [
            {
              loader: MiniCssExtractPlugin.loader,
              options: {
                publicPath: "css",
              },
            },
            "css-loader",
          ],
        },
      ],
    },
    resolve: {
      modules: ["node_modules", path.resolve(__dirname, "src")],
      extensions: [".js", ".json"],
    },

    performance: {
      hints: "warning",
    },
    stats,
    devtool,

    devServer: {
      static: "src/public",
    },

    plugins: plugins.concat(
      new HtmlWebpackPlugin({
        title: "Three.js Webpack ES6 Boilerplate",
        template: path.join(__dirname, "src/html/index.html"),
        filename: "../index.html",
        env: env.NODE_ENV,
      }),
      new MiniCssExtractPlugin({
        filename: "../css/[name].css",
        chunkFilename: "../css/[id].css",
      })
    ),

    optimization: {
      minimize: true,
      minimizer: [new OptimizeCSSAssetsPlugin()],
      runtimeChunk: "single",
      splitChunks: {
        cacheGroups: {
          vendor: {
            test: /[\\\/]node_modules[\\\/]/,
            name: "vendors",
            chunks: "all",
          },
          styles: {
            name: "styles",
            test: /\.css$/,
            chunks: "all",
            enforce: true,
          },
        },
      },
    },
  };
};
