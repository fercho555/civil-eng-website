import random

words = ["Coffee", "Jump", "Fercho", "Green", "Elephant", "Blue", "Sun", "Moon", "Dance", "Invisible", "Bird", "Fly"]
password = "".join(random.choices(words, k=3)) + str(random.randint(10,99)) + "!"
print(password)
