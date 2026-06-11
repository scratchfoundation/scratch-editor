import {PropTypes} from 'prop-types';

import GradientTypes from './gradient-types';

export default PropTypes.shape({
    primary: PropTypes.string,
    secondary: PropTypes.string,
    gradientType: PropTypes.oneOf(Object.keys(GradientTypes)).isRequired
});
