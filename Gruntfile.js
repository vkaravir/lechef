module.exports = function(grunt) {
  "use strict";

  // load all grunt tasks in package.json with load-grunt-tasks task :)
  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    uglify: {
      dist: {
        options: {
          mangle: false,
          compress: false
        },
        files: {
          "build/logic-circuit.min.js": ["src/js/circuits.js",
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
        dest: 'build/logic-circuit.js'
      }
    }
  });


  grunt.registerTask("default", ["concat", "uglify"]);
};