// Utilities for persisting beacon data to localStorage
export function loadBeacons() {
    try {
        const raw = localStorage.getItem('alcateia_beacons');
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed.map(b => ({ ...b, lastSeen: b.lastSeen ? new Date(b.lastSeen) : undefined }));
    } catch (e) {
        console.warn('loadBeacons: failed to parse alcateia_beacons', e);
        return null;
    }
}

export function saveBeacons(beacons) {
    try {
        const toSave = beacons.map(b => ({ ...b, lastSeen: b.lastSeen ? new Date(b.lastSeen).toISOString() : null }));
        localStorage.setItem('alcateia_beacons', JSON.stringify(toSave));
    } catch (e) {
        console.warn('saveBeacons: failed to save alcateia_beacons', e);
    }
}

export function clearBeacons() {
    try { localStorage.removeItem('alcateia_beacons'); } catch (e) { console.warn('clearBeacons', e); }
}

// Logs (message history) persistence
export function loadLogs() {
    try {
        const raw = localStorage.getItem('alcateia_logs');
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) {
        console.warn('loadLogs: failed to parse alcateia_logs', e);
        return null;
    }
}

export function saveLogs(logs) {
    try {
        localStorage.setItem('alcateia_logs', JSON.stringify(logs));
    } catch (e) {
        console.warn('saveLogs: failed to save alcateia_logs', e);
    }
}

export function clearLogs() {
    try { localStorage.removeItem('alcateia_logs'); } catch (e) { console.warn('clearLogs', e); }
}
