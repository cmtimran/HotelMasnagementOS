import React from 'react';
import { OutletConfigurationTab } from './OutletConfigurationTab';

interface OutletsPageProps {
    propertyId?: string | number;
    onNavigate?: (pageId: string, params?: any) => void;
}

export const OutletsPage: React.FC<OutletsPageProps> = ({ propertyId, onNavigate }) => {
    return (
        <div className="p-6 max-w-7xl mx-auto">
            <OutletConfigurationTab
                propertyId={propertyId}
                onNavigate={onNavigate}
            />
        </div>
    );
};

export default OutletsPage;
