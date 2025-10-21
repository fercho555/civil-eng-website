from werkzeug.security import generate_password_hash, check_password_hash

pw = "tormentUp"
hash_pw = generate_password_hash(pw, method='pbkdf2:sha256')
print("Hash:", hash_pw)
print("Check:", check_password_hash(hash_pw, pw))
