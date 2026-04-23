import bcrypt
password = b"123"
hashed = bcrypt.hashpw(password, bcrypt.gensalt())
print(hashed.decode())
