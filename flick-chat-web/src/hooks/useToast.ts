import toast from 'react-hot-toast';

export function useToast() {
  const showSuccess = (message: string) => {
    toast.success(message, {
      style: {
        background: '#34C759',
        color: '#fff',
        borderRadius: '12px',
        padding: '16px',
      },
      iconTheme: {
        primary: '#fff',
        secondary: '#34C759',
      },
    });
  };

  const showError = (message: string) => {
    toast.error(message, {
      style: {
        background: '#FF3B30',
        color: '#fff',
        borderRadius: '12px',
        padding: '16px',
      },
      iconTheme: {
        primary: '#fff',
        secondary: '#FF3B30',
      },
    });
  };

  const showLoading = (message: string) => {
    return toast.loading(message, {
      style: {
        background: '#3B82F6',
        color: '#fff',
        borderRadius: '12px',
        padding: '16px',
      },
    });
  };

  return { showSuccess, showError, showLoading };
}
