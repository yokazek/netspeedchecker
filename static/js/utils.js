/**
 * Shared utility functions
 */

export const formatValue = (val, dec = 1) =>
    (val !== null && val !== undefined) ? val.toFixed(dec) : '--';

export const formatPing = (val) =>
    (val !== null && val !== undefined) ? Math.round(val) : '--';

export const formatTime = (timestamp) => {
    // iOS Safari互換: "YYYY-MM-DD HH:mm:ss" を "YYYY-MM-DDTHH:mm:ssZ" (ISO 8601) に変換
    const isoTimestamp = timestamp.replace(' ', 'T') + 'Z';
    const date = new Date(isoTimestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const escapeHtml = (text) => {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
};

export const getTZOffset = () => {
    try {
        const offset = -new Date().getTimezoneOffset() / 60;
        return isNaN(offset) ? 9 : offset;
    } catch (e) {
        return 9; // 取得失敗時は JST 基準
    }
};
