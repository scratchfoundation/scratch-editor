import React from 'react';
import PropTypes from 'prop-types';

import {defineMessages, injectIntl, intlShape} from 'react-intl';
import BufferedInputHOC from './forms/buffered-input-hoc.jsx';
import Label from './forms/label.jsx';
import Input from './forms/input.jsx';

import {MIXED} from '../helper/style-path';

import styles from './paint-editor.css';

const BufferedInput = BufferedInputHOC(Input);
const messages = defineMessages({
    fill: {
        id: 'paint.paintEditor.fill',
        description: 'Label for the color picker for the fill color',
        defaultMessage: 'Fill'
    }
});
const FillColorIndicatorComponent = props => (
    <div className={styles.inputGroup}>
        <Label text={props.intl.formatMessage(messages.fill)}>
            <BufferedInput
                type="text"
                value={props.fillColor === MIXED ? 'mixed' :
                    props.fillColor === null ? 'transparent' : props.fillColor} // @todo Don't use text
                onSubmit={props.onChangeFillColor}
            />
        </Label>
    </div>
);

FillColorIndicatorComponent.propTypes = {
    fillColor: PropTypes.string,
    intl: intlShape,
    onChangeFillColor: PropTypes.func.isRequired
};

export default injectIntl(FillColorIndicatorComponent);
