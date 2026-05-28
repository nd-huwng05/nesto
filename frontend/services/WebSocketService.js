const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:8000/ws';

const INITIAL_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30000;
const MAX_RETRIES = 10;

class EventEmitter {
    constructor() {
        this.listeners = {};
    }

    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
        return () => this.off(event, callback);
    }

    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
    }

    emit(event, data) {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach((cb) => {
            try {
                cb(data);
            } catch (e) {
                console.error("API Error: ", e?.response?.data || e?.message);
            }
        });
    }
}

class WebSocketService {
    constructor() {
        this._socket = null;
        this._accessToken = null;
        this._channel = null;
        this._branchId = null;
        this._emitter = new EventEmitter();
        this._retryCount = 0;
        this._retryTimer = null;
        this._intentionalClose = false;
    }

    async connect(accessToken, channel, branchId) {
        if (this._socket && this._socket.readyState === 1) {
            this._socket.close();
        }
        this._intentionalClose = false;
        this._accessToken = accessToken;
        this._channel = channel;
        this._branchId = branchId;
        this._retryCount = 0;
        this._clearRetryTimer();
        return this._openSocket();
    }

    async _openSocket() {
        if (!this._accessToken || !this._channel) return;
        if (!this._branchId) {
            const err = new Error('Missing branchId for WebSocket connection.');
            this._emitter.emit('error', err);
            return;
        }
        const query = `token=${encodeURIComponent(this._accessToken)}&branch_id=${encodeURIComponent(this._branchId)}`;
        const url = `${WS_URL}/${this._channel}/?${query}`;
        this._socket = new WebSocket(url);

        this._socket.onopen = () => {
            this._retryCount = 0;
            this._emitter.emit('connected', { channel: this._channel });
        };

        this._socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this._emitter.emit('message', data);
                this._emitter.emit(data?.type, data);
            } catch (e) {
                console.error("API Error: ", e?.response?.data || e?.message);
            }
        };

        this._socket.onerror = (event) => {
            this._emitter.emit('error', event);
        };

        this._socket.onclose = (event) => {
            this._emitter.emit('disconnected', { code: event.code });
            if (!this._intentionalClose) {
                this._scheduleReconnect();
            }
        };
    }

    _scheduleReconnect() {
        if (this._retryCount >= MAX_RETRIES) {
            this._emitter.emit('max_retries_reached', {});
            return;
        }
        const delay = Math.min(
            INITIAL_RETRY_DELAY_MS * Math.pow(2, this._retryCount),
            MAX_RETRY_DELAY_MS
        );
        this._retryCount++;
        this._retryTimer = setTimeout(() => {
            this._openSocket();
        }, delay);
    }

    _clearRetryTimer() {
        if (this._retryTimer) {
            clearTimeout(this._retryTimer);
            this._retryTimer = null;
        }
    }

    subscribe(event, callback) {
        return this._emitter.on(event, callback);
    }

    send(message) {
        if (this._socket && this._socket.readyState === 1) {
            this._socket.send(JSON.stringify(message));
        }
    }

    disconnect() {
        this._intentionalClose = true;
        this._clearRetryTimer();
        if (this._socket) {
            this._socket.close();
            this._socket = null;
        }
        this._accessToken = null;
        this._channel = null;
        this._branchId = null;
    }
}

export const wsService = new WebSocketService();
export const wsEmitter = new EventEmitter();

const connectByChannel = async (branchId, channel, handlers = {}) => {
    const {onMessage, onError, onConnected, onDisconnected} = handlers;
    const token = handlers.token;
    if (!token || !branchId) {
        return () => {};
    }
    await wsService.connect(token, channel, branchId);
    const unsubscribers = [];
    if (onMessage) unsubscribers.push(wsService.subscribe('message', onMessage));
    if (onError) unsubscribers.push(wsService.subscribe('error', onError));
    if (onConnected) unsubscribers.push(wsService.subscribe('connected', onConnected));
    if (onDisconnected) unsubscribers.push(wsService.subscribe('disconnected', onDisconnected));
    return () => {
        unsubscribers.forEach((unsub) => unsub?.());
        wsService.disconnect();
    };
};

export const connectBookingUpdates = async (branchId, handlers = {}) =>
    connectByChannel(branchId, 'bookings', handlers);

export const connectRoomUpdates = async (branchId, handlers = {}) =>
    connectByChannel(branchId, 'rooms', handlers);

export const connectServiceUpdates = async (branchId, handlers = {}) =>
    connectByChannel(branchId, 'services', handlers);

export const connectCustomerUpdates = async (handlers = {}) => {
    const token = handlers.token;
    if (!token) return () => {};
    await wsService.connect(token, 'customer', 'global');
    const unsubscribers = [];
    if (handlers.onMessage) unsubscribers.push(wsService.subscribe('message', handlers.onMessage));
    if (handlers.onError) unsubscribers.push(wsService.subscribe('error', handlers.onError));
    if (handlers.onConnected) unsubscribers.push(wsService.subscribe('connected', handlers.onConnected));
    if (handlers.onDisconnected) unsubscribers.push(wsService.subscribe('disconnected', handlers.onDisconnected));
    return () => {
        unsubscribers.forEach((unsub) => unsub?.());
        wsService.disconnect();
    };
};
