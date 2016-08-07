/* eslint-env node */

'use strict';

var SIMON_JS            = 'dist/simon.js';
var SIMON_MIN_JS        = 'dist/simon.min.js';
var SIMON_SCREWED_JS    = 'dist/simon.screwed.js';

module.exports =
    function (grunt)
    {
        // Project configuration.
        grunt.initConfig(
            {
                clean: { default: 'dist' },
                'closure-compiler':
                {
                    default:
                    {
                        js: SIMON_JS,
                        jsOutputFile: SIMON_MIN_JS,
                        noreport: true,
                        options: { compilation_level: 'ADVANCED_OPTIMIZATIONS' }
                    }
                },
                concat:
                {
                    default:
                    {
                        dest: SIMON_JS,
                        options: { stripBanners: true },
                        src:
                        [
                            'node_modules/art-js/lib/art.js',
                            'node_modules/art-js/lib/art.css.js',
                            'node_modules/art-js/lib/art.on.js',
                            'src/main.js'
                        ]
                    }
                },
                fasttime_lint:
                {
                    other: { src: ['*.js'] },
                    src: { options: { envs: ['browser', 'es6'] }, src: 'src/**/*.js' }
                }
            }
        );
        
        // These plugins provide necessary tasks.
        grunt.loadNpmTasks('grunt-closure-compiler');
        grunt.loadNpmTasks('grunt-contrib-clean');
        grunt.loadNpmTasks('grunt-contrib-concat');
        grunt.loadNpmTasks('grunt-fasttime-lint');
        
        grunt.registerTask(
            'jscrewit',
            'Encode with JScrewIt.',
            function ()
            {
                var JScrewIt = require('jscrewit');
                var input = grunt.file.read(SIMON_MIN_JS);
                var output = JScrewIt.encode(input, { features: 'COMPACT' });
                grunt.file.write(SIMON_SCREWED_JS, output);
                grunt.log.ok('Done.');
            }
        );
        
        // Default task.
        grunt.registerTask(
            'default',
            ['fasttime_lint', 'clean', 'concat', 'closure-compiler', 'jscrewit']
        );
    };
