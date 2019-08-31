require('dotenv').config()
var Connection = require('tedious').Connection;
var Request = require('tedious').Request;
const path = require('path');
var fs = require("fs");
const deployfile = path.join(__dirname, '../deploy.json')
const deployfilecontent = fs.readFileSync(deployfile);
const deployconfig = JSON.parse(deployfilecontent)
let sqls = [];
deployconfig.Devices.forEach((deviceType) => {
    const type = deviceType.Type
    const names = deviceType.Name
    const fields = deviceType.Fields
    let sql = `CREATE TABLE ${type}Raw
    (
        DeviceId NVARCHAR(64) NOT NULL
    `
    fields.forEach(field => {
        const now = new Date()
        if (field.Type == "int")
            sql+= `, ${field.Name} INT`
        else if (field.Type == "float")
            sql+= `, ${field.Name} FLOAT`
        else if (field.Type == "boolean")
            sql+= `, ${field.Name} BIT`
        else if (field.Type == "string")
            sql+= `, ${field.Name} NVARCHAR(${field.Length})`
        else if (field.Type == "date")
            sql+= `, ${field.Name} DATE`
        else if (field.Type == "datetime")
            sql+= `, ${field.Name} DATETIME`
    })
    sql+=')\n'
    // sqls.push(`DROP TABLE ${type}Raw`)
    sqls.push(sql)
})

console.log(sqls)

// Create connection to database
var config =
{
    authentication: {
        options: {
            userName: process.env.SQLSERVER_USER, // update me
            password: process.env.SQLSERVER_PWD // update me
        },
        type: 'default'
    },
    server: process.env.SQLSERVER, // update me
    options:
    {
        database: process.env.SQLDATABASE, //update me
        encrypt: true
    }
}
var connection = new Connection(config);

// Attempt to connect and execute queries if connection goes through
connection.on('connect', function(err)
    {
        if (err)
        {
            console.log(err)
        }
        else
        {
            //queryDatabase()
            console.log('SQL Connected...');
            createTable(0)
        }
    }
);
function createTable(idx) {

        var request = new Request(
            sqls[idx],
            function(err)
            {
               if(err)
                console.log(err);
               else
                console.log("tabled created:\n"+sqls[idx]);
                
            }
        );
        request.on('requestCompleted', function () {
            idx++;
            if(sqls.length>idx)
                createTable(idx)
            else if(sqls.length == idx)
                connection.close();
        });
        connection.execSql(request);
    
}

// function queryDatabase()
// {
//     console.log('Reading rows from the Table...');



//     // Read all rows from table
//     var request = new Request(
//         "SELECT TOP 20 pc.Name as CategoryName, p.name as ProductName FROM [SalesLT].[ProductCategory] pc "
//             + "JOIN [SalesLT].[Product] p ON pc.productcategoryid = p.productcategoryid",
//         function(err, rowCount, rows)
//         {
//             console.log(rowCount + ' row(s) returned');
//             process.exit();
//         }
//     );

//     request.on('row', function(columns) {
//         columns.forEach(function(column) {
//             console.log("%s\t%s", column.metadata.colName, column.value);
//         });
//     });
//     connection.execSql(request);
// }