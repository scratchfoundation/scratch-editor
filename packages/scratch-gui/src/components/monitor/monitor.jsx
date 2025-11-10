import React from 'react';
import PropTypes from 'prop-types';
import Draggable from 'react-draggable';
import {FormattedMessage} from 'react-intl';
import ContextMenu from '../../lib/radix-ui-context-menu.js';
import Box from '../box/box.jsx';
import DefaultMonitor from './default-monitor.jsx';
import LargeMonitor from './large-monitor.jsx';
import SliderMonitor from '../../containers/slider-monitor.jsx';
import ListMonitor from '../../containers/list-monitor.jsx';
import {getColorsForTheme} from '../../lib/themes/index.js';
import contextMenuStyles from '../context-menu/context-menu.css';
import {MenuItem, BorderedMenuItem} from '../context-menu/context-menu.jsx';

import styles from './monitor.css';


// Map category name to color name used in scratch-blocks Blockly.Colours
const categoryColorMap = {
    data: 'data',
    sensing: 'sensing',
    sound: 'sounds',
    looks: 'looks',
    motion: 'motion',
    list: 'data_lists',
    extension: 'pen'
};

const modes = {
    default: DefaultMonitor,
    large: LargeMonitor,
    slider: SliderMonitor,
    list: ListMonitor
};

const getCategoryColor = (theme, category) => {
    const colors = getColorsForTheme(theme);
    return {
        background: colors[categoryColorMap[category]].primary,
        text: colors.text
    };
};

const MonitorComponent = props => (
    <ContextMenu.Root id={`monitor-${props.label}`}>
        <Draggable
            bounds=".monitor-overlay"
            cancel=".no-drag"
            defaultClassNameDragging={styles.dragging}
            disabled={!props.draggable}
            onStop={props.onDragEnd}
        >
            <Box
                className={styles.monitorContainer}
                componentRef={props.componentRef}
                onDoubleClick={
                    props.mode === 'list' || !props.draggable ?
                        null :
                        props.onNextMode
                }
            >
                <ContextMenu.Trigger className="ContextMenuTrigger">
                    {React.createElement(modes[props.mode], {
                        categoryColor: getCategoryColor(
                            props.theme,
                            props.category
                        ),
                        ...props
                    })}
                </ContextMenu.Trigger>
            </Box>
        </Draggable>
        <ContextMenu.Content
            className={contextMenuStyles.contextMenuContent}
            collisionPadding={10}
            sticky="always"
        >
            {props.onSetModeToDefault && (
                <MenuItem onSelect={props.onSetModeToDefault}>
                    <FormattedMessage
                        defaultMessage="normal readout"
                        description="Menu item to switch to the default monitor"
                        id="gui.monitor.contextMenu.default"
                    />
                </MenuItem>
            )}
            {props.onSetModeToLarge && (
                <MenuItem onSelect={props.onSetModeToLarge}>
                    <FormattedMessage
                        defaultMessage="large readout"
                        description="Menu item to switch to the large monitor"
                        id="gui.monitor.contextMenu.large"
                    />
                </MenuItem>
            )}
            {props.onSetModeToSlider && (
                <MenuItem onSelect={props.onSetModeToSlider}>
                    <FormattedMessage
                        defaultMessage="slider"
                        description="Menu item to switch to the slider monitor"
                        id="gui.monitor.contextMenu.slider"
                    />
                </MenuItem>
            )}
            {props.onSliderPromptOpen && props.mode === 'slider' && (
                <BorderedMenuItem onSelect={props.onSliderPromptOpen}>
                    <FormattedMessage
                        defaultMessage="change slider range"
                        description="Menu item to change the slider range"
                        id="gui.monitor.contextMenu.sliderRange"
                    />
                </BorderedMenuItem>
            )}
            {props.onImport && (
                <MenuItem onSelect={props.onImport}>
                    <FormattedMessage
                        defaultMessage="import"
                        description="Menu item to import into list monitors"
                        id="gui.monitor.contextMenu.import"
                    />
                </MenuItem>
            )}
            {props.onExport && (
                <MenuItem onSelect={props.onExport}>
                    <FormattedMessage
                        defaultMessage="export"
                        description="Menu item to export from list monitors"
                        id="gui.monitor.contextMenu.export"
                    />
                </MenuItem>
            )}
            {props.onHide && (
                <MenuItem onSelect={props.onHide}>
                    <FormattedMessage
                        defaultMessage="hide"
                        description="Menu item to hide the monitor"
                        id="gui.monitor.contextMenu.hide"
                    />
                </MenuItem>
            )}
        </ContextMenu.Content>
    </ContextMenu.Root>
);

const monitorModes = Object.keys(modes);

MonitorComponent.propTypes = {
    category: PropTypes.oneOf(Object.keys(categoryColorMap)),
    componentRef: PropTypes.func.isRequired,
    draggable: PropTypes.bool.isRequired,
    label: PropTypes.string.isRequired,
    mode: PropTypes.oneOf(monitorModes),
    onDragEnd: PropTypes.func.isRequired,
    onExport: PropTypes.func,
    onImport: PropTypes.func,
    onHide: PropTypes.func,
    onNextMode: PropTypes.func.isRequired,
    onSetModeToDefault: PropTypes.func,
    onSetModeToLarge: PropTypes.func,
    onSetModeToSlider: PropTypes.func,
    onSliderPromptOpen: PropTypes.func,
    theme: PropTypes.string.isRequired
};

MonitorComponent.defaultProps = {
    category: 'extension',
    mode: 'default'
};

export {
    MonitorComponent as default,
    monitorModes
};
