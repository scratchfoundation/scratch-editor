import React from 'react';
import PropTypes from 'prop-types';
import Popover from 'react-popover';
import {defineMessages, injectIntl, intlShape} from 'react-intl';

import ColorButton from './color-button/color-button.jsx';
import ColorPicker from '../containers/color-picker.jsx';
import InputGroup from './input-group/input-group.jsx';
import Label from './forms/label.jsx';

import GradientTypes from '../lib/gradient-types';

const messages = defineMessages({
    fill: {
        id: 'paint.paintEditor.fill',
        description: 'Label for the color picker for the fill color',
        defaultMessage: 'Fill'
    }
});

const FillColorIndicatorComponent = props => (
    <InputGroup
        className={props.className}
        disabled={props.disabled}
    >
        <Popover
            body={
                <ColorPicker
                    color={props.fillColor}
                    color2={props.fillColor2}
                    gradientType={props.gradientType}
                    shouldShowGradientTools={props.shouldShowGradientTools}
                    onChangeColor={props.onChangeFillColor}
                    onChangeGradientType={props.onChangeGradientType}
                    onSwap={props.onSwap}
                />
            }
            isOpen={props.fillColorModalVisible}
            preferPlace="below"
            onOuterAction={props.onCloseFillColor}
        >
            <Label text={props.intl.formatMessage(messages.fill)}>
                <ColorButton
                    color={props.fillColor}
                    color2={props.fillColor2}
                    gradientType={props.gradientType}
                    onClick={props.onOpenFillColor}
                />
            </Label>
        </Popover>
    </InputGroup>
);

FillColorIndicatorComponent.propTypes = {
    className: PropTypes.string,
    disabled: PropTypes.bool.isRequired,
    fillColor: PropTypes.string,
    fillColor2: PropTypes.string,
    fillColorModalVisible: PropTypes.bool.isRequired,
    gradientType: PropTypes.oneOf(Object.keys(GradientTypes)).isRequired,
    intl: intlShape,
    onChangeFillColor: PropTypes.func.isRequired,
    onChangeGradientType: PropTypes.func.isRequired,
    onCloseFillColor: PropTypes.func.isRequired,
    onOpenFillColor: PropTypes.func.isRequired,
    onSwap: PropTypes.func.isRequired,
    shouldShowGradientTools: PropTypes.bool.isRequired
};

export default injectIntl(FillColorIndicatorComponent);
