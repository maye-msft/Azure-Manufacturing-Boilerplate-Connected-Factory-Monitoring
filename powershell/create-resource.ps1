# Connect to Azure
Connect-AzAccount


# create resource group
New-AzResourceGroup -Name $resourceGroupName -Location $location


# create iothub
New-AzIotHub `
    -ResourceGroupName $resourceGroupName `
    -Name $iotHubName `
    -SkuName S1 -Units 1 `
    -Location $location

Get-AzIotHub

#create storage
$storageAccount = New-AzStorageAccount `
  -ResourceGroupName $resourceGroupName `
  -Name $storageAccountName `
  -Location $location `
  -SkuName Standard_LRS `
  -Kind Storage

$ctx = $storageAccount.Context


New-AzStorageContainer `
  -Name $storageContainerName `
  -Context $ctx

$storageAccountKey = (Get-AzStorageAccountKey `
  -ResourceGroupName $resourceGroupName `
  -Name $storageAccountName).Value[0]

# create sql server
$credential = Get-Credential -Message "Input credential of Azure SQL Server to be created."
$credential.GetNetworkCredential().username
$credential.GetNetworkCredential().password  

New-AzSqlServer -ResourceGroupName $resourceGroupName `
    -Location $location `
    -ServerName $sqlServerName `
    -ServerVersion "12.0" `
    -SqlAdministratorCredentials $credential

New-AzSqlDatabase -ResourceGroupName $resourceGroupName  `
    -ServerName $sqlServerName `
    -DatabaseName $sqlDatabaseName `
    -Edition "GeneralPurpose" `
    -Vcore 1 `
    -ComputeGeneration "Gen5" `
    -ComputeModel Serverless

# create stream analytics job 
New-AzStreamAnalyticsJob `
  -ResourceGroupName $resourceGroupName `
  -File $jobDefinitionFile `
  -Name $streamAnalyticsJobName `
  -Force
