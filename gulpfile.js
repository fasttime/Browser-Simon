'use strict';

const { dest, parallel, series, src, task } = require('gulp');

task
(
    'clean',
    async () =>
    {
        const { promises: { rmdir } } = require('fs');

        const paths = ['.tmp-src', 'dist'];
        const rmdirOpts = { recursive: true };
        await Promise.all(paths.map(path => rmdir(path, rmdirOpts)));
    },
);

task
(
    'lint',
    () =>
    {
        const lint = require('gulp-fasttime-lint');

        const stream =
        lint
        (
            {
                src: '*.js',
                envs: 'node',
                parserOptions: { ecmaVersion: 9 },
            },
            {
                src: 'src/*.js',
                envs: 'browser',
                parserOptions: { ecmaVersion: 9, sourceType: 'module' },
            },
        );
        return stream;
    },
);

task
(
    'make-art',
    async () =>
    {
        const { promise }               = require('art-js');
        const { promises: { mkdir } }   = require('fs');

        await mkdir('.tmp-src', { recursive: true });
        await promise('.tmp-src/art.js', { css: { keyframes: true }, on: true });
    },
);

task
(
    'bundle',
    async () =>
    {
        const { rollup } = require('rollup');

        const inputOpts = { input: 'src/main.js' };
        const bundle = await rollup(inputOpts);
        const outputOpts = { file: 'dist/simon.js', format: 'iife' };
        await bundle.write(outputOpts);
    },
);

task
(
    'minify',
    () =>
    {
        const compiler = require('google-closure-compiler');

        const compilerOpts =
        {
            compilationLevel: 'ADVANCED',
            jsOutputFile: 'simon.min.js',
            rewritePolyfills: false,
            warningLevel: 'QUIET',
        };
        const stream = src('dist/simon.js').pipe(compiler.gulp()(compilerOpts)).pipe(dest('dist'));
        return stream;
    },
);

task
(
    'jscrewit',
    async () =>
    {
        const { encode }                            = require('jscrewit');
        const { promises: { readFile, writeFile } } = require('fs');

        const data = await readFile('dist/simon.min.js');
        const output = encode(data, { features: 'COMPACT' });
        await writeFile('dist/simon.screwed.js', output);
    },
);

task('default', series(parallel('lint', 'clean'), 'make-art', 'bundle', 'minify', 'jscrewit'));
