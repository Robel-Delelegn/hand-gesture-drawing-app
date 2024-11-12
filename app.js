// Select DOM elements
const videoElement = document.getElementById('video');
const canvasElement = document.getElementById('canvas');
const canvasCtx = canvasElement.getContext('2d');
const resetButton = document.getElementById('reset-button');
const saveButton = document.getElementById('save-button');
const notification = document.getElementById('notification');

// Drawing settings
let drawing = false;
let erasing = false;
let currentColor = 'blue';
let prevX = null;
let prevY = null;
const DISTANCE_THRESHOLD = 60; // Pixels
const eraserThickness = 20;
const drawingThickness = 5;

// Define color options and their positions
const COLOR_OPTIONS = [
    { name: 'Blue', color: '#3498db', x1: 30, y1: 30, x2: 130, y2: 130 },
    { name: 'Green', color: '#2ecc71', x1: 160, y1: 30, x2: 260, y2: 130 },
    { name: 'Yellow', color: '#f1c40f', x1: 290, y1: 30, x2: 390, y2: 130 },
    { name: 'Eraser', color: '#95a5a6', x1: 420, y1: 30, x2: 520, y2: 130 }
];

// Initialize MediaPipe Hands
const hands = new Hands({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.5
});

// Define callback for hand detection
hands.onResults(onResults);

// Start camera
const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({ image: videoElement });
    },
    width: 800,
    height: 600
});
camera.start();

// Handle results from MediaPipe
function onResults(results) {
    // Clear canvas
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // Draw color selection squares
    drawColorOptions();

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        const indexTip = landmarks[8];
        const middleTip = landmarks[12];

        const indexX = indexTip.x * canvasElement.width;
        const indexY = indexTip.y * canvasElement.height;
        const middleX = middleTip.x * canvasElement.width;
        const middleY = middleTip.y * canvasElement.height;

        // Calculate distance between index and middle fingers
        const distance = Math.hypot(indexX - middleX, indexY - middleY);

        if (distance < DISTANCE_THRESHOLD) {
            // Check if index finger is over a color option
            const selectedColor = getSelectedColor(indexX, indexY);
            if (selectedColor) {
                currentColor = selectedColor === 'eraser' ? 'white' : selectedColor;
                erasing = selectedColor === 'eraser';
                showNotification(selectedColor === 'eraser' ? 'Eraser Selected' : `${capitalize(selectedColor)} Selected`);
            } else {
                // Drawing or Erasing
                if (erasing) {
                    canvasCtx.globalCompositeOperation = 'destination-out';
                    canvasCtx.lineWidth = eraserThickness;
                    canvasCtx.strokeStyle = 'rgba(0,0,0,1)';
                } else {
                    canvasCtx.globalCompositeOperation = 'source-over';
                    canvasCtx.lineWidth = drawingThickness;
                    canvasCtx.strokeStyle = currentColor;
                }

                canvasCtx.beginPath();
                if (prevX !== null && prevY !== null) {
                    canvasCtx.moveTo(prevX, prevY);
                    canvasCtx.lineTo(indexX, indexY);
                    canvasCtx.stroke();
                }
                prevX = indexX;
                prevY = indexY;
            }
        } else {
            prevX = null;
            prevY = null;
        }

        // Optionally draw hand landmarks
        drawConnectors(canvasCtx, landmarks, Hands.HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
        drawLandmarks(canvasCtx, landmarks, { color: '#FF0000', lineWidth: 1 });
    }

    canvasCtx.restore();
}

// Draw color and eraser selection squares
function drawColorOptions() {
    COLOR_OPTIONS.forEach(option => {
        // Draw filled rectangle
        canvasCtx.fillStyle = option.color;
        canvasCtx.fillRect(option.x1, option.y1, option.x2 - option.x1, option.y2 - option.y1);

        // Draw border
        canvasCtx.strokeStyle = '#ffffff';
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeRect(option.x1, option.y1, option.x2 - option.x1, option.y2 - option.y1);

        // Add text label
        canvasCtx.fillStyle = '#ffffff';
        canvasCtx.font = '16px Arial';
        canvasCtx.fillText(option.name, option.x1 + 10, option.y2 - 10);
    });
}

// Determine if the user's finger is over a color option
function getSelectedColor(x, y) {
    for (let option of COLOR_OPTIONS) {
        if (x > option.x1 && x < option.x2 && y > option.y1 && y < option.y2) {
            return option.name.toLowerCase();
        }
    }
    return null;
}

// Capitalize the first letter of a word
function capitalize(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
}

// Handle Restart button click
resetButton.addEventListener('click', () => {
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    showNotification("Canvas has been reset!");
});

// Handle Save button click
saveButton.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'drawing.png';
    link.href = canvasElement.toDataURL();
    link.click();
    showNotification("Drawing saved!");
});

// Display notifications to the user
function showNotification(message) {
    notification.textContent = message;
    notification.classList.remove('hidden');

    // Change background color based on message
    if (message.includes('Eraser')) {
        notification.style.backgroundColor = '#f44336'; // Red
    } else if (message.includes('reset')) {
        notification.style.backgroundColor = '#4CAF50'; // Green
    } else if (message.includes('saved')) {
        notification.style.backgroundColor = '#2196F3'; // Blue
    } else {
        notification.style.backgroundColor = '#FFC107'; // Amber
    }

    // Hide notification after 3 seconds
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}


