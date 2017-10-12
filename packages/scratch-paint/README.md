# scratch-paint
#### Scratch paint provides a React component which is a vector paint editor. It is very much still under construction!

### Installation
This requires you to have Git and Node.js installed.

In your own node environment/application:
```bash
npm install https://github.com/LLK/scratch-paint.git
```
If you want to edit/play yourself:
```bash
git clone https://github.com/LLK/scratch-paint.git
cd scratch-paint
npm install
```

## Playground
This requires Node.js to be installed.

Run the paint editor independent of Scratch by running the development server.
Open a Command Prompt or Terminal in the repository and run:
```bash
npm start
```

Then go to [http://localhost:8078/playground/](http://localhost:8078/playground/). 8078 is BLOB upside-down.

Code for the playground is in `scratch-paint/src/playground/playground.jsx`. You can change the SVG vector that is passed in, and `onUpdateSvg`, which is called with the new SVG each time the vector drawing is edited.

## How to include in a Node.js App
For an example, check out the `scratch-paint/src/playground` directory.

In the component:
```
import PaintEditor from 'scratch-paint';
...
<PaintEditor
    svg={optionalSvg}
    rotationCenterX={optionalCenterPointXRelativeToSvg}
    rotationCenterY={optionalCenterPointYRelativeToSvg}
    onUpdateSvg={handleUpdateSvgFunction}
/>
```

In the top-level combineReducers function:
```
import {ScratchPaintReducer} from 'scratch-paint';
...
combineReducers({
	...
    scratchPaint: ScratchPaintReducer
});
```
Note that scratch-paint expects its state to be in `state.scratchPaint` so the name must be exact.

Scratch paint shares state with its parent component because it expects to share the parent's IntlProvider, which inserts translations into the state. See the intlProvider setup in `scratch-gui` [here](https://github.com/LLK/scratch-gui/blob/f017ed72201bf63334dced161441ef6f154b1c74/src/lib/app-state-hoc.jsx).

## Testing
```bash
npm run test
```

Just unit tests:
```bash
npm run unit
```

Individual unit test: (from `scratch-paint` directory)
```bash
./node_modules/.bin/jest ./test/unit/undo-reducer.test.js
```

## Publishing to GitHub Pages
```bash
npm run deploy
```

This will push the currently built playground to the gh-pages branch of the
currently tracked remote.  If you would like to change where to push to, add
a repo url argument:
```bash
npm run deploy -- -r <your repo url>
```

## Donate
We provide [Scratch](https://scratch.mit.edu) free of charge, and want to keep it that way! Please consider making a [donation](https://secure.donationpay.org/scratchfoundation/) to support our continued engineering, design, community, and resource development efforts. Donations of any size are appreciated. Thank you!