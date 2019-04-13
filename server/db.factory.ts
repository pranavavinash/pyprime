// Create a configuration object for our Azure SQL connection parameters
var dbConfig =  {
    
    server: "pytechnodb.database.windows.net", // Use your SQL server name
    database: "pytechnodb", // Database to connect to
    user: "pytechnodb", // Use your username
    password: "Yashvi03", // Use your password
    
    port: 1433,
    // Since we're on Windows Azure, we need to set the following options
    options: {
        encrypt: true
    }
    
};

var sql = require("mssql");

var fs = require('fs');
var path = require('path');

function DbFactory() {
    this.get = function() {
        return new Promise((resolve, reject) => {
            console.log("[DBFactory] - Retrieving Connection");
            if(this.connection){
                console.log("[DBFactory] - Returning cached connection");
                return resolve(this.connection);
            }
            this.connection = new sql.ConnectionPool(dbConfig);
            let conn = this.connection;
            conn.connect()
            // Successfull connection
            .then(() =>  {
                return resolve(conn);
            })
            .catch((err) => {
                console.log(err);
                return reject(err);
            }); 
        });
    }
    this.getPaginationQuery = function(tableName, page, totalRecords, where, orderBy){
        if(!where){
            where = ""
        }
        if(!orderBy){
            orderBy = ""
        }
        return `
            --CREATING A PAGING WITH OFFSET and FETCH clauses IN "SQL SERVER 2012"
            DECLARE @PageNumber AS INT, @RowspPage AS INT
            SET @PageNumber = ${page}
            SET @RowspPage = ${totalRecords} 
            SELECT *
            FROM [dbo].[${tableName}]
            ${where}
            ${orderBy}
            OFFSET (@PageNumber * @RowspPage) ROWS
            FETCH NEXT @RowspPage ROWS ONLY;
        `
    }
    this.getBranchIdQuery = function(merchantBranchId) {
        let query = `SELECT * FROM MerchantBranch Where MerchantBranchId=${merchantBranchId}`;
        return query;
    }
    this.getMerchantIds = function(merchantBranchId){
        return "(" + JSON.parse(merchantBranchId).join(",") + ")"
    }

}

module.exports = new DbFactory();