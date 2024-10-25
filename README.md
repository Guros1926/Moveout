#INTRODUCTION
This  is a product to help you label boxes when moving out

#1 Node
First of this project uses Node.js so you will have to download node.js https://nodejs.org/en/learn/getting-started/how-to-install-nodejs

#2 do npm install
npm install dotenv passport passport-google-oauth20 express express-fileupload express-session bcrypt promise-mysql nodemailer qrcode ejs bcryptjs
if you get any errors try installing them all one by one

npm install dotenv
npm install passport
npm install passport-google-oauth20
npm install express
npm install express-fileupload
npm install express-session
npm install bcrypt
npm install promise-mysql
npm install nodemailer
npm install qrcode
npm install ejs
npm install bcryptjs
npm install ejs

#3 Email and password/API
set an email and a password in the marked part in user routes lines:130,131,138 and moveout.js line:151,152,161. if u want to use a app password (recommended) here is how you make a app password for gmail account https://knowledge.workspace.google.com/kb/how-to-create-app-passwords-000009237

The api for gmail login works but if you want to change it,go to .env and change the GOOGLE_CLIENT_ID AND THE GOOGLE_CLIENT_SECRET to the new one.

#4 Database
You need a program to start your database. I recommend mariaDB here is how you set it up. https://www.digitalocean.com/community/tutorials/how-to-install-mariadb-on-ubuntu-20-04
Setup ur moveout.json after mariaDB is downloaded.
Go into the sql/moveout folder start mariadb and write source setup.sql

#5 Server
Go back to the home directory and write node index.js to start the server

#6 Final product
http://localhost:1522 to find customer view

http://localhost:1522/admin/login to see admin view
Admin account details are:
Gmail = admin123@example.com
Password = moveout
if u want to change admin user change setup.sql line 57,58 to the email and password you want


#License
MIT License

Copyright (c) [2024] [Leon Nilsson]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
