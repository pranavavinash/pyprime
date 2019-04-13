import { Request, Response, Router } from "express";
import * as uuid from "uuid";
var sql = require("mssql");
var dbFactory = require("../db.factory");

const campaignsRouter: Router = Router();
campaignsRouter.post("/", (request: Request, response: Response) => {
  let page = request.body.pageNumber, totalRecords = request.body.size, totalPages = request.body.totalPages, searchTerm = request.body.searchTerm;
  let merchantBranchId = dbFactory.getMerchantIds(request.headers["merchantbranchid"])
  getCampaigns(page, totalRecords, merchantBranchId, searchTerm, (data) => {
        data.page.totalPages = totalPages;
        response.json(data);
  });
});

campaignsRouter.post("/search", (request: Request, response: Response) => {
  let page = request.body.pageNumber, searchTerm = request.body.searchTerm, totalRecords = request.body.size, totalPages = request.body.totalPages;
  let merchantBranchId = dbFactory.getMerchantIds(request.headers["merchantbranchid"])
  getSearchResults(searchTerm, page, totalRecords, merchantBranchId, (data) => {
        data.page.totalPages = totalPages;
        response.json(data);
  });
});


campaignsRouter.post("/adddummy", (request: Request, response: Response) => {
    let model = request.body;
    let merchantBranchId = dbFactory.getMerchantIds(request.headers["merchantbranchid"])
    dbFactory.get()
        // Successfull connection
        .then(function (conn) {
            console.log("[add] Retrieved the connection");
            let insertQuery = `
                INSERT INTO [dbo].[Campaign]
                ( BranchId, MerchantBranchId, CampaignName, CampaignType, isAuto,
                  CampaignText, CampaignRule,CampaignDate, CreatedDate, CreatedBy
                )
                VALUES (@BranchId, @MerchantId, @CampaignName, @CampaignType, @isAuto,
                @CampaignText, @CampaignRule, @CampaignDate, @CreatedDate, @CreatedBy)
                `;
           var ps = new sql.PreparedStatement(conn)
            ps.input('BranchId', sql.Int)
            ps.input('MerchantId', sql.Int)
            ps.input('CampaignName', sql.VarChar)
            ps.input('CampaignType', sql.VarChar)
            ps.input('isAuto', sql.VarChar)
            ps.input('CampaignText', sql.VarChar)
            ps.input('CampaignRule', sql.VarChar)
            ps.input('CampaignDate', sql.Date)
            ps.input('CreatedDate', sql.Date)
            ps.input('CreatedBy', sql.VarChar)
            ps.prepare(insertQuery, (err) => {
                if(!err){
                    ps.execute({
                        'MerchantId' : model.MerchantId,
                        'BranchId' :  model.BranchId,
                        'CampaignName' : model.CampaignName,
                        'CampaignType' :  model.CampaignType,
                        'isAuto' :  model.isAuto,
                        'CampaignText' :  model.CampaignText,
                        'CampaignRule' : model.CampaignRule,
                        'CampaignDate' : model.CampaignDate,
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
                             CampaignType LIKE  '%${searchTerm}%' 
                             OR 
                             CampaignText LIKE  '%${searchTerm}' 
                             OR 
                             CampaignText LIKE  '%${searchTerm}%')`;
            console.log(wherequery);                              
            req.query("select count(*) as totalCount from [dbo].[Campaign] " + wherequery)
                .then(function(recordset){
                    let totalCount = recordset["recordset"][0].totalCount; 
                    console.log("QUery is " + dbFactory.getPaginationQuery('Campaign', 
                        page, totalRecords, wherequery, " ORDER BY CampaignId"))
                    req.query(dbFactory.getPaginationQuery('Campaign', 
                        page, totalRecords, wherequery, " ORDER BY CampaignId"))
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

function getCampaigns(page, totalRecords, merchantBranchId, searchTerm, cb) {
    dbFactory.get()
        // Successfull connection
        .then(function (conn) {
            // Create request instance, passing in connection instance
            var req = new sql.Request(conn);
            req.query(`select count(*) as totalCount from [dbo].[Campaign] where MerchantBranchId in ${merchantBranchId}`)
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
                    req.query(query)
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


export { campaignsRouter };



