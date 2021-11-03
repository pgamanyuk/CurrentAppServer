const express = require("express");
const app = express();
const fs = require('fs');
const mongoose = require("mongoose");
const signModel = require('./models/signup');
const cors = require('cors');
const nodemailer = require('nodemailer');
const mailSender = require('gmail-send');
const PORT = process.env.PORT || 8000;
const bcrypt = require('bcryptjs');
const authMiddleware = require('./middleware/authMiddleware');
const {check, validationResult} = require('express-validator');
const jwt = require('jsonwebtoken');
const http = require('http');
const https = require('https');
const socketIO = require('socket.io');
const signupModel = require("./models/signup");
const privateKey = fs.readFileSync('sslcert/server.key', 'utf8');
const certificate = fs.readFileSync('sslcert/server.crt', 'utf8');
const credentials = {key: privateKey, cert: certificate};

const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: '*',
    }
});


let connectedUsers = {};


const hashRounds = 7;
const secretKey = 'Biba_and_Boba_are_Friends';

app.use(cors());
app.use(express.json());



const generatePass = function () {
    let pass = '';
    const lowChar = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const upperChar = 'abcdefghijklmnopqrstuvwxyz';
    for (let i = 0; i < 9; i++) {

        if (i === 6) {
            pass += upperChar.charAt(Math.floor(Math.random() *
                upperChar.length));
            continue;
        }
        if (i % 2 === 0) {
            pass += lowChar.charAt(Math.floor(Math.random() *
                lowChar.length));
        } else {
            pass += Math.floor(Math.random() *
                9)
        }

    }

    return pass;
}

function generateRestoreCode() {
    let restoreCode = '';
    for (let i = 0; i < 6; i++) {
        restoreCode += Math.floor(Math.random() * 9)
    }

    return restoreCode;
}

function makeZero(num) {
    if (num < 10) {
        return `0${num}`;
    } else {
        return num;
    }
}

async function loginWithSocials(mail, vkId, fbId) {

    const userId = await signModel.findOne({mail: mail});
    const message = 'Такой e-mail уже используется';
    if (userId) {

        return message
    } else {
        let login = '';

        for (let i = 0; i < mail.length; i++) {
            if (mail[i] === '@') break;
            else login += mail[i];
        }
        const hashPassword = bcrypt.hashSync(generatePass(), hashRounds);
        const user = new signModel({
            mail: mail,
            password: hashPassword,
            login: login,
            vkId: vkId,
            fbId: fbId,
            signed: false
            //СОРИ ЗВОНОК ПО РАБОТЕ
            //звони по готовности, я тоже отключался
            //я тогда пока отключаюсь на работу, ты потом напиши, как будешь после отправки готов - свяжемся
            // тут чет ругается на какие-то скобочки, вроде не нашел ничего, плюс какие-то импорты требует - хз, и с РЕСом надо будет что-то придумать
        });
        await user.save();
        const userId = await signModel.findOne({mail: mail});
        const token = generateToken(userId._id);
        const chatModel = mongoose.model(`${login}Chat`, chatSchema);
        const nowDate = new Date();
        const urlToken = generateToken(mail);
        const url = `https://localhost:80/accept-auth/index.html?mail=${urlToken}`;
        await chatModel.create({sender: 'DigitalWings', message: 'Hello', date: nowDate});
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'bibatheonlyone@gmail.com',
                pass: 'onetwothreefour'
            }
        });

        let mailOptions = {
            from: 'bibatheonlyone@gmail.com',
            to: mail,
            subject: 'Подтверждение аккаунта',
            text: `Эй ${login}, ${url}`
        };

        await transporter.sendMail(mailOptions);
        const status = 200;
        return status;

    }
}



const chatSchema = new mongoose.Schema({
    sender: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    wasRead: {
        type: Boolean
    }
});




const generateToken = (id) => {
    const payload = {
        id
    }

    return jwt.sign(payload, secretKey, {expiresIn: '720d'})
}

module.exports.generateToken = generateToken;

async function start() {
    try {
        await mongoose.connect('mongodb+srv://WingAdmin:iDInAHUYgUS\'@allusersdb.jj6vl.mongodb.net/test',
            {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                useFindAndModify: false,
            })


        server.listen(PORT, () => {
            console.log("All WORKS");
        });

        io.on('connection', (socket) => {

            socket.on('chat message', async (msg) => {
                try {

                    // connectedUsers[msg.login] = socket;
                    socket.join(msg.login);

                    if (msg.message !== 'systemConnectionCheckBIBA') {
                        const chatModel = mongoose.model(`${msg.login}Chat`, chatSchema);
                        const nowDate = new Date();
                        if (msg.admin) {
                            await chatModel.create({sender: msg.admin, message: msg.message, date: nowDate});
                            io.sockets.in(msg.login).emit('chat message', {
                                sender: msg.admin,
                                message: msg.message,
                                date: nowDate
                            });
                        } else {
                            await chatModel.create({
                                sender: msg.login,
                                message: msg.message,
                                date: nowDate,
                                wasRead: false
                            });
                            io.emit('admin message', msg.login);
                            // connectedUsers[msg.login].emit('chat message', {sender: msg.login, message: msg.message, date: curDate});
                            // console.log(connectedUsers);
                            // connectedUsers[msg.to].emit('chat message', {sender: msg.login, message: msg.message, date: curDate});
                            io.sockets.in(msg.login).emit('chat message', {
                                sender: msg.login,
                                message: msg.message,
                                date: nowDate
                            });
                        }
                    }


                } catch (e) {
                    console.log(e);
                }

            });
        });

    } catch (e) {
        console.log(e)
    }

}

start();


app.post('/decodejwtgoogleup', async (req, res) => {
   const token = req.body.token;

    try {
        const decoded = jwt.decode(token);
        const userId = await signModel.findOne({mail: decoded.email});
        const message = 'Такой пользователь уже зарегистрирован';
        if (userId) {
            return res.json({message});
        } else {
            let login = '';

            for (let i = 0; i < decoded.email.length; i++) {
                if (decoded.email[i] === '@') break;
                else login += decoded.email[i];
            }
            const hashPassword = bcrypt.hashSync(generatePass(), hashRounds);
            const user = new signModel({
                mail: decoded.email,
                password: hashPassword,
                login: login,
                vkId: 'no_Vk_id',
                fbId: 'no_fb_id',
                signed: false
            });
            await user.save();
            const userId = await signModel.findOne({mail: decoded.email});
            const token = generateToken(userId._id);
            const chatModel = mongoose.model(`${login}Chat`, chatSchema);
            const nowDate = new Date();
            const urlToken = generateToken(decoded.email);
            const url = `https://localhost:80/accept-auth/index.html?mail=${urlToken}`;
            chatModel.create({sender: 'DigitalWings', message: 'Hello', date: nowDate});
            let transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'bibatheonlyone@gmail.com',
                    pass: 'onetwothreefour'
                }
            });

            let mailOptions = {
                from: 'bibatheonlyone@gmail.com',
                to: decoded.email,
                subject: 'Подтверждение аккаунта',
                text: `Эй ${login}, ${url}`
            };

            await transporter.sendMail(mailOptions);
            res.sendStatus(200);

        }
    } catch (err) {
        res.send(err);
    }


})

app.post('/restorePassword', async (req, res) => {
    try{
        const mail = req.body.mail;
        const user = await signModel.findOne({mail: mail});
        const message = 'Мы не нашли такой аккаунт';

        if(!user) {
            res.json({message});
        } else {
            const restoreCode = generateRestoreCode();
            res.json({restoreCode});

            let transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'bibatheonlyone@gmail.com',
                    pass: 'onetwothreefour'
                }
            });

            let mailOptions = {
                from: 'bibatheonlyone@gmail.com',
                to: mail,
                subject: 'Подтверждение аккаунта',
                text: `Код для подтверждения действия в Web School: ${restoreCode}`
            };

            await transporter.sendMail(mailOptions);



        }
    }
    catch (err){
        console.log(err)
    }
})

app.post('/createNewPassword', async (req, res) => {
    try{
        const mail = req.body.mail;
        const password = req.body.password;
        const user = await signModel.findOne({mail: mail});
        const hashPassword = bcrypt.hashSync(password, hashRounds);
        user.password = hashPassword;
        await user.save();
        const message = 'Пароль успешно изменен'
        res.json({message})
    }
    catch (err){
        console.log(err)
    }
})

app.post('/signup', async (req, res) => {
    try {
        const mail = req.body.mail;
        const password = req.body.password;
        const login = req.body.login;

        const userCheckMail = await signModel.findOne({mail: mail});
        const userCheckLogin = await signModel.findOne({login: login});
        if (userCheckMail) {
            res.json({message: 'Этот e-mail уже зарегистирован'});
        } else if (userCheckLogin) {
            res.json({message: 'Этот логин уже используется'});
        } else {
            const hashPassword = bcrypt.hashSync(password, hashRounds);
            const user = new signModel({
                mail: mail,
                password: hashPassword,
                login: login,
                vkId: 'no_Vk_id',
                fbId: 'no_fb_id',
                signed: false
            });
            await user.save();
            const userId = await signModel.findOne({mail: mail});
            const token = generateToken(userId._id);
            const chatModel = mongoose.model(`${login}Chat`, chatSchema);
            const nowDate = new Date();
            const urlToken = generateToken(mail);
            const url = `https://localhost:80/accept-auth/index.html?mail=${urlToken}`;
            await chatModel.create({sender: 'DigitalWings', message: 'Hello', date: nowDate});
            let transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'bibatheonlyone@gmail.com',
                    pass: 'onetwothreefour'
                }
            });

            let mailOptions = {
                from: 'bibatheonlyone@gmail.com',
                to: mail,
                subject: 'Подтверждение аккаунта',
                text: `Эй ${login}, ${url}`
            };

            await transporter.sendMail(mailOptions);
            res.sendStatus(200);

        }

    } catch (e) {
        console.log(e);
    }
})

app.post('/renderRecentMessages', async (req, res) => {
    try {
        const login = req.body.login;
        const curChatModel = mongoose.model(`${login}`, chatSchema);
        const messages = await curChatModel.find({});

        return res.json({messages});

    } catch (e) {
        console.log(e)
    }
})

app.post('/sendmail', async (req, res) => {
    try {
        const name = req.body.name;
        const phone = req.body.phone;
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'bibatheonlyone@gmail.com',
                pass: 'onetwothreefour'
            }
        });

        let mailOptions = {
            from: 'bibatheonlyone@gmail.com',
            to: 'pgamanyuk@unium.ru',
            subject: 'Новая заявка',
            text: `Имя клиента: ${name}, телефон клиента: ${phone}`
        };

        await transporter.sendMail(mailOptions);
        res.sendStatus(200);

    } catch (e) {
        console.log(e)
    }

})


app.post('/checkjwt', async (req, res) => {
    const jwtToken = req.body.token;

    try {
        const decoded = jwt.verify(jwtToken, secretKey);
        res.send(decoded);
    } catch (err) {
        res.send(err);
    }
})

app.post('/decodejwt', async (req, res) => {
    const jwtToken = req.body.token;

    try {
        const decoded = jwt.verify(jwtToken, secretKey);
        const userId = await signModel.findById(decoded.id);
        const userInf = {mail: userId.mail, password: userId.password, login: userId.login};
        res.send(userInf);
    } catch (err) {
        res.send(err);
    }

})


app.post('/decodejwtgooglein', async (req, res) => {
    const jwtToken = req.body.token;

    try {
        const decoded = jwt.decode(jwtToken);
        const userId = await signModel.findOne({mail: decoded.email});
        const message = 'Такой пользователь не зарегистрирован';
        if (userId) {
            const token = generateToken(userId._id);
            return res.json({token});
        } else {
            return res.json({message});
        }

    } catch (err) {
        res.send(err);
    }

})

app.post('/authentication', async (req, res) => {
    const decoded = jwt.decode(req.body.token);
    console.log(decoded)
    const userId = await signModel.findOne({mail: decoded.id});
    userId.signed = true;
    await userId.save();
    const token = generateToken(userId._id);
    return res.json({token});
})

app.post('/signUpWithSocials', async (req, res) => {
    const mail = req.body.mail;
    const vkId = req.body.vkId;
    const fbId = req.body.fbId;
    const userId = await signModel.findOne({mail: mail});
    const message = 'Такой e-mail уже используется';
    if (userId) {

        res.json({message})
    } else {
        let login = '';

        for (let i = 0; i < mail.length; i++) {
            if (mail[i] === '@') break;
            else login += mail[i];
        }
        const hashPassword = bcrypt.hashSync(generatePass(), hashRounds);
        const user = new signModel({
            mail: mail,
            password: hashPassword,
            login: login,
            vkId: vkId,
            fbId: fbId,
            signed: false
        });
        await user.save();
        const userId = await signModel.findOne({mail: mail});
        const token = generateToken(userId._id);
        const chatModel = mongoose.model(`${login}Chat`, chatSchema);
        const nowDate = new Date();
        const urlToken = generateToken(mail);
        const url = `https://localhost:80/accept-auth/index.html?mail=${urlToken}`;
        await chatModel.create({sender: 'DigitalWings', message: 'Hello', date: nowDate});
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'bibatheonlyone@gmail.com',
                pass: 'onetwothreefour'
            }
        });

        let mailOptions = {
            from: 'bibatheonlyone@gmail.com',
            to: mail,
            subject: 'Подтверждение аккаунта',
            text: `Эй ${login}, ${url}`
        };

        await transporter.sendMail(mailOptions);
        res.sendStatus(200);

    }

})

app.post('/checkSocialId', async (req, res) => {
    const id = req.body.id;
    const social = req.body.social;

    try {
        let userId = '';
        if(social === 'vk') {
             userId = await signModel.findOne({vkId: id});
        } else {
             userId = await signModel.findOne({fbId: id});
        }

        const message = 'Такой пользователь уже зарегистрирован';
        if (userId) {
            return res.json({message});
        } else {
            res.sendStatus(200);
        }

    } catch (err) {
        res.send(err);
    }
})

app.post('/signinVK', async (req, res) => {
    const vkId = req.body.id;

    try {
        const userId = await signModel.findOne({vkId: vkId});
        const message = 'Такой пользователь не зарегистрирован';
        if (userId) {
            const token = generateToken(userId._id);
            return res.json({token});
        } else {
            return res.json({message});
        }

    } catch (err) {
        res.send(err);
    }
})

app.post('/signinFB', async (req, res) => {
    const fbId = req.body.id;

    try {
        const userId = await signModel.findOne({fbId: fbId});
        const message = 'Такой пользователь не зарегистрирован';
        if (userId) {
            const token = generateToken(userId._id);
            return res.json({token});
        } else {
            return res.json({message});
        }

    } catch (err) {
        res.send(err);
    }
})

app.post('/signin', async (req, res) => {
    try {
        const mailOrLogin = req.body.mailOrLogin;
        const password = req.body.password;
        let user;
        if (/@/.test(mailOrLogin) && /\./.test(mailOrLogin)) {
            user = await signModel.findOne({mail: mailOrLogin});
        } else {
            user = await signModel.findOne({login: mailOrLogin});
        }


        if (!user) {
            return res.json({message: `Неверный логин или пароль`});
        }

        const validPassword = bcrypt.compareSync(password, user.password)

        if (!validPassword) {
            return res.json({message: `Неверный логин или пароль`});
        }

        if(!user.signed) {
            return res.json({message: `Аккаунт не подтвержден, проверьте почту`});
        }


        const token = generateToken(user._id);
        if (mailOrLogin === 'ADMIN' || mailOrLogin === 'bibaAdmin@mail.ru') {
            return res.json({token: token, admin: 'yes'})
        } else {
            return res.json({token: token, admin: 'no'});
        }


    } catch (e) {
        console.log(e);
    }
})


app.post('/sendMessage', async (req, res) => {
    try {

        const login = req.body.login;


        const chatModel = mongoose.model(`${login}Chat`, chatSchema);
        const nowDate = new Date();
        chatModel.create({sender: 'DigitalWings', message: 'Byu', date: nowDate});


    } catch (e) {
        console.log(e);
    }
})

app.get('/getAllUsers', async (req, res) => {
    const allUsers = await signModel.find({});
    const allUsersArr = [];
    allUsers.forEach(item => {
        allUsersArr.push(item.login);
    })
    return res.json({allUsersArr});
})

app.post('/makeMessageBeRead', async (req, res) => {
    try {

        const login = req.body.login;


        const chatModel = mongoose.model(`${login}`, chatSchema);
        const messagesNotRead = await chatModel.find({wasRead: false});
        messagesNotRead.forEach(async (message) => {
            message.wasRead = true;
            await message.save();
        })


    } catch (e) {
        console.log(e);
    }
})


app.post('/messagesNotRead', async (req, res) => {
    try {

        const allUsers = req.body.allUsers;
        let loginsArr = [];


        for (let i = 0; i < allUsers.length; i++) {
            const chatModel = mongoose.model(`${allUsers[i]}chats`, chatSchema);
            const messagesNotRead = await chatModel.find({wasRead: false});

            if (messagesNotRead.length > 0) {
                loginsArr.push(allUsers[i]);
            }

        }

        return res.json({loginsArr});


    } catch (e) {
        console.log(e);
    }
})