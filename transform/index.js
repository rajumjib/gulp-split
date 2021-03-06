'use strict';
var filepath = require('../file-path');

/**
 * Constants
 */
var TARGET_TYPES = ['html', 'jade', 'pug', 'slm', 'slim', 'jsx', 'haml', 'less', 'sass', 'scss'];
var IMAGES = ['jpeg', 'jpg', 'png', 'gif'];
var DEFAULT_TARGET = TARGET_TYPES[0];

/**
 * Transform module
 */
var transform = module.exports = exports = function (filePath, sourceFile, targetFile) {
  var type;
  if (targetFile && targetFile.path) {
    var ext = filepath.extname(targetFile.path);
    type = typeFromExt(ext);
  }
  if (!isTargetType(type)) {
    type = DEFAULT_TARGET;
  }
  var func = transform[type];
  if (func) {
    return func.apply(transform, arguments);
  }
};

/**
 * Options
 */

transform.selfClosingTag = false;

/**
 * Transform functions
 */
TARGET_TYPES.forEach(function (targetType) {
  transform[targetType] = function (filePath) {
    var ext = filepath.extname(filePath);
    var type = typeFromExt(ext);
    var func = transform[targetType][type];
    if (func) {
      return func.apply(transform[targetType], arguments);
    }
  };
});

transform.html.css = function (filePath) {
  return '<link rel="stylesheet" href="' + filePath + '"' + end();
};

transform.html.js = function (filePath) {
  return '<script src="' + filePath + '"></script>';
};
transform.html.map = transform.html.js;

transform.html.jsx = function (filePath) {
  return '<script type="text/jsx" src="' + filePath + '"></script>';
};

transform.html.html = function (filePath) {
  return '<link rel="import" href="' + filePath + '"' + end();
};

transform.html.coffee = function (filePath) {
  return '<script type="text/coffeescript" src="' + filePath + '"></script>';
};

transform.html.image = function (filePath) {
  return '<img src="' + filePath + '"' + end();
};

transform.jade.css = function (filePath) {
  return 'link(rel="stylesheet", href="' + filePath + '")';
};

transform.jade.js = function (filePath) {
  return 'script(src="' + filePath + '")';
};

transform.jade.jsx = function (filePath) {
  return 'script(type="text/jsx", src="' + filePath + '")';
};

transform.jade.jade = function (filePath) {
  return 'include ' + filePath;
};

transform.jade.html = function (filePath) {
  return 'link(rel="import", href="' + filePath + '")';
};

transform.jade.coffee = function (filePath) {
  return 'script(type="text/coffeescript", src="' + filePath + '")';
};

transform.jade.image = function (filePath) {
  return 'img(src="' + filePath + '")';
};

transform.pug.css = function (filePath) {
  return 'link(rel="stylesheet", href="' + filePath + '")';
};

transform.pug.js = function (filePath) {
  return 'script(src="' + filePath + '")';
};

transform.pug.jsx = function (filePath) {
  return 'script(type="text/jsx", src="' + filePath + '")';
};

transform.pug.pug = function (filePath) {
  return 'include ' + filePath;
};

transform.pug.html = function (filePath) {
  return 'link(rel="import", href="' + filePath + '")';
};

transform.pug.coffee = function (filePath) {
  return 'script(type="text/coffeescript", src="' + filePath + '")';
};

transform.pug.image = function (filePath) {
  return 'img(src="' + filePath + '")';
};

transform.slm.css = function (filePath) {
  return 'link rel="stylesheet" href="' + filePath + '"';
};

transform.slm.js = function (filePath) {
  return 'script src="' + filePath + '"';
};

transform.slm.html = function (filePath) {
  return 'link rel="import" href="' + filePath + '"';
};

transform.slm.coffee = function (filePath) {
  return 'script type="text/coffeescript" src="' + filePath + '"';
};

transform.slm.image = function (filePath) {
  return 'img src="' + filePath + '"';
};

transform.slim.css = transform.slm.css;

transform.slim.js = transform.slm.js;

transform.slim.html = transform.slm.html;

transform.slim.coffee = transform.slm.coffee;

transform.slim.image = transform.slm.image;

transform.haml.css = function (filePath) {
  return '%link{rel:"stylesheet", href:"' + filePath + '"}';
};

transform.haml.js = function (filePath) {
  return '%script{src:"' + filePath + '"}';
};

transform.haml.html = function (filePath) {
  return '%link{rel:"import", href:"' + filePath + '"}';
};

transform.haml.coffee = function (filePath) {
  return '%script{type:"text/coffeescript", src:"' + filePath + '"}';
};

transform.haml.image = function (filePath) {
  return '%img{src:"' + filePath + '"}';
};

transform.less.less = function (filePath) {
  return '@import "' + filePath + '";';
};

transform.less.css = transform.less.less;

transform.sass.sass = function (filePath) {
  return '@import "' + filePath + '"';
};

transform.sass.scss = transform.sass.sass;
transform.sass.css = transform.sass.sass;

transform.scss.sass = transform.less.less;
transform.scss.scss = transform.scss.sass;
transform.scss.css = transform.scss.sass;

/**
 * Transformations for jsx is like html
 * but always with self closing tags, invalid jsx otherwise
 */
Object.keys(transform.html).forEach(function (type) {
  transform.jsx[type] = function () {
    var originalOption = transform.selfClosingTag;
    transform.selfClosingTag = true;
    var result = transform.html[type].apply(transform.html, arguments);
    transform.selfClosingTag = originalOption;
    return result;
  };
});

function end() {
  return transform.selfClosingTag ? ' />' : '>';
}

function typeFromExt(ext) {
  ext = ext.toLowerCase();
  if (isImage(ext)) {
    return 'image';
  }
  return ext;
}

function isImage(ext) {
  return IMAGES.indexOf(ext) > -1;
}

function isTargetType(type) {
  if (!type) {
    return false;
  }
  return TARGET_TYPES.indexOf(type) > -1;
}