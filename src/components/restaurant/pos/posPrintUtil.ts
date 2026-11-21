/**
 * High-precision thermal slip printer utility for POS.
 * Clones the ticket/receipt element into an isolated portal directly under document.body,
 * applies thermal slip styles and triggers native print.
 */
export function printThermalSlip(elementId: string, title?: string) {
    if (typeof window === 'undefined') return;

    const oldTitle = document.title;
    if (title) {
        document.title = title;
    }

    const sourceElement = document.getElementById(elementId);
    if (!sourceElement) {
        window.print();
        return;
    }

    const existingPortal = document.getElementById('thermal-print-portal');
    if (existingPortal) {
        existingPortal.remove();
    }

    const portal = document.createElement('div');
    portal.id = 'thermal-print-portal';
    portal.innerHTML = sourceElement.innerHTML;
    document.body.appendChild(portal);

    document.body.classList.add('is-printing-thermal');

    requestAnimationFrame(() => {
        window.print();
    });

    const cleanup = () => {
        document.body.classList.remove('is-printing-thermal');
        const p = document.getElementById('thermal-print-portal');
        if (p) {
            p.remove();
        }
        if (title) {
            document.title = oldTitle;
        }
        window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);
    setTimeout(cleanup, 2000);
}
