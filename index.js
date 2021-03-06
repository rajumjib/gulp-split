var path = require('path');
var fs = require('fs');

var through2 = require('through2');
var gutil = require('gulp-util');
var streamToArray = require('stream-to-array');
var escapeStringRegexp = require('escape-string-regexp');
var groupArray = require('group-array');

var transform = require('./transform');
var tags = require('./tags');
var filepath = require('./file-path');

var noop = function noop() {};

var PluginError = gutil.PluginError;
var magenta = gutil.colors.magenta;
var cyan = gutil.colors.cyan;
var File = gutil.File;
var logger = noop;
/**
 * Constants
 */
var PLUGIN_NAME = 'gulp-split';
var DEFAULT_NAME_FOR_TAGS = 'extract';
var LEADING_WHITESPACE_REGEXP = /^\s*/;
var ENDING_WHITESPACE_REGEXP = /[ \t]*$/;
var files = [];

module.exports = exports = function (opt) {
    'use strict';
    if (!opt) {
        opt = {};
    }

    if (opt.transform && typeof opt.transform !== 'function') {
        throw error('transform option must be a function');
    }

    if (typeof opt.read !== 'undefined') {
        throw error('There is no `read` option. Did you mean to provide it for `gulp.src` perhaps?');
    }

    // Defaults:
    opt.quiet = bool(opt, 'quiet', false);
    opt.relative = bool(opt, 'relative', false);
    opt.addRootSlash = bool(opt, 'addRootSlash', !opt.relative);
    opt.keepTags = bool(opt, 'keepTags', false);
    opt.donotChange = bool(opt, 'donotChange', false);

    opt.name = defaults(opt, 'name', DEFAULT_NAME_FOR_TAGS);
    opt.transform = defaults(opt, 'transform', transform);
    opt.tags = tags();
    transform.selfClosingTag = bool(opt, 'selfClosingTag', false);
    logger = opt.quiet ? noop : showLog;

    return handleVinylStream(opt);
};

function defaults(options, prop, defaultValue) {
    'use strict';
    return options[prop] || defaultValue;
}

function bool(options, prop, defaultVal) {
    'use strict';
    return typeof options[prop] === 'undefined' ? defaultVal : Boolean(options[prop]);
}

/**
 * Handle injection when files to
 * inject comes from a Vinyl File Stream
 *
 * @param {Object} opt
 * @returns {Stream}
 */
function handleVinylStream(opt) {
    'use strict';

    return through2.obj(function (file, enc, done) {
        if (file.isNull()) {
            done(null, file); //empty file
            return;
        }
        if (file.isStream()) {
            return done(error('Streams not supported'));
        }

        extractContent(file, opt);

        var self = this;
        files.forEach(function (newFile) {
            //logger(file, newFile);
            self.push(newFile);
        });
        //files = [];

        done();
    });
}

function extractContent(file, opt) {
    'use strict';
    var content = String(file.contents);
    var targetExt = filepath.extname(file.path);
    var startTag = getTagRegExp(opt.tags.start(targetExt, opt.starttag), opt);
    var endTag = getTagRegExp(opt.tags.end(targetExt, opt.endtag), opt);
    //var tagKey = String(startTag) + String(endTag);

    //logger(file,targetExt);
    //logger(file, startTag);
    //logger(file, endTag);

    var matches = [];
    var extractedFilesCount = 0;
    opt.willExtract = function (filesToExtract) {
        extractedFilesCount += 1;
    };
    opt.onMatch = function (match) {
        matches.push(match[0]);
    };
    opt.shouldAbort = function (match) {
        return false;
        //return matches.indexOf(match[0]) !== -1;
    };

    var changedContent = content;
    /**
     * The content consists of:
     *
     * <everything before startMatch>
     * <startMatch>
     * <previousInnerContent>
     * <endMatch>
     * <everything after endMatch>
     */
    var startMatch;
    var endMatch;

    while ((startMatch = startTag.exec(changedContent)) !== null) {
        //log(startMatch);
        //logger(file, startMatch);
        //logger(file, changedContent);
        if (typeof opt.onMatch === 'function') {
            opt.onMatch(startMatch);
        }
        if (typeof opt.shouldAbort === 'function' && opt.shouldAbort(startMatch)) {
            continue;
        }
        // Take care of content length change:
        endTag.lastIndex = startTag.lastIndex;
        endMatch = endTag.exec(changedContent);
        if (!endMatch) {
            throw error('Missing end tag for start tag: ' + startMatch[0]);
        }

        var toInject = [];

        // <everything before startMatch>:
        var newContents = changedContent.slice(0, startMatch.index);
        //logger(file,newContents);

        if (!opt.keepTags) {
            // Take care of content length change:
            startTag.lastIndex -= startMatch[0].length;
        } else {
            // <startMatch> + <endMatch>
            toInject.unshift(startMatch[0]);
            toInject.push(endMatch[0]);
        }
        var innerContent = changedContent.substring(startTag.lastIndex, endMatch.index);
        var indent = getLeadingWhitespace(innerContent);
        //logger(file,innerContent);

        if (typeof opt.willExtract === 'function') {
            opt.willExtract(innerContent);
        }

        //writeToFile(startMatch, innerContent, opt, file);
        var newFile = prepareFile(startMatch, innerContent, opt, file);
        var exists = false;
        var ckeckPath = String(newFile.path);
        //log(ckeckPath);
        for (var i = 0; i < files.length; i++) {
            var existsFile = files[i];
            var existsPath = String(existsFile.path);
            //log(existsPath);
            //log(ckeckPath);
            if (existsPath.trim() == ckeckPath.trim()) {
                //logger(newFile, newFile.contents);
                files[i] = newFile;
                exists = true;
                break;
            }
        }
        if (!exists) {
            //log(ckeckPath);
            files.push(newFile);
            //log(files.length);
        }

        var fileOperation = startMatch[9] || 'replace';
        var injectTag = startMatch[11] || 'Yes';
        var newTag = '';
        switch (fileOperation) {
        case 'replace':
            if (injectTag != 'No') {
                newTag = getTagToInject(newFile, file, opt);
                //logger(file, newTag);
            }
            break;
        case 'append':
        default:
            break;
        }

        if (opt.keepTags) {
            //logger(file,toInject);
            // <new inner content>:
            if (newTag) {
                toInject.splice(1, 0, newTag);
            }
            newContents += toInject.join(indent);
        } else {
            newContents += indent + newTag;
        }

        // <everything after endMatch>:
        newContents += changedContent.slice(endTag.lastIndex);
        // replace old content with new:
        //logger(file, newContents);
        changedContent = newContents;
    }

    if (!opt.donotChange) {
        //logger(file, changedContent);
        content = changedContent;
    }

    if (file.isBuffer()) {
        file.contents = new Buffer(content);
    }

    files.unshift(file);
    return;
}

function showLog(file, message) {
    'use strict';
    if (message) {
        log(cyan(message) + ' From ' + magenta(file.relative) + '.');
    } else {
        log('At ' + magenta(file.relative) + '.');
    }
};

function writeToFile(matched, txtContent, opt, file) {
    'use strict';
    var filePath = preparePath(matched, opt, file);

    fs.writeFile(filePath, txtContent, function (err) {
        if (err) {
            logger(file, err);
        }
    });
}

function preparePath(matched, opt, file) {
    'use strict';
    var dirName = matched[7] ? matched[7] + '/' : '';
    //var folderName = path.basename(dirName);
    var fileName = matched[3] || 'script';
    var fileExt = matched[5] || '.js';

    var base = ''; //opt.relative ? './' : '';
    var filePath = base + dirName + fileName + fileExt;

    //var filePath = filepath.processPath(newPath, base, opt);
    //logger(file, filePath);
    return filePath;
}

function prepareFile(matched, txtContent, opt, file) {
    'use strict';
    var filePath = preparePath(matched, opt, file);
    var newPath = path.join(file.base, filePath);
    var targetExt = filepath.extname(newPath);
    filePath = String(newPath);
    txtContent = removeLine(txtContent, targetExt, opt);

    var fileOperation = matched[9] || 'replace';
    var injectLocation = matched[11];
    var tagLocation = matched[13];

    var newFile;
    var alreadyRead = false;

    if (files.length) {
        //log(filePath);
        var filterFiles = files.filter(function (checkFile) {
            var ckeckPath = String(checkFile.path);
            //log('-' + ckeckPath + '-');
            if (filePath.trim() == ckeckPath.trim()) {
                return true;
            }
            return false;
        });
        if (filterFiles.length) {
            newFile = filterFiles[filterFiles.length - 1];
            alreadyRead = true;
        }
        //log(filterFiles.length + ',' + files.length);
    }

    if (!alreadyRead) {
        /*
        newFile = file.clone({
            contents: false
        });
        */
        newFile = new File();
        newFile.contents = new Buffer('');
        newFile.path = newPath
    }

    switch (fileOperation) {
    case 'append':
        var newContent = injectContent(newFile, txtContent, opt, injectLocation, tagLocation, filePath);
        //log(newContent);
        newFile.contents = new Buffer(newContent);
        break;
    case 'replace':
    default:
        newFile.contents = new Buffer(txtContent);
        break;
    }
    return newFile;
}

function removeLine(content, targetExt, opt) {
    'use strict';
    var beginlines = opt.tags.beginLine(targetExt, opt.beginLines);
    var endlines = opt.tags.endLine(targetExt, opt.endLines);
    return removeLines(content, beginlines, endlines);
}

function removeLines(content, beginlines, endlines) {
    'use strict';
    //log(beginlines);
    //log(endlines);
    var lines = String(content).split("\n");
    //log(lines);
    if (lines.length) {
        if (beginlines && lines.length > beginlines)
            lines.splice(0, beginlines);
        //log(lines);
        if (endlines && lines.length > endlines) {
            endlines++;
            lines.splice(-1 * endlines, endlines);
        }
        //log(lines);
        content = lines.join('\n');
    }

    return content;
}

/**
 * Get new content for template
 * with all injections made
 *
 * @param {Object} file
 * @param {Array} collection
 * @param {Object} opt
 * @returns {Buffer}
 */
function injectContent(file, txtContent, opt, injectLocation, tagLocation, appendPath) {
    'use strict';
    var targetExt = filepath.extname(file.path);
    //logger(file, targetExt);
    var matchTag = getTagRegExp(opt.tags.append(targetExt, opt.appendtag), opt, injectLocation);
    //logger(file, matchTag);

    var matches = [];
    var injectedContentsCount = 0;

    opt.willInject = function (contentToInject) {
        injectedContentsCount += 1;
    };
    opt.onMatch = function (match) {
        matches.push(match[0]);
    };
    opt.shouldAbort = function (match) {
        //return matches.indexOf(match[0]) !== -1;
        return false;
    };

    var content = String(file.contents);
    //log(content);
    var alreadyRead = content.trim() != '';

    /*
    if (files.length) {
        var filterFiles = files.filter(function (checkFile) {
            var ckeckPath = String(checkFile.path);
            if (appendPath == ckeckPath) {
                return true;
            }
            return false;
        });
        if (filterFiles.length) {
            file = filterFiles[filterFiles.length - 1];
            alreadyRead = true;
        }
        logger(file, filterFiles.length)
    }
    */

    if (!alreadyRead) {
        //logger(file, 'read from file');
        content = readFromFile(appendPath, opt);
        file.contents = new Buffer(content);
    }

    if (tagLocation) {

        content = remove(file, injectLocation, tagLocation, opt);
        file.contents = new Buffer(content);

        var beginTag = matchString(file, opt, injectLocation, tagLocation);
        var endTag = matchString(file, opt);
        var indent = getLeadingWhitespace(txtContent);
        txtContent = beginTag + '\n' + txtContent + '\n' + indent + endTag;
    }

    content = inject(file, txtContent, matchTag, injectLocation, opt);
    //logger(file, content);
    return content;
}

function readFromFile(filePath, opt) {
    'use strict';
    //log(filePath);
    if (fs.existsSync(filePath)) {
        var content = fs.readFileSync(filePath, {
            encoding: 'utf8'
        });;
        /*
        fs.readFile(filePath, 'utf8', function (err, data) {
            if (err) {
                return log(err);
            }
            content = data;
        });
        */

        return content;
    }
    return '';
}

/**
 * Inject tags into content for given
 * start and end tags
 *
 * @param {String} content
 * @param {Object} opt
 * @returns {String}
 */
function inject(file, appendContent, matchTag, injectLocation, opt) {
    'use strict';
    var startMatch;
    var content = String(file.contents);

    if (content == '') {
        return appendContent + '\n' + matchString(file, opt, injectLocation);
    }

    /**
     * The content consists of:
     *
     * <everything before startMatch>
     * <startMatch>
     * <everything after startMatch>
     */
    startMatch = matchTag.exec(content);
    if (startMatch !== null) {
        if (typeof opt.onMatch === 'function') {
            opt.onMatch(startMatch);
        }
        if (typeof opt.shouldAbort === 'function' && opt.shouldAbort(startMatch)) {
            return content;
        }
        if (typeof opt.willInject === 'function') {
            opt.willInject(appendContent);
        }

        //var toInject = [];

        matchTag.lastIndex -= startMatch[0].length;
        //logger(file, matchTag.lastIndex);
        //toInject.unshift('');

        // <everything before startMatch>:
        var newContents = content.slice(0, startMatch.index);
        var restContent = content.substring(matchTag.lastIndex);
        var indent = '\n' + getEndingWhitespace(newContents);

        // <everything after endMatch>:
        newContents += appendContent.trim();
        //newContents += toInject.join(indent);

        // replace old content with new:
        content = newContents + indent + restContent;
    }

    return content;
}

function remove(file, injectLocation, tagLocation, opt) {
    'use strict';
    var content = String(file.contents);
    var targetExt = filepath.extname(file.path);
    var addedTag = getTagRegExp(opt.tags.added(targetExt, opt.addedtag), opt, injectLocation, tagLocation);
    var endTag = getTagRegExp(opt.tags.end(targetExt, opt.endtag), opt);

    //logger(file,targetExt);
    //logger(file, addedTag);
    //logger(file, endTag);

    var matches = [];
    opt.willRemove = function (filesToRemove) {

    };
    opt.onMatch = function (match) {
        matches.push(match[0]);
    };
    opt.shouldAbort = function (match) {
        return false;
        //return matches.indexOf(match[0]) !== -1;
    };

    var changedContent = content;
    /**
     * The content consists of:
     *
     * <everything before startMatch>
     * <startMatch>
     * <previousInnerContent>
     * <endMatch>
     * <everything after endMatch>
     */
    var startMatch;
    var endMatch;

    while ((startMatch = addedTag.exec(changedContent)) !== null) {
        //log(startMatch);
        //logger(file, startMatch);
        //logger(file, changedContent);
        if (typeof opt.onMatch === 'function') {
            opt.onMatch(startMatch);
        }
        if (typeof opt.shouldAbort === 'function' && opt.shouldAbort(startMatch)) {
            continue;
        }
        // Take care of content length change:
        endTag.lastIndex = addedTag.lastIndex;
        endMatch = endTag.exec(changedContent);
        if (!endMatch) {
            throw error('Missing end tag for start tag: ' + startMatch[0]);
        }

        // <everything before startMatch>:
        var newContents = changedContent.slice(0, startMatch.index);
        //logger(file,newContents);

        //addedTag.lastIndex -= startMatch[0].length;

        var innerContent = changedContent.substring(addedTag.lastIndex, endMatch.index);
        //var indent = getLeadingWhitespace(innerContent);
        //logger(file, innerContent);

        if (typeof opt.willRemove === 'function') {
            opt.willRemove(innerContent);
        }

        // <everything after endMatch>:
        newContents += changedContent.slice(endTag.lastIndex);
        // replace old content with new:
        //logger(file, newContents);
        changedContent = newContents;
    }

    if (!opt.donotRemove) {
        //logger(file, changedContent);
        content = changedContent;
    }

    return content;
}

function matchString(file, opt, locationName, tagName) {
    'use strict';
    var targetExt = filepath.extname(file.path);

    var tag = opt.tags.end(targetExt, opt.endtag);

    if (locationName)
        tag = opt.tags.append(targetExt, opt.appendtag);

    if (tagName)
        tag = opt.tags.added(targetExt, opt.addedtag);

    var variables = {
        name: opt.name,
    };

    if (locationName)
        variables.location = locationName;

    if (tagName)
        variables.tagName = tagName;

    return Object.keys(variables).reduce(function (str, variable) {
        return str.replace('{{' + variable + '}}', variables[variable]);
    }, tag);
}

function getLeadingWhitespace(str) {
    'use strict';
    return str.match(LEADING_WHITESPACE_REGEXP)[0];
}

function getEndingWhitespace(str) {
    'use strict';
    return str.match(ENDING_WHITESPACE_REGEXP)[0];
}

function getTagRegExp(tag, opt, locationName, tagName) {
    'use strict';
    tag = makeWhiteSpaceOptional(escapeStringRegexp(tag));
    tag = replaceVariables(tag, {
        name: opt.name,
        fileName: '\\w*',
        ext: '.\\w*',
        filePath: '[/\\w]*',
        ifexists: 'replace|append',
        location: locationName || '\\w*',
        tagName: tagName || '\\w*',
    });
    tag = optionalRegExp(tag, ':', opt);
    return new RegExp(tag, 'ig');
}

function optionalRegExp(tag, marker, opt) {
    'use strict';
    var parts = tag.split(marker);
    if (parts.length > 3) {
        var postfix = Array(parts.length).join(')?');
        var last = parts[parts.length - 1];
        last = last.replace(')', ')' + postfix);
        parts[parts.length - 1] = last;
        tag = parts.join('(' + marker)
    }
    return tag;
}

function replaceVariables(str, variables) {
    'use strict';
    return Object.keys(variables).reduce(function (str, variable) {
        return str.replace(new RegExp(escapeStringRegexp(escapeStringRegexp('{{' + variable + '}}')), 'ig'), '(' + variables[variable] + '\\b)');
    }, str);
}

function makeWhiteSpaceOptional(str) {
    'use strict';
    return str.replace(/\s+/g, '\\s*');
}

function getTagToInject(file, target, opt) {
    'use strict';
    //log(file.path);
    //log(target.path);
    var filePath = filepath(file, target, opt);
    //log(filePath);
    var transformedContents = opt.transform(filePath, file, target);
    if (typeof transformedContents !== 'string') {
        return '';
    }
    return transformedContents;
}

function log(message) {
    'use strict';
    gutil.log(magenta(PLUGIN_NAME), message);
}

function error(message) {
    'use strict';
    return new PluginError(PLUGIN_NAME, message);
}