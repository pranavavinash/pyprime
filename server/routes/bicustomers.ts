import { Request, Response, Router } from "express";
import * as uuid from "uuid";
import * as http_request from "request";
import * as rp from "request-promise-native";
var TYPES = require('tedious').TYPES;
var moment = require('moment');
var sql = require("mssql");
var dbFactory = require("../db.factory");
var count=0;
var access_token = null;
var embed_token = null;
var embed_token1 = null;
// var async = require("async");
const bicustomersRouter: Router = Router();

bicustomersRouter.post("/", (request: Request, response: Response) => {
    //console.log('iam body',request.headers.merchantbranchid);
    getData(request.headers.merchantbranchid, (data) => {
        //page, totalRecords, merchantBranchId, (data) => {

            if(data.status=='Failed'){
                response.json({error: 'No report Found'});
            }
        var loginBody = "grant_type=password&client_id=" + data.data['Client-id'] + "&resource=https://analysis.windows.net/powerbi/api&scope=openid&username=" + data.data['PbiLogin'] + "&password=" + data.data['pbipasswd'];
        //console.log(loginBody);
        var options = {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            uri: 'https://login.microsoftonline.com/common/oauth2/token',
            body: loginBody,
        };

        rp(options)
            .then(function (body) {
                var b = JSON.parse(body);
                access_token = b.access_token;
                console.log('this is customer report body', b.access_token);
                //console.log('this is body', b.access_token);

                var reportId = data.data['Report-id'];
                var groupId = data.data['Group-id'];

                //console.log("Customer ReportId :-"+ reportId);
                //console.log("Customer GroupId :-"+ groupId);

                if (reportId == '') {

                    reportId = "data.data['Report-id']";
                    groupId = "data.data['Group-id']";
                }

                var options2 = {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + access_token },
                    uri: 'https://api.powerbi.com/v1.0/myorg/groups/' + groupId + '/reports/' + reportId + '/GenerateToken',
                    form: { accessLevel: 'View' }
                };

                rp(options2)
                    .then(function (body1) {
                        var c = JSON.parse(body1);
                        console.log(c.token);
                        embed_token = c.token;
                        data.access_token = access_token;
                        data.embed_token = embed_token;
                        response.json(data);
                    })
                    .catch(function (err) {
                        console.log(err);
                        response.json({ error: 'No report Found' });
                    });
            })
            .catch(function (err) {
                //console.log(err);
                response.json({ error: 'No report Found' });
            });
    });
});

function getData(inputData, cb) {
    console.log("Dashboard MerchantBranchId ", inputData);
    var merchantBranchId = inputData.substr(1).slice(0, -1);
    console.log(merchantBranchId)
    dbFactory.get()
        // Successfull connection
        .then(function (conn) {
            // Create request instance, passing in connection instance
            var req = new sql.Request(conn);
            req.query(`select * from  [dbo].[CitrinePowerBISettings]  where (MerchantBranchId=${merchantBranchId} and ReportType='customer') or ReportType='noreport' ORDER BY ReportType desc`)
                .then(function (recordset) {
                    //   console.log('this is report id',recordset["recordset"][0]['Report-id']);
                    //console.log('this is report idasdasdasdasdasdasdasdasdasdasdasddasdsa',recordset);

                    let data = {
                        "data": recordset["recordset"][0]
                    };
                    //console.log(recordset["recordset"][0]['Client-id'].length,"llllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllll");

                    cb(data);
                }).catch(function (err) {
                    cb({
                        "status": "Failed",
                        "message": err
                    });
                });
        })
        // Handle connection errors
        .catch(function (err) {
            cb({
                "status": "Failed",
                "message": err
            });
            //console.log(err);
        });
}


bicustomersRouter.post("/add", (request: Request, response: Response) => {
    let merchantBranchId = request.headers["merchantbranchid"];
    let model = request.body;
    console.log("Model is ", model);
    BiAddCustomer(model, merchantBranchId, (data) => {
        response.json(data);
    });

});
bicustomersRouter.post("/uploadBiCustomers", (request: Request, response: Response) => {
    let merchantBranchId = request.headers["merchantbranchid"];
    let model1 = request.body;
    let model = model1.excelData;
    console.log(model);
    processArray(model);
    function delay()
    {
        return new Promise(resolve => setTimeout(resolve,500));
    }
    async function delayedLog(RecCust)
    {
        await delay();
        count++;
        console.log("Count :",count);                                                          
        BiUploadCustomer(RecCust, merchantBranchId, (data) => {
        });    
    }
    async function processArray(stRec)
    {
    for(const custRec of stRec){
    await delayedLog(custRec);
    }
    console.log("***Process complete***");
    }
});

//function BiUploadCustomer(model, merchantBranchId) 
function BiUploadCustomer(model, merchantBranchId, cb) 
{
    var phone;
    dbFactory.get()
        // Successfull connection
        .then(function (conn) {
            // console.log("[add] Retrieved the connection");
            // console.log("inside bicustomer...",model);
            let Custquery = `select PrimaryPhone from  StoreCustomer where MerchantBranchId='${merchantBranchId}' and PrimaryPhone='${model.PrimaryPhone}'`;                               
            conn.request().query(Custquery).
            then(function (result) {
            if (result.recordset.length > 0)
            {
                //console.log("duplicate data found...");
                // phone = result.recordset[0].PrimaryPhone;
                // console.log(phone);
            }
            else{
                //console.log("data not found");
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
                if (!err) {
                    ps.execute({
                        'MerchantId': merchantBranchId,
                        'Source': 'upload',
                        'CustomerType': 'STARTSMS',
                        'FirstName': model.FirstName,
                        'LastName': model.LastName,
                        'CompanyName': '',
                        'CompanyWebsite': '',
                        'PrimaryPhone': model.PrimaryPhone,
                        'SecondaryPhone': model.SecondaryPhone,
                        'Email': model.Email,
                        'Address1': model.Address1,
                        'Address2': model.Address2,
                        'Country': model.Country,
                        'State': model.State,
                        'City': model.City,
                        'ZipCode': model.ZipCode,
                        'BirthMonth': model.BirthMonth,
                        'BirthDay': model.BirthDay,
                        'AnnivMonth': model.AnnivMonth,
                        'AnnivDay': model.AnnivDay,
                        'CreatedDate': new Date(),
                        'CreatedBy': ''
                    }, (err, result) => {

                        ps.unprepare(err => {
                            if (err)
                                console.log("Error while unprepare ", err);
                        })
                        cb({

                            "status": "SUCCESS",
                            "message": err
                        });
                    })
                } else {
                    console.log(err);
                    cb({
                        "status": "ERROR",
                        "message": err
                    });
                }
            })

            }//end else condition
            });


        }).catch(function (err) {
            console.log(err);
            // cb({
            //     "error": "CP-001",
            //     "message": "Connection failed to save customer"
            // });
        });
}
//
function BiAddCustomer(model, merchantBranchId, cb) {
var ifExistPhoneNo;
    dbFactory.get()
        // Successfull connection
        .then(function (conn) {
            console.log("[add] Retrieved the connection");
            console.log("inside bicustomer...",model);

            IfExistPhoneNo(merchantBranchId,model.primaryPhone, (data) => {
                // console.log("TOTAL NO OF CUSTOMER : #1", data.data.recordset["0"].TotalCustomer);
                // totalCustomerRecord = data.data.recordset["0"].TotalCustomer;
                ifExistPhoneNo = data.status;
                if(data.data.recordset.length > 0){
                    console.log("Phone No already exist !!!");
                    cb({
                        "status": "ERROR1",
                    });
                }
                else
                {
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
                        if (!err) {
                            ps.execute({
                                'MerchantId': merchantBranchId,
                                'Source': 'dashboard',
                                'CustomerType': model.customerType,
                                'FirstName': model.firstName,
                                'LastName': model.lastName,
                                'CompanyName': model.companyName,
                                'CompanyWebsite': model.companyWebsite,
                                'PrimaryPhone': model.primaryPhone,
                                'SecondaryPhone': model.secondaryPhone,
                                'Email': model.email,
                                'Address1': model.addressLine1,
                                'Address2': model.addressLine2,
                                'Country': model.country,
                                'State': model.state,
                                'City': model.city,
                                'ZipCode': model.pinCode,
                                'BirthMonth': model.birthMonth,
                                'BirthDay': model.birthDay,
                                'AnnivMonth': model.annivMonth,
                                'AnnivDay': model.annivDay,
                                'CreatedDate': new Date(),
                                'CreatedBy': model.createdBy
                            }, (err, result) => {
        
                                ps.unprepare(err => {
                                    if (err)
                                        console.log("Error while unprepare ", err);
                                })
                                cb({
        
                                    "status": "SUCCESS",
                                    "message": err
                                });
                            })
                        } else {
                            console.log(err);
                            cb({
                                "status": "ERROR",
                                "message": err
                            });
                        }
                    })
                }
            });
        }).catch(function (err) {
            console.log(err);
            cb({
                "error": "CP-001",
                "message": "Connection failed to save customer"
            });
        });
}



bicustomersRouter.post("/update", (request: Request, response: Response) => {

    let model = request.body;
    let merchantBranchId = request.headers["merchantbranchid"];
    console.log("Before update query...",model);
    var birthDay,annivDay,smsType;
    if(model.customerType != null)
    {
        smsType = model.customerType;
    }
    else{
        smsType = "NULL";
    }
    if(model.birthDay == null)
    {
        birthDay = 0;
    }else{
        birthDay = model.birthDay;
    }
    if(model.annivDay == null)
    {
        annivDay = 0;
    }else{
        annivDay = model.annivDay;
    }

     dbFactory.get()
        // Successfull connection
        .then(function (conn) {
            let bQuery = `UPDATE StoreCustomer set 
                FirstName= '${model.firstName}',  
                LastName = '${model.lastName}', 
                CompanyName = '${model.companyName}', 
                PrimaryPhone = '${model.primaryPhone}',
                CustomerType = '${smsType}',  
                SecondaryPhone = '${model.secondaryPhone}', 
                Email = '${model.email}',  
                Address1 = '${model.addressLine1}',  
                Address2 = '${model.addressLine2}',  
                Country= '${model.country}',  
                City = '${model.city}',  
                State = '${model.state}',
                ZipCode = '${model.pinCode}',
                BirthMonth = '${model.birthMonth}',
                BirthDay = '${birthDay}',
                AnnivMonth = '${model.annivMonth}',
                AnnivDay = '${annivDay}'
Where StoreCustomerId='${model.customer_id}' and MerchantBranchId='${merchantBranchId}'`;  
            console.log("Update query is ", bQuery);
            var req = new sql.Request(conn);
            req.query(bQuery)
                .then(function (recordset) {
                    response.json({
                        "status": "Succcess",
                        "message": ""
                    });
                    console.log("success.....1");//success
                })
                .catch(function (err) {
                    response.json({
                        "status": "Failed",
                        "message": err
                    });
                    console.log("failed..1");//failed
                });
        }).catch(function (err) {
            response.json({
                "status": "Failed",
                "message": err
            });
            console.log("failed..2");//failed
        });
});


bicustomersRouter.post("/delete", (request: Request, response: Response) => {

    let model = request.body;
    let merchantBranchId = request.headers["merchantbranchid"]

    dbFactory.get()
        // Successfull connection
        .then(function (conn) {
            let bQuery = `DELETE from StoreCustomer 
                    Where PrimaryPhone='${model.primaryPhone}'`;
            console.log("Update query is ", bQuery)
            var req = new sql.Request(conn);
            req.query(bQuery)
                .then(function (recordset) {
                    response.json({
                        "status": "Succcess",
                        "message": ""
                    });
                })
                .catch(function (err) {
                    response.json({
                        "status": "Failed",
                        "message": err
                    });
                });
        }).catch(function (err) {
            response.json({
                "status": "Failed",
                "message": err
            });
        });
});


function IfExistPhoneNo(merchantBranchId,phone, cb) {
    dbFactory.get()
        // Successfull connection
        .then(function (conn) {
            var req = new sql.Request(conn);
            console.log("Query is ", `select * from [dbo].[StoreCustomer] WHERE MERCHANTBRANCHID=${merchantBranchId} and PrimaryPhone=${phone}`);
            req.query(`select * from [dbo].[StoreCustomer] where MerchantBranchId=${merchantBranchId} and PrimaryPhone=${phone}`)
                .then(function (recordset) {
                    cb({
                        data: recordset,
                        "status": "Exist",
                    })
                }).catch(function (err) {
                    console.log(err);
                    cb({
                        "status": "NotExist",
                        "message": err
                    });
                });
        })
}


export { bicustomersRouter, BiAddCustomer };
