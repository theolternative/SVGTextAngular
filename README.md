SVGTextAngular
==============

SVG based AngularJS directive for text editing

Most of web texteditors are based upon the use of contentEditable divs. Everything's fine until you need a print. There's no way to achieve a real WYSIWYG copy.
The solution might be an SVG text editor capable of a pixel-precision text positioning.

The project is at its first stages (pre-alpha) and it currently supports the following features:
- Text insertion
- Left/right cursor movements
- Auto wrap around floating objects like images

It depends upon AngularJS, Snapsvg and JQuery

It's painfully slow at start: it looks like the browser is stuck but it isn't! 
Click on the page to start writing.
