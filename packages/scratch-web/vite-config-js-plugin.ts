import { randomBytes } from 'node:crypto';
import {
    ViteDevServer,
    PreviewServer,
    loadEnv,
    Plugin,
    UserConfig,
} from 'vite';

/**
 * This creates a `/config.js` endpoint, serving environment config.
 * This is to allow single dist build to be deployed to different environments.
 *
 * See README.md for more information.
 */
export function configJSEndpoint(): Plugin {
    function injectMiddleware(server: ViteDevServer | PreviewServer) {
        const config = loadEnv(server.config.mode, '../..', 'SCRATCH_WEB_');

        server.middlewares.use('/config.js', (_req, res) => {
            res.writeHead(200, {
                'Content-Type': 'application/javascript',
            }).end(`window.__SCRATCH_CONFIG__ = ${JSON.stringify(config)}`);
        });
    }

    return {
        name: 'config-js',

        config(): Omit<UserConfig, 'plugins'> {
            return {
                // See https://vitejs.dev/config/shared-options.html#assetsinclude
                assetsInclude: ['/config.js'],

                build: {
                    rollupOptions: {
                        external: [/^\/config.js\?v=/],
                    },
                },
            };
        },

        configureServer(server: ViteDevServer) {
            injectMiddleware(server);
        },

        configurePreviewServer(server: PreviewServer) {
            injectMiddleware(server);
        },

        // See https://vitejs.dev/guide/api-plugin.html#transformindexhtml
        transformIndexHtml: {
            order: 'post',
            handler: () => [
                {
                    tag: 'script',
                    attrs: {
                        type: 'module',
                        src: `/config.js?v=${randomBytes(8).toString('hex')}`,
                    },
                    injectTo: 'head-prepend',
                },
            ],
        },
    };
}
