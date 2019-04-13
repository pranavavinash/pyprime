import { Request, Response, Router } from "express";
import * as uuid from "uuid";
import * as http_request from "request";
import * as rp from "request-promise-native";
var TYPES = require('tedious').TYPES;
var moment = require('moment');
var sql = require("mssql");
var http = require("http");
var dbFactory = require("../db.factory");
var access_token = null;
var embed_token = null;
var embed_token1     = null;
const bitransactionsRouter: Router = Router();

bitransactionsRouter.post("/", (request: Request, response: Response) => {


console.log('iam body',request.headers.merchantbranchid);
  getData(request.headers.merchantbranchid, (data) => {

    if(data.status=='Failed'){
        response.json({error: 'No report Found'});
    }

    //page, totalRecords, merchantBranchId, (data) => {
        var loginBody = "grant_type=password&client_id=" + data.data['Client-id'] + "&resource=https://analysis.windows.net/powerbi/api&scope=openid&username=" + data.data['PbiLogin'] + "&password=" + data.data['pbipasswd'];

        var options = {
            method: 'POST',
            headers: {'content-type' : 'application/x-www-form-urlencoded'},
            uri: 'https://login.microsoftonline.com/common/oauth2/token',
            body: loginBody,
        };

        rp(options)
            .then(function (body) {
                var b = JSON.parse(body);
                access_token = b.access_token;
                //console.log('this is body', b.access_token);
                //console.log('this is body', b.access_token);
                
                var reportId = data.data['Report-id'];
                var groupId = data.data['Group-id'];

                if(reportId=='')
                {
                    
                 reportId = "data.data['Report-id']";
                 groupId = "data.data['Group-id']";
                }

                var options2 = {
                    method: 'POST',
                    headers: {'Authorization' :'Bearer ' + access_token},
                    uri: 'https://api.powerbi.com/v1.0/myorg/groups/' + groupId + '/reports/' + reportId + '/GenerateToken',
                    form: {accessLevel: 'View'}
                };

                rp(options2)
                    .then(function (body1) {
                        var c = JSON.parse(body1);
                        //console.log(c.token);
                        embed_token = c.token;
                        data.access_token = access_token;
                        data.embed_token = embed_token;
                        response.json(data);
                    })
                    .catch(function (err) {
                        //console.log(err);
                        response.json({error: 'No report Found'});
                    });
            })
            .catch(function (err) {
                console.log(err);
                response.json({error: 'No report Found'});
            });
});
});

function getData(inputData, cb){
  console.log("Dashboard MerchantBranchId ", inputData);
  var merchantBranchId = inputData.substr(1).slice(0, -1);
  console.log(merchantBranchId)
  dbFactory.get()
      // Successfull connection
      .then(function (conn) {
          // Create request instance, passing in connection instance
          var req = new sql.Request(conn);
          req.query(`select * from  [dbo].[CitrinePowerBISettings]  where (MerchantBranchId=${merchantBranchId} and ReportType='transaction') or ReportType='noreport' ORDER BY ReportType desc`)
              .then(function(recordset){
                console.log('this is report id',recordset["recordset"][0]['Report-id']);
                console.log('this is report idasdasdasdasdasdasdasdasdasdasdasddasdsa',recordset);
                
                  let data = {
                    "data" : recordset["recordset"][0]
                    };
                    //console.log(recordset["recordset"][0]['Client-id'].length,"llllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllll");
                    
                cb(data);
              }).catch(function(err){
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

bitransactionsRouter.post("/sendSMStobiTransaction", (request: Request, response: Response) => {
    let merchantBranchId = request.headers["merchantbranchid"];
    dbFactory.get()
        // Successfull connection
        .then(function (conn) {
            // MerchantBranchId -> MerchantBranchId (MerchantBranch) ->  CitrineMerchantId (CitrineMerchantId)
            console.log('request.body', request.body);
            var campaignModel = request.body.smsCampaign;
            console.log("...Inside bitranstn ts file.... ",campaignModel);
            var customer_phone= campaignModel.phoneNo;//new add
            console.log("Customer phone----",customer_phone);
            console.log("Merchant Id found---",merchantBranchId);
        let customer_id;
        let customer_fstname;
        dbFactory.get()
        .then(function (conn) {
//let query = `select FirstName from StoreCustomer where MerchantBranchId=${merchantBranchId}  AND PrimaryPhone=${customer_phone}`;
let query = `select StoreCustomerId,FirstName  from StoreCustomer where MerchantBranchId='${merchantBranchId}' AND PrimaryPhone='${campaignModel.phoneNo}'`;    
 conn.request().query(query).
            then(function (result) 
            {
            console.log('datas found after query....',result);
            if (result.recordset.length > 0) 
            {
            customer_id = result.recordset[0].StoreCustomerId;
            customer_fstname = result.recordset[0].FirstName;
            console.log("---------Customer Id---",customer_id );
            console.log("---------Customer firstNem---",customer_fstname );
            }
            })  //; was here
            .then(function(r){
        AddTransaction(merchantBranchId, campaignModel, customer_id, (data) => {
                 console.log(data);
                 })
             });
            });
            //smstxt1
            var smstxt1;
            dbFactory.get()
            .then(function (conn) {
            let query = `select SettingValue from CitrineSetting where MerchantBranchId=${merchantBranchId}  AND SettingName='TSMSText1'`;
            conn.request().query(query).
            then(function (result) {
            if (result.recordset.length > 0) {
                smstxt1 = result.recordset[0].SettingValue;
                console.log("SMStext1 is -> ", result.recordset[0].SettingValue );
                }
            });
        });
        var smstxt2;
        dbFactory.get()
        .then(function (conn) {
        let query = `select SettingValue from CitrineSetting where MerchantBranchId=${merchantBranchId}  AND SettingName='TSMSText2'`;
        conn.request().query(query).
        then(function (result) {
        if (result.recordset.length > 0) {
            smstxt2 = result.recordset[0].SettingValue;
            console.log("SMStext2 is -> ", result.recordset[0].SettingValue );
            }
        });
    });
            //end smstxt2
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
                //smstxt1 = result.recordset[0].SettingValue;
                console.log("***Sender Id is*** ", result.recordset[0].SettingValue );
               //console.log("***Transaction SMS1**",smstxt1);
                }
            })
            .then(function(r)
            {
                let campaignCustomerModel = request.body.smsCampaign;
                console.log("sms snd to customer...",campaignCustomerModel);
    //SendSMSToCustomerWithText(campaignCustomerModel.phoneNo, campaignCustomerModel.totalAmount, campaignCustomerModel.CouponCode, customer_fstname, senderId);
    SendSMSToCustomerWithText(campaignCustomerModel.phoneNo, campaignCustomerModel.totalAmount,smstxt1, smstxt2, customer_fstname, senderId);          
            });
        });
        response.json({ message: "success", data: [] });
    });
});

function AddTransaction(merchantBranchId,model,customer_id, cb) {
    dbFactory.get()
    // Successfull connection
    .then(function (conn) {
        console.log("[add] Retrieved the connection");
        console.log("model and merchantid", model, merchantBranchId,"----------");
        console.log(" customerid", customer_id,"----------");
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
                   // 'StoreCustomerId' :  model.storeCustomerId,
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
//new added code for sms
//function SendSMSToCustomerWithText(phonenumber, custName, smstext, senderId) 
//function SendSMSToCustomerWithText(phonenumber, totalAmount, CouponCode, customer_fstname, senderId) 
function SendSMSToCustomerWithText(phonenumber, totalAmount, smstxt1, smstxt2, customer_fstname, senderId) 
{
    // Over write phone number for Demo Purpose
    var msg;
    var httplinkstr = "http://bhashsms.com/api/sendmsg.php?";
    var usernamenpasswd = "user=prabhusrivastava&pass=123456&sender=" + senderId + "&phone=";
    //var usernamenpasswd = "user=xxxxxxxxxx&pass=xxxxxxxx&sender=" + senderId + "&phone=";

    if (customer_fstname == "") {
        //msg = "&text=" + CouponCode;
        //msg="&text=Dear Customer"+ totalAmount + "Thank You";
        msg="&text=Dear Customer"+smstxt1+" " + totalAmount +" "+smstxt2;
    }
    else 
    {
        //custName = custName[0].toUpperCase();
        
       // msg = "&text=Dear "+customer_fstname+ ", You have made a transation of Rs." + totalAmount + " and your Coupon Code is " + CouponCode + " Please visit us again, Thank you";
       msg = "&text=Dear "+customer_fstname+" "+smstxt1+" " + totalAmount +" "+smstxt2;
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
    }, 
    function (err) {
        console.log("SMS Sent is not sucessful");
        return "bad";
    }
    );
}





export { bitransactionsRouter };
