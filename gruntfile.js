/* eslint-env node */

'use strict';

module.exports =
    function (grunt)
    {
        // Project configuration.
        grunt.initConfig(
            {
                concat:
                {
                    default:
                    {
                        src: ['node_modules/art-js/lib/art.js', 'src/main.js'],
                        dest: 'dist/simon.js'
                    },
                    options: { stripBanners: true }
                },
                fasttime_lint:
                {
                    src:
                    {
                        options: { envs: ['browser', 'es6'] },
                        src: 'src/**/*.js'
                    },
                    other: { src: ['*.js'] }
                },
                uglify:
                {
                    default: { files: { 'dist/simon.min.js': 'dist/simon.js' } },
                    options:
                    {
                        compress:
                        {
                            collapse_vars: true,
                            global_defs: { _ART_css: true, _ART_on: true },
                            hoist_vars: true
                        }
                    }
                }
            }
        );
        
        // These plugins provide necessary tasks.
        grunt.loadNpmTasks('grunt-contrib-concat');
        grunt.loadNpmTasks('grunt-contrib-uglify');
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
        grunt.registerTask('default', ['fasttime_lint', 'concat', 'uglify', 'jscrewit']);
    };
