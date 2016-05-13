var path = require('path');
var webpack = require('webpack');

module.exports = {
    entry: {
        'render-webgl': './src/index.js',
        'render-webgl.min': './src/index.js'
    },
    devtool: 'source-map',
    output: {
        path: __dirname,
        filename: '[name].js'
    },
    module: {
        loaders: [
            {
                test: /\.json$/,
                loader: 'json-loader'
            },
            {
                test: /\.(glsl|vs|fs|frag|vert)$/,
                loader: 'raw-loader' // we might want a GLSL loader if we use includes
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
