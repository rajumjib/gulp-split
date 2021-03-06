var path = require('path');
var arrify = require('arrify');

module.exports = exports = function getFilepath(sourceFile, targetFile, opt) {
    'use strict';
    opt = opt || {};

    var base = opt.relative ? path.dirname(addRootSlash(unixify(targetFile.path))) : addRootSlash(unixify(sourceFile.cwd));

    var filepath = processPath(sourceFile.path, base, opt);

    return filepath;
};

exports.extname = function (file) {
    'use strict';
    file = file.split('?')[0];
    return path.extname(file).slice(1);
};

function processPath(sourcePath, base, opt) {
    'use strict';
    var filepath = addRootSlash(unixify(sourcePath));
    opt = opt || {};

    if (opt.relative) {
        filepath = unixify(path.relative(base, filepath));
    }

    var ignorePath = arrify(opt.ignorePath);

    if (ignorePath.length) {
        filepath = removeBasePath(ignorePath, filepath);
    }


    if (opt.addRootSlash) {
        filepath = addRootSlash(filepath);
    } else if (!opt.addPrefix) {
        filepath = removeRootSlash(filepath);
    }

    if (opt.addPrefix) {
        filepath = addPrefix(filepath, opt.addPrefix);
    }

    if (opt.addSuffix) {
        filepath = addSuffix(filepath, opt.addSuffix);
    }

    return filepath;
}

exports.processPath = processPath;

function unixify(filepath) {
    'use strict';
    return filepath.replace(/\\/g, '/');
}

function addRootSlash(filepath) {
    'use strict';
    return filepath.replace(/^\/*([^\/])/, '/$1');
}

function removeRootSlash(filepath) {
    'use strict';
    return filepath.replace(/^\/+/, '');
}

function addPrefix(filepath, prefix) {
    'use strict';
    return prefix + addRootSlash(filepath);
}

function addSuffix(filepath, suffix) {
    'use strict';
    return filepath + suffix;
}

function removeBasePath(basedirs, filepath) {
    'use strict';
    return basedirs.map(unixify).reduce(function (path, remove) {
        if (path[0] === '/' && remove[0] !== '/') {
            remove = '/' + remove;
        }
        if (path[0] !== '/' && remove[0] === '/') {
            path = '/' + path;
        }
        if (remove && path.indexOf(remove) === 0) {
            return path.slice(remove.length);
        }
        return path;
    }, filepath);
}