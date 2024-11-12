const videoElement = document.getElementById('video');
const canvasElement = document.getElementById('canvas');
const canvasCtx = canvasElement.getContext('2d');
const resetButton = document.getElementById('reset-button');
const notification = document.getElementById('notification');

let drawing = false;
let erasing = false;
let currentColor = 'blue';
let prevX = null;
let prevY = null;
const DISTANCE_THRESHOLD = 60; // Adjust as needed
const eraserThickness = 20;
const drawingThickness = 5;

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

hands.onResults(onResults);

// Start video
const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({ image: videoElement });
    },
    width: 800,
    height: 600
});
camera.start();

function onResults(results) {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

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
                showNotification(selectedColor === 'eraser' ? 'Eraser Selected' : `${selectedColor.charAt(0).toUpperCase() + selectedColor.slice(1)} Selected`);
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
                if (prevX && prevY) {
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
    }

    canvasCtx.restore();
}

function drawColorOptions() {
    // Define color options
    const options = [
        { name: 'Blue', color: 'blue', x1: 30, y1: 30, x2: 130, y2: 130 },
        { name: 'Green', color: 'green', x1: 160, y1: 30, x2: 260, y2: 130 },
        { name: 'Yellow', color: 'yellow', x1: 290, y1: 30, x2: 390, y2: 130 },
        { name: 'Eraser', color: 'gray', x1: 420, y1: 30, x2: 520, y2: 130 }
    ];

    options.forEach(option => {
        canvasCtx.fillStyle = option.color === 'gray' ? '#C8C8C8' : option.color;
        canvasCtx.fillRect(option.x1, option.y1, option.x2 - option.x1, option.y2 - option.y1);
        canvasCtx.strokeStyle = option.color === 'gray' ? '#000000' : '#FFFFFF';
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeRect(option.x1, option.y1, option.x2 - option.x1, option.y2 - option.y1);
        canvasCtx.fillStyle = option.color === 'gray' ? '#000000' : '#FFFFFF';
        canvasCtx.font = '16px Arial';
        canvasCtx.fillText(option.name, option.x1 + 10, option.y2 - 10);
    });
}

function getSelectedColor(x, y) {
    const options = [
        { name: 'blue', x1: 30, y1: 30, x2: 130, y2: 130 },
        { name: 'green', x1: 160, y1: 30, x2: 260, y2: 130 },
        { name: 'yellow', x1: 290, y1: 30, x2: 390, y2: 130 },
        { name: 'eraser', x1: 420, y1: 30, x2: 520, y2: 130 }
    ];

    for (let option of options) {
        if (x > option.x1 && x < option.x2 && y > option.y1 && y < option.y2) {
            return option.name;
        }
    }
    return null;
}

resetButton.addEventListener('click', () => {
    const ctx = canvasCtx;
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    showNotification("Canvas has been reset!");
});

function showNotification(message) {
    notification.textContent = message;
    notification.classList.remove('hidden');
    if (message.includes('Eraser')) {
        notification.style.backgroundColor = '#f44336'; // Red
    } else if (message.includes('reset')) {
        notification.style.backgroundColor = '#4CAF50'; // Green
    } else {
        notification.style.backgroundColor = '#2196F3'; // Blue
    }
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000); // Hide after 3 seconds
}

