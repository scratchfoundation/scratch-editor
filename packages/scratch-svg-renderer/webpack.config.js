const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');
const ScratchWebpackConfigBuilder = require('scratch-webpack-configuration');
const fs = require('fs');
const nodeExternals = require('webpack-node-externals');

// Helper to find monorepo root dynamically
const findMonorepoRoot = () => {
    let currentDir = __dirname;
    while (currentDir !== path.parse(currentDir).root) {
        if (fs.existsSync(path.join(currentDir, 'package.json'))) {
            try {
                const pkg = require(path.join(currentDir, 'package.json')); // eslint-disable-line global-require
                if (pkg.workspaces) {
                    return currentDir;
                }
            } catch (e) { // eslint-disable-line no-unused-vars
                // ignore
            }
        }
        currentDir = path.dirname(currentDir);
    }
    // Fallback to standard location if detection fails
    return path.resolve(__dirname, '../..');
};

const MONOREPO_ROOT = findMonorepoRoot();

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
        externals: [
            // Without this, a hoisted `isomorphic-dompurify` can fail to find its CSS.
            // TODO: consider moving this into `scratch-webpack-configuration`
            nodeExternals({
                modulesDir: path.resolve(MONOREPO_ROOT, 'node_modules')
            })
        ],
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
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: 'src/playground'
                }
            ]
        })
    )
    .get();

module.exports = [
    nodeConfig,
    webConfig,
    playgroundConfig
];
