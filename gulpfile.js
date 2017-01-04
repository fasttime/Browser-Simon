/* eslint-env node */

'use strict';

const gulp = require('gulp');

gulp.task(
    'clean',
    () =>
    {
        const del = require('del');
        
        const stream = del(['dist', 'tmp-src']);
        return stream;
    }
);

gulp.task(
    'lint',
    () =>
    {
        const lint = require('gulp-fasttime-lint');
        
        const options = { envs: ['browser'], parserOptions: { ecmaVersion: 6 } };
        const stream = gulp.src(['*.js', 'src/*.js']).pipe(lint(options));
        return stream;
    }
);

gulp.task(
    'make-art',
    callback =>
    {
        const fs = require('fs');
        const makeArt = require('art-js');
        
        fs.mkdir(
            'tmp-src',
            error =>
            {
                if (error && error.code !== 'EEXIST')
                    callback(error);
                else
                {
                    makeArt.async(
                        'tmp-src/art.js',
                        { css: { keyframes: true }, on: true },
                        callback
                    );
                }
            }
        );
    }
);

gulp.task(
    'concat',
    () =>
    {
        const concat = require('gulp-concat');
        const replace = require('gulp-replace');
        
        const stream =
            gulp
            .src(['tmp-src/art.js', 'src/main.js'])
            .pipe(replace(/^\/\*[^]*?\*\/\s*\n/, ''))
            .pipe(concat('simon.js'))
            .pipe(gulp.dest('dist'));
        return stream;
    }
);

gulp.task(
    'closure-compiler',
    () =>
    {
        const compiler = require('google-closure-compiler-js').gulp();
        
        const options =
        {
            compilationLevel: 'ADVANCED',
            jsOutputFile: 'simon.min.js',
            rewritePolyfills: false,
            warningLevel: 'QUIET'
        };
        const stream = gulp.src('dist/simon.js').pipe(compiler(options)).pipe(gulp.dest('dist'));
        return stream;
    }
);

gulp.task(
    'jscrewit',
    () =>
    {
        const JScrewIt = require('jscrewit');
        const fs = require('fs');
        
        const input = fs.readFileSync('dist/simon.min.js');
        const output = JScrewIt.encode(input, { features: 'COMPACT' });
        fs.writeFileSync('dist/simon.screwed.js', output);
    }
);

gulp.task(
    'default',
    callback =>
    {
        const runSequence = require('run-sequence');
        
        runSequence(
            ['lint', 'clean'],
            'make-art',
            'concat',
            'closure-compiler',
            'jscrewit',
            callback
        );
    }
);
