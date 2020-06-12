require('dotenv/config')
const server = require('http').createServer();
const io = require('socket.io')(server);
const firebase = require('./src/firebase');

const emitCalendar = () => {
    list = [];
    var date = new Date();
    for (; list.length < 15;) {
        date = new Date(date.setTime(date.getTime() + 1 * 86400000));
        if (date.getDay() !== 0 && date.getDay() !== 6) list.push(date.getDate());
    }
    
    return list;
}

io.on('connection', socket => {
    var allSchedules = [];
    console.log('Socket: ' + socket.id);

    socket.emit('calendar', emitCalendar());

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
        } else socket.emit('message', 'Horario não dispnível');

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

        list = allSchedules.filter(value => value.city === city).map(schedule => {
            var start = new Date(schedule.start.seconds * 1000);
            if (date.getDate() + 1 === start.getDate() + 1 && date.getMonth() === start.getMonth()) {
                return (start.getHours().toString().padStart(2, '0') + ':' + start.getMinutes().toString().padStart(2, '0'))
            }
        });
        socket.emit('listInvalidTimes', list);
    }

    // [yyyy-mm-dd, city]
    socket.on('checkDate', emitList);
});

emitCalendar();

server.listen(process.env.PORT || 3000);