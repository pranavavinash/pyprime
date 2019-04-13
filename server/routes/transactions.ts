import { Request, Response, Router } from "express";
import * as uuid from "uuid";
var TYPES = require('tedious').TYPES;
var moment = require('moment');
var sql = require("mssql");
var dbFactory = require("../db.factory");


const transactionsRouter: Router = Router();
transactionsRouter.post("/", (request: Request, response: Response) => {
  let page = request.body.pageNumber, totalRecords = request.body.size, totalPages = request.body.totalPages;
  let merchantBranchId = dbFactory.getMerchantIds(request.headers["merchantbranchid"])
  console.log("Merchant branch id is ", dbFactory.getMerchantIds(request.headers["merchantbranchid"]), dbFactory.getMerchantIds(request.headers["merchantbranchid"]))
  getTransactions(request.body, merchantBranchId, (data) => {
      //page, totalRecords, merchantBranchId, (data) => {
        data.page.totalPages = totalPages;
        response.json(data);
  });
});

transactionsRouter.post("/search", (request: Request, response: Response) => {
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
        MerchantBranchId in ${merchantBranchId} order by CreatedDate `;
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
        MerchantBranchId in ${merchantBranchId}`;
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

function processCustomerNameRepeater(conn, merchantBranchId, result, i, cb){
    if(result.length <= i){
        cb(result);
        return;
    }
    let element = result[i];
    var req = new sql.Request(conn), customerId=element['StoreCustomerId'];
    let query = `select * from StoreCustomer where
        StoreCustomerId=${customerId} and  
        MerchantBranchId in ${merchantBranchId}`;
    req.query(query, function(err, rows, fields){
        if(rows["recordset"] && rows["recordset"][0]){
            console.log("Result ", rows["recordset"][0]);
            if(rows["recordset"][0]['LastName']){
                element["customerName"] = rows["recordset"][0]['FirstName'] + " " + rows["recordset"][0]['LastName'];          
            } else {
                element["customerName"] = rows["recordset"][0]['FirstName'];
            }
        } else {
            element["customerName"] = 0;
            console.log("Could not find transaction id");
        }
        processCustomerNameRepeater(conn, merchantBranchId, result, i+1, cb);
    });
}
function processCustomerName(result, merchantBranchId, cb){
    dbFactory.get()
        // Successfull connection
        .then(function (conn) {
            processCustomerNameRepeater(conn, merchantBranchId,result, 0, cb);
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


function getTransactions(inputData, merchantBranchId, cb){
    let page = inputData.pageNumber, totalRecords = inputData.size, totalPages = inputData.totalPages,
        sortingField = inputData.sortingField || 'CustomerInvoiceId',
        sortingOrder = inputData.sortingOrder || 'desc';
    //page, totalRecords, merchantBranchId, cb) {
    // Retrieve Customer Name
    console.log("getCustomer MerchantBranchId ", merchantBranchId);
    dbFactory.get()
        // Successfull connection
        .then(function (conn) {
            // Create request instance, passing in connection instance
            var req = new sql.Request(conn);
            req.query(`select count(*) as totalCount from [dbo].[CustomerInvoice] where MerchantBranchId in ${merchantBranchId}`)
                .then(function(recordset){
                    let totalCount = recordset["recordset"][0].totalCount; 
                    //console.log(dbFactory.getPaginationQuery('StoreCustomer', 
                    //    page, totalRecords, ` WHERE MerchantBranchId in ${merchantBranchId} `, ` ORDER BY ${sortingField} ${sortingOrder}`));
                    req.query(dbFactory.getPaginationQuery('CustomerInvoice', 
                        page, totalRecords,` WHERE MerchantBranchId in ${merchantBranchId} `, ` ORDER BY ${sortingField} ${sortingOrder}`))
                        .then(function (recordset) {
                            /*processLastTransactionDate(recordset["recordset"], merchantBranchId, (rs) => {
                                processTotalTransactions(rs, merchantBranchId, (frs) => {
                                    let data = {
                                        "data" : frs,
                                        "page" : {
                                            "pageNumber": page,
                                            "totalElements" : totalCount,
                                            "totalPages" : 0,
                                            "sortingField" : sortingField,
                                            "sortingOrder" : sortingOrder
                                        }
                                    };
                                    cb(data);
                                });
                            }); */

                            processCustomerName(recordset["recordset"], merchantBranchId, (frs) => {
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


function AddTransaction(model, merchantBranchId,customer_id, cb) {
        dbFactory.get()
        // Successfull connection
        .then(function (conn) {
            console.log("[add] Retrieved the connection");
            console.log("model and merchantid", model, merchantBranchId,"----------");

            let insertQuery = `
                INSERT INTO [dbo].[CustomerInvoice]
                (MerchantBranchId, StoreCustomerId, InvoiceDate, TotalInvoiceAmount, DiscountAmount, TaxAmount,
                CouponCode, CreatedDate, CreatedBy)
                VALUES (@MerchantId, @StoreCustomerId, @InvoiceDate, @TotalInvoiceAmount,
                @DiscountAmount, @TaxAmount, @CouponCode, @CreatedDate, @CreatedBy)
                `;
           var ps = new sql.PreparedStatement(conn)
            ps.input('MerchantId', sql.Int)
            ps.input('StoreCustomerId', sql.VarChar)
            ps.input('InvoiceDate', sql.VarChar)
            ps.input('TotalInvoiceAmount', sql.VarChar)
            ps.input('DiscountAmount', sql.VarChar)
            ps.input('CouponCode', sql.VarChar)
            ps.input('TaxAmount', sql.VarChar)
            ps.input('CreatedDate', sql.Date)
            ps.input('CreatedBy', sql.VarChar)
            ps.prepare(insertQuery, (err) => {
                if(!err){
                    ps.execute({
                        'MerchantId' : merchantBranchId,
                        //'StoreCustomerId' :  model.storeCustomerId,
                        'StoreCustomerId' :  customer_id,
                        'InvoiceDate' : model.invoiceDate,
                        'TotalInvoiceAmount' :  model.totalAmount,
                        'DiscountAmount' :  model.discountAmount,
                        'TaxAmount' :  model.taxAmount,
                        'CouponCode' : model.CouponCode,
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

transactionsRouter.post("/add", (request: Request, response: Response) => {

    let merchantBranchId = request.headers["merchantbranchid"];
    let model = request.body;
    console.log("Model is ", model);
    var customer_phone= model.phoneNo;//new add
    console.log("Customer phone----",customer_phone);
    console.log("Merchant Id found---",merchantBranchId);
    let customer_id;
    dbFactory.get()
        // Successfull connection
    .then(function (conn) {
let query = `select StoreCustomerId  from StoreCustomer where MerchantBranchId='${merchantBranchId}' AND PrimaryPhone='${model.phoneNo}'`;    
            conn.request().query(query).
                       then(function (result) 
                       {
                       console.log('datas found after query....',result);
                       if (result.recordset.length > 0) 
                       {
                       customer_id = result.recordset[0].StoreCustomerId;
                       console.log("---------Customer Id---",customer_id );
                       }
                       })
                       .then(function(r){
        AddTransaction(model, merchantBranchId,customer_id, (data) => {
            console.log(data);
            response.json(data);
            })
        });
        
    });
    /*AddTransaction(model, merchantBranchId, (data) => {
        response.json(data);
        
    });*/
});



export { transactionsRouter, AddTransaction };



