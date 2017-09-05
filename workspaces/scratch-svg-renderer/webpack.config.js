const path = require('path');
const webpack = require('webpack');

module.exports = {
    devtool: 'cheap-module-source-map',
    module: {
        rules: [{
            test: /\.jsx?$/,
            loader: 'babel-loader',
            include: path.resolve(__dirname, 'src'),
            options: {
                plugins: ['transform-object-rest-spread'],
                presets: ['es2015']
            }
        }]
    },
    entry: {
        'scratch-svg-renderer': './src/svg-renderer.js'
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        libraryTarget: 'commonjs2'
    },
    plugins: []
        .concat(process.env.NODE_ENV === 'production' ? [
            new webpack.optimize.UglifyJsPlugin({
                include: /\.min\.js$/,
                minimize: true
            })
        ] : [])
};
