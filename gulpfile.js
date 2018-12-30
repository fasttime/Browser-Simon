'use strict';

const { dest, parallel, series, src, task } = require('gulp');

task
(
    'clean',
    () =>
    {
        const del = require('del');

        const stream = del(['dist', 'tmp-src']);
        return stream;
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
                parserOptions: { ecmaVersion: 8 },
            },
            {
                src: 'src/*.js',
                envs: 'browser',
                parserOptions: { ecmaVersion: 8 },
                rules: { strict: ['error', 'function'] },
            },
        );
        return stream;
    },
);

task
(
    'make-art',
    callback =>
    {
        const fs = require('fs');
        const makeArt = require('art-js');

        fs.mkdir
        (
            'tmp-src',
            error =>
            {
                if (error && error.code !== 'EEXIST')
                    callback(error);
                else
                {
                    makeArt.async
                    ('tmp-src/art.js', { css: { keyframes: true }, on: true }, callback);
                }
            },
        );
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
        const compiler = require('google-closure-compiler').gulp();

        const stream =
        src('dist/simon.js')
        .pipe
        (
            compiler
            (
                {
                    compilationLevel: 'ADVANCED',
                    jsOutputFile: 'simon.min.js',
                    rewritePolyfills: false,
                    warningLevel: 'QUIET',
                },
            ),
        )
        .pipe(dest('dist'));
        return stream;
    },
);

task
(
    'jscrewit',
    callback =>
    {
        const JScrewIt = require('jscrewit');
        const fs = require('fs');

        fs.readFile
        (
            'dist/simon.min.js',
            (error, data) =>
            {
                if (error)
                    callback(error);
                else
                {
                    const output = JScrewIt.encode(data, { features: 'COMPACT' });
                    fs.writeFile('dist/simon.screwed.js', output, callback);
                }
            },
        );
    },
);

task
(
    'default',
    series(parallel('lint', 'clean'), 'make-art', 'concat', 'closure-compiler', 'jscrewit'),
);
