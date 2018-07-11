const defaultsDeep = require('lodash.defaultsdeep');
const path = require('path');

const base = {
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    devtool: 'cheap-module-source-map',
    entry: {
        'scratch-svg-renderer': './src/index.js'
    },
    module: {
        rules: [{
            include: [
                path.resolve('src'),
                path.resolve('node_modules', 'scratch-render-fonts')
            ],
            test: /\.js$/,
            loader: 'babel-loader',
            options: {
                presets: [['env', {targets: {}}]]
            }
        }]
    }
};

module.exports =
    defaultsDeep({}, base, {
        output: {
            library: 'ScratchSVGRenderer',
            libraryTarget: 'umd',
            path: path.resolve('dist', 'web'),
            filename: '[name].js'
        },
        module: {
            rules: [{
                options: {
                    presets: [['env', {targets: {browsers: ['last 3 versions', 'Safari >= 8', 'iOS >= 8']}}]]
                }
            }]
        },
        optimization: {
            minimize: process.env.NODE_ENV === 'production'
        }
    });
