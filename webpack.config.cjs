const path = require('path');
const {DefinePlugin} = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

// The editor is built from local forks of scratch-gui and scratch-vm that live next to this
// repository. Their dependencies still come from this repository's node_modules, including
// any versions npm had to install nested under node_modules/scratch-gui or scratch-vm.
const NODE_MODULES = path.resolve(__dirname, 'node_modules');
const SCRATCH_GUI = path.resolve(process.env.SCRATCH_GUI || path.join(__dirname, '../scratch-gui'));
const SCRATCH_VM = path.resolve(process.env.SCRATCH_VM || path.join(__dirname, '../scratch-vm'));

// scratch-vm ships its own webpack loader that calls require('webpack/...') from inside the fork
process.env.NODE_PATH = [NODE_MODULES, process.env.NODE_PATH].filter(Boolean).join(path.delimiter);
require('module').Module._initPaths();

const forkResolveRule =(forkPath, packageName) => ({
    include: forkPath,
    resolve: {
        modules: [path.join(NODE_MODULES, packageName, 'node_modules'), NODE_MODULES]
    }
});

const base = {
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    devtool: process.env.NODE_ENV === 'production' ? false : 'cheap-source-map',
    target: 'web',
    resolve: {
        alias: {
            'scratch-gui$': path.join(SCRATCH_GUI, 'src/index.js'),
            'scratch-gui': SCRATCH_GUI,
            'scratch-vm': SCRATCH_VM,
            'scratch-render-fonts$': path.join(SCRATCH_GUI, 'src/lib/tw-scratch-render-fonts')
        }
    },
    resolveLoader: {
        modules: ['node_modules', NODE_MODULES],
        alias: {
            // scratch-vm loads its extension worker with an inline worker-loader that needs v1
            'worker-loader': path.join(NODE_MODULES, 'scratch-vm/node_modules/worker-loader')
        }
    },
    module: {
        rules: [
            forkResolveRule(SCRATCH_GUI, 'scratch-gui'),
            forkResolveRule(SCRATCH_VM, 'scratch-vm'),
            {
                test: /\.jsx?$/,
                loader: 'babel-loader',
                options: {
                    presets: ['@babel/preset-env', '@babel/preset-react']
                }
            },
            {
                test: /\.(svg|png|wav|gif|jpg|mp3|woff2|hex)$/,
                loader: 'file-loader',
                options: {
                    outputPath: 'static/assets/',
                    esModule: false
                }
            },
            {
                test: /\.css$/,
                use: [
                    {
                        loader: 'style-loader'
                    },
                    {
                        loader: 'css-loader',
                        options: {
                            modules: true,
                            importLoaders: 1,
                            localIdentName: '[name]_[local]_[hash:base64:5]',
                            camelCase: true
                        }
                    },
                    {
                        loader: 'postcss-loader',
                        options: {
                            postcssOptions: {
                                plugins: [
                                    'postcss-import',
                                    'postcss-simple-vars',
                                    'autoprefixer'
                                ]
                            }
                        }
                    }
                ]
            }
        ]
    }
}

module.exports = [
    {
        ...base,
        output: {
            path: path.resolve(__dirname, 'dist-renderer-webpack/editor/gui'),
            filename: 'index.js'
        },
        entry: './src-renderer-webpack/editor/gui/index.jsx',
        plugins: [
            new DefinePlugin({
                'process.env.ROOT': '""'
            }),
            new CopyWebpackPlugin({
                patterns: [
                    {
                        from: 'node_modules/scratch-blocks/media',
                        to: 'static/blocks-media/default'
                    },
                    {
                        from: 'node_modules/scratch-blocks/media',
                        to: 'static/blocks-media/high-contrast'
                    },
                    {
                        from: path.join(SCRATCH_GUI, 'src/lib/themes/blocks/high-contrast-media/blocks-media'),
                        to: 'static/blocks-media/high-contrast',
                        force: true
                    },
                    {
                        context: 'src-renderer-webpack/editor/gui/',
                        from: '*.html'
                    }
                ]
            })
        ]
    },

    {
        ...base,
        output: {
            path: path.resolve(__dirname, 'dist-renderer-webpack/editor/addons'),
            filename: 'index.js'
        },
        entry: './src-renderer-webpack/editor/addons/index.jsx',
        plugins: [
            new CopyWebpackPlugin({
                patterns: [
                    {
                        context: 'src-renderer-webpack/editor/addons/',
                        from: '*.html'
                    }
                ]
            })
        ]
    }
];
