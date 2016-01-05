/*!
 * bencoding
 * Copyright(c) 2011 Clark Fischer <clark.fischer@gmail.com>
 * MIT Licensed
 */

/**
 * Library version.
 */

exports.version = '0.0.2';

function decode(buf) {
	if (!(this instanceof decode)) {
		return new decode(buf);
	}
	this.raw = buf;
	this.remainder = buf;
	return this.getNext();
};

decode.prototype.nextToken = function () {
	return String.fromCharCode(this.remainder[0]);
}

decode.prototype.findNext = function (x) {
	if (typeof x == 'string') {
		x = x.charCodeAt(0);
	}
	for (var i = 0; i < this.remainder.length; i++) {
		if (this.remainder[i] === x) return i;
	}
	throw 'Token not found. Possible broken data';
};

decode.prototype.getNext = function () {
	switch (this.nextToken()) {
		case 'd':
			return this.consumeDictionary();
		case 'l':
			return this.consumeList();
		case 'i':
			return this.consumeInteger();
		case 'b':
			return this.consumeBuffer();
		case 'n':
			return this.consumeNull();
		default:
			return this.consumeByteString();
	}
};

decode.prototype.consumeDictionary = function () {
	var i = 0, dict = {};
	this.ff(1);
	while (this.nextToken() !== 'e') {
		dict[this.getNext()] = this.getNext();
	}
	this.ff(1);
	return dict;
};

decode.prototype.consumeInteger = function () {
	var end = this.findNext('e'),
		intBuf = this.remainder.slice(1, end);
	this.ff(end + 1);
	return +intBuf.toString();
};

decode.prototype.consumeByteString = function () {
	var sep = this.findNext(':'),
		length = parseInt(this.remainder.slice(0, sep).toString('ascii')) || 0,
		buf;
	buf = this.remainder.toString('utf8', sep + 1, sep + 1 + length);
	this.ff(sep + 1 + length);
	return buf;
};

decode.prototype.consumeBuffer = function () {
	var sep = this.findNext(':'),
		length = parseInt(this.remainder.slice(1, sep).toString('ascii')) || 0,
		buf;
	buf = this.remainder.slice(sep + 1, sep + 1 + length);
	this.ff(sep + 1 + length);
	return buf;
};

decode.prototype.consumeNull = function () {
	this.ff(this.findNext(':') + 1);
	return null;
};

decode.prototype.consumeList = function () {
	this.ff(1);
	var res = [];
	while(this.nextToken() !== 'e') {
		res.push(this.getNext());
	}
	this.ff(1);
	return res;
};

decode.prototype.ff = function (o) {
	this.remainder = this.remainder.slice(o, this.remainder.length);
};

function combineBuffers(list) {
	var length = list.reduce(function (pV, tV) {
		return pV + tV.length;
	}, 0),
		res = new Buffer(length),
		i = 0;
	list.forEach(function (item) {
		item.copy(res, i);
		i += item.length;
	});
	return res;
};

function encode(obj) {
	if (typeof obj === 'string') {
		return new Buffer(obj.length + ":" + obj);
	} else if (obj instanceof Buffer) {
		var res = new Buffer(obj.length + 2 + (obj.length.toString()).length);
		res.write('b' + obj.length.toString() + ':', 0)
		obj.copy(res, obj.length.toString().length + 2);
		return res;
	} else if (typeof obj === 'number') {
		return new Buffer('i' + (+obj) + 'e');
	} else if (Array.isArray(obj)) {
		obj = obj.map(encode);
		obj.splice(0, 0, new Buffer('l'));
		obj.push(new Buffer('e'));
		return combineBuffers(obj);
	} else if (typeof obj === 'object' && obj !== null){
		var parts = [];
		Object.keys(obj).forEach(function (k) {
			parts.push(encode(k));
			parts.push(encode(obj[k]));
		});
		parts.splice(0, 0, new Buffer('d'));
		parts.push(new Buffer('e'));
		return combineBuffers(parts);
	} else {
		return new Buffer('n:');
	}
}

exports = module.exports;
exports.decode = decode;
exports.encode = encode;
