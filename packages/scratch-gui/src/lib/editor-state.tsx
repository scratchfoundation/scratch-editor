import {createStore, combineReducers, compose, Store} from 'redux';
import localesReducer, {initLocale, localesInitialState} from '../reducers/locales';
import locales from 'scratch-l10n';
import {detectLocale} from './detect-locale';
import {GUIConfig} from '../gui-config';
import log from './log.js';

interface WindowWithDevtools {
    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__?: typeof compose;
}

const composeEnhancers = (window as WindowWithDevtools).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

// TypeScript doesn't know about require here, and we don't want to change behavior, so...
declare function require(path: '../reducers/gui'): typeof import('../reducers/gui');
declare function require(path: 'scratch-paint'): typeof import('scratch-paint');
declare function require(path: '../legacy-config'): typeof import('../legacy-config');

export interface EditorStateParams {
    localesOnly?: boolean;
    isFullScreen?: boolean;
    isPlayerOnly?: boolean;
    showTelemetryModal?: boolean;
    isEmbedded?: boolean;
    locale?: string;
}

/**
 * Manages an editor's Redux state.
 *
 * To be used in tandem with an AppStateHOC component to be provided to the editor.
 */
export class EditorState {
    /**
     * The redux store that this class wraps.
     */
    public readonly store: Store<unknown>;

    constructor (params: EditorStateParams, configFactory: () => GUIConfig) {
        let initialState = {};
        let reducers = {};
        let enhancer;

        let initializedLocales = localesInitialState;

        let locale = 'en';
        if (params.locale) {
            if (Object.keys(locales).includes(params.locale)) {
                locale = params.locale;
            } else {
                log.warn(`Unsupported locale ${params.locale}, falling back to en`);
            }
        } else {
            locale = detectLocale(Object.keys(locales));
        }

        if (locale !== 'en') {
            initializedLocales = initLocale(initializedLocales, locale);
        }

        if (params.localesOnly) {
            // Used for instantiating minimal state for the unsupported
            // browser modal
            reducers = {locales: localesReducer};
            initialState = {locales: initializedLocales};
            enhancer = composeEnhancers();
        } else {
            // You are right, this is gross. But it's necessary to avoid
            // importing unneeded code that will crash unsupported browsers.
            const guiRedux = require('../reducers/gui');
            const guiReducer = guiRedux.default;
            const {
                buildInitialState,
                guiMiddleware,
                initFullScreen,
                initPlayer,
                initTelemetryModal,
                initEmbedded
            } = guiRedux;
            const {ScratchPaintReducer} = require('scratch-paint');

            const configOrLegacy = configFactory ?
                configFactory() :
                require('../legacy-config').legacyConfig;

            let initializedGui = buildInitialState(configOrLegacy);
            if (params.isFullScreen || params.isPlayerOnly || params.isEmbedded) {
                if (params.isFullScreen) {
                    initializedGui = initFullScreen(initializedGui);
                }
                if (params.isPlayerOnly) {
                    initializedGui = initPlayer(initializedGui);
                }
                if (params.isEmbedded) {
                    initializedGui = initEmbedded(initializedGui);
                }
            } else if (params.showTelemetryModal) {
                initializedGui = initTelemetryModal(initializedGui);
            }
            reducers = {
                locales: localesReducer,
                scratchGui: guiReducer,
                scratchPaint: ScratchPaintReducer
            };
            initialState = {
                locales: initializedLocales,
                scratchGui: initializedGui
            };
            enhancer = composeEnhancers(guiMiddleware);
        }
        const reducer = combineReducers(reducers);
        this.store = createStore(reducer, initialState, enhancer);
    }

    dispatch (action) {
        this.store.dispatch(action);
    }
}
