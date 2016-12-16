'use strict'

exports.getFiledLength = function(lo, name){
	if(lo.constructor !== Array || name.constructor != String) {
		return 0;
    }
    
	for(var i = 0; i < lo.length; ++i) {
        if(lo[i].name === name) {
            var isInt = false;
	        var bpe = 0;
    	    switch(type[0]) {
		        case 'f': bpe = 4;  break;
		        case 'd': bpe = 8; break;
		        case 'u': isInt = true; break;
		        case 'i': isInt = true; break;
		    }
            if(isInt) {
			    var bits = parseInt(type.substr(1, type.length - 1));
			    bpe = bits >> 3; 
		    }
            return bpe;
        }
    }

    return 0;
}
/*
 * Command Head Struct
 * | Flag(4) | Length(4) |
 */
const CommandHead_PacketLayout = [
  { name: 'flag', type: 'u32' },
  { name: 'length', type: 'u32' }
];
CommandHead_PacketLayout.isBigEndian = false; 

exports.getCommandHead_PacketLayout = function () {
    return CommandHead_PacketLayout;
};

const CommandHead_Length = 8;				// sizeof(CommandHead_PacketLayout)
const CommandHead_FlagValue = 0x87654321;   // Little endian: 0x87654321
const CommandHead_LengthMax = 2 * 1024;

exports.getCommandHead_Length = function () {
    return CommandHead_Length;
};

exports.getCommandHead_FlagValue = function () {
    return CommandHead_FlagValue;
};

exports.getCommandHead_LengthMax = function () {
    return CommandHead_LengthMax;
};

/*
 * Command Struct
 * | Flag(4) | Length(4) |
 */
const Command_PacketLayout = [
  { name: 'videoID', type: 'u32' },
  { name: 'videoType', type: 'u8' },
  { name: 'videoFPS', type: 'u8' },
  { name: 'videoWidth', type: 'u16' },
  { name: 'VideoHeight', type: 'u16' },
  { name: 'audioType', type: 'u8' },
  { name: 'tokenLength', type: 'u32' },
  { name: 'token', type: 'u8', size: 'tokenLength'}
];
Command_PacketLayout.isBigEndian = false; 

exports.getCommand_PacketLayout = function () {
    return Command_PacketLayout;
};