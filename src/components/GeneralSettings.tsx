import React from 'react';
import AddProperty from './AddProperty';

interface GeneralSettingsProps {
    onNavigate?: (page: string) => void;
    currentUser?: any;
    initialTab?: string;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({ onNavigate, currentUser, initialTab }) => {
    // 1. URL search param (?tab=...) has absolute top priority on page load and refresh
    // 2. Prop initialTab has second priority
    const getResolvedTab = (): string | undefined => {
        if (typeof window !== 'undefined') {
            try {
                const params = new URLSearchParams(window.location.search);
                const qTab = params.get('tab');
                if (qTab) return qTab;
                if (window.location.hash) {
                    const hTab = window.location.hash.replace('#', '');
                    if (hTab) return hTab;
                }
            } catch {}
        }
        return initialTab;
    };

    const resolvedTab = getResolvedTab();

    return (
        <AddProperty
            isCreateMode={false}
            initialViewMode="manage"
            currentUser={currentUser}
            onNavigate={onNavigate}
            onBack={onNavigate ? () => onNavigate('hotel-info') : undefined}
            initialTab={resolvedTab}
        />
    );
};

export default GeneralSettings;
