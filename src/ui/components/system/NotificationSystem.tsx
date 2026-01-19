/**
 * NotificationSystem - Toast Notifications
 * 
 * Displays system notifications to the user
 */

import React from 'react';
import { useGameStore } from '@store/index';
import './NotificationSystem.css';

export const NotificationSystem: React.FC = () => {
    const notifications = useGameStore(state => state.notifications);
    const removeNotification = useGameStore(state => state.removeNotification);

    return (
        <div className="notification-system">
            {notifications.map(notification => (
                <div
                    key={notification.id}
                    className={`notification notification-${notification.type.toLowerCase()}`}
                    onClick={() => removeNotification(notification.id)}
                >
                    <span className="notification-icon">
                        {notification.type === 'INFO' && 'ℹ️'}
                        {notification.type === 'SUCCESS' && '✅'}
                        {notification.type === 'WARNING' && '⚠️'}
                        {notification.type === 'ERROR' && '❌'}
                    </span>
                    <span className="notification-message">
                        {notification.message.zh || notification.message.en}
                    </span>
                </div>
            ))}
        </div>
    );
};
