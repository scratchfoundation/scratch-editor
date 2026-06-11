/* eslint-env jest */
import fillColorReducer, {changeFillColor} from '../../src/reducers/fill-style';
import strokeColorReducer, {changeStrokeColor} from '../../src/reducers/stroke-style';
import {setSelectedItems} from '../../src/reducers/selected-items';
import {MIXED} from '../../src/helper/style-path';
import GradientTypes from '../../src/lib/gradient-types';
import {mockPaperRootItem} from '../__mocks__/paperMocks';

for (const [colorReducer, changeColor, colorProp] of [
    [fillColorReducer, changeFillColor, 'fillColor'],
    [strokeColorReducer, changeStrokeColor, 'strokeColor']
]) {
    test('initialState', () => {
        let defaultState;

        expect(colorReducer(defaultState /* state */, {type: 'anything'} /* action */)).toBeDefined();
    });

    test('changeColor', () => {
        let defaultState;

        // 3 value hex code
        let newColor = '#fff';
        expect(colorReducer(defaultState /* state */, changeColor(newColor) /* action */).primary)
            .toEqual(newColor);
        expect(colorReducer({
            primary: '#010',
            secondary: null,
            gradientType: GradientTypes.SOLID
        } /* state */, changeColor(newColor) /* action */).primary)
            .toEqual(newColor);

        // 6 value hex code
        newColor = '#facade';
        expect(colorReducer(defaultState /* state */, changeColor(newColor) /* action */).primary)
            .toEqual(newColor);
        expect(colorReducer({
            primary: '#010',
            secondary: null,
            gradientType: GradientTypes.SOLID
        } /* state */, changeColor(newColor) /* action */).primary)
            .toEqual(newColor);
    });

    test('changeColorViaSelectedItems', () => {
        let defaultState;

        const color1 = 6;
        const color2 = null; // transparent
        let selectedItems = [mockPaperRootItem({[colorProp]: color1, strokeWidth: 1})];

        expect(colorReducer(defaultState /* state */, setSelectedItems(selectedItems) /* action */).primary)
            .toEqual(color1);
        selectedItems = [mockPaperRootItem({[colorProp]: color2, strokeWidth: 1})];
        expect(colorReducer(defaultState /* state */, setSelectedItems(selectedItems) /* action */).primary)
            .toEqual(color2);
        selectedItems = [
            mockPaperRootItem({[colorProp]: color1, strokeWidth: 1}),
            mockPaperRootItem({[colorProp]: color2, strokeWidth: 1})
        ];
        expect(colorReducer(defaultState /* state */, setSelectedItems(selectedItems) /* action */).primary)
            .toEqual(MIXED);
    });

    test('invalidChangeColor', () => {
        const origState = {primary: '#fff', secondary: null, gradientType: GradientTypes.SOLID};

        expect(colorReducer(origState /* state */, changeColor() /* action */))
            .toBe(origState);
        expect(colorReducer(origState /* state */, changeColor('#') /* action */))
            .toBe(origState);
        expect(colorReducer(origState /* state */, changeColor('#1') /* action */))
            .toBe(origState);
        expect(colorReducer(origState /* state */, changeColor('#12') /* action */))
            .toBe(origState);
        expect(colorReducer(origState /* state */, changeColor('#1234') /* action */))
            .toBe(origState);
        expect(colorReducer(origState /* state */, changeColor('#12345') /* action */))
            .toBe(origState);
        expect(colorReducer(origState /* state */, changeColor('#1234567') /* action */))
            .toBe(origState);
        expect(colorReducer(origState /* state */, changeColor('invalid argument') /* action */))
            .toBe(origState);
    });

}
