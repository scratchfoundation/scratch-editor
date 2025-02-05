import React from 'react';
import {FormattedMessage} from 'react-intl';
import {messages} from './messages.ts';

import addSoundCheckpoints from '../icons/icon--add-sound-checkpoints.svg';
import askForHelp from '../icons/icon--ask-for-help.svg';
import breakItDown from '../icons/icon--break-it-down.svg';
import checkCodeSequence from '../icons/icon--check-code-sequence.svg';
import checkTheValues from '../icons/icon--check-the-values.svg';
import commentYourCode from '../icons/icon--comment-your-code.svg';
import readAloud from '../icons/icon--read-aloud.svg';
import slowItDown from '../icons/icon--slow-it-down.svg';
import takeABreak from '../icons/icon--take-a-break.svg';
import thinkAboutBlockOptions from '../icons/icon--think-about-block-options.svg';
import timingAndParallelism from '../icons/icon--timing-and-parallelism.svg';
import tinkerWithBlockOrder from '../icons/icon--tinker-with-block-order.svg';
import toLoopOrNotToLoop from '../icons/icon--to-loop-or-not.svg';


export const sections = [
    {
        id: 'readAloud',
        title: messages.readAloudTitle,
        description: <div>
            <p><FormattedMessage {...messages.readAloudDescription1} /></p>
            <ul>
                <li><FormattedMessage {...messages.readAloudDescription2} /></li>
                <li><FormattedMessage {...messages.readAloudDescription3} /></li>
                <li><FormattedMessage {...messages.readAloudDescription4} /></li>
            </ul>
        </div>,
        image: readAloud
    }, {
        id: 'breakItDown',
        title: messages.breakItDownTitle,
        description: (<div>
            <p><FormattedMessage {...messages.breakItDownDescription1} /></p>
            <p><FormattedMessage {...messages.breakItDownDescription2} /></p>
            <p><FormattedMessage {...messages.breakItDownDescription3} /></p>
        </div>),
        image: breakItDown
    }, {
        id: 'slowItDown',
        title: messages.slowItDownTitle,
        description: (<div>
            <p><FormattedMessage {...messages.slowItDownDescription1} /></p>
            <p><FormattedMessage {...messages.slowItDownDescription2} /></p>
            <p><FormattedMessage {...messages.slowItDownDescription3} /></p>
        </div>),
        image: slowItDown
    }, {
        id: 'addSoundCheckpoints',
        title: messages.addSoundCheckpointsTitle,
        description: (<div>
            <p><FormattedMessage {...messages.addSoundCheckpointsDescription1} /></p>
            <p><FormattedMessage {...messages.addSoundCheckpointsDescription2} /></p>
            <p><FormattedMessage {...messages.addSoundCheckpointsDescription3} /></p>
        </div>),
        image: addSoundCheckpoints
    }, {
        id: 'tinkerWithBlockOrder',
        title: messages.tinkerWithBlockOrderTitle,
        description: <div>
            <p><FormattedMessage {...messages.tinkerWithBlockOrderDescription1} /></p>
            <ul>
                <li><FormattedMessage {...messages.tinkerWithBlockOrderDescription2} /></li>
                <li><FormattedMessage {...messages.tinkerWithBlockOrderDescription3} /></li>
                <li><FormattedMessage {...messages.tinkerWithBlockOrderDescription4} /></li>
            </ul>
            <p><FormattedMessage {...messages.tinkerWithBlockOrderDescription5} /></p>
        </div>,
        image: tinkerWithBlockOrder
    }, {
        id: 'toLoopOrNotToLoop',
        title: messages.toLoopOrNotTitle,
        description: (<div>
            <p><FormattedMessage {...messages.toLoopOrNotDescription1} /></p>
            <p><FormattedMessage {...messages.toLoopOrNotDescription2} /></p>
        </div>),
        image: toLoopOrNotToLoop
    }, {
        id: 'timingAndParallelism',
        title: messages.timingAndParallelismTitle,
        sectionTitle: messages.timingAndParallelismSectionTitle,
        description: (<div>
            <p><FormattedMessage {...messages.timingAndParallelismDescription1} /></p>
            <p><FormattedMessage {...messages.timingAndParallelismDescription2} /></p>
        </div>),
        image: timingAndParallelism
    }, {
        id: 'thinkAboutBlockOptions',
        title: messages.thinkAboutBlockOptionsTitle,
        description: (<div>
            <p><FormattedMessage {...messages.thinkAboutBlockOptionsDescription1} /></p>
            <p><FormattedMessage {...messages.thinkAboutBlockOptionsDescription2} /></p>
            <p><FormattedMessage {...messages.thinkAboutBlockOptionsDescription3} /></p>
        </div>),
        image: thinkAboutBlockOptions
    }, {
        id: 'checkTheValues',
        title: messages.checkTheValuesTitle,
        description: <div>
            <p><FormattedMessage {...messages.checkTheValuesDescription1} /></p>
            <ul>
                <li><FormattedMessage {...messages.checkTheValuesDescription2} /></li>
                <li><FormattedMessage {...messages.checkTheValuesDescription3} /></li>
            </ul>
        </div>,
        image: checkTheValues
    }, {
        id: 'checkCodeSequence',
        title: messages.checkCodeSequenceTitle,
        description: <div>
            <p><FormattedMessage {...messages.checkCodeSequenceDescription1} /></p>
            <p><FormattedMessage {...messages.checkCodeSequenceDescription2} /></p>
            <p><FormattedMessage {...messages.checkCodeSequenceDescription3} /></p>
        </div>,
        image: checkCodeSequence
    }, {
        id: 'commentYourCode',
        title: messages.commentYourCodeTitle,
        description: <div>
            <p><FormattedMessage {...messages.commentYourCodeDescription1} /></p>
            <p><FormattedMessage {...messages.commentYourCodeDescription2} /></p>
        </div>,
        image: commentYourCode
    }, {
        id: 'takeABreak',
        title: messages.takeABreakTitle,
        description: <div>
            <p><FormattedMessage {...messages.takeABreakDescription1} /></p>
            <p><FormattedMessage {...messages.takeABreakDescription2} /></p>
        </div>,
        image: takeABreak
    }, {
        id: 'askForHelp',
        title: messages.askForHelpTitle,
        description: <div>
            <p><FormattedMessage {...messages.askForHelpDescription1} /></p>
            <p><FormattedMessage {...messages.askForHelpDescription2} /></p>
        </div>,
        image: askForHelp
    }
];
