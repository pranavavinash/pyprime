import { pbkdf2, randomBytes } from "crypto";
import { NextFunction, Request, Response, Router } from "express";
import { sign, verify } from "jsonwebtoken";
import { digest, length, secret } from "../config";
import { Permissions } from "../permissions";
import * as http_request from "request";
var sql = require("mssql");
var dbFactory = require("../db.factory");

const loginRouter: Router = Router();

// login method
loginRouter.post("/", (request: Request, response: Response, next: NextFunction) => {
    console.log("================000==============")
    let userName = request.body.userName;
    let password = request.body.password;
    dbFactory.get()
        // Successfull connection
        .then(function (conn) {
            // MerchantBranchId -> MerchantBranchId (MerchantBranch) ->  CitrineMerchantId (CitrineMerchantId)
            let loginQuery = `SELECT MB.BranchName, CU.MerchantBranchId, CU.UserName, CU.FirstName, CU.LastName, CU.CitrineRoleId, CU.CitrineUserId, CU.UserPassword, MB.CITRINEMERCHANTID FROM CitrineUser CU INNER JOIN MerchantBranch MB ON CU.MERCHANTBRANCHID=MB.MERCHANTBRANCHID WHERE CU.UserName='${userName}'`;
            conn.request().query(loginQuery).
                then(function (result) {
                    //console.log(result.recordset);
                    if (result.recordset.length > 0) {
                        if (result.recordset[0].UserPassword == password) {
                            let user = result.recordset[0];
                            conn.request().query(`select * from UserPermission where UserName='${userName}'`).
                                //conn.request().query(`select * from MerchantBranch where CitrineMerchantId='${user.CITRINEMERCHANTID}'`).
                                then(function (subresult) {
                                    // conn.request().query(`SELECT MerchantBranchId,SettingName,SettingValue FROM CitrineSetting where MerchantBranchId='${user.CITRINEMERCHANTID}'`).
                                    conn.request().query(`SELECT MerchantBranchId,SettingName,SettingValue FROM CitrineSetting where MerchantBranchId='${user.MerchantBranchId}'`).
                                        then(function (res) {
                                            if (res.recordset.length > 0) {
                                                res.recordset.forEach(element => {
                                                    if (element.SettingName === 'SenderCountry') {
                                                        user['SenderCountry'] = element.SettingValue;
                                                    }
                                                    else if (element.SettingName === 'SenderId') {
                                                        user['SenderId'] = element.SettingValue;
                                                    }
                                                    else if (element.SettingName === 'SMScount') {
                                                        user['SMScount'] = element.SettingValue;
                                                    }
                                                    else if (element.SettingName === 'SMSCHARLENGTH') {
                                                        user['SMSCHARLENGTH'] = element.SettingValue;
                                                    }
                                                });
                                            }
                                            const token = sign(Object.assign({}, { user: userName, permissions: [] }), secret, { expiresIn: "60m" });
                                            var permissions = Permissions.default;
                                            if (Permissions[result.recordset[0].CitrineUserId]) {
                                                permissions = Permissions[result.recordset[0].CitrineUserId];
                                            }
                                            response.json({
                                                jwt: token,
                                                role: "admin",
                                                user: user,
                                                branches: subresult.recordset,
                                                permissions: permissions,
                                                merchantBranchId: user.MerchantBranchId
                                            });
                                        }).catch(function (err) {
                                            console.log({ message: "ERROR:Unexpected error" });
                                        });
                                }).catch(function (err) {
                                    response.json({ message: "ERROR:Unexpected error" });
                                });
                        } else {
                            response.json({ message: "Wrong password" });
                        }
                    } else {
                        response.json({ message: "Wrong password" });
                    }
                }).catch(function (err) {
                    console.log("Error ", err, loginQuery);
                });
        }).catch(function (err) {
            console.log(err);
            response.json({
                "error": "CP-002",
                "message": "ERROR: Unable to login due to DB connection failure"
            });
        });
});

loginRouter.post("/permission", (request: Request, response: Response, next: NextFunction) => {

    try {
        var permissions = Permissions.default;
        if (Permissions[request.body.CitrineUserId]) {
            permissions = Permissions[request.body.CitrineUserId];
        }
        response.json({
            permissions: permissions
        });
    }
    catch (e) {

        console.log(e);
        response.json({
            "error": "permission",
            "message": "ERROR: Unable to get user permission"
        });
    }
});


//Change Password API function
loginRouter.post("/updatePassword", (request: Request, response: Response) => {
    let model = request.body;
    let merchantBranchId = request.headers["merchantbranchid"];
    console.log("Login TS model :", model);
    dbFactory.get()
        .then(function (conn) {
            // let Custquery = `select UserPassword from  StoreCustomer where MerchantBranchId='${merchantBranchId}' and UserPassword='${model.oldPswd}'`;                               
            conn.request().query(`select UserPassword from  CitrineUser where MerchantBranchId='${merchantBranchId}' and UserPassword='${model.oldPswd}'`)
                .then(function (res) {
                    if (res.recordset.length > 0) {
                        let bQuery = `UPDATE CitrineUser set 
            UserPassword = '${model.conPswd}'
            Where MerchantBranchId = '${merchantBranchId}' and UserPassword= '${model.oldPswd}'`;
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

                    }
                    else {
                        response.json({
                            "status": "Failed",
                            "message": ""
                        });
                        console.log("Password can not be change")
                    }
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

//end of change password api
loginRouter.post("/searchSMScount", (request: Request, response: Response) => {
    console.log("from searchsms count api" + request.body.searchStr);
    //var sms='SMScount';
    let merchantBranchId = request.body.searchStr;
    //let searchStr = request.body.searchStr;
    console.log("Search Str is ", merchantBranchId);
    FindSMSCount(merchantBranchId, (data) => {
        response.json(data);
    });
});
function FindSMSCount(merchantBranchId, cb) {
    var check;
    var sms = 'SMScount';
    console.log("Login.ts file to get SMScount >>>> " + merchantBranchId);
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
//module.exports = new FindSMSCount();
export { loginRouter, FindSMSCount };
