import React from 'react';
import { POSPage } from '../restaurant/pos/POSPage';

interface BanquetPOSPageProps {
    outletId?: string;
}

export const BanquetPOSPage: React.FC<BanquetPOSPageProps> = ({ outletId }) => {
    return (
        <POSPage
            targetDepartment="BANQUET_EVENTS"
            title="Banquet & Event POS"
            initialOutletId={outletId}
        />
    );
};

export default BanquetPOSPage;
