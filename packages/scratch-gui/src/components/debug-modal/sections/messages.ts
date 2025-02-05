import {defineMessages} from 'react-intl';

export const messages = defineMessages({
    readAloudTitle: {
        id: 'gui.debugModal.readAloud.title',
        defaultMessage: 'Read Aloud',
        description: 'title for the "read aloud" section'
    },
    readAloudDescription1: {
        id: 'gui.debugModal.readAloud.description1',
        defaultMessage: 'As you read your code aloud, think from the computer’s perspective.',
        description: 'description for the "read aloud" section of the debug modal'
    },
    readAloudDescription2: {
        id: 'gui.debugModal.readAloud.description2',
        defaultMessage: 'Are you including steps that aren’t there?',
        description: 'description for the "read aloud" section of the debug modal'
    },
    readAloudDescription3: {
        id: 'gui.debugModal.readAloud.description3',
        defaultMessage: 'Are your instructions clear?',
        description: 'description for the "read aloud" section of the debug modal'
    },
    readAloudDescription4: {
        id: 'gui.debugModal.readAloud.description4',
        defaultMessage:
            'If something needs to be reset each time the program has run, are those instructions included?',
        description: 'description for the "read aloud" section of the debug modal'
    },
    breakItDownTitle: {
        id: 'gui.debugModal.breakItDown.title',
        defaultMessage: 'Break It Down',
        description: 'title for the "break it down" section'
    },
    breakItDownDescription1: {
        id: 'gui.debugModal.breakItDown.description1',
        defaultMessage:
            'Separate the blocks into smaller chunks (or sequences), and click to see what each sequence does.',
        description: 'description for the "break it down" section of the debug modal'
    },
    breakItDownDescription2: {
        id: 'gui.debugModal.breakItDown.description2',
        defaultMessage:
            'Once the smaller sequences work as you expect, add them back into the main program.',
        description: 'description for the "break it down" section of the debug modal'
    },
    breakItDownDescription3: {
        id: 'gui.debugModal.breakItDown.description3',
        defaultMessage: 'The process is called decomposition.',
        description: 'description for the "break it down" section of the debug modal'
    },
    slowItDownTitle: {
        id: 'gui.debugModal.slowItDown.title',
        defaultMessage: 'Slow It Down',
        description: 'title for the "slow it down" section'
    },
    slowItDownDescription1: {
        id: 'gui.debugModal.slowItDown.description1',
        defaultMessage:
            'The computer runs your program so quickly it can be hard to follow with your eyes.',
        description: 'description for the "slow it down" section of the debug modal'
    },
    slowItDownDescription2: {
        id: 'gui.debugModal.slowItDown.description2',
        defaultMessage:
            // eslint-disable-next-line max-len
            'Add temporary “wait” or “wait until” blocks to slow down the sequence. This gives you time to process if a piece worked or not.',
        description: 'description for the "slow it down" section of the debug modal'
    },
    slowItDownDescription3: {
        id: 'gui.debugModal.slowItDown.description3',
        defaultMessage: 'Remove these wait blocks once your code works.',
        description: 'description for the "slow it down" section of the debug modal'
    },
    addSoundCheckpointsTitle: {
        id: 'gui.debugModal.addSoundCheckpoints.title',
        defaultMessage: 'Add Sound Checkpoints',
        description: 'title for the "add sound checkpoints" section'
    },
    addSoundCheckpointsDescription1: {
        id: 'gui.debugModal.addSoundCheckpoints.description1',
        defaultMessage:
            // eslint-disable-next-line max-len
            'Similar to the Slow It Down strategy, you can add different sounds with the “play until done” block at key points to test your sequence.',
        description: 'description for the "add sound checkpoints" section of the debug modal'
    },
    addSoundCheckpointsDescription2: {
        id: 'gui.debugModal.addSoundCheckpoints.description2',
        defaultMessage:
            // eslint-disable-next-line max-len
            'If a sound doesn’t play, your bug may be before this block. If the sound plays, the bug is probably after this block.',
        description: 'description for the "add sound checkpoints" section of the debug modal'
    },
    addSoundCheckpointsDescription3: {
        id: 'gui.debugModal.addSoundCheckpoints.description3',
        defaultMessage: 'Remove the sounds once your code works.',
        description: 'description for the "add sound checkpoints" section of the debug modal'
    },
    tinkerWithBlockOrderTitle: {
        id: 'gui.debugModal.tinkerWithBlockOrder.title',
        defaultMessage: 'Tinker with Block Order',
        description: 'title for the "tinker with block order" section'
    },
    tinkerWithBlockOrderDescription1: {
        id: 'gui.debugModal.tinkerWithBlockOrder.description1',
        defaultMessage: 'Try adjusting the order/sequence of the blocks.',
        description: 'description for the "tinker with block order" section of the debug modal'
    },
    tinkerWithBlockOrderDescription2: {
        id: 'gui.debugModal.tinkerWithBlockOrder.description2',
        defaultMessage: 'What needs to happen first?',
        description: 'description for the "tinker with block order" section of the debug modal'
    },
    tinkerWithBlockOrderDescription3: {
        id: 'gui.debugModal.tinkerWithBlockOrder.description3',
        defaultMessage: 'What happens second?',
        description: 'description for the "tinker with block order" section of the debug modal'
    },
    tinkerWithBlockOrderDescription4: {
        id: 'gui.debugModal.tinkerWithBlockOrder.description4',
        defaultMessage: 'Do values or sprites need to reset before the next piece of code runs?',
        description: 'description for the "tinker with block order" section of the debug modal'
    },
    tinkerWithBlockOrderDescription5: {
        id: 'gui.debugModal.tinkerWithBlockOrder.description5',
        defaultMessage:
            'Try using blocks inside a loop or conditional statement, versus outside a loop or conditional statement.',
        description: 'description for the "tinker with block order" section of the debug modal'
    },
    toLoopOrNotTitle: {
        id: 'gui.debugModal.toLoopOrNot.title',
        defaultMessage: 'To Loop or Not to Loop',
        description: 'title for the "tinker with block order" section'
    },
    toLoopOrNotDescription1: {
        id: 'gui.debugModal.toLoopOrNot.description1',
        defaultMessage:
            // eslint-disable-next-line max-len
            'If using Control blocks like "forever" and "repeat", check that all blocks inside a loop should be there, or if a block (like “wait”) is missing to reset the action or adjust the timing. Do you want your loop to run forever or for a certain number of times? Should something stop the looping?',
        description: 'description for the "to loop or not to loop" section of the debug modal'
    },
    toLoopOrNotDescription2: {
        id: 'gui.debugModal.toLoopOrNot.description2',
        defaultMessage:
            // eslint-disable-next-line max-len
            'Perhaps you aren\'t using a loop when you should be? For instance, if you are using a conditional statement block like "if then," does the program only need to check if it is true or false once? Or does it need to check continuously, in which case, you would want to place your conditional statement inside a forever loop?',
        description: 'description for the "to loop or not to loop" section of the debug modal'
    },
    timingAndParallelismTitle: {
        id: 'gui.debugModal.timingAndParallelism.title',
        defaultMessage: 'Think About Timing & Parallelism',
        description: 'title for the "think about timing and parallelism" section'
    },
    timingAndParallelismSectionTitle: {
        id: 'gui.debugModal.timingAndParallelism.sectionTitle',
        defaultMessage: 'Timing & Parallelism',
        description: 'title for the "think about timing and parallelism" sidebar section'
    },
    timingAndParallelismDescription1: {
        id: 'gui.debugModal.timingAndParallelism.description1',
        defaultMessage:
            // eslint-disable-next-line max-len
            'Do you have multiple events trying to run at the same time? If two sequences are programmed to start at the same time, you can get unpredictable behavior.',
        description: 'description for the "think about timing and parallelism" section of the debug modal'
    },
    timingAndParallelismDescription2: {
        id: 'gui.debugModal.timingAndParallelism.description2',
        defaultMessage:
            // eslint-disable-next-line max-len
            'Add small waits, broadcasts, or user interaction (like clicking or pressing a key) to see if this affects the result.',
        description: 'description for the "think about timing and parallelism" section of the debug modal'
    },
    thinkAboutBlockOptionsTitle: {
        id: 'gui.debugModal.thinkAboutBlockOptions.title',
        defaultMessage: 'Think About Block Options',
        description: 'title for the "think about block options" section'
    },
    thinkAboutBlockOptionsDescription1: {
        id: 'gui.debugModal.thinkAboutBlockOptions.description1',
        defaultMessage: 'Is there a similar but different block you can use?',
        description: 'description for the "think about block options" section of the debug modal'
    },
    thinkAboutBlockOptionsDescription2: {
        id: 'gui.debugModal.thinkAboutBlockOptions.description2',
        defaultMessage:
            // eslint-disable-next-line max-len
            'Some blocks look similar but can behave differently, such as “set” vs “change” or “play until done” vs “start.”',
        description: 'description for the "think about block options" section of the debug modal'
    },
    thinkAboutBlockOptionsDescription3: {
        id: 'gui.debugModal.thinkAboutBlockOptions.description3',
        defaultMessage: 'Try using a similar block in place of what you have, and see if this affects the result.',
        description: 'description for the "think about block options" section of the debug modal'
    },
    checkTheValuesTitle: {
        id: 'gui.debugModal.checkTheValues.title',
        defaultMessage: 'Check the Values',
        description: 'title for the "check the value" section'
    },
    checkTheValuesDescription1: {
        id: 'gui.debugModal.checkTheValues.description1',
        defaultMessage:
            'If you are using variables or reporter blocks, check the value at the moment the code sequence is run.',
        description: 'description for the "check the values" section of the debug modal'
    },
    checkTheValuesDescription2: {
        id: 'gui.debugModal.checkTheValues.description2',
        defaultMessage: 'Do/should all the sprites control a variable, or should only one sprite have control?',
        description: 'description for the "check the values" section of the debug modal'
    },
    checkTheValuesDescription3: {
        id: 'gui.debugModal.checkTheValues.description3',
        defaultMessage: 'Where is the value reset? Where is it changed?',
        description: 'description for the "check the values" section of the debug modal'
    },
    checkCodeSequenceTitle: {
        id: 'gui.debugModal.checkCodeSequence.title',
        defaultMessage: 'Check Code Sequence',
        description: 'title for the "check code sequence" section'
    },
    checkCodeSequenceDescription1: {
        id: 'gui.debugModal.checkCodeSequence.description1',
        defaultMessage:
            'Check that your code sequence is attached to the correct sprite or the backdrop, if appropriate.',
        description: 'description for the "check code sequence" section of the debug modal'
    },
    checkCodeSequenceDescription2: {
        id: 'gui.debugModal.checkCodeSequence.description2',
        defaultMessage:
            // eslint-disable-next-line max-len
            'If you need to move your code to another sprite, click and drag it until you are hovering over the correct sprite. Release it once the sprite wiggles.',
        description: 'description for the "check code sequence" section of the debug modal'
    },
    checkCodeSequenceDescription3: {
        id: 'gui.debugModal.checkCodeSequence.description3',
        defaultMessage:
            'You can also use your Backpack (bottom of screen) to store and move your code or assets.',
        description: 'description for the "check code sequence" section of the debug modal'
    },
    commentYourCodeTitle: {
        id: 'gui.debugModal.commentYourCode.title',
        defaultMessage: 'Comment Your Code',
        description: 'title for the "comment your code" section'
    },
    commentYourCodeDescription1: {
        id: 'gui.debugModal.commentYourCode.description1',
        defaultMessage:
            // eslint-disable-next-line max-len
            'Adding comments to your code can help others looking at your code to understand it. It can also help you remember how your code works when you come back to it later.',
        description: 'description for the "comment your code" section of the debug modal'
    },
    commentYourCodeDescription2: {
        id: 'gui.debugModal.commentYourCode.description2',
        defaultMessage:
            // eslint-disable-next-line max-len
            'Right click on script area to “Add Comment.” Use everyday language to explain what a block, or small sequence of blocks, does.',
        description: 'description for the "comment your code" section of the debug modal'
    },
    takeABreakTitle: {
        id: 'gui.debugModal.takeABreak.title',
        defaultMessage: 'Take a Break, Step Away',
        description: 'title for the "take a break" section'
    },
    takeABreakDescription1: {
        id: 'gui.debugModal.takeABreak.description1',
        defaultMessage:
            'Sometimes, spending too much time focused on an issue can be counterproductive and frustrating.',
        description: 'description for the "take a break, step away" section of the debug modal'
    },
    takeABreakDescription2: {
        id: 'gui.debugModal.takeABreak.description2',
        defaultMessage:
            // eslint-disable-next-line max-len
            'Take a break and step away from the screen to clear your mind. After some rest, focusing on something else, or getting some water, you can approach the problem with fresh eyes.',
        description: 'description for the "take a break, step away" section of the debug modal'
    },
    askForHelpTitle: {
        id: 'gui.debugModal.askForHelp.title',
        defaultMessage: 'Ask for Help',
        description: 'title for the "ask for help" section'
    },
    askForHelpDescription1: {
        id: 'gui.debugModal.askForHelp.description1',
        defaultMessage:
            // eslint-disable-next-line max-len
            'If you are still stuck, you can ask for help from a peer. Try finding a debugging/help studio and share your project, asking for help in a comment or the project notes.',
        description: 'description for the "ask for help" section of the debug modal'
    },
    askForHelpDescription2: {
        id: 'gui.debugModal.askForHelp.description2',
        defaultMessage:
            // eslint-disable-next-line max-len
            'Ask one to three people to try your code, as different people may have different perspectives or solutions!',
        description: 'description for the "ask for help" section of the debug modal'
    }
});
