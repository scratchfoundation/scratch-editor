import React from 'react';
import PropTypes from 'prop-types';
import Popover from 'react-popover';

import {defineMessages, injectIntl, intlShape} from 'react-intl';
import Label from './forms/label.jsx';
import ColorPicker from './color-picker.jsx';
import ColorButton from './color-button.jsx';

import styles from './paint-editor.css';

const messages = defineMessages({
    stroke: {
        id: 'paint.paintEditor.stroke',
        description: 'Label for the color picker for the outline color',
        defaultMessage: 'Outline'
    }
});

const StrokeColorIndicatorComponent = props => (
    <div className={styles.inputGroup}>
        <Popover
            body={
                <ColorPicker
                    color={props.strokeColor}
                    onChangeColor={props.onChangeStrokeColor}
                />
            }
            isOpen={props.strokeColorModalVisible}
            preferPlace="below"
            onOuterAction={props.onCloseStrokeColor}
        >
            <Label text={props.intl.formatMessage(messages.stroke)}>
                <ColorButton
                    color={props.strokeColor}
                    onClick={props.onOpenStrokeColor}
                />
            </Label>
        </Popover>
    </div>
);

StrokeColorIndicatorComponent.propTypes = {
    intl: intlShape,
    onChangeStrokeColor: PropTypes.func.isRequired,
    onCloseStrokeColor: PropTypes.func.isRequired,
    onOpenStrokeColor: PropTypes.func.isRequired,
    strokeColor: PropTypes.string,
    strokeColorModalVisible: PropTypes.bool.isRequired
};

export default injectIntl(StrokeColorIndicatorComponent);
