'use strict'

Object.prototype.structify = function(lo, offset) {
	if(lo.constructor !== Array) {
		return null;
	}

	offset = !offset ? 0 : offset;

	var isBE = lo.isBigEndian;
	var buf = new Buffer(16);
	var off = offset;

	buf.fill(0);
	for(var i = 0; i < lo.length; ++i) {
		var name = lo[i].name;
		var type = lo[i].type;
		var call = 'write';
		var isInt = false;
		var bpe = 0;

		function grow(newBytes) {
			if(off + newBytes >= buf.length) {
				var newBuf = new Buffer(buf.length << 1);
				newBuf.fill(0);
				buf.copy(newBuf);
				buf = newBuf;
			}
		}

		switch(type[0]) {
		    case 'f': call += 'Float'; bpe = 4;  break;
		    case 'd': call += 'Double'; bpe = 8; break;
		    case 'u': call += 'UInt'; isInt = true; break;
		    case 'i': call += 'Int'; isInt = true; break;
		}
		
		if(isInt) {
			var bits = parseInt(type.substr(1, type.length - 1));
			call += type.substr(1, type.length - 1);
			bpe = bits >> 3; 
		}

		if(bpe > 1) {
			call += isBE ? 'BE' : 'LE';
		}

		if(lo[i].size && bpe == 1) {
			var size = lo[i].size;
			var str = this[name];
			grow(size);
			buf.write(str, off, size > str.len ? str.len : size, 'ascii');
			off += size;
		}
		else{
			grow(bpe);
			buf[call](this[name], off);
			off += bpe;
		}
	}

	return buf.slice(0, off);
};

Buffer.prototype.objectify = function(lo, offset) {
	if(lo.constructor !== Array) {
		return null;
	}

	offset = !offset ? 0 : offset;
	
	var isBE = lo.isBigEndian;
	var obj = {};
	var off = offset;

	for(var i = 0; i < lo.length; ++i) {
		var name = lo[i].name;
		var type = lo[i].type;
		var call = 'read';
		var isInt = false;
		var bpe = 0;

		switch(type[0]) {
            case 'f': call += 'Float'; bpe = 4;  break;
            case 'd': call += 'Double'; bpe = 8; break;
            case 'u': call += 'UInt'; isInt = true; break;
            case 'i': call += 'Int'; isInt = true; break;
		}
		
		if(isInt) {
			var bits = parseInt(type.substr(1, type.length - 1));
			call += type.substr(1, type.length - 1);
			bpe = bits >> 3; 
		}

		if(bpe > 1) {
			call += isBE ? 'BE' : 'LE';
		}

		if(lo[i].size && bpe == 1) {
            var size = lo[i].size.constructor !== String ? lo[i].size : obj[lo[i].size];
            obj[name] = this.toString('ascii', off, off + size);
			off += size;    
		} else {
			obj[name] = this[call](off, bpe);
			off += bpe;
		}
	}

	obj.size_in_bytes = off - offset;

	return obj;
};

// 基于: https://npm.taobao.org/package/structify.js