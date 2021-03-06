# gulp-split
A gulp plugin for extract view, scripts, styles, etc. files from template file

Installation
----------

Install via [npm](http://npmjs.org/)

    npm install gulp-split --save


Usage overview
----------

Import the module and call it into gulp task
  
    var htmlextract = require('gulp-split');
    
### Extract Content

Extract one or more block of content from a file to multiple files.

    htmlextract({quiet: false,relative: true});

Options
    
* **transform**: Optional.
* **read**: Optional.
* **quiet**: Optional.
* **relative**: Optional.

* **addRootSlash**: Optional.
* **keepTags**: Optional.
* **donotChange**: Optional.

* **name**: Optional.
* **transform**: Optional.
* **selfClosingTag**: Optional.
    
*Example*: Process all HTML files to saperate css and js from html

    var paths = {
        samples: [
            'samples/*/*.html',
            '!samples/results/*.html'
        ],
        results: './samples/results'
    };
    gulp.task('processAllSamples', function () {
        'use strict';
        gulp.src(paths.samples)
            .pipe(htmlextract({
                quiet: false,
                relative: true
            }))
            .pipe(gulp.dest(paths.results));
    });

  
# To Contribute

Please fork and send pull request, welcome!

# TODO List
* Add tests
* Changelog

# Author

Maintained by [Jahirul Islam Bhuiyan](http://www.online4help.com).