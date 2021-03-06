/**
 * Constants
 */
var DEFAULT_TARGET = 'html';
var start = '{{name}}:{{fileName}}:{{ext}}:{{filePath}}:{{ifexists}}:{{location}}:{{tagName}}';
var end = 'end{{name}}';
var append = 'append{{name}}:{{location}}';
var added = 'added{{name}}:{{location}}:{{tagName}}';

var DEFAULTS = {
    STARTS: {
        html: '<!-- ' + start + ' -->',

        cs: '// ' + start + '',
        js: '// ' + start + '',

        jsx: '{/* ' + start + ' */}',

        jade: '//- ' + start + '',
        pug: '//- ' + start + '',

        slm: '/ ' + start + '',
        slim: '/ ' + start + '',

        haml: '-# ' + start + '',

        css: '/* ' + start + ' */',
        less: '/* ' + start + ' */',
        sass: '/* ' + start + ' */',
        scss: '/* ' + start + ' */'
    },
    ENDS: {
        html: '<!-- ' + end + ' -->',

        cs: '// ' + end + '',
        js: '// ' + end + '',

        jsx: '{/* ' + end + ' */}',

        jade: '//- ' + end + '',
        pug: '//- ' + end + '',

        slm: '/ ' + end + '',
        slim: '/ ' + end + '',

        haml: '-# ' + end + '',

        css: '/* ' + end + ' */',
        less: '/* ' + end + ' */',
        sass: '/* ' + end + ' */',
        scss: '/* ' + end + ' */'
    },
    APPENDS: {
        html: '<!-- ' + append + ' -->',

        cs: '// ' + append + '',
        js: '// ' + append + '',

        jsx: '{/* ' + append + ' */}',

        jade: '//- ' + append + '',
        pug: '//- ' + append + '',

        slm: '/ ' + append + '',
        slim: '/ ' + append + '',

        haml: '-# ' + append + '',

        css: '/* ' + append + ' */',
        less: '/* ' + append + ' */',
        sass: '/* ' + append + ' */',
        scss: '/* ' + append + ' */'
    },
    ADDEDS: {
        html: '<!-- ' + added + ' -->',

        cs: '// ' + added + '',
        js: '// ' + added + '',

        jsx: '{/* ' + added + ' */}',

        jade: '//- ' + added + '',
        pug: '//- ' + added + '',

        slm: '/ ' + added + '',
        slim: '/ ' + added + '',

        haml: '-# ' + added + '',

        css: '/* ' + added + ' */',
        less: '/* ' + added + ' */',
        sass: '/* ' + added + ' */',
        scss: '/* ' + added + ' */'
    },
    BEGINLINES: {
        html: 1,

        cs: 0,
        js: 2,

        jsx: 0,

        jade: 0,
        pug: 0,

        slm: 0,
        slim: 0,

        haml: 0,

        css: 2,
        less: 2,
        sass: 2,
        scss: 0
    },
    ENDLINES: {
        html: 0,

        cs: 0,
        js: 1,

        jsx: 0,

        jade: 0,
        pug: 0,

        slm: 0,
        slim: 0,

        haml: 0,

        css: 1,
        less: 1,
        sass: 1,
        scss: 0
    }
};

module.exports = function tags() {
    return {
        start: getTag.bind(null, DEFAULTS.STARTS),
        end: getTag.bind(null, DEFAULTS.ENDS),
        append: getTag.bind(null, DEFAULTS.APPENDS),
        added: getTag.bind(null, DEFAULTS.ADDEDS),
        beginLine: getTag.bind(null, DEFAULTS.BEGINLINES),
        endLine: getTag.bind(null, DEFAULTS.ENDLINES)
    };
};

function getTag(defaults, targetExt, defaultValue) {
    var tag = defaultValue;
    if (!tag) {
        tag = defaults[targetExt] || defaults[DEFAULT_TARGET];
    } else if (typeof tag === 'function') {
        tag = tag(targetExt);
    }
    return tag;
}