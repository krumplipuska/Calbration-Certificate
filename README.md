# Document Creator Web Application

A modern web application for creating documents with drag-and-drop functionality. This application allows users to create documents by dragging and dropping various elements onto an A4-sized canvas.

## Features

- A4-sized document canvas
- Drag-and-drop interface
- Support for multiple element types:
  - Text boxes (editable)
  - Input fields
  - Images (with file upload)
- Responsive design
- Modern and clean user interface

## How to Use

1. Open `index.html` in a modern web browser
2. Use the toolbar on the left to drag elements onto the document
3. Available elements:
   - Text Box: Drag onto the document and double-click to edit
   - Input Field: Drag onto the document to create a text input field
   - Image: Drag onto the document and click to upload an image

## Element Controls

- **Text Box**: Double-click to edit the text
- **Input Field**: Click to enter text
- **Image**: Click to upload an image from your computer
- All elements can be dragged around the document by clicking and dragging

## Technical Details

- Built with vanilla JavaScript, HTML5, and CSS3
- Uses the HTML5 Drag and Drop API
- Custom JavaScript handles drag-and-drop interactions for selected elements
- html2canvas and jsPDF power the export to PDF feature
- Responsive design that works on different screen sizes
- Font Awesome provides icons

## Browser Support

This application works best in modern browsers that support HTML5 Drag and Drop API:
- Chrome (recommended)
- Firefox
- Safari
- Edge

## Development

To modify or enhance the application:

1. Edit `index.html` to modify the structure
2. Edit `styles.css` to change the appearance
3. Edit `script.js` to modify the functionality

## License

This project is open source and available under the MIT License. 
