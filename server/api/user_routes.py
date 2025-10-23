from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

user_bp = Blueprint('user_bp', __name__)

@user_bp.route('/profile')
@jwt_required()
def profile():
    user_identity = get_jwt_identity()
    # Return user info, minimal example:
    return jsonify({"username": user_identity})

