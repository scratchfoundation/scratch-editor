import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';

import DeleteConfirmationPromptComponent from '../components/delete-confirmation-prompt/delete-confirmation-prompt.jsx';

const DeleteConfirmationPrompt = props => (
    <DeleteConfirmationPromptComponent {...props} />
);

DeleteConfirmationPrompt.propTypes = {
    isRtl: PropTypes.bool,
    onCancel: PropTypes.func.isRequired,
    onOk: PropTypes.func.isRequired,
    modalPosition: PropTypes.string,
    entityType: PropTypes.string.isRequired,
    relativeElemRef: PropTypes.object.isRequired
};

const mapStateToProps = state => ({
    isRtl: state.locales.isRtl
});

export default connect(
    mapStateToProps
)(DeleteConfirmationPrompt);
