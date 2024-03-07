const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');
const ScratchWebpackConfigBuilder = require('scratch-webpack-configuration');

const common = {
    libraryName: 'ScratchSVGRenderer',
    rootPath: path.resolve(__dirname)
};

/**
 * @type {import('webpack').Configuration}
 */
const nodeConfig = new ScratchWebpackConfigBuilder(common)
    .setTarget('node')
    .get();

/**
 * @type {import('webpack').Configuration}
 */
const webConfig = new ScratchWebpackConfigBuilder(common)
    .setTarget('browserslist')
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
