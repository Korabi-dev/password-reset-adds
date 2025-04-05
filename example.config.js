module.exports = {
  mongodb: "mongodb://localhost:27017/your-database-name", // MongoDB connection string
  emailHost: "smtp.example.com", // SMTP host for sending emails
  emailPort: 587, // SMTP port (e.g., 587 for TLS, 465 for SSL)
  emailUser: "your-email@example.com", // SMTP username
  emailPass: "your-email-password", // SMTP password
  emailFrom: "no-reply@example.com", // Sender email address
  emailSubject: "Your Password Reset Code", // Subject for the password reset email
  emailHTML: "<p>Your reset code is: {code}</p><p>It will expire in {expires} seconds.</p>", // HTML template for the email
  expiryTime: 300, // Code expiry time in seconds (e.g., 300 seconds = 5 minutes)
  token: "your-secure-token", // Secure token for endpoint protection, use a 32 character string generated using openssl rand -hex 32
  // Example: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
  port: 3000, // Port for the server to run on, why do we even use port 3000 so much? I don't know, go ask someone smarter
};