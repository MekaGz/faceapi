#Servidor Flask
from flask import Flask, request, jsonify
import os
import json

app = Flask(__name__)
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'image' not in request.files or 'info' not in request.form:
        return jsonify({'error': 'No image or info part'}), 400

    image = request.files['image']
    info = request.form['info']

    # Guardar la imagen
    image_path = os.path.join(UPLOAD_FOLDER, image.filename)
    image.save(image_path)

    # Guardar la información en un archivo JSON
    info_path = os.path.splitext(image_path)[0] + '.json'
    with open(info_path, 'w') as f:
        f.write(info)

    return jsonify({'message': 'File and info uploaded successfully'}), 200

if __name__ == '__main__':
    app.run(debug=True)


