const path = require('path');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

const base = {
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
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
                    presets: [
                        ['@babel/preset-env', {targets: {browsers: ['last 3 versions', 'Safari >= 8', 'iOS >= 8']}}]
                    ]
                }
            }
        ]
    },
    optimization: {
        minimizer: [
            new UglifyJsPlugin({
                include: /\.min\.js$/,
                sourceMap: true
            })
        ]
    },
    plugins: []
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
        },
        externals: {
            'base64-js': true,
            'js-md5': true,
            'localforage': true,
            'text-encoding': true
        }
    })
];
