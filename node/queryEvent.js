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
    let sql = `SELECT TOP 20 * FROM ${type}Raw`
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
connection.on('connect', function (err) {
    if (err) {
        console.log(err)
    }
    else {
        
        queryDatabase(0, false)
    }
}
);
function queryDatabase(idx, cont) {

    var request = new Request(
        sqls[idx],
        function (err) {
            if (err)
                console.log(err);
            else
                console.log("tabled created:\n" + sqls[idx]);

        }
    );
    request.on('row', function (columns) {
        columns.forEach(function (column) {
            console.log("%s\t%s", column.metadata.colName, column.value);
        });
        console.log("\n\n");
    });
    request.on('requestCompleted', function () {
        if(cont) {
            idx++;
            if (sqls.length > idx)
                queryDatabase(idx)
            else if (sqls.length == idx)
                connection.close();
        } else {
            connection.close();
        }
    });
    connection.execSql(request);

}
