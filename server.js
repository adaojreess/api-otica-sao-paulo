require('dotenv/config')
const server = require('http').createServer();
const io = require('socket.io')(server);
const firebase = require('./src/firebase');

io.on('connection', socket => {
    var allSchedules = [];
    console.log('Socket: ' + socket.id);

    socket.on('createSchedule', data => {
        data.start = new Date(data.start);
        try {
            firebase.firestore()
                .collection('scheduling')
                .doc(data.cpf)
                .set(data).then(() => {
                    socket.emit('message', 'Evento Criado!');
                });
        } catch (e) {
            socket.emit('message', 'Evento não criado');
        }
    });

    firebase.firestore().collection('scheduling').onSnapshot(function (querySnapshot) {
        var schedules = [];
        querySnapshot.forEach(function (doc) {
            schedules.push(doc.data());
        });
        allSchedules = schedules;
        socket.emit('getScheduling', schedules);
    });


    const emitList = (data) => {
        var [date, city] = data;
        date = new Date(date);
        var list = [];
        allSchedules.forEach(schedule => {
            if (schedule.city == city) {
                var start = new Date(schedule.start.seconds * 1000);
                if (date.getDate() + 1 === start.getDate() && date.getMonth() === start.getMonth()) {
                    list.push(start.getHours().toString().padStart(2, '0') + start.getMinutes().toString().padStart(2, '0'));
                }
            }
        });

        socket.emit('getListHours', list);
    }

    //[yyyy-mm-dd, city]
    socket.on('checkDate', emitList);
});

server.listen(process.env.PORT || 3000);