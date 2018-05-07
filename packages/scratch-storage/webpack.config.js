const path = require('path');
const webpack = require('webpack');

const base = {
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
                    presets: [['env', {targets: {browsers: ['last 3 versions', 'Safari >= 8', 'iOS >= 8']}}]]
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
    // Web-compatible
    Object.assign({}, base, {
        target: 'web',
        entry: {
            'scratch-storage': './src/index.js',
            'scratch-storage.min': './src/index.js'
        },
        output: {
            library: 'ScratchStorage',
            libraryTarget: 'umd',
            path: path.resolve('dist', 'web'),
            filename: '[name].js'
        }
    }),

    // Node-compatible
    Object.assign({}, base, {
        target: 'node',
        entry: {
            'scratch-storage': './src/index.js'
        },
        output: {
            library: 'ScratchStorage',
            libraryTarget: 'commonjs2',
            path: path.resolve('dist', 'node'),
            filename: '[name].js'
        }
    })
];
