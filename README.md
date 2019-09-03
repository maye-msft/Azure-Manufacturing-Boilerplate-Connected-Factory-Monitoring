# Azure Manufacturing Boilerplate - Connected Factory Monitoring

This boilerplate is set of powershell and nodejs scripts to setup an Azure IoT system for collecting data from IoT Device with Azure IoTHub and store data into blob storage and Azure SQL.

![architecture diagram](/images/architecture-diagram.PNG)

**It takes you only 10 minutes to setup an IoT based Connected System solution via Azure PaaS. And it costs less than $50 per month as a starter kit.**  



## Before you begin

* ### Install PowerShell

https://docs.microsoft.com/en-us/powershell/scripting/install/installing-powershell?view=powershell-6#powershell-core

* ### Install the Azure CLI

https://docs.microsoft.com/en-us/cli/azure/install-azure-cli?view=azure-cli-latest

* ### Install Node

https://nodejs.org/en/download/


## Define your devices with JSON

Edit deploy.json to add your devices and data to be sent

```json

{
    "ProjectName": "MyConnectedFActory",
    "ProjectUniqueName": "CFDemo001",
    "Location":"southeastasia",
    "Devices":[
        {
            "Type":"DeviceType1",
            "Name":["Device001","Device002"],
            "Fields":[
                {"Name":"var001", "Type":"int", "RandomRange":[10,20]},
                {"Name":"var002", "Type":"float", "RandomRange":[1.0,10.0]},
                {"Name":"var003", "Type":"string", "Length":32, "Options":["Option1","Option2"]},
                {"Name":"var004", "Type":"boolean"},
                {"Name":"var005", "Type":"date"},
                {"Name":"var006", "Type":"datetime"}
            ]
        },
        {
            "Type":"DeviceType2",
            "Name":["Device003","Device004"],
            "Fields":[
                {"Name":"var001", "Type":"int", "RandomRange":[10,20]},
                {"Name":"var002", "Type":"float", "RandomRange":[1.0,10.0]},
                {"Name":"var003", "Type":"string", "Length":32, "Options":["Option1","Option2"]},
                {"Name":"var004", "Type":"boolean"},
                {"Name":"var005", "Type":"date"},
                {"Name":"var006", "Type":"datetime"}
            ]
        }
    ]
}

```

## Run PowerShell - main.ps1

[main.ps1](https://github.com/maye-msft/Azure-Manufacturing-Boilerplate-Connected-Factory-Monitoring/blob/master/main.ps1)

```shell
git clone https://github.com/maye-msft/Azure-Manufacturing-Boilerplate-Connected-Factory-Monitoring
cd "Azure-Manufacturing-Boilerplate-Connected-Factory-Monitoring"
powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
./main.ps1
```

The **main.ps1** powershell script create the following resource and configurations

* Resource Group
* Azure IoT Hub
* Azure Stream Analytics
    * IotHub input
    * Blob output
    * Azure SQL output
* Blob Storage and Container
* Azure SQL Server and Database

The resources generated for example:
![azure resources](/images/azure-resources.PNG)

The job diagram of Stream Analytics
![job diagram](/images/job-diagram.PNG)

## Create Table in Azure SQL

[createSQLTable.js](https://github.com/maye-msft/Azure-Manufacturing-Boilerplate-Connected-Factory-Monitoring/blob/master/node/createSQLTable.js)

```shell
npm install
node ./node/createSQLTable.js
```

The node script create SQL Table in the SQL Server.

An error will occurr as Azure SQL need set firewall for exteral connection.

https://docs.microsoft.com/en-us/azure/sql-database/sql-database-firewall-configure

## Send Events

[sendEvent.js](https://github.com/maye-msft/Azure-Manufacturing-Boilerplate-Connected-Factory-Monitoring/blob/master/node/sendEvent.js)

```shell
node ./node/sendEvent.js
```

This program sends events every 5 seconds.

![send event](/images/sendEvent.PNG)

## Quary event data in SQL

[queryEvent.js](https://github.com/maye-msft/Azure-Manufacturing-Boilerplate-Connected-Factory-Monitoring/blob/master/node/queryEvent.js)

```shell
node ./node/queryEvent.js
```

This program queries the event data stored in SQL.

![query event](/images/queryEvent.PNG)

## Blob Storage Output
The event data also export to Blob Container
![storage output](/images/storageoutput.PNG)

## Cost of Azure Consumption

Services | Edition | Price 
------------ | ------------- | ----------------
Azure IoT Hub | Standard Tier, S1: Unlimited devices, 400,000 msgs/day | $25/Month
Azure Stream Analytics | 1 Standard streaming units | $0.127/hour 
Blob Storage and Container | Block Blob Storage, Blob Storage,  | $0.02/GB/Month $0.05/10,000 Write
Azure SQL Server and Database | Single Database, vCore Purchase Model | $4.73/Month


## !!! Warning !!!

**This powershell script will generate a set of json files and one .env file, which contains security keys. Please keep them Azure Key Vault in production or remove them after running a demo.**

The last command of the PowerShell is to clean up the resources, if we want to keep them please select "n".

### TODO

* Azure Function as Azure SQL aggregation and management trigger
* Azure App Service for visualization
* PowerBI integration
* Azure AD integration
