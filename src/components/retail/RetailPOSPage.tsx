import React from 'react';
import { POSPage } from '../restaurant/pos/POSPage';

interface RetailPOSPageProps {
    outletId?: string;
}

export const RetailPOSPage: React.FC<RetailPOSPageProps> = ({ outletId }) => {
    return (
        <POSPage
            targetDepartment="RETAIL_SHOP"
            title="Hotel Gift Shop & Retail POS"
            initialOutletId={outletId}
        />
    );
};

export default RetailPOSPage;
