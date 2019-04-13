import { Request, Response, Router } from "express";
import * as uuid from "uuid";
var dbFactory = require("../db.factory");
var moment = require('moment');
var sql = require("mssql");
var http = require("http");

const smsRouter: Router = Router();

smsRouter.post("/sendSMS", (request: Request, response: Response) => {
    let merchantBranchId = request.headers["merchantbranchid"];
    dbFactory.get()
        // Successfull connection
        .then(function (conn) {
            // MerchantBranchId -> MerchantBranchId (MerchantBranch) ->  CitrineMerchantId (CitrineMerchantId)
            console.log('request.body', request.body);
            var campaignModel = request.body.smsCampaign;
            AddCampaignsRule(merchantBranchId, campaignModel, (data) => {
                console.log(data);
            });
            var senderId;
            dbFactory.get()
            // Successfull connection
            .then(function (conn) {
                // MerchantBranchId -> MerchantBranchId (MerchantBranch) ->  CitrineMerchantId (CitrineMerchantId)
                let query = `select SettingValue from CitrineSetting where MerchantBranchId=${merchantBranchId}  AND SettingName='SenderId'`;
                conn.request().query(query).
                    then(function (result) {
                        console.log('getSenderId ',result);
                        if (result.recordset.length > 0) {
                            senderId = result.recordset[0].SettingValue;
                            console.log("***Sender Id is*** ", result.recordset[0].SettingValue )


                        }
                    })
                    .then(function(r){
                        var campaignCustomerModel = request.body.customer;
                        for (var i = 0; i < campaignCustomerModel.length; i++) {
                            AddCampaignCustomer(campaignCustomerModel[i], (data) => {
                               // console.log("samar checking...",data);//new added
                            });
                            //console.log('campaignCustomerModel[i].PrimaryPhone', campaignCustomerModel[i].PrimaryPhone);
                             // Send SMS API goes here
    //SendSMSToCustomerWithText(campaignModel.PrimaryPhone, campaignModel.CouponCode,campaignModel.totalAmount, senderId);  //modify for transaction                        
    SendSMSToCustomerWithText(campaignCustomerModel[i].PrimaryPhone, campaignCustomerModel[i].FirstName, campaignModel.campaignText, senderId);
                        }
                    });
            });
            response.json({ message: "success", data: [] });
        });
});

function AddCampaignCustomer(model, cb) {
    dbFactory.get()
        // Successfull connection
        .then(function (conn) {
            console.log("[add] Retrieved the connection");
            let insertQuery = `
            INSERT INTO [dbo].[CampaignCustomer]
            (    [CampaignId]
                ,[StoreCustomerId]
                ,[FirstName]
                ,[LastName]
                ,[Phone]
                ,[Email]
                ,[SentDate]
                ,[isDelivered]
                ,[DeliveryDate]
                ,[CreatedDate]
                ,[CreatedBy]
            )
            VALUES (
                @CampaignId,
                @StoreCustomerId,
                @FirstName,
                @LastName,
                @Phone,
                @Email,
                @SentDate,
                @isDelivered,
                @DeliveryDate,
                @CreatedDate,
                @CreatedBy
            )
            `;
            var ps = new sql.PreparedStatement(conn)
            ps.input('CampaignId', sql.Int)
            ps.input('StoreCustomerId', sql.Int)
            ps.input('FirstName', sql.VarChar)
            ps.input('LastName', sql.VarChar)
            ps.input('Phone', sql.VarChar)
            ps.input('Email', sql.VarChar)
            ps.input('SentDate', sql.Date)
            ps.input('isDelivered', sql.VarChar)
            ps.input('DeliveryDate', sql.Date)
            ps.input('CreatedDate', sql.Date)
            ps.input('CreatedBy', sql.VarChar)
            ps.prepare(insertQuery, (err) => {
                if (!err) {
                    ps.execute({
                        'CampaignId': model.CampaignId,
                        'StoreCustomerId': model.StoreCustomerId,
                        'FirstName': model.FirstName,
                        'LastName': model.LastName,
                        'Phone': model.PrimaryPhone,
                        'Email': model.Email,
                        'SentDate': new Date(),
                        'isDelivered': model.isDelivered,
                        'DeliveryDate': null,
                        'CreatedDate': new Date(),
                        'CreatedBy': model.CreatedBy
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
        }).catch(function (err) {
            console.log(err);
            cb({
                "error": "CP-001",
                "message": "Connection failed to save customer"
            });
        });
}


function AddCampaignsRule(merchantBranchId, model, response) {
    dbFactory.get()
        // Successfull connection
        .then(function (conn) {
            let bQuery = dbFactory.getBranchIdQuery(merchantBranchId);
            var req = new sql.Request(conn);
            req.query(bQuery)
                .then(function (recordset) {
                    console.log("[add] Retrieved the connection");
                    let insertQuery = `
                    INSERT INTO [dbo].[CampaignRule]
                    (MerchantBranchId, BranchId, CampaignName, CampaignType, CampaignText,
                    CampaignTrigger, TriggerValue, CreatedDate, CreatedBy
                    )
                    VALUES (@MerchantId, @BranchId, @CampaignName, @CampaignType, 
                    @CampaignText, @CampaignTrigger, @TriggerValue, @CreatedDate, @CreatedBy)
                    `;
                    var ps = new sql.PreparedStatement(conn)
                    ps.input('MerchantId', sql.Int)
                    ps.input('BranchId', sql.Int)
                    ps.input('CampaignName', sql.NVarChar)
                    ps.input('CampaignType', sql.NVarChar)
                    ps.input('CampaignText', sql.NVarChar)
                    ps.input('CampaignTrigger', sql.VarChar)
                    ps.input('TriggerValue', sql.VarChar)
                    ps.input('CreatedDate', sql.Date)
                    ps.input('CreatedBy', sql.VarChar)
                    ps.prepare(insertQuery, (err) => {
                        if (!err) {
                            ps.execute({
                                'MerchantId': merchantBranchId,
                                'BranchId': merchantBranchId,
                                'CampaignName': model.campaignName,
                                'CampaignType': 'sms',
                                'CampaignText': model.campaignText,
                                'CampaignTrigger': model.triggerType,
                                'TriggerValue': model.triggerValue,
                                'CreatedDate': new Date(),
                                'CreatedBy': merchantBranchId
                            }, (err, result) => {
                                ps.unprepare(err => {
                                    if (!err)
                                        console.log("success ", err);
                                    else
                                        console.log(err);
                                })
                                response({
                                    "status": "SUCCESS",
                                    "message": err
                                });
                            })
                        } else {
                            console.log(err);
                            response({
                                "status": "ERROR",
                                "message": err
                            });
                        }
                    })
                }).catch(function (err) {
                    console.log(err);
                    response({
                        "status": "ERROR",
                        "message": err
                    });
                });
        }).catch(function (err) {
            console.log(err);
            response({
                "error": "CP-001",
                "message": "Connection failed to save customer"
            });
        });
}

function SendSMSToCustomerWithText(phonenumber, custName, smstext, senderId) {
    // Over write phone number for Demo Purpose
    //console.log("inside a method to check message............",phonenumber,custName);//new added
    var msg;
    var httplinkstr = "http://bhashsms.com/api/sendmsg.php?";//"http://bhashsms.com/api/sendmsg.php?";
    var usernamenpasswd = "user=xxxxxxxxx&pass=xxxxxx&sender="+senderId+"&phone=";
    if (custName == "") {
        msg = "&text=" + smstext;
    }
    else {
        // Make sure Customer Name is correct format
        custName = custName[0].toUpperCase();
        msg = "&text=Dear " + custName + "," + smstext;
    }
    var smsmode = "&priority=ndnd&stype=normal";
    var smsMsg = httplinkstr + usernamenpasswd + phonenumber + msg + smsmode;
    
    console.log(smsMsg);
    SendSMSToURL(smsMsg);
}
function SendSMSToURL(uri) {
    // get is a simple wrapper for request()
    // which sets the http method to GET
    var request = http.get(uri, function (response) {
        // data is streamed in chunks from the server
        // so we have to handle the "data" event    
        var buffer = "",
            data,
            route;
        response.on("data", function (chunk) {
            buffer += chunk;
        });
        response.on("end", function (err) {
            // finished transferring data
            // dump the raw data
            console.log('buffer', buffer);
            console.log("\n");
            var data = buffer;
            console.log("data", data);
            console.log("SMS looks good");
            return data;
        });
    }, function (err) {
        console.log("SMS Sent is not sucessful");
        return "bad";
    }
    );
}


smsRouter.post("/getCustomerInfo", (request: Request, response: Response) => {
    let merchantBranchId = request.headers["merchantbranchid"];
    dbFactory.get()
        // Successfull connection
        .then(function (conn) {
            // MerchantBranchId -> MerchantBranchId (MerchantBranch) ->  CitrineMerchantId (CitrineMerchantId)
            let query = `select FirstName, PrimaryPhone from StoreCustomer where StoreCustomerId=${request.body.StoreCustomerId}  and MerchantBranchId=${merchantBranchId}`;
            conn.request().query(query).
                then(function (result) {
                    console.log(result);
                    if (result.recordset.length > 0) {
                        response.json({ message: "success", data: result.recordset });
                    }
                });
        });
});
export { smsRouter };
