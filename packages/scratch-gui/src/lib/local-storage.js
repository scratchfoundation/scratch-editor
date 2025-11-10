/**
 * Copied from scratch-www:
 * Util functions for managing local storage entries as key-value pairs.
 */

const getMap = key => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
};

const setMap = (key, map) => {
    localStorage.setItem(key, JSON.stringify(map));
};

export const getLocalStorageValue = (key, id) => {
    const map = getMap(key);
    return map[id];
};

export const setLocalStorageValue = (key, id, value) => {
    const map = getMap(key);
    map[id] = value;
    setMap(key, map);
};
