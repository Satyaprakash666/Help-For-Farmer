from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import random, base64, os, numpy as np, requests
from email.mime.text import MIMEText
from pymongo import MongoClient
import gridfs, time
import firebase_admin
from firebase_admin import credentials, auth
import json, base64
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import load_img, img_to_array
from io import BytesIO
from dotenv import load_dotenv
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

app = Flask(__name__)
CORS(app)
load_dotenv() 

MONGO_URI = os.environ.get("MONGO_URI")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GOOGLE_MAPS_API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY")
WEATHER_API_KEY = os.environ.get("WEATHER_API_KEY")
TOKEN_JSON = os.environ.get("GMAIL_TOKEN_JSON")
# FIREBASE_WEB_API_KEY = os.environ.get("FIREBASE_WEB_API_KEY")
FIREBASE_ADMIN_JSON = os.environ.get("FIREBASE_SERVICE_ACCOUNT")


SCOPES = ['https://www.googleapis.com/auth/gmail.send']


client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
db = client['help_for_farmer']
fs = gridfs.GridFS(db, collection="tools")
# MongoDB connection
fs2 = gridfs.GridFS(db, collection="user")


otp_storage = {}

firebase_ready = False

if FIREBASE_ADMIN_JSON:
    try:
        service_account_info = json.loads(FIREBASE_ADMIN_JSON)
        fire_cred = credentials.Certificate(service_account_info)
        firebase_admin.initialize_app(fire_cred)
        firebase_ready = True
        print("✅ Firebase Admin connected.")
    except Exception as e:
        print(f"⚠️ Firebase initialization failed: {e}")
else:
    print("⚠️ Warning: FIREBASE_SERVICE_ACCOUNT not found. Auth features will be disabled.")


def get_gmail_service():
    if not TOKEN_JSON:
        raise Exception("GMAIL_TOKEN_JSON is missing in environment variables")
    
    creds_data = json.loads(TOKEN_JSON)
    creds = Credentials.from_authorized_user_info(creds_data, SCOPES)

    if creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
        except Exception as e:
            raise Exception("Refresh token invalid. Regenerate GMAIL_TOKEN_JSON.") from e
        
    if not creds.valid:
        raise Exception("Gmail credentials are invalid.")

    return build('gmail', 'v1', credentials=creds)

def send_otp(service, email, otp, name):
    subject = "HelpForFarmer Login Verification - OTP Code Inside"
    body = f"""
<html>
<head>
<style>
    body {{
        font-family: 'Arial', sans-serif;
        color: #333;
        background-color: #f9f9f9;
        margin: 0;
        padding: 0;
    }}

    .container {{
        max-width: 650px;
        margin: 30px auto;
        background-color: #ffffff;
        padding: 30px;
        border-radius: 10px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.1);
    }}

    h2, h3 {{
        text-align: center;
        margin: 20px 0;
    }}

    h2 {{
        font-size: 28px;
        color: #000000;
        letter-spacing: 1px;
    }}

    h3 {{
        color: #1a1a1a;
    }}

    p {{
        font-size: 16px;
        line-height: 1.6;
    }}

    ul {{
        margin-left: 0;
        padding-left: 0;
        list-style: none;
    }}

    ul li {{
        margin: 12px 0;
        line-height: 1.5;
        padding-left: 12px;
        border-left: 4px solid #1a73e8;
        background-color: #f0f7ff;
        border-radius: 4px;
        padding: 8px 12px;
    }}

    ul li strong {{
        color: #1a73e8;
        font-weight: 600;
    }}

    .otp-box {{
        width: 80%;     
        max-width: 330px;     
        margin: 20px auto;
        background: linear-gradient(90deg, #e3f2fd, #bbdefb);
        border: 1px dashed #1a73e8;
        padding: 15px;
        text-align: center;
        border-radius: 6px;
        font-weight: bold;
        font-size: 24px;
        letter-spacing: 2px;
        animation: fadeIn 1s ease-in-out;
        color: #000000;
    }}
    @media (min-width: 768px) {{
        .otp-box {{
            width: 30%; 
        }}
    }}
    

    .security-notice {{
        color: #c9302c;
        font-weight: bold;
        padding: 10px;
        border-left: 4px solid #c9302c;
        background-color: #fce8e6;
        border-radius: 5px;
    }}

    .footer {{
        font-size: 14px;
        color: #666666;
        text-align: center;
        margin-top: 20px;
    }}

    a.btn {{
        display: inline-block;
        background-color: #1a73e8;
        color: #ffffff !important;
        text-decoration: none;
        padding: 12px 24px;
        border-radius: 5px;
        font-weight: 600;
        margin: 20px 0;
    }}

    a.btn:hover {{
        background-color: #1558b0;
        transition: 0.3s;
    }}

    hr {{
        border: none;
        border-top: 1px solid #e0e0e0;
        margin: 30px 0;
    }}

    @keyframes fadeIn {{
        0% {{opacity: 0; transform: translateY(-10px);}}
        100% {{opacity: 1; transform: translateY(0);}}
    }}

    @media only screen and (max-width: 600px) {{
        .container {{
            width: 90% !important;
            padding: 20px !important;
        }}
        h2 {{
            font-size: 24px !important;
        }}
        .otp-box {{
            font-size: 20px !important;
            padding: 12px !important;
        }}
        a.btn {{
            padding: 10px 20px !important;
        }}
        ul li {{
            font-size: 14px !important;
            padding: 6px 10px !important;
        }}
    }}
</style>

</head>
<body>
    <div class="container">
        <p>Hello <strong>{name}</strong>,</p>

        <p>Thank you for joining HelpForFarmer!<br>
        We're thrilled to have you on board and help you farm smarter with technology.<br>
        To securely access your account and start using all our farming tools, please use the One-Time Password (OTP) below:</p>

        <p>🔐 <strong>Your One-Time Password (OTP) is:</strong></p>

        <div class="otp-box"> <strong>{otp}</strong> </div>

        <p>Please enter this code within the next <strong>5 minutes</strong> to verify your identity and continue securely.</p>

        <div class="security-notice">
            🚨 Security Notice:<br>
            Do <strong>not</strong> share this OTP with anyone — not even HelpForFarmer staff. This OTP is strictly private and helps protect your account from unauthorized access.
        </div>

        <hr>

        <h3>🌿 Why Use HelpForFarmer?</h3>
        <ul>
            <li>🌱 <strong>AI-Based Crop Disease Detection</strong> – Upload a photo and get instant diagnosis.</li>
            <li>🏭 <strong>Nearby Cold Storage Finder</strong> – Use our map tool to locate and navigate to storage facilities.</li>
            <li>📖 <strong>Expert Crop Guidance</strong> – Know what to plant, when to plant, and how to grow smarter.</li>
            <li>☀️ <strong>Weather Forecast</strong> – Stay prepared with real-time weather updates and detailed 5-day forecasts for your farming region.</li>
            <li>🛠️ <strong>Tool & Technology Info</strong> – Explore the latest agricultural tools and technologies shared through our platform to stay ahead in modern farming.</li>
        </ul>

        <p>Your one login opens access to a full suite of features designed for modern-day farming — powered by technology, made for you.</p>

        <a href="https://helpforfarmer.onrender.com" class="btn">Visit HelpForFarmer</a>

        <hr>

        <p>If you did not make this login request, you can safely ignore this email. No changes will be made without entering the OTP.</p>

        <div class="footer">
            <p>Need help? Contact us at: <strong>helpforfarmer@gmail.com</strong></p>
            <p>Thank you,<br>
            <strong>HelpForFarmer Security Team</strong><br>
            🌐 <a href="https://helpforfarmer.onrender.com">Visit HelpForFarmer</a><br>
            <em>Growing with technology — for every farmer.</em></p>
        </div>
    </div>
</body>
</html>
    """
    message = MIMEText(body, "html")
    message['to'] = email
    message['subject'] = subject

    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
    return service.users().messages().send(userId="me", body={'raw': raw}).execute()


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
    return render_template('storage.html', API_KEY=GOOGLE_MAPS_API_KEY)

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

    try:
        is_user = auth.get_user_by_email(email)
        return jsonify({"error": "Email is already registered. Please login instead."}), 400
    except auth.UserNotFoundError:
        # Email not registered, continue
        pass
    except Exception as e:

        if "Malformed email address" in str(e):
            return jsonify({
                "error": "The email address format is incorrect. Please enter a valid email address.",
                "errorCode": "invalid-email"
            }), 400
        
        return jsonify({"error": e}), 500

    otp = str(random.randint(100000, 999999))
    
    try:
        service = get_gmail_service()  
        send_otp(service, email, otp, name)
        otp_storage[email.lower()] = otp

        return jsonify({"message": "✅ OTP sent successfully"}), 200
    except Exception as e:
        return jsonify({"error": "OTP could not be sent at the moment. Please try again later."}), 500
    

@app.route('/verify-otp', methods=['POST'])
def verify_otp():
    data = request.get_json()
    email = data.get('email')
    otp = data.get('otp')
    if not email or not otp:
        return jsonify({"error": "Email and OTP required"}), 400
    stored_otp = otp_storage.get(email.lower())
    if otp == stored_otp:
        return jsonify({"message": "OTP verified"}), 200
    return jsonify({"error": "OTP is invalid or expired. Please verify again."}), 400


@app.route('/register', methods=['POST'])
def register_user_with_otp():
    try:
        data = request.json
        email = data.get('email')
        name = data.get('name')
        password = data.get('password')
        otp = data.get('otp')

        if not all([email, name, password, otp]):
            return jsonify({"error": "Please fill in all fields and verify OTP.", "errorCode": "missing-fields"}), 400

        stored_otp = otp_storage.get(email.lower())
        if not stored_otp or str(otp).strip() != str(stored_otp).strip():
            return jsonify({"error": "OTP is invalid or expired", "errorCode": "invalid-otp"}), 400

        try:
            user_record = auth.create_user(
                email=email,
                password=password,
                display_name=name
            )
        except Exception as e:
            msg_lower = str(e).lower()
            error_code = "firebase-error"
            error_message = "Server error occurred while creating account. Please try again later."

            if "already exists" in msg_lower:
                error_code = "user-exists"
                error_message = "This email is already registered. Please use another email or login."

            elif "invalid email" in msg_lower:
                error_code = "invalid-email"
                error_message = "Please enter a valid email address."

            elif "password must be a" in msg_lower or "weak password" in msg_lower:
                error_code = "weak-password"
                error_message = "Password should contain at least 6 characters."
                error_message = "Password is too weak. Please use a stronger password."

            elif "operation not allowed" in msg_lower:
                error_code = "operation-not-allowed"
                error_message = "Email/password accounts are not enabled. Please contact support."

            # print(str(e))

            return jsonify({"errorCode": error_code,"error": error_message}), 400

        del otp_storage[email.lower()]
        store_resp = store_user(email=email, name=name)

        response = {
            "message": "User created successfully",
            # "uid": user_record.uid,
            "email": user_record.email,
            "name": user_record.display_name,
        }
        return jsonify(response)

    except Exception as e:
        # print(str(e))
        return jsonify({"error": "An unexpected server error occurred. Please try again later.", "errorCode": "server-error"}), 500
    

@app.route('/signIn', methods=['POST'])
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
    try:
        tools = []
        for grid_out in fs.find():
            image_data = base64.b64encode(grid_out.read()).decode('utf-8')
            metadata = grid_out.metadata if grid_out.metadata else {}
            title = metadata.get('title', 'Untitled')
            description = metadata.get('description', 'No description available')
            link = metadata.get('link', '#')
            
            tools.append({
                'title': title,
                'description': description,
                'link': link,
                'image': f"data:image/jpeg;base64,{image_data}",
                'file_id': str(grid_out._id)
            })
        return jsonify({'tools': tools})
    except Exception as e:
        print(f"Error retrieving tools: {str(e)}")  # Debug log
        return jsonify({'error': f'Error retrieving tools: {e}'})

# @app.route('/get-cold-storage', methods=['POST'])
# def get_cold_storage():
#     pincode = request.form['pincode']
#     radius = int(request.form.get('radius', 10)) * 1000
#     geocode_url = f"https://maps.gomaps.pro/maps/api/geocode/json?address={pincode}&key={GOOGLE_MAPS_API_KEY}"
#     geo_res = requests.get(geocode_url).json()
#     if not geo_res.get('results'):
#         return jsonify({"error": "Invalid PIN code"})
#     loc = geo_res['results'][0]['geometry']['location']
#     nearby_url = (
#         f"https://maps.gomaps.pro/maps/api/place/nearbysearch/json?"
#         f"location={loc['lat']},{loc['lng']}&radius={radius}&keyword=cold+storage&key={GOOGLE_MAPS_API_KEY}"
#     )
#     nearby_res = requests.get(nearby_url).json()
#     cold_storage = [{
#         "name": p.get('name'),
#         "address": p.get('vicinity'),
#         "lat": p['geometry']['location']['lat'],
#         "lng": p['geometry']['location']['lng'],
#         "rating": p.get('rating', 'No rating'),
#         "place_id": p.get('place_id')
#     } for p in nearby_res.get('results', [])]
#     return jsonify({"cold_storage": cold_storage, "has_more": 'next_page_token' in nearby_res})


@app.route('/get-cold-storage', methods=['POST'])
def get_cold_storage():
    pincode = request.form['pincode']
    radius = int(request.form.get('radius', 10)) * 1000

    # Correct Geocoding API URL
    geocode_url = (
        f"https://maps.googleapis.com/maps/api/geocode/json"
        f"?address={pincode}&key={GOOGLE_MAPS_API_KEY}"
    )

    geo_res = requests.get(geocode_url).json()

    if geo_res.get('status') != "OK":

        return jsonify({
            "error": "There is a problem.",
            "status": geo_res.get('status')
        })
        # return jsonify({
        #     "error": geo_res.get('error_message', 'Geocoding failed'),
        #     "status": geo_res.get('status')
        # })

    loc = geo_res['results'][0]['geometry']['location']

    # Correct Places Nearby API URL
    nearby_url = (
        f"https://maps.googleapis.com/maps/api/place/nearbysearch/json"
        f"?location={loc['lat']},{loc['lng']}"
        f"&radius={radius}"
        f"&keyword=cold+storage"
        f"&key={GOOGLE_MAPS_API_KEY}"
    )

    nearby_res = requests.get(nearby_url).json()
    print(nearby_res)

    cold_storage = [{
        "name": p.get('name'),
        "address": p.get('vicinity'),
        "lat": p['geometry']['location']['lat'],
        "lng": p['geometry']['location']['lng'],
        "rating": p.get('rating', 'No rating'),
        "place_id": p.get('place_id')
    } for p in nearby_res.get('results', [])]

    return jsonify({
        "cold_storage": cold_storage,
        "has_more": 'next_page_token' in nearby_res
    })




# @app.route('/get_crop_info', methods=['POST'])
# def get_crop_info():
#     crop_name = request.get_json().get('crop')
#     if not crop_name:
#         return jsonify({"error": "No crop name provided"}), 400
#     prompt = f"Provide detailed info about {crop_name}: growing conditions, care tips, issues, and harvest."
#     payload = {"contents": [{"parts": [{"text": prompt}]}]}
#     headers = {'Content-Type': 'application/json'}
#     url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
#     # url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key={GEMINI_API_KEY}"
#     response = requests.post(url, headers=headers, json=payload)
#     if response.status_code == 200:
#         result = response.json()
#         text = result.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')
#         return jsonify({"info": text})
#     print(response.status_code, response.text)  # Debug log
#     return jsonify({"error": "Failed to fetch crop info"}), 500


@app.route('/get_crop_info', methods=['POST'])
def get_crop_info():
    crop_name = request.get_json().get('crop')
    if not crop_name:
        return jsonify({"error": "No crop name provided"}), 400
    # Payload for Gemini 3
    payload = {
        "contents": [{"parts": [{"text": f"Provide detailed info about {crop_name}: growing conditions, care tips, issues, and harvest."}]}],
        "generationConfig": {
            # NEW: Thinking level is unique to Gemini 3. 
            # 'low' is fast; 'high' is for very complex reasoning.
            "thinking_config": {"thinking_level": "low"},
            "temperature": 1.0, # Recommended default for Gemini 3
        }
    }
    headers = {'Content-Type': 'application/json'}
    # URL updated to Gemini 3 Flash Preview
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key={GEMINI_API_KEY}"
    try:
        response = requests.post(url, headers=headers, json=payload)
        if response.status_code == 200:
            result = response.json()
            # Extraction logic remains the same
            text = result.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')
            return jsonify({"info": text})
            
        return jsonify({"error": f"API Error: {response.text}"}), response.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@app.route('/store_user', methods=['POST'])
def store_user(email=None, name=None):
    try:
        # If email and name are not provided as arguments, read from request.json
        if email is None or name is None:
            data = request.json
            email = data.get('email')
            name = data.get('name')

        if not email or not name:
            return jsonify({'error': 'Email and name are required'}), 400

        result = db.user.update_one(
            {'email': email},          # filter
            {'$set': {'name': name}},  # update
            upsert=True                # insert if not exists
        )

        if result.matched_count > 0:
            message = 'User updated successfully'
        else:
            message = 'User created successfully'

        return jsonify({'message': message}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/get_user', methods=['POST'])
def get_user():
    try:
        email = request.json.get('email')
        
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
    app.run(host='0.0.0.0', port=5000, debug=True)
    # app.run(host='localhost', port=5000, debug=True)
    # app.run(port=5000, debug=True)
