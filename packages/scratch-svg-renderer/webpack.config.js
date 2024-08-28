const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');
const ScratchWebpackConfigBuilder = require('scratch-webpack-configuration');

const common = {
    libraryName: 'scratch-svg-renderer',
    rootPath: path.resolve(__dirname)
};

/**
 * @type {import('webpack').Configuration}
 */
const nodeConfig = new ScratchWebpackConfigBuilder(common)
    .setTarget('node')
    .merge({
        output: {
            library: {
                name: 'ScratchSVGRenderer',
                type: 'umd'
            }
        }
    })
    .get();

/**
 * @type {import('webpack').Configuration}
 */
const webConfig = new ScratchWebpackConfigBuilder(common)
    .setTarget('browserslist')
    .merge({
        output: {
            library: {
                name: 'ScratchSVGRenderer',
                type: 'umd'
            }
        }
    })
    .get();

/**
 * @type {import('webpack').Configuration}
 */
const playgroundConfig = new ScratchWebpackConfigBuilder(common)
    .setTarget('browserslist')
    .merge({
        devServer: {
            contentBase: false,
            port: process.env.PORT || 8576
        },
        output: {
            path: path.resolve(__dirname, 'playground'),
            library: {
                name: 'ScratchSVGRenderer',
                type: 'umd'
            },
            publicPath: '/'
        }
    })
    .addPlugin(
        new CopyWebpackPlugin([
            {
                from: 'src/playground'
            }
        ])
    )
    .get();

module.exports = [
    nodeConfig,
    webConfig,
    playgroundConfig
];
