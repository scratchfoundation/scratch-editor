const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');
const webpack = require('webpack');

const base = {
    devServer: {
        contentBase: false,
        host: '0.0.0.0',
        port: process.env.PORT || 8361
    },
    devtool: 'cheap-module-source-map',
    module: {
        rules: [
            {
                include: [
                    path.resolve('src')
                ],
                test: /\.js$/,
                loader: 'babel-loader',
                options: {
                    presets: ['es2015']
                }
            },
            {
                test: /node_modules[\\/](linebreak|grapheme-breaker)[\\/].*\.js$/,
                loader: 'ify-loader'
            }
        ]
    },
    plugins: process.env.NODE_ENV === 'production' ? [
        new webpack.optimize.UglifyJsPlugin({
            include: /\.min\.js$/,
            minimize: true
        })
    ] : []
};

module.exports = [
    // Playground
    Object.assign({}, base, {
        target: 'web',
        entry: {
            'scratch-render': './src/index.js'
        },
        output: {
            library: 'ScratchRender',
            libraryTarget: 'umd',
            path: path.resolve('playground'),
            filename: '[name].js'
        },
        plugins: base.plugins.concat([
            new CopyWebpackPlugin([
                {
                    from: 'src/playground'
                }
            ])
        ])
    }),
    // Web-compatible
    Object.assign({}, base, {
        target: 'web',
        entry: {
            'scratch-render': './src/index.js',
            'scratch-render.min': './src/index.js'
        },
        output: {
            library: 'ScratchRender',
            libraryTarget: 'umd',
            path: path.resolve('dist', 'web'),
            filename: '[name].js'
        }
    }),
    // Node-compatible
    Object.assign({}, base, {
        target: 'node',
        entry: {
            'scratch-render': './src/index.js'
        },
        output: {
            library: 'ScratchRender',
            libraryTarget: 'commonjs2',
            path: path.resolve('dist', 'node'),
            filename: '[name].js'
        }
    })
];
