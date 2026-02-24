from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import smtplib, random, base64, os, numpy as np, requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pymongo import MongoClient
import gridfs
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import load_img, img_to_array
from io import BytesIO

app = Flask(__name__)
CORS(app)

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = ""
SENDER_PASSWORD = ""
otp_storage = {}

def send_otp(email, otp, name):
    subject = "Your One-Time Verification Code"

    body = f"""
    Hi {name},
    
    Your One-Time Password (OTP) for login verification is: {otp}
    
    Please enter this code within the next few minutes to complete your login process.  
    If you did not request this code, please ignore this message.
    
    Thank you,  
    HelpForFarmer Team
    """

    msg = MIMEMultipart()
    msg["From"] = SENDER_EMAIL
    msg["To"] = email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))
    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.sendmail(SENDER_EMAIL, email, msg.as_string())
        server.quit()
    except Exception as e:
        print("Failed to send email:", e)

MONGO_URI = ""
client = MongoClient(MONGO_URI)
db = client['help_for_farmer']
fs = gridfs.GridFS(db, collection="tools")

WEATHER_API_KEY=""

model = load_model('model/my_model.h5')
code = {
    'Apple___Apple_scab': 0, 'Apple___Black_rot': 1, 'Apple___Cedar_apple_rust': 2, 'Apple___healthy': 3,
    'Blueberry___healthy': 4, 'Cherry_(including_sour)___Powdery_mildew': 5, 'Cherry_(including_sour)___healthy': 6,
    'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot': 7, 'Corn_(maize)___Common_rust_': 8,
    'Corn_(maize)___Northern_Leaf_Blight': 9, 'Corn_(maize)___healthy': 10, 'Grape___Black_rot': 11,
    'Grape___Esca_(Black_Measles)': 12, 'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)': 13, 'Grape___healthy': 14,
    'Orange___Haunglongbing_(Citrus_greening)': 15, 'Peach___Bacterial_spot': 16, 'Peach___healthy': 17,
    'Pepper,_bell___Bacterial_spot': 18, 'Pepper,_bell___healthy': 19, 'Potato___Early_blight': 20,
    'Potato___Late_blight': 21, 'Potato___healthy': 22, 'Raspberry___healthy': 23, 'Soybean___healthy': 24,
    'Squash___Powdery_mildew': 25, 'Strawberry___Leaf_scorch': 26, 'Strawberry___healthy': 27,
    'Tomato___Bacterial_spot': 28, 'Tomato___Early_blight': 29, 'Tomato___Late_blight': 30,
    'Tomato___Leaf_Mold': 31, 'Tomato___Septoria_leaf_spot': 32,
    'Tomato___Spider_mites Two-spotted_spider_mite': 33, 'Tomato___Target_Spot': 34,
    'Tomato___Tomato_Yellow_Leaf_Curl_Virus': 35, 'Tomato___Tomato_mosaic_virus': 36, 'Tomato___healthy': 37
}
inv_code = {v: k for k, v in code.items()}

GEMINI_API_KEY = ""
GOOGLE_MAPS_API_KEY = ""

# MongoDB connection
fs2 = gridfs.GridFS(db, collection="user")

@app.route('/')
@app.route('/index')
@app.route('/login')
def index():
    return render_template('index.html')

@app.route('/home')
def home():
    return render_template('home.html')

@app.route('/tools')
def tools():
    return render_template('tools.html')

@app.route('/disease')
def disease():
    return render_template('disease.html')

@app.route('/storage')
def storage():
    return render_template('storage.html')

@app.route('/weather')
def weather():
    return render_template('weather.html')

@app.route('/ask-AI')
def ask_ai():
    return render_template('ask-AI.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/navbar')
def navbar():
    return render_template('navbar.html')

@app.route('/footer')
def footer():
    return render_template('footer.html')

@app.route('/get-api-key')
def get_api_key():
    return jsonify({'apiKey': WEATHER_API_KEY})

@app.route('/send-otp', methods=['POST'])
def send_otp_route():
    data = request.get_json()
    email = data.get('email')
    name = data.get('name')
    if not email:
        return jsonify({"error": "Email is required"}), 400
    otp = str(random.randint(100000, 999999))
    otp_storage[email] = otp
    send_otp(email, otp, name)
    return jsonify({"message": "OTP sent successfully"})

@app.route('/verify-otp', methods=['POST'])
def verify_otp():
    data = request.get_json()
    email = data.get('email')
    otp = data.get('otp')
    if not email or not otp:
        return jsonify({"error": "Email and OTP required"}), 400
    stored_otp = otp_storage.get(email)
    if otp == stored_otp:
        del otp_storage[email]
        return jsonify({"message": "OTP verified"}), 200
    return jsonify({"error": "Invalid OTP"}), 400

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not all([data.get('email'), data.get('password'), data.get('name')]):
        return jsonify({"error": "All fields are required"}), 400
    return jsonify({"message": "Registration successful"}), 200

@app.route('/login', methods=['POST'])
def login_user():
    data = request.get_json()
    if not all([data.get('email'), data.get('password')]):
        return jsonify({"error": "Email and password are required"}), 400
    return jsonify({"message": "Login successful"}), 200

@app.route('/predict', methods=['POST'])
def predict():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'})
    file = request.files['image']
    img = load_img(BytesIO(file.read()), target_size=(100, 100))
    img_array = img_to_array(img) / 255.0
    img_array = np.expand_dims(img_array, axis=0)
    prediction = model.predict(img_array)
    predicted_index = np.argmax(prediction)
    confidence = round(100 * np.max(prediction), 2)
    predicted_label = inv_code[predicted_index]
    return jsonify({'label': predicted_label, 'confidence': float(confidence)})

@app.route('/get-tools', methods=['GET'])
def get_tools():
    tools = []
    for grid_out in fs.find():
        image_data = base64.b64encode(grid_out.read()).decode('utf-8')
        title = grid_out.metadata.get('title', 'Untitled')
        description = grid_out.metadata.get('description', 'No description')
        tools.append({
            'title': title,
            'description': description,
            'image': f"data:image/jpeg;base64,{image_data}",
            'file_id': str(grid_out._id)
        })
    return jsonify({'tools': tools})

@app.route('/get-cold-storage', methods=['POST'])
def get_cold_storage():
    pincode = request.form['pincode']
    radius = int(request.form.get('radius', 10)) * 1000
    geocode_url = f"https://maps.gomaps.pro/maps/api/geocode/json?address={pincode}&key={GOOGLE_MAPS_API_KEY}"
    geo_res = requests.get(geocode_url).json()
    if not geo_res.get('results'):
        return jsonify({"error": "Invalid PIN code"})
    loc = geo_res['results'][0]['geometry']['location']
    nearby_url = (
        f"https://maps.gomaps.pro/maps/api/place/nearbysearch/json?"
        f"location={loc['lat']},{loc['lng']}&radius={radius}&keyword=cold+storage&key={GOOGLE_MAPS_API_KEY}"
    )
    nearby_res = requests.get(nearby_url).json()
    cold_storage = [{
        "name": p.get('name'),
        "address": p.get('vicinity'),
        "lat": p['geometry']['location']['lat'],
        "lng": p['geometry']['location']['lng'],
        "rating": p.get('rating', 'No rating'),
        "place_id": p.get('place_id')
    } for p in nearby_res.get('results', [])]
    return jsonify({"cold_storage": cold_storage, "has_more": 'next_page_token' in nearby_res})

@app.route('/get_crop_info', methods=['POST'])
def get_crop_info():
    crop_name = request.get_json().get('crop')
    if not crop_name:
        return jsonify({"error": "No crop name provided"}), 400
    prompt = f"Provide detailed info about {crop_name}: growing conditions, care tips, issues, and harvest."
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    headers = {'Content-Type': 'application/json'}
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
    response = requests.post(url, headers=headers, json=payload)
    if response.status_code == 200:
        result = response.json()
        text = result.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')
        return jsonify({"info": text})
    return jsonify({"error": "Failed to fetch crop info"}), 500

@app.route('/store_user', methods=['POST'])
def store_user():
    try:
        data = request.json
        email = data.get('email')
        name = data.get('name')
        
        if not email or not name:
            return jsonify({'error': 'Email and name are required'}), 400
            
        # Store user data in MongoDB
        user_data = {
            'email': email,
            'name': name
        }
        
        # Check if user already exists
        existing_user = db.user.find_one({'email': email})
        if existing_user:
            return jsonify({'error': 'User already exists'}), 400
            
        print("Uploaded")
        # Insert new user
        db.user.insert_one(user_data)
        return jsonify({'message': 'User stored successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/get_user', methods=['POST'])
def get_user():
    try:
        data = request.json
        email = data.get('email')
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
            
        # Get user data from MongoDB
        user = db.user.find_one({'email': email})
        
        if user:
            return jsonify({
                'name': user['name'],
                'email': user['email']
            }), 200
        else:
            return jsonify({'error': 'User not found'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port)
