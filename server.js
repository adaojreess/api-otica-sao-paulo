require('dotenv/config')
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const firebase = require('./src/firebase');

app.use('/', (req, res) => {
    return res.json({ message: 'ON' });
});

var allSchedules = [];

io.on('connect', socket => {
    console.log('Socket: ' + socket.id);
    socket.on('createSchedule', data => {
        try {
            firebase.firestore()
                .collection('schedulings')
                .doc(data.cpf)
                .set(data).then(() => {
                    socket.emit('message', 'Evento Criado!');
                });
        } catch (e) {
            socket.emit('message', 'Evento não Criado!');
        }
    });

    firebase.firestore().collection('schedulings').onSnapshot(function (querySnapshot) {
        var schedule = [];
        querySnapshot.forEach(function (doc) {
            schedule.push(doc.data());
        });
        allSchedules = schedule;
        socket.emit('getSchedulings', schedule)
    });
    
    //[yyyy-mm-dd, city]
    socket.on('getDate', data => {
        var [date, city] = data;
        date = new Date(date);
        var list = [];
        allSchedules.forEach(schedule => {
            if (schedule.city === city) {
                var start = new Date(schedule.start.seconds * 1000);
                if (date.getDate() + 1 === start.getDate() && date.getMonth() === start.getMonth()) {
                    list.push(start.getHours().toString().padStart(2, "0") + ":" + start.getMinutes().toString().padStart(2, "0"));
                }
            }
        });
        socket.emit('getListHours', list);
    });
});

server.listen(process.env.PORT || 3000);