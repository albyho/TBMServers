const net = require('net'); 
const HashTable = require('hashtable');
const HeadBodyBuffers = require('head_body_buffers').HeadBodyBuffers;
const CommandBuffer = require('../lib/CommandBuffer.js').CommandBuffer;
const structify = require('../lib/structify.js');
const Structs = require('./Structs.js');
const Commands = require('./Commands.js');

// TODO: 合并成一个表
const users = new HashTable();

/*
 * Settings
 */
const Timeout = 20 * 1000; // 20 * 1000  2 * 60 * 1000
const NoDelay = true;  // Default

const server = net.createServer(function (socket) {
    console.log('New socket connected');     
    socket.setTimeout(Timeout); 
    socket.setNoDelay(NoDelay);
    let commandHead_PacketLayout = Structs.getCommandHead_PacketLayout();
    let cmdBuffer = new CommandBuffer(Structs.getCommandHead_Length(), function (data) {
        let commandHead = data.objectify(commandHead_PacketLayout);
        let commandHead_Length = Structs.getCommandHead_Length();
        if(commandHead.flag != Structs.getCommandHead_FlagValue() || 
           commandHead.length < commandHead_Length || 
           commandHead.length > Structs.getCommandHead_LengthMax()) {
            console.error('错误: 命令标记错误或命令长度错误');
            socket.end();
            return 0;
        }
        return commandHead.length - commandHead_Length;
    });
    cmdBuffer.on('packet', function (packet, data) {
        // 解析命令
        let command = packet.readUInt32LE(Structs.getCommandHead_Length(), true);
        switch(command) {
            case Commands.getCommand_DeviceLogin(): 
            let commandBody = packet.slice(Structs.getCommandHead_Length()).objectify(Structs.getCommand_PacketLayout());
            let keyToRemove;
            users.forEach(function (key, value) {
                if(value.videoID === commandBody.videoID) {
                    keyToRemove = key;
                    break;
                }
            });
            if(keyToRemove) {
                users.remove(keyToRemove);
                keyToRemove.end();
            }
            users.put(socket, {
                type: 1,    // 1 设备 2 客户端
                profile: commandBody,
                clientSockets: new HashTable()
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
        let user = users.get(socket);
        if(!user) {
            return;
        }
        if(user.type === 1) {
            user.clientSockets.forEach(function(clientSocket) {
                // 从 users 找到并设置标记
                // TODO: 在合适的时候(I帧块发完并发完结束帧)断开连接并从中 users 中移除
                let client = users.get(clientSocket);
                if(!client || client.device !== user) {
                    console.error('2');
                    return;
                }
                clientSocket.end();
            });
            user.remove(socket);
        }
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

