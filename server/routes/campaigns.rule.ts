import { Request, Response, Router } from "express";
import * as uuid from "uuid";
var sql = require("mssql");
var dbFactory = require("../db.factory");

const campaignsRuleRouter: Router = Router();
campaignsRuleRouter.post("/", (request: Request, response: Response) => {
  let merchantBranchId = dbFactory.getMerchantIds(request.headers["merchantbranchid"]);
  getCampaigns(request.body, merchantBranchId, (data) => {
        //data.page.totalPages = totalPages;
        response.json(data);
  });
});

campaignsRuleRouter.post("/search", (request: Request, response: Response) => {
  let page = request.body.pageNumber, searchTerm = request.body.searchTerm, totalRecords = request.body.size, totalPages = request.body.totalPages;
  let merchantBranchId = dbFactory.getMerchantIds(request.headers["merchantbranchid"])
  getSearchResults(searchTerm, page, totalRecords, merchantBranchId, (data) => {
        data.page.totalPages = totalPages;
        response.json(data);
  });
});


campaignsRuleRouter.post("/add", (request: Request, response: Response) => {
    let model = request.body;
    let merchantBranchId = request.headers["merchantbranchid"]
    console.log("Save Model is ", request.body)
    dbFactory.get()
        // Successfull connection
        .then(function (conn) {
            let bQuery = dbFactory.getBranchIdQuery(merchantBranchId);
            var req = new sql.Request(conn);
            req.query(bQuery)
                .then(function(recordset){
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
                    ps.input('CampaignText', sql.VarChar)
                    ps.input('CampaignTrigger', sql.VarChar)
                    ps.input('TriggerValue', sql.VarChar)
                    ps.input('CreatedDate', sql.Date)
                    ps.input('CreatedBy', sql.VarChar)
                    ps.prepare(insertQuery, (err) => {
                        if(!err){
                            ps.execute({
                                'MerchantId'    : merchantBranchId,
                                'BranchId'      : merchantBranchId,
                                'CampaignName'  : model.campaignName,
                                'CampaignType'  : 'sms',
                                'CampaignText'  :  model.campaignText,
                                'CampaignTrigger' : model.triggerType,
                                'TriggerValue' : model.triggerValue,
                                'CreatedDate' :  new Date(),
                                'CreatedBy' :  model.CreatedBy
                            }, (err, result) => {                        
                                ps.unprepare(err => {
                                    if(!err) 
                                        console.log("Error while unprepare ", err);
                                    else 
                                        console.log(err);
                                })
                                response.json({
                                    "status" : "SUCCESS",
                                    "message" : err
                                });
                            })
                        } else {
                            console.log(err);
                            response.json({
                                "status" : "ERROR",
                                "message" : err
                            });
                        }
                    })
            }).catch(function(err){
                    console.log(err);
                    response.json({
                        "status" : "ERROR",
                        "message" : err
                    });
            });
        }).catch(function(err){
            console.log(err);
            response.json({
                "error" : "CP-001",
                "message" : "Connection failed to save customer"
            });              
        });
});

function getSearchResults(searchTerm, page, totalRecords, merchantBranchId, cb){

        dbFactory.get()
        // Successfull connection
        .then(function (conn) {
            // Create request instance, passing in connection instance
            var req = new sql.Request(conn);
            let wherequery = ` WHERE MerchantBranchId in ${merchantBranchId} AND (CampaignName LIKE '%${searchTerm}%'
                             OR
                             CampaignType LIKE  '%${searchTerm}%'
                             OR 
                             CampaignTrigger LIKE  '%${searchTerm}%' 
                             OR 
                             CampaignText LIKE  '%${searchTerm}' 
                             OR 
                             TriggerValue LIKE  '%${searchTerm}%')`;
            console.log(wherequery);                              
            req.query("select count(*) as totalCount from [dbo].[CampaignRule] " + wherequery)
                .then(function(recordset){
                    let totalCount = recordset["recordset"][0].totalCount, 
                        query, where;
                        where = ` where MerchantBranchId in ${merchantBranchId} `;
                        if(searchTerm && searchTerm.length > 3){
                            where =                     
                            ` WHERE MerchantBranchId in ${merchantBranchId} AND (CampaignName LIKE '%${searchTerm}%'
                             OR
                             CampaignType LIKE  '%${searchTerm}%'
                             OR 
                             CampaignTrigger LIKE  '%${searchTerm}%' 
                             OR 
                             CampaignText LIKE  '%${searchTerm}' 
                             OR 
                             TriggerValue LIKE  '%${searchTerm}%')`
                        }
                        query = dbFactory.getPaginationQuery('Campaign', 
                        page, totalRecords, where, " ORDER BY CampaignId")
                    console.log("QUery is " + dbFactory.getPaginationQuery('CampaignRule', 
                        page, totalRecords, wherequery, " ORDER BY CampaignRuleId"))
                    req.query(dbFactory.getPaginationQuery('CampaignRule', 
                        page, totalRecords, wherequery, " ORDER BY CampaignRuleId"))
                        .then(function (recordset) {
                            let data = {
                                "data" : recordset["recordset"],
                                "page" : { 
                                    "pageNumber": page,
                                    "totalElements" : totalCount,
                                    "totalPages" : 0,
                                    size: totalRecords
                                }
                            };
                            cb(data);
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

function getCampaigns(inputData, merchantBranchId, cb) {
    let page = inputData.pageNumber, totalRecords = inputData.size,
    searchTerm = inputData.searchTerm, 
    totalPages = inputData.totalPages,
    sortingField = inputData.sortingField || 'CampaignRuleId',
    sortingOrder = inputData.sortingOrder || 'desc';
    dbFactory.get()
        // Successfull connection
        .then(function (conn) {
            // Create request instance, passing in connection instance
            let req = new sql.Request(conn);
            let where;
            where = ` where MerchantBranchId in ${merchantBranchId} `;
            if(searchTerm && searchTerm.length > 1){
                where =                     
                ` WHERE MerchantBranchId in ${merchantBranchId} AND (CampaignName LIKE '%${searchTerm}%'
                    OR
                    CampaignType LIKE  '%${searchTerm}%'
                    OR 
                    CampaignTrigger LIKE  '%${searchTerm}%' 
                    OR 
                    CampaignText LIKE  '%${searchTerm}' 
                    OR 
                    TriggerValue LIKE  '%${searchTerm}%')`
            }
            req.query(`select count(*) as totalCount from [dbo].[CampaignRule] ${where}`)
                .then(function(recordset){
                    let totalCount = recordset["recordset"][0].totalCount,
                        query
                        query = dbFactory.getPaginationQuery('CampaignRule', 
                        page, totalRecords, where, ` ORDER BY ${sortingField} ${sortingOrder}`);
                    console.log("CampaignRule Query is ", query); 
                    req.query(query)
                        .then(function (recordset) {
                            let data = {
                                "data" : recordset["recordset"],
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


campaignsRuleRouter.post("/delete",(request:Request, response:Response) => {
    let model = request.body;
    let ruleId = model.ruleId;
    let merchantBranchId = request.headers["merchantbranchid"]
    console.log("[campaigns-Delete] " + ruleId);
    dbFactory.get()
        // Successfull connection
        .then(function (conn) {
            let bQuery = `delete from CampaignRule Where CampaignRuleId=${ruleId}`;
            console.log("Delete query is ", bQuery)
            var req = new sql.Request(conn);
            req.query(bQuery)
                .then(function(recordset){
                    response.json({
                        "status" : "Succcess",
                        "message" : ""
                    });
                })
                .catch(function(err){
                    response.json({
                        "status" : "Failed",
                        "message" : err
                    });
                });
        }).catch(function(err){
            response.json({
                "status" : "Failed",
                "message" : err
            });
        });
});

campaignsRuleRouter.post("/update", (request:Request, response:Response) => {
    let model = request.body;
    let ruleId = model.campaignRuleId
    let merchantBranchId = request.headers["merchantbranchid"]
    console.log("[campaigns-update] " + ruleId);
    if(!ruleId || ruleId.length < 1){
        response.json({
            "status" : "ERROR",
            "message" : "Campaign rule id is missing."
        });
    }
    dbFactory.get()
        // Successfull connection
        .then(function (conn) {
            let bQuery = `UPDATE  CampaignRule set 
                CampaignName='${model.campaignName}',
                CampaignTrigger='${model.triggerType}',
                TriggerValue='${model.triggerValue}',
                CampaignText='${model.campaignText}'
                Where CampaignRuleId=${ruleId}`;
            console.log("Update query is ", bQuery)
            var req = new sql.Request(conn);
            req.query(bQuery)
                .then(function(recordset){
                    response.json({
                        "status" : "Succcess",
                        "message" : ""
                    });
                })
                .catch(function(err){
                    response.json({
                        "status" : "Failed",
                        "message" : err
                    });
                });
        }).catch(function(err){
            response.json({
                "status" : "Failed",
                "message" : err
            });
        });
});


export { campaignsRuleRouter };



