import { Component } from '@angular/core';
import { SupplierInfomarion } from './models/supplier-information.model';
import { OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupplierService } from '../../services/supplier.service';
import { WebSocketSessionService } from '../home/home.page';

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
   isLoading: boolean = true;
   error: string | null = null;
   isDemoMode: boolean = true;
   approvalStatus: string = 'pending'; // 'pending', 'approved', 'waiting'
   
   constructor(private supplierService: SupplierService, private webSocketSessionService: WebSocketSessionService) {}
   
   ngOnInit(): void {
    console.log('SuppliersPageComponent initialized');
    // Auto-load demo data instead of real API call
    this.startDemo();
   }

   loadSuppliers(): void {
    this.isLoading = true;
    this.error = null;
    
    this.supplierService.getSuppliers().subscribe({
      next: (suppliers) => {
        console.log('Suppliers loaded from API:', suppliers);
        this.data = suppliers;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading suppliers:', error);
        this.error = 'Failed to load suppliers. Please try again later.';
        this.isLoading = false;
        // Fallback to empty array to prevent app crash
        this.data = [];
      }
    });
   }
   
   selectSupplier(supplier: SupplierInfomarion): void {
     this.selectedSupplier = supplier;
     this.isApproved = false;
   }
   
   approveSupplier(): void {
     if (this.selectedSupplier) {
       this.isApproved = true;
       this.approvalStatus = 'waiting';
       this.saveSupplierToMongoDB(this.selectedSupplier);
       // Disconnect WebSocket after approval
       this.webSocketSessionService.setShouldDisconnect(true);
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

   // Demo methods
   startDemo(): void {
     this.isDemoMode = true;
     this.isLoading = true;
     
     // Simulate loading delay
     setTimeout(() => {
       this.loadDemoSuppliers();
       this.isLoading = false;
     }, 1500);
   }

   private loadDemoSuppliers(): void {
     this.data = [
       {
         companyName: "OfficeFurniture Pro",
         description: "Premium office furniture specialist with 15+ years experience. Specializes in high-quality chairs and office equipment.",
         phone_numbers: ["+33 1 42 86 17 23"],
         emails: ["marie.dubois@officefurniturepro.fr"],
         price: "€2,450",
         deliveryTime: "July 14-16, 2025",
         stock: true,
         overallRating: 4.7,
         flags: {
           red: [],
           green: ["Premium Quality", "Fast Delivery", "Excellent Service"]
         }
       },
       {
         companyName: "Carrousel Furniture Solutions",
         description: "Specializes in Louvre area deliveries with competitive pricing. Perfect for Carrousel du Louvre location.",
         phone_numbers: ["+33 1 45 23 67 89"],
         emails: ["jl.moreau@carrouselfurniture.fr"],
         price: "€2,200",
         deliveryTime: "July 13-15, 2025",
         stock: true,
         overallRating: 4.3,
         flags: {
           red: [],
           green: ["Louvre Area Specialist", "Competitive Pricing", "Local Delivery"]
         }
       },
       {
         companyName: "Paris Office Supply Co.",
         description: "Large inventory with bulk order discounts available. Reliable supplier for office furniture needs.",
         phone_numbers: ["+33 1 48 76 54 32"],
         emails: ["sophie.laurent@parisoffice.fr"],
         price: "€2,100",
         deliveryTime: "July 16-18, 2025",
         stock: true,
         overallRating: 4.0,
         flags: {
           red: ["Longer Delivery Time"],
           green: ["Bulk Discounts", "Large Inventory"]
         }
       }
     ];
   }

   resetDemo(): void {
     this.isDemoMode = true;
     this.data = [];
     this.selectedSupplier = null;
     this.isApproved = false;
     this.isLoading = false;
     this.error = null;
   }
}
