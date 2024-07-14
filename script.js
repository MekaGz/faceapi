const elVideo = document.getElementById('video');
const captureBtn = document.getElementById('captureBtn');
const infoDiv = document.getElementById('info');
const userName = "";

let currentDetections = [];

// Polyfill para getUserMedia
navigator.getMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);

const cargarCamera = () => {
    navigator.getMedia(
        {
            video: true,
            audio: false
        },
        stream => elVideo.srcObject = stream,
        error => console.error(error)
    );
}

// Cargar Modelos
Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
    faceapi.nets.ageGenderNet.loadFromUri('/models'),
    faceapi.nets.faceExpressionNet.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
]).then(cargarCamera);

elVideo.addEventListener('play', async () => {
    const canvas = faceapi.createCanvasFromMedia(elVideo);
    const leftContainer = document.querySelector('.left');
    leftContainer.append(canvas);

    const displaySize = { width: elVideo.width, height: elVideo.height };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
        const detections = await faceapi.detectAllFaces(elVideo)
            .withFaceLandmarks()
            .withFaceExpressions()
            .withAgeAndGender()
            .withFaceDescriptors();

        currentDetections = detections;

        const resizedDetections = faceapi.resizeResults(detections, displaySize);

        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

        faceapi.draw.drawDetections(canvas, resizedDetections);
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
        faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

        resizedDetections.forEach(detection => {
            const box = detection.detection.box;
            new faceapi.draw.DrawBox(box, {
                label: Math.round(detection.age) + ' años ' + detection.gender
            }).draw(canvas);
        });
    }, 100);
});

captureBtn.addEventListener('click', () => {
    const canvas = document.createElement('canvas');
    canvas.width = elVideo.videoWidth;
    canvas.height = elVideo.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(elVideo, 0, 0, canvas.width, canvas.height);

    ctx.font = '30px Arial';
    ctx.fillStyle = 'red';
    ctx.fillText(userName, 10, 30);

    const timestamp = new Date().toISOString().replace(/[-:.]/g, "");
    const filename = `captura_${timestamp}.png`;

    const nombreE = document.querySelector('.textbox-nombre').innerText;
    const nrcC = document.querySelector('.textbox-nrc').innerText;

    const detectionsInfo = currentDetections.map(detection => {
        const { age, gender, expressions, nombre, nrc } = detection;
        const expressionsSorted = Object.entries(expressions).sort((a, b) => b[1] - a[1]);
        const mostLikelyExpression = expressionsSorted[0][0];
        return {
            age: Math.round(age),
            gender: gender,
            expression: mostLikelyExpression,
            nombre: nombreE ,
            nrc: nrcC
        };
    });

    const infoJson = JSON.stringify(detectionsInfo);

    canvas.toBlob(blob => {
        const formData = new FormData();
        formData.append('image', blob, filename);
        formData.append('info', infoJson);
        fetch('http://127.0.0.1:5000/upload', {
            method: 'POST',
            body: formData
        }).then(response => response.json())
            .then(data => console.log(data))
            .catch(error => console.error('Error:', error));
    });

    // Actualizar la información de las personas en la parte derecha
    infoDiv.innerHTML = '';
    detectionsInfo.forEach(info => {
        const infoItem = document.createElement('div');
        infoItem.className = 'info-item';
        infoItem.innerHTML = `
            <p><strong>Edad:</strong> ${info.age}</p>
            <p><strong>Género:</strong> ${info.gender}</p>
            <p><strong>Expresión:</strong> ${info.expression}</p>
            <p><strong>Nombre:</strong> ${info.nombre}</p>
            <p><strong>Codigo de estudiante:</strong> ${info.nrc}</p>
        `;
        infoDiv.appendChild(infoItem);
    });
});
