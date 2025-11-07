var path = require('path');
var fs = require('fs');
var robotjs;
try {
    robotjs = require('node-gyp-build')(__dirname);
} catch (e) {
    var platform = process.platform;
    var arch = process.arch;
    var searchDirs = [path.join(__dirname, 'prebuilds', platform + '-' + arch)];
    // Handle macOS universal build folder name
    if (platform === 'darwin' && arch === 'arm64') {
        searchDirs.push(path.join(__dirname, 'prebuilds', 'darwin-x64+arm64'));
    }
    if (platform === 'darwin' && arch === 'x64') {
        searchDirs.push(path.join(__dirname, 'prebuilds', 'darwin-x64+arm64'));
    }
    var candidates = [
        'node.napi.node',
        'node.napi.glibc.node',
        'node.napi.musl.node',
        'robotjs.node',
        'robotjs.napi.node',
        '@evgenonyskiv+robotjs.node',
        '@evgenonyskiv+robotjs.glibc.node',
        '@evgenonyskiv+robotjs.musl.node'
    ];
    try {
        var libc;
        try { libc = require('detect-libc').familySync(); } catch (_) { libc = null; }
        if (libc === 'glibc') {
            candidates.unshift('node.napi.glibc.node');
            candidates.unshift('@evgenonyskiv+robotjs.glibc.node');
        }
        if (libc === 'musl') {
            candidates.unshift('node.napi.musl.node');
            candidates.unshift('@evgenonyskiv+robotjs.musl.node');
        }
    } catch (_) {}
    var loaded = false;
    for (var di = 0; di < searchDirs.length && !loaded; di++) {
        var baseDir = searchDirs[di];
        // Сначала пробуем стандартные имена
        for (var i = 0; i < candidates.length && !loaded; i++) {
            var candidatePath = path.join(baseDir, candidates[i]);
            if (fs.existsSync(candidatePath)) {
                robotjs = require(candidatePath);
                loaded = true;
            }
        }
        // Если не нашли, ищем любой .node файл в директории
        if (!loaded && fs.existsSync(baseDir)) {
            try {
                var files = fs.readdirSync(baseDir);
                for (var j = 0; j < files.length && !loaded; j++) {
                    if (files[j].endsWith('.node')) {
                        var filePath = path.join(baseDir, files[j]);
                        robotjs = require(filePath);
                        loaded = true;
                    }
                }
            } catch (readErr) {
                // Игнорируем ошибки чтения директории
            }
        }
    }
    if (!loaded) {
        console.error('Failed to load robotjs binary. Searched in:', searchDirs);
        throw e;
    }
}

module.exports = robotjs;

module.exports.screen = {};

function toHex(n)
{
    return n.toString(16).padStart(2, '0');
}

function bitmap(width, height, byteWidth, bitsPerPixel, bytesPerPixel, image)
{
    this.width = width;
    this.height = height;
    this.byteWidth = byteWidth;
    this.bitsPerPixel = bitsPerPixel;
    this.bytesPerPixel = bytesPerPixel;
    this.image = image;

    this.colorAt = function(x, y)
    {
        if (typeof x !== 'number' || typeof y !== 'number') {
            throw new Error(`Invalid number`);
        }

        const buffer = this.image;
        const startIndex = (y * this.width + x) * this.bytesPerPixel;

        if (x < 0 || x >= this.width || y < 0 || y >= this.height || typeof buffer[startIndex + 2] === 'undefined') {
            throw new Error(`(${x}, ${y}) are outside the bitmap`);
        }

        return `${toHex(buffer[startIndex + 2])}${toHex(buffer[startIndex + 1])}${toHex(buffer[startIndex])}`;
    };
}

module.exports.screen.capture = function(x, y, width, height)
{
    //If coords have been passed, use them.
    if (typeof x !== "undefined" && typeof y !== "undefined" && typeof width !== "undefined" && typeof height !== "undefined")
    {
        b = robotjs.captureScreen(x, y, width, height);
    }
    else
    {
        b = robotjs.captureScreen();
    }

    return new bitmap(b.width, b.height, b.byteWidth, b.bitsPerPixel, b.bytesPerPixel, b.image);
};
