import {EditorState, createStandaloneRoot, setAppElement} from '../index-standalone';
import HashParserHOC from '../lib/hash-parser-hoc.jsx';

import log from '../lib/log.js';

const onClickLogo = () => {
    window.location = 'https://scratch.mit.edu';
};

const handleTelemetryModalCancel = () => {
    log('User canceled telemetry modal');
};

const handleTelemetryModalOptIn = () => {
    log('User opted into telemetry');
};

const handleTelemetryModalOptOut = () => {
    log('User opted out of telemetry');
};

/*
 * Render the GUI playground. This is a separate function because importing anything
 * that instantiates the VM causes unsupported browsers to crash
 * {object} appTarget - the DOM element to render to
 */
export default appTarget => {
    setAppElement(appTarget);

    // TODO a hack for testing the backpack, allow backpack host to be set by url param
    const backpackHostMatches = window.location.href.match(/[?&]backpack_host=([^&]*)&?/);
    const backpackHost = backpackHostMatches ? backpackHostMatches[1] : null;

    const scratchDesktopMatches = window.location.href.match(/[?&]isScratchDesktop=([^&]+)/);
    let simulateScratchDesktop;
    if (scratchDesktopMatches) {
        try {
            // parse 'true' into `true`, 'false' into `false`, etc.
            simulateScratchDesktop = JSON.parse(scratchDesktopMatches[1]);
        } catch {
            // it's not JSON so just use the string
            // note that a typo like "falsy" will be treated as true
            simulateScratchDesktop = scratchDesktopMatches[1];
        }
    }

    if (process.env.NODE_ENV === 'production' && typeof window === 'object') {
        // Warn before navigating away
        window.onbeforeunload = () => true;
    }

    const state = new EditorState({
        showTelemetryModal: simulateScratchDesktop
    });
    const gui = createStandaloneRoot(state, appTarget, {
        wrappers: [HashParserHOC]
    });

    // important: this is checking whether `simulateScratchDesktop` is truthy, not just defined!
    if (simulateScratchDesktop) {
        gui.render({
            canEditTitle: true,
            isScratchDesktop: true,
            showTelemetryModal: true,
            canSave: false,
            onTelemetryModalCancel: handleTelemetryModalCancel,
            onTelemetryModalOptIn: handleTelemetryModalOptIn,
            onTelemetryModalOptOut: handleTelemetryModalOptOut
        });
    } else {
        gui.render({
            canEditTitle: true,
            backpackVisible: true,
            showComingSoon: true,
            backpackHost,
            canSave: false,
            onClickLogo
        });
    }
};
