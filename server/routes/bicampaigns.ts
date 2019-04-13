import { Request, Response, Router } from "express";
import * as uuid from "uuid";
import * as http_request from "request";
import * as rp from "request-promise-native";
import { ActionSequence } from "selenium-webdriver";
import { FindSMSCount } from "./login";
var TYPES = require('tedious').TYPES;
var moment = require('moment');
var sql = require("mssql");
var dbFactory = require("../db.factory");
var http = require("http");
//const  findSMS = require('./login');

var access_token = null;
var embed_token = null;
var embed_token1 = null;
const bicampaignsRouter: Router = Router();
var check = 0;

bicampaignsRouter.post("/", (request: Request, response: Response) => {
    console.log('iam body', request.headers.merchantbranchid);
    getData(request.headers.merchantbranchid, (data) => {

        if (data.status == 'Failed') {
            response.json({ error: 'No report Found' });
        }
        //page, totalRecords, merchantBranchId, (data) => {
        var loginBody = "grant_type=password&client_id=" + data.data['Client-id'] + "&resource=https://analysis.windows.net/powerbi/api&scope=openid&username=" + data.data['PbiLogin'] + "&password=" + data.data['pbipasswd'];

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
                console.log('this is body', b.access_token);
                console.log('this is body', b.access_token);

                var reportId = data.data['Report-id'];
                var groupId = data.data['Group-id'];

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
                console.log(err);
                response.json({ error: 'No report Found' });
            });
    });
});
//BiUploadcampaign
/**
 *SMS COUNT UPDATION IS STILL NOT DONE FOR UAE,AUS,IFMART
 */
bicampaignsRouter.post("/uploadBiCampaigns", (request: Request, response: Response) => {

    let model = request.body;
    var SMSuser;
    var senderId, SMSpswd, Authority, smsDeductValue = 1, smsCount;
    let merchantBranchId = request.headers["merchantbranchid"];
    var mydata = model.isChecked;
    // /<delimiter>/g replace all occrence of this delim
    if (model.campaignText.includes("%")) {
        var re = model.campaignText;
        model.campaignText = re.replace(/%/g, '%25');
    }
    if (model.campaignText.includes("&"))
     {
        var re = model.campaignText;
        model.campaignText = re.replace(/&/g,'%26');
    }
    if (model.campaignText.includes("+")) {
        var re = model.campaignText;
        model.campaignText = re.replace(/+/g, '%2B');
    }
    if (model.campaignText.includes("#")) {
        var re = model.campaignText;
        model.campaignText = re.replace(/#/g, '%23');
    }
    if (model.campaignText.includes("=")) {
        var re = model.campaignText;
        model.campaignText = re.replace(/=/g, '%3D');
    }
    if (model.campaignText.includes("^")) {
        var re = model.campaignText;
        model.campaignText = re.replace(/^/g, '%5E');
    }
    if (model.campaignText.includes("~")) {
        var re = model.campaignText;
        model.campaignText = re.replace(/~/g, '%7E');
    }
    var campaignLength = model.campaignText.length / 160;
    if (campaignLength > 1) {
        smsDeductValue = 2;
    }
    console.log("Checkbox Value :", mydata);

    //console.log("Save Model is ", request.body);
    dbFactory.get()
        .then(function (conn) {
            let smsQuery = `select SettingValue from CitrineSetting where MerchantBranchId=${merchantBranchId}  AND SettingName='SMScount'`;
            conn.request().query(smsQuery).
                then(function (result) {
                    if (result.recordset.length > 0) {
                        smsCount = result.recordset[0].SettingValue;
                        console.log("No.of SMS Left ---->", smsCount);
                    }
                    if (model.excelData.length > smsCount) {
                        response.json({
                            "status": "SMScountError2",
                        });
                    }
                    else {
                        //SMScount value 
                        let query = `select SettingValue from CitrineSetting where MerchantBranchId=${merchantBranchId}  AND SettingName='SenderId'`;
                        conn.request().query(query).
                            then(function (result) {
                                if (result.recordset.length > 0) {
                                    senderId = result.recordset[0].SettingValue;
                                    console.log("senderId -> ", senderId);
                                }
                                //to get SMSuser
                                let query1 = `select SettingValue from CitrineSetting where MerchantBranchId=${merchantBranchId}  AND SettingName='SMSuser'`;
                                conn.request().query(query1).
                                    then(function (result) {
                                        if (result.recordset.length > 0) {
                                            SMSuser = result.recordset[0].SettingValue;
                                            console.log("SMSuser -> ", SMSuser);
                                        }
                                        //to get SMSpswd
                                        let query2 = `select SettingValue from CitrineSetting where MerchantBranchId=${merchantBranchId}  AND SettingName='SMSpswd'`;
                                        conn.request().query(query2).
                                            then(function (result) {
                                                if (result.recordset.length > 0) {
                                                    SMSpswd = result.recordset[0].SettingValue;
                                                    console.log("SMSpswd is -> ", SMSpswd);
                                                }
                                                let query3 = `select SettingValue from CitrineSetting where MerchantBranchId=${merchantBranchId}  AND SettingName='Authorization'`;
                                                conn.request().query(query3).
                                                    then(function (result) {
                                                        if (result.recordset.length > 0) {
                                                            Authority = result.recordset[0].SettingValue;
                                                            console.log("Authorization is -> ", Authority);
                                                        }
                                                        else {
                                                            response.json({
                                                                "status": "Failed",
                                                            });
                                                        }
                                                        //   })//query3 then close
                                                        if (Authority != "Yes") {
                                                            response.json({
                                                                "status": "Failed",
                                                            });
                                                        }
                                                        else {
                                                            if (senderId == null || senderId == "" || SMSuser == null || SMSuser == "" || SMSpswd == null || SMSpswd == "") {
                                                                console.log("SenderID :", senderId, "SMSuser :", SMSuser, "SMSpswd :", SMSpswd);
                                                                console.log("SMS User not found !!!");
                                                                response.json({
                                                                    "status": "ERROR",
                                                                });
                                                            }
                                                            else if (senderId != null && senderId != "" && SMSuser != null || SMSuser != "" && SMSpswd != null && SMSpswd != "") {
                                                                console.log("SenderID :", senderId, "SMSuser :", SMSuser, "SMSpswd :", SMSpswd);
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
                                                                        ps.input('CampaignName', sql.VarChar)
                                                                        ps.input('CampaignType', sql.VarChar)
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
                                                                                    'CreatedBy': model.CreatedBy
                                                                                }, (err, result) => {
                                                                                    ps.unprepare(err => {
                                                                                        if (!err) {

                                                                                            //to get branch country
                                                                                            let branchCountry;
                                                                                            dbFactory.get()
                                                                                                .then(function (conn) {
                                                                                                    let query = `select BranchCountry from MerchantBranch where MerchantBranchId=${merchantBranchId}`;
                                                                                                    conn.request().query(query).
                                                                                                        then(function (result) {
                                                                                                            if (result.recordset.length > 0) {
                                                                                                                branchCountry = result.recordset[0].BranchCountry;
                                                                                                                console.log("Branch Country is -> ", result.recordset[0].BranchCountry);
                                                                                                            }
                                                                                                        });
                                                                                                });

                                                                                            //to get the last campaign id from the campaignRule                                       
                                                                                            var campaignId;
                                                                                            let qu = `SELECT CampaignRuleId AS LastID FROM CampaignRule WHERE CampaignRuleId = @@Identity;`;
                                                                                            conn.request().query(qu).
                                                                                                then(function (result) {
                                                                                                    if (result.recordset.length > 0) {
                                                                                                        campaignId = result.recordset[0].LastID;
                                                                                                        console.log("Campaign ID :", campaignId);
                                                                                                    }
                                                                                                });
                                                                                            if (model.triggerType == "Now") 
                                                                                            {
                                                                                                let xclData = model.excelData;
                                                                                                processXclData(xclData);
                                                                                                function delay1() {
                                                                                                    return new Promise(resolve => setTimeout(resolve, 500));
                                                                                                }
                                                                                                async function processXclData(stRec) {
                                                                                                    if (stRec.length > smsCount) {

                                                                                                        console.log(" Not sufficiant credit: you have only " + smsCount + " credit")
                                                                                                    }
                                                                                                    else {
                                                                                                        console.log("Toatal Record >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"+stRec.length);
                                                                                                        for (const item of stRec) {
                                                                                                            //await delayedLog(item)
                                                                                                            await customer(item);

                                                                                                            console.log("PhoneNo from loop :>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>.",item.PrimaryPhone);
                                                                                                        }
                                                                                                        console.log("***Process complete***");
                                                                                                    }
                                                                                                }
                                                                                                async function customer(rec) 
                                                                                                {
                                                                                                    await delay1();
                                                                                                 console.log("Rec :::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::",rec.PrimaryPhone);
                                                                                                 //let Custquery = `select StoreCustomerId,FirstName, PrimaryPhone from [dbo].[StoreCustomer] where MerchantBranchId='${merchantBranchId}' AND PrimaryPhone='${checkPhone}' AND (CustomerType is NULL or CustomerType='STARTSMS')`;
                                                                                                 let Custquery = `select StoreCustomerId,FirstName, PrimaryPhone from [dbo].[StoreCustomer] where MerchantBranchId='${merchantBranchId}' AND PrimaryPhone = @input_parameter AND CustomerType != @input_parameter2 `;
                                                                                                   // console.log(Custquery);
                                                                                                    conn.request()
                                                                                                    .input('input_parameter', sql.VarChar, rec.PrimaryPhone)
                                                                                                    .input('input_parameter2', sql.VarChar, "STOPSMS")
                                                                                                    .query(Custquery).
                                                                                                        then(function (result) {
                                                                                                            if (result.recordset.length > 0) 
                                                                                                            {
                                                                                                               // console.log(Custquery);
                                                                                                                //experiment should i put await or not
                                                                                                                console.log("Record exist !!!" ,result.recordset[0]);
                                                                                                                console.log("Record exist !!!" ,result.recordset[0].CustomerType);
                                                                                                                AddCampaignCustomer(result.recordset[0], campaignId, merchantBranchId, (data) => {
                                                                                                                    if (data.status === "SUCCESS") {
                                                                                                                        if (branchCountry == 'UAE' || branchCountry == 'uae') {
                                                                                                                            SendSMSToCustomerWithText_UAE(result.recordset[0].PrimaryPhone, result.recordset[0].FirstName, model.campaignText, senderId, SMSuser, SMSpswd, model.isChecked);
                                                                                                                        }
                                                                                                                        else if (branchCountry == 'AUS' || branchCountry == 'aus') {
                                                                                                                            //  console.log("PP:"+result.recordset[0].PrimaryPhone);
                                                                                                                            SendSMSToCustomerWithText_AUS(result.recordset[0].PrimaryPhone, result.recordset[0].FirstName, model.campaignText, senderId, SMSuser, SMSpswd, model.isChecked);
                                                                                                                        }
                                                                                                                        else if (branchCountry == 'IFMART' || branchCountry == 'ifmart') {
                                                                                                                            SendSMSToCustomerWithText_IFMART(result.recordset[0].PrimaryPhone, result.recordset[0].FirstName, model.campaignText, SMSuser, SMSpswd, model.isChecked);
                                                                                                                        }
                                                                                                                        else {
                                                                                                                            if (result.recordset[0].PrimaryPhone != '9999999999') {
                                                                                                                                smsCount = smsCount - smsDeductValue;
                                                                                                                                console.log("SMS count value :" + smsCount);
                                                                                                                            }
                                                                                                                            else {
                                                                                                                                 smsCount = smsCount - 0;
                                                                                                                                console.log("SMS count value :>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>" + smsCount);
                                                                                                                            }
                                                                                                                            SendSMSToCustomerWithText(result.recordset[0].PrimaryPhone, result.recordset[0].FirstName, model.campaignText, senderId, SMSuser, SMSpswd, model.isChecked, merchantBranchId, smsCount);
                                                                                                                        }
                                                                                                                    }
                                                                                                                });
                                                                                                            }
                                                                                                            else{
                                                                                                                console.log("Phone No doesn't exist !!!!!!",rec.PrimaryPhone);
                                                                                                            }

                                                                                                        });
                                                                                                }

                                                                                            }//end of if smstrigger type
                                                                                        }
                                                                                        else
                                                                                            console.log(err);
                                                                                    })
                                                                                    response.json({
                                                                                        "status": "SUCCESS",
                                                                                        "message": err
                                                                                    });
                                                                                })
                                                                            } else {
                                                                                console.log(err);
                                                                                response.json({
                                                                                    "status": "ERROR",
                                                                                    "message": err
                                                                                });
                                                                            }
                                                                        })
                                                                    }).catch(function (err) {
                                                                        console.log(err);
                                                                        response.json({
                                                                            "status": "ERROR",
                                                                            "message": err
                                                                        });
                                                                    });
                                                            }
                                                        }//authority else
                                                    });//query3 then close
                                            });
                                    });
                            });
                    }//comparision end

                });//end of smsCount 

        }).catch(function (err) {
            console.log(err);
            response.json({
                "error": "CP-001",
                "message": "Connection failed to save customer"
            });
        });
});
//end of upload

//bicampaignsRouter.post method start
/**
 *SMS COUNT UPDATION IS STILL NOT DONE FOR UAE,AUS,IFMART
 */
bicampaignsRouter.post("/add", (request: Request, response: Response) => {
    let model = request.body;
    var SMSuser, MerchantCountry, smsDeductValue = 1;
    var senderId, SMSpswd, Authority, smsCount, totalCustomerRecord;
    var checkbox = model.isChecked;
    if (model.campaignText.includes("%")) {
        var re = model.campaignText;
        model.campaignText = re.replace(/%/g, '%25');
    }
    if (model.campaignText.includes("&"))
     {
        var re = model.campaignText;
        model.campaignText = re.replace(/&/g,'%26');
    }
    if (model.campaignText.includes("+")) {
        var re = model.campaignText;
        model.campaignText = re.replace(/+/g, '%2B');
    }
    if (model.campaignText.includes("#")) {
        var re = model.campaignText;
        model.campaignText = re.replace(/#/g, '%23');
    }
    if (model.campaignText.includes("=")) {
        var re = model.campaignText;
        model.campaignText = re.replace(/=/g, '%3D');
    }
    if (model.campaignText.includes("^")) {
        var re = model.campaignText;
        model.campaignText = re.replace(/^/g, '%5E');
    }
    if (model.campaignText.includes("~")) {
        var re = model.campaignText;
        model.campaignText = re.replace(/~/g, '%7E');
    }

    var campaignLength = model.campaignText.length / 160;
    if (campaignLength > 1) {
        smsDeductValue = 2;
    }
    console.log("CheckBox value :", checkbox);
    let merchantBranchId = request.headers["merchantbranchid"]
    console.log("Save Model is ", request.body);
    dbFactory.get()
        .then(function (conn) {
            TotalNoOfCustomer(merchantBranchId, (data) => {
                console.log("TOTAL NO OF CUSTOMER : #1", data.data.recordset["0"].TotalCustomer);
                totalCustomerRecord = data.data.recordset["0"].TotalCustomer;
            });
           
            let smsQuery = `select SettingValue from CitrineSetting where MerchantBranchId=${merchantBranchId}  AND SettingName='SMScount'`;
            conn.request().query(smsQuery).
                then(function (result) {
                    if (result.recordset.length > 0) {
                        smsCount = result.recordset[0].SettingValue;
                        console.log("No.of SMS Left ---->", smsCount);
                    }
                    //SMScount value 
                    let countryQuery = `select BranchCountry from MerchantBranch where MerchantBranchId=${merchantBranchId}`;
                    conn.request().query(countryQuery).
                        then(function (result) {
                            if (result.recordset.length > 0) {
                                MerchantCountry = result.recordset[0].BranchCountry;
                                console.log("Branch Country is -> ", result.recordset[0].BranchCountry);
                            }

                            let query = `select SettingValue from CitrineSetting where MerchantBranchId=${merchantBranchId}  AND SettingName='SenderId'`;
                            conn.request().query(query).
                                then(function (result) {
                                    if (result.recordset.length > 0) {
                                        senderId = result.recordset[0].SettingValue;
                                        console.log("senderId -> ", senderId);
                                    }
                                    //to get SMSuser
                                    let query1 = `select SettingValue from CitrineSetting where MerchantBranchId=${merchantBranchId}  AND SettingName='SMSuser'`;
                                    conn.request().query(query1).
                                        then(function (result) {
                                            if (result.recordset.length > 0) {
                                                SMSuser = result.recordset[0].SettingValue;
                                                console.log("SMSuser -> ", SMSuser);
                                            }
                                            //to get SMSpswd
                                            let query2 = `select SettingValue from CitrineSetting where MerchantBranchId=${merchantBranchId}  AND SettingName='SMSpswd'`;
                                            conn.request().query(query2).
                                                then(function (result) {
                                                    if (result.recordset.length > 0) {
                                                        SMSpswd = result.recordset[0].SettingValue;
                                                        console.log("SMSpswd is -> ", SMSpswd);
                                                    }
                                                    let query3 = `select SettingValue from CitrineSetting where MerchantBranchId=${merchantBranchId}  AND SettingName='Authorization'`;
                                                    conn.request().query(query3).
                                                        then(function (result) {
                                                            if (result.recordset.length > 0) {
                                                                Authority = result.recordset[0].SettingValue;
                                                                console.log("Authorization is -> ", Authority);
                                                            }
                                                            else {
                                                                response.json({
                                                                    "status": "Failed",
                                                                });
                                                            }
                                                            // }//query3 then close model.triggerType == "TestSMS"
                                                            if (totalCustomerRecord > smsCount && model.triggerType != "TestSMS") {
                                                                response.json({
                                                                    "status": "SMScountError2",
                                                                });
                                                            }
                                                            else {
                                                                if (smsCount > 0) {

                                                                    if (Authority != "Yes") {
                                                                        response.json({
                                                                            "status": "Failed",
                                                                        });
                                                                    }
                                                                    else {
                                                                        if (senderId == null || senderId == "" || SMSuser == null || SMSuser == "" || SMSpswd == null || SMSpswd == "") {
                                                                            console.log("SenderID :", senderId, "SMSuser :", SMSuser, "SMSpswd :", SMSpswd);
                                                                            console.log("SMS User not found !!!");
                                                                            response.json({
                                                                                "status": "ERROR",
                                                                            });
                                                                        }
                                                                        else if (senderId != null && senderId != "" && SMSuser != null || SMSuser != "" && SMSpswd != null && SMSpswd != "") {
                                                                            console.log("SenderID :", senderId, "SMSuser :", SMSuser, "SMSpswd :", SMSpswd);
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
                                                                                    ps.input('CampaignName', sql.VarChar)
                                                                                    ps.input('CampaignType', sql.VarChar)
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
                                                                                                'CreatedBy': model.CreatedBy
                                                                                            }, (err, result) => {
                                                                                                ps.unprepare(err => {
                                                                                                    if (!err) {
                                                                                                        //to get branch country
                                                                                                        let branchCountry;
                                                                                                        dbFactory.get()
                                                                                                            .then(function (conn) {
                                                                                                                let query = `select BranchCountry from MerchantBranch where MerchantBranchId=${merchantBranchId}`;
                                                                                                                conn.request().query(query).
                                                                                                                    then(function (result) {
                                                                                                                        if (result.recordset.length > 0) {
                                                                                                                            branchCountry = result.recordset[0].BranchCountry;
                                                                                                                            console.log("Branch Country is -> ", result.recordset[0].BranchCountry);
                                                                                                                        }
                                                                                                                    });
                                                                                                            });
                                                                                                            var campaignId;
                                                                                                            LastCampaignId(merchantBranchId, (data) => 
                                                                                                            {
                                                                                                                console.log("Last CampaignId : #1", data.data.recordset["0"].LastID);
                                                                                                                campaignId = data.data.recordset["0"].LastID;
                                                                                                            });
                                                                                                        if (model.triggerType == "Now") 
                                                                                                        {
                                                                                                           //let Custquery = `select StoreCustomerId,FirstName, PrimaryPhone from  StoreCustomer where MerchantBranchId='${merchantBranchId}' AND source='upload'`;
                                                                                                           //let Custquery = `select StoreCustomerId,FirstName, PrimaryPhone from  StoreCustomer where MerchantBranchId='${merchantBranchId}' AND (CustomerType is NULL or CustomerType='STARTSMS')`;
                                                                                                           let Custquery = `select StoreCustomerId,FirstName, PrimaryPhone from  StoreCustomer where MerchantBranchId='${merchantBranchId}' AND CustomerType != @input_parameter2 `;
                                                                                                           conn.request()
                                                                                                           .input('input_parameter2', sql.VarChar, "STOPSMS")
                                                                                                           .query(Custquery).
                                                                                                                then(function (result) {
                                                                                                                    let stRec = result.recordset;
                                                                                                                    //console.log(stRec);
                                                                                                                    processArray(stRec);
                                                                                                                    function delay() {
                                                                                                                        return new Promise(resolve => setTimeout(resolve, 500));
                                                                                                                    }
                                                                                                                    async function delayedLog(item) {
                                                                                                                        await delay();
                                                                                                                        console.log("Customer :", item.FirstName);
                                                                                                                        AddCampaignCustomer(item, campaignId, merchantBranchId, (data) => {
                                                                                                                            if (data.status === "SUCCESS") {
                                                                                                                                if (branchCountry == 'UAE' || branchCountry == 'uae') {
                                                                                                                                    SendSMSToCustomerWithText_UAE(item.PrimaryPhone, item.FirstName, model.campaignText, senderId, SMSuser, SMSpswd, model.isChecked);
                                                                                                                                }
                                                                                                                                else if (branchCountry == 'AUS' || branchCountry == 'aus') {
                                                                                                                                    SendSMSToCustomerWithText_AUS(item.PrimaryPhone, item.FirstName, model.campaignText, senderId, SMSuser, SMSpswd, model.isChecked);
                                                                                                                                }
                                                                                                                                else if (branchCountry == 'IFMART' || branchCountry == 'ifmart') {
                                                                                                                                    SendSMSToCustomerWithText_IFMART(item.PrimaryPhone, item.FirstName, model.campaignText, SMSuser, SMSpswd, model.isChecked);
                                                                                                                                }
                                                                                                                                else {
                                                                                                                                    if (item.PrimaryPhone != '9999999999') {
                                                                                                                                        smsCount = smsCount - smsDeductValue;
                                                                                                                                        console.log("SMS count value :" + smsCount);
                                                                                                                                    }
                                                                                                                                    else {
                                                                                                                                        smsCount = smsCount - 0;
                                                                                                                                        console.log("SMS count value :" + smsCount);
                                                                                                                                    }
                                                                                                                                    if (smsCount < 0) {
                                                                                                                                        console.log("Insufficient SMS credits !!!");
                                                                                                                                    }
                                                                                                                                    else {
                                                                                                                                        SendSMSToCustomerWithText(item.PrimaryPhone, item.FirstName, model.campaignText, senderId, SMSuser, SMSpswd, model.isChecked, merchantBranchId, smsCount);
                                                                                                                                    }
                                                                                                                                }
                                                                                                                            }
                                                                                                                        });
                                                                                                                    }
                                                                                                                    async function processArray(stRec) {
                                                                                                                        if (stRec.length > smsCount) {
                                                                                                                            console.log(" Not sufficiant credit: you have only " + smsCount + " credit")
                                                                                                                        }
                                                                                                                        else {

                                                                                                                            for (const item of stRec) {

                                                                                                                                await delayedLog(item)
                                                                                                                            }
                                                                                                                        }
                                                                                                                        console.log("***Process complete***");
                                                                                                                    }
                                                                                                                });
                                                                                                        }
                                                                                                        else if (model.triggerType == "TestSMS") {

                                                                                                            var FirstName = "";
                                                                                                            if (MerchantCountry == 'UAE' || MerchantCountry === 'uae') {
                                                                                                                SendSMSToCustomerWithText_UAE(model.testPhoneNo, FirstName, model.campaignText, senderId, SMSuser, SMSpswd, model.isChecked);
                                                                                                            }
                                                                                                            else if (MerchantCountry == 'AUS' || MerchantCountry == 'aus') {
                                                                                                                SendSMSToCustomerWithText_AUS(model.testPhoneNo, FirstName, model.campaignText, senderId, SMSuser, SMSpswd, model.isChecked);
                                                                                                            }
                                                                                                            else if (MerchantCountry == 'IFMART' || MerchantCountry == 'ifmart') {
                                                                                                                SendSMSToCustomerWithText_IFMART(model.testPhoneNo, FirstName, model.campaignText, SMSuser, SMSpswd, model.isChecked);
                                                                                                            }
                                                                                                            else {
                                                                                                                if (model.testPhoneNo != '9999999999') {
                                                                                                                    smsCount = smsCount - smsDeductValue;
                                                                                                                    console.log("SMS count value :" + smsCount);
                                                                                                                }
                                                                                                                else {
                                                                                                                    smsCount = smsCount - 0;
                                                                                                                    console.log("SMS count value :" + smsCount);
                                                                                                                }
                                                                                                                //console.log("Check for techlink !!!!!!!!!!!!1");
                                                                                                                SendSMSToCustomerWithText(model.testPhoneNo, FirstName, model.campaignText, senderId, SMSuser, SMSpswd, model.isChecked, merchantBranchId, smsCount);
                                                                                                            }
                                                                                                        }
                                                                                                        //end od test SMS
                                                                                                    }
                                                                                                    else
                                                                                                        console.log(err);
                                                                                                })
                                                                                                response.json({
                                                                                                    "status": "SUCCESS",
                                                                                                    "message": err
                                                                                                });
                                                                                            })
                                                                                        } else {
                                                                                            console.log(err);
                                                                                            response.json({
                                                                                                "status": "ERROR",
                                                                                                "message": err
                                                                                            });
                                                                                        }
                                                                                    })
                                                                                }).catch(function (err) {
                                                                                    console.log(err);
                                                                                    response.json({
                                                                                        "status": "ERROR",
                                                                                        "message": err
                                                                                    });
                                                                                });
                                                                        }
                                                                    }//authority else end
                                                                }//if part end of smsCount
                                                                else {
                                                                    response.json({
                                                                        "status": "SMScountError",
                                                                    });
                                                                }// else part end of smsCount

                                                            }//end of comparision between total customer and sms count
                                                        });//querry3 then close
                                                });
                                        });
                                });


                        });//MerchantCountry
                });//smsCount
        }).catch(function (err) {
            console.log(err);
            response.json({
                "error": "CP-001",
                "message": "Connection failed to save customer"
            });
        });
});
//bicampaignsRouter.post method end

bicampaignsRouter.post("/searchByRuleId", (request: Request, response: Response) => {
    let merchantBranchId = request.headers["merchantbranchid"];
    let searchStr = request.body.searchStr;
    console.log("Search Str is ", searchStr);
    FindByRuleId(searchStr, merchantBranchId, (data) => {
        response.json(data);
    });
});

bicampaignsRouter.post("/update", (request: Request, response: Response) => {
    let model = request.body;
    let merchantBranchId = request.headers["merchantbranchid"]

    dbFactory.get()
        // Successfull connection
        .then(function (conn) {

            let bQuery = `UPDATE CampaignRule set 
                CampaignName = '${model.campaignName}' ,
                CampaignText = '${model.campaignText}' ,
                CampaignTrigger = '${model.triggerType}' ,
                TriggerValue = '${model.triggerValue}'
                Where CampaignRuleId='${model.campaignRuleId}'`;
            console.log("Update query is ", bQuery)
            var req = new sql.Request(conn);
            req.query(bQuery)
                .then(function (recordset) {
                    response.json({
                        "status": "Succcess",
                        "message": ""
                    });
                }).catch(function (err) {
                    console.log("--------------update error triggred");
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

bicampaignsRouter.post("/delete", (request: Request, response: Response) => {

    let model = request.body;
    let merchantBranchId = request.headers["merchantbranchid"]

    dbFactory.get()
        // Successfull connection
        .then(function (conn) {
            let bQuery = `DELETE from CampaignRule 
                        Where CampaignRuleId='${model.campaignRuleId}'`;
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
//functio to addcampaign against customer
function AddCampaignCustomer(model, campaignId, merchantBranchId, cb) {
    var cmp_id = campaignId;
    var MBID = merchantBranchId;

    console.log("inside Addcampaign customer model...", model);
    console.log("inside Addcampaign customer...", cmp_id);
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
                    ,[MerchantBranchId]
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
                    @CreatedBy,
                    @MerchantBranchId
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
            ps.input('MerchantBranchId', sql.Int)
            ps.prepare(insertQuery, (err) => {
                if (!err) {
                    ps.execute({
                        'CampaignId': cmp_id,
                        'StoreCustomerId': model.StoreCustomerId,
                        'FirstName': model.FirstName,
                        'LastName': model.LastName,
                        'Phone': model.PrimaryPhone,
                        'Email': model.Email,
                        'SentDate': new Date(),
                        'isDelivered': model.isDelivered,
                        'DeliveryDate': null,
                        'CreatedDate': new Date(),
                        'CreatedBy': model.CreatedBy,
                        'MerchantBranchId': MBID
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

function FindByRuleId(searchStr, merchantBranchId, cb) {
    dbFactory.get()
        // Successfull connection
        .then(function (conn) {
            var req = new sql.Request(conn);
            console.log("Query is ", `select * from [dbo].[StoreCustomer] WHERE MERCHANTBRANCHID=${merchantBranchId} and PrimaryPhone LIKE '%${searchStr}%'`);

            req.query(`SELECT  [CampaignRuleId],[MerchantBranchId],[BranchId],[CampaignName],[CampaignType],[CampaignTrigger],[TriggerValue],[CampaignText],[CreatedDate],[CreatedBy] FROM [dbo].[CampaignRule] where [MerchantBranchId] = '${merchantBranchId} ' AND [CampaignRuleId] ='${searchStr}'`)
                .then(function (recordset) {
                    console.log("COUNT #1", recordset);
                    cb({
                        data: recordset
                    })
                }).catch(function (err) {
                    console.log(err);
                    cb({
                        "status": "Failed",
                        "message": err
                    });
                });

        })
}
/*
A funtion to return the no of customer in a storecustomer table for a particular merchantid
 */
function TotalNoOfCustomer(merchantBranchId, cb) {
    dbFactory.get()
        // Successfull connection
        .then(function (conn) {
            var req = new sql.Request(conn);
            console.log("Query is ", `select count(*) from [dbo].[StoreCustomer] WHERE MERCHANTBRANCHID=${merchantBranchId}`);
            req.query(`select count(*) TotalCustomer from [dbo].[StoreCustomer] where MerchantBranchId=${merchantBranchId}`)
                .then(function (recordset) {
                    cb({
                        data: recordset
                    })
                }).catch(function (err) {
                    console.log(err);
                    cb({
                        "status": "Failed",
                        "message": err
                    });
                });
        })
}
/*
TO GET LAST CAMPAIGN RULEID TO SET IN CAMPAIGN CUSTOMER
 */
function LastCampaignId(merchantBranchId, cb) {
    dbFactory.get()
        // Successfull connection
        .then(function (conn) {
            var req = new sql.Request(conn);
            console.log("Query is ", `select count(*) from [dbo].[StoreCustomer] WHERE MERCHANTBRANCHID=${merchantBranchId}`);
            //req.query(`select count(*) TotalCustomer from [dbo].[StoreCustomer] where MerchantBranchId=${merchantBranchId}`);
            req.query(`SELECT CampaignRuleId AS LastID FROM CampaignRule WHERE MerchantBranchId=${merchantBranchId} and CampaignRuleId = @@Identity;`)
                .then(function (recordset) {
                    cb({
                        data: recordset
                    })
                }).catch(function (err) {
                    console.log(err);
                    cb({
                        "status": "Failed",
                        "message": err
                    });
                });
        })
}
/*
To get SMS count
 */
function GetSMSCount(merchantBranchId, cb) {
    var sms = 'SMScount';
    console.log("campaign file to get SMScount >>>> " + merchantBranchId);
    dbFactory.get()
        // Successfull connection
        .then(function (conn) {
            var req = new sql.Request(conn);
            //console.log("Query is ", `select * from [dbo].[CitrineSetting] WHERE MERCHANTBRANCHID=${merchantBranchId}`);
            req.query(`SELECT SettingValue from CitrineSetting where MerchantBranchId ='${merchantBranchId}' and SettingName ='${sms}'`)
                .then(function (result) {
                    cb({
                        data: result,
                        //"data": recordset["recordset"][0]
                    })
                }).catch(function (err) {
                    console.log(err);
                    cb({
                        "status": "Failed",
                        "message": err
                    });
                });
        })
}
/*
TO GET StoreCustomer phone number in a batch of 50
 */
function GetStoreCustomerInBatch(merchantBranchId, offset, cb) {
    dbFactory.get()
        // Successfull connection
        .then(function (conn) {
            var req = new sql.Request(conn);
            console.log("SELECT StoreCustomerId,PrimaryPhone,FirstName from [StoreCustomer] where MerchantBranchId = ${merchantBranchId} ORDER BY StoreCustomerId OFFSET ${offset} ROWS FETCH NEXT 50 ROWS ONLY;");
            req.query(`SELECT StoreCustomerId,PrimaryPhone,FirstName from [StoreCustomer] where MerchantBranchId = ${merchantBranchId} ORDER BY StoreCustomerId OFFSET ${offset} ROWS FETCH NEXT 50 ROWS ONLY;`)
                .then(function (result) {
                    cb({
                        data: result,
                        //"data": recordset["recordset"][0]
                    })
                }).catch(function (err) {
                    console.log(err);
                    cb({
                        "status": "Failed",
                        "message": err
                    });
                });
        })
}

//send sms to different country functions
//send to IFMART
function SendSMSToCustomerWithText_IFMART(phonenumber, custName, smstext, SMSuser, SMSpswd, isChecked) {
    console.log("***SMS send to IFMART customer***");
    var request = require('request');
    var msg = "", smsmode = "", smsMsg = "", mobileNo;
    mobileNo = phonenumber;
    var httplinkstr = "http://web.insignsms.com/api/sendsms?";
    var usernamenpasswd = "username=" + SMSuser + "&password=" + SMSpswd + "&senderid=INFMRT";
    if (isChecked == true) {
        msg = "&message=" + smstext;
    }
    else {
        if (custName == "" || custName == null || custName == "NULL") {
            msg = "&message=Dear Customer, " + smstext;
        }
        else {
            msg = "&message=Dear " + custName.charAt(0).toUpperCase() + custName.slice(1) + "," + smstext;
        }
    }
    smsmode = "&dndrefund=1";
    smsMsg = httplinkstr + usernamenpasswd + msg + "&numbers=91" + mobileNo + smsmode;
    console.log(smsMsg);
    getJSON(smsMsg, function (err, result) {
        if (err) {
            console.log("Error while sending api request", err);
        }
        else {
            check++;
            console.log("Visit :", check, "request sent to api", result);
        }
    });
}
//UAE client
function SendSMSToCustomerWithText_UAE(phonenumber, custName, smstext, senderId, SMSuser, SMSpswd, isChecked) {
    console.log("***SMS send to UAE customer***");
    //var request = require('request');
    var msg = "", smsmode = "", smsMsg = "", mobileNo;
    if (phonenumber.length === 9) {
        mobileNo = "0" + phonenumber;
    }
    mobileNo = phonenumber.substr(0);
    var httplinkstr = " http://api.smscountry.com/SMSCwebservice_bulk.aspx?";
    var usernamenpasswd = "User=" + SMSuser + "&passwd=" + SMSpswd + "&mobilenumber=";
    if (isChecked == true) {
        msg = "&message=" + smstext;
    }
    else {
        if (custName == "" || custName == null || custName == "NULL") {
            msg = "&message=Dear Customer ," + smstext;
        }
        else {
            msg = "&message=Dear " + custName.charAt(0).toUpperCase() + custName.slice(1) + "," + smstext;
        }
    }
    smsmode = "&mtype=LNG&DR=Y";
    smsMsg = httplinkstr + usernamenpasswd + "971" + mobileNo + msg + "&sid=" + senderId + smsmode;
    console.log(smsMsg);
    getJSON(smsMsg, function (err, result) {
        if (err) {
            console.log("Error while sending api request", err);
        }
        else {
            check++;
            console.log("Visit :", check, "request sent to api", result);
        }
    });
}
//Ausies client
function SendSMSToCustomerWithText_AUS(phonenumber, custName, smstext, senderId, SMSuser, SMSpswd, isChecked) {
    console.log("***SMS send to ausies customer***");
    var request = require('request');
    var msg = "", smsmode = "", smsMsg = "", mobileNo;
    if (phonenumber.length === 9) {
        mobileNo = "0" + phonenumber;
    }
    mobileNo = phonenumber.substr(0);
    var httplinkstr = " http://api.smscountry.com/SMSCwebservice_bulk.aspx?";
    var usernamenpasswd = "User=" + SMSuser + "&passwd=" + SMSpswd + "&mobilenumber=";
    if (isChecked == true) {
        msg = "&message=" + smstext;
        //msg = smstext;
    }
    else {
        if (custName == "" || custName == null || custName == "NULL") {
            msg = "&message=Dear Customer ," + smstext;
        }
        else {
            msg = "&message=Dear " + custName.charAt(0).toUpperCase() + custName.slice(1) + "," + smstext;
        }
    }
    smsmode = "&mtype=N&DR=Y";
    smsMsg = httplinkstr + usernamenpasswd + "61" + mobileNo + msg + "&sid=" + senderId + smsmode;
    console.log(smsMsg);
    getJSON(smsMsg, function (err, result) {
        if (err) {
            console.log("Error while sending api request", err);
        }
        else {
            check++;
            console.log("Visit :", check, "request sent to api", result);
        }
    });
}
//Indian client
function SendSMSToCustomerWithText(phonenumber, custName, smstext, senderId, SMSuser, SMSpswd, isChecked, merchantBranchId, smsCountUpdate) {
    console.log("***SMS send to indian customer***");
    var request = require('request');
    var msg = "", smsmode = "", smsMsg = "";
    var httplinkstr = " http://api.smscountry.com/SMSCwebservice_bulk.aspx?";
    var usernamenpasswd = "User=" + SMSuser + "&passwd=" + SMSpswd + "&mobilenumber=";
    if (isChecked == true) {
        msg = "&message=" + smstext;

    }
    else {
        if (custName == "" || custName == null || custName == "NULL") {
            msg = "&message=Dear Customer ," + smstext;
        }
        else {
            msg = "&message=Dear " + custName.charAt(0).toUpperCase() + custName.slice(1) + "," + smstext;
        }
    }
    //senderId = "&sid=e-receipts";
    smsmode = "&mtype=LNG&DR=Y";
    //smsmode = "&mtype=N&DR=Y";
    smsMsg = httplinkstr + usernamenpasswd + "91" + phonenumber + msg + "&sid=" + senderId + smsmode;
    console.log("API :", smsMsg);

    getJSON(smsMsg, function (err, result) {
        if (err) {
            console.log("Error while sending api request", err);
        }
        else {
            check++;
            console.log("Visit :", check, "request sent to api", result);

            if (result.includes('OK') || result.includes('ok')) {
                console.log("Send to SMS count update function !!!" + merchantBranchId + " SMS count :" + smsCountUpdate);
                updateSMScount(merchantBranchId, smsCountUpdate);
            }
        }
    });
}

function getJSON(options, cb) {
    http.request(options, function (res) {
        var body = '';
        res.on('data', function (chunk) {
            body += chunk;
        });
        res.on('end', function () {
            // var result = JSON.parse(body);
            var result = body;
            cb(null, result);
        });
        res.on('error', cb);
    })
        .on('error', cb)
        .end();
}
function updateSMScount(merchantBranchId, smsCount) {
    dbFactory.get()
        .then(function (conn) {
            console.log("Inside update smscount ###################");
            let bQuery = `UPDATE CitrineSetting set 
        SettingValue = '${smsCount}'
        Where MerchantBranchId = '${merchantBranchId}' and SettingName= 'SMScount'`;
            console.log("Update query is ", bQuery)
            var req = new sql.Request(conn);
            req.query(bQuery)
                .then(function (recordset) {

                }).catch(function (err) {
                    console.log("--------------update error triggred",err);

                }).catch({

                })
        })
        .catch(function (err) {
            console.log(err);
        });
}
//end of sms sending functions
function getData(inputData, cb) {
    console.log("Dashboard MerchantBranchId ", inputData);
    var merchantBranchId = inputData.substr(1).slice(0, -1);
    console.log(merchantBranchId)
    dbFactory.get()
        // Successfull connection
        .then(function (conn) {
            // Create request instance, passing in connection instance
            var req = new sql.Request(conn);
            req.query(`select * from  [dbo].[CitrinePowerBISettings]  where (MerchantBranchId=${merchantBranchId} and ReportType='campaign') or ReportType='noreport' ORDER BY ReportType desc`)
                .then(function (recordset) {
                    //   console.log('this is report id',recordset["recordset"][0]['Report-id']);
                    //console.log('this is report idasdasdasdasdasdasdasdasdasdasdasddasdsa', recordset);

                    let data = {
                        "data": recordset["recordset"][0]
                    };
                    //console.log(recordset["recordset"][0]['Client-id'].length, "llllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllll");

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
            console.log(err);
        });
}


export { bicampaignsRouter };
