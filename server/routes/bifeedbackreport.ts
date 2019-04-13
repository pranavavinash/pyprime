import { Request, Response, Router } from "express";
import * as uuid from "uuid";
import * as http_request from "request";
import * as rp from "request-promise-native";
var TYPES = require('tedious').TYPES;
var moment = require('moment');
var sql = require("mssql");
var dbFactory = require("../db.factory");

var access_token = null;
var embed_token = null;
var embed_token1     = null;
const bifeedbackreportRouter: Router = Router();

bifeedbackreportRouter.post("/", (request: Request, response: Response) => {
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
                console.log('this is body', b.access_token);
                console.log('this is body', b.access_token);
                
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
                        console.log(c.token);
                        embed_token = c.token;
                        data.access_token = access_token;
                        data.embed_token = embed_token;
                        response.json(data);
                    })
                    .catch(function (err) {
                        console.log(err);
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
          req.query(`select * from  [dbo].[CitrinePowerBISettings]  where (MerchantBranchId=${merchantBranchId} and ReportType='feedback') or ReportType='noreport' ORDER BY ReportType desc`)
              .then(function(recordset){
                //   console.log('this is report id',recordset["recordset"][0]['Report-id']);
                console.log('this is report idasdasdasdasdasdasdasdasdasdasdasddasdsa',recordset);
                
                  let data = {
                    "data" : recordset["recordset"][0]
                    };
                    console.log(recordset["recordset"][0]['Client-id'].length,"llllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllll");
                    
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


export { bifeedbackreportRouter };
