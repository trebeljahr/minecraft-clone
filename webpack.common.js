const merge = require("webpack-merge");
const path = require("node:path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = merge({
  entry: path.join(__dirname, "src", "main.ts"),

  output: {
    // public/ is the deploy root: it holds the committed favicons, textures,
    // styles and _headers, and wrangler.jsonc points assets.directory at it.
    // Bundles go into the gitignored public/dist/ subtree via output.filename,
    // so index.html can be emitted here by HtmlWebpackPlugin.
    //
    // Never use `clean: true` here: it would delete every committed file in
    // public/. This predicate keeps anything outside dist/ and sweeps only the
    // stale content-hashed bundles a previous build left behind.
    clean: {
      keep: (asset) => !asset.startsWith("dist/"),
    },
    path: path.join(__dirname, "public"),
    publicPath: "/",
    // Keep any future `import img from "./x.png"` inside the gitignored dist
    // tree instead of scattering hashed files across the deploy root.
    assetModuleFilename: "dist/assets/[hash][ext][query]",
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "src", "index.html"),
      filename: "index.html",
      // Only the main entry gets a <script> tag. chunkWorker is a webpack 5
      // worker entrypoint; injecting it here would run the worker body on the
      // main thread as well.
      chunks: ["main"],
      inject: "body",
      scriptLoading: "blocking",
      minify: {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true,
        // The inline Plausible loader must survive verbatim.
        minifyJS: false,
      },
    }),
  ],

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
