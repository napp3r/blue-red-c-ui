export interface SupplierInfomarion {
    companyName: string;
    description?: string;
    contact: string;
    price: string;
    deliveryTime: string;
    stock: boolean;
    overallRating: number;
    flags: SupplierFlag;
}

interface SupplierFlag {
    red: string[];
    green: string[];
}