import {connect} from 'react-redux';
import {changeFillColor} from '../reducers/fill-color';
import FillColorIndicatorComponent from '../components/fill-color-indicator.jsx';

const mapStateToProps = state => ({
    fillColor: state.scratchPaint.color.fillColor
});
const mapDispatchToProps = dispatch => ({
    onChangeFillColor: fillColor => {
        dispatch(changeFillColor(fillColor));
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(FillColorIndicatorComponent);
