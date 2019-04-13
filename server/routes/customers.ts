import { Request, Response, Router } from "express";
import * as uuid from "uuid";
var TYPES = require('tedious').TYPES;
var moment = require('moment');
var sql = require("mssql");
var dbFactory = require("../db.factory");


const customersRouter: Router = Router();
customersRouter.post("/", (request: Request, response: Response) => {
  let page = request.body.pageNumber, totalRecords = request.body.size, totalPages = request.body.totalPages;
  let merchantBranchId = dbFactory.getMerchantIds(request.headers["merchantbranchid"])
  console.log("Merchant branch id is ", dbFactory.getMerchantIds(request.headers["merchantbranchid"]), dbFactory.getMerchantIds(request.headers["merchantbranchid"]))
  getCustomers(request.body, merchantBranchId, (data) => {
      //page, totalRecords, merchantBranchId, (data) => {
        data.page.totalPages = totalPages;
        response.json(data);
  });
});

customersRouter.post("/:id/comment", (request: Request, response: Response) => {

  const feedID = request.params.id;

  response.json({
    comment: {
      id: uuid.v4(),
      text: request.body.text,
    },
    id: feedID,
  });

});

customersRouter.delete("/:id", (request: Request, response: Response) => {
  response.json({
    id: request.params.id,
  });

});

function AddCustomer(model, merchantBranchId, cb) {
        dbFactory.get()
        // Successfull connection
        .then(function (conn) {
            console.log("[add] Retrieved the connection");
            let insertQuery = `
                INSERT INTO [dbo].[StoreCustomer]
                ( MerchantBranchId, Source, CustomerType, FirstName, LastName, CompanyName,
                  CompanyWebsite, PrimaryPhone, SecondaryPhone, Email, Address1,
                  Address2, Country, State, City, ZipCode, BirthMonth, BirthDay,
                  AnnivMonth, AnnivDay, CreatedDate, CreatedBy
                )
                VALUES (@MerchantId, @Source, @CustomerType, @FirstName,
                @LastName, @CompanyName, @CompanyWebsite, @PrimaryPhone,
                @SecondaryPhone, @Email, @Address1, @Address2, @Country, @State,
                @City, @ZipCode, @BirthMonth, @BirthDay, @AnnivMonth, @AnnivDay,
                @CreatedDate, @CreatedBy)
                `;
           var ps = new sql.PreparedStatement(conn)
            ps.input('MerchantId', sql.Int)
            ps.input('Source', sql.VarChar)
            ps.input('CustomerType', sql.VarChar)
            ps.input('FirstName', sql.VarChar)
            ps.input('LastName', sql.VarChar)
            ps.input('CompanyName', sql.VarChar)
            ps.input('CompanyWebsite', sql.VarChar)
            ps.input('PrimaryPhone', sql.VarChar)
            ps.input('SecondaryPhone', sql.VarChar)
            ps.input('Email', sql.VarChar)
            ps.input('Address1', sql.VarChar)
            ps.input('Address2', sql.VarChar)
            ps.input('Country', sql.VarChar)
            ps.input('State', sql.VarChar)
            ps.input('City', sql.VarChar)
            ps.input('ZipCode', sql.VarChar)
            ps.input('BirthMonth', sql.VarChar)
            ps.input('BirthDay', sql.Int)
            ps.input('AnnivMonth', sql.VarChar)
            ps.input('AnnivDay', sql.Int)
            ps.input('CreatedDate', sql.Date)
            ps.input('CreatedBy', sql.VarChar)
            ps.prepare(insertQuery, (err) => {
                if(!err){
                    ps.execute({
                        'MerchantId' : merchantBranchId,
                        'Source' :  model.source,
                        'CustomerType' : model.customerType,
                        'FirstName' :  model.firstName,
                        'LastName' :  model.lastName,
                        'CompanyName' :  model.companyName,
                        'CompanyWebsite' :  model.companyWebsite,
                        'PrimaryPhone' : model.primaryPhone,
                        'SecondaryPhone' : model.secondaryPhone,
                        'Email' :  model.email,
                        'Address1' :  model.address1,
                        'Address2' :  model.address2,
                        'Country' :  model.country,
                        'State' :  model.state,
                        'City' :  model.city,
                        'ZipCode' :  model.zipCode,
                        'BirthMonth' :  model.birthMonth,
                        'BirthDay' :  model.birthDay,
                        'AnnivMonth' :  model.annivMonth,
                        'AnnivDay' :  model.annivDay,
                        'CreatedDate' :  new Date(),
                        'CreatedBy' :  model.createdBy
                     }, (err, result) => {
                         
                         ps.unprepare(err => {
                             if(err) 
                                console.log("Error while unprepare ", err);
                         })
                        cb({
                            "status" : "SUCCESS",
                            "message" : err
                        });
                     })
                } else {
                    console.log(err);
                    cb({
                        "status" : "ERROR",
                        "message" : err
                    });
                }
            })

        }).catch(function(err){
            console.log(err);
            cb({
                "error" : "CP-001",
                "message" : "Connection failed to save customer"
            });              
        });
}

customersRouter.post("/add", (request: Request, response: Response) => {
    let merchantBranchId = request.headers["merchantbranchid"];
    let model = request.body;
    console.log("Model is ", model);
    AddCustomer(model, merchantBranchId, (data) => {
        response.json(data);
    });

});

customersRouter.post("/searchByMobile", (request:Request, response:Response) => {
    let merchantBranchId = request.headers["merchantbranchid"];
    let searchStr = request.body.searchStr;
    console.log("Search Str is ", searchStr);
    FindByMobile(searchStr, merchantBranchId, (data) => {
        response.json(data);
    });
});

function FindByMobile(searchStr, merchantBranchId, cb){
    dbFactory.get()
        // Successfull connection
        .then(function (conn) {
            var req = new sql.Request(conn);
            console.log("Query is ", `select * from [dbo].[StoreCustomer] WHERE MERCHANTBRANCHID=${merchantBranchId} and PrimaryPhone LIKE '%${searchStr}%'`);
            req.query(`select * from [dbo].[StoreCustomer] WHERE MERCHANTBRANCHID=${merchantBranchId} and PrimaryPhone LIKE '%${searchStr}%'`)
                .then(function(recordset){
                    cb({
                        data: recordset
                    })
                }).catch(function(err){
                    console.log(err);
                    cb({
                        "status" : "Failed",
                        "message" : err
                    });
                });
 
    }) 
}

customersRouter.post("/search", (request: Request, response: Response) => {
  let merchantBranchId = dbFactory.getMerchantIds(request.headers["merchantbranchid"])
  let page = request.body.pageNumber, searchTerm = request.body.searchTerm, totalRecords = request.body.size, totalPages = request.body.totalPages;
  getSearchResults(searchTerm, page, totalRecords, merchantBranchId, (data) => {
        data.page.totalPages = totalPages;
        response.json(data);
  });
});

function processLastTransactionDateRepeater(conn, merchantBranchId, result, i, cb){
    if(result.length <= i){
        cb(result);
        return;
    }
    let element = result[i];
    var req = new sql.Request(conn), customerId=element['StoreCustomerId'];
    let query = `select top 1 * from CustomerInvoice where
        StoreCustomerId=${customerId} and  
        merchantbranchid in ${merchantBranchId} order by CreatedDate `;
    req.query(query, function(err, rows, fields){
        if(rows["recordset"][0]){
            if(rows["recordset"][0]['InvoiceDate']){
                 var startDate = moment(rows["recordset"][0]['InvoiceDate']).format("YYYY-MM-DD");
                 var endDate   = moment(new Date()).format("YYYY-MM-DD");
                 var remainingDate = moment(endDate).diff(startDate, 'days');
                 element["lastSeenFor"] = remainingDate;
                 element["lastTransactionAmt"] = rows["recordset"][0]['TotalInvoiceAmount'];
                 element["lastTransactionDate"] = rows["recordset"][0]['InvoiceDate'];
            } else {
                 element["lastSeenFor"] = '';
                 element["lastTransactionAmt"] = 0;
                 element["lastTransactionDate"] = '';
            }
        } else {
            console.log("Could not find transaction id");
        }
        processLastTransactionDateRepeater(conn, merchantBranchId, result, i+1, cb);
    });
}

function processLastTransactionDate(result, merchantBranchId, cb) {
    dbFactory.get()
        // Successfull connection
        .then(function (conn) {
            processLastTransactionDateRepeater(conn, merchantBranchId,result, 0, cb);
    })
}

function processTotalTransactionsRepeater(conn, merchantBranchId, result, i, cb){
    if(result.length <= i){
        cb(result);
        return;
    }
    let element = result[i];
    var req = new sql.Request(conn), customerId=element['StoreCustomerId'];
    let query = `select count(*) as Count, sum(TotalInvoiceAmount) as TotalAmount from CustomerInvoice where
        StoreCustomerId=${customerId} and  
        merchantbranchid in ${merchantBranchId}`;
    req.query(query, function(err, rows, fields){
        console.log("Result ", rows["recordset"][0]);
        if(rows["recordset"][0]){
            element["totalTransactions"] = rows["recordset"][0]['Count'];
            element["totalAmount"] = rows["recordset"][0]['TotalAmount'];
        } else {
            element["totalAmount"] = 0;
            console.log("Could not find transaction id");
        }
        processTotalTransactionsRepeater(conn, merchantBranchId, result, i+1, cb);
    });
}
function processTotalTransactions(result, merchantBranchId, cb) {
    dbFactory.get()
        // Successfull connection
        .then(function (conn) {
            processTotalTransactionsRepeater(conn, merchantBranchId,result, 0, cb);
    })
}

function getSearchResults(searchTerm, page, totalRecords, merchantBranchId, cb){
        dbFactory.get()
        // Successfull connection
        .then(function (conn) {
            // Create request instance, passing in connection instance
            var req = new sql.Request(conn);
            let wherequery = ` WHERE MerchantBranchId in ${merchantBranchId} AND (FirstName LIKE '%${searchTerm}%'
                              OR 
                             LastName LIKE  '%${searchTerm}%'
                             OR 
                             Email LIKE  '%${searchTerm}%' 
                             OR 
                             Address1 LIKE  '%${searchTerm}%' 
                             OR 
                             CompanyName LIKE  '%${searchTerm}%')`;
            req.query("select count(*) as totalCount from [dbo].[StoreCustomer] " + wherequery)
                .then(function(recordset){
                    let totalCount = recordset["recordset"][0].totalCount; 
                    req.query(dbFactory.getPaginationQuery('StoreCustomer ', 
                        page, totalRecords, wherequery, " ORDER BY StoreCustomerId"))
                        .then(function (recordset) {
                            processLastTransactionDate(recordset["recordset"], merchantBranchId, (rs) => {
                                processTotalTransactions(rs, merchantBranchId, (frs) => {
                                    let data = {
                                        "data" : frs,
                                        "page" : {
                                            "pageNumber": page,
                                            "totalElements" : totalCount,
                                            "totalPages" : 0,
                                            size: totalRecords
                                        }
                                    };
                                    cb(data);
                                });
                            });
                        })
                        // Handle sql statement execution errors
                        .catch(function (err) {
                            console.log(err);
                            cb({
                                "status" : "Failed",
                                "message" : err
                            });
                        });
                }).catch(function(err){
                    console.log(err);
                    cb({
                        "status" : "Failed",
                        "message" : err
                    });
                });
        })
        // Handle connection errors
        .catch(function (err) {
            cb({
                "status" : "Failed",
                "message" : err
            });
            console.log(err);
        });
}


function getCustomers(inputData, merchantBranchId, cb){
    let page = inputData.pageNumber, totalRecords = inputData.size, totalPages = inputData.totalPages,
        sortingField = inputData.sortingField || 'StoreCustomerId',
        sortingOrder = inputData.sortingOrder || 'desc';
    //page, totalRecords, merchantBranchId, cb) {
    console.log("getCustomer MerchantBranchId ", merchantBranchId);
    dbFactory.get()
        // Successfull connection
        .then(function (conn) {
            // Create request instance, passing in connection instance
            var req = new sql.Request(conn);
            req.query(`select count(*) as totalCount from [dbo].[StoreCustomer] where MerchantBranchId in ${merchantBranchId}`)
                .then(function(recordset){
                    let totalCount = recordset["recordset"][0].totalCount; 
                    //console.log(dbFactory.getPaginationQuery('StoreCustomer', 
                    //    page, totalRecords, ` WHERE MerchantBranchId=${merchantBranchId} `, ` ORDER BY ${sortingField} ${sortingOrder}`));
                    req.query(dbFactory.getPaginationQuery('StoreCustomer', 
                        page, totalRecords,` WHERE MerchantBranchId in ${merchantBranchId} `, ` ORDER BY ${sortingField} ${sortingOrder}`))
                        .then(function (recordset) {
                            processLastTransactionDate(recordset["recordset"], merchantBranchId, (rs) => {
                                processTotalTransactions(rs, merchantBranchId, (frs) => {
                                    let data = {
                                        "data" : frs,
                                        "page" : {
                                            "pageNumber": page,
                                            "totalElements" : totalCount,
                                            "totalPages" : 0,
                                            "sortingField" : sortingField,
                                            "sortingOrder" : sortingOrder,
                                            size: totalRecords
                                        }
                                    };
                                    cb(data);
                                });
                            });
                        })
                        // Handle sql statement execution errors
                        .catch(function (err) {
                            console.log(err);
                            cb({
                                "status" : "Failed",
                                "message" : err
                            });
                        });
                }).catch(function(err){
                    console.log(err);
                    cb({
                        "status" : "Failed",
                        "message" : err
                    });
                });
        })
        // Handle connection errors
        .catch(function (err) {
            cb({
                "status" : "Failed",
                "message" : err
            });
            console.log(err);
        });
}


export { customersRouter, AddCustomer };



