module.exports = function(grunt) {
  "use strict";

  // load all grunt tasks in package.json with load-grunt-tasks task :)
  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    compass: {
      dist: {
        options: {
          config: 'src/lechef-scss/config.rb',
          sassDir: 'src/lechef-scss/sass',
          cssDir: 'build/',
          outputStyle: 'compressed'
        }
      }
    },
    uglify: {
      dist: {
        options: {
          mangle: false,
          compress: false
        },
        files: {
          "build/lechef.min.js": ["src/js/circuits.js",
            "src/js/circuit-editor.js",
            "src/js/circuit-exercise.js"]
        }
      }
    },
    concat: {
      dist: {
        src: ["src/js/circuits.js",
          "src/js/circuit-editor.js",
          "src/js/circuit-exercise.js"],
        dest: 'build/lechef.js'
      }
    },
    copy: {
      css: {
        src: ["src/css/circuits.css"],
        dest: 'build/lechef.css'
      }
    },
    watch: {
      lechef: {
        files: ['src/**/*'],
        tasks: ['default']
      }
    }
  });


  grunt.registerTask("default", ["compass", "concat", "uglify"]);
};