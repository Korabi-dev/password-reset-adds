# Password Reset System for Active Directory

This project is a Node.js-based web application that provides a secure and efficient way to reset user passwords in an Active Directory environment. It includes features such as email-based password reset codes, rate limiting, and endpoint security.

## Disclaimer
While I have used best practices, and have made this very secure, 

Running this webserver standalone, meaning it can be accessed by anyone on the local network where the server is, WILL lead to your WHOLE DOMAIN being compromised.

The only recommended use is as follows:

The webserver is running on a dedicated user as a service (using [nssm](https://nssm.cc/)),
It is not accessible on the local network, meaning the port for it is EXPLICITLY blocked in your firewall
A [cloudflare tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) or other reverse proxy that is secure is the only way to access it


\- I DO NOT take any responsibility if you incorrectly set this up, and then have your domain compromised, you have been warned.<br>
\- If you are an organization handling sensitive information, DO NOT use this, theres much better (however paid) stuff out there, like the [ManageEngine Suite](https://www.manageengine.com/)

## Features

- **Password Reset via Email**: Users can request a password reset code, which is sent to their email.
- **Secure Code Validation**: The system validates the reset code and ensures it hasn't expired.
- **Active Directory Integration**: Passwords are reset using a PowerShell script that interacts with Active Directory.
- **Rate Limiting**: Prevents abuse by limiting the number of requests per IP address.
- **Endpoint Security**: Protects sensitive endpoints with a secure token.
- **MongoDB Integration**: Stores user and code data in a MongoDB database.

## Why
LDAP support for NodeJS, and python SUCK for changing passwords, especially for active directory

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Active Directory environment
- PowerShell installed on the server
- SMTP server for sending emails

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Korabi-dev/password-reset-adds.git
   cd password-reset-adds
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure the application:
   - Copy `example.config.js` to `config.js`:
     ```bash
     copy example.config.js config.js
     ```
   - Update `config.js` with your environment-specific values or set the corresponding environment variables.

4. Ensure the PowerShell script `changepass.ps1` has the necessary permissions to reset passwords in Active Directory, by this I mean your local user on the server this is running on is an admin.

## Usage

1. Start the server:
   ```bash
   node index.js
   ```

2. The server will run on the port specified in the configuration (`config.js` or environment variable `port`).

3. Use the following endpoints:

   ### Endpoints

   ### Response Template

   Error Response
   ```json
   {"error": true, "message": String}
   ```

   Success Response
   ```json
   {"error": false}
   ```

   #### 1. **Request a New Code**
   - **POST** `/codes/new`
   - **Body**:
     ```json
     {
       "email": "user@example.com",
       "username": "username"
     }
     ```
   - **Response**: Sends a reset code to the user's email.

   #### 2. **Validate Code and Reset Password**
   - **POST** `/codes/validate`
   - **Body**:
     ```json
     {
       "email": "user@example.com",
       "username": "username",
       "code": "1234",
       "newPassword": "newPassword123"
     }
     ```
   - **Response**: Resets the password if the code is valid.

   #### 3. **Create a New User**
   - **POST** `/users/new`
   - **Headers**:
     ```json
     {
       "Authorization": "your-secure-token"
     }
     ```
   - **Body**:
     ```json
     {
       "email": "user@example.com",
       "username": "username"
     }
     ```
   - **Response**: Creates a new user in the database.

   #### 4. **Delete a User**
   - **POST** `/users/delete`
   - **Headers**:
     ```json
     {
       "Authorization": "your-secure-token"
     }
     ```
   - **Body**:
     ```json
     {
       "email": "user@example.com",
       "username": "username"
     }
     ```
   - **Response**: Deletes the user from the database.

## Environment Variables

The application can be configured using the following environment variables:

| Variable         | Description                          |
|------------------|--------------------------------------|
| `mongodb`        | MongoDB connection string           |
| `emailHost`      | SMTP host                           |
| `emailPort`      | SMTP port                           |
| `emailUser`      | SMTP username                       |
| `emailPass`      | SMTP password                       |
| `emailFrom`      | Sender email address                |
| `emailSubject`   | Subject for password reset emails   |
| `emailHTML`      | HTML template for reset emails      |
| `expiryTime`     | Code expiry time in seconds         |
| `token`          | Secure token for endpoint protection |
| `port`           | Port for the server to run on       |

## Security

- Ensure the `config.js` file is not committed to version control by keeping it in `.gitignore`.
- Use a strong, randomly generated token for the `token` configuration.
- Use HTTPS in production to secure communication.


## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## Acknowledgments

- [Express](https://expressjs.com/) for the web framework.
- [Mongoose](https://mongoosejs.com/) for MongoDB integration.
- [Nodemailer](https://nodemailer.com/) for email handling.
- [Helmet](https://helmetjs.github.io/) for securing HTTP headers.

## Use of Large Language Models (LLMs)

I believe firmly that any self-respecting programmer should disclose when they've used AI to help with development.

I have used OpenAI's GPT-4o model to write all the comments on the code for this, I do realize it's way too much and is practically unreadable, but this repo is not meant for someone who knows JS.

It also wrote this very README, before I modified it myself, can you tell which ones were me??

## License

Copyright 2025 Korab Arifi

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

---
