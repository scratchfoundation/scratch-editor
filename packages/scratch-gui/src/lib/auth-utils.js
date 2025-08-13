import Cookies from 'universal-cookie';
import {validate} from '@samlabs/tokenutility/lib';

const cookies = new Cookies();

/**
 * Check authentication status using SAMScratch_TOKEN cookie
 * @returns {Object} Authentication result with isAuthenticated boolean and optional reason/accessToken
 */
export function checkAuthentication() {
    // Skip authentication check for localhost development
    // UNLESS there's a test parameter in the URL
    if (window.location.href.includes('localhost') && !window.location.href.includes('test=production')) {
        return {isAuthenticated: true};
    }

    try {
        // Get SAMScratch_TOKEN cookie
        const accessToken = cookies.get('SAMScratch_TOKEN');

        // Check if cookie exists
        if (!accessToken) {
            return {isAuthenticated: false, reason: 'no_token'};
        }

        // Validate teacher code
        const validationResults = validate(accessToken.teacherCode);

        if (!validationResults.isValid) {
            return {isAuthenticated: false, reason: 'invalid_token'};
        }

        return {
            isAuthenticated: true,
            accessToken: accessToken
        };
    } catch (error) {
        console.error('Authentication check failed:', error);
        return {isAuthenticated: false, reason: 'validation_error'};
    }
}

/**
 * Get user ID from access token for analytics purposes
 * @param {Object} accessToken - The access token object
 * @returns {string|null} The encrypted user ID or null if not available
 */
export function getUserIdFromToken(accessToken) {
    return accessToken?.encryptedUserId || null;
}

/**
 * Check if we're in development mode (localhost)
 * @returns {boolean} True if running on localhost
 */
export function isDevelopmentMode() {
    return window.location.href.includes('localhost');
}
