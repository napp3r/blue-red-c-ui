export interface SupplierInfomarion {
    companyName: string;
    description: string;
    contact: string;
    price: string;
    deliveryTime: string;
    stock: boolean;
    flags: SupplierFlag;
}

interface SupplierFlag {
    red: string[];
    green: string[];
}