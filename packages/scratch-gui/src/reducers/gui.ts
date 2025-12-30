import {applyMiddleware, compose, combineReducers} from 'redux';
import alertsReducer, {alertsInitialState} from './alerts';
import assetDragReducer, {assetDragInitialState} from './asset-drag';
import cardsReducer, {cardsInitialState} from './cards';
import colorPickerReducer, {colorPickerInitialState} from './color-picker';
import connectionModalReducer, {connectionModalInitialState} from './connection-modal';
import customProceduresReducer, {customProceduresInitialState} from './custom-procedures';
import blockDragReducer, {blockDragInitialState} from './block-drag';
import editorTabReducer, {editorTabInitialState} from './editor-tab';
import hoveredTargetReducer, {hoveredTargetInitialState} from './hovered-target';
import menuReducer, {menuInitialState} from './menus';
import micIndicatorReducer, {micIndicatorInitialState} from './mic-indicator';
import modalReducer, {modalsInitialState} from './modals';
import modeReducer, {modeInitialState} from './mode';
import monitorReducer, {monitorsInitialState} from './monitors';
import monitorLayoutReducer, {monitorLayoutInitialState} from './monitor-layout';
import platformReducer, {platformInitialState} from './platform';
import projectChangedReducer, {projectChangedInitialState} from './project-changed';
import projectStateReducer, {projectStateInitialState} from './project-state';
import projectTitleReducer, {projectTitleInitialState} from './project-title';
import fontsLoadedReducer, {fontsLoadedInitialState} from './fonts-loaded';
import restoreDeletionReducer, {restoreDeletionInitialState} from './restore-deletion';
import stageSizeReducer, {stageSizeInitialState} from './stage-size';
import targetReducer, {targetsInitialState} from './targets';
import settingsReducer, {settingsInitialState} from './settings';
import timeoutReducer, {timeoutInitialState} from './timeout';
import timeTravelReducer, {timeTravelInitialState} from './time-travel';
import toolboxReducer, {toolboxInitialState} from './toolbox';
import vmReducer, {vmInitialState} from './vm';
import vmStatusReducer, {vmStatusInitialState} from './vm-status';
import workspaceMetricsReducer, {workspaceMetricsInitialState} from './workspace-metrics';
import throttle from 'redux-throttle';

import decks from '../lib/libraries/decks/index.jsx';
import {GUIConfig} from '../gui-config';

const guiMiddleware = compose(applyMiddleware(throttle(300, {leading: true, trailing: true})));

const buildInitialState = (config: GUIConfig) => ({
    alerts: alertsInitialState,
    assetDrag: assetDragInitialState,
    blockDrag: blockDragInitialState,
    cards: cardsInitialState,
    colorPicker: colorPickerInitialState,
    config,
    connectionModal: connectionModalInitialState,
    customProcedures: customProceduresInitialState,
    editorTab: editorTabInitialState,
    mode: modeInitialState,
    hoveredTarget: hoveredTargetInitialState,
    stageSize: stageSizeInitialState,
    menus: menuInitialState,
    micIndicator: micIndicatorInitialState,
    modals: modalsInitialState,
    monitors: monitorsInitialState,
    monitorLayout: monitorLayoutInitialState,
    platform: platformInitialState,
    projectChanged: projectChangedInitialState,
    projectState: projectStateInitialState,
    projectTitle: projectTitleInitialState,
    fontsLoaded: fontsLoadedInitialState,
    restoreDeletion: restoreDeletionInitialState,
    targets: targetsInitialState,
    settings: settingsInitialState,
    timeout: timeoutInitialState,
    timeTravel: timeTravelInitialState,
    toolbox: toolboxInitialState,
    vm: vmInitialState(config),
    vmStatus: vmStatusInitialState,
    workspaceMetrics: workspaceMetricsInitialState
});

const initPlayer = function (currentState) {
    return Object.assign(
        {},
        currentState,
        {mode: {
            isFullScreen: currentState.mode.isFullScreen,
            isPlayerOnly: true,
            // When initializing in player mode, make sure to reset
            // hasEverEnteredEditorMode
            hasEverEnteredEditor: false
        }}
    );
};
const initFullScreen = function (currentState) {
    return Object.assign(
        {},
        currentState,
        {mode: {
            isFullScreen: true,
            isPlayerOnly: currentState.mode.isPlayerOnly,
            hasEverEnteredEditor: currentState.mode.hasEverEnteredEditor
        }}
    );
};

const initEmbedded = function (currentState) {
    return Object.assign(
        {},
        currentState,
        {mode: {
            showBranding: true,
            isFullScreen: true,
            isPlayerOnly: true,
            hasEverEnteredEditor: false
        }}
    );
};

const initTutorialCard = function (currentState, deckId) {
    return Object.assign(
        {},
        currentState,
        {
            cards: {
                visible: true,
                content: decks,
                activeDeckId: deckId,
                expanded: true,
                step: 0,
                x: 0,
                y: 0,
                dragging: false
            }
        }
    );
};

const initTelemetryModal = function (currentState) {
    return Object.assign(
        {},
        currentState,
        {
            modals: {
                telemetryModal: true // this key must match `MODAL_TELEMETRY` in modals.js
            }
        }
    );
};

const configReducer = function (state?: GUIConfig | null) {
    if (typeof state === 'undefined') return null;

    return state;
};

const guiReducer = combineReducers({
    alerts: alertsReducer,
    assetDrag: assetDragReducer,
    blockDrag: blockDragReducer,
    cards: cardsReducer,
    colorPicker: colorPickerReducer,
    connectionModal: connectionModalReducer,
    config: configReducer,
    customProcedures: customProceduresReducer,
    editorTab: editorTabReducer,
    mode: modeReducer,
    hoveredTarget: hoveredTargetReducer,
    stageSize: stageSizeReducer,
    menus: menuReducer,
    micIndicator: micIndicatorReducer,
    modals: modalReducer,
    monitors: monitorReducer,
    monitorLayout: monitorLayoutReducer,
    platform: platformReducer,
    projectChanged: projectChangedReducer,
    projectState: projectStateReducer,
    projectTitle: projectTitleReducer,
    fontsLoaded: fontsLoadedReducer,
    restoreDeletion: restoreDeletionReducer,
    targets: targetReducer,
    settings: settingsReducer,
    timeout: timeoutReducer,
    timeTravel: timeTravelReducer,
    toolbox: toolboxReducer,
    vm: vmReducer,
    vmStatus: vmStatusReducer,
    workspaceMetrics: workspaceMetricsReducer
});

export {
    guiReducer as default,
    buildInitialState,
    guiMiddleware,
    initEmbedded,
    initFullScreen,
    initPlayer,
    initTelemetryModal,
    initTutorialCard
};
