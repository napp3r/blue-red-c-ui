import { Component } from '@angular/core';
import { SupplierInfomarion } from './models/supplier-information.model';
import { OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupplierService } from '../../services/supplier.service';

@Component({
  selector: 'app-suppliers-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './suppliers-page.component.html',
  styleUrl: './suppliers-page.component.css'
})
export class SuppliersPageComponent implements OnInit {
   data: SupplierInfomarion[] = []
   selectedSupplier: SupplierInfomarion | null = null;
   isApproved: boolean = false;
   
   constructor(private supplierService: SupplierService) {}
   
   ngOnInit(): void {
    console.log('SuppliersPageComponent initialized');
    this.data = [
      {
        companyName: 'Supplier A',
        description: 'High quality materials',
        contact: '+755 123 4567',
        price: '$1000',
        deliveryTime: '2 weeks',
        stock: true,
        overallRating: 3.5,
        flags: {
          red: ['Late delivery', 'Quality issues'],
          green: ['On-time delivery', 'High quality']
        }
      },
      {
        companyName: 'Supplier B',
        contact: '+755 123 4567',
        price: '$1000',
        deliveryTime: '2 weeks',
        stock: true,
        overallRating: 4.5,
        flags: {
          red: ['Late delivery', 'Quality issues'],
          green: ['On-time delivery', 'High quality']
        }
      },
      {
        companyName: 'Supplier C',
        description: 'Low price and high quality',
        contact: '+755 123 4567',
        price: '$1000',
        deliveryTime: '2 weeks',
        stock: true,
        overallRating: 2.5,
        flags: {
          red: ['Late delivery', 'Quality issues'],
          green: ['On-time delivery', 'High quality']
        }
      }
    ];
    console.log('Data loaded:', this.data);
    console.log('Data length:', this.data.length);
    console.log('First supplier:', this.data[0]);
   }
   
   selectSupplier(supplier: SupplierInfomarion): void {
     this.selectedSupplier = supplier;
     this.isApproved = false;
   }
   
   approveSupplier(): void {
     if (this.selectedSupplier) {
       this.isApproved = true;
       this.saveSupplierToMongoDB(this.selectedSupplier);
     }
   }
   
   private saveSupplierToMongoDB(supplier: SupplierInfomarion): void {
     this.supplierService.saveSelectedSupplier(supplier).subscribe({
       next: (response) => {
         console.log('Supplier saved to MongoDB:', response);
         // You can add a success notification here
       },
       error: (error) => {
         console.error('Error saving supplier to MongoDB:', error);
         this.isApproved = false; // Reset approval status on error
         // You can add an error notification here
       }
     });
   }
   
   getRatingClass(rating: number): string {
     if (rating < 2.5) {
       return 'rating-low';
     } else if (rating < 4) {
       return 'rating-medium';
     } else {
       return 'rating-high';
     }
   }
   
   getBestSupplier(): SupplierInfomarion | undefined {
     return this.data.reduce((best, current) => {
       return current.overallRating > (best?.overallRating || 0) ? current : best;
     }, undefined as SupplierInfomarion | undefined);
   }
   
   getLLMOpinion(): string {
     const bestSupplier = this.getBestSupplier();
     if (!bestSupplier) return 'No suppliers available for recommendation.';
     
     const rating = bestSupplier.overallRating;
     const name = bestSupplier.companyName;
     
     if (rating >= 4.5) {
       return `${name} demonstrates exceptional performance with a ${rating}/5 rating. Their high quality standards, reliable delivery, and competitive pricing make them the top choice for your procurement needs.`;
     } else if (rating >= 4.0) {
       return `${name} shows strong performance with a ${rating}/5 rating. They offer good value with reliable service and quality products, making them a solid choice for your business requirements.`;
     } else if (rating >= 3.0) {
       return `${name} has a moderate rating of ${rating}/5. While not the highest rated, they may offer competitive pricing or specific advantages that could be beneficial depending on your priorities.`;
     } else {
       return `${name} has a lower rating of ${rating}/5. Consider this supplier only if they offer unique advantages or if other options are limited.`;
     }
   }
   
   isBestSupplier(supplier: SupplierInfomarion): boolean {
     const bestSupplier = this.getBestSupplier();
     return bestSupplier?.companyName === supplier.companyName;
   }
}
