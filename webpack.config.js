const path = require('path');

const webpack = require("webpack")
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebPackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = (env = {}) => {
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
                    { from: "node_modules/@fortawesome/fontawesome-free/webfonts", to: "webfonts" }
                ],
            }),

            new HtmlWebpackPlugin({
                template: 'src/index.html',
                filename: 'index.html'
            }),

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
            port: 9002,
            hot: true,

            historyApiFallback: {
                index: '/data/index.html',
            },

            // 🔥 Prevent warning overlays from blocking your app
            client: {
                overlay: {
                    errors: true,
                    warnings: false
                }
            }
        },

        module: {
            rules: [
                // Font files (Font Awesome)
                {
                    test: /\.(woff2?|eot|ttf|otf)$/i,
                    type: "asset/resource",
                    generator: {
                        filename: "webfonts/[name][ext]"
                    }
                },

                // Inline SVG and SVG resources
                {
                    mimetype: 'image/svg+xml',
                    scheme: 'data',
                    type: 'asset/resource',
                    generator: {
                        filename: 'index-style/icons/[hash].svg'
                    }
                },

                // Images
                {
                    test: /\.(?:ico|gif|png|jpg|jpeg)$/i,
                    type: 'asset/resource',
                    generator: {
                        filename: 'index-style/images/[hash][ext][query]'
                    }
                },

                // SCSS Pipeline
                {
                    test: /\.(scss)$/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        'css-loader',
                        {
                            loader: 'postcss-loader',
                            options: {
                                postcssOptions: {
                                    plugins: () => [require('autoprefixer')]
                                }
                            }
                        },

                        // 🔥 Suppress Bootstrap / FontAwesome Deprecation Warnings
                        {
                            loader: 'sass-loader',
                            options: {
                                sassOptions: {
                                    quietDeps: true
                                }
                            }
                        }
                    ]
                },

                // HTML loader
                {
                    test: /\.html$/,
                    use: ['html-loader']
                }
            ]
        }
    }
}