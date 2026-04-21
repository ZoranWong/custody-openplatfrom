import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd())

    return {
        plugins: [
            vue(),
            createSvgIconsPlugin({
                iconDirs: [resolve(__dirname, 'src/assets/svgs')],
                symbolId: 'icon-[name]',
                inject: 'body-last',
                customDomId: '__svg__icons__dom__',
            }),
            AutoImport({
                resolvers: [ElementPlusResolver()],
            }),
            Components({
                resolvers: [ElementPlusResolver()],
            }),
        ],
        resolve: {
            alias: {
                '@': resolve(__dirname, 'src'),
            },
        },
        base: env.VITE_BASE || '/openplatform/oauth/',
        build: {
            outDir: 'dist',
            assetsDir: 'assets',
            sourcemap: false,
        },
        server: {
            port: 1003,
            host: true,
            proxy: {
                '/dev-api': {
                    target: env.VITE_SERVE || 'http://api.vaulink.com',
                    changeOrigin: true,
                    secure: false,
                    timeout: 60000,
                    proxyTimeout: 60000,
                    ws: true,
                    headers: {
                        Connection: 'keep-alive'
                    },
                    configure: (proxy) => {
                        proxy.on('proxyRes', (proxyRes, req, res) => {
                            if (req.headers['accept'] === 'text/event-stream') {
                                proxyRes.headers['Accept'] = 'text/event-stream';
                                proxyRes.headers['X-Accel-Buffering'] = 'no';
                                proxyRes.headers['Cache-Control'] = 'no-cache';
                                res.writeHead(
                                    proxyRes.statusCode!,
                                    proxyRes.headers!
                                );
                                proxyRes.pipe(res);
                            }
                        });
                        proxy.on('error', () => {
                            // silent
                        });
                    },
                    rewrite: (path) => {
                        return path.replace(/^\/dev-api/, '/')
                    }
                },
            },
        },
    }
})
