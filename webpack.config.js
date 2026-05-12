const path = require('path');

const webpack = require("webpack")
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebPackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = (env = {}) => {
    // In development, never use `src` as devServer.static + output.path: the raw
    // `src/index.html` would be served instead of HtmlWebpackPlugin output (no JS/CSS injected).
    const isProd = Boolean(env.production);
    const outputDir = isProd
        ? path.resolve(__dirname, 'dist')
        : path.resolve(__dirname, '.webpack-dev');

    return {
        entry: './src/js/main.js',
        plugins: [
            new MiniCssExtractPlugin({
                filename: 'index-style/css/main.css'
            }),
            new CopyWebPackPlugin({
                patterns: [
                    { from: "src/images", to: "index-style/images" },
                    { from: "src/404.html", to: "" },
                ],
            }),        
            new HtmlWebpackPlugin({
                template: 'src/index.html',
                filename: 'index.html'
            }) ,
            new webpack.EnvironmentPlugin({
                PUBLIC_PATH: '/data/',
            })        
        ],
        output: {
            filename: 'index-style/js/main.js',
            path: outputDir,
            publicPath: '/data/'
        },
        devtool: "source-map",
        devServer: {
            static: isProd
                ? false
                : [
                      {
                          directory: path.join(__dirname, 'src/images'),
                          publicPath: '/images',
                      },
                  ],
            port: 8080,
            hot: true,
            // Must match output.publicPath so `/` serves HtmlWebpackPlugin output (default `/index.html` 404s).
            historyApiFallback: {
                index: '/data/index.html',
            },
        },
        module: {
            rules: [
                {
                    test: /\.(woff(2)?|eot|ttf|otf|svg|)$/,
                    type: 'asset',   // <-- Assets module - asset
                    parser: {
                      dataUrlCondition: {
                        maxSize: 8 * 1024 // 8kb
                      }
                    },
                    generator: {  //If emitting file, the file path is
                      filename: 'index-style/fonts/[hash][ext][query]'
                    }
                },                   
                {
                    mimetype: 'image/svg+xml',
                    scheme: 'data',
                    type: 'asset/resource',
                    generator: {
                        filename: 'index-style/icons/[hash].svg'
                    }
                },
                {
                    test: /\.(?:ico|gif|png|jpg|jpeg)$/i,
                    type: 'asset/resource',  //<-- Assets module - asset/resource
                    generator: {
                      filename: 'index-style/images/[hash][ext][query]'
                    }
                },                
                {
                    test: /\.(scss)$/,
                    use: [
                        {
                            loader: MiniCssExtractPlugin.loader          
                        },
                        {
                            loader: 'css-loader'
                        },
                        {
                            loader: 'postcss-loader',
                            options: {
                                postcssOptions: {
                                    plugins: () => [
                                    require('autoprefixer')
                                    ]
                                }
                            }
                        },
                        {
                            loader: 'sass-loader'
                        }
                    ]
                },
                {
                    test: /\.html$/,
                    use: [
                      {
                        loader: 'html-loader'
                      }
                    ]
                  }
            ]
        },
    }
}