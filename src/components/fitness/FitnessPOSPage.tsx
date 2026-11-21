import React from 'react';
import { POSPage } from '../restaurant/pos/POSPage';

interface FitnessPOSPageProps {
    outletId?: string;
}

export const FitnessPOSPage: React.FC<FitnessPOSPageProps> = ({ outletId }) => {
    return (
        <POSPage
            targetDepartment="FITNESS_RECREATION"
            title="Fitness & Swimming Pool POS"
            initialOutletId={outletId}
        />
    );
};

export default FitnessPOSPage;
