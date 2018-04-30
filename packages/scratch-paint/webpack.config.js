const defaultsDeep = require('lodash.defaultsdeep');
const path = require('path');

// Plugins
const HtmlWebpackPlugin = require('html-webpack-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

// PostCss
const autoprefixer = require('autoprefixer');
const postcssVars = require('postcss-simple-vars');
const postcssImport = require('postcss-import');

const base = {
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    devtool: 'cheap-module-source-map',
    module: {
        rules: [{
            test: /\.jsx?$/,
            loader: 'babel-loader',
            include: path.resolve(__dirname, 'src'),
            options: {
                plugins: ['transform-object-rest-spread'],
                presets: [['env', {browsers: ['last 3 versions', 'Safari >= 8', 'iOS >= 8']}], 'react']
            }
        },
        {
            test: /\.css$/,
            use: [{
                loader: 'style-loader'
            }, {
                loader: 'css-loader',
                options: {
                    modules: true,
                    importLoaders: 1,
                    localIdentName: '[name]_[local]_[hash:base64:5]',
                    camelCase: true
                }
            }, {
                loader: 'postcss-loader',
                options: {
                    ident: 'postcss',
                    plugins: function () {
                        return [
                            postcssImport,
                            postcssVars,
                            autoprefixer({
                                browsers: ['last 3 versions', 'Safari >= 8', 'iOS >= 8']
                            })
                        ];
                    }
                }
            }]
        },
        {
            test: /\.png$/i,
            loader: 'url-loader'
        },
        {
            test: /\.svg$/,
            loader: 'svg-url-loader?noquotes'
        }]
    },
    optimization: {
        minimizer: [
            new UglifyJsPlugin({
                include: /\.min\.js$/
            })
        ]
    },
    plugins: []
};

module.exports = [
    // For the playground
    defaultsDeep({}, base, {
        devServer: {
            contentBase: path.resolve(__dirname, 'playground'),
            host: '0.0.0.0',
            port: process.env.PORT || 8078
        },
        entry: {
            playground: './src/playground/playground.jsx'
        },
        output: {
            path: path.resolve(__dirname, 'playground'),
            filename: '[name].js'
        },
        plugins: base.plugins.concat([
            new HtmlWebpackPlugin({
                template: 'src/playground/index.ejs',
                title: 'Scratch 3.0 Paint Editor Playground'
            })
        ])
    }),
    // For use as a library
    defaultsDeep({}, base, {
        externals: {
            'minilog': 'minilog',
            'prop-types': 'prop-types',
            'react': 'react',
            'react-dom': 'react-dom',
            'react-intl': 'react-intl',
            'react-intl-redux': 'react-intl-redux',
            'react-popover': 'react-popover',
            'react-redux': 'react-redux',
            'react-responsive': 'react-responsive',
            'react-style-proptype': 'react-style-proptype',
            'react-tooltip': 'react-tooltip',
            'redux': 'redux'
        },
        entry: {
            'scratch-paint': './src/index.js'
        },
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: '[name].js',
            libraryTarget: 'commonjs2'
        }
    })
];
