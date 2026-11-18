import React from 'react';
import ReactDomClient from 'react-dom/client';

import AppStateHOC from '../lib/app-state-hoc.jsx';
import GUI from '../containers/gui.jsx';
import {defaultProjectId} from '../reducers/project-state';

/*
 * Render a self-contained editor for site maintenance mode, while scratch.mit.edu is down.
 * Everything that depends on the website (accounts, sharing, remixing, the backpack, loading
 * projects by ID) is turned off, and saving goes to the user's computer.
 * {object} appTarget - the DOM element to render to
 */
export default appTarget => {
    GUI.setAppElement(appTarget);

    // No HashParserHOC: the project server may be down, so always start from the default project.
    const WrappedGui = AppStateHOC(GUI);

    if (process.env.NODE_ENV === 'production' && typeof window === 'object') {
        // Warn before navigating away
        window.onbeforeunload = () => true;
    }

    const root = ReactDomClient.createRoot(appTarget);

    root.render(
        <WrappedGui
            canEditTitle
            canSave={false}
            canShare={false}
            canRemix={false}
            backpackVisible={false}
            showComingSoon={false}
            showSaveToComputer
            projectId={defaultProjectId}
        />
    );
};
