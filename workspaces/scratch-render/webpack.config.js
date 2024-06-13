const path = require('path');
const webpack = require('webpack');

const TerserPlugin = require('terser-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const ScratchWebpackConfigBuilder = require('scratch-webpack-configuration');

const baseConfig = new ScratchWebpackConfigBuilder({
    rootPath: path.resolve(__dirname)
})
    .enableDevServer(process.env.PORT || 8361)
    .merge({
        optimization: {
            minimizer: [
                new TerserPlugin({
                    include: /\.min\.js$/
                })
            ]
        },
        resolve: {
            fallback: {
                Buffer: require.resolve('buffer/')
            }
        }
    })
    .addPlugin(new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer']
    }));

const webConfig = baseConfig.clone()
    .setTarget('browserslist')
    .merge({
        entry: {
            'scratch-render': path.join(__dirname, 'src/index.js'),
            'scratch-render.min': path.join(__dirname, 'src/index.js')
        },
        output: {
            library: {
                name: 'ScratchRender'
            }
        }
    })
    .addPlugin(new HtmlWebpackPlugin({
        chunks: 'all',
        filename: 'index.html',
        template: 'test/integration/index.ejs',
        scriptLoading: 'blocking'
    }))
    .addPlugin(new HtmlWebpackPlugin({
        chunks: 'all',
        filename: 'cpu-render.html',
        template: 'test/integration/cpu-render.ejs',
        scriptLoading: 'blocking'
    }));

const playgroundConfig = baseConfig.clone()
    .setTarget('browserslist')
    .merge({
        entry: {
            playground: path.join(__dirname, 'src/playground/playground.js'),
            queryPlayground: path.join(__dirname, 'src/playground/queryPlayground.js')
        },
        output: {
            path: path.resolve('playground')
        }
    })
    .addPlugin(new CopyWebpackPlugin([
        {
            context: 'src/playground',
            from: '*.+(html|css)'
        }
    ]));

const nodeConfig = baseConfig.clone()
    .setTarget('node')
    .merge({
        entry: {
            'scratch-render': path.join(__dirname, 'src/index.js')
        },
        output: {
            library: {
                name: 'ScratchRender',
                type: 'commonjs2'
            }
        },
        externals: {
            '!ify-loader!grapheme-breaker': 'grapheme-breaker',
            '!ify-loader!linebreak': 'linebreak',
            'hull.js': true,
            'scratch-svg-renderer': true,
            'twgl.js': true,
            'xml-escape': true
        }
    });

module.exports = [
    // Playground
    playgroundConfig.get(),

    // Web-compatible
    webConfig.get(),

    // Node-compatible
    nodeConfig.get()
];
