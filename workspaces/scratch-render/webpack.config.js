var path = require('path');
var webpack = require('webpack');

module.exports = {
    entry: {
        'render-webgl': './src/index-web.js',
        'render-webgl.min': './src/index-web.js',
        'render-webgl-worker': './src/index-webworker.js',
        'render-webgl-worker.min': './src/index-webworker.js'
    },
    devtool: 'source-map',
    output: {
        path: path.join(__dirname, 'build'),
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
