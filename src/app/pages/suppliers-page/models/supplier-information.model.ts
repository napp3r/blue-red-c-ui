export interface SupplierInfomarion {
    companyName: string;
    description?: string;
    phone_numbers: string[];
    emails?: string[];
    call_status?: string;
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