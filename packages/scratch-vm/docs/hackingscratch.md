# Hacking the Scratch Editor 🛠️

Welcome! This guide shows you how the Scratch Editor's code is put together, so you can jump in and build something fun. You don't need to understand everything. Pick one part and start poking at it. If you already have the editor running locally, then __skip to Section 3__ for an overview of each package and get to hacking!

Before you start, make sure you have:
- A free GitHub account
- Git installed (check with git --version)
- Node.js version 24 (check with node --version)
- A code editor, like VS Code
- About 5 GB of free disk space and a decent Wi-Fi connection

## 1. Cloning the repo
A fork is your own copy of the project on GitHub. You can change it however you like without affecting the real Scratch.
- Go to https://github.com/scratchfoundation/scratch-editor.
- Click __Fork__ (top right), then __Create fork__.

In your code editor’s terminal, navigate to the directory where you want your fork to be downloaded. You may need to use these commands:
- pwd: show the current directory your terminal is in
- ls: to show the contents of the current directory
- cd: move into a directory

In that same terminal, download ("clone") your fork and step inside. To do this, replace YOUR-USERNAME with your GitHub username and paste this:
git clone https://github.com/YOUR-USERNAME/scratch-editor.git

## 2. Get it running

You need [Node.js](https://nodejs.org/) installed. From the top folder (```/scratch-editor```) of this repo:

```
npm ci       # install everything (takes a few minutes the first time)
```
```
npm run build   # build all the packages once
```

And then after navigating to packages/scratch-gui:

```
npm start    # start the editor
```

When the terminal says compiled successfully, then open [**http://localhost:8601/**](http://localhost:8601/) in your browser.

Leave npm start running while you work. Note: When you save a file that is located in scratch-gui, scratch-vm, scratch-paint, or scratch-render, the page will automatically reload to show your change.

## 3. What each package does

The editor is split into **packages** (folders inside packages/). Each one does one job:

**How it flows:** You click the green flag in **gui** → the **vm** runs your scripts → the vm tells **render** where each sprite is → render draws the Stage.

| **Package**                                               | **What you see in the editor**                                                                          | **Level for hacking**                                                                 |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **scratch-gui**<br><br>**(gui - Graphic User Interface)** | Everything around the Stage: menu bar, Code/Costumes/Sounds tabs, block palette, sprite list, libraries | Start here - You can modify the look and functionality of most features in the Editor |
| **scratch-vm**<br><br>**(vm - Virtual Machine)**          | What blocks _do_ when they run: motion, looks, sounds, variables, extensions                            | Make new blocks!                                                                      |
| **scratch-paint**                                         | The **Costumes** tab drawing tools: brush, eraser, shapes, fill, color picker                           | New drawing tools                                                                     |
| **scratch-render**                                        | The **Stage**: drawing sprites, effects like ghost/color/whirl, the pen                                 | Shader magic (advanced)                                                               |

## 4. Where to make fun changes

### Make your own blocks (scratch-vm + scratch-gui)

The easiest big win is making an **extension**: a new category of blocks, like Pen or Music. You can look at MAKINGANEXTENSION.md for help with that.

- ```  packages/scratch-vm/src/extensions/ ```: Every real extension lives here (Pen, Music, Makey Makey and more!) Peek at them to see how bigger extensions work.

- ``` packages/scratch-vm/src/blocks/ ```: This is where you can find the details behind all the default Scratch block categories like Looks, Motion, Sound etc.

- ``` packages/scratch-vm/src/blocks/scratch3_core_example.js ```: This is an example block category that uses just three blocks. It's a good starting template to help understand how the other block categories are built.

- Each extension within ``` packages/scratch-vm/src/extensions/ ``` has its own index.js file.

- The ``` getInfo() ``` function in each ``` index.js ``` lists the details for each block within that extension. Details like the text label for the block, its ``` blockType ``` and more.

- ``` getInfo() ``` also contains the opcode of each block. The opcode always matches the name of a function within that same ``` index.js file ```. That function is what the block _does_.

- ``` packages/scratch-vm/src/extension-support/extension-manager.js ```: Add your extension to the ``` builtinExtensions ``` list so the VM can find it.

- ``` packages/scratch-gui/src/lib/libraries/extensions/index.jsx ```: Add a card here so it shows up in the "Add Extension" menu (bottom-left button).

Want to change how an **existing** block works? Look in ``` packages/scratch-vm/src/blocks/ ```. For example, ``` scratch3_motion.js ``` has ``` moveSteps ``` (the "move 10 steps" block).

### Change how the editor looks (scratch-gui)

- ``` packages/scratch-gui/src/css/colors.css ```: This contains the main UI colors. Change a few and watch the whole editor change.

- ``` packages/scratch-gui/src/lib/settings/color-mode/ ```: Here lie the block color themes (default, dark, high contrast). Make your own!

- ``` packages/scratch-gui/src/components/ ```: Each folder builds a specific per piece of the editor screen (like ``` menu-bar/ ```, ``` green-flag/ ```, ``` sprite-selector/ ```, ``` stage/ ```). Each has a ``` .jsx ``` file (the structure) and a ``` .css ``` file (the style).

- Check out ``` nineties-mode/ ```, ``` oldtimey-mode/ ```, and ``` prehistoric-mode/ ``` in ``` components/ ``` for silly hidden modes you can learn from.

- ``` packages/scratch-gui/src/lib/default-project/ ```: This is the default project you always see when the editor opens (the cat!). Swap in a different starting sprite.

### Add drawing tools (scratch-paint)

- ``` packages/scratch-paint/src/components/ ```: This contains the tool buttons and panels (``` brush-mode/ ```, ``` fill-mode/ ```, ``` color-picker/ ```...).
- ``` packages/scratch-paint/src/helper/ ```: This contains the logic behind each tool. ``` bit-tools/ ``` holds the bitmap tools, ``` blob-tools/ ``` the vector brush.

### Stage effects (scratch-render)

- ``` packages/scratch-render/src/shaders/sprite.frag ```: This is the GPU code behind visual effects like **color**, **brightness**, **fisheye**, **whirl**, **pixelate**, **mosaic**, and **ghost**. Tweak the math to invent new effects.
- ``` packages/scratch-render/src/RenderWebGL.js ```: This is the code that builds the main Stage in the editor.
- This one's more advanced (it uses GLSL shader code), but the results look awesome.

### Sprites, sounds, and backdrops (scratch-gui)

- ``` packages/scratch-gui/src/lib/libraries/ ```: sprites.json, costumes.json, sounds.json, and backdrops.json list what's in the "Choose a..." libraries. The ``` \*-tags.js ``` files control the category filters at the top (Animals, Music, etc.).

## 5. Tips

- **Use the browser's DevTools** by hitting **F12 / Cmd+Option+I**. When you use ``` console.log() ``` anywhere in the code, the result is printed out in the DevTools panel.
- **Start small:** Change a color or some text first so you know your setup works, then go bigger.
- **Stuck?** Each package has its own ``` README.md ``` with more details on how it works, and don't be afraid to get help from your buddies.

Have fun!