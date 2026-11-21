import React from 'react';
import { POSPage } from '../restaurant/pos/POSPage';

interface SpaPOSPageProps {
    outletId?: string;
}

export const SpaPOSPage: React.FC<SpaPOSPageProps> = ({ outletId }) => {
    return (
        <POSPage
            targetDepartment="SPA_WELLNESS"
            title="Spa & Wellness POS"
            initialOutletId={outletId}
        />
    );
};

export default SpaPOSPage;
