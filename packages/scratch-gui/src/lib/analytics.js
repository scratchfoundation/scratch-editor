// This was originally a thin wrapper around `react-ga`, which only supports UA.
// We now use GTM, so we could use `react-gtm-module`, but it doesn't support GTM environments (GTM_ENV_AUTH).
// So we use the GTM snippets directly.


/**
 * Report analytics to GA4 using an interface similar to the 'react-ga' module we were using for UA.
 */
const GA4 = {
    event: ({category, action, label}) => {
        window.dataLayer = window.dataLayer || [];
        // There is no perfect mapping from UA to GA4
        // See https://support.google.com/analytics/answer/11091025
        window.dataLayer.push({
            event: category,
            action,
            label
        });
    }
};

export default GA4;
