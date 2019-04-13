import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';

import { PerfectScrollbarModule } from 'ngx-perfect-scrollbar';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ChartsModule } from 'ng2-charts';
import { ChartistModule } from 'ng-chartist';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { CalendarModule, CalendarDateFormatter } from 'angular-calendar';
import * as pbi from 'powerbi-client';

import { ComponentsRoutes } from './components.routing';

import { DashboardComponent } from './dashboard/dashboard.component';
import { CampaignPlanningComponent } from './campaign-planning/campaign-planning.component';
import { CampaignsComponent } from './campaigns/campaigns.component';
import { CustomersComponent } from './customers/customers.component';
import { ImportReportsComponent } from './import-reports/import-reports.component';
import { ProductAnalyticsComponent } from './product-analytics/product-analytics.component';
import { TransactionsComponent } from './transactions/transactions.component';
import { ArchwizardModule } from 'ng2-archwizard';

@NgModule({
  imports: [
    FormsModule,
    CommonModule,
    NgbModule,
    ChartsModule,
    ChartistModule,
    RouterModule.forChild(ComponentsRoutes),
    ArchwizardModule,
    PerfectScrollbarModule,
    CalendarModule.forRoot(),
    NgxChartsModule,
    NgxDatatableModule
  ],
  declarations: [
    DashboardComponent,
    CampaignPlanningComponent,
    CampaignsComponent,
    CustomersComponent, 
    ImportReportsComponent, 
    ProductAnalyticsComponent, 
    TransactionsComponent
  ]
})
export class ComponentsModule {}
