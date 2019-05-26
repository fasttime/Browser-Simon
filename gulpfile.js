'use strict';

const { dest, parallel, series, src, task } = require('gulp');

task
(
    'clean',
    async () =>
    {
        const del = require('del');

        await del(['dist', 'tmp-src']);
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
                parserOptions: { ecmaVersion: 9 },
                rules: { strict: ['error', 'function'] },
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

        await mkdir('tmp-src', { recursive: true });
        await promise('tmp-src/art.js', { css: { keyframes: true }, on: true });
    },
);

task
(
    'concat',
    () =>
    {
        const concat = require('gulp-concat');

        const stream =
        src(['tmp-src/art.js', 'src/main.js']).pipe(concat('simon.js')).pipe(dest('dist'));
        return stream;
    },
);

task
(
    'closure-compiler',
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

task
(
    'default',
    series(parallel('lint', 'clean'), 'make-art', 'concat', 'closure-compiler', 'jscrewit'),
);
