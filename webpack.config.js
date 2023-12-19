const path = require('path');

const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebPackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = (env) => {
    buildPath =  path.resolve(__dirname, env.production ? 'dist' : 'src');

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
            })            
        ],
        output: {
            filename: 'index-style/js/main.js',
            path: buildPath,
            publicPath: '/'
        },
        devtool: "source-map",
        devServer: {
            static: buildPath,
            port: 8080,
            hot: true,
            historyApiFallback: true,
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