import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { CampaignPlanningComponent } from './campaign-planning/campaign-planning.component';
import { CampaignsComponent } from './campaigns/campaigns.component';
import { CustomersComponent } from './customers/customers.component';
import { ImportReportsComponent } from './import-reports/import-reports.component';
import { ProductAnalyticsComponent } from './product-analytics/product-analytics.component';
import { TransactionsComponent } from './transactions/transactions.component';
export const ComponentsRoutes: Routes = [
  {
    path: 'classic',
    component: DashboardComponent
  },
  {
    path: 'campaigns',
    component: CampaignsComponent
  },
  {
    path: 'campaign-planning',
    component: CampaignPlanningComponent
  },
  {
    path: 'customers',
    component: CustomersComponent
  },
  {
    path: 'import',
    component: ImportReportsComponent
  },
  {
    path: 'product-analytics',
    component: ProductAnalyticsComponent
  },
  {
    path: 'transactions',
    component: TransactionsComponent
  },


]
