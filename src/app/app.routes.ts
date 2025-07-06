import { Routes } from '@angular/router';
import { HomePage } from './pages/home/home.page';
import { SuppliersPageComponent } from './pages/suppliers-page/suppliers-page.component';

export const routes: Routes = [
  { path: '', component: HomePage },
  { path: 'home', component: HomePage },
  { path: 'suppliers', component: SuppliersPageComponent}
];
