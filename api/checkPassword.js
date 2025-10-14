const bcrypt = require('bcryptjs');

// Replace with the password user tries to login with
const inputPassword = 'clearStretch';

// Replace with the hash from your database (copy from the user document)
const storedHash = '$2b$10$ri4LrqpyZGfKc2CkK.3P4OY4tfzJMSRWzG09Sw4z1Zl5Ve2YbHB7S';

bcrypt.compare(inputPassword, storedHash).then(isMatch => {
  console.log('Password match:', isMatch);
}).catch(err => {
  console.error('Error comparing passwords:', err);
});
