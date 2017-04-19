const path = require('path');
const webpack = require('webpack');

const base = {
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
    // Web-compatible
    Object.assign({}, base, {
        target: 'web',
        entry: {
            'scratch-storage': './src/index-web.js',
            'scratch-storage.min': './src/index-web.js'
        },
        output: {
            path: __dirname,
            filename: 'dist/web/[name].js'
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
            path: __dirname,
            filename: 'dist/node/[name].js'
        }
    })
];
