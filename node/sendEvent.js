// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
require('dotenv').config()
const path = require('path');
var fs = require("fs");
var uuid = require('uuid');
var Protocol = require('azure-iot-device-mqtt').Mqtt;
// Uncomment one of these transports and then change it in fromConnectionString to test other transports
// var Protocol = require('azure-iot-device-amqp').AmqpWs;
// var Protocol = require('azure-iot-device-http').Http;
// var Protocol = require('azure-iot-device-amqp').Amqp;
// var Protocol = require('azure-iot-device-mqtt').MqttWs;
var Client = require('azure-iot-device').Client;
var Message = require('azure-iot-device').Message;
const random = require('random')
const dateFormat = require('dateformat');

function createClient(type, name) {
    // String containing Hostname, Device Id & Device Key in the following formats:
    //  "HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>"
    var connectionString = process.env[name.toUpperCase() + "_DEVICE_CONNECTION_STRING"];
    if (!connectionString) {
        console.log('Please set the ' + name.toUpperCase() + '_DEVICE_CONNECTION_STRING environment variable.');
        process.exit(-1);
    }
    // fromConnectionString must specify a transport constructor, coming from any transport package.
    return Client.fromConnectionString(connectionString, Protocol);
}

function createRandomMessage(fields) {
    const msg = {}
    fields.forEach(field => {
        const now = new Date()
        if (field.Type == "int")
            msg[field.Name] = random.int(field.RandomRange[0], field.RandomRange[1])
        else if (field.Type == "float")
            msg[field.Name] = random.float(field.RandomRange[0], field.RandomRange[1]).toPrecision(5)
        else if (field.Type == "boolean")
            msg[field.Name] = random.boolean()
        else if (field.Type == "string")
            msg[field.Name] = field.Options[random.int(0, field.Options.length - 1)]
        else if (field.Type == "date")
            msg[field.Name] = dateFormat(now, "yyyy/mm/dd");
        else if (field.Type == "datetime")
            msg[field.Name] = dateFormat(now, "yyyy/mm/dd hh:MM:ss");
    })
    return msg
}

const deployfile = path.join(__dirname, '../deploy.json')
const deployfilecontent = fs.readFileSync(deployfile);
const deployconfig = JSON.parse(deployfilecontent)

deployconfig.Devices.forEach((deviceType) => {
    const type = deviceType.Type
    const names = deviceType.Name
    const fields = deviceType.Fields
    names.forEach((name) => {
        const client = createClient(type, name)


        setInterval(()=>{
            const msg = createRandomMessage(fields)
            msg['DeviceId'] = name;
            msg['DeviceType'] = type;
            var message = new Message(JSON.stringify(msg));
            message.messageId = uuid.v4();
            console.log('Sending message: ' + message.getData());
            client.sendEvent(message, function (err) {
                if (err) {
                    console.error('Could not send: ' + err.toString());
                    process.exit(-1);
                } else {
                    console.log('Message sent: ' + message.messageId);
                    
                }
            });
        }, 5000)

    })

})






// client.open(function (err) {
//     if (err) {
//         console.error('Could not connect: ' + err.message);
//     } else {
//         console.log('Client connected');

//         client.on('error', function (err) {
//             console.error(err.message);
//             process.exit(-1);
//         });

//         // any type of data can be sent into a message: bytes, JSON...but the SDK will not take care of the serialization of objects.
//         var message = new Message(JSON.stringify({
//             key: 'value',
//             theAnswer: 42
//         }));
//         // A message can have custom properties that are also encoded and can be used for routing
//         message.properties.add('propertyName', 'propertyValue');

//         // A unique identifier can be set to easily track the message in your application
//         message.messageId = uuid.v4();

//         console.log('Sending message: ' + message.getData());
//         client.sendEvent(message, function (err) {
//             if (err) {
//                 console.error('Could not send: ' + err.toString());
//                 process.exit(-1);
//             } else {
//                 console.log('Message sent: ' + message.messageId);
//                 process.exit(0);
//             }
//         });
//     }
// });