# PixelForge

[Open the live app](https://ajoealex.github.io/PixelForge/)

An image editor that runs in your browser, built with React, Vite, Tailwind CSS, and p5.js. Application code uses JavaScript and JSX. Image processing and saved history stay on your device.

## Development

Requires npm and Node.js compatible with Vite 7's engine range, `^20.19.0 || >=22.12.0`.

Run these commands from the project directory.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. On Windows PowerShell with script execution disabled, use `npm.cmd` in place of `npm`.

| Command           | Purpose                                              |
| ----------------- | ---------------------------------------------------- |
| `npm run dev`     | Start the development server with live updates.      |
| `npm run build`   | Generate the production build in `dist/`.            |
| `.\build.bat`     | Generate the production build in `docs/` on Windows. |
| `npm run preview` | Serve the production build locally after building.   |

Builds use relative asset URLs such as `./assets/...`, so the generated app can be served from a subfolder.

DM Sans CSS, WOFF2 fonts, and the font license are bundled in `public/fonts/`. Vite copies these into the build output, including `docs/fonts/` when using `build.bat`. The generated app loads its styles, fonts, scripts, and images from its own build folder.

## Tools

The starting screen shows five tool tiles.

| Tool               | Capabilities                                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Color studio**   | Grayscale, inversion, brightness, contrast, saturation, and individual RGB adjustments.                                                    |
| **Edge detection** | Sobel, Prewitt, Laplacian, and Scharr operators with adjustable strength and background inversion.                                         |
| **Pixel lab**      | Pixelation, color replacement, binary color masks, and individual RGBA pixel inspection and editing.                                       |
| **Enhance & blur** | Selective blur, pixelation, sharpening, thresholding, median denoising, and a configurable 3 × 3 convolution kernel.                       |
| **Draw shapes**    | Rounded rectangles, circles, ovals, arrows, and lines with configurable colors, stroke width, solid or dotted strokes, and optional fills. |

## Editing an image

1. Upload an image, drop a file anywhere in the app, or choose a bundled sample. Opening a tool before uploading loads the Italian coast sample.
2. Choose a tool and adjust its controls to see a live preview.
3. Use **Apply changes** to commit an edit and build successive adjustments. Use **Apply shape** to commit a drawing and add another shape.
4. Use undo and redo to move through applied edits. **Original** toggles comparison with the originally opened image.
5. Choose **Export image** to download the edited preview at its original resolution, including pending filter or shape changes.

History retains up to 20 image states, with capacity adjusted for image size. Applied edits and undo history belong to the current editing session.

### Selections

Blur requires a rectangular selection. Other filters default to the whole image and support optional rectangular selections. RGBA editing targets the clicked pixel within the active selection.

- Choose **Draw selection** and drag over the image to define a rectangle.
- Choose **Invert selection** to apply the filter everywhere outside the rectangle and protect its interior.
- Use the eraser control or **Escape** to clear a selection.
- Selections persist when switching between filters. Applying an effect clears its selection and preview backdrop.

### Shapes

Choose a shape and drag on the image to draw it. Adjust stroke color, stroke width, and solid or dotted styling in the live preview. Closed shapes support configurable fill colors, and arrows support filled heads. Rectangles have an adjustable border radius.

Applied shapes become part of the image and support undo, redo, and export.

### Keyboard shortcuts

Use undo and redo shortcuts with focus on the workspace.

| Action                                                               | Shortcut                             |
| -------------------------------------------------------------------- | ------------------------------------ |
| Undo an applied edit                                                 | `Ctrl/⌘ + Z`                         |
| Redo an applied edit                                                 | `Ctrl/⌘ + Shift + Z` or `Ctrl/⌘ + Y` |
| Invert the active selection                                          | `Ctrl/⌘ + Shift + I`                 |
| Clear a selection or shape draft, or close an open dialog/navigation | `Escape`                             |

## Saved colors

Enable **Remember colors** in Draw shapes or the color replacement/mask controls to save chosen and applied colors in local storage. Remembering starts disabled.

- Saved swatches are shared between stroke, fill, source, and replacement color pickers.
- Click a swatch to reuse it, or its **×** button to remove it from saved colors.
- The preference and saved colors survive page reloads.
- Turning remembering off stops adding colors and keeps existing swatches available for reuse or removal.

## Recent images

The home screen keeps the 10 most recently opened original images in IndexedDB, including full-resolution files and small thumbnails. Uploads and opened samples appear in this list.

- Click a recent image to reopen its original file and start a fresh editing session.
- Reopening a duplicate moves it to the front of the list.
- Opening an eleventh distinct image replaces the oldest entry.
- Use an image's trash button to remove it from the list.
- Recent images survive page reloads and synchronize across open pages.

Browser storage is scoped to the app's origin and browser profile. Use the same protocol, hostname, and port during development to access the same saved colors and recent images.

Storage failures show a **Retry** control while editing and export remain available.

## Export

| Format   | Options                                                     |
| -------- | ----------------------------------------------------------- |
| **PNG**  | Lossless output with transparency.                          |
| **JPG**  | Adjustable quality with transparency composited over white. |
| **WEBP** | Adjustable quality with transparency support.               |

Downloads use the filename pattern `<original-name>-pixelforge.<extension>`.

## Project structure

| Path                       | Responsibility                                                                                  |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| `src/App.jsx`              | Workspace state, image loading, edit history, keyboard shortcuts, and export.                   |
| `src/components/`          | Home screen, tool controls, p5.js canvas, saved color swatches, and recent images.              |
| `src/imageProcessing.js`   | Color adjustments, edge detection, pixel operations, convolution, and selection compositing.    |
| `src/processing.worker.js` | Image processing in a Web Worker.                                                               |
| `src/shapes.js`            | Shared drawing paths for live shape previews and exported images.                               |
| `src/recentImages.js`      | IndexedDB storage, thumbnails, duplicate detection, and retention of the 10 most recent images. |
| `src/useRecentImages.js`   | Recent-image state, synchronization, removal, and retry handling.                               |
| `src/useColorHistory.js`   | Saved-color preferences and local storage.                                                      |
| `src/constants.js`         | Tool definitions, bundled samples, and default settings.                                        |
| `public/`                  | Bundled font CSS and files, sample photographs, and the app favicon.                            |

## Credits

The bundled sample photographs come from Unsplash. The interface uses DM Sans from Google Fonts and Lucide icons. The DM Sans license is included in `public/fonts/OFL-DM-Sans.txt`.
