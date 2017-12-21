import React from 'react';

import {ComingSoonTooltip} from '../coming-soon/coming-soon.jsx';
import ToolSelectComponent from '../tool-select-base/tool-select-base.jsx';

import textIcon from './text.svg';

const TextModeComponent = () => (
    <ComingSoonTooltip
        place="right"
        tooltipId="text-mode-select"
    >
        <ToolSelectComponent
            disabled
            imgDescriptor={{
                defaultMessage: 'Text',
                description: 'Label for the text tool',
                id: 'paint.textMode.text'
            }}
            imgSrc={textIcon}
            isSelected={false}
            onMouseDown={function () {}} // eslint-disable-line react/jsx-no-bind
        />
    </ComingSoonTooltip>
);

export default TextModeComponent;
