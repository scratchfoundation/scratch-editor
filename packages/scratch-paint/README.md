# scratch-paint
#### Scratch-paint provides a vector paint editor React component that takes and outputs SVGs. It is now in beta!

[![Greenkeeper badge](https://badges.greenkeeper.io/LLK/scratch-paint.svg)](https://greenkeeper.io/)
- Try it out at [https://llk.github.io/scratch-paint/](https://llk.github.io/scratch-paint/)

- Or, to try it out as part of Scratch 3.0, visit [https://preview.scratch.mit.edu/](https://preview.scratch.mit.edu/)

### Installation
It will be easiest if you develop on Mac or Linux. If you are using Windows, I recommend using Ubuntu on Windows, which will allow you to use Linux commands on Windows. You will need administrator permissions.

- https://docs.microsoft.com/en-us/windows/wsl/install-win10

Scratch Paint requires you to have Git and Node.js installed. See:
- [https://git-scm.com/book/en/v2/Getting-Started-Installing-Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [https://nodejs.org/en/download/](https://nodejs.org/en/download/)

If you want to use scratch-paint in your own Node environment/application, add it with:
```bash
npm install scratch-paint
```
If you want to edit scratch-paint, or help contribute to our open-source project, fork the [scratch-paint repo](https://github.com/LLK/scratch-paint). Then:
```bash
git clone https://github.com/<YOUR_GITHUB_USERNAME>/scratch-paint.git
cd scratch-paint
npm install
```

### Running locally (stand-alone)
You can try out your own copy of the paint editor by running the development server.

In the cloned `scratch-paint` directory, run:
```bash
npm start
```

Then go to [http://localhost:8078/playground/](http://localhost:8078/playground/). 8078 is BLOB upside-down. The True Name of this repo is scratch-blobs.

### Running locally (as part of Scratch)
So you've tried out your edits in the playground and they look good. You should now test with the rest of Scratch, to make sure that everything hooks up right, and so that you can use your custom paint editor to make costumes and sprites!

Get the rest of Scratch:
```bash
git clone https://github.com/LLK/scratch-gui.git
```
Go to your `scratch-paint` folder and run:
```bash
npm link
npm run watch
```
This runs a file watcher which should automatically recompile scratch-paint if you edit any files.

Now in another tab, go back to the `scratch-gui` folder and run
```bash
npm link scratch-paint
npm install
npm start
```
Then go to [http://localhost:8601](http://localhost:8601). 601 is supposed to look like GUI (it's okay, I don't really see it either.) The Costumes tab should be running your local copy of scratch-paint!

### How to include in your own Node.js App
For an example of how to use scratch-paint as a library, check out the `scratch-paint/src/playground` directory.
In `playground.jsx`, you can change the SVG vector that is passed in, and edit the handler `onUpdateSvg`, which is called with the new SVG each time the vector drawing is edited.

In your parent component:
```
import PaintEditor from 'scratch-paint';
...
<PaintEditor
    svg={optionalSvg}
    rotationCenterX={optionalCenterPointXRelativeToSvgTopLeft}
    rotationCenterY={optionalCenterPointYRelativeToSvgTopLeft}
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
Note that scratch-paint expects its state to be in `state.scratchPaint`, so the name must be exact.

Scratch-paint shares state with its parent component because it expects to share the parent's `IntlProvider`, which inserts translations into the state. See the `IntlProvider` setup in `scratch-gui` [here](https://github.com/LLK/scratch-gui/blob/f017ed72201bf63334dced161441ef6f154b1c74/src/lib/app-state-hoc.jsx).

### Code organization
We use React and Redux. If you're just getting started with them, here are some good tutorials:
[https://egghead.io/courses/getting-started-with-redux](https://egghead.io/courses/getting-started-with-redux)

- Under `/src`, our React/Redux code is divided mainly between `components` (presentational components), `containers` (container components), and `reducers`.

- `css` contains only shared css. Most of the css is stored alongside its component.

- `helper` contains pure javascript used by the containers. If you want to change how something works, it's probably here. For instance, the brush tool is in `helper/blob-tools/`, and the code that's run when you click the group button is in `helper/group.js`.

### Testing
```bash
npm run test
```

Just unit tests:
```bash
npm run unit
```

An individual unit test: (run from `scratch-paint` directory)
```bash
./node_modules/.bin/jest ./test/unit/undo-reducer.test.js
```

### Donate
We provide [Scratch](https://scratch.mit.edu) free of charge, and want to keep it that way! Please consider making a [donation](https://secure.donationpay.org/scratchfoundation/) to support our continued engineering, design, community, and resource development efforts. Donations of any size are appreciated. Thank you!

Scratch-paint couldn't exist without [w00dn/papergrapher](https://github.com/w00dn/papergrapher) and [Paper.js](https://github.com/paperjs/paper.js). If you are amazed and/or baffled by the insane boolean operation math that makes the brush and eraser tools possible, please check out and consider contributing to Paper. Thank you!