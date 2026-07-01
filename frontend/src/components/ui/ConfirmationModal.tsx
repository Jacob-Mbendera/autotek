import { AlertCircle, CheckCircle, Info, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { H2, Body } from './Typography';
import { AdminCard } from './AdminCard';
import { cn } from '../../utils/cn';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  dark?: boolean;
  isLoading?: boolean;
}

export const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  dark = false,
  isLoading = false,
}: ConfirmationModalProps) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <AlertCircle className="h-6 w-6 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-amber-500" />;
      case 'info':
        return <Info className="h-6 w-6 text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      default:
        return <AlertCircle className="h-6 w-6 text-red-500" />;
    }
  };

  const getConfirmButtonVariant = () => {
    switch (variant) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 text-white';
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700 text-white';
      case 'success':
        return 'bg-green-600 hover:bg-green-700 text-white';
      default:
        return 'bg-red-600 hover:bg-red-700 text-white';
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (isLoading) return;
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const confirmButtonContent = isLoading ? (
    <>
      <Loader2 className="h-4 w-4 animate-spin" />
      Processing...
    </>
  ) : (
    confirmText
  );

  if (dark) {
    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in"
        onClick={handleBackdropClick}
      >
        <AdminCard variant="default" className="w-full max-w-md animate-scale-in">
          <div className="flex items-center gap-3 mb-4">
            <div className={cn('flex-shrink-0', variant === 'danger' && 'text-red-500', variant === 'warning' && 'text-amber-500', variant === 'info' && 'text-blue-500', variant === 'success' && 'text-green-500')}>
              {getIcon()}
            </div>
            <H2 className="text-xl font-bold text-gray-50">{title}</H2>
          </div>
          <Body className="text-gray-300 mb-6">{message}</Body>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" type="button" dark onClick={onClose} disabled={isLoading}>
              {cancelText}
            </Button>
            <Button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={cn(
                getConfirmButtonVariant(),
                'focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900',
                isLoading && 'inline-flex items-center gap-2'
              )}
            >
              {confirmButtonContent}
            </Button>
          </div>
        </AdminCard>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-scale-in">
        <div className="flex items-center gap-3 mb-4">
          <div className={cn('flex-shrink-0', variant === 'danger' && 'text-red-500', variant === 'warning' && 'text-amber-500', variant === 'info' && 'text-blue-500', variant === 'success' && 'text-green-500')}>
            {getIcon()}
          </div>
          <H2 className="text-xl font-bold text-gray-900">{title}</H2>
        </div>
        <Body className="text-gray-600 mb-6">{message}</Body>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              getConfirmButtonVariant(),
              'focus:ring-2 focus:ring-offset-2',
              isLoading && 'inline-flex items-center gap-2'
            )}
          >
            {confirmButtonContent}
          </Button>
        </div>
      </div>
    </div>
  );
};
