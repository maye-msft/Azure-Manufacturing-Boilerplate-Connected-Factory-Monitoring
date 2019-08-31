$config = Get-Content deploy.json | ConvertFrom-Json
$currentPath = Convert-Path .
$appName = $config.ProjectName
function Show-Text {
    Write-Host [$appName]:  $args[0] 
}

Show-Text "Start to deploy" 

# Connect to Azure
#az login --use-device-code

$AzCred = Get-Credential  -Message "Input user/password"
az login -u $AzCred.UserName -p $AzCred.GetNetworkCredential().Password

#Declare Names
$location = $config.Location
$projectUniqueName = $config.ProjectUniqueName.tolower()
$resourceGroupName = $projectUniqueName + "resgrp"
$iotHubName = $projectUniqueName + "iothub"
$storageAccountName = $projectUniqueName + "storageaccount"
$storageContainerName = $projectUniqueName + "storagecontainer"
$streamAnalyticsJobName = $projectUniqueName + "streamanalytics"
$streamAnalyticsInputName = "iothubinput"
$streamAnalyticsBlobOutputName = "bloboutput"
$streamAnalyticsSqlOutputName = "sqloutput"
$sqlServerName = $projectUniqueName + "sqlserver"
$sqlDatabaseName = $projectUniqueName + "sqldatabase"


# create resource group
Show-Text "Create Resource Group - $resourceGroupName" 
New-AzResourceGroup -Name $resourceGroupName -Location $location


# create iothub
Show-Text "Create IoTHub - $iotHubName" 
New-AzIotHub `
    -ResourceGroupName $resourceGroupName `
    -Name $iotHubName `
    -SkuName S1 -Units 1 `
    -Location $location


Show-Text "Add IoT Devices" 
az extension add --name azure-cli-iot-ext
# $deviceskey = @()
$deviceskeystring = ""
Foreach ($device in $config.Devices) {
  
    Foreach ($name in $device.Name) {  
        Show-Text "Add IoT Device $name"   
        az iot hub device-identity create --device-id $name --hub-name $iotHubName
        $devicekey = az iot hub device-identity show-connection-string --device-id $name `
                                                  --hub-name $iotHubName `
                                                  --key-type primary `
                                                  --resource-group $resourceGroupName `
                                                  | ConvertFrom-Json
        # $deviceskey += $devicekey.connectionString
        $deviceskeystring += $name.toupper()+"_DEVICE_CONNECTION_STRING="+$devicekey.connectionString+"`n"
    }
  
}

# $deviceskey
# $deviceskeystring
Set-Content -Path $currentPath\.env -Value $deviceskeystring

#Get-AzIotHub

#create storage
Show-Text "Create Storage - $storageAccountName" 
$storageAccount = New-AzStorageAccount `
  -ResourceGroupName $resourceGroupName `
  -Name $storageAccountName `
  -Location $location `
  -SkuName Standard_LRS `
  -Kind Storage

$ctx = $storageAccount.Context

Show-Text "Create Container - $storageContainerName" 
New-AzStorageContainer `
  -Name $storageContainerName `
  -Context $ctx

$storageAccountKey = (Get-AzStorageAccountKey `
  -ResourceGroupName $resourceGroupName `
  -Name $storageAccountName).Value[0]

# create sql server
Show-Text "Create Azure SQL Server - $sqlServerName" 
$credential = Get-Credential -Message "Input credential of Azure SQL Server to be created."
$sqluser = $credential.GetNetworkCredential().username
$sqlpwd = $credential.GetNetworkCredential().password  

New-AzSqlServer -ResourceGroupName $resourceGroupName `
  -Location $location `
  -ServerName $sqlServerName `
  -ServerVersion "12.0" `
  -SqlAdministratorCredentials $credential

Show-Text "Create Azure SQL Database - $sqlServerName" 
New-AzSqlDatabase -ResourceGroupName $resourceGroupName  `
  -ServerName $sqlServerName `
  -DatabaseName $sqlDatabaseName `
  -Edition "GeneralPurpose" `
  -Vcore 1 `
  -ComputeGeneration "Gen5" `
  -ComputeModel Serverless

Add-Content -Path $currentPath\.env -Value "SQLSERVER=$sqlServerName.database.windows.net"
Add-Content -Path $currentPath\.env -Value "SQLDATABASE=$sqlDatabaseName"
Add-Content -Path $currentPath\.env -Value "SQLSERVER_USER=$sqluser"
Add-Content -Path $currentPath\.env -Value "SQLSERVER_PWD=$sqlpwd"

# create stream analytics job 
Show-Text "Create Stream Analytics Job - $streamAnalyticsJobName" 
$streamAnalyticsJobDefinition =@"
{
  "location": "$location",
  "properties": {
      "sku": {
          "name": "standard"
      },
      "eventsOutOfOrderPolicy": "adjust",
      "eventsOutOfOrderMaxDelayInSeconds": 10,
      "compatibilityLevel": 1.1
  }
}  
"@

New-Item -Path $currentPath\json -Type Directory -Force

Set-Content -Path $currentPath\json\JobDefinition.json -Value $streamAnalyticsJobDefinition


New-AzStreamAnalyticsJob `
  -ResourceGroupName $resourceGroupName `
  -File $currentPath\json\JobDefinition.json `
  -Name $streamAnalyticsJobName `
  -Force

# create stream analytics input
Show-Text "Create Stream Analytics Input - $streamAnalyticsInputName" 
$streamAnalyticsJobInputDefinition =@"
{
  "properties": {
      "type": "Stream",
      "datasource": {
          "type": "Microsoft.Devices/IotHubs",
          "properties": {
              "iotHubNamespace": "$iotHubName",
              "sharedAccessPolicyName": "iothubowner",
              "sharedAccessPolicyKey": "accesspolicykey",
              "endpoint": "messages/events",
              "consumerGroupName": "`$Default"
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
  "name": "$streamAnalyticsInputName",
  "type": "Microsoft.StreamAnalytics/streamingjobs/inputs"
}  
"@



Set-Content -Path $currentPath\json\JobInputDefinition.json -Value $streamAnalyticsJobInputDefinition
New-AzStreamAnalyticsInput `
  -ResourceGroupName $resourceGroupName `
  -JobName $streamAnalyticsJobName `
  -File $currentPath\json\JobInputDefinition.json `
  -Name $streamAnalyticsInputName



# create stream analytics blob output
Show-Text "Create Stream Analytics Blob Output - $streamAnalyticsBlobOutputName" 
$streamAnalyticsJobBlobOutputDefinition =@"
  {
    "properties": {
        "datasource": {
            "type": "Microsoft.Storage/Blob",
            "properties": {
                "storageAccounts": [
                    {
                      "accountName": "$storageAccountName",
                      "accountKey": "$storageAccountKey"
                    }
                ],
                "container": "$storageContainerName",
                "pathPattern": "output/{DeviceId}/{date}/{time}",
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
    "name": "$streamAnalyticsBlobOutputName",
    "type": "Microsoft.StreamAnalytics/streamingjobs/outputs"
}
"@




Set-Content -Path $currentPath\json\JobBlobOutputDefinition.json -Value $streamAnalyticsJobBlobOutputDefinition
New-AzStreamAnalyticsOutput `
  -ResourceGroupName $resourceGroupName `
  -JobName $streamAnalyticsJobName `
  -File $currentPath\json\JobBlobOutputDefinition.json `
  -Name $streamAnalyticsBlobOutputName -Force

  

# create stream analytics sql output
Foreach ($device in $config.Devices) {
    $deviceType = $device.Type
    $deviceOutputName = $streamAnalyticsBlobOutputName+$deviceType.tolower()
    Show-Text "Create Stream Analytics SQL Output for $deviceType - $deviceOutputName" 
    $outputName = $streamAnalyticsSqlOutputName+$deviceType.tolower()
    $sqlSeverSysName = $sqlServerName+".database.windows.net"
    $tableName = $deviceType+"Raw"
$streamAnalyticsJobSQLOutputDefinition = @"
  {
  "properties": {
      "datasource": {
          "type": "Microsoft.Sql/Server/Database",
          "properties": {
              "server": "$sqlSeverSysName",
              "database": "$sqlDatabaseName",
              "user": "$sqluser",
              "password": "$sqlpwd",
              "table": "$tableName"
          }
      }
  },
  "name": "$outputName",
  "type": "Microsoft.StreamAnalytics/streamingjobs/outputs"
}
"@    
    
    Set-Content -Path $currentPath\json\JobSQLOutputDefinition$deviceType.json -Value $streamAnalyticsJobSQLOutputDefinition
    New-AzStreamAnalyticsOutput `
      -ResourceGroupName $resourceGroupName `
      -JobName $streamAnalyticsJobName `
      -File $currentPath\json\JobSQLOutputDefinition$deviceType.json `
      -Name $outputName -Force
     
}

#create stream analytics job transformation query
Show-Text "Create Stream Analytics Transformation Query" 
$streamAnalyticsTransformName = $streamAnalyticsJobName+"Transformation"
$query = " SELECT * INTO $streamAnalyticsBlobOutputName FROM $streamAnalyticsInputName "
Foreach ($device in $config.Devices) {
  $deviceType = $device.Type
  $outputName = $streamAnalyticsSqlOutputName+$deviceType.tolower()
  $fields = ""
  Foreach ($field in $device.Fields) {
    $fields+=$field.Name+","
  }
  $query += "\n SELECT $fields DeviceId INTO $outputName FROM $streamAnalyticsInputName Where DeviceType='$deviceType'"
}

$streamAnalyticsJobSQLOutputDefinition = @"
{
  "name":"$streamAnalyticsTransformName",
  "type":"Microsoft.StreamAnalytics/streamingjobs/transformations",
  "properties":{
      "streamingUnits":1,
      "script":null,
      "query":"$query"
  }
}
"@


Set-Content -Path $currentPath\json\JobTransformationQueryDefinition.json -Value $streamAnalyticsJobSQLOutputDefinition
New-AzStreamAnalyticsTransformation `
  -ResourceGroupName $resourceGroupName `
  -JobName $streamAnalyticsJobName `
  -File $currentPath\json\JobTransformationQueryDefinition.json `
  -Name $streamAnalyticsTransformName -Force

Show-Text "Delete Resource Group - $resourceGroupName" 
az group delete --name $resourceGroupName