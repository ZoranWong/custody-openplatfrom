import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
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
    base: '/auth/',
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: false,
    },
    server: {
        port: 1002,
        host: true,
        proxy: {
            '/v1': {
                target: 'http://120.55.240.167:30000',
                changeOrigin: true,
                secure: false,
                timeout: 60000,
                proxyTimeout: 60000,
                rewrite: (path) => path.replace(/^\/v1/, '/custody'),
            },
        },
    },
})
