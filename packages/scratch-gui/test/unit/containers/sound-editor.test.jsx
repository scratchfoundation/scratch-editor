import React, {act} from 'react';
import {renderWithIntl} from '../../helpers/intl-helpers.jsx';
import configureStore from 'redux-mock-store';
import mockAudioBufferPlayer from '../../__mocks__/audio-buffer-player.js';
import mockAudioEffects from '../../__mocks__/audio-effects.js';

import SoundEditor from '../../../src/containers/sound-editor';
import {screen, fireEvent, waitFor} from '@testing-library/react';
import '@testing-library/jest-dom';


global.MutationObserver = class {
    disconnect () { }
    observe () { }
};

jest.mock('react-ga');
jest.mock('../../../src/lib/audio/audio-buffer-player', () => mockAudioBufferPlayer);
jest.mock('../../../src/lib/audio/audio-effects', () => mockAudioEffects);

describe('Sound Editor Container', () => {
    const mockStore = configureStore();
    let store;
    let soundIndex;
    let soundBuffer;
    const samples = new Float32Array([0, 0, 0]);
    let vm;

    beforeEach(() => {
        soundIndex = 0;
        soundBuffer = {
            sampleRate: 0,
            getChannelData: jest.fn(() => samples)
        };
        vm = {
            getSoundBuffer: jest.fn(() => soundBuffer),
            renameSound: jest.fn(),
            updateSoundBuffer: jest.fn(),
            editingTarget: {
                sprite: {
                    sounds: [{name: 'first name', id: 'first id'}]
                }
            }
        };
        store = mockStore({scratchGui: {vm: vm, mode: {isFullScreen: false}}});
    });

    test('should pass the correct data to the component from the store', () => {
        const {container} = renderWithIntl(
            <SoundEditor
                soundIndex={soundIndex}
                store={store}
            />
        );

        expect(container.firstChild).toMatchSnapshot();
    });


    test('it plays when clicked and stops when clicked again', async () => {
        renderWithIntl(
            <SoundEditor
                soundIndex={soundIndex}
                store={store}
            />
        );

        expect(mockAudioBufferPlayer.instance.play).not.toHaveBeenCalled();
        expect(mockAudioBufferPlayer.instance.stop).not.toHaveBeenCalled();

        const playButton = screen.getByTitle('Play');
        fireEvent.click(playButton);
        expect(mockAudioBufferPlayer.instance.play).toHaveBeenCalled();

        // Mock the audio buffer player calling onUpdate
        await act(() => {
            mockAudioBufferPlayer.instance.onUpdate(0.5);
        });

        const stopButton = await waitFor(() => screen.getByTitle('Stop'));
        fireEvent.click(stopButton);
        expect(mockAudioBufferPlayer.instance.stop).toHaveBeenCalled();
    });

    test('it submits name changes to the vm', () => {
        renderWithIntl(
            <SoundEditor
                soundIndex={soundIndex}
                store={store}
            />
        );

        const nameInput = screen.getByRole('textbox');
        fireEvent.change(nameInput, {target: {value: 'hello'}});
        fireEvent.keyPress(nameInput, {key: 'Enter', code: 'Enter', charCode: 13});
        expect(vm.renameSound).toHaveBeenCalledWith(soundIndex, 'hello');
    });

    test('it handles an effect by submitting the result and playing', async () => {
        renderWithIntl(
            <SoundEditor
                soundIndex={soundIndex}
                store={store}
            />
        );
        const reverseButton = screen.getByRole('button', {name: 'Reverse'});
        await act(async () => {
            fireEvent.click(reverseButton);
            await mockAudioEffects.instance._finishProcessing(soundBuffer);
        });
        expect(mockAudioBufferPlayer.instance.play).toHaveBeenCalled();
        expect(vm.updateSoundBuffer).toHaveBeenCalled();
    });

    test('it handles reverse effect correctly', () => {
        renderWithIntl(
            <SoundEditor
                soundIndex={soundIndex}
                store={store}
            />
        );
        const reverseButton = screen.getByRole('button', {name: 'Reverse'});
        fireEvent.click(reverseButton);
        expect(mockAudioEffects.instance.name).toEqual(mockAudioEffects.effectTypes.REVERSE);
        expect(mockAudioEffects.instance.process).toHaveBeenCalled();
    });

    test('it handles louder effect correctly', () => {
        renderWithIntl(
            <SoundEditor
                soundIndex={soundIndex}
                store={store}
            />
        );
        const louderButton = screen.getByRole('button', {name: 'Louder'});
        fireEvent.click(louderButton);
        expect(mockAudioEffects.instance.name).toEqual(mockAudioEffects.effectTypes.LOUDER);
        expect(mockAudioEffects.instance.process).toHaveBeenCalled();
    });

    test('it handles softer effect correctly', () => {
        renderWithIntl(
            <SoundEditor
                soundIndex={soundIndex}
                store={store}
            />
        );
        const softerButton = screen.getByRole('button', {name: 'Softer'});
        fireEvent.click(softerButton);
        expect(mockAudioEffects.instance.name).toEqual(mockAudioEffects.effectTypes.SOFTER);
        expect(mockAudioEffects.instance.process).toHaveBeenCalled();
    });

    test('it handles faster effect correctly', () => {
        renderWithIntl(
            <SoundEditor
                soundIndex={soundIndex}
                store={store}
            />
        );
        const fasterButton = screen.getByRole('button', {name: 'Faster'});
        fireEvent.click(fasterButton);
        expect(mockAudioEffects.instance.name).toEqual(mockAudioEffects.effectTypes.FASTER);
        expect(mockAudioEffects.instance.process).toHaveBeenCalled();
    });

    test('it handles slower effect correctly', () => {
        renderWithIntl(
            <SoundEditor
                soundIndex={soundIndex}
                store={store}
            />
        );
        const slowerButton = screen.getByRole('button', {name: 'Slower'});
        fireEvent.click(slowerButton);
        expect(mockAudioEffects.instance.name).toEqual(mockAudioEffects.effectTypes.SLOWER);
        expect(mockAudioEffects.instance.process).toHaveBeenCalled();
    });

    test('it handles robot effect correctly', () => {
        renderWithIntl(
            <SoundEditor
                soundIndex={soundIndex}
                store={store}
            />
        );
        const softerButton = screen.getByRole('button', {name: 'Robot'});
        fireEvent.click(softerButton);
        expect(mockAudioEffects.instance.name).toEqual(mockAudioEffects.effectTypes.ROBOT);
        expect(mockAudioEffects.instance.process).toHaveBeenCalled();
    });

    test('undo/redo stack state', async () => {
        renderWithIntl(
            <SoundEditor
                soundIndex={soundIndex}
                store={store}
            />
        );

        const undoButton = screen.getByRole('button', {name: 'Undo'});
        const redoButton = screen.getByRole('button', {name: 'Redo'});

        // Undo and redo should be disabled initially
        expect(undoButton).toBeDisabled();
        expect(redoButton).toBeDisabled();

        // Submitting new samples should make it possible to undo
        const fasterButton = screen.getByRole('button', {name: 'Faster'});
        await act(async () => {
            fireEvent.click(fasterButton);
            await mockAudioEffects.instance._finishProcessing(soundBuffer);
        });
        expect(undoButton).toBeEnabled();
        expect(redoButton).toBeDisabled();

        // Undoing should make it possible to redo and not possible to undo again
        await act(() => {
            fireEvent.click(undoButton);
        });
        expect(undoButton).toBeDisabled();
        expect(redoButton).toBeEnabled();

        // Redoing should make it possible to undo and not possible to redo again
        await act(() => {
            fireEvent.click(redoButton);
        });
        expect(undoButton).toBeEnabled();
        expect(redoButton).toBeDisabled();

        // New submission should clear the redo stack
        await act(() => {
            fireEvent.click(undoButton);
        });
        expect(redoButton).toBeEnabled();
        await act(async () => {
            fireEvent.click(fasterButton);
            await mockAudioEffects.instance._finishProcessing(soundBuffer);
        });

        expect(redoButton).toBeDisabled();
    });

    test('undo and redo submit new samples and play the sound', async () => {
        renderWithIntl(
            <SoundEditor
                soundIndex={soundIndex}
                store={store}
            />
        );

        // Set up an undoable state
        const fasterButton = screen.getByRole('button', {name: 'Faster'});
        const undoButton = screen.getByRole('button', {name: 'Undo'});
        const redoButton = screen.getByRole('button', {name: 'Redo'});

        await act(async () => {
            fireEvent.click(fasterButton);
            await mockAudioEffects.instance._finishProcessing(soundBuffer);
        });

        // Undo should update the sound buffer and play the new samples
        await act(() => {
            fireEvent.click(undoButton);
        });

        expect(mockAudioBufferPlayer.instance.play).toHaveBeenCalled();
        expect(vm.updateSoundBuffer).toHaveBeenCalled();

        await act(() => {
            // Clear the mocks call history to assert again for redo.
            vm.updateSoundBuffer.mockClear();
            mockAudioBufferPlayer.instance.play.mockClear();

            // Undo should update the sound buffer and play the new samples
            fireEvent.click(redoButton);
        });
        expect(mockAudioBufferPlayer.instance.play).toHaveBeenCalled();
        expect(vm.updateSoundBuffer).toHaveBeenCalled();
    });
});
