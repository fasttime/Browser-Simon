/* eslint-env node */

'use strict';

module.exports =
    function (grunt)
    {
        // Project configuration.
        grunt.initConfig(
            {
                'closure-compiler':
                {
                    default:
                    {
                        js: 'dist/simon.js',
                        jsOutputFile: 'dist/simon.min.js',
                        noreport: true,
                        options:
                        {
                            compilation_level: 'ADVANCED_OPTIMIZATIONS',
                            language_in: 'ECMASCRIPT6_STRICT'
                        }
                    }
                },
                concat:
                {
                    default:
                    {
                        dest: 'dist/simon.js',
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
        grunt.loadNpmTasks('grunt-contrib-concat');
        grunt.loadNpmTasks('grunt-fasttime-lint');
        
        grunt.registerTask(
            'jscrewit',
            'Encode with JScrewIt.',
            function ()
            {
                var JScrewIt = require('jscrewit');
                var input = grunt.file.read('dist/simon.min.js');
                var output = JScrewIt.encode(input, { features: 'COMPACT' });
                grunt.file.write('dist/simon.screwed.js', output);
                grunt.log.ok('Done.');
            }
        );
        
        // Default task.
        grunt.registerTask(
            'default',
            ['fasttime_lint', 'concat', 'closure-compiler', 'jscrewit']
        );
    };
