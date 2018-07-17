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
    stroke: {
        id: 'paint.paintEditor.stroke',
        description: 'Label for the color picker for the outline color',
        defaultMessage: 'Outline'
    }
});

const StrokeColorIndicatorComponent = props => (
    <InputGroup
        className={props.className}
        disabled={props.disabled}
    >
        <Popover
            body={
                <ColorPicker
                    color={props.strokeColor}
                    color2={null}
                    gradientType={GradientTypes.SOLID}
                    shouldShowGradientTools={false}
                    // @todo handle stroke gradient
                    onChangeColor={props.onChangeStrokeColor}
                />
            }
            isOpen={props.strokeColorModalVisible}
            preferPlace="below"
            onOuterAction={props.onCloseStrokeColor}
        >
            <Label text={props.intl.formatMessage(messages.stroke)}>
                <ColorButton
                    outline
                    color={props.strokeColor}
                    color2={null}
                    gradientType={GradientTypes.SOLID}
                    // @todo handle stroke gradient
                    onClick={props.onOpenStrokeColor}
                />
            </Label>
        </Popover>
    </InputGroup>
);

StrokeColorIndicatorComponent.propTypes = {
    className: PropTypes.string,
    disabled: PropTypes.bool.isRequired,
    intl: intlShape,
    onChangeStrokeColor: PropTypes.func.isRequired,
    onCloseStrokeColor: PropTypes.func.isRequired,
    onOpenStrokeColor: PropTypes.func.isRequired,
    strokeColor: PropTypes.string,
    strokeColorModalVisible: PropTypes.bool.isRequired
};

export default injectIntl(StrokeColorIndicatorComponent);
