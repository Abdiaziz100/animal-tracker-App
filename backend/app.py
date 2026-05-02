from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import requests
import os

app = Flask(__name__)
CORS(app)

# ── Config ──────────────────────────────────────────────────────────────────
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
    "DATABASE_URL", "sqlite:///livestock.db"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET", "govt-livestock-secret-2024-secure")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=24)

db = SQLAlchemy(app)
jwt = JWTManager(app)
expo_tokens = {}

# ── Models ───────────────────────────────────────────────────────────────────
class User(db.Model):
    id           = db.Column(db.Integer, primary_key=True)
    full_name    = db.Column(db.String(120), nullable=False)
    email        = db.Column(db.String(120), unique=True, nullable=False)
    phone        = db.Column(db.String(20))
    farm_name    = db.Column(db.String(120))
    farm_location= db.Column(db.String(200))
    password     = db.Column(db.String(256), nullable=False)
    role         = db.Column(db.String(20), default="farmer")   # farmer | vet | admin
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)
    animals      = db.relationship("Animal", backref="owner", lazy=True, cascade="all, delete-orphan")

class Animal(db.Model):
    id           = db.Column(db.Integer, primary_key=True)
    name         = db.Column(db.String(80), nullable=False)
    species      = db.Column(db.String(50), default="Cattle")   # Cattle, Sheep, Goat, Camel
    breed        = db.Column(db.String(80))
    tag_id       = db.Column(db.String(50))                     # ear tag / RFID
    age_years    = db.Column(db.Float, default=0)
    weight_kg    = db.Column(db.Float, default=0)
    gender       = db.Column(db.String(10), default="Unknown")
    color        = db.Column(db.String(50))
    health_status= db.Column(db.String(20), default="Healthy")  # Healthy | Sick | Quarantine
    lat          = db.Column(db.Float, default=0)
    lng          = db.Column(db.Float, default=0)
    status       = db.Column(db.String(10), default="IN")       # IN | OUT
    user_id      = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)
    health_records = db.relationship("HealthRecord", backref="animal", lazy=True, cascade="all, delete-orphan")
    location_history = db.relationship("LocationHistory", backref="animal", lazy=True, cascade="all, delete-orphan")

class HealthRecord(db.Model):
    id           = db.Column(db.Integer, primary_key=True)
    animal_id    = db.Column(db.Integer, db.ForeignKey("animal.id"), nullable=False)
    record_type  = db.Column(db.String(50))   # Vaccination | Treatment | Checkup
    description  = db.Column(db.String(500))
    vet_name     = db.Column(db.String(120))
    date         = db.Column(db.DateTime, default=datetime.utcnow)
    next_due     = db.Column(db.DateTime)

class LocationHistory(db.Model):
    id           = db.Column(db.Integer, primary_key=True)
    animal_id    = db.Column(db.Integer, db.ForeignKey("animal.id"), nullable=False)
    lat          = db.Column(db.Float)
    lng          = db.Column(db.Float)
    status       = db.Column(db.String(10))
    timestamp    = db.Column(db.DateTime, default=datetime.utcnow)

class Geofence(db.Model):
    id           = db.Column(db.Integer, primary_key=True)
    user_id      = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    name         = db.Column(db.String(120), default="Main Farm")
    center_lat   = db.Column(db.Float, default=-1.29)
    center_lng   = db.Column(db.Float, default=36.82)
    radius_km    = db.Column(db.Float, default=5.0)
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)

with app.app_context():
    db.create_all()

# ── Helpers ──────────────────────────────────────────────────────────────────
def haversine_km(lat1, lng1, lat2, lng2):
    from math import radians, sin, cos, sqrt, atan2
    R = 6371
    dlat = radians(lat2 - lat1)
    dlng = radians(lng2 - lng1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng/2)**2
    return R * 2 * atan2(sqrt(a), sqrt(1 - a))

def send_push(user_id, title, body):
    token = expo_tokens.get(int(user_id))
    if not token:
        return
    try:
        requests.post("https://exp.host/--/api/v2/push/send", json={
            "to": token, "title": title, "body": body,
            "sound": "default", "priority": "high"
        }, timeout=5)
    except Exception:
        pass

def animal_to_dict(a):
    return {
        "id": a.id, "name": a.name, "species": a.species, "breed": a.breed,
        "tag_id": a.tag_id, "age_years": a.age_years, "weight_kg": a.weight_kg,
        "gender": a.gender, "color": a.color, "health_status": a.health_status,
        "lat": a.lat, "lng": a.lng, "status": a.status,
        "created_at": a.created_at.isoformat()
    }

# ── AUTH ─────────────────────────────────────────────────────────────────────
@app.route("/api/register", methods=["POST"])
def register():
    d = request.json
    if User.query.filter_by(email=d["email"]).first():
        return {"error": "Email already registered"}, 400
    user = User(
        full_name=d.get("full_name", ""),
        email=d["email"],
        phone=d.get("phone", ""),
        farm_name=d.get("farm_name", ""),
        farm_location=d.get("farm_location", ""),
        password=generate_password_hash(d["password"])
    )
    db.session.add(user)
    db.session.commit()
    # Create default geofence
    gf = Geofence(user_id=user.id)
    db.session.add(gf)
    db.session.commit()
    token = create_access_token(identity=str(user.id))
    return {"token": token, "user_id": user.id, "full_name": user.full_name}

@app.route("/api/login", methods=["POST"])
def login():
    d = request.json
    user = User.query.filter_by(email=d["email"]).first()
    if not user or not check_password_hash(user.password, d["password"]):
        return {"error": "Invalid credentials"}, 401
    if "expo_token" in d:
        expo_tokens[user.id] = d["expo_token"]
    token = create_access_token(identity=str(user.id))
    return {"token": token, "user_id": user.id, "full_name": user.full_name,
            "farm_name": user.farm_name, "role": user.role}

@app.route("/api/profile", methods=["GET"])
@jwt_required()
def get_profile():
    uid = int(get_jwt_identity())
    user = User.query.get_or_404(uid)
    return jsonify({
        "id": user.id, "full_name": user.full_name, "email": user.email,
        "phone": user.phone, "farm_name": user.farm_name,
        "farm_location": user.farm_location, "role": user.role,
        "created_at": user.created_at.isoformat()
    })

@app.route("/api/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    uid = int(get_jwt_identity())
    user = User.query.get_or_404(uid)
    d = request.json
    for field in ["full_name", "phone", "farm_name", "farm_location"]:
        if field in d:
            setattr(user, field, d[field])
    db.session.commit()
    return {"message": "Profile updated"}

# ── ANIMALS ──────────────────────────────────────────────────────────────────
@app.route("/api/animals", methods=["GET"])
@jwt_required()
def get_animals():
    uid = int(get_jwt_identity())
    animals = Animal.query.filter_by(user_id=uid).all()
    return jsonify([animal_to_dict(a) for a in animals])

@app.route("/api/animals", methods=["POST"])
@jwt_required()
def add_animal():
    uid = int(get_jwt_identity())
    d = request.json
    animal = Animal(
        name=d["name"], species=d.get("species", "Cattle"),
        breed=d.get("breed", ""), tag_id=d.get("tag_id", ""),
        age_years=d.get("age_years", 0), weight_kg=d.get("weight_kg", 0),
        gender=d.get("gender", "Unknown"), color=d.get("color", ""),
        health_status=d.get("health_status", "Healthy"),
        lat=d.get("lat", -1.29), lng=d.get("lng", 36.82),
        status="IN", user_id=uid
    )
    db.session.add(animal)
    db.session.commit()
    return {"message": "Animal registered", "animal_id": animal.id}, 201

@app.route("/api/animals/<int:aid>", methods=["GET"])
@jwt_required()
def get_animal(aid):
    uid = int(get_jwt_identity())
    a = Animal.query.filter_by(id=aid, user_id=uid).first_or_404()
    data = animal_to_dict(a)
    data["health_records"] = [{
        "id": r.id, "record_type": r.record_type, "description": r.description,
        "vet_name": r.vet_name, "date": r.date.isoformat(),
        "next_due": r.next_due.isoformat() if r.next_due else None
    } for r in a.health_records]
    return jsonify(data)

@app.route("/api/animals/<int:aid>", methods=["PUT"])
@jwt_required()
def update_animal(aid):
    uid = int(get_jwt_identity())
    a = Animal.query.filter_by(id=aid, user_id=uid).first_or_404()
    d = request.json
    for field in ["name","species","breed","tag_id","age_years","weight_kg","gender","color","health_status"]:
        if field in d:
            setattr(a, field, d[field])
    db.session.commit()
    return {"message": "Animal updated"}

@app.route("/api/animals/<int:aid>", methods=["DELETE"])
@jwt_required()
def delete_animal(aid):
    uid = int(get_jwt_identity())
    a = Animal.query.filter_by(id=aid, user_id=uid).first_or_404()
    db.session.delete(a)
    db.session.commit()
    return {"message": "Animal deleted"}

# ── HEALTH RECORDS ────────────────────────────────────────────────────────────
@app.route("/api/animals/<int:aid>/health", methods=["POST"])
@jwt_required()
def add_health_record(aid):
    uid = int(get_jwt_identity())
    Animal.query.filter_by(id=aid, user_id=uid).first_or_404()
    d = request.json
    record = HealthRecord(
        animal_id=aid,
        record_type=d.get("record_type", "Checkup"),
        description=d.get("description", ""),
        vet_name=d.get("vet_name", ""),
        next_due=datetime.fromisoformat(d["next_due"]) if d.get("next_due") else None
    )
    db.session.add(record)
    db.session.commit()
    return {"message": "Health record added"}, 201

# ── GPS / GEOFENCE ────────────────────────────────────────────────────────────
@app.route("/api/update-location", methods=["POST"])
def update_location():
    d = request.json
    a = Animal.query.get_or_404(d["id"])
    old_status = a.status
    a.lat = d["lat"]
    a.lng = d["lng"]

    gf = Geofence.query.filter_by(user_id=a.user_id).first()
    if gf:
        dist = haversine_km(a.lat, a.lng, gf.center_lat, gf.center_lng)
        a.status = "OUT" if dist > gf.radius_km else "IN"
    else:
        dist = haversine_km(a.lat, a.lng, -1.29, 36.82)
        a.status = "OUT" if dist > 5.0 else "IN"

    # Save location history
    db.session.add(LocationHistory(animal_id=a.id, lat=a.lat, lng=a.lng, status=a.status))
    db.session.commit()

    if a.status == "OUT" and old_status == "IN":
        send_push(a.user_id, f"⚠️ {a.name} left the farm!", f"Location: {a.lat:.4f}, {a.lng:.4f}")

    return {"status": a.status, "animal_id": a.id}

@app.route("/api/animals/<int:aid>/history", methods=["GET"])
@jwt_required()
def location_history(aid):
    uid = int(get_jwt_identity())
    Animal.query.filter_by(id=aid, user_id=uid).first_or_404()
    history = LocationHistory.query.filter_by(animal_id=aid).order_by(LocationHistory.timestamp.desc()).limit(50).all()
    return jsonify([{
        "lat": h.lat, "lng": h.lng, "status": h.status,
        "timestamp": h.timestamp.isoformat()
    } for h in history])

# ── GEOFENCE ──────────────────────────────────────────────────────────────────
@app.route("/api/geofence", methods=["GET"])
@jwt_required()
def get_geofence():
    uid = int(get_jwt_identity())
    gf = Geofence.query.filter_by(user_id=uid).first()
    if not gf:
        return jsonify({"center_lat": -1.29, "center_lng": 36.82, "radius_km": 5.0})
    return jsonify({"id": gf.id, "name": gf.name, "center_lat": gf.center_lat,
                    "center_lng": gf.center_lng, "radius_km": gf.radius_km})

@app.route("/api/geofence", methods=["PUT"])
@jwt_required()
def update_geofence():
    uid = int(get_jwt_identity())
    gf = Geofence.query.filter_by(user_id=uid).first()
    if not gf:
        gf = Geofence(user_id=uid)
        db.session.add(gf)
    d = request.json
    for field in ["name", "center_lat", "center_lng", "radius_km"]:
        if field in d:
            setattr(gf, field, d[field])
    db.session.commit()
    return {"message": "Geofence updated"}

# ── DASHBOARD ─────────────────────────────────────────────────────────────────
@app.route("/api/dashboard", methods=["GET"])
@jwt_required()
def dashboard():
    uid = int(get_jwt_identity())
    animals = Animal.query.filter_by(user_id=uid).all()
    total    = len(animals)
    inside   = sum(1 for a in animals if a.status == "IN")
    outside  = sum(1 for a in animals if a.status == "OUT")
    healthy  = sum(1 for a in animals if a.health_status == "Healthy")
    sick     = sum(1 for a in animals if a.health_status == "Sick")
    by_species = {}
    for a in animals:
        by_species[a.species] = by_species.get(a.species, 0) + 1
    return jsonify({
        "total_animals": total, "inside_farm": inside, "outside_farm": outside,
        "healthy": healthy, "sick": sick, "by_species": by_species,
        "alerts": outside
    })

# ── GOVERNMENT REPORT ─────────────────────────────────────────────────────────
@app.route("/api/report", methods=["GET"])
@jwt_required()
def generate_report():
    uid = int(get_jwt_identity())
    user = User.query.get_or_404(uid)
    animals = Animal.query.filter_by(user_id=uid).all()
    return jsonify({
        "report_date": datetime.utcnow().isoformat(),
        "farmer": {
            "name": user.full_name, "email": user.email,
            "phone": user.phone, "farm_name": user.farm_name,
            "farm_location": user.farm_location
        },
        "summary": {
            "total_animals": len(animals),
            "by_species": {s: sum(1 for a in animals if a.species == s)
                           for s in set(a.species for a in animals)},
            "health_summary": {
                "healthy": sum(1 for a in animals if a.health_status == "Healthy"),
                "sick": sum(1 for a in animals if a.health_status == "Sick"),
                "quarantine": sum(1 for a in animals if a.health_status == "Quarantine")
            },
            "geofence_status": {
                "inside": sum(1 for a in animals if a.status == "IN"),
                "outside": sum(1 for a in animals if a.status == "OUT")
            }
        },
        "animals": [animal_to_dict(a) for a in animals]
    })

@app.route("/api/admin/users", methods=["GET"])
def admin_users():
    users = User.query.all()
    return jsonify([{
        "id": u.id,
        "full_name": u.full_name,
        "email": u.email,
        "farm_name": u.farm_name,
        "created_at": u.created_at.isoformat()
    } for u in users])

@app.route("/")
def home():
    return jsonify({"status": "🐄 Livestock Tracker API v2.0 - Government Edition"})

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
