x from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Animal
import requests

# Expo Push Token storage (in production, use database)
expo_tokens = {}

def send_push_notification(user_id, title, body):
    """Send Expo push notification"""
    token = expo_tokens.get(user_id)
    if not token:
        print(f"No Expo token for user {user_id}")
        return
    
    message = {
        "to": token,
        "title": title,
        "body": body,
        "sound": "default",
        "priority": "high",
        "data": {
            "type": "geofence_alert",
            "user_id": user_id
        }
    }
    
    try:
        response = requests.post(
            "https://exp.host/--/api/v2/push/send",
            json=message,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
        )
        print(f"Push notification sent: {response.text}")
    except Exception as e:
        print(f"Failed to send push notification: {e}")

def get_farm_boundaries():
    """Return geofence boundaries"""
    FARM_LAT = -1.29
    FARM_LNG = 36.82
    GEOFENCE_RADIUS = 0.05
    
    return {
        "center": {"lat": FARM_LAT, "lng": FARM_LNG},
        "radius": GEOFENCE_RADIUS,
        "bounds": {
            "northeast": {"lat": FARM_LAT + GEOFENCE_RADIUS, "lng": FARM_LNG + GEOFENCE_RADIUS},
            "southwest": {"lat": FARM_LAT - GEOFENCE_RADIUS, "lng": FARM_LNG - GEOFENCE_RADIUS}
        }
    }

def check_geofence(lat, lng):
    """Check if animal is inside geofence"""
    FARM_LAT = -1.29
    FARM_LNG = 36.82
    GEOFENCE_RADIUS = 0.05
    
    lat_diff = abs(lat - FARM_LAT)
    lng_diff = abs(lng - FARM_LNG)
    
    return lat_diff > GEOFENCE_RADIUS or lng_diff > GEOFENCE_RADIUS

def register_routes(app):
    """Register all API routes"""
    
    # AUTH
    @app.route("/api/register", methods=["POST"])
    def register():
        data = request.json
        if User.query.filter_by(email=data["email"]).first():
            return {"error": "Email already exists"}, 400
        
        user = User(email=data["email"], password=data["password"])
        db.session.add(user)
        db.session.commit()
        
        from flask_jwt_extended import create_access_token
        token = create_access_token(identity=user.id)
        return {"token": token, "user_id": user.id}

    @app.route("/api/login", methods=["POST"])
    def login():
        data = request.json
        user = User.query.filter_by(email=data["email"]).first()
        if user and user.password == data["password"]:
            from flask_jwt_extended import create_access_token
            token = create_access_token(identity=user.id)
            # Store Expo push token if provided
            if "expo_token" in data:
                expo_tokens[user.id] = data["expo_token"]
            return {"token": token, "user_id": user.id}
        return {"error": "Invalid credentials"}, 401

    # ANIMALS
    @app.route("/api/animals", methods=["POST"])
    @jwt_required()
    def add_animal():
        uid = get_jwt_identity()
        data = request.json
        animal = Animal(
            name=data["name"],
            lat=data["lat"],
            lng=data["lng"],
            status="IN",
            user_id=uid
        )
        db.session.add(animal)
        db.session.commit()
        return {"message": "Animal added", "animal_id": animal.id}

    @app.route("/api/animals", methods=["GET"])
    @jwt_required()
    def get_animals():
        uid = get_jwt_identity()
        animals = Animal.query.filter_by(user_id=uid).all()
        return jsonify([
            {
                "id": a.id,
                "name": a.name,
                "lat": a.lat,
                "lng": a.lng,
                "status": a.status
            } for a in animals
        ])

    @app.route("/api/animals/<int:id>", methods=["PUT"])
    @jwt_required()
    def update_animal(id):
        uid = get_jwt_identity()
        animal = Animal.query.filter_by(id=id, user_id=uid).first()
        if not animal:
            return {"error": "Animal not found"}, 404
        
        data = request.json
        if "name" in data:
            animal.name = data["name"]
        if "lat" in data:
            animal.lat = data["lat"]
        if "lng" in data:
            animal.lng = data["lng"]
        
        db.session.commit()
        return {"message": "Animal updated"}

    @app.route("/api/animals/<int:id>", methods=["DELETE"])
    @jwt_required()
    def delete_animal(id):
        uid = get_jwt_identity()
        animal = Animal.query.filter_by(id=id, user_id=uid).first()
        if not animal:
            return {"error": "Animal not found"}, 404
        
        db.session.delete(animal)
        db.session.commit()
        return {"message": "Animal deleted"}

    # GPS UPDATE (EAR DEVICE SIMULATION)
    @app.route("/api/update-location", methods=["POST"])
    def update_location():
        data = request.json
        animal = Animal.query.get(data["id"])
        if not animal:
            return {"error": "Animal not found"}, 404
        
        old_status = animal.status
        animal.lat = data["lat"]
        animal.lng = data["lng"]

        # GEOFENCE CHECK
        if check_geofence(animal.lat, animal.lng):
            animal.status = "OUT"
        else:
            animal.status = "IN"

        db.session.commit()
        
        # Send push notification if status changed to OUT
        if animal.status == "OUT" and old_status == "IN":
            send_push_notification(
                animal.user_id, 
                f"Alert: {animal.name} left the safe area!",
                f"Last seen at: {animal.lat:.4f}, {animal.lng:.4f}"
            )
        
        return {"status": animal.status, "animal_id": animal.id}

    # FARM BOUNDARIES
    @app.route("/api/farm-boundaries", methods=["GET"])
    @jwt_required()
    def get_farm_boundaries():
        return jsonify(get_farm_boundaries())

    # DASHBOARD STATS
    @app.route("/api/dashboard", methods=["GET"])
    @jwt_required()
    def dashboard():
        uid = get_jwt_identity()
        animals = Animal.query.filter_by(user_id=uid).all()
        
        total = len(animals)
        inside = len([a for a in animals if a.status == "IN"])
        outside = len([a for a in animals if a.status == "OUT"])
        
        return jsonify({
            "total_animals": total,
            "inside_farm": inside,
            "outside_farm": outside
        })

