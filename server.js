require('dotenv/config')
const server = require('http').createServer();
const io = require('socket.io')(server);
const firebase = require('./src/firebase');

io.on('connection', socket => {
    var allSchedules = [];
    console.log('Socket: ' + socket.id);

    socket.on('createSchedule', data => {
        var verify = true;
        data.start = new Date(data.start);
        allSchedules.forEach(schedule => {
            var start = new Date(schedule.start.seconds * 1000);
            var checkDate = start.getDate() + start.getHours() + start.getMinutes() === data.start.getDate() + data.start.getHours() + data.start.getMinutes();
            if (schedule.city === data.city && checkDate && verify) verify = false;
        });
        if (verify) {
            console.log('salva')
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
         } else  socket.emit('message', 'Horario não dispnível');

    });

    firebase.firestore().collection('scheduling').onSnapshot(
        function (querySnapshot) {
            var schedules = [];
            querySnapshot.forEach(function (doc) {
                schedules.push(doc.data());
            });
            allSchedules = schedules;
            socket.emit('schedules', schedules);
        });


    const emitList = (data) => {
        var [date, city] = data;
        date = new Date(date);
        var list = [];
        allSchedules.forEach(schedule => {
            if (schedule.city == city) {
                var start = new Date(schedule.start.seconds * 1000);
                if (date.getDate() + 1 === start.getDate() && date.getMonth() === start.getMonth()) {
                    list.push(start.getHours().toString().padStart(2, '0') + ':' + start.getMinutes().toString().padStart(2, '0'));
                }
            }
        });
        socket.emit('listInvalidTimes', list);
    }

    // [yyyy-mm-dd, city]
    socket.on('checkDate', emitList);
});

server.listen(process.env.PORT || 3000);