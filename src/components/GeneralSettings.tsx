import React from 'react';
import AddProperty from './AddProperty';

interface GeneralSettingsProps {
    onNavigate?: (page: string) => void;
    currentUser?: any;
    initialTab?: string;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({ onNavigate, currentUser, initialTab }) => {
    return (
        <AddProperty
            isCreateMode={false}
            initialViewMode="manage"
            currentUser={currentUser}
            onNavigate={onNavigate}
            onBack={onNavigate ? () => onNavigate('hotel-info') : undefined}
            initialTab={initialTab}
        />
    );
};

export default GeneralSettings;
