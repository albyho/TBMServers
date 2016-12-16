const net = require('net'); 
const HeadBodyBuffers = require('head_body_buffers').HeadBodyBuffers;
const CommandBuffer = require('../lib/CommandBuffer.js').CommandBuffer;
const structify = require('../lib/structify.js');
const Structs = require('./Structs.js');
const Commands = require('./Commands.js');

var deviceSockets = [];
var clientSockets = [];
var devices = [];
var clients = [];

/*
 * Settings
 */
const Timeout = 20 * 1000; // 20 * 1000  2 * 60 * 1000
const NoDelay = true;  // Default

const server = net.createServer(function (socket) {
    console.log('New socket connected');     
    socket.setTimeout(Timeout); 
    socket.setNoDelay(NoDelay);
    var commandHead_PacketLayout = Structs.getCommandHead_PacketLayout();
    var cmdBuffer = new CommandBuffer(Structs.getCommandHead_Length(), function (data) {
        var commandHead = data.objectify(commandHead_PacketLayout);
        var commandHead_Length = Structs.getCommandHead_Length();
        if(commandHead.flag != Structs.getCommandHead_FlagValue() || 
           commandHead.length < commandHead_Length || 
           commandHead.length > Structs.getCommandHead_LengthMax()) {
            socket.end();
            return 0;
        }
        return commandHead.length - commandHead_Length;
    });
    cmdBuffer.on('packet', function (packet, data) {
        // 解析命令
        var command = packet.readUInt32LE(Structs.getCommandHead_Length(), true);
        switch(command) {
            case Commands.getCommand_DeviceLogin(): 
            var commandBody = packet.slice(Structs.getCommandHead_Length()).objectify(Structs.getCommand_PacketLayout());
            deviceSockets.push(socket);
            devices.push({
                socket: socket,
                profile: commandBody
            });
            break;
            default:
            socket.end();
            return 0;
        }
        console.log(data);
    });

    socket.on('end', function() {
        // 如果用户主动关闭， socket.remoteAddress 为 undefined
        console.log('Socket '+ socket.remoteAddress + ' closed');
    });
    socket.on('data',function (data) {
        cmdBuffer.addBuffer(data);
    });
    socket.on('timeout',function() {
        console.log('Socket '+ socket.remoteAddress + ' timeout');     
        socket.end();
    });
    socket.on('error',function (error) {
        console.error(error);
        socket.end();
    });
});

server.on('error',function (error) {
     console.error(error); 
});

server.listen(9988, '0.0.0.0', function() {
    console.log('Opened server on', server.address());
});

