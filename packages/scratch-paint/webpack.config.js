const path = require('path');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const ScratchWebpackConfigBuilder = require('scratch-webpack-configuration');

const baseConfig = new ScratchWebpackConfigBuilder({
    rootPath: __dirname,
    enableReact: true
})
    .setTarget('browserslist')
    .addModuleRule({
        test: /\.(svg|png)$/i,
        resourceQuery: /^$/,
        type: 'asset'
    });

const playgroundConfig = baseConfig.clone()
    .merge({
        entry: {
            playground: './src/playground/playground.jsx'
        },
        output: {
            path: path.resolve(__dirname, 'playground')
        },
        devServer: {
            host: '0.0.0.0'
        }
    })
    .enableDevServer(process.env.PORT || 8078)
    .addPlugin(new HtmlWebpackPlugin({
        template: 'src/playground/index.ejs',
        title: 'Scratch 3.0 Paint Editor Playground'
    }));

const libraryConfig = baseConfig.clone()
    .merge({
        entry: {
            'scratch-paint': './src/index.js'
        },
        output: {
            library: {
                name: 'scratch-paint',
                type: 'umd2'
            }
        }
    })
    .addExternals([
        '@scratch/scratch-svg-renderer',
        'minilog',
        'prop-types',
        'react',
        'react-dom',
        'react-intl',
        'react-intl-redux',
        'react-popover',
        'react-redux',
        'react-responsive',
        'react-style-proptype',
        'react-tooltip',
        'redux'
    ]);

module.exports = [
    playgroundConfig.get(),
    libraryConfig.get()
];
