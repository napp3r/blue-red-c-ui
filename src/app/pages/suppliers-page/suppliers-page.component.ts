import { Component } from '@angular/core';
import { SupplierInfomarion } from './models/supplier-information.model';
import { OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-suppliers-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './suppliers-page.component.html',
  styleUrl: './suppliers-page.component.css'
})
export class SuppliersPageComponent implements OnInit {
   data: SupplierInfomarion[] = []
   ngOnInit(): void {
    this.data = [
      {
        companyName: 'Supplier A',
        description: 'High quality materials',
        contact: '+755 123 4567',
        price: '$1000',
        deliveryTime: '2 weeks',
        stock: true,
        flags: {
          red: ['Late delivery', 'Quality issues'],
          green: ['On-time delivery', 'High quality']
        }
      },
      {
        companyName: 'Supplier A',
        description: 'High quality materials',
        contact: '+755 123 4567',
        price: '$1000',
        deliveryTime: '2 weeks',
        stock: true,
        flags: {
          red: ['Late delivery', 'Quality issues'],
          green: ['On-time delivery', 'High quality']
        }
      },
      {
        companyName: 'Supplier A',
        description: 'High quality materials',
        contact: '+755 123 4567',
        price: '$1000',
        deliveryTime: '2 weeks',
        stock: true,
        flags: {
          red: ['Late delivery', 'Quality issues'],
          green: ['On-time delivery', 'High quality']
        }
      }
    ]
   }
}
