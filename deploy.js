const shell = require('node-powershell');
const path = require('path');
var fs = require("fs");
let ps = new shell({
    executionPolicy: 'Bypass',
    noProfile: true
});

const deployfile = path.join(__dirname, '/deploy.json')
const deployfilecontent = fs.readFileSync(deployfile);
const deployconfig = JSON.parse(deployfilecontent)
ps.addCommand(`$location = "${deployconfig.Location}"`)
const names = {
    "resourceGroupName": deployconfig.ProjectUniqueName.toLowerCase() + "resgrp",
    "iotHubName": deployconfig.ProjectUniqueName.toLowerCase() + "iothub",
    "storageAccountName": deployconfig.ProjectUniqueName.toLowerCase() + "storageaccount",
    "storageContainerName": deployconfig.ProjectUniqueName.toLowerCase() + "storagecontainer",
    "streamAnalyticsJobName": deployconfig.ProjectUniqueName.toLowerCase() + "streamanalytics",
    "streamAnalyticsInputName": "iothubinput",
    "streamAnalyticsBlobOutputName": "bloboutput",
    "streamAnalyticsSqlOutputName": "sqloutput",
    "sqlServerName": deployconfig.ProjectUniqueName.toLowerCase() + "sqlserver",
    "sqlDatabaseName": deployconfig.ProjectUniqueName.toLowerCase() + "sqldatabase",

}

Object.keys(names).forEach(key => {
    ps.addCommand(`$${key} = "${names[key]}"`)
    ps.addCommand(`$${key}`)
})

const streamAnalyticsJobDefinition =
{
    "location": deployconfig.Location,
    "properties": {
        "sku": {
            "name": "standard"
        },
        "eventsOutOfOrderPolicy": "adjust",
        "eventsOutOfOrderMaxDelayInSeconds": 10,
        "compatibilityLevel": 1.1
    }
}


const streamAnalyticsJobDefinitionJsonFile = path.join(__dirname, `/${deployconfig.ProjectName}-StreamAnalyticsJobDefinition.json`)
fs.writeFileSync(streamAnalyticsJobDefinitionJsonFile, JSON.stringify(streamAnalyticsJobDefinition));


const streamAnalyticsInputDefinition =
{
    "properties": {
        "type": "Stream",
        "datasource": {
            "type": "Microsoft.Devices/IotHubs",
            "properties": {
                "iotHubNamespace": names.iotHubName,
                "sharedAccessPolicyName": "iothubowner",
                "sharedAccessPolicyKey": "accesspolicykey",
                "endpoint": "messages/events",
                "consumerGroupName": "$Default"
            }
        },
        "compression": {
            "type": "None"
        },
        "serialization": {
            "type": "Json",
            "properties": {
                "encoding": "UTF8"
            }
        }
    },
    "name": names.streamAnalyticsInputName,
    "type": "Microsoft.StreamAnalytics/streamingjobs/inputs"
}

const streamAnalyticsInputDefinitionJsonFile = path.join(__dirname, `/${deployconfig.ProjectName}-StreamAnalyticsInputDefinition.json`)
fs.writeFileSync(streamAnalyticsInputDefinitionJsonFile, JSON.stringify(streamAnalyticsInputDefinition));

const streamAnalyticsBlobOutputDefinition =
{
    "properties": {
        "datasource": {
            "type": "Microsoft.Storage/Blob",
            "properties": {
                "storageAccounts": [
                    {
                        "accountName": names.storageAccountName,
                        "accountKey": storageAccountKey
                    }
                ],
                "container": names.storageContainerName,
                "pathPattern": "output/"+DeviceId+"/",
                "dateFormat": "yyyy/MM/dd",
                "timeFormat": "HH"
            }
        },
        "serialization": {
            "type": "Json",
            "properties": {
                "encoding": "UTF8",
                "format": "LineSeparated"
            }
        }
    },
    "name": names.streamAnalyticsBlobOutputName,
    "type": "Microsoft.StreamAnalytics/streamingjobs/outputs"
}


const streamAnalyticsBlobOutpuDefinitionJsonFile = path.join(__dirname, `/${deployconfig.ProjectName}-StreamAnalyticsBlobOutputDefinition.json`)
fs.writeFileSync(streamAnalyticsBlobOutpuDefinitionJsonFile, JSON.stringify(streamAnalyticsBlobOutputDefinition));

const streamAnalyticsSqlOutputDefinition =
{
    "properties": {
        "datasource": {
            "type": "Microsoft.Sql/Server/Database",
            "properties": {
                "server": names.sqlServerName+".database.windows.net",
                "database": names.sqlDatabaseName,
                "user": sqlServerUserName,
                "password": sqlServerPwd,
                "table": DeviceId
            }
        }
    },
    "name": names.streamAnalyticsSqlOutputName+DeviceId,
    "type": "Microsoft.StreamAnalytics/streamingjobs/outputs"
}



ps.addCommand('echo node-powershell')
ps.addCommand('echo node-powershell')
const psfile = path.join(__dirname, '/powershell/hello.ps1')
console.log(psfile);

ps.addCommand(`& "${psfile}"`);
ps.invoke()
    .then(output => {
        console.log(output);
        ps.dispose();
    })
    .catch(err => {
        console.log(err);
        ps.dispose();
    });