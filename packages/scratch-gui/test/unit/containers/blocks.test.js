import {Blocks} from '../../../src/containers/blocks.jsx';

describe('Blocks container handleCustomProceduresClose', () => {
    test('selects the My Blocks category after closing', () => {
        // The My Blocks category has toolboxitemid="myBlocks" but its
        // display name is a translated string like "My Blocks".
        // A correct implementation must find the category even when the
        // display name doesn't match the toolbox item ID.
        const myBlocksItem = {name: 'Mis Bloques'};
        const toolbox = {
            selectedItem: null,
            getToolboxItemById: jest.fn(id => (id === 'myBlocks' ? myBlocksItem : null)),
            // Simulates real selectCategoryByName: looks up by display name, not ID
            selectCategoryByName: jest.fn(name => {
                toolbox.selectedItem = (name === 'Mis Bloques') ? myBlocksItem : null;
            }),
            setSelectedItem: jest.fn(item => {
                toolbox.selectedItem = item;
            })
        };
        const instance = {
            props: {onRequestCloseCustomProcedures: jest.fn()},
            workspace: {getToolbox: jest.fn().mockReturnValue(toolbox)},
            updateToolbox: jest.fn()
        };

        Blocks.prototype.handleCustomProceduresClose.call(instance, {});

        // The category must actually be resolved and selected.
        // If the lookup silently fails, selectedItem will be null
        // and the toolbox won't scroll.
        expect(toolbox.selectedItem).toBe(myBlocksItem);
    });
});

describe('Blocks container onWorkspaceUpdate', () => {
    let instance;

    beforeEach(() => {
        // Minimal mock instance — just enough for onWorkspaceUpdate to run
        instance = {
            getToolboxXML: jest.fn().mockReturnValue(null),
            onWorkspaceMetricsChange: jest.fn(),
            toolboxUpdateChangeListener: jest.fn(),
            props: {
                vm: {editingTarget: null},
                workspaceMetrics: {targets: {}},
                updateToolboxState: jest.fn()
            },
            workspace: {
                removeChangeListener: jest.fn(),
                addChangeListener: jest.fn(),
                clearUndo: jest.fn()
            },
            ScratchBlocks: {
                Events: {
                    disable: jest.fn(),
                    enable: jest.fn()
                },
                utils: {
                    xml: {
                        textToDom: jest.fn().mockReturnValue(document.createElement('xml'))
                    }
                },
                clearWorkspaceAndLoadFromXml: jest.fn()
            }
        };
    });

    test('Events.enable() is called after a successful workspace load', () => {
        Blocks.prototype.onWorkspaceUpdate.call(instance, {xml: '<xml/>'});

        expect(instance.ScratchBlocks.Events.disable).toHaveBeenCalled();
        expect(instance.ScratchBlocks.Events.enable).toHaveBeenCalled();
    });

    test('Events.enable() is called even when clearWorkspaceAndLoadFromXml throws', () => {
        instance.ScratchBlocks.clearWorkspaceAndLoadFromXml.mockImplementation(() => {
            throw new Error('workspace load failed');
        });

        Blocks.prototype.onWorkspaceUpdate.call(instance, {xml: '<xml/>'});

        expect(instance.ScratchBlocks.Events.disable).toHaveBeenCalled();
        expect(instance.ScratchBlocks.Events.enable).toHaveBeenCalled();
    });

    test('Events.enable() is called even when textToDom throws', () => {
        instance.ScratchBlocks.utils.xml.textToDom.mockImplementation(() => {
            throw new Error('XML parse failed');
        });

        Blocks.prototype.onWorkspaceUpdate.call(instance, {xml: 'invalid xml'});

        expect(instance.ScratchBlocks.Events.disable).toHaveBeenCalled();
        expect(instance.ScratchBlocks.Events.enable).toHaveBeenCalled();
    });
});
