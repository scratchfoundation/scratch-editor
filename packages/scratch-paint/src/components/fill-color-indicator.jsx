import React from 'react';
import PropTypes from 'prop-types';
import Popover from 'react-popover';

import {defineMessages, injectIntl, intlShape} from 'react-intl';
import Label from './forms/label.jsx';
import ColorPicker from './color-picker.jsx';
import ColorButton from './color-button.jsx';

import styles from './paint-editor.css';

const messages = defineMessages({
    fill: {
        id: 'paint.paintEditor.fill',
        description: 'Label for the color picker for the fill color',
        defaultMessage: 'Fill'
    }
});

const FillColorIndicatorComponent = props => (
    <div className={styles.inputGroup}>
        <Popover
            body={
                <ColorPicker
                    color={props.fillColor}
                    onChangeColor={props.onChangeFillColor}
                />
            }
            isOpen={props.fillColorModalVisible}
            preferPlace="below"
            onOuterAction={props.onCloseFillColor}
        >
            <Label text={props.intl.formatMessage(messages.fill)}>
                <ColorButton
                    color={props.fillColor}
                    onClick={props.onOpenFillColor}
                />
            </Label>
        </Popover>
    </div>
);

FillColorIndicatorComponent.propTypes = {
    fillColor: PropTypes.string,
    fillColorModalVisible: PropTypes.bool.isRequired,
    intl: intlShape,
    onChangeFillColor: PropTypes.func.isRequired,
    onCloseFillColor: PropTypes.func.isRequired,
    onOpenFillColor: PropTypes.func.isRequired
};

export default injectIntl(FillColorIndicatorComponent);
