var path = require('path');
var webpack = require('webpack');

var base = {
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
    // Web-compatible
    Object.assign({}, base, {
        entry: {
            'render': './src/index-web.js',
            'playground/render': './src/index-web.js',
            'render.min': './src/index-web.js'
        },
        output: {
            path: __dirname,
            filename: '[name].js'
        }
    }),
    // Webpack-compatible
    Object.assign({}, base, {
        entry: {
            'render': './src/index.js'
        },
        output: {
            library: 'ScratchRender',
            libraryTarget: 'commonjs2',
            path: __dirname,
            filename: 'dist.js'
        }
    })
];
