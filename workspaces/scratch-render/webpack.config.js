const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

const base = {
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    devServer: {
        contentBase: false,
        host: '0.0.0.0',
        port: process.env.PORT || 8361
    },
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
                    presets: [['env', {targets: {browsers: ['last 3 versions', 'Safari >= 8', 'iOS >= 8']}}]]
                }
            }
        ]
    },
    optimization: {
        minimizer: [
            new UglifyJsPlugin({
                include: /\.min\.js$/
            })
        ]
    },
    plugins: []
};

module.exports = [
    // Playground
    Object.assign({}, base, {
        target: 'web',
        entry: {
            playground: './src/playground/playground.js',
            queryPlayground: './src/playground/queryPlayground.js'
        },
        output: {
            libraryTarget: 'umd',
            path: path.resolve('playground'),
            filename: '[name].js'
        },
        plugins: base.plugins.concat([
            new CopyWebpackPlugin([
                {
                    context: 'src/playground',
                    from: '*.+(html|css)'
                }
            ])
        ])
    }),
    // Web-compatible
    Object.assign({}, base, {
        target: 'web',
        entry: {
            'scratch-render': './src/index.js',
            'scratch-render.min': './src/index.js'
        },
        output: {
            library: 'ScratchRender',
            libraryTarget: 'umd',
            path: path.resolve('dist', 'web'),
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
            path: path.resolve('dist', 'node'),
            filename: '[name].js'
        },
        externals: {
            '!ify-loader!grapheme-breaker': 'grapheme-breaker',
            '!ify-loader!linebreak': 'linebreak',
            'hull.js': true,
            'scratch-svg-renderer': true,
            'twgl.js': true,
            'xml-escape': true
        }
    })
];
