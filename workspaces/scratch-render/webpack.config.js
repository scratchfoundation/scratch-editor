var path = require('path');
var webpack = require('webpack');

var base = {
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

module.exports = [Object.assign({}, base, {
    entry: {
        'render': './src/index-web.js',
        'render.min': './src/index-web.js'
    },
    output: {
        path: __dirname,
        filename: '[name].js'
    },
}),
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
})];
