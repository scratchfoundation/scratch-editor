# Making Your Own Scratch Extension

A Scratch extension is an additional set of blocks that you can add by clicking the extension library button. We have existing extensions for things like making music, drawing on the stage, translating text, and text to speech. This tutorial shows you how to make your own extension made up of new blocks of your own design!

An extension can do anything a web browser can, like using the webcam, recording and playing sound, connecting to bluetooth devices, and much more. Extensions can also interact with media and data inside Scratch. You can even import javascript libraries to power an incredible range of features, from machine learning to rhyming dictionaries to 3D worlds. So start small, but think big!

This tutorial shows how to run your own copy of the Scratch editor locally, and add a brand-new extension to it with a few new blocks.

**Before you start, make sure you have:**

* A free [GitHub](https://github.com) account
* [Git](https://git-scm.com/downloads) installed (check with `git --version`)
* [Node.js](https://nodejs.org) version 24 (check with `node --version`)
* A code editor, like [VS Code](https://code.visualstudio.com)
* About 5 GB of free disk space and a decent Wi-Fi connection

## Step 1: Fork and clone the repo

A **fork** is your own copy of the project on GitHub. You can change it however you like without affecting the real Scratch.

1. Go to [github.com/scratchfoundation/scratch-editor](https://github.com/scratchfoundation/scratch-editor).
2. Click **Fork** (top right), then **Create fork**.
3. In your code editor’s terminal, navigate to the directory where you want your fork to be downloaded. You may need to use these commands:
   1. `pwd`: show the current directory your terminal is in
   2. `ls`: to show the contents of the current directory
   3. `cd`: move into a directory
4. In that same terminal, download ("clone") your fork and step inside. To do this, replace `YOUR-USERNAME` with your GitHub username and paste this:

```sh
git clone https://github.com/YOUR-USERNAME/scratch-editor.git
```

Run this command in your terminal to enter the scratch-editor folder.

```sh
cd scratch-editor
```

The repo holds several packages. You'll touch two: **scratch-vm** (the engine that runs blocks) and **scratch-gui** (the editor you see).

## Step 2: Install, build, and run the editor

Run these from the scratch-editor folder. The first two take a while (10–20 minutes total), so start them and go grab a snack.

```sh
npm ci          # download everything the project needs
npm run build   # build all the packages once
```

Then, navigate to the scratch-gui folder by entering

```sh
cd packages     # navigate to the packages folder
cd scratch-gui  # navigate to the scratch-gui folder within packages
```

and run the following:

```sh
npm start       # start the editor
```

When the terminal says compiled successfully, open [http://localhost:8601](http://localhost:8601). You're now running Scratch on your own computer. Leave `npm start` running: it rebuilds automatically every time you save a file.

## Step 3: Write your extension

An extension’s code is contained within a JavaScript class. `getInfo()` describes the blocks (their shape, text, and inputs), and each block's `opcode` names the function that runs when someone clicks it.

Create a new folder and file: `packages/scratch-vm/src/extensions/scratch3_hello/index.js`. Paste this in:

```js
const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');

class Scratch3HelloBlocks {
    constructor (runtime) {
        this.runtime = runtime;
    }

    getInfo () {
        return {
            id: 'hello',
            name: 'Hello',
            blocks: [
                {
                    opcode: 'sayHello',
                    blockType: BlockType.COMMAND,
                    text: 'say hello to [NAME]',
                    arguments: {
                        NAME: {type: ArgumentType.STRING, defaultValue: 'hackers!'}
                    }
                },
                {
                    opcode: 'randomGreeting',
                    blockType: BlockType.REPORTER,
                    text: 'random greeting'
                },
                {
                    opcode: 'isEven',
                    blockType: BlockType.BOOLEAN,
                    text: '[NUM] is even?',
                    arguments: {
                        NUM: {type: ArgumentType.NUMBER, defaultValue: 4}
                    }
                }
            ]
        };
    }

    sayHello (args, util) {
        this.runtime.emit('SAY', util.target, 'say', `Hello, ${args.NAME}!`);
    }

    randomGreeting () {
        const greetings = ['Hi', 'Hey', 'Yo', 'Howdy', 'Hola', 'Bonjour'];
        return greetings[Math.floor(Math.random() * greetings.length)];
    }

    isEven (args) {
        return Number(args.NUM) % 2 === 0;
    }
}

module.exports = Scratch3HelloBlocks;
```

Here’s what's going on:

* **COMMAND** blocks are stackable. They make something happen. `sayHello` makes the sprite show a speech bubble.
* **REPORTER** blocks are round. They return a value, which you can use by plugging it into the input of another block. `randomGreeting` returns a word.
* **BOOLEAN** blocks are pointy; they return true or false.
* `[NAME]` in the block text becomes an input slot, and its value arrives in your function as `args.NAME`.

## Step 4: Plug it into Scratch

Two small edits tell Scratch your extension exists.

**4a. Tell the engine.** Open `packages/scratch-vm/src/extension-support/extension-manager.js`. Find the list called `builtinExtensions` and add a line for `hello` at the end (don't forget the comma on the line before):

```js
    faceSensing: () => require('../extensions/scratch3_face_sensing'),
    hello: () => require('../extensions/scratch3_hello')
};
```

**4b. Add it to the Extension Library.** Open `packages/scratch-gui/src/lib/libraries/extensions/index.jsx`. Find `export default [` and paste this entry right after the `[`:

```js
    {
        name: 'Hello',
        extensionId: 'hello',
        description: 'My first Scratch extension!',
        featured: true
    },
```

The `extensionId` must match the `id` in your `getInfo()` exactly, or Scratch won't find your blocks.

## Step 5: Try it out

1. Save both files. The `npm start` terminal rebuilds on its own. If you had stopped it, run `npm start` again.
2. Refresh [http://localhost:8601](http://localhost:8601).
3. Click the **Add Extension** button (bottom left) and choose **Hello**.
4. A green **Hello** category appears with your three blocks. Click **say hello to hackers!** and watch the cat talk!

**If something's off:**

* **Hello isn't in the library:** check the entry in `index.jsx` is saved, then hard-refresh the page (Ctrl+Shift+R, or Cmd+Shift+R on a Mac).
* **The library card is there but no blocks show up:** `extensionId` and `id` don't match, or step 4a is missing.
* **Red error text in the terminal:** read the file name and line number it gives. It's usually a missing comma or bracket.
* **`npm ci` failed:** run `node --version` and make sure it says v24.

## Step 6: Save your work!

Run the following from another terminal instance within your code editor (or exit out of `npm start`):

```sh
git add .
git commit -m "feat: add hello extension"
```

then

```sh
git push
```

to put it on your fork.

**Ideas for what to build next:**

* Add a **HAT** block (`BlockType.HAT`) that starts scripts, like "when loudness > 50".
* Use a dropdown menu argument instead of a text input.
* Call a free web API (weather, jokes, Pokémon) from a reporter block. Functions can return a Promise and Scratch will wait for it.
* Give your extension an icon with `blockIconURI` in `getInfo()` and `iconURL` in the library entry.
* Steal ideas from the real extensions in `packages/scratch-vm/src/extensions/`. Pen and Makey Makey are good short reads.
