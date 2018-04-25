const defaultsdeep = require('lodash.defaultsdeep');
const path = require('path');
const webpack = require('webpack');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

const makeExport = function (targets, settings) {
    const base = {
        mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
        devtool: 'cheap-module-source-map',
        module: {
            rules: [{
                include: path.resolve('src'),
                test: /\.js$/,
                loader: 'babel-loader',
                options: {
                    presets: [['env', {targets}]]
                }
            }]
        },
        entry: {
            'scratch-svg-renderer': './src/index.js'
        },
        optimization: {
            minimize: process.env.NODE_ENV === 'production' && /dist[\//]web/.test(settings.output.path)
        }
    };

    return defaultsdeep(base, settings);
};

module.exports = [
    makeExport({browsers: ['last 3 versions', 'Safari >= 8', 'iOS >= 8']}, {
        output: {
            library: 'ScratchSVGRenderer',
            libraryTarget: 'umd',
            path: path.resolve('dist', 'web'),
            filename: '[name].js'
        }
    }),
    // For testing only: many features will fail outside a browser
    makeExport({node: true, uglify: true}, {
        output: {
            library: 'ScratchSVGRenderer',
            libraryTarget: 'commonjs2',
            path: path.resolve('dist', 'node'),
            filename: '[name].js'
        },
        performance: {
            hints: false
        }
    })
];
