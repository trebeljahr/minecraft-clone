const merge = require("webpack-merge");
const path = require("path");

module.exports = merge({
  entry: path.join(__dirname, "src", "main.ts"),

  output: {
    path: __dirname + "/public/dist/",
    publicPath: "/dist/",
  },

  resolve: {
    extensions: [".ts", ".js", ".html"],
  },

  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: "ts-loader",
      },
      {
        test: /\.(gltf|mp3|svg|glb|png|jpe?g)$/,
        type: "asset/resource",
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
});
