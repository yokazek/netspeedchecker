/**
 * API client for communication with the backend
 */

export const api = {
    async fetchHistory(limit = 50) {
        const response = await fetch(`/api/history?limit=${limit}`);
        return await response.json();
    },

    async fetchHistoryByDay(date, tzOffset = 9) {
        const response = await fetch(`/api/history/day?date=${date}&tz_offset=${tzOffset}`);
        return await response.json();
    },

    async fetchLogs() {
        const response = await fetch('/api/logs');
        return await response.json();
    },

    async startTest() {
        const response = await fetch('/api/test', { method: 'POST' });
        return await response.json();
    },

    async clearHistory() {
        return await fetch('/api/history', { method: 'DELETE' });
    },

    async clearLogs() {
        return await fetch('/api/logs', { method: 'DELETE' });
    },

    async fetchStatus() {
        const response = await fetch('/api/status');
        return await response.json();
    }
};
