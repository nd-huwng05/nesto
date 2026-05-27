import { apiClient } from '../configuration/Apis';

const WS_BASE_URL = process.env.EXPO_PUBLIC_WS_BASE_URL || 'ws://localhost:8000/ws';

class WebSocketManager {
    constructor() {
        this.sockets = {};
        this.listeners = {};
    }

    connect(channel, callbacks = {}) {
        if (this.sockets[channel]) {
            return this.sockets[channel];
        }
        const token = this._getToken();
        const wsUrl = `${WS_BASE_URL}/${channel}/?token=${token || ''}`;
        const socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            console.log(`WebSocket connected: ${channel}`);
            if (callbacks.onOpen) callbacks.onOpen();
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (this.listeners[channel]) {
                    this.listeners[channel].forEach(callback => callback(data));
                }
                if (callbacks.onMessage) callbacks.onMessage(data);
            } catch (e) {
                console.error('WebSocket message parse error:', e);
            }
        };

        socket.onerror = (error) => {
            console.error(`WebSocket error (${channel}):`, error);
            if (callbacks.onError) callbacks.onError(error);
        };

        socket.onclose = () => {
            console.log(`WebSocket disconnected: ${channel}`);
            delete this.sockets[channel];
            if (callbacks.onClose) callbacks.onClose();
        };

        this.sockets[channel] = socket;
        return socket;
    }

    disconnect(channel) {
        if (this.sockets[channel]) {
            this.sockets[channel].close();
            delete this.sockets[channel];
        }
    }

    disconnectAll() {
        Object.keys(this.sockets).forEach(channel => this.disconnect(channel));
    }

    subscribe(channel, callback) {
        if (!this.listeners[channel]) {
            this.listeners[channel] = [];
        }
        this.listeners[channel].push(callback);
        return () => {
            this.listeners[channel] = this.listeners[channel].filter(cb => cb !== callback);
        };
    }

    _getToken() {
        try {
            const { default: AsyncStorage } = require('@react-native-async-storage/async-storage');
            return AsyncStorage.getItem('access_token');
        } catch {
            return null;
        }
    }
}

export const wsManager = new WebSocketManager();

export const connectBookingUpdates = (branchId, callbacks) => {
    return wsManager.connect(`bookings/${branchId}/`, callbacks);
};

export const connectServiceOrderUpdates = (branchId, callbacks) => {
    return wsManager.connect(`services/${branchId}/`, callbacks);
};

export const disconnectBookingUpdates = (branchId) => {
    wsManager.disconnect(`bookings/${branchId}/`);
};

export const disconnectServiceOrderUpdates = (branchId) => {
    wsManager.disconnect(`services/${branchId}/`);
};
