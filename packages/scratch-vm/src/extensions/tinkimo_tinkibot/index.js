const formatMessage = require('format-message');
const languageNames = require('scratch-translate-extension-languages');
const uuid = require('uuid');

const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');

const categoryStyles = require('./common');

const BLOCKS_UUID_STORAGE_KEY = 'tinkiblocks.blocksUuid';
const CLAIMED_BY_OTHER_USER = 'another-user';

// has an websocket message already been received
let alerted = false;
let the_locale = null;

//-----------------------------------
//  TINKIMO RESPONSES
//-----------------------------------

/**
 * Class for the text2speech blocks.
 * @class
 */
class TinkibotBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;
        this._connected = false;
        this._connectionPromise = null;
        this._commandQueue = Promise.resolve();
        this._pendingResponse = null;
        this._buttonEvent = null;
        this._connectedRobots = [];
        this._pendingClaims = new Set();
        this._blocksUuid = this._getBlocksUuid();
        this.runtime.claimTinkibotRobot = this.claimRobot.bind(this);
        this.runtime.releaseTinkibotRobot = this.releaseRobot.bind(this);
        if (typeof WebSocket !== 'undefined') this.connect();
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo () {
        return this.getInfos()[0];
    }

    getInfos () {
        const info = this._getCombinedInfo();
        return [
            this._categoryInfo(info, 'tinkibotMovement', formatMessage({
                id: 'tinkibot.category.movement',
                default: 'Movement',
                description: 'Name of the Tinkibot Movement category.'
            }), [
                'measure_left_encoder_count', 'measure_right_encoder_count', 'drive', 'stop', 'brake',
                'move', 'rotate', 'arc', 'wiggle', 'moonwalk'
            ]),
            this._categoryInfo(info, 'tinkibotInteraction', formatMessage({
                id: 'tinkibot.category.interaction',
                default: 'Interaction',
                description: 'Name of the Tinkibot Interaction category.'
            }), [
                'read_button', 'when_button_event', 'button_led'
            ]),
            this._categoryInfo(info, 'tinkibotSensors', formatMessage({
                id: 'tinkibot.category.sensors',
                default: 'Sensors',
                description: 'Name of the Tinkibot Sensors category.'
            }), [
                'measure_line_sensor', 'measure_distance', 'measure_voltage'
            ]),
            this._categoryInfo(info, 'tinkibotSounds', formatMessage({
                id: 'tinkibot.category.sounds',
                default: 'Sounds',
                description: 'Name of the Tinkibot Sounds category.'
            }), ['volume', 'play_sound']),
            this._categoryInfo(info, 'tinkibotDisplay', formatMessage({
                id: 'tinkibot.category.display',
                default: 'Display',
                description: 'Name of the Tinkibot Display category.'
            }), [
                'display_image', 'display_letter', 'display_number', 'mosaic', 'write_text', 'text_colour',
                'background_colour', 'backlight', 'clear'
            ])
        ];
    }

    _categoryInfo (info, id, name, opcodes) {
        return Object.assign({}, info, {
            id,
            name,
            ...categoryStyles[id],
            blocks: info.blocks.filter(block => block !== '---' && opcodes.includes(block.opcode))
        });
    }

    _getCombinedInfo () {
        the_locale = this._setLocale();        

        return {
            id: 'tinkibot',
            name: formatMessage({
                id: 'tinkibot.categoryName',
                default: 'Tinkibots',
                description: 'Name of the Tinkibot extension.'
            }),
            blocks: [
                {
                    opcode: 'volume',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'tinkibot.volume',
                        default: 'set volume [VALUE]',
                        description: 'set the speaker volume'
                    }),
                    arguments: {
                        VALUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 5
                        }                        
                    }
                },                 
                {
                    opcode: 'play_sound',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'tinkibot.playSound',
                        default: 'play sound [SOUND]',
                        description: 'Play a sound from the MP3 library'
                    }),
                    arguments: {
                        SOUND: {
                            type: ArgumentType.STRING,
                            defaultValue: 'startup',
                            menu: "sound_options"
                        },
                    }
                },
                '---',                          
                {
                    opcode: 'measure_line_sensor',
                    blockType: BlockType.REPORTER,
                   text: formatMessage({
                        id: 'tinkibot.measureLineSensor',
                        default: 'measure line sensor [SENSOR]',
                        description: 'Measure the line sensor value'
                    }),
                    arguments: {
                        SENSOR: {
                            type: ArgumentType.STRING,
                            defaultValue: '4',
                            menu: "line_sensors_options"
                        },                   
                    }
                    
                }, 
                '---',                          
                {
                    opcode: 'read_button',
                    blockType: BlockType.REPORTER,
                   text: formatMessage({
                        id: 'tinkibot.readButton',
                        default: 'was [BUTTON] pressed?',
                        description: 'Was button pressed?'
                    }),
                    arguments: {
                        BUTTON: {
                            type: ArgumentType.STRING,
                            defaultValue: 'top-left',
                            menu: 'button_options'
                        },                   
                    }
                    
                },  
                {
                    opcode: 'when_button_event',
                    blockType: BlockType.HAT,
                    isEdgeActivated: false,
                    text: formatMessage({
                        id: 'tinkibot.whenButtonEvent',
                        default: 'Listen for button [BUTTON] being [STATE]',
                        description: 'Run when a button changes to the selected state'
                    }),
                    arguments: {
                        BUTTON: {
                            type: ArgumentType.STRING,
                            defaultValue: 'top-left',
                            menu: "button_options"
                        },
                        STATE: {
                            type: ArgumentType.STRING,
                            defaultValue: 'pressed',
                            menu: 'button_state_options'
                        }
                    }
                },
                {
                    opcode: 'button_led',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'tinkibot.buttonLed',
                        default: 'set [BUTTON] to [STATE]',
                        description: 'turn on or off an LED button'
                    }),
                    arguments: {
                        BUTTON: {
                            type: ArgumentType.STRING,
                            defaultValue: 'top-left',
                            menu: "button_options"
                        },
                        STATE: {
                            type: ArgumentType.STRING,
                            defaultValue: 'on',
                            menu: "state_options"
                        }                                                                            
                    }
                },                 

                '---',                          
                {
                    opcode: 'measure_distance',
                    blockType: BlockType.REPORTER,
                   text: formatMessage({
                        id: 'tinkibot.measureDistance',
                        default: 'measure distance',
                        description: 'Measure the distance in centimeters'
                    }),
                    arguments: {
                    }
                },
                {
                    opcode: 'measure_voltage',
                    blockType: BlockType.REPORTER,
                   text: formatMessage({
                        id: 'tinkibot.measureVoltage',
                        default: 'measure battery voltage',
                        description: 'Measure the internale battery voltage.'
                    }),
                    arguments: {
                    }
                },  
                '---',                          
                {
                    opcode: 'display_image',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'tinkibot.displayImage',
                        default: 'display image [IMAGE]',
                        description: 'show an image from the library'
                    }),
                    arguments: {
                        IMAGE: {
                            type: ArgumentType.STRING,
                            defaultValue: 'logo',
                            menu: "image_options"
                        },
                    }
                },
                {
                    opcode: 'display_letter',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'tinkibot.displayLetter',
                        default: 'display letter [IMAGE]',
                        description: 'show a single letter on the screen'
                    }),
                    arguments: {
                        IMAGE: {
                            type: ArgumentType.STRING,
                            defaultValue: 'A',
                            menu: "letter_options"
                        },
                    }
                },                  
                {
                    opcode: 'display_number',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'tinkibot.displayNumber',
                        default: 'display number [IMAGE]',
                        description: 'show a single number on the screen'
                    }),
                    arguments: {
                        IMAGE: {
                            type: ArgumentType.STRING,
                            defaultValue: '0',
                            menu: "number_options"
                        },
                    }
                },  
                {                
                    opcode: 'mosaic',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'tinkibot.mosaic',
                        default: 'create mosaic of [IMAGE]',
                        description: 'show an image from the library'
                    }),
                    arguments: {
                        IMAGE: {
                            type: ArgumentType.STRING,
                            defaultValue: 'logo',
                            menu: "mosaic_options"
                        },
                    }
                }, 
                {
                    opcode: 'write_text',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'tinkibot.writeText',
                        default: 'write text [MESSAGE] at [X],[Y]',
                        description: 'write some text to the screen'
                    }),
                    arguments: {
                        MESSAGE: {
                            type: ArgumentType.STRING,
                            defaultValue: "Tinkibots Rule!"
                        },
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 3
                        },
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 70
                        }                                                                            
                    }
                },                 
                {
                    opcode: 'text_colour',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'tinkibot.textColour',
                        default: 'change the text colour to [COLOUR]',
                        description: 'change the text colour'
                    }),
                    arguments: {
                        COLOUR: {
                            type: ArgumentType.STRING,
                            defaultValue: 'black',
                            menu: "colour_options"
                        },                                                                           
                    }
                },                 
                {
                    opcode: 'background_colour',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'tinkibot.backgroundColour',
                        default: 'change the background colour to [COLOUR]',
                        description: 'change the background colour'
                    }),
                    arguments: {
                        COLOUR: {
                            type: ArgumentType.STRING,
                            defaultValue: 'cyan',
                            menu: "colour_options"
                        },                                                                           
                    }
                }, 
                {
                    opcode: 'backlight',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'tinkibot.backlight',
                        default: 'Set backlight to [INTENSITY]',
                        description: 'Set the display backlight intensity from 0 to 100'
                    }),
                    arguments: {
                        INTENSITY: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 80
                        }
                    }
                },
                {
                    opcode: 'clear',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'tinkibot.clear',
                        default: 'clear the screen',
                        description: 'clear the screen'
                    }),
                    arguments: {                                                                        
                    }
                },                                 
                '---',                          
                {
                    opcode: 'measure_left_encoder_count',
                    blockType: BlockType.REPORTER,
                   text: formatMessage({
                        id: 'tinkibot.measureLeftEncoderCount',
                        default: 'measure left encoder count',
                        description: 'Measure the left encoder count.'
                    }),
                    arguments: {
                    }
                }, 
                {
                    opcode: 'measure_right_encoder_count',
                    blockType: BlockType.REPORTER,
                   text: formatMessage({
                        id: 'tinkibot.measureRightEncoderCount',
                        default: 'measure right encoder count',
                        description: 'Measure the right encoder count.'
                    }),
                    arguments: {
                    }
                },                                               
                {
                    opcode: 'drive',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'tinkibot.drive',
                        default: 'drive [MOTOR] motor(s) at speed [SPEED]',
                        description: 'start the motors running at a particular speed'
                    }),
                    arguments: {
                        MOTOR: {
                            type: ArgumentType.STRING,
                            defaultValue: 'both',
                            menu: "motor_options"
                        },
                        SPEED: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        }                        
                    }
                },                                 
                {
                    opcode: 'stop',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'tinkibot.stop',
                        default: 'stop [MOTOR] motor(s)',
                        description: 'stop the motors'
                    }),
                    arguments: {
                        MOTOR: {
                            type: ArgumentType.STRING,
                            defaultValue: 'both',
                            menu: "motor_options"
                        },                      
                    }
                },                                 
                {
                    opcode: 'brake',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'tinkibot.brake',
                        default: 'brake [MOTOR] motor(s)',
                        description: 'apply brake to motors'
                    }),
                    arguments: {
                        MOTOR: {
                            type: ArgumentType.STRING,
                            defaultValue: 'both',
                            menu: "motor_options"
                        },                      
                    }
                },                                 
                '---',                          
                {
                    opcode: 'move',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'tinkibot.move',
                        default: 'move [DIRECTION] [DISTANCE] mm',
                        description: 'move the tinkibot'
                    }),
                    arguments: {
                        DIRECTION: {
                            type: ArgumentType.STRING,
                            defaultValue: 'forward',
                            menu: "direction_options"
                        },
                        DISTANCE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 10
                        }                        
                    }
                },                                                   
                {
                    opcode: 'rotate',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'tinkibot.rotate',
                        default: 'rotate [ROTATION] [DEGREES] degrees',
                        description: 'rotate the tinkibot'
                    }),
                    arguments: {
                        ROTATION: {
                            type: ArgumentType.STRING,
                            defaultValue: 'clockwise',
                            menu: "rotation_options"
                        },
                        DEGREES: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 90
                        }                        
                    }
                },    
                {
                    opcode: 'arc',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'tinkibot.arc',
                        default: 'arc [DIRECTION] [DEGREES] degrees, radius [RADIUS]',
                        description: 'create an arc with the tinkibot'
                    }),
                    arguments: {
                        DIRECTION: {
                            type: ArgumentType.STRING,
                            defaultValue: 'left',
                            menu: "direction_options"
                        },
                        DEGREES: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 45
                        },
                        RADIUS: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 30
                        }                                                     
                    }
                },                                                                
                {
                    opcode: 'wiggle',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'tinkibot.wiggle',
                        default: 'wiggle [TIMES] times',
                        description: 'wiggle the tinkibot'
                    }),
                    arguments: {
                        TIMES: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 5
                        }                        
                    }
                }, 
                {
                    opcode: 'moonwalk',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'tinkibot.monwalk',
                        default: 'moonwalk [STEPS] steps',
                        description: 'make tinkibot moonwalk'
                    }),
                    arguments: {
                        STEPS: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 5
                        }                        
                    }
                },                                                                   
            ],
            menus: {
                sound_options: {
                    acceptReporters: true,
                    items: ['startup', 'shutdown',"ugggh","growl","haha","sad",'charger','chicken',
                        'dog-barking','faart','spell','strum']
                },
                image_options: {
                    acceptReporters: true,
                    items: ['annoyed','biker','builder','embarassed',
                        'feeling-ill','indian','love','sad',
                        'logo', 'confused','happy','worried','game-over','scared']
                }, 
                letter_options: {
                    acceptReporters: true,
                    items: ['A', 'B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z']
                },                 
                number_options: {
                    acceptReporters: true,
                    items: ['0','1','2','3','4','5','6','7','8','9']
                },                 
                mosaic_options: {
                    acceptReporters: true,
                    items: ['logo', 'cowboy','indian','biker','buider']
                },  
                button_options: {
                    acceptReporters: true,
                    items: ['top-left', 'top-right','bottom-left','bottom-right']
                },                                 
                direction_options: {
                    acceptReporters: true,
                    items: ['forward', 'reverse']
                },    
                rotation_options: {
                    acceptReporters: true,
                    items: ['clockwise', 'anticlockwise']
                },  
                motor_options: {
                    acceptReporters: true,
                    items: ['right', 'left', 'both']
                }, 
                state_options: {
                    acceptReporters: true,
                    items: ['on', 'off']
                },
                button_state_options: {
                    acceptReporters: true,
                    items: ['pressed', 'released']
                },
                colour_options: {
                    acceptReporters: true,
                    items: ['red', 'yellow', 'pink','green','orange','purple','blue','cyan','black','white']
                }, 
                line_sensors_options: {
                    acceptReporters: true,
                    items: ['1','2','3','4','5','6','7']
                },                                                                                                           
            }
        };
    }

















//---------------------------------------------------


    // helpers
    connect () {
        if (this._connected) return Promise.resolve();
        if (this._connectionPromise) return this._connectionPromise;

        window.socket = new WebSocket('ws://127.0.0.1:9006');
        this._connectionPromise = new Promise(resolve => {
            window.socket.onopen = () => {
                this._connected = true;
                resolve();
            };
        });

        window.socket.onclose = () => {
            if (!alerted) {
                alerted = true;
                alert('Tinkibot has disconnected!');
            }
            this._connected = false;
            this._connectionPromise = null;
            if (this._pendingResponse) {
                this._pendingResponse.reject(new Error('Tinkibot disconnected while waiting for a response'));
                this._pendingResponse = null;
            }
        };

        window.socket.onmessage = message => {
            const response = JSON.parse(message.data);
            if (response.event === 'connected_robots') {
                this._setConnectedRobots(response.robots || response.nicknames);
            } else if (response.event === 'robot_connected') {
                if (!this._connectedRobots.some(robot => robot.botUuid === response['bot-uuid'])) {
                    this._setConnectedRobots([...this._connectedRobots, response]);
                    this.runtime.emit('TINKIBOT_ROBOT_CONNECTION_CHANGED');
                }
            } else if (response.event === 'robot_disconnected') {
                if (this._connectedRobots.some(robot => robot.botUuid === response['bot-uuid'])) {
                    this._setConnectedRobots(
                        this._connectedRobots.filter(robot => robot.botUuid !== response['bot-uuid'])
                    );
                    alert(formatMessage({
                        id: 'tinkibot.robotDisconnected',
                        default: '{nickname} has disconnected.',
                        description: 'Message shown when a Tinkibot robot disconnects.'
                    }, {nickname: response.nickname}));
                    this.runtime.emit('TINKIBOT_ROBOT_CONNECTION_CHANGED');
                }
            } else if (response.event === 'claim_accepted') {
                if (this._claimResponseMatches(response)) {
                    this._pendingClaims.delete(response['bot-uuid']);
                    this._updateRobotClaim(response['bot-uuid'], response['blocks-uuid']);
                }
            } else if (response.event === 'claim_rejected') {
                if (this._claimResponseMatches(response)) {
                    this._pendingClaims.delete(response['bot-uuid']);
                    this._updateRobotClaim(response['bot-uuid'], null);
                }
            } else if (response.event === 'robot_released') {
                this._updateRobotClaim(response['bot-uuid'], null);
            }
            if (response.report === 'claim' &&
                response.value === 'The robot has been claimed by another user' &&
                this._claimResponseMatches(response)) {
                this._pendingClaims.delete(response['bot-uuid']);
                this._updateRobotClaim(response['bot-uuid'], CLAIMED_BY_OTHER_USER);
                alert(formatMessage({
                    id: 'tinkibot.robotAlreadyClaimed',
                    default: '{nickname} could not be claimed because another user has already claimed it.',
                    description: 'Message shown when another user has already claimed a Tinkibot robot.'
                }, {nickname: response.nickname}));
            }
            if (response.event === 'button') {
                this._buttonEvent = response;
                this.runtime.startHats('tinkibotInteraction_when_button_event');
                this._buttonEvent = null;
            }
            if (this._pendingResponse && response.report === 'error') {
                const {reject} = this._pendingResponse;
                this._pendingResponse = null;
                const errorMessage = response.value === 'command_failed:no_robots_connected' ?
                    formatMessage({
                        id: 'tinkibot.noRobotsConnected',
                        default: 'No Tinkibot robots are connected.',
                        description: 'Message shown when a command needs a connected Tinkibot.'
                    }) :
                    formatMessage({
                        id: 'tinkibot.commandError',
                        default: 'Tinkibot command failed: {error}',
                        description: 'Message shown when a Tinkibot command cannot be completed.'
                    }, {error: response.value});
                alert(errorMessage);
                reject(new Error(response.value));
                return;
            }
            if (this._pendingResponse && response.report === this._pendingResponse.command) {
                const {resolve} = this._pendingResponse;
                this._pendingResponse = null;
                resolve(response.value);
            }
        };

        return this._connectionPromise;
    }

    _setConnectedRobots (robots) {
        this._connectedRobots = Array.from(new Map(robots.map(robot => {
            const normalizedRobot = typeof robot === 'string' ? {nickname: robot, botUuid: null, claimedBy: null} : {
                nickname: robot.nickname,
                botUuid: robot.botUuid || robot['bot-uuid'] || null,
                claimedBy: robot.claimedBy || robot['blocks-uuid'] || robot.claimed_by || null
            };
            return [normalizedRobot.botUuid || normalizedRobot.nickname, normalizedRobot];
        })).values()).map(robot => Object.assign({}, robot, {
            claimState: !robot.claimedBy ? 'free' :
                robot.claimedBy === this._blocksUuid ? 'paired' : 'claimed'
        }));
        this.runtime.tinkibotConnectedRobots = this._connectedRobots.map(robot => Object.assign({}, robot));
        this.runtime.emit('TINKIBOT_CONNECTED_ROBOTS_CHANGED', this.runtime.tinkibotConnectedRobots);
    }

    _updateRobotClaim (botUuid, blocksUuid) {
        this._setConnectedRobots(this._connectedRobots.map(robot => robot.botUuid === botUuid ?
            Object.assign({}, robot, {claimedBy: blocksUuid}) : robot));
    }

    _claimResponseMatches (response) {
        const robot = this._connectedRobots.find(connectedRobot => connectedRobot.botUuid === response['bot-uuid']);
        return Boolean(robot &&
            robot.nickname === response.nickname &&
            response['blocks-uuid'] === this._blocksUuid &&
            this._pendingClaims.has(response['bot-uuid']));
    }

    _getBlocksUuid () {
        const newId = () => uuid.v4();
        if (typeof window === 'undefined') return newId();
        try {
            const storage = window.localStorage;
            if (!storage) return newId();
            const storedId = storage.getItem(BLOCKS_UUID_STORAGE_KEY);
            if (storedId) return storedId;
            const blocksUuid = newId();
            storage.setItem(BLOCKS_UUID_STORAGE_KEY, blocksUuid);
            return blocksUuid;
        } catch (error) {
            console.warn('TinkibotBlocks._getBlocksUuid: could not access local storage', error);
            return newId();
        }
    }

    async claimRobot (botUuid) {
        const robot = this._connectedRobots.find(connectedRobot => connectedRobot.botUuid === botUuid);
        const alreadyClaimingOrPaired = this._pendingClaims.size > 0 ||
            this._connectedRobots.some(connectedRobot => connectedRobot.claimState === 'paired');
        if (!robot || robot.claimState !== 'free' || alreadyClaimingOrPaired) return;
        await this.connect();
        this._pendingClaims.add(robot.botUuid);
        window.socket.send(JSON.stringify({
            command: 'claim',
            nickname: robot.nickname,
            'bot-uuid': robot.botUuid,
            'blocks-uuid': this._blocksUuid
        }));
    }

    async releaseRobot (botUuid) {
        const robot = this._connectedRobots.find(connectedRobot => connectedRobot.botUuid === botUuid);
        if (!robot || robot.claimState !== 'paired') return;
        await this.connect();
        window.socket.send(JSON.stringify({
            command: 'unclaim',
            nickname: robot.nickname,
            'bot-uuid': robot.botUuid,
            'blocks-uuid': this._blocksUuid
        }));
        this._updateRobotClaim(robot.botUuid, null);
    }

    _sendCommand (command, responseCommand = command.command) {
        const operation = this._commandQueue.then(async () => {
            const robot = this._connectedRobots.find(connectedRobot => connectedRobot.claimState === 'paired');
            if (!robot) {
                const message = formatMessage({
                    id: 'tinkibot.robotClaimRequired',
                    default: 'Claim a robot from the Connections tab before using Tinkibot blocks.',
                    description: 'Message shown when a Tinkibot block is used without a claimed robot.'
                });
                alert(message);
                throw new Error('No Tinkibot robot is claimed');
            }
            await this.connect();
            return new Promise((resolve, reject) => {
                this._pendingResponse = {command: responseCommand, resolve, reject};
                window.socket.send(JSON.stringify(Object.assign({}, command, {
                    nickname: robot.nickname,
                    'bot-uuid': robot.botUuid,
                    'blocks-uuid': this._blocksUuid
                })));
            });
        });
        this._commandQueue = operation.catch(() => {});
        return operation;
    }

    // reporter blocks

    measure_distance () {
        return this._sendCommand({command: 'measure_distance'});
    }

    measure_voltage () {
        return this._sendCommand({command: 'measure_voltage'});
    }

    measure_right_encoder_count () {
        return this._sendCommand({command: 'measure_enc_right'});
    }

    measure_left_encoder_count () {
        return this._sendCommand({command: 'measure_enc_left'});
    }

    read_button (args) {
        return this._sendCommand({command: 'read_button', button: args.BUTTON});
    }

    when_button_event (args) {
        return Boolean(this._buttonEvent &&
            this._buttonEvent.button === args.BUTTON &&
            this._buttonEvent.state === args.STATE);
    }

    button_led (args) {
        return this._sendCommand({command: 'button_led', button: args.BUTTON, state: args.STATE});
    }

    play_sound (args) {
        return this._sendCommand({command: 'play_sound', sound: args.SOUND});
    }

    display_image (args) {
        return this._sendCommand({command: 'display_image', image: args.IMAGE});
    }

    measure_line_sensor (args) {
        return this._sendCommand({command: 'measure_line_sensor', sensor: args.SENSOR});
    }

    display_letter (args) {
        return this._sendCommand({command: 'display_image', image: args.IMAGE});
    }

    display_number (args) {
        return this._sendCommand({command: 'display_image', image: args.IMAGE});
    }

    write_text (args) {
        return this._sendCommand({command: 'write_text', x: args.X, y: args.Y, message: args.MESSAGE});
    }

    text_colour (args) {
        return this._sendCommand({command: 'text_colour', colour: args.COLOUR});
    }

    background_colour (args) {
        return this._sendCommand({command: 'background_colour', colour: args.COLOUR});
    }

    clear () {
        return this._sendCommand({command: 'clear'});
    }

    backlight (args) {
        const intensity = Math.max(0, Math.min(100, Cast.toNumber(args.INTENSITY)));
        return this._sendCommand({command: 'set', backlight: intensity});
    }

    mosaic (args) {
        return this._sendCommand({command: 'mosaic', image: args.IMAGE});
    }

    move (args) {
        return this._sendCommand({command: 'move', direction: args.DIRECTION, distance: args.DISTANCE});
    }

    rotate (args) {
        return this._sendCommand({command: 'rotate', rotation: args.ROTATION, degrees: args.DEGREES});
    }

    arc (args) {
        return this._sendCommand({
            command: 'arc',
            direction: args.DIRECTION,
            degrees: args.DEGREES,
            radius: args.RADIUS
        });
    }

    volume (args) {
        return this._sendCommand({command: 'set', volume: args.VALUE});
    }

    drive (args) {
        return this._sendCommand({command: 'drive', motor: args.MOTOR, speed: args.SPEED});
    }

    stop (args) {
        return this._sendCommand({command: 'stop', motor: args.MOTOR});
    }

    brake (args) {
        return this._sendCommand({command: 'brake', motor: args.MOTOR});
    }

    wiggle (args) {
        return this._sendCommand({command: 'wiggle', time: args.TIMES});
    }

    moonwalk (args) {
        return this._sendCommand({command: 'moonwalk', steps: args.STEPS});
    }

    _setLocale () {
        let now_locale = '';
        switch (formatMessage.setup().locale){
            case 'pt-br':
            case 'pt':
                now_locale='pt-br';
                break;
            case 'en':
                now_locale='en';
                break;
            case 'fr':
                now_locale='fr';
                break;
            case 'zh-tw':
                now_locale= 'zh-tw';
                break;
            case 'zh-cn':
                now_locale= 'zh-cn';
                break;
            case 'pl':
                now_locale= 'pl';
                break;
            case 'ja':
                now_locale= 'ja';
                break;
            case 'de':
                now_locale= 'de';
                break;
            case 'nl':
                now_locale= 'nl';
                break;
            default:
                now_locale='en';
                break;
        }
        return now_locale;
    }
}
module.exports = TinkibotBlocks;
