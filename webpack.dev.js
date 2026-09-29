const merge = require("webpack-merge");
const common = require("./webpack.common.js");
const path = require("node:path");

module.exports = merge(common, {
  mode: "development",
  devtool: "source-map",

  output: {
    // No content hash in dev: stable names keep rebuilds cheap and readable.
    filename: "dist/[name].js",
    chunkFilename: "dist/[name].js",
  },

  devServer: {
    static: {
      directory: path.join(__dirname, "public"),
    },
    compress: true,
    port: 3340,
  },

  module: {
    rules: [
      {
        enforce: "pre",
        test: /\.js$/,
        loader: "source-map-loader",
      },
    ],
  },
});
