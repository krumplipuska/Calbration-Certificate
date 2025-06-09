// Canva-style Text Box Editor

document.addEventListener('DOMContentLoaded', () => {
    const addTextBtn = document.getElementById('add-text-btn');
    const addImageFrameBtn = document.getElementById('add-image-frame-btn');
    const addRectangleBtn = document.getElementById('add-rectangle-btn');
    window.currentPage = 0; // The currently active page index
    let dragOffset = { x: 0, y: 0 };
    let resizing = false;
    let resizeDir = null;
    let startRect = null;
    let startMouse = null;
    let editMode = false;
    const editToggle = document.getElementById('edit-toggle');
    const addToolbar = document.getElementById('add-toolbar');

    // Global HTML for reusable components
    const HANDLES_HTML = ['.nw', '.n', '.ne', '.e', '.se', '.s', '.sw', '.w'].map(dir => `<div class="resize-handle ${dir}"></div>`).join('');
    const ACTIONS_HTML = `
        <div class="floating-actions no-zoom-scale" style="display:none;">
            <div class="floating-action-btn move-btn" title="Move"><i class="fas fa-arrows-alt"></i></div> <!-- Move handler removed, drag is global -->
            <div class="floating-action-btn copy-btn" title="Copy"><i class="fas fa-copy"></i></div>
            <div class="floating-action-btn delete-btn" title="Delete"><i class="fas fa-trash"></i></div>
        </div>`;

    // Details Panel Elements
    const detailsPanel = document.getElementById('element-details-panel');
    const detailId = document.getElementById('detail-id');
    const detailText = document.getElementById('detail-text');
    const detailX = document.getElementById('detail-x');
    const detailY = document.getElementById('detail-y');
    const detailWidth = document.getElementById('detail-width');
    const detailHeight = document.getElementById('detail-height');
    const imageFileInput = document.getElementById('image-file-input'); // Get file input

    // Property group containers
    const textPropsGroup = document.getElementById('text-props-group');
    const imagePropsGroup = document.getElementById('image-props-group');
    const detailImageSrc = document.getElementById('detail-image-src');

    let isUpdatingFromPanel = false; // Flag to prevent update loops
    let currentFrameToUpdate = null; // To track which frame is getting an image

    // Centralized function to attach all standard event listeners to an element
    // function attachElementEventListeners(element) { // THIS ENTIRE FUNCTION IS NO LONGER NEEDED AND SHOULD BE REMOVED
        // const elementType = element.getAttribute('data-element-type');

        // 1. Main Mousedown for Selection & Conditional Drag
        // element.addEventListener('mousedown', e => { ... }); // Replaced by jQuery selection

        // 2. Resize Handles
        // element.querySelectorAll('.resize-handle').forEach(handle => { ... }); // Keep resize logic as is for now, unless it also needs rework

        // 3. Floating Action Buttons // THIS PART WILL BE REPLACED BY JQUERY DELEGATED EVENTS
        // const actions = element.querySelector('.floating-actions');
        // if (actions) {
            // const moveBtn = actions.querySelector('.move-btn'); // Move button functionality covered by draggable
            // if (moveBtn) moveBtn.onmousedown = ... }
            // const copyBtn = actions.querySelector('.copy-btn');
            // if (copyBtn) { copyBtn.onclick = ... } // Will be replaced
            // const deleteBtn = actions.querySelector('.delete-btn');
            // if (deleteBtn) { deleteBtn.onclick = ... } // Will be replaced
        // }

        // 4. Type-Specific Listeners
        // if (elementType === 'text') { ... } // Keep text dblclick for edit, mousedown for contenteditable stopPropagation
        // else if (elementType === 'image_frame') { ... } // Keep image dblclick for file input
    // }

    // Add new text box
    addTextBtn.addEventListener('click', () => {
        // Get the current page's document area
        const currentPageContainer = document.querySelector(`[page-index="${window.currentPage}"]`);
        if (!currentPageContainer) return;
        
        const documentArea = currentPageContainer.querySelector('.document');
        if (!documentArea) return;

        const defaultText = 'Double click to edit text';
        const fontSize = '12pt';
        // Measure text size
        const temp = document.createElement('div');
        temp.style.position = 'absolute';
        temp.style.visibility = 'hidden';
        temp.style.fontSize = fontSize;
        temp.style.fontFamily = 'Arial';
        temp.style.padding = '0px 3px';
        temp.style.whiteSpace = 'pre';
        temp.innerText = defaultText;
        document.body.appendChild(temp);
        const width = temp.offsetWidth + 8;
        const height = temp.offsetHeight + 6;
        document.body.removeChild(temp);
        const newTextBox = createTextBox(documentArea, 120, 120, width, height, defaultText, fontSize);
        if (newTextBox && editMode) {
            $('.selected').removeClass('selected');
            $(newTextBox).addClass('selected');
            // Use setTimeout to ensure element is fully rendered before triggering selection
            setTimeout(() => $(document).trigger('selectionChanged'), 100);
        }
    });

    // Add new image frame
    addImageFrameBtn.addEventListener('click', () => {
        const currentPageContainer = document.querySelector(`[page-index="${window.currentPage}"]`);
        if (!currentPageContainer) return;
        
        const documentArea = currentPageContainer.querySelector('.document');
        if (!documentArea) return;
        const newImageFrame = createImageFrame(documentArea, 150, 150, 200, 150); // Create an empty frame
        if (newImageFrame && editMode) {
            $('.selected').removeClass('selected');
            $(newImageFrame).addClass('selected');
            // Use setTimeout to ensure element is fully rendered before triggering selection
            setTimeout(() => $(document).trigger('selectionChanged'), 100);
        }
    });

    addRectangleBtn.addEventListener('click', () => {
        const currentPageContainer = document.querySelector(`[page-index="${window.currentPage}"]`);
        if (!currentPageContainer) return;

        const documentArea = currentPageContainer.querySelector('.document');
        if (!documentArea) return;
        const newRectangle = createRectangle(documentArea, 100, 100, 250, 120); // Example dimensions
        if (newRectangle && editMode) {
            $('.selected').removeClass('selected');
            $(newRectangle).addClass('selected');
            // Use setTimeout to ensure element is fully rendered before triggering selection
            setTimeout(() => $(document).trigger('selectionChanged'), 100);
        }
    });

    // Create a new text box
    function createTextBox(documentArea, left, top, width, height, text, fontSize = '12pt') {
        if (!documentArea) return;
        
        const box = document.createElement('div');
        box.className = 'text-box'; // Keep this for existing styles/selectors
        box.style.left = left + 'px';
        box.style.top = top + 'px';
        box.style.width = width + 'px';
        box.style.height = height + 'px';
        box.setAttribute('data-element-type', 'text');

        // Wrap content in .element-content
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'element-content';
        const content = document.createElement('div');
        content.className = 'text-content';
        content.innerText = text;
        content.style.fontSize = fontSize;
        content.contentEditable = false; // Start as non-editable
        contentWrapper.appendChild(content);
        box.appendChild(contentWrapper);

        setBoxMinHeight(box, fontSize);

        // Add HTML for handles and actions
        box.innerHTML += HANDLES_HTML + ACTIONS_HTML; // Append controls structure

        documentArea.appendChild(box);
        makeElementsDraggable($(box)); // Make it draggable

        return box;
    }

    // Create a new image frame
    function createImageFrame(documentArea, left, top, width, height) {
        if (!documentArea) return;

        const frame = document.createElement('div');
        frame.className = 'image-frame';
        frame.style.left = left + 'px';
        frame.style.top = top + 'px';
        frame.style.width = width + 'px';
        frame.style.height = height + 'px';
        frame.setAttribute('data-element-type', 'image_frame');

        // Wrap content in .element-content
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'element-content';
        const placeholder = document.createElement('i');
        placeholder.className = 'fas fa-image frame-placeholder-icon';
        contentWrapper.appendChild(placeholder);
        frame.appendChild(contentWrapper);

        // Add HTML for handles and actions
        frame.insertAdjacentHTML('beforeend', HANDLES_HTML + ACTIONS_HTML);

        // Attach the setImage method directly to the frame instance
        frame.setImage = function(imageUrl) {
            let currentPlaceholder = this.querySelector('.frame-placeholder-icon');
            if (currentPlaceholder) currentPlaceholder.remove();
            let existingImg = this.querySelector('.element-content img');
            if (existingImg) existingImg.remove();
            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = "User Image";
            img.onerror = () => {
                // Re-add controls and placeholder on error if they were part of innerHTML and got wiped.
                this.innerHTML = '<div class="element-content"><p style="text-align:center; color: #777; font-size:12px;">Error loading image</p><i class="fas fa-image frame-placeholder-icon"></i></div>' + HANDLES_HTML + ACTIONS_HTML;
                this.classList.remove('has-image');
            };
            img.onload = () => {
                this.classList.add('has-image');
            };
            this.querySelector('.element-content').appendChild(img);
        }.bind(frame);

        documentArea.appendChild(frame);
        makeElementsDraggable($(frame)); // Make it draggable

        return frame;
    }

    // Create a new rectangle element
    function createRectangle(documentArea, left, top, width, height) {
        if (!documentArea) return;

        const rectElement = document.createElement('div');
        rectElement.className = 'rectangle-element';
        rectElement.style.left = left + 'px';
        rectElement.style.top = top + 'px';
        rectElement.style.width = width + 'px';
        rectElement.style.height = height + 'px';
        rectElement.setAttribute('data-element-type', 'rectangle');

        // Wrap content in .element-content
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'element-content';
        // Add a rectangle-bg for the visual rectangle
        const rectBg = document.createElement('div');
        rectBg.className = 'rectangle-bg';
        // Move all visual styles to rectBg
        rectBg.style.backgroundColor = rectElement.style.backgroundColor || 'rgba(108, 117, 125, 0.5)';
        rectBg.style.borderColor = rectElement.style.borderColor || '#6c757d';
        rectBg.style.borderWidth = rectElement.style.borderWidth || '2px';
        rectBg.style.borderRadius = rectElement.style.borderRadius || '3px';
        rectBg.style.borderStyle = rectElement.style.borderStyle || 'solid';
        rectBg.style.width = '100%';
        rectBg.style.height = '100%';
        rectBg.style.position = 'absolute';
        rectBg.style.top = '0';
        rectBg.style.left = '0';
        rectBg.style.right = '0';
        rectBg.style.bottom = '0';
        rectBg.style.boxSizing = 'border-box';
        contentWrapper.appendChild(rectBg);
        rectElement.appendChild(contentWrapper);

        // Add HTML for handles and actions
        rectElement.innerHTML += HANDLES_HTML + ACTIONS_HTML;

        documentArea.appendChild(rectElement);
        makeElementsDraggable($(rectElement)); // Make it draggable
        
        return rectElement;
    }

   

    // Generic select element function
    function selectElement(element, event) {
        const isMulti = event && (event.shiftKey || event.ctrlKey || event.metaKey);
        if (!isMulti) {
            // Deselect all others
            selectedBoxes.forEach(box => {
                box.classList.remove('selected');
                const fa = box.querySelector('.floating-actions');
                if (fa) fa.style.display = 'none';
                if (box.getAttribute('data-element-type') === 'text') {
                    const content = box.querySelector('.text-content');
                    if (content) content.contentEditable = false;
                }
            });
            selectedBoxes = [element];
        } else {
            // Toggle selection
            if (selectedBoxes.includes(element)) {
                element.classList.remove('selected');
                const fa = element.querySelector('.floating-actions');
                if (fa) fa.style.display = 'none';
                selectedBoxes = selectedBoxes.filter(box => box !== element);
            } else {
                selectedBoxes.push(element);
            }
        }
        // Mark all selected
        selectedBoxes.forEach(box => {
            box.classList.add('selected');
            const fa = box.querySelector('.floating-actions');
            if (fa && editMode) fa.style.display = 'flex';
        });
        // Show toolbar for last selected
        if (selectedBoxes.length > 0) {
            showToolbarForBox(selectedBoxes[selectedBoxes.length - 1]);
            showElementDetails(selectedBoxes[selectedBoxes.length - 1]);
        } else {
            hideToolbar();
            hideDetailsPanel();
        }
        updateMultiSelectToolbarAndOutline();
    }

    // Deselect on click outside
    $(document).on('mousedown', function(e) {
        // Only act in edit mode. In read mode, nothing should be selected/deselected by clicking.
        if (!editMode) return;

        // If the click is on an element or any of the toolbars/panels, do nothing.
        if ($(e.target).closest('.text-box, .image-frame, .rectangle-element, .group-container, .text-toolbar, .element-details-panel, #floating-action-bar').length) {
            return;
        }

        // If we are here, the click was on the "canvas" or another empty area.
        // If there is a selection, clear it.
        if ($('.selected').length > 0) {
            $('.selected').removeClass('selected');
            $(document).trigger('selectionChanged'); // This will handle hiding UI.
        }
    });


    

    // Resize logic
    function startResize(e, box, dir) {
        e.preventDefault();
        const zoom = getCurrentZoom();

        resizing = true;
        resizeDir = dir;
        startRect = {
            left: box.offsetLeft,
            top: box.offsetTop,
            width: box.offsetWidth,
            height: box.offsetHeight
        };
        startMouse = { x: e.clientX / zoom, y: e.clientY / zoom };

        function onMove(ev) {
            const mouseX = ev.clientX / zoom;
            const mouseY = ev.clientY / zoom;

            let dx = mouseX - startMouse.x;
            let dy = mouseY - startMouse.y;

            let newLeft = startRect.left;
            let newTop = startRect.top;
            let newWidth = startRect.width;
            let newHeight = startRect.height;

            if (dir.includes('e')) newWidth = Math.max(80, startRect.width + dx);
            const minHeight = 18;
            if (dir.includes('s')) newHeight = Math.max(minHeight, startRect.height + dy);
            if (dir.includes('w')) {
                newWidth = Math.max(80, startRect.width - dx);
                newLeft = startRect.left + dx;
            }
            if (dir.includes('n')) {
                newHeight = Math.max(minHeight, startRect.height - dy);
                newTop = startRect.top + dy;
            }

            const currentPageContainer = box.closest('.page-container');
            if (!currentPageContainer) return;
            const documentArea = currentPageContainer.querySelector('.document');
            if (!documentArea) return;

            const docRect = documentArea.getBoundingClientRect();
            
            newLeft = Math.max(0, Math.min(newLeft, (docRect.width / zoom) - newWidth));
            newTop = Math.max(0, Math.min(newTop, (docRect.height / zoom) - newHeight));
            
            newWidth = Math.min(newWidth, (docRect.width/zoom) - newLeft);
            newHeight = Math.min(newHeight, (docRect.height/zoom) - newTop);

            box.style.left = newLeft + 'px';
            box.style.top = newTop + 'px';
            box.style.width = newWidth + 'px';
            box.style.height = newHeight + 'px';

            if ($(box).hasClass('selected')) {
                updateDetailsPanelPosition(box);
                updateDetailsPanelDimensions(box);
                // Update group outline if multiple elements are selected
                if ($('.selected').length > 1) {
                    updateGroupOutline();
                }
            }
        }
        function onUp() {
            resizing = false;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            if ($(box).hasClass('selected')) {
                 updateDetailsPanelPosition(box);
                 updateDetailsPanelDimensions(box);
                 // Update group outline if multiple elements are selected
                 if ($('.selected').length > 1) {
                     updateGroupOutline();
                 }
            }
        }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    // Toolbar logic
    const toolbar = document.getElementById('text-toolbar');
    const fontFamily = document.getElementById('font-family');
    const fontSizeDisplay = document.getElementById('font-size-display');
    const fontSizeDecrease = document.getElementById('font-size-decrease');
    const fontSizeIncrease = document.getElementById('font-size-increase');
    const fontColor = document.getElementById('font-color');
    const boldBtn = document.getElementById('bold-btn');
    const italicBtn = document.getElementById('italic-btn');
    const underlineBtn = document.getElementById('underline-btn');
    const strikeBtn = document.getElementById('strike-btn');
    const alignLeft = document.getElementById('align-left');
    const alignCenter = document.getElementById('align-center');
    const alignRight = document.getElementById('align-right');

    // Helper: get selected text content div
    function getSelectedContent() {
        const $selected = $('.selected');
        if ($selected.length === 0) return null;

        const lastSelected = $selected.last()[0];
        if (lastSelected.getAttribute('data-element-type') !== 'text') return null;
        
        return lastSelected.querySelector('.text-content');
    }

    // Helper: rgb to hex (defined early)
    function rgbToHex(rgb) {
        if (!rgb || typeof rgb !== 'string') return '#000000'; // Default to black if invalid
        if (rgb.startsWith('#')) return rgb; // Already hex

        const result = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(rgb);
        if (!result) return '#000000'; // Default if parsing fails
        const r = parseInt(result[1]);
        const g = parseInt(result[2]);
        const b = parseInt(result[3]);
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    }

    
    
    // Helper to update corner preview icon
    function updateCornerPreview(box) {
        if (!box || box.getAttribute('data-element-type') !== 'rectangle') return;
        const cornerSlider = document.getElementById('rect-corner-slider');
        const cornerValueDisplay = document.getElementById('rect-corner-value');
        const currentRadius = parseInt(box.style.borderRadius) || 0;
        if(cornerSlider) cornerSlider.value = currentRadius;
        if(cornerValueDisplay) cornerValueDisplay.textContent = currentRadius;
    }

    // Show/hide toolbar and sync with selected box
    function showToolbarForBox(box) {
        const content = box.querySelector('.text-content');
        toolbar.style.display = 'flex';
        // Always hide all popovers first when changing selection or showing toolbar
        const rectFillPopover = document.getElementById('rect-fill-popover');
        const rectBorderStylePopover = document.getElementById('rect-border-popover');
        const rectCornerPopover = document.getElementById('rect-corner-popover');

        if (rectFillPopover) rectFillPopover.style.display = 'none';
        if (rectBorderStylePopover) rectBorderStylePopover.style.display = 'none';
        if (rectCornerPopover) rectCornerPopover.style.display = 'none';

        // Text specific (always present if toolbar shown for text)
        if (box.getAttribute('data-element-type') === 'text' && content) {
            fontFamily.value = content.style.fontFamily || 'Arial';
            fontSizeDisplay.textContent = parseInt(content.style.fontSize) || 24;
            fontColor.value = rgbToHex(content.style.color); 
            boldBtn.classList.toggle('active', content.style.fontWeight === 'bold');
            italicBtn.classList.toggle('active', content.style.fontStyle === 'italic');
            underlineBtn.classList.toggle('active', content.style.textDecoration?.includes('underline'));
            strikeBtn.classList.toggle('active', content.style.textDecoration?.includes('line-through'));
            alignLeft.classList.toggle('active', content.style.textAlign === 'left' || !content.style.textAlign);
            alignCenter.classList.toggle('active', content.style.textAlign === 'center');
            alignRight.classList.toggle('active', content.style.textAlign === 'right');
        }

        // Canva-style rectangle controls
        const rectFillBtn = document.getElementById('rect-fill-btn');
        const rectBorderBtn = document.getElementById('rect-border-btn');
        const rectCornerBtn = document.getElementById('rect-corner-btn');

        if (box.getAttribute('data-element-type') === 'rectangle') {
            if (rectFillBtn) rectFillBtn.style.display = 'flex';
            if (rectBorderBtn) rectBorderBtn.style.display = 'flex';
            if (rectCornerBtn) rectCornerBtn.style.display = 'flex';

            const fillPreview = document.getElementById('rect-fill-preview');
            const fillColorPicker = document.getElementById('rect-fill-color-picker');
            const currentFill = box.style.backgroundColor || 'rgba(0,0,0,0)'; 
            if (fillPreview) fillPreview.style.backgroundColor = currentFill;
            if (fillColorPicker) fillColorPicker.value = rgbToHex(currentFill);

            //updateBorderStylePreview(box); 

            const borderWidth = parseInt(box.style.borderWidth) || 0;
            const borderWeightSlider = document.getElementById('rect-border-weight-slider');
            const borderWeightInput = document.getElementById('rect-border-weight-input');
            if (borderWeightSlider) borderWeightSlider.value = borderWidth;
            if (borderWeightInput) borderWeightInput.value = borderWidth;
            
            const borderColorPicker = document.getElementById('rect-border-color-picker');
            if(borderColorPicker) borderColorPicker.value = rgbToHex(box.style.borderColor || '#000000');

            updateCornerPreview(box);
        } else { 
            if (rectFillBtn) rectFillBtn.style.display = 'none';
            if (rectBorderBtn) rectBorderBtn.style.display = 'none';
            if (rectCornerBtn) rectCornerBtn.style.display = 'none';
            if (rectFillPopover) rectFillPopover.style.display = 'none';
            if (rectBorderStylePopover) rectBorderStylePopover.style.display = 'none'; 
            if (rectCornerPopover) rectCornerPopover.style.display = 'none';
        }

        // Opacity control logic
        const opacityBtn = document.getElementById('opacity-btn');
        const opacityPopover = document.getElementById('opacity-popover');
        const opacitySlider = document.getElementById('opacity-slider');
        const opacityInput = document.getElementById('opacity-input');

        if (opacityBtn) opacityBtn.style.display = box ? 'flex' : 'none';
        if (box && (opacitySlider && opacityInput)) {
            let opacity = 1;
            let content = box.querySelector('.element-content');
            if (box.getAttribute('data-element-type') === 'rectangle') {
                content = content.querySelector('.rectangle-bg');
            }
            if (content && content.style.opacity !== '' && content.style.opacity !== undefined) {
                opacity = parseFloat(content.style.opacity);
                if (isNaN(opacity)) opacity = 1;
            }
            const percent = Math.round(opacity * 100);
            opacitySlider.value = percent;
            opacityInput.value = percent;
        }
        if (!box && opacityPopover) opacityPopover.style.display = 'none';
    }

    function hideToolbar() {
        toolbar.style.display = 'none';
        // Also hide any open popovers when main toolbar hides
        const rectFillPopover = document.getElementById('rect-fill-popover');
        const rectBorderStylePopover = document.getElementById('rect-border-popover');
        const rectCornerPopover = document.getElementById('rect-corner-popover');
        if (rectFillPopover) rectFillPopover.style.display = 'none';
        if (rectBorderStylePopover) rectBorderStylePopover.style.display = 'none';
        if (rectCornerPopover) rectCornerPopover.style.display = 'none';
    }

    // This block wraps showToolbarForBox to respect editMode. (Defined AFTER original and its helpers)
    const oldShowToolbarForBox = showToolbarForBox;
    showToolbarForBox = function(box) { // This is the new showToolbarForBox
        if (!editMode) { 
            hideToolbar(); 
            return; 
        }
        if (typeof oldShowToolbarForBox === 'function') {
            oldShowToolbarForBox.call(this, box); // Calls the original showToolbarForBox
        } else {
            console.error("Critical: oldShowToolbarForBox is not a function!");
            if (toolbar && box && (box.getAttribute('data-element-type') === 'text' || box.getAttribute('data-element-type') === 'rectangle')) {
                 toolbar.style.display = 'flex';
            } else if (toolbar) {
                 toolbar.style.display = 'none';
            }
        }
    };
    
    // Font family (and other text toolbar listeners follow)
    fontFamily.addEventListener('change', () => {
        const content = getSelectedContent();
        if (content) {
            content.style.fontFamily = fontFamily.value;
            content.focus();
        }
    });
    // Font size
    fontSizeDecrease.addEventListener('click', () => {
        const content = getSelectedContent();
        if (content) {
            let size = parseInt(content.style.fontSize) || 24;
            size = Math.max(8, size - 2);
            content.style.fontSize = size + 'px';
            fontSizeDisplay.textContent = size;
            setBoxMinHeight(selectedBoxes[selectedBoxes.length - 1], content.style.fontSize);
            content.focus();
        }
    });
    fontSizeIncrease.addEventListener('click', () => {
        const content = getSelectedContent();
        if (content) {
            let size = parseInt(content.style.fontSize) || 24;
            size = Math.min(200, size + 2);
            content.style.fontSize = size + 'px';
            fontSizeDisplay.textContent = size;
            setBoxMinHeight(selectedBoxes[selectedBoxes.length - 1], content.style.fontSize);
            content.focus();
        }
    });
    // Font color
    fontColor.addEventListener('input', () => {
        const content = getSelectedContent();
        if (content) {
            content.style.color = fontColor.value;
            content.focus();
        }
    });
    // Bold
    boldBtn.addEventListener('click', () => {
        const content = getSelectedContent();
        if (content) {
            content.style.fontWeight = content.style.fontWeight === 'bold' ? 'normal' : 'bold';
            boldBtn.classList.toggle('active', content.style.fontWeight === 'bold');
            content.focus();
        }
    });
    // Italic
    italicBtn.addEventListener('click', () => {
        const content = getSelectedContent();
        if (content) {
            content.style.fontStyle = content.style.fontStyle === 'italic' ? 'normal' : 'italic';
            italicBtn.classList.toggle('active', content.style.fontStyle === 'italic');
            content.focus();
        }
    });
    // Underline
    underlineBtn.addEventListener('click', () => {
        const content = getSelectedContent();
        if (content) {
            let td = content.style.textDecoration || '';
            if (td.includes('underline')) {
                td = td.replace('underline', '').replace('  ', ' ').trim();
            } else {
                td = (td + ' underline').trim();
            }
            content.style.textDecoration = td;
            underlineBtn.classList.toggle('active', td.includes('underline'));
            content.focus();
        }
    });
    // Strikethrough
    strikeBtn.addEventListener('click', () => {
        const content = getSelectedContent();
        if (content) {
            let td = content.style.textDecoration || '';
            if (td.includes('line-through')) {
                td = td.replace('line-through', '').replace('  ', ' ').trim();
            } else {
                td = (td + ' line-through').trim();
            }
            content.style.textDecoration = td;
            strikeBtn.classList.toggle('active', td.includes('line-through'));
            content.focus();
        }
    });
    // Alignment
    alignLeft.addEventListener('click', () => {
        const content = getSelectedContent();
        if (content) {
            content.style.textAlign = 'left';
            alignLeft.classList.add('active');
            alignCenter.classList.remove('active');
            alignRight.classList.remove('active');
            content.focus();
        }
    });
    alignCenter.addEventListener('click', () => {
        const content = getSelectedContent();
        if (content) {
            content.style.textAlign = 'center';
            alignLeft.classList.remove('active');
            alignCenter.classList.add('active');
            alignRight.classList.remove('active');
            content.focus();
        }
    });
    alignRight.addEventListener('click', () => {
        const content = getSelectedContent();
        if (content) {
            content.style.textAlign = 'right';
            alignLeft.classList.remove('active');
            alignCenter.classList.remove('active');
            alignRight.classList.add('active');
            content.focus();
        }
    });

    // Helper: set min-height based on font size
    function setBoxMinHeight(box, fontSize) {
        let px = 16;
        if (fontSize.endsWith('pt')) {
            px = parseFloat(fontSize) * 1.333;
        } else if (fontSize.endsWith('px')) {
            px = parseFloat(fontSize);
        }
        box.style.minHeight = (Math.round(px) + 2) + 'px';
    }

    function updateCurrentPageBasedOnCenter() {
        const pages = document.querySelectorAll('.page-container');
        let mostCenteredPage = null;
        let minDistance = Infinity;
        const viewportCenterY = window.innerHeight / 2;

        pages.forEach(page => {
            const rect = page.getBoundingClientRect();
            // Only consider pages that are at least partially in view
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                const pageCenterY = rect.top + rect.height / 2;
                const distance = Math.abs(pageCenterY - viewportCenterY);

                if (distance < minDistance) {
                    minDistance = distance;
                    mostCenteredPage = page;
                }
            }
        });

        if (mostCenteredPage) {
            const pageIndex = parseInt(mostCenteredPage.getAttribute('page-index'), 10);
            if (!isNaN(pageIndex)) {
                window.currentPage = pageIndex;
            }
        }
    }

    function setEditMode(on) {
        editMode = on;
        document.body.classList.toggle('edit-mode-active', editMode);
        const allElements = '.text-box, .image-frame, .rectangle-element';

        if (editMode) {
            updateCurrentPageBasedOnCenter(); // Set current page when entering edit mode
            editToggle.classList.add('active');
            editToggle.innerHTML = `<i class="fas fa-eye"></i> Read`;
            addToolbar.style.display = ''; // Show the main add toolbar
            $(allElements).draggable('enable');

            // If an element is selected, update its floating actions display
            const $selected = $('.selected');
            if ($selected.length) {
                const fa = $selected.last()[0].querySelector('.floating-actions');
                if (fa) fa.style.display = 'flex';
                // If the selected element is a text box, also show the text toolbar
                if ($selected.last()[0].getAttribute('data-element-type') === 'text') {
                    showToolbarForBox($selected.last()[0]);
                }
            }
        } else {
            editToggle.classList.remove('active');
            editToggle.innerHTML = `<i class="fas fa-pen"></i> Edit`;
            addToolbar.style.display = 'none'; // Hide the main add toolbar
            
            // Disable dragging
            $(allElements).draggable('disable');

            // Deselect all elements and update UI
            if ($('.selected').length > 0) {
                $('.selected').removeClass('selected');
                $(document).trigger('selectionChanged'); // This will hide all selection-based UI
            }

            document.querySelectorAll('.floating-actions').forEach(fa => fa.style.display = 'none');
            hideToolbar(); // Hide text specific toolbar
            hideDetailsPanel(); // Also hide the details panel
            // When turning off edit mode, make all text content non-editable
            document.querySelectorAll('.text-content').forEach(tc => {
                tc.contentEditable = false;
            });
        }
    }

    editToggle.addEventListener('click', () => {
        setEditMode(!editMode);
    });

    // Initialize editMode to off and hide text toolbar initially
    setEditMode(false);

    // Initialize existing elements found in the loaded HTML
    document.querySelectorAll('.text-box, .image-frame, .rectangle-element').forEach(box => {
        // Ensure basic attributes
        if (!box.id) {
            const typeClass = box.classList.contains('text-box') ? 'textbox' :
                              box.classList.contains('image-frame') ? 'imageframe' :
                              box.classList.contains('rectangle-element') ? 'rectangle' : 'element';
            box.id = `${typeClass}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        }
        if (!box.getAttribute('data-element-type')) {
            let type = 'unknown';
            if (box.classList.contains('text-box')) type = 'text';
            else if (box.classList.contains('image-frame')) type = 'image_frame';
            else if (box.classList.contains('rectangle-element')) type = 'rectangle';
            box.setAttribute('data-element-type', type);
        }

        // Ensure handles and actions HTML structure exists (for elements loaded from static HTML)
        if (!box.querySelector('.resize-handle')) { // Check if any resize handle exists
            box.insertAdjacentHTML('beforeend', HANDLES_HTML);
        }
        if (!box.querySelector('.floating-actions')) {
            box.insertAdjacentHTML('beforeend', ACTIONS_HTML);
        }
        // Ensure .no-zoom-scale class is present
        const fa = box.querySelector('.floating-actions');
        if (fa && !fa.classList.contains('no-zoom-scale')) {
            fa.classList.add('no-zoom-scale');
        }
        
        // For image frames loaded from HTML, re-attach .setImage method if needed
        if (box.getAttribute('data-element-type') === 'image_frame' && typeof box.setImage !== 'function') {
            box.setImage = function(imageUrl) {
                let currentPlaceholder = this.querySelector('.frame-placeholder-icon');
                if (currentPlaceholder) currentPlaceholder.remove();
                
                let existingImg = this.querySelector('img');
                if (existingImg) existingImg.remove();

                const img = document.createElement('img');
                img.src = imageUrl;
                img.alt = "User Image";
                img.onerror = () => {
                    // Re-create the content and controls on error
                    this.innerHTML = '<div class="element-content"><p style="text-align:center; color: #777; font-size:12px;">Error loading image</p><i class="fas fa-image frame-placeholder-icon"></i></div>' + HANDLES_HTML + ACTIONS_HTML;
                    this.classList.remove('has-image');
                };
                img.onload = () => { 
                    this.classList.add('has-image'); 
                };
                this.appendChild(img); // Append image. Controls should already be there or re-added by error handler.
            }.bind(box);
            
            // If there's an existing image src in the HTML, try to load it
            const existingImgSrc = box.querySelector('img')?.src;
            if (existingImgSrc) {
                 box.setImage(existingImgSrc);
            } else if (!box.querySelector('.frame-placeholder-icon')) {
                // Ensure placeholder exists if no image
                const placeholder = document.createElement('i');
                placeholder.className = 'fas fa-image frame-placeholder-icon';
                box.insertBefore(placeholder, box.firstChild); // Add placeholder if missing
            }
        }
        
        // Attach all event listeners
        // attachElementEventListeners(box); // THIS ENTIRE FUNCTION IS NO LONGER NEEDED AND SHOULD BE REMOVED

        // Ensure floating actions are hidden if not selected
         if (!box.classList.contains('selected')) {
             const actions = box.querySelector('.floating-actions');
             if (actions) actions.style.display = 'none';
         }
    });

    const saveHtmlBtn = document.getElementById('save-html');
    saveHtmlBtn.addEventListener('click', () => {
        const completeHtml = document.documentElement.outerHTML;

        const blob = new Blob([completeHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'document_snapshot.html';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    });

    initializePageControls(document.querySelector('.page-container'));

    function initializePageControls(pageContainer) {
        if (!pageContainer) return;

        const addPageBtn = pageContainer.querySelector('.add-page-btn');
        const deletePageBtn = pageContainer.querySelector('.delete-page-btn');
        const prevPageBtn = pageContainer.querySelector('.prev-page-btn');
        const nextPageBtn = pageContainer.querySelector('.next-page-btn');

        addPageBtn.addEventListener('click', () => addPage(pageContainer));
        deletePageBtn.addEventListener('click', () => deletePage(pageContainer));
        prevPageBtn.addEventListener('click', () => prevPage(pageContainer));
        nextPageBtn.addEventListener('click', () => nextPage(pageContainer));
    }

    function addPage(currentPageContainer) {
        const newPageIndex = document.querySelectorAll('.page-container').length;
        
        const newPageContainer = document.createElement('div');
        newPageContainer.className = 'page-container';
        newPageContainer.setAttribute('page-index', newPageIndex);
        
        const pageControls = document.createElement('div');
        pageControls.className = 'page-controls';
        
        const newPageTitle = document.createElement('span');
        newPageTitle.className = 'page-title';
        newPageTitle.textContent = `Page ${newPageIndex + 1}`;
        
        const pageNav = document.createElement('div');
        pageNav.className = 'page-navigation';
        pageNav.innerHTML = `
            <button class="prev-page-btn" title="Previous Page"><i class="fas fa-chevron-up"></i></button>
            <button class="next-page-btn" title="Next Page"><i class="fas fa-chevron-down"></i></button>
            <button class="delete-page-btn" title="Delete Page"><i class="fas fa-trash"></i></button>
            <button class="add-page-btn" title="Add Page"><i class="fas fa-plus"></i></button>
        `;
        
        const newDocument = document.createElement('div');
        newDocument.className = 'document';
        newDocument.id = `document-${newPageIndex}`;
        
        pageControls.appendChild(newPageTitle);
        pageControls.appendChild(pageNav);
        pageControls.appendChild(newDocument);
        newPageContainer.appendChild(pageControls);
        
        const documentPages = document.querySelector('.document-pages');
        documentPages.appendChild(newPageContainer);
        
        initializePageControls(newPageContainer);
        
        window.currentPage = newPageIndex;
        
        newPageContainer.scrollIntoView({ behavior: 'smooth' });
    }

    function deletePage(pageContainer) {
        if (!pageContainer) return;
        
        const totalPages = document.querySelectorAll('.page-container').length;
        if (totalPages <= 1) {
            alert('Cannot delete the last page');
            return;
        }
        
        pageContainer.remove();
        
        document.querySelectorAll('.page-container').forEach((container, index) => {
            container.setAttribute('page-index', index);
            const title = container.querySelector('.page-title');
            if (title) {
                title.textContent = `Page ${index + 1}`;
            }
        });
    }

    function prevPage(pageContainer) {
        const prevPage = pageContainer.previousElementSibling;
        if (prevPage) {
            pageContainer.parentNode.insertBefore(pageContainer, prevPage);
            
            updatePageNumbers();
            
            pageContainer.scrollIntoView({ behavior: 'smooth' });
        }
    }

    function nextPage(pageContainer) {
        const nextPage = pageContainer.nextElementSibling;
        if (nextPage) {
            pageContainer.parentNode.insertBefore(nextPage, pageContainer);
            
            updatePageNumbers();
            
            pageContainer.scrollIntoView({ behavior: 'smooth' });
        }
    }

    function updatePageNumbers() {
        const pages = document.querySelectorAll('.page-container');
        pages.forEach((container, index) => {
            container.setAttribute('page-index', index);
            
            const title = container.querySelector('.page-title');
            if (title) {
                title.textContent = `Page ${index + 1}`;
            }
            
            const doc = container.querySelector('.document');
            if (doc) {
                doc.id = `document-${index}`;
            }
        });
    }

    document.addEventListener('scroll', () => {
        updateCurrentPageBasedOnCenter();
    });

    const zoomSlider = document.getElementById('zoom-slider');
    const zoomPercentage = document.getElementById('zoom-percentage');
    const documentPages = document.querySelector('.document-pages');

    // Zoom debounce timer for action bar
    let zoomTimeout = null;

    if (zoomSlider && zoomPercentage && documentPages) {
        zoomSlider.addEventListener('input', () => {
            const zoom = zoomSlider.value;
            zoomPercentage.textContent = `${zoom}%`;
            documentPages.style.transform = `scale(${zoom / 100})`;
            documentPages.style.transformOrigin = 'top center';

            // Hide action bar during zoom
            hideActionBar();

            // Clear existing timeout
            if (zoomTimeout) {
                clearTimeout(zoomTimeout);
            }

            // Show action bar after zoom stops (debounced)
            zoomTimeout = setTimeout(() => {
                if ($('.selected').length > 0 && editMode) {
                    showActionBar();
                }
            }, 150); // 150ms delay after zoom stops
        });
    }

    document.addEventListener('wheel', function(e) {
        if (e.ctrlKey && zoomSlider) {
            e.preventDefault();
            let zoom = parseInt(zoomSlider.value, 10);
            if (e.deltaY < 0) {
                zoom = Math.min(zoom + 5, parseInt(zoomSlider.max, 10));
            } else {
                zoom = Math.max(zoom - 5, parseInt(zoomSlider.min, 10));
            }
            zoomSlider.value = zoom;
            zoomPercentage.textContent = `${zoom}%`;
            documentPages.style.transform = `scale(${zoom / 100})`;
            documentPages.style.transformOrigin = 'top center';

            // Hide action bar during wheel zoom
            hideActionBar();

            // Clear existing timeout
            if (zoomTimeout) {
                clearTimeout(zoomTimeout);
            }

            // Show action bar after zoom stops (debounced)
            zoomTimeout = setTimeout(() => {
                if ($('.selected').length > 0 && editMode) {
                    showActionBar();
                }
            }, 150); // 150ms delay after zoom stops
        }
    }, { passive: false });

    function getCurrentZoom() {
        const zoomSlider = document.getElementById('zoom-slider');
        return zoomSlider ? parseInt(zoomSlider.value, 10) / 100 : 1;
    }

    const savePdfBtn = document.getElementById('save-pdf');
    if (savePdfBtn) {
        savePdfBtn.addEventListener('click', async () => {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageContainers = document.querySelectorAll('.page-container');
            const originalZoom = getCurrentZoom();
            const documentPagesContainer = document.querySelector('.document-pages');

            if (documentPagesContainer) {
                documentPagesContainer.style.transform = 'scale(1)';
            }

            for (let i = 0; i < pageContainers.length; i++) {
                const pageContainer = pageContainers[i];
                const documentArea = pageContainer.querySelector('.document');

                if (documentArea) {
                    const selected = documentArea.querySelector('.text-box.selected');
                    const floatingActions = selected ? selected.querySelector('.floating-actions') : null;
                    const resizeHandles = selected ? selected.querySelectorAll('.resize-handle') : null;

                    if (floatingActions) floatingActions.style.display = 'none';
                    if (resizeHandles) resizeHandles.forEach(h => h.style.opacity = '0');
                    if (selected) selected.classList.remove('selected');

                    const canvas = await html2canvas(documentArea, {
                        scale: 2,
                        useCORS: true,
                        logging: false,
                        onclone: (clonedDoc) => {
                            Array.from(clonedDoc.querySelectorAll('.text-content')).forEach(tc => {
                                tc.style.webkitFontSmoothing = 'antialiased';
                                tc.style.fontKerning = 'normal';
                            });
                        }
                    });

                    if (floatingActions) floatingActions.style.display = '';
                    if (resizeHandles) resizeHandles.forEach(h => h.style.opacity = '');
                    if (selected) selected.classList.add('selected');

                    const imgData = canvas.toDataURL('image/jpeg', 0.8);
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = pdf.internal.pageSize.getHeight();
                    
                    const imgProps = pdf.getImageProperties(imgData);
                    const aspectRatio = imgProps.width / imgProps.height;
                    
                    let imgWidth = pdfWidth;
                    let imgHeight = pdfWidth / aspectRatio;

                    if (imgHeight > pdfHeight) {
                        imgHeight = pdfHeight;
                        imgWidth = pdfHeight * aspectRatio;
                    }

                    const x = (pdfWidth - imgWidth) / 2;
                    const y = (pdfHeight - imgHeight) / 2;

                    if (i > 0) {
                        pdf.addPage();
                    }
                    pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight);
                }
            }

            pdf.save('document.pdf');

            if (documentPagesContainer) {
                documentPagesContainer.style.transform = `scale(${originalZoom})`;
            }
        });
    }

    function showElementDetails(element) {
        if (!element || !detailsPanel) {
            hideDetailsPanel();
            return;
        }
        isUpdatingFromPanel = true;

        // Always show main fields
        if (!element.id) {
            // Generate a unique ID if missing
            const type = element.getAttribute('data-element-type') || 'element';
            element.id = type + '-' + Date.now() + Math.random().toString(36).substr(2, 5);
        }
        detailId.value = element.id;
        detailX.value = Math.round(element.offsetLeft);
        detailY.value = Math.round(element.offsetTop);
        detailWidth.value = Math.round(element.offsetWidth);
        detailHeight.value = Math.round(element.offsetHeight);

        // Hide all type-specific groups by default
        if (textPropsGroup) textPropsGroup.style.display = 'none';
        if (imagePropsGroup) imagePropsGroup.style.display = 'none';

        // Show type-specific fields if present
        const type = element.getAttribute('data-element-type');
        if (type === 'text') {
            if (textPropsGroup) textPropsGroup.style.display = 'block';
            const content = element.querySelector('.text-content');
            detailText.value = content ? content.innerText : '';
        } else if (type === 'image_frame') {
            if (imagePropsGroup) imagePropsGroup.style.display = 'block';
            const img = element.querySelector('img');
            detailImageSrc.value = img ? img.src : '';
        }
        // For rectangles or unknown types, just show the main fields

        detailsPanel.style.display = 'flex';
        isUpdatingFromPanel = false;
    }

    function hideDetailsPanel() {
        if (detailsPanel) detailsPanel.style.display = 'none';
        if (textPropsGroup) textPropsGroup.style.display = 'none';
        if (imagePropsGroup) imagePropsGroup.style.display = 'none';
    }
    
    function updateDetailsPanelPosition(box) {
        if (!box || !detailsPanel || detailsPanel.style.display === 'none') return;
        isUpdatingFromPanel = true;
        detailX.value = Math.round(box.offsetLeft);
        detailY.value = Math.round(box.offsetTop);
        isUpdatingFromPanel = false;
    }

    function updateDetailsPanelDimensions(box) {
        if (!box || !detailsPanel || detailsPanel.style.display === 'none') return;
        isUpdatingFromPanel = true;
        detailWidth.value = Math.round(box.offsetWidth);
        detailHeight.value = Math.round(box.offsetHeight);
        isUpdatingFromPanel = false;
    }

    if (detailsPanel) {
        detailId.addEventListener('input', () => {
            const $selected = $('.selected');
            if ($selected.length && !isUpdatingFromPanel) {
                const newId = detailId.value.trim();
                const currentId = $selected.last()[0].id;

                if (!newId) {
                    alert("ID cannot be empty. Reverting to the previous ID.");
                    detailId.value = currentId;
                    return;
                }

                if (newId === currentId) {
                    return;
                }

                const existingElementWithNewId = document.getElementById(newId);
                if (existingElementWithNewId) {
                    alert(`ID '${newId}' is already in use by another element. Please choose a different ID.`);
                    detailId.value = currentId;
                } else {
                    $selected.last()[0].id = newId;
                }
            }
        });
        detailText.addEventListener('input', () => {
            const $selected = $('.selected');
            if ($selected.length && $selected.last()[0].getAttribute('data-element-type') === 'text' && !isUpdatingFromPanel) {
                const content = $selected.last()[0].querySelector('.text-content');
                if (content) content.innerText = detailText.value;
            }
        });
        detailImageSrc.addEventListener('input', () => {
            const $selected = $('.selected');
            if ($selected.length && $selected.last()[0].getAttribute('data-element-type') === 'image_frame' && !isUpdatingFromPanel) {
                if ($selected.last()[0].setImage) {
                    $selected.last()[0].setImage(detailImageSrc.value); 
                }
            }
        });
        detailX.addEventListener('input', () => {
            const $selected = $('.selected');
            if ($selected.length && !isUpdatingFromPanel) {
                $selected.last()[0].style.left = detailX.value + 'px';
            }
        });
        detailY.addEventListener('input', () => {
            const $selected = $('.selected');
            if ($selected.length && !isUpdatingFromPanel) {
                $selected.last()[0].style.top = detailY.value + 'px';
            }
        });
        detailWidth.addEventListener('input', () => {
            const $selected = $('.selected');
            if ($selected.length && !isUpdatingFromPanel) {
                $selected.last()[0].style.width = detailWidth.value + 'px';
            }
        });
        detailHeight.addEventListener('input', () => {
            const $selected = $('.selected');
            if ($selected.length && !isUpdatingFromPanel) {
                $selected.last()[0].style.height = detailHeight.value + 'px';
            }
        });
    }

    // Event listener for the hidden file input
    if (imageFileInput) {
        imageFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            const frameForThisUpload = currentFrameToUpdate; // Capture the frame for this specific upload event

            if (file && frameForThisUpload) { // Use the captured frame
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (frameForThisUpload.setImage) {
                        frameForThisUpload.setImage(e.target.result);
                    }
                };
                reader.readAsDataURL(file);
            }
            imageFileInput.value = null;
            currentFrameToUpdate = null; 
        });
    }

    // Rectangle toolbar controls - Get all elements first
    const rectFillBtn = document.getElementById('rect-fill-btn');
    const rectFillPopover = document.getElementById('rect-fill-popover');
    const rectFillColorPicker = document.getElementById('rect-fill-color-picker');

    const rectBorderBtn = document.getElementById('rect-border-btn');
    const rectBorderStylePopover = document.getElementById('rect-border-popover'); // Correct ID for border popover
    const rectBorderColorPicker = document.getElementById('rect-border-color-picker');
    const borderWeightSlider = document.getElementById('rect-border-weight-slider');
    const borderWeightInput = document.getElementById('rect-border-weight-input');
    // Ensure all border style option buttons are handled (listener already exists for them)

    const rectCornerBtn = document.getElementById('rect-corner-btn');
    const rectCornerPopover = document.getElementById('rect-corner-popover');
    const cornerSlider = document.getElementById('rect-corner-slider');
    const cornerValueDisplay = document.getElementById('rect-corner-value');

    // Helper function to position popovers
    function positionPopoverUnderButton(popover, button) {
        if (!popover || !button) return;

        const toolbar = document.getElementById('text-toolbar');
        if (!toolbar) return;

        // Temporarily show to measure, but keep invisible
        popover.style.visibility = 'hidden';
        popover.style.display = 'block';

        let popoverLeft = button.offsetLeft + (button.offsetWidth / 2) - (popover.offsetWidth / 2);

        // Constrain to toolbar bounds
        popoverLeft = Math.max(0, popoverLeft); // Don't go off left edge of toolbar
        // If popover is wider than toolbar, center it within the toolbar
        if (popover.offsetWidth > toolbar.offsetWidth) {
            popoverLeft = (toolbar.offsetWidth - popover.offsetWidth) / 2;
        } else if (popoverLeft + popover.offsetWidth > toolbar.offsetWidth) { // Don't go off right edge of toolbar
            popoverLeft = toolbar.offsetWidth - popover.offsetWidth;
        }
        popoverLeft = Math.max(0, popoverLeft); // Final check for left bound

        popover.style.left = popoverLeft + 'px';
        // popover.style.top = '44px'; // Use existing CSS for top positioning relative to toolbar
        popover.style.visibility = 'visible'; // Make it visible now
    }

    // Helper function to toggle popovers
    function toggleShapePopover(popover, button) {
        if (!popover || !button) return;
        const currentlyVisible = popover.style.display === 'block';
        
        hideAllShapePopovers(); // Hide all others, or current if it was the one clicked and is now to be hidden

        if (!currentlyVisible) { // If it was hidden (or a different one was open), now show and position it
            positionPopoverUnderButton(popover, button);
        } 
        // If 'popover' was the one visible, hideAllShapePopovers already hid it.
    }

    // Popover Management - Update onclick handlers
    if (rectFillBtn && rectFillPopover) {
        rectFillBtn.onclick = function(e) {
            e.stopPropagation();
            toggleShapePopover(rectFillPopover, this);
        };
    }
    if (rectBorderBtn && rectBorderStylePopover) {
        rectBorderBtn.onclick = function(e) {
            e.stopPropagation();
            toggleShapePopover(rectBorderStylePopover, this);
        };
    }
    if (rectCornerBtn && rectCornerPopover) {
        rectCornerBtn.onclick = function(e) {
            e.stopPropagation();
            toggleShapePopover(rectCornerPopover, this);
        };
    }

    document.addEventListener('mousedown', (e) => {
        if (rectFillPopover && rectFillPopover.style.display === 'block' && !rectFillPopover.contains(e.target) && e.target !== rectFillBtn) {
            rectFillPopover.style.display = 'none';
        }
        if (rectBorderStylePopover && rectBorderStylePopover.style.display === 'block' && !rectBorderStylePopover.contains(e.target) && e.target !== rectBorderBtn) {
            rectBorderStylePopover.style.display = 'none';
        }
        if (rectCornerPopover && rectCornerPopover.style.display === 'block' && !rectCornerPopover.contains(e.target) && e.target !== rectCornerBtn) {
            rectCornerPopover.style.display = 'none';
        }
    });

    function hideAllShapePopovers() {
        if (rectFillPopover) rectFillPopover.style.display = 'none';
        if (rectBorderStylePopover) rectBorderStylePopover.style.display = 'none';
        if (rectCornerPopover) rectCornerPopover.style.display = 'none'; // Ensure corner popover is hidden
    }

    // Event Listeners for controls within popovers
    // Fill color picker
    if (rectFillColorPicker) {
        rectFillColorPicker.addEventListener('input', () => {
            const $selected = $('.selected');
            if ($selected.length && $selected.last()[0].getAttribute('data-element-type') === 'rectangle') {
                $selected.last()[0].style.backgroundColor = rectFillColorPicker.value;
                const fillPreview = document.getElementById('rect-fill-preview');
                if (fillPreview) fillPreview.style.backgroundColor = rectFillColorPicker.value;
            }
        });
    }

    // Border style selection
    document.querySelectorAll('#rect-border-popover .border-style-options button').forEach(btn => {
        btn.onclick = () => {
            const $selected = $('.selected');
            if ($selected.length && $selected.last()[0].getAttribute('data-element-type') === 'rectangle') {
                const selectedEl = $selected.last()[0];
                selectedEl.style.borderStyle = btn.getAttribute('data-style') === 'none' ? 'none' : btn.getAttribute('data-style');
                if (btn.getAttribute('data-style') === 'none') {
                    selectedEl.style.borderWidth = '0px';
                } else if (!selectedEl.style.borderWidth || selectedEl.style.borderWidth === '0px' || selectedEl.style.borderWidth === '0'){
                    selectedEl.style.borderWidth = '2px';
                }
                updateBorderStylePreview(selectedEl);
            }
        };
    });

    // Border color picker
    if (rectBorderColorPicker) {
        rectBorderColorPicker.addEventListener('input', () => {
            const $selected = $('.selected');
            if ($selected.length && $selected.last()[0].getAttribute('data-element-type') === 'rectangle') {
                $selected.last()[0].style.borderColor = rectBorderColorPicker.value;
                updateBorderStylePreview($selected.last()[0]);
            }
        });
    }

    // Border weight slider and input
    if (borderWeightSlider && borderWeightInput) {
        borderWeightSlider.addEventListener('input', () => {
            const $selected = $('.selected');
            if ($selected.length && $selected.last()[0].getAttribute('data-element-type') === 'rectangle') {
                const selectedEl = $selected.last()[0];
                const newWeight = borderWeightSlider.value;
                selectedEl.style.borderWidth = newWeight + 'px';
                borderWeightInput.value = newWeight;
                if (parseInt(newWeight) > 0 && (selectedEl.style.borderStyle === 'none' || !selectedEl.style.borderStyle)) {
                    selectedEl.style.borderStyle = 'solid';
                } else if (parseInt(newWeight) === 0) {
                    selectedEl.style.borderStyle = 'none';
                }
                updateBorderStylePreview(selectedEl);
            }
        });
        borderWeightInput.addEventListener('input', () => {
            const $selected = $('.selected');
            if ($selected.length && $selected.last()[0].getAttribute('data-element-type') === 'rectangle') {
                const selectedEl = $selected.last()[0];
                let newWeight = parseInt(borderWeightInput.value);
                if (isNaN(newWeight)) newWeight = 0;
                newWeight = Math.max(0, Math.min(20, newWeight));
                borderWeightInput.value = newWeight;
                selectedEl.style.borderWidth = newWeight + 'px';
                borderWeightSlider.value = newWeight;
                if (newWeight > 0 && (selectedEl.style.borderStyle === 'none' || !selectedEl.style.borderStyle)) {
                    selectedEl.style.borderStyle = 'solid';
                } else if (newWeight === 0) {
                    selectedEl.style.borderStyle = 'none';
                }
                updateBorderStylePreview(selectedEl);
            }
        });
    }

    // Corner rounding slider
    if (cornerSlider && cornerValueDisplay) {
        cornerSlider.addEventListener('input', () => {
            const $selected = $('.selected');
            if ($selected.length && $selected.last()[0].getAttribute('data-element-type') === 'rectangle') {
                $selected.last()[0].style.borderRadius = cornerSlider.value + 'px';
                cornerValueDisplay.textContent = cornerSlider.value;
                updateCornerPreview($selected.last()[0]);
            }
        });
    }

    // Keyboard delete for selected elements
    document.addEventListener('keydown', (e) => {
        if (!editMode || $('.selected').length === 0) return; // Only in edit mode and if an element is selected

        // Check if the event target is an input, textarea, or contentEditable element
        const targetTagName = e.target.tagName.toLowerCase();
        const isTargetInput = targetTagName === 'input' || targetTagName === 'textarea' || e.target.isContentEditable;

        if (isTargetInput) return; // Don't delete if user is typing in an input/text area

        if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault(); // Prevent default browser action (e.g., back navigation for Backspace)
            deleteSelectedElements();
        }
    });

    // Opacity control logic
    const opacityBtn = document.getElementById('opacity-btn');
    const opacityPopover = document.getElementById('opacity-popover');
    const opacitySlider = document.getElementById('opacity-slider');
    const opacityInput = document.getElementById('opacity-input');

    // Popover Management - Add opacity button
    if (opacityBtn && opacityPopover) {
        opacityBtn.onclick = function(e) {
            e.stopPropagation();
            toggleShapePopover(opacityPopover, this);
        };
    }

    // Opacity slider/input listeners
    if (opacitySlider && opacityInput) {
        opacitySlider.addEventListener('input', () => {
            $('.selected').each(function() {
                const box = this;
                let content = box.querySelector('.element-content');
                if (box.getAttribute('data-element-type') === 'rectangle') {
                    content = content.querySelector('.rectangle-bg');
                }
                if (content) content.style.opacity = (parseInt(opacitySlider.value) / 100).toString();
            });
            opacityInput.value = opacitySlider.value;
        });
        opacityInput.addEventListener('input', () => {
            let value = parseInt(opacityInput.value);
            if (isNaN(value)) value = 100;
            value = Math.max(0, Math.min(100, value));
            opacityInput.value = value;
            $('.selected').each(function() {
                const box = this;
                let content = box.querySelector('.element-content');
                if (box.getAttribute('data-element-type') === 'rectangle') {
                    content = content.querySelector('.rectangle-bg');
                }
                if (content) content.style.opacity = (value / 100).toString();
            });
            opacitySlider.value = value;
        });
    }

    // Hide opacity popover on outside click
    document.addEventListener('mousedown', (e) => {
        if (opacityPopover && opacityPopover.style.display === 'block' && !opacityPopover.contains(e.target) && e.target !== opacityBtn) {
            opacityPopover.style.display = 'none';
        }
    });

    // --- jQuery Universal Selection, Lasso, and Movement ---

    let dragStart = null;
    let dragPositions = null;

    // Selection by click with group support
    $(document).on('mousedown', '.text-box, .image-frame, .rectangle-element', function(e) {
        if (!editMode) return;
        // Do not interfere if clicking on handles, buttons, or an element already being dragged by UI, or if the target is contenteditable.
        if ($(e.target).closest('.resize-handle, .floating-action-btn, .ui-draggable-dragging').length || e.target.isContentEditable) {
            return;
        }

        const $this = $(this);
        const isMultiSelect = e.shiftKey || e.ctrlKey || e.metaKey;
        
        // Store current selection state for comparison
        const currentSelected = $('.selected').get();
        
        if (isMultiSelect) {
            // Multi-select: Toggle selection of the clicked element and its group
            const groupMembers = getGroupMembers(this);
            const allGroupSelected = groupMembers.every(member => $(member).hasClass('selected'));
            
            if (allGroupSelected) {
                // If all group members are selected, deselect them
                $(groupMembers).removeClass('selected');
            } else {
                // Otherwise, select all group members
                $(groupMembers).addClass('selected');
            }
        } else {
            // Single select: Check if element is part of a group and select accordingly
            const groupMembers = getGroupMembers(this);
            const anyGroupSelected = groupMembers.some(member => $(member).hasClass('selected'));
            
            if (!anyGroupSelected) {
                // No group members selected, select the group/element
                $('.selected').removeClass('selected');
                $(groupMembers).addClass('selected');
            }
            // If group is already selected, don't change selection (allows dragging)
        }
        
        // Check if selection actually changed
        const newSelected = $('.selected').get();
        const selectionChanged = currentSelected.length !== newSelected.length || 
                               !currentSelected.every(el => newSelected.includes(el));
        
        if (selectionChanged) {
            $(document).trigger('selectionChanged');
        }
        
        // Clear previouslySelected flag for elements not currently part of the interaction
        $('.text-box, .image-frame, .rectangle-element').not($this).removeData('previouslySelected');
        
        // DO NOT call e.preventDefault() here. Let jQuery UI Draggable decide.
    });

    // --- jQuery Lasso (Marquee) Selection ---
    let lassoStart = null;
    let $lassoBox = $('#marquee-selection');
    if ($lassoBox.length === 0) {
        $lassoBox = $('<div id="marquee-selection"></div>').appendTo('body');
    }
    $lassoBox.hide();

    $(document).on('mousedown', '.document', function(e) {
        if (!editMode) return;
        if ($(e.target).closest('.text-box, .image-frame, .rectangle-element, .group-container').length) return;
        lassoStart = { x: e.pageX, y: e.pageY };
        $lassoBox.css({
            left: lassoStart.x,
            top: lassoStart.y,
            width: 0,
            height: 0,
            display: 'block'
        });
        $(document).on('mousemove.lasso', function(ev) {
            let x1 = Math.min(lassoStart.x, ev.pageX);
            let y1 = Math.min(lassoStart.y, ev.pageY);
            let x2 = Math.max(lassoStart.x, ev.pageX);
            let y2 = Math.max(lassoStart.y, ev.pageY);
            $lassoBox.css({
                left: x1,
                top: y1,
                width: x2 - x1,
                height: y2 - y1
            });
        });
        $(document).on('mouseup.lasso', function(ev) {
            $lassoBox.hide();
            $(document).off('.lasso');
            let x1 = Math.min(lassoStart.x, ev.pageX);
            let y1 = Math.min(lassoStart.y, ev.pageY);
            let x2 = Math.max(lassoStart.x, ev.pageX);
            let y2 = Math.max(lassoStart.y, ev.pageY);
            let isMulti = ev.shiftKey || ev.ctrlKey || ev.metaKey;
            if (!isMulti) $('.selected').removeClass('selected');
            
            let selectionChanged = false;
            $('.text-box, .image-frame, .rectangle-element').each(function() {
                let $el = $(this);
                let offset = $el.offset();
                let w = $el.outerWidth();
                let h = $el.outerHeight();
                if (offset.left + w > x1 && offset.left < x2 && offset.top + h > y1 && offset.top < y2) {
                    if (!$el.hasClass('selected')) {
                        selectionChanged = true;
                    }
                    $el.addClass('selected');
                }
            });
            
            // Always trigger selectionChanged after lasso to ensure action bar appears
            if (selectionChanged || $('.selected').length > 0) {
                $(document).trigger('selectionChanged');
            }
            
            lassoStart = null;
        });
        e.preventDefault();
    });

    // Multi-select toolbar logic
    const multiSelectToolbar = document.getElementById('multi-select-toolbar');
    const groupSelectionOutline = document.getElementById('group-selection-outline');

    // New function dedicated to positioning the group UI elements
    function updateGroupOutlineAndToolbarPosition() {
        const $selected = $('.selected');
        if ($selected.length <= 1 || !editMode) return; // Only act if multiple items are selected and in edit mode

        if (!multiSelectToolbar || !groupSelectionOutline) return;
        const innerFloatingActions = multiSelectToolbar.querySelector('.floating-actions');
        if (!innerFloatingActions) return;

        const zoom = getCurrentZoom();
        const activeDocument = $selected.first().closest('.document')[0];
        if (!activeDocument) return;
        const docAreaRect_viewport = activeDocument.getBoundingClientRect();

        const elementRects_relativeToDoc = $selected.map(function() {
            const elRect_viewport = this.getBoundingClientRect();
            return {
                left: (elRect_viewport.left - docAreaRect_viewport.left) / zoom,
                top: (elRect_viewport.top - docAreaRect_viewport.top) / zoom,
                right: (elRect_viewport.right - docAreaRect_viewport.left) / zoom,
                bottom: (elRect_viewport.bottom - docAreaRect_viewport.top) / zoom,
                width: elRect_viewport.width / zoom,
                height: elRect_viewport.height / zoom
            };
        }).get();

        if (elementRects_relativeToDoc.length === 0) return;

        const minX_relToDoc = Math.min(...elementRects_relativeToDoc.map(r => r.left));
        const minY_relToDoc = Math.min(...elementRects_relativeToDoc.map(r => r.top));
        const maxX_relToDoc = Math.max(...elementRects_relativeToDoc.map(r => r.right));
        const maxY_relToDoc = Math.max(...elementRects_relativeToDoc.map(r => r.bottom));

        if (groupSelectionOutline.parentElement !== activeDocument) {
            activeDocument.appendChild(groupSelectionOutline);
        }
        groupSelectionOutline.style.left = minX_relToDoc + 'px';
        groupSelectionOutline.style.top = minY_relToDoc + 'px';
        groupSelectionOutline.style.width = (maxX_relToDoc - minX_relToDoc) + 'px';
        groupSelectionOutline.style.height = (maxY_relToDoc - minY_relToDoc) + 'px';
        // console.log("Group outline repositioned to:", groupSelectionOutline.style.left, groupSelectionOutline.style.top);

        // Position Toolbar (based on viewport coordinates of the group)
        const toolbarWidth = multiSelectToolbar.offsetWidth;
        const groupMinLeft_viewport = Math.min(...$selected.map(function() { return this.getBoundingClientRect().left; }).get());
        const groupMaxRight_viewport = Math.max(...$selected.map(function() { return this.getBoundingClientRect().right; }).get());
        const groupMinTop_viewport = Math.min(...$selected.map(function() { return this.getBoundingClientRect().top; }).get());

        multiSelectToolbar.style.left = (groupMinLeft_viewport + (groupMaxRight_viewport - groupMinLeft_viewport) / 2 - toolbarWidth / 2 + window.scrollX) + 'px';
        multiSelectToolbar.style.top = (groupMinTop_viewport - 48 + window.scrollY) + 'px';
        // console.log("Multi-select toolbar repositioned to:", multiSelectToolbar.style.left, multiSelectToolbar.style.top);
    }

    function updateMultiSelectToolbarAndOutline() {
        // console.log("updateMultiSelectToolbarAndOutline called. Edit Mode:", editMode);
        if (!multiSelectToolbar || !groupSelectionOutline) {
            // console.error("Multi-select toolbar or group outline element not found!");
            return;
        }
        const innerFloatingActions = multiSelectToolbar.querySelector('.floating-actions');
        if (!innerFloatingActions) {
            // console.error("Inner floating actions for multi-select toolbar not found!");
            return;
        }

        const $selected = $('.selected'); // Use jQuery to get selected elements
        const selectedCount = $selected.length;
        // console.log("Selected count:", selectedCount);

        // First, hide all individual floating actions by default
        $('.text-box, .image-frame, .rectangle-element, .group-container').find('.floating-actions').hide();

        if (selectedCount > 1 && editMode) {
            // console.log("Multiple items selected in edit mode - attempting to show group UI.");
            groupSelectionOutline.style.display = 'block';
            multiSelectToolbar.style.display = 'block'; // This might be overridden by dragging-active CSS
            innerFloatingActions.style.display = 'flex';
            updateGroupOutlineAndToolbarPosition(); // Call the new function to set positions
            // console.log("Group outline displayed at:", groupSelectionOutline.style.left, groupSelectionOutline.style.top, groupSelectionOutline.style.width, groupSelectionOutline.style.height);
            // console.log("Multi-select toolbar positioned at:", multiSelectToolbar.style.left, multiSelectToolbar.style.top);
        } else if (selectedCount === 1 && editMode) {
            // console.log("Single item selected in edit mode.");
            multiSelectToolbar.style.display = 'none';
            innerFloatingActions.style.display = 'none';
            groupSelectionOutline.style.display = 'none';
            
            const singleSelectedBox = $selected[0]; // Get the single selected DOM element
            $(singleSelectedBox).find('.floating-actions').first().css('display', 'flex'); // Show its floating actions
        } else {
            multiSelectToolbar.style.display = 'none';
            innerFloatingActions.style.display = 'none';
            groupSelectionOutline.style.display = 'none';
        }
    }

    // Actions for multi-select toolbar
    if (multiSelectToolbar) {
        // Prevent clicks on the toolbar from deselecting elements
        multiSelectToolbar.addEventListener('mousedown', function(e) {
            e.stopPropagation();
        });

        // DELETE BUTTON
        multiSelectToolbar.querySelector('.delete-btn').onclick = function(e) {
            e.stopPropagation();
            deleteSelectedElements();
        };

        // COPY BUTTON
        multiSelectToolbar.querySelector('.copy-btn').onclick = function(e) {
            e.stopPropagation();
            copySelectedElements();
        };

        // GROUP button: wrap selectedBoxes in a container
        multiSelectToolbar.querySelector('.group-btn').onclick = e => {
            e.stopPropagation();
            const $selected = $('.selected'); 
            if (!editMode || $selected.length < 2) return;

            const group = document.createElement('div');
            group.className = 'group-container';
            group.setAttribute('data-element-type', 'group');

            const activeDoc = $selected.first().closest('.document')[0]; 
            if (!activeDoc) return;

            const zoom = getCurrentZoom();
            const docViewRect = activeDoc.getBoundingClientRect();

            let minX_relToDoc = Infinity;
            let minY_relToDoc = Infinity;
            let maxX_relToDoc = -Infinity;
            let maxY_relToDoc = -Infinity;

            $selected.each(function() { // MODIFIED
                const el = this; // MODIFIED
                const elRect_viewport = el.getBoundingClientRect();
                minX_relToDoc = Math.min(minX_relToDoc, (elRect_viewport.left - docViewRect.left) / zoom + el.offsetLeft);
                minY_relToDoc = Math.min(minY_relToDoc, (elRect_viewport.top - docViewRect.top) / zoom + el.offsetTop);
                maxX_relToDoc = Math.max(maxX_relToDoc, (elRect_viewport.left - docViewRect.left) / zoom + el.offsetLeft + el.offsetWidth);
                maxY_relToDoc = Math.max(maxY_relToDoc, (elRect_viewport.top - docViewRect.top) / zoom + el.offsetTop + el.offsetHeight);
            });
            
            const groupRects = $selected.map(function() { // MODIFIED
                const el = this; // MODIFIED
                return { 
                    left: el.offsetLeft, 
                    top: el.offsetTop, 
                    right: el.offsetLeft + el.offsetWidth, 
                    bottom: el.offsetTop + el.offsetHeight 
                };
            }).get(); 

            const groupMinLeft = Math.min(...groupRects.map(r => r.left));
            const groupMinTop = Math.min(...groupRects.map(r => r.top));
            const groupMaxRight = Math.max(...groupRects.map(r => r.right));
            const groupMaxBottom = Math.max(...groupRects.map(r => r.bottom));

            group.style.position = 'absolute';
            group.style.left = groupMinLeft + 'px';
            group.style.top = groupMinTop + 'px';
            group.style.width = (groupMaxRight - groupMinLeft) + 'px';
            group.style.height = (groupMaxBottom - groupMinTop) + 'px';
            group.style.border = '1px dotted green'; 

            const originalChildren = $selected.get(); // MODIFIED

            originalChildren.forEach(el => {
                el.style.left = (el.offsetLeft - groupMinLeft) + 'px';
                el.style.top = (el.offsetTop - groupMinTop) + 'px';
                group.appendChild(el);
                el.classList.remove('selected'); 
            });

            activeDoc.appendChild(group);
            makeElementsDraggable($(group)); 

            $('.selected').removeClass('selected'); 
            $(group).addClass('selected'); 
            
            $(document).trigger('selectionChanged');
        };

        // LOCK button: toggle a 'locked' class
        multiSelectToolbar.querySelector('.lock-btn').onclick = e => {
            e.stopPropagation();
            $('.selected').each(function() { 
                const el = this;
                el.classList.toggle('locked');
                const lockIcon = multiSelectToolbar.querySelector('.lock-btn i');
                if (lockIcon) {
                    lockIcon.className = el.classList.contains('locked') ? 'fas fa-lock' : 'fas fa-unlock';
                }
            });
        };

        // MORE button: placeholder for future options
        multiSelectToolbar.querySelector('.more-btn').onclick = e => {
            e.stopPropagation();
            console.log('More actions triggered for elements:', $('.selected').map((i, el) => el.id || $(el).attr('class')).get()); 
        };
    }
    // ... existing code ...

    // --- jQuery UI Draggable for Group Movement ---
    function makeElementsDraggable(selector) {
        $(selector).draggable({
            handle: false, // Allow dragging from anywhere on the element
            disabled: !editMode, // Initially disable if not in edit mode
            start: function(event, ui) {
                const $draggedOriginalElement = $(this); // The element the user initiated the drag on
                // console.log("Drag Start on:", $draggedOriginalElement[0].id || $draggedOriginalElement.attr('class'), "UI Helper:", ui.helper[0].id || ui.helper.attr('class'));

                $('body').addClass('dragging-active'); // Add class to body
                
                // Hide action bar during drag
                hideActionBar();
                
                // Hide group outline during drag
                const groupOutline = document.getElementById('group-selection-outline');
                if (groupOutline) {
                    groupOutline.style.display = 'none';
                }

                // New logic for initiating drag:
                // If the item being dragged is NOT already selected, then it becomes the sole selection.
                // If it IS already selected, the existing selection is preserved for the drag.
                if (!$draggedOriginalElement.hasClass('selected')) {
                    // console.log("Dragged element was not selected. It becomes the sole selection.");
                    $('.selected').removeClass('selected');
                    $draggedOriginalElement.addClass('selected');
                    $(document).trigger('selectionChanged');
                } else {
                    // console.log("Dragged element was already selected. Preserving current selection for drag.");
                    // Ensure it is at the top of the selection for focus, but don't change the set of selected items here.
                    // If multiple items are selected, dragging one should not change the fact that they are all selected.
                }

                let selectedElementsData = [];
                const initialDraggedLeft = parseFloat($draggedOriginalElement.css('left')) || 0;
                const initialDraggedTop = parseFloat($draggedOriginalElement.css('top')) || 0;
                // console.log(`Dragged element initial CSS: Left=${initialDraggedLeft}, Top=${initialDraggedTop}`);

                $('.selected').each(function() {
                    const $el = $(this);
                    if ($el[0] !== $draggedOriginalElement[0]) { // Don't include the dragged element itself
                        const elCssLeft = parseFloat($el.css('left')) || 0;
                        const elCssTop = parseFloat($el.css('top')) || 0;
                        selectedElementsData.push({
                            element: $el,
                            // Store initial CSS left/top relative to the dragged element's initial CSS left/top
                            dx: elCssLeft - initialDraggedLeft,
                            dy: elCssTop - initialDraggedTop
                        });
                    }
                });
                // Store this data on the ui.helper, which is what jQuery UI uses for drag context
                ui.helper.data('selectedElementsData', selectedElementsData);
                // console.log("Stored selectedElementsData on ui.helper:", selectedElementsData);
            },
            drag: function(event, ui) {
                // ui.helper is the element being dragged by jQuery UI (the visual representation)
                // ui.position contains the new CSS top/left for ui.helper, relative to its offset parent
                const selectedData = ui.helper.data('selectedElementsData');

                // console.log(`Drag: Helper at CSS Left: ${ui.position.left}, CSS Top: ${ui.position.top}`);

                if (selectedData && selectedData.length > 0) {
                    $.each(selectedData, function(i, posData) {
                        const newLeft = ui.position.left + posData.dx;
                        const newTop = ui.position.top + posData.dy;
                        // console.log(`  Moving ${posData.element[0].id || posData.element.attr('class')} to CSS Left: ${newLeft}, CSS Top: ${newTop} (dx:${posData.dx}, dy:${posData.dy})`);
                        posData.element.css({
                            left: newLeft + 'px',
                            top: newTop + 'px'
                        });
                    });
                } else if (selectedData && selectedData.length === 0) {
                    // This means other items were selected but calculation resulted in empty data - check start logic
                }
                
                // Update group outline during drag for multiple selections
                if ($('.selected').length > 1) {
                    updateGroupOutline();
                }
            },
            stop: function(event, ui) {
                // console.log("Drag Stop. Final Helper CSS: Left:", ui.position.left, "Top:", ui.position.top);
                $('body').removeClass('dragging-active'); // Remove class from body
                
                // Show action bar again after drag
                showActionBar();
                
                // Show group outline again after drag if multiple elements selected
                if ($('.selected').length > 1) {
                    updateGroupOutline();
                }
                
                // Clear stored data
                ui.helper.removeData('selectedElementsData');
                // Update properties panel or other UI if necessary
                // Consider if a 'selectionMoved' event is needed
                $(document).trigger('selectionChanged'); // Update UI for potentially new positions
            }
        });
    }

    // Initial call for existing elements and call after new elements are created
    // Ensure this is called AFTER jQuery and jQuery UI are loaded.
    $(function() { // Ensures DOM is ready
        makeElementsDraggable('.text-box, .image-frame, .rectangle-element');
    });
    // ... rest of your script ...
    // Remember to call makeElementsDraggable(newlyCreatedElement) in your element creation functions.
    // For example:
    // function createTextBox(...) { 
    //     ... 
    //     makeElementsDraggable($(box)); // Pass jQuery object
    //     ...
    // }

    // Ensure your selection mousedown and lasso mouseup events correctly trigger 'selectionChanged'
    // For example, in your mousedown selection logic:
    /*
    $(document).on('mousedown', '.text-box, .image-frame, .rectangle-element, .group-container', function(e) {
        // ... your selection logic ...
        if (selectionActuallyChanged) { // A flag you set if .selected classes changed
            $(document).trigger('selectionChanged');
        }
    });
    */
    // And in your lasso mouseup:
    /*
    $(document).on('mouseup.lassoSelect', function(ev) { 
        // ... your lasso selection logic ...
        if (selectionActuallyChanged) { // A flag you set if .selected classes changed
            $(document).trigger('selectionChanged');
        }
    });
    */
    // And in your deselect on click outside:
    /*
    $(document).on('mousedown', function(e) {
        if (!$(e.target).closest(selectableAndToolbarElements).length) {
            if ($('.selected').length > 0) {
                $('.selected').removeClass('selected');
                $(document).trigger('selectionChanged');
            }
        }
    });
    */

    // Example of listening to selection change to update UI:
    // This should be the single source of truth for reacting to selection changes.
    $(document).on('selectionChanged', function() {
        const $selected = $('.selected');
        
        // When selection changes, ensure any text box that is no longer selected is not editable.
        $('.text-box').not('.selected').find('.text-content').prop('contentEditable', false);

        // If nothing is selected, clear any active text selection in the document.
        if ($selected.length === 0) {
            if (window.getSelection) {
                window.getSelection().removeAllRanges();
            } else if (document.selection) { // For older IE
                document.selection.empty();
            }
        }
        
        // Defer the UI update slightly to allow browser to process layout changes
        setTimeout(function() {
            updateMultiSelectToolbarAndOutline(); // Call the updated function

            if ($selected.length === 1) {
                const selectedElement = $selected[0]; // Get the DOM element
                showToolbarForBox(selectedElement);
                showElementDetails(selectedElement);
            } else {
                hideToolbar();
                hideDetailsPanel();
            }
        }, 0); // Zero delay pushes to next event loop tick
    });

    // ... existing code ...

    // --- Universal Action Functions ---
    function deleteSelectedElements() {
        if (!editMode) return;
        const $selected = $('.selected');
        if ($selected.length > 0) {
            $selected.remove();
            $(document).trigger('selectionChanged'); // Update UI (hide toolbars, etc.)
        }
    }

    function copySelectedElements() {
        if (!editMode) return;
        const $selected = $('.selected');
        const newElements = [];
        let offsetIncrement = 0; // To cascade copies slightly

        $selected.each(function() {
            const $original = $(this);
            const elementType = $original.attr('data-element-type');
            const documentArea = $original.closest('.document')[0];
            if (!documentArea) return true; // Continue to next selected element

            const newLeft = (parseFloat($original.css('left')) || 0) + 20 + offsetIncrement;
            const newTop = (parseFloat($original.css('top')) || 0) + 20 + offsetIncrement;
            const width = $original.outerWidth();
            const height = $original.outerHeight();
            let newElement = null;

            if (elementType === 'text') {
                const $content = $original.find('.text-content');
                if ($content.length) {
                    newElement = createTextBox(
                        documentArea,
                        newLeft, newTop,
                        width, height,
                        $content.text(), $content.css('font-size')
                    );
                }
            } else if (elementType === 'image_frame') {
                newElement = createImageFrame(
                    documentArea,
                    newLeft, newTop,
                    width, height
                );
                const $currentImg = $original.find('.element-content img');
                if (newElement && $currentImg.length && $currentImg.attr('src') && newElement.setImage) {
                    newElement.setImage($currentImg.attr('src'));
                }
            } else if (elementType === 'rectangle') {
                newElement = createRectangle(
                    documentArea,
                    newLeft, newTop,
                    width, height
                );
                if (newElement && newElement !== $original[0]) { 
                    // Copy styles - note: $original.css('backgroundColor') might return 'rgba(0, 0, 0, 0)' for transparent
                    // It's often better to copy from the actual style attribute if set, or computed style
                    // For simplicity, direct style copy here. Consider complex cases.
                    $(newElement).css('background-color', $original.css('background-color'));
                    $(newElement).css('border-color', $original.css('border-color'));
                    $(newElement).css('border-width', $original.css('border-width'));
                    $(newElement).css('border-radius', $original.css('border-radius'));
                    $(newElement).css('border-style', $original.css('border-style'));
                     // For rectangle, styles are on the .rectangle-bg child
                    const originalBg = $original.find('.rectangle-bg')[0];
                    const newBg = $(newElement).find('.rectangle-bg')[0];
                    if(originalBg && newBg){
                        newBg.style.backgroundColor = originalBg.style.backgroundColor;
                        newBg.style.borderColor = originalBg.style.borderColor;
                        newBg.style.borderWidth = originalBg.style.borderWidth;
                        newBg.style.borderRadius = originalBg.style.borderRadius;
                        newBg.style.borderStyle = originalBg.style.borderStyle;
                    }
                }
            } else if (elementType === 'group') {
                // Deep clone the group container
                newElement = $original.clone(false)[0]; // false to not copy event handlers initially
                $(newElement).css({
                    left: newLeft + 'px',
                    top: newTop + 'px'
                });
                documentArea.appendChild(newElement);
                makeElementsDraggable($(newElement)); // Make the new group draggable

                // Recursively make children draggable if they were part of the original group structure
                // This assumes children are correctly cloned. jQuery UI draggable might need re-init for children if not.
                $(newElement).find('.text-box, .image-frame, .rectangle-element, .group-container').each(function() {
                    makeElementsDraggable($(this)); 
                });
            }

            if (newElement) {
                newElements.push(newElement);
                offsetIncrement += 5; // Small increment for multiple copies
            }
        });

        if (newElements.length > 0) {
            $('.selected').removeClass('selected'); // Deselect originals
            $(newElements).addClass('selected');    // Select new copies
            $(document).trigger('selectionChanged');
        }
    }

    // Delegated event handlers for individual floating action buttons
    $(document).on('click', '.floating-actions .delete-btn', function(e) {
        e.stopPropagation();
        // Ensure the parent element of these actions is selected before deleting
        // This is a safeguard, typically it should be if actions are visible.
        const $elementContainer = $(this).closest('.text-box, .image-frame, .rectangle-element, .group-container');
        if (!$elementContainer.hasClass('selected')) {
            $('.selected').removeClass('selected');
            $elementContainer.addClass('selected');
            // No need to trigger selectionChanged here if deleteSelectedElements will do it
        }
        deleteSelectedElements();
    });

    $(document).on('click', '.floating-actions .copy-btn', function(e) {
        e.stopPropagation();
        const $elementContainer = $(this).closest('.text-box, .image-frame, .rectangle-element, .group-container');
        if (!$elementContainer.hasClass('selected')) {
            $('.selected').removeClass('selected');
            $elementContainer.addClass('selected');
            // No need to trigger selectionChanged here if copySelectedElements will do it
        }
        copySelectedElements();
    });

    // Update calls to the renamed function (This block seems like a remnant, ensure selectElement is fully removed or adapted)

    /**
     * Makes a text element's content editable, focuses it, and selects the text.
     * @param {HTMLElement} textElement The text box element to make editable.
     */
    function makeTextElementEditable(textElement) {
        if (!editMode || !textElement) return;

        const content = textElement.querySelector('.text-content');
        if (content && content.contentEditable !== 'true') {
            content.contentEditable = true;
            content.focus();

            // Select all text inside for easy replacement
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(content);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }

    // Double-click to edit text
    $(document).on('dblclick', '.text-box', function(e) {
        makeTextElementEditable(this);
    });


    // Hide on deselect
    $(document).on('mousedown', function(e) {
        if (!editMode) return;
        if ($(e.target).closest('.text-box, .image-frame, .rectangle-element, .text-toolbar, .element-details-panel, #universal-action-bar, .action-btn').length) {
            return;
        }
        if ($('.selected').length > 0) {
            $('.selected').removeClass('selected');
            $(document).trigger('selectionChanged');
        }
    });

    // Universal Action Bar - Clean, reusable implementation
    const actionBar = document.getElementById('universal-action-bar');
    console.log('Action bar element:', actionBar);
    if (actionBar) {
        console.log('Action bar buttons:', actionBar.querySelectorAll('.action-btn'));
    }

    /**
     * Shows the action bar above the selected elements
     */
    function showActionBar() {
        const $selected = $('.selected');
        if ($selected.length === 0 || !editMode) {
            hideActionBar();
            return;
        }
        
        console.log('showActionBar called with', $selected.length, 'selected elements');

        // Show/hide and update group button based on selection
        const groupBtn = actionBar ? actionBar.querySelector('[data-action="group"]') : null;
        if (groupBtn) {
            const hasGroupedElements = $selected.toArray().some(el => $(el).attr('data-group-id'));
            const allSameGroup = $selected.length > 1 && 
                               $selected.toArray().every(el => $(el).attr('data-group-id') === $($selected[0]).attr('data-group-id'));
            
            console.log('Action bar update:', {
                selectedCount: $selected.length,
                hasGroupedElements,
                allSameGroup,
                firstElementGroupId: $selected.length > 0 ? $($selected[0]).attr('data-group-id') : null
            });
            
            if ($selected.length > 1 && !allSameGroup) {
                // Multiple elements not in same group - show "Group" button
                groupBtn.style.display = 'flex';
                groupBtn.innerHTML = '<i class="fas fa-object-group"></i>';
                groupBtn.title = 'Group';
                groupBtn.setAttribute('data-action', 'group');
                console.log('Showing GROUP button');
            } else if (hasGroupedElements) {
                // Has grouped elements - show "Ungroup" button
                groupBtn.style.display = 'flex';
                groupBtn.innerHTML = '<i class="fas fa-object-ungroup"></i>';
                groupBtn.title = 'Ungroup';
                groupBtn.setAttribute('data-action', 'ungroup');
                console.log('Showing UNGROUP button');
            } else {
                // Single element or no groups - hide button
                groupBtn.style.display = 'none';
                console.log('Hiding group button');
            }
        } else {
            console.warn('Group button not found in action bar');
        }

        // Position the bar
        positionActionBar($selected);
        
        // Show the bar
        actionBar.classList.remove('action-bar-hidden');
    }

    /**
     * Hides the action bar
     */
    function hideActionBar() {
        actionBar.classList.add('action-bar-hidden');
    }

    /**
     * Positions the action bar above the selected elements
     */
    function positionActionBar($selected) {
        if ($selected.length === 0) return;

        // Use requestAnimationFrame to ensure elements are fully rendered
        requestAnimationFrame(() => {
            try {
                // Calculate bounding box of all selected elements
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                let validElements = 0;
                
                $selected.each(function() {
                    const rect = this.getBoundingClientRect();
                    // Only include elements that are actually visible/rendered
                    if (rect.width > 0 && rect.height > 0) {
                        minX = Math.min(minX, rect.left);
                        minY = Math.min(minY, rect.top);
                        maxX = Math.max(maxX, rect.right);
                        maxY = Math.max(maxY, rect.bottom);
                        validElements++;
                    }
                });

                // Only position if we have valid elements
                if (validElements === 0) {
                    console.warn('No valid elements found for action bar positioning');
                    return;
                }

                // Position bar centered above the selection
                const barRect = actionBar.getBoundingClientRect();
                const centerX = (minX + maxX) / 2;
                const topY = minY - barRect.height - 12; // 12px gap above selection

                actionBar.style.left = (centerX - barRect.width / 2 + window.scrollX) + 'px';
                actionBar.style.top = Math.max(0, topY + window.scrollY) + 'px'; // Ensure it doesn't go above viewport
            } catch (error) {
                console.warn('Error positioning action bar:', error);
            }
        });
    }

    // Event handlers for action bar
    $(document).on('click', '.action-btn', function(e) {
        e.stopPropagation();
        e.preventDefault();
        const action = this.getAttribute('data-action');
        
        switch(action) {
            case 'group':
                groupSelectedElements();
                break;
            case 'ungroup':
                ungroupSelectedElements();
                break;
            case 'copy':
                copySelectedElements();
                break;
            case 'delete':
                deleteSelectedElements();
                break;
            case 'more':
                showMoreActionsMenu(this);
                break;
        }
    });

    // Prevent action bar from triggering deselection
    $(document).on('mousedown', '#universal-action-bar', function(e) {
        e.stopPropagation();
    });

    // Update action bar and group outline on selection changes
    $(document).on('selectionChanged', function() {
        setTimeout(() => {
            showActionBar();
            updateGroupOutline(); // Show group outline for multiple selections
        }, 50); // Increased delay to ensure elements are fully rendered
    });

    // Update position on scroll and resize
    window.addEventListener('scroll', () => {
        const $selected = $('.selected');
        if (!actionBar.classList.contains('action-bar-hidden') && $selected.length > 0) {
            positionActionBar($selected);
        }
        // Update group outline on scroll
        if ($selected.length > 1 && editMode) {
            updateGroupOutline();
        }
    });

    window.addEventListener('resize', () => {
        const $selected = $('.selected');
        if (!actionBar.classList.contains('action-bar-hidden') && $selected.length > 0) {
            positionActionBar($selected);
        }
        // Update group outline on resize
        if ($selected.length > 1 && editMode) {
            updateGroupOutline();
        }
    });

    /**
     * Shows/hides and positions the group outline for multiple selected elements
     */
    function updateGroupOutline() {
        const $selected = $('.selected');
        const groupOutline = document.getElementById('group-selection-outline');
        
        if (!groupOutline) {
            console.warn('Group selection outline element not found');
            return;
        }

        if ($selected.length <= 1 || !editMode) {
            groupOutline.style.display = 'none';
            return;
        }

        // Find the document area that contains the selected elements
        const activeDocument = $selected.first().closest('.document')[0];
        if (!activeDocument) {
            groupOutline.style.display = 'none';
            return;
        }

        // Ensure the outline is a child of the active document
        if (groupOutline.parentElement !== activeDocument) {
            activeDocument.appendChild(groupOutline);
        }

        // Calculate bounding box of all selected elements
        const zoom = getCurrentZoom();
        const docRect = activeDocument.getBoundingClientRect();
        
        let minLeft = Infinity, minTop = Infinity, maxRight = -Infinity, maxBottom = -Infinity;
        
        $selected.each(function() {
            const rect = this.getBoundingClientRect();
            // Convert viewport coordinates to document-relative coordinates
            const relativeLeft = (rect.left - docRect.left) / zoom;
            const relativeTop = (rect.top - docRect.top) / zoom;
            const relativeRight = (rect.right - docRect.left) / zoom;
            const relativeBottom = (rect.bottom - docRect.top) / zoom;
            
            minLeft = Math.min(minLeft, relativeLeft);
            minTop = Math.min(minTop, relativeTop);
            maxRight = Math.max(maxRight, relativeRight);
            maxBottom = Math.max(maxBottom, relativeBottom);
        });

        // Add some padding around the selection
        const padding = 8;
        minLeft -= padding;
        minTop -= padding;
        maxRight += padding;
        maxBottom += padding;

        // Position and size the outline
        groupOutline.style.left = minLeft + 'px';
        groupOutline.style.top = minTop + 'px';
        groupOutline.style.width = (maxRight - minLeft) + 'px';
        groupOutline.style.height = (maxBottom - minTop) + 'px';
        groupOutline.style.display = 'block';
    }

    // Universal Action Bar - Clean, reusable implementation

        /**
     * Groups multiple selected elements by assigning them the same group-id
     */
    function groupSelectedElements() {
        if (!editMode) return;
        const $selected = $('.selected');
        
        if ($selected.length < 2) {
            console.warn('Need at least 2 elements to create a group');
            return;
        }

        // Generate unique group ID
        const groupId = 'group-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
        
        // Assign group-id to all selected elements
        $selected.each(function() {
            $(this).attr('data-group-id', groupId);
            // Add visual indicator that element is grouped
            $(this).addClass('grouped-element');
        });
        
        console.log('Created group', groupId, 'with', $selected.length, 'elements');
        
        // Trigger selection change to update UI
        $(document).trigger('selectionChanged');
    }

    /**
     * Ungroups elements by removing their group-id
     */
    function ungroupSelectedElements() {
        if (!editMode) return;
        const $selected = $('.selected');
        
        $selected.each(function() {
            $(this).removeAttr('data-group-id');
            $(this).removeClass('grouped-element');
        });
        
        console.log('Ungrouped', $selected.length, 'elements');
        $(document).trigger('selectionChanged');
    }

    /**
     * Gets all elements that belong to the same group as the given element
     */
    function getGroupMembers(element) {
        const groupId = $(element).attr('data-group-id');
        if (!groupId) {
            return [element]; // Return just the element if it's not grouped
        }
        
        // Find all elements with the same group-id in the same document
        const documentArea = $(element).closest('.document')[0];
        if (!documentArea) return [element];
        
        return $(documentArea).find(`[data-group-id="${groupId}"]`).get();
    }

    /**
     * Selects all members of a group when one member is selected
     */
    function selectGroupMembers(clickedElement, isMultiSelect = false) {
        const groupMembers = getGroupMembers(clickedElement);
        
        if (groupMembers.length === 1) {
            // Not grouped, handle as individual selection
            if (!isMultiSelect) {
                $('.selected').removeClass('selected');
            }
            $(clickedElement).addClass('selected');
        } else {
            // Is grouped, select all group members
            if (!isMultiSelect) {
                $('.selected').removeClass('selected');
            }
            $(groupMembers).addClass('selected');
        }
        
        $(document).trigger('selectionChanged');
    }

     /**
      * Copies selected elements with full style preservation
      */
     function copySelectedElements() {
         if (!editMode) return;
         const $selected = $('.selected');
         if ($selected.length === 0) return;
         
         const newElements = [];
         let offsetIncrement = 0;

         $selected.each(function() {
             const $original = $(this);
             const elementType = $original.attr('data-element-type');
             const documentArea = $original.closest('.document')[0];
             if (!documentArea) return true;

             const newLeft = (parseFloat($original.css('left')) || 0) + 20 + offsetIncrement;
             const newTop = (parseFloat($original.css('top')) || 0) + 20 + offsetIncrement;
             const width = $original.outerWidth();
             const height = $original.outerHeight();
             let newElement = null;

             try {
                 if (elementType === 'text') {
                     newElement = copyTextElement($original, documentArea, newLeft, newTop, width, height);
                 } else if (elementType === 'image_frame') {
                     newElement = copyImageElement($original, documentArea, newLeft, newTop, width, height);
                 } else if (elementType === 'rectangle') {
                     newElement = copyRectangleElement($original, documentArea, newLeft, newTop, width, height);
                                 } else {
                     // Generic copy for unknown element types
                     newElement = copyGenericElement($original, documentArea, newLeft, newTop);
                 }

                 if (newElement) {
                     newElements.push(newElement);
                     offsetIncrement += 5;
                 }
             } catch (error) {
                 console.error('Error copying element:', error);
             }
         });

                 if (newElements.length > 0) {
            // Keep original selection, don't auto-select copied elements
            console.log('Copied', newElements.length, 'elements');
        }
     }

     /**
      * Helper function to copy text elements
      */
     function copyTextElement($original, documentArea, left, top, width, height) {
         const $content = $original.find('.text-content');
         if (!$content.length) return null;

         const newElement = createTextBox(
             documentArea, left, top, width, height,
             $content.text(), $content.css('font-size')
         );

         if (newElement) {
             // Copy all text styles
             const $newContent = $(newElement).find('.text-content');
             if ($newContent.length) {
                 $newContent.css({
                     fontFamily: $content.css('font-family'),
                     fontSize: $content.css('font-size'),
                     fontWeight: $content.css('font-weight'),
                     fontStyle: $content.css('font-style'),
                     textDecoration: $content.css('text-decoration'),
                     color: $content.css('color'),
                     textAlign: $content.css('text-align'),
                     lineHeight: $content.css('line-height'),
                     letterSpacing: $content.css('letter-spacing')
                 });
             }
             
             // Copy element-level styles
             copyElementStyles($original, $(newElement));
         }

         return newElement;
     }

     /**
      * Helper function to copy image elements
      */
     function copyImageElement($original, documentArea, left, top, width, height) {
         const newElement = createImageFrame(documentArea, left, top, width, height);
         
         if (newElement) {
             // Copy image if it exists
             const $originalImg = $original.find('.element-content img');
             if ($originalImg.length && $originalImg.attr('src') && newElement.setImage) {
                 newElement.setImage($originalImg.attr('src'));
             }
             
             // Copy element-level styles
             copyElementStyles($original, $(newElement));
         }

         return newElement;
     }

     /**
      * Helper function to copy rectangle elements
      */
     function copyRectangleElement($original, documentArea, left, top, width, height) {
         const newElement = createRectangle(documentArea, left, top, width, height);
         
         if (newElement) {
             // Copy rectangle background styles
             const originalBg = $original.find('.rectangle-bg')[0];
             const newBg = $(newElement).find('.rectangle-bg')[0];
             
             if (originalBg && newBg) {
                 $(newBg).css({
                     backgroundColor: $(originalBg).css('background-color'),
                     borderColor: $(originalBg).css('border-color'),
                     borderWidth: $(originalBg).css('border-width'),
                     borderStyle: $(originalBg).css('border-style'),
                     borderRadius: $(originalBg).css('border-radius'),
                     opacity: $(originalBg).css('opacity')
                 });
             }
             
             // Copy element-level styles
             copyElementStyles($original, $(newElement));
         }

         return newElement;
     }



     /**
      * Helper function to copy generic/unknown elements
      */
     function copyGenericElement($original, documentArea, left, top) {
         const newElement = $original.clone(true)[0];
         
         $(newElement).css({ left: left + 'px', top: top + 'px' });
         
         // Generate new ID if it has one
         if (newElement.id) {
             newElement.id = newElement.id + '-copy-' + Date.now();
         }
         
         documentArea.appendChild(newElement);
         makeElementsDraggable($(newElement));

         return newElement;
     }

     /**
      * Helper function to copy common element styles
      */
     function copyElementStyles($original, $new) {
         // Copy common CSS properties
         const stylesToCopy = [
             'transform', 'z-index', 'opacity', 'filter',
             'box-shadow', 'border-radius', 'background-color'
         ];
         
         stylesToCopy.forEach(style => {
             const value = $original.css(style);
             if (value && value !== 'none' && value !== 'auto') {
                 $new.css(style, value);
             }
         });
         
         // Copy group-id if it exists (but generate new group for copied elements)
         const originalGroupId = $original.attr('data-group-id');
         if (originalGroupId) {
             const newGroupId = 'group-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
             $new.attr('data-group-id', newGroupId);
             $new.addClass('grouped-element');
         }
     }

     /**
      * Shows a context menu with more actions
      */
     function showMoreActionsMenu(button) {
         const $selected = $('.selected');
         if ($selected.length === 0) return;
         
         // Simple implementation - you can expand this to show a proper context menu
         const actions = [
             'Bring to Front',
             'Send to Back', 
             'Duplicate in Place',
             'Lock/Unlock',
             'Align Left',
             'Align Center',
             'Align Right'
         ];
         
         const choice = prompt('More Actions:\n' + actions.map((action, i) => `${i + 1}. ${action}`).join('\n') + '\n\nEnter number:');
         
         if (choice) {
             const actionIndex = parseInt(choice) - 1;
             if (actionIndex >= 0 && actionIndex < actions.length) {
                 executeMoreAction(actions[actionIndex], $selected);
             }
         }
     }

     /**
      * Executes additional actions from the more menu
      */
     function executeMoreAction(action, $selected) {
         switch(action) {
             case 'Bring to Front':
                 $selected.css('z-index', 1000);
                 break;
             case 'Send to Back':
                 $selected.css('z-index', 1);
                 break;
             case 'Duplicate in Place':
                 copySelectedElements();
                 // Move copies back to original position
                 setTimeout(() => {
                     $('.selected').each(function() {
                         const $this = $(this);
                         $this.css({
                             left: (parseFloat($this.css('left')) - 20) + 'px',
                             top: (parseFloat($this.css('top')) - 20) + 'px'
                         });
                     });
                 }, 100);
                 break;
             case 'Lock/Unlock':
                 $selected.each(function() {
                     $(this).toggleClass('locked');
                     if ($(this).hasClass('locked')) {
                         $(this).draggable('disable');
                     } else {
                         $(this).draggable('enable');
                     }
                 });
                 break;
             case 'Align Left':
                 alignElements($selected, 'left');
                 break;
             case 'Align Center':
                 alignElements($selected, 'center');
                 break;
             case 'Align Right':
                 alignElements($selected, 'right');
                 break;
         }
     }

     /**
      * Aligns multiple elements
      */
     function alignElements($elements, direction) {
         if ($elements.length < 2) return;
         
         let targetPosition;
         
         if (direction === 'left') {
             targetPosition = Math.min(...$elements.map(function() {
                 return parseFloat($(this).css('left')) || 0;
             }).get());
             $elements.each(function() {
                 $(this).css('left', targetPosition + 'px');
             });
         } else if (direction === 'right') {
             targetPosition = Math.max(...$elements.map(function() {
                 return (parseFloat($(this).css('left')) || 0) + $(this).outerWidth();
             }).get());
             $elements.each(function() {
                 $(this).css('left', (targetPosition - $(this).outerWidth()) + 'px');
             });
         } else if (direction === 'center') {
             const positions = $elements.map(function() {
                 const left = parseFloat($(this).css('left')) || 0;
                 return left + $(this).outerWidth() / 2;
             }).get();
             targetPosition = positions.reduce((a, b) => a + b) / positions.length;
             $elements.each(function() {
                 $(this).css('left', (targetPosition - $(this).outerWidth() / 2) + 'px');
             });
         }
         
         // Update group outline and action bar
         updateGroupOutline();
         setTimeout(() => $(document).trigger('selectionChanged'), 50);
     }

  });