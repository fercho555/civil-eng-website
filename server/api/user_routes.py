from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask import request, jsonify
from flask_jwt_extended import create_access_token
from werkzeug.security import check_password_hash
from flask_pymongo import PyMongo  # (only needed if you access mongo here)
from bson.json_util import dumps  # for potential user serialization

user_bp = Blueprint('user_bp', __name__)

@user_bp.route('/profile')
@jwt_required()
def profile():
    user_identity = get_jwt_identity()
    # Return user info, minimal example:
    return jsonify({"username": user_identity})


# Ensure you already created user_bp earlier in this file

@user_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    if not username or not password:
        return jsonify({"error": "Missing username or password"}), 400

    # Import your mongo object. Usually you initialized PyMongo as mongo = PyMongo(app) in app.py
    from flask import current_app
    mongo = current_app.extensions['pymongo']

    user = mongo.db.users.find_one({"username": username})
    if user is None or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid username or password"}), 401

    access_token = create_access_token(identity=username)
    return jsonify(access_token=access_token), 200

