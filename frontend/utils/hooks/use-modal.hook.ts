import { RefObject, useEffect } from 'react';

export const useAccessibleModal = (modalRef: RefObject<HTMLDivElement>, onClose: () => void) => {
  useEffect(() => {
    const modalElement = modalRef.current;
    if (!modalElement) return;
    const focusableElements = modalElement.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          (lastElement as HTMLElement).focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          (firstElement as HTMLElement).focus();
        }
      }
    };

    const handleEscapeKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    modalElement.addEventListener('keydown', handleTabKeyPress);
    modalElement.addEventListener('keydown', handleEscapeKeyPress);

    (firstElement as HTMLButtonElement).focus();
    // eslint-disable-next-line consistent-return
    return () => {
      modalElement.removeEventListener('keydown', handleTabKeyPress);
      modalElement.removeEventListener('keydown', handleEscapeKeyPress);
    };
  }, [onClose, modalRef]);
};
