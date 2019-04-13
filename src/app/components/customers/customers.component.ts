import { Component, AfterViewInit,ViewEncapsulation } from '@angular/core';
import { HttpClient,HttpHeaders } from  "@angular/common/http";
import { Observable } from  "rxjs/Observable";
import { NgxPowerBiService } from 'ngx-powerbi';
import { NgbModal, ModalDismissReasons, NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

class Data {
  "Index number": number;
  "MerchantBranchId": number;
  "CitrineBranchId": number;
  "Client-id": string;
  "Group-id": string;
  "Report-id": string;
  "ReportType": string;
  "PbiLogin": string;
  "pbipasswd": string;
  "CreatedDate": string;
}

class  DashboardModel {
  
  access_token: string;
  embed_token: string;
  data: Data;
  }

@Component({
  templateUrl: './customers.component.html',
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./customers.component.css'],
  providers: [{ provide: Window, useValue: window }]
})
export class CustomersComponent implements AfterViewInit {
  
  models = window['powerbi-client'].models;
  powerbi = window['powerbi'];
  customersObservable : Observable<DashboardModel[]>;
  dashboardData:DashboardModel;
  embedUrl:String;
  private powerBiService: NgxPowerBiService;
  private pbiContainerElement: HTMLElement;

  constructor(private  httpClient:HttpClient, private modalService: NgbModal) {
    //this.customersObservable = this.httpClient
    this.powerBiService = new NgxPowerBiService();
  }

  ngAfterViewInit() {
    this.pbiContainerElement = <HTMLElement>(document.getElementById('pbi-container'));
    //http://localhost:4300/api/v1/dashboard
    var that = this;
    const  headers = new  HttpHeaders().set("merchantbranchid","[1]");
    this.httpClient.post<DashboardModel>("http://68.183.102.174:4300/api/v1/dashboard", "", {
      headers
    }).subscribe(data => {
      that.dashboardData = data;
      console.log(data);
      const config = {
        type: 'report',
        id: that.dashboardData.data["Report-id"],
        tokenType: this.models.TokenType.Embed,
        permissions: this.models.Permissions.All,
        embedUrl: 'https://app.powerbi.com/reportEmbed?reportId=' + that.dashboardData.data["Report-id"] + '&groupId=' + that.dashboardData.data["Group-id"],
        accessToken: that.dashboardData.embed_token,
        settings: {
            filterPaneEnabled: true,
            navContentPaneEnabled: true
        }
      };
      that.powerBiService.embed(this.pbiContainerElement, config);
    }, error => {
        console.log(error);
    })
 }
 openVerticallyCentered(content) {
  this.modalService.open(content, { centered: true });
}
}
