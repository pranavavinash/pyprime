import { RouteInfo } from './sidebar.metadata';

export const ROUTES: RouteInfo[] = [
  {
    title: 'Dashboard',
    icon: 'mdi mdi-view-dashboard',
    class: '',
    ddclass: '',
    extralink: false,
    path: "/dashboard/classic",
    submenu: []
  },
  {
    path: '/dashboard/customers',
    title: 'Customers',
    icon: 'mdi mdi-inbox-arrow-down',
    class: '',
    ddclass: '',
    extralink: false,
    submenu: []
  },
  {
    path: '/dashboard/transactions',
    title: 'Transaction',
    icon: 'mdi mdi-widgets',
    class: '',
    ddclass: 'mega-dropdown',
    extralink: false,
    submenu: []
  },
  {
    path: '/dashboard/campaign-planning',
    title: 'Campaign Planning',
    icon: 'mdi mdi-collage',
    class: '',
    ddclass: 'two-column',
    extralink: false,
    submenu: []
  },
  {
    path: '/dashboard/campaigns',
    title: 'Campaigns',
    icon: 'mdi mdi-border-none',
    class: '',
    ddclass: '',
    extralink: false,
    submenu: []
  },
  {
    path: '/dashboard/product-analytics',
    title: 'Product Analytics',
    icon: 'mdi mdi-image-filter-tilt-shift',
    class: '',
    ddclass: '',
    extralink: false,
    submenu: []
  },
  {
    path: '/dashboard/import',
    title: 'ImportMode Reports',
    icon: 'mdi mdi-file',
    class: '',
    ddclass: 'mega-dropdown',
    extralink: false,
    submenu: []
  }
];
