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
                    path.resolve(__dirname, 'src')
                ],
                test: /\.js$/,
                loader: 'babel-loader',
                options: {
                    presets: ['es2015']
                }
            }
        ]
    },
    plugins: [
        new webpack.optimize.UglifyJsPlugin({
            include: /\.min\.js$/,
            minimize: true,
            sourceMap: true
        })
    ]
};

module.exports = [
    // Playground
    Object.assign({}, base, {
        target: 'web',
        entry: {
            'scratch-render': './src/index-web.js'
        },
        output: {
            path: path.resolve(__dirname, 'playground'),
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
            'scratch-render': './src/index-web.js',
            'scratch-render.min': './src/index-web.js'
        },
        output: {
            path: path.resolve(__dirname, 'dist/web'),
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
            path: path.resolve(__dirname, 'dist/node'),
            filename: '[name].js'
        }
    })
];
