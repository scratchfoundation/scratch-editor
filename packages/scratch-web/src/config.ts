export const Config = {
    auth: {
        baseUrl: requiredString('SCRATCH_WEB_AUTH_BASE_URL').replace(/\/$/, ''),
    },
};

function requiredString(key: string) {
    const value = window.__SCRATCH_CONFIG__[key];

    if (!value) {
        throw `Config option not specified: ${key}`;
    }

    return value;
}
