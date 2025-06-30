import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';
import { useNotificationStore } from '../../stores/notificationStore';

export const NotificationSystem: React.FC = () => {
  const { notifications, removeNotification } = useNotificationStore();

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBackgroundColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getTextColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-yellow-800';
      case 'info':
      default:
        return 'text-blue-800';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      <AnimatePresence>
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onRemove={removeNotification}
            getIcon={getIcon}
            getBackgroundColor={getBackgroundColor}
            getTextColor={getTextColor}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

interface NotificationItemProps {
  notification: any;
  onRemove: (id: string) => void;
  getIcon: (type: string) => React.ReactNode;
  getBackgroundColor: (type: string) => string;
  getTextColor: (type: string) => string;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onRemove,
  getIcon,
  getBackgroundColor,
  getTextColor,
}) => {
  useEffect(() => {
    if (notification.autoClose) {
      const timer = setTimeout(() => {
        onRemove(notification.id);
      }, notification.duration || 5000);

      return () => clearTimeout(timer);
    }
  }, [notification, onRemove]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`
        ${getBackgroundColor(notification.type)}
        border rounded-lg shadow-lg p-4 backdrop-blur-sm
        max-w-sm w-full
      `}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {getIcon(notification.type)}
        </div>
        
        <div className="flex-1 min-w-0">
          {notification.title && (
            <h4 className={`text-sm font-semibold ${getTextColor(notification.type)} mb-1`}>
              {notification.title}
            </h4>
          )}
          <p className={`text-sm ${getTextColor(notification.type)}`}>
            {notification.message}
          </p>
          
          {notification.action && (
            <button
              onClick={notification.action.onClick}
              className={`
                mt-2 text-xs font-medium underline hover:no-underline
                ${getTextColor(notification.type)}
              `}
            >
              {notification.action.label}
            </button>
          )}
        </div>
        
        <button
          onClick={() => onRemove(notification.id)}
          className={`
            flex-shrink-0 p-1 rounded-full hover:bg-black/10 transition-colors
            ${getTextColor(notification.type)}
          `}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {notification.autoClose && (
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: notification.duration / 1000 || 5, ease: 'linear' }}
          className={`
            h-1 mt-3 rounded-full
            ${notification.type === 'success' ? 'bg-green-300' :
              notification.type === 'error' ? 'bg-red-300' :
              notification.type === 'warning' ? 'bg-yellow-300' :
              'bg-blue-300'
            }
          `}
        />
      )}
    </motion.div>
  );
};