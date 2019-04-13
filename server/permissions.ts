import { transactionsRouter } from "./routes/transactions";

var Permissions = 
{
    "default": {
        "dashboard":
         {
            "show": true            
        },

        "search": 
        {
            "show": true,
        },

        "campaignsReport": 
        {
            "show":true            
        },

        "campaigns": {
            //"show": false,
            "show": true,
            "add": true,
            "edit": true
        },

        "transactions": 
        {
           
           //"show": false,
            //"add": false,
            "show": true,
            "add":true  
        },

        "biproduct":
        {
            "show":true,

        },
        "productAnslytics":
        {
            "show": true,
        },

        "customers": {
           //"show": false,
           //"add":false
           "show": true,
            "add": true,
            "edit":true,
            "upload":true
           
        
        },
        "feedback": {
            "show": false
        },

        "feedbackQuestions": {
            "show": false
        },
        "importReports":{
            "show":true,
        }

    },
    "43":
        {
            "dashboard": {
                "show": false
            },
            "search": {
                "show": true,
            },
            "campaignsReport": {
                "show": true,
            },

            "campaigns": {
                "show": true,
                "add": true,
                "edit": false
            },

            "transactions": {
                "show": true,
                "add": false,
                
            },

            "customers": {
                "show": true,
                "add": true,
            },
            "feedback": {
                "show": true
            },

            "feedbackQuestions": {
                "show": false
            },        
            "productAnslytics":
            {
                "show": true,
            },
            "importReports":{
                "show":true,
            }
        },

        "47": {
            "dashboard":
             {
                "show": true            
            },
    
            "search": 
            {
                "show": true,
            },
    
            "campaignsReport": 
            {
                //"show":true    
                "show": true,       
            },
    
            "campaigns": {
                //"show": false,
                "show": true,
                "add": true,
                "edit": true
            },
    
            "transactions": 
            {
               
               //"show": false,
                //"add": false,
                "show": true,
                "add":true  
            },
    
            "customers": 
            {
               //"show": false,
               "show": true,
                "add": true,
                "edit":true,
                "upload":true
               
            
            },
            "feedback": {
                "show": false
            },
    
            "feedbackQuestions": {
                "show": false
            },
            "productAnslytics":
            {
                "show": true,
            },
            "importReports":{
                "show":true,
            }
        },

        "17": 
            {
            "dashboard":
             {
                "show": true            
            },
    
            "search": 
            {
                "show": true,
            },
    
            "campaignsReport": 
            {
                "show":true,        
            },
    
            "campaigns": {
                "show": false,
                //"show": true,
                "add": true,
                "edit": true
            },
    
            "transactions": 
            {
               
               //"show": false,
                //"add": false,
                "show": true,
                "add":true  
            },
    
            "customers": 
            {
               //"show": false,
               "show": true,
                "add": true,
                "edit":true,
                "upload":true
            },
            "feedback": {
                "show": false
            },
    
            "feedbackQuestions": {
                "show": false
            },
            "productAnslytics":
            {
                "show": true,
            },
            "importReports":{
                "show":true,
            }
        }
}


export { Permissions }