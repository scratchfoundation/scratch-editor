const path = require('path');
const webpack = require('webpack');

const base = {
    devServer: {
        contentBase: path.resolve(__dirname, 'playground'),
        host: '0.0.0.0',
        watchOptions: {
            aggregateTimeout: 300,
            poll: 1000
        },
        stats: {
            colors: true
        }
    },
    devtool: 'source-map',
    module: {
        loaders: [
            {
                include: [
                    path.resolve(__dirname, 'src')
                ],
                test: /\.js$/,
                loader: 'babel-loader',
                query: {
                    presets: ['es2015']
                }
            },
            {
                test: /\.json$/,
                loader: 'json-loader'
            },
            {
                test: /\.(glsl|vs|fs|frag|vert)$/,
                loader: 'raw-loader'
            }
        ]
    },
    plugins: [
        new webpack.optimize.UglifyJsPlugin({
            include: /\.min\.js$/,
            minimize: true,
            compress: {
                warnings: false
            }
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
        }
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
