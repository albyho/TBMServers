const net = require('net'); 
const HeadBodyBuffers = require('head_body_buffers').HeadBodyBuffers;
const CommandBuffer = require('../lib/CommandBuffer.js').CommandBuffer;
const structify = require('../lib/structify.js');
const Structs = require('./Structs.js');
const Commands = require('./Commands.js');

const users = new Map();

/*
 * Settings
 */
const Hostname = '0.0.0.0';
const Port = 9988;
const Timeout = 20 * 1000; // 20 * 1000  2 * 60 * 1000
const NoDelay = true;  // Default

const server = net.createServer(socket => {
    console.log(`New socket connected`);     
    socket.setTimeout(Timeout); 
    socket.setNoDelay(NoDelay);
    let commandHead_PacketLayout = Structs.getCommandHead_PacketLayout();
    let cmdBuffer = new CommandBuffer(Structs.getCommandHead_Length(), data => {
        let commandHead = data.objectify(commandHead_PacketLayout);
        let commandHead_Length = Structs.getCommandHead_Length();
        if(commandHead.flag != Structs.getCommandHead_FlagValue() || 
           commandHead.length < commandHead_Length || 
           commandHead.length > Structs.getCommandHead_LengthMax()) {
            console.error(`错误: 命令标记错误或命令长度错误`);
            socket.end();
            return 0;
        }
        return commandHead.length - commandHead_Length;
    });
    cmdBuffer.on('packet', (packet, data) => {
        // 解析命令
        let command = packet.readUInt32LE(Structs.getCommandHead_Length(), true);
        switch(command) {
            case Commands.getCommand_DeviceLogin(): 
            let commandBody = packet.slice(Structs.getCommandHead_Length()).objectify(Structs.getCommand_PacketLayout());
            var keyToRemove; // Type: Socket
            // ?: 如果中断 forEach
            users.forEach((key, value) => {
                if(value.videoID === commandBody.videoID) {
                    keyToRemove = key;
                }
            });
            if(keyToRemove) {
                users.delete(keyToRemove);
                keyToRemove.end();
            }
            users.set(socket, {
                type: 1,                    // 1 设备 2 客户端
                profile: commandBody,       // 保存登录信息
                clientSockets: new Map(),   // 客户端 Socket ，可通过 users 表检索出客户端
                cache: new Array()          // 缓存的 I 帧块数据(包含音频)。尽量保存最近 1 个 I 帧块，以供新的客户端能迅速收到(稍有延迟)的数据。
            });
            break;
            default:
            socket.end();
            return;
        }

        // 剩余的数据
        console.log(data);
    });

    socket.on('end', () => {
        // 如果用户主动关闭， socket.remoteAddress 为 undefined
        console.log(`Socket ` + socket.remoteAddress + ` closed`);
        let user = users.get(socket);
        if(!user) {
            return;
        }
        if(user.type === 1) {
            user.clientSockets.forEach(clientSocket => {
                // 从 users 找到并设置标记
                // TODO: 在合适的时候(I帧块发完并发完结束帧)断开连接并从中 users 中移除
                let client = users.get(clientSocket);
                if(!client || client.device !== user) {
                    console.error(`2`);
                    return;
                }
                clientSocket.end();
            });
            users.delete(socket);
        }
    });
    socket.on('data', data => {
        let user = users.get(socket);
        if(user === undefined) {
            cmdBuffer.addBuffer(data);
            return;
        }
    });
    socket.on('timeout', () => {
        console.log(`Socket ` + socket.remoteAddress + ` timeout`);     
        socket.end();
    });
    socket.on('error', error => {
        console.error(error);
        socket.end();
    });
});

server.on('error',error => {
     console.error(error); 
});

server.listen(Port, Hostname, () => {
    console.log(`Opened server on ${Hostname}:${Port}`);
});

