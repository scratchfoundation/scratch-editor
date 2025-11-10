import React from 'react';
import {renderWithIntl} from '../../helpers/intl-helpers.jsx';
import SoundEditor from '../../../src/components/sound-editor/sound-editor';
import {fireEvent, waitFor} from '@testing-library/react';

describe('Sound Editor Component', () => {
    let props;
    beforeEach(() => {
        props = {
            canUndo: true,
            canRedo: true,
            chunkLevels: [1, 2, 3],
            name: 'sound name',
            playhead: 0.5,
            trimStart: 0.2,
            trimEnd: 0.8,
            onChangeName: jest.fn(),
            onDelete: jest.fn(),
            onPlay: jest.fn(),
            onRedo: jest.fn(),
            onReverse: jest.fn(),
            onSofter: jest.fn(),
            onLouder: jest.fn(),
            onRobot: jest.fn(),
            onEcho: jest.fn(),
            onFaster: jest.fn(),
            onSlower: jest.fn(),
            onSetTrimEnd: jest.fn(),
            onSetTrimStart: jest.fn(),
            onStop: jest.fn(),
            onUndo: jest.fn()
        };
    });

    test('matches snapshot', () => {
        const {container} = renderWithIntl(<SoundEditor {...props} />);

        expect(container.firstChild).toMatchSnapshot();
    });

    test('delete button appears when selection is not null', () => {
        const {container} = renderWithIntl(
            <SoundEditor
                {...props}
                trimEnd={0.75}
                trimStart={0.25}
            />
        );
        const deleteButton = [...container.querySelectorAll('div[role="button"]')]
            .find(el => el.textContent.trim() === 'Delete');

        fireEvent.click(deleteButton);
        expect(props.onDelete).toHaveBeenCalled();
    });

    test('play button appears when playhead is null', () => {
        const {container} = renderWithIntl(
            <SoundEditor
                {...props}
                playhead={null}
            />
        );
        const playButton = container.querySelector('button[title="Play"]');
        fireEvent.click(playButton);
        expect(props.onPlay).toHaveBeenCalled();
    });

    test('stop button appears when playhead is not null', () => {
        const {container} = renderWithIntl(
            <SoundEditor
                {...props}
                playhead={0.5}
            />
        );
        const stopButton = container.querySelector('button[title="Stop"]');
        fireEvent.click(stopButton);
        expect(props.onStop).toHaveBeenCalled();
    });

    test('submitting name calls the callback', async () => {
        if (typeof MutationObserver === 'undefined') {
            global.MutationObserver = class {
                observe () { }
                disconnect () { }
            };
        }
        const onChangeName = jest.fn();
        const {container} = renderWithIntl(<SoundEditor
            {...props}
            onChangeName={onChangeName}
        />);

        const input = container.querySelector('input');

        fireEvent.change(input, {target: {value: 'hello'}});
        fireEvent.keyPress(input, {key: 'Enter', code: 'Enter', charCode: 13});
        await waitFor(() => expect(onChangeName).toHaveBeenCalled());
    });

    describe('effect buttons call the correct callbacks', () => {
        let getButtonByText;

        beforeEach(() => {
            const {container} = renderWithIntl(
                <SoundEditor {...props} />
            );

            const buttons = [...container.querySelectorAll('div[role="button"]')];
            getButtonByText = text => buttons.find(div => div.textContent.trim() === text);
        });

        test('clicking reverse button calls correct callback', () => {
            const reverseButton = getButtonByText('Reverse');
            fireEvent.click(reverseButton);
            expect(props.onReverse).toHaveBeenCalled();
        });

        test('clicking robot button calls correct callback', () => {
            const robotButton = getButtonByText('Robot');
            fireEvent.click(robotButton);
            expect(props.onRobot).toHaveBeenCalled();
        });

        test('clicking faster button calls correct callback', () => {
            const fasterButton = getButtonByText('Faster');
            fireEvent.click(fasterButton);
            expect(props.onFaster).toHaveBeenCalled();
        });

        test('clicking slower button calls correct callback', () => {
            const slowerButton = getButtonByText('Slower');
            fireEvent.click(slowerButton);
            expect(props.onSlower).toHaveBeenCalled();
        });

        test('clicking louder button calls correct callback', () => {
            const louderButton = getButtonByText('Louder');
            fireEvent.click(louderButton);
            expect(props.onLouder).toHaveBeenCalled();
        });

        test('clicking softer button calls correct callback', () => {
            const softerButton = getButtonByText('Softer');
            fireEvent.click(softerButton);
            expect(props.onSofter).toHaveBeenCalled();
        });
    });

    describe('disbaling undo/redo button', () => {
        test('undo button can be disabled when canUndo equals false', () => {
            const {container} = renderWithIntl(
                <SoundEditor
                    {...props}
                    canUndo={false}
                />
            );

            const undoButtonEnabled = container.querySelector('button[title="Undo"]');
            expect(undoButtonEnabled.disabled).toBe(true);
        });

        test('redo button can be disabled when canRedo equals false', () => {
            const {container} = renderWithIntl(
                <SoundEditor
                    {...props}
                    canRedo={false}
                />
            );

            const redoButtonEnabled = container.querySelector('button[title="Redo"]');
            expect(redoButtonEnabled.disabled).toBe(true);
        });
    });

    describe('undo/redo buttons call the correct callbacks', () => {
        test('when undo button is clicked it calls the correct callback', () => {
            const {container} = renderWithIntl(
                <SoundEditor {...props} />
            );

            const undoButton = container.querySelector('button[title="Undo"]');
            fireEvent.click(undoButton);
            expect(props.onUndo).toHaveBeenCalled();
        });

        test('when redo button is clicked it calls the correct callback', () => {
            const {container} = renderWithIntl(
                <SoundEditor {...props} />
            );

            const redoButton = container.querySelector('button[title="Redo"]');
            fireEvent.click(redoButton);
            expect(props.onRedo).toHaveBeenCalled();
        });
    });
});
