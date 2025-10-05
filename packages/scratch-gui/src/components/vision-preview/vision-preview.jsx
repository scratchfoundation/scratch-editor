import React from 'react';
import PropTypes from 'prop-types';

class VisionPreview extends React.Component{
    constructor (props) {
        super(props);
        this.state = {dataURL: null};
    }
    componentDidMount (){
        const {vm} = this.props;
        this._handler = dataURL => this.setState({dataURL});
        vm.on('VISION_IMAGE', this._handler);
    }
    componentWillUnmount (){
        const {vm} = this.props;
        if (this._handler) vm.off('VISION_IMAGE', this._handler);
    }
    render (){
        return (
            <div style={{border: '1px solid #e5e7eb', borderRadius: 12, padding: 8, marginTop: 8}}>
                <div style={{fontSize: 14, fontWeight: 600, marginBottom: 6}}>{'Vista previa (Vision Kit)'}</div>
                {this.state.dataURL ? (
                    <img
                        src={this.state.dataURL}
                        alt="preview"
                        style={{maxWidth: '100%'}}
                    />
                ) : (
                    <div style={{fontSize: 12, color: '#6b7280'}}>
                        {'Aún no hay imagen procesada…'}
                    </div>
                )}
            </div>
        );
    }
}
VisionPreview.propTypes = {vm: PropTypes.object.isRequired};
export default VisionPreview;
