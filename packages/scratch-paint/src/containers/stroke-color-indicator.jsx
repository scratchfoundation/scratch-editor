import {connect} from 'react-redux';
import {changeStrokeColor} from '../reducers/stroke-color';
import StrokeColorIndicatorComponent from '../components/stroke-color-indicator.jsx';

const mapStateToProps = state => ({
    strokeColor: state.scratchPaint.color.strokeColor
});
const mapDispatchToProps = dispatch => ({
    onChangeStrokeColor: strokeColor => {
        dispatch(changeStrokeColor(strokeColor));
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(StrokeColorIndicatorComponent);
