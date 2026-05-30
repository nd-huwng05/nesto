import {getValidAccessToken} from '../utils/tokenRefresh';

import {WS_BASE_URL} from '../utils/apiConfig';

const WS_URL = WS_BASE_URL.replace(/\/$/, '');

const INITIAL_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30000;
const MAX_RETRIES = 12;

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
            } catch (error) {
                console.error('[WebSocket]', error?.message || error);
            }
        });
    }
}

class ReconnectingSocket {
    constructor({buildUrl, onMessage, onError, onConnected, onDisconnected, onMaxRetries}) {
        this.buildUrl = buildUrl;
        this.onMessage = onMessage;
        this.onError = onError;
        this.onConnected = onConnected;
        this.onDisconnected = onDisconnected;
        this.onMaxRetries = onMaxRetries;
        this._socket = null;
        this._retryCount = 0;
        this._retryTimer = null;
        this._intentionalClose = false;
        this._accessToken = null;
    }

    connect(accessToken) {
        this._intentionalClose = false;
        this._accessToken = accessToken;
        this._retryCount = 0;
        this._clearRetryTimer();
        this._open();
    }

    async _refreshTokenAndOpen() {
        const token = await getValidAccessToken();
        if (!token) {
            this.onError?.(new Error('Missing access token for WebSocket.'));
            return;
        }
        this._accessToken = token;
        this._open();
    }

    _open() {
        if (!this._accessToken) {
            this.onError?.(new Error('Missing access token for WebSocket.'));
            return;
        }

        let url = '';
        try {
            url = this.buildUrl(this._accessToken);
        } catch (error) {
            this.onError?.(error);
            return;
        }

        if (!url) {
            this.onError?.(new Error('WebSocket URL could not be built.'));
            return;
        }

        if (this._socket) {
            try {
                this._socket.close();
            } catch {
                // ignore
            }
        }

        const socket = new WebSocket(url);
        this._socket = socket;

        socket.onopen = () => {
            this._retryCount = 0;
            this.onConnected?.();
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.onMessage?.(data);
            } catch (error) {
                this.onError?.(error);
            }
        };

        socket.onerror = (event) => {
            this.onError?.(event);
        };

        socket.onclose = (event) => {
            this.onDisconnected?.({code: event.code, reason: event.reason});
            this._socket = null;
            if (!this._intentionalClose) {
                this._scheduleReconnect();
            }
        };
    }

    _scheduleReconnect() {
        if (this._retryCount >= MAX_RETRIES) {
            this.onMaxRetries?.();
            return;
        }
        const delay = Math.min(INITIAL_RETRY_DELAY_MS * 2 ** this._retryCount, MAX_RETRY_DELAY_MS);
        this._retryCount += 1;
        this._retryTimer = setTimeout(() => {
            this._refreshTokenAndOpen().catch((error) => this.onError?.(error));
        }, delay);
    }

    _clearRetryTimer() {
        if (this._retryTimer) {
            clearTimeout(this._retryTimer);
            this._retryTimer = null;
        }
    }

    send(payload) {
        if (this._socket?.readyState === WebSocket.OPEN) {
            this._socket.send(JSON.stringify(payload));
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
    }
}

class WebSocketService {
    constructor() {
        this._legacySocket = null;
        this._legacyEmitter = new EventEmitter();
        this._legacyRetryCount = 0;
        this._legacyRetryTimer = null;
        this._legacyIntentionalClose = false;
        this._legacyAccessToken = null;
        this._legacyChannel = null;
        this._legacyBranchId = null;
    }

    async connect(accessToken, channel, branchId = null) {
        this.disconnect();
        this._legacyIntentionalClose = false;
        this._legacyAccessToken = accessToken || (await getValidAccessToken());
        this._legacyChannel = channel;
        this._legacyBranchId = branchId;
        this._legacyRetryCount = 0;
        this._clearLegacyRetry();
        return this._openLegacySocket();
    }

    async _openLegacySocket() {
        if (!this._legacyChannel) return;
        if (this._legacyChannel !== 'customer' && !this._legacyBranchId) {
            this._legacyEmitter.emit('error', new Error('Missing branchId for WebSocket connection.'));
            return;
        }

        const token = this._legacyAccessToken || (await getValidAccessToken());
        if (!token) {
            this._legacyEmitter.emit('error', new Error('Missing access token for WebSocket connection.'));
            return;
        }
        this._legacyAccessToken = token;

        const queryParts = [`token=${encodeURIComponent(token)}`];
        if (this._legacyBranchId) {
            queryParts.push(`branch_id=${encodeURIComponent(this._legacyBranchId)}`);
        }
        const query = queryParts.join('&');
        const url = `${WS_URL}/ws/${this._legacyChannel}/?${query}`;
        this._legacySocket = new WebSocket(url);

        this._legacySocket.onopen = () => {
            this._legacyRetryCount = 0;
            this._legacyEmitter.emit('connected', {channel: this._legacyChannel});
        };

        this._legacySocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this._legacyEmitter.emit('message', data);
                if (data?.type) this._legacyEmitter.emit(data.type, data);
            } catch (error) {
                this._legacyEmitter.emit('error', error);
            }
        };

        this._legacySocket.onerror = (event) => {
            this._legacyEmitter.emit('error', event);
        };

        this._legacySocket.onclose = (event) => {
            this._legacyEmitter.emit('disconnected', {code: event.code});
            if (!this._legacyIntentionalClose) {
                this._scheduleLegacyReconnect();
            }
        };
    }

    _scheduleLegacyReconnect() {
        if (this._legacyRetryCount >= MAX_RETRIES) {
            this._legacyEmitter.emit('max_retries_reached', {});
            return;
        }
        const delay = Math.min(INITIAL_RETRY_DELAY_MS * 2 ** this._legacyRetryCount, MAX_RETRY_DELAY_MS);
        this._legacyRetryCount += 1;
        this._legacyRetryTimer = setTimeout(() => {
            this._openLegacySocket().catch((error) => this._legacyEmitter.emit('error', error));
        }, delay);
    }

    _clearLegacyRetry() {
        if (this._legacyRetryTimer) {
            clearTimeout(this._legacyRetryTimer);
            this._legacyRetryTimer = null;
        }
    }

    subscribe(event, callback) {
        return this._legacyEmitter.on(event, callback);
    }

    send(message) {
        if (this._legacySocket?.readyState === WebSocket.OPEN) {
            this._legacySocket.send(JSON.stringify(message));
        }
    }

    disconnect() {
        this._legacyIntentionalClose = true;
        this._clearLegacyRetry();
        if (this._legacySocket) {
            this._legacySocket.close();
            this._legacySocket = null;
        }
        this._legacyAccessToken = null;
        this._legacyChannel = null;
        this._legacyBranchId = null;
    }
}

export const wsService = new WebSocketService();
export const wsEmitter = new EventEmitter();

const bindReconnectingSocket = async (socket, handlers = {}) => {
    const emitter = new EventEmitter();
    const {onMessage, onError, onConnected, onDisconnected, onMaxRetries, token} = handlers;

    if (onMessage) emitter.on('message', onMessage);
    if (onError) emitter.on('error', onError);
    if (onConnected) emitter.on('connected', onConnected);
    if (onDisconnected) emitter.on('disconnected', onDisconnected);
    if (onMaxRetries) emitter.on('max_retries_reached', onMaxRetries);

    socket.onMessage = (data) => emitter.emit('message', data);
    socket.onError = (error) => emitter.emit('error', error);
    socket.onConnected = () => emitter.emit('connected', {});
    socket.onDisconnected = (meta) => emitter.emit('disconnected', meta);
    socket.onMaxRetries = () => emitter.emit('max_retries_reached', {});

    const resolvedToken = token || (await getValidAccessToken());
    if (resolvedToken) {
        socket.connect(resolvedToken);
    }

    return () => {
        socket.disconnect();
    };
};

export const connectBookingLiveBill = async (bookingId, handlers = {}) => {
    const safeId = String(bookingId || '').trim();
    if (!safeId) return () => {};

    const socket = new ReconnectingSocket({
        buildUrl: (accessToken) =>
            `${WS_URL}/ws/booking/${encodeURIComponent(safeId)}/?token=${encodeURIComponent(accessToken)}`,
        onMessage: handlers.onMessage,
        onError: handlers.onError,
        onConnected: handlers.onConnected,
        onDisconnected: handlers.onDisconnected,
        onMaxRetries: handlers.onMaxRetries,
    });

    return bindReconnectingSocket(socket, handlers);
};

export const connectBranchTasks = async (branchId, handlers = {}) => {
    const safeBranchId = String(branchId || '').trim();
    if (!safeBranchId) return () => {};

    const socket = new ReconnectingSocket({
        buildUrl: (accessToken) =>
            `${WS_URL}/ws/branch/${encodeURIComponent(safeBranchId)}/tasks/?token=${encodeURIComponent(accessToken)}`,
        onMessage: handlers.onMessage,
        onError: handlers.onError,
        onConnected: handlers.onConnected,
        onDisconnected: handlers.onDisconnected,
        onMaxRetries: handlers.onMaxRetries,
    });

    return bindReconnectingSocket(socket, handlers);
};

const connectByChannel = async (branchId, channel, handlers = {}) => {
    const {onMessage, onError, onConnected, onDisconnected, token} = handlers;
    if (!branchId) return () => {};

    const resolvedToken = token || (await getValidAccessToken());
    if (!resolvedToken) return () => {};

    await wsService.connect(resolvedToken, channel, branchId);
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

export const connectRoomUpdates = async (branchId, handlers = {}) => {
    const safeBranchId = String(branchId || '').trim();
    if (!safeBranchId) return () => {};

    const socket = new ReconnectingSocket({
        buildUrl: (accessToken) =>
            `${WS_URL}/ws/rooms/?token=${encodeURIComponent(accessToken)}&branch_id=${encodeURIComponent(safeBranchId)}`,
        onMessage: handlers.onMessage,
        onError: handlers.onError,
        onConnected: handlers.onConnected,
        onDisconnected: handlers.onDisconnected,
        onMaxRetries: handlers.onMaxRetries,
    });

    return bindReconnectingSocket(socket, handlers);
};

export const connectServiceUpdates = async (branchId, handlers = {}) =>
    connectByChannel(branchId, 'services', handlers);

export const connectCustomerUpdates = async (handlers = {}) => {
    const token = handlers.token || (await getValidAccessToken());
    if (!token) return () => {};
    const branchId = String(handlers.branchId || '').trim() || null;
    await wsService.connect(token, 'customer', branchId);
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
