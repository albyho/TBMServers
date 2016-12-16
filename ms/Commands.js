'use strict'

const Command_DeviceLogin      = 0x13000001;
const Command_DeviceLoginANS   = 0x31000001;

exports.getCommand_DeviceLogin = function () {
    return Command_DeviceLogin;
};

exports.getCommand_DeviceLoginANS = function () {
    return Command_DeviceLoginANS;
};