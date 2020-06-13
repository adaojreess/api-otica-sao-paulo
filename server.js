require('dotenv/config');
const server = require('http').createServer();
const io = require('socket.io')(server, {
    origins: process.env.ORIGIN,
});
const firebase = require('./src/firebase');
const spredsheet = require('./src/spreadsheet');

var allSchedules = [];

var emitSchedules = () => { };

firebase.firestore().collection('scheduling').onSnapshot(querySnapshot => {
    var schedules = [];
    querySnapshot.forEach(function (doc) {
        schedules.push(doc.data());
    });
    allSchedules = schedules;

    console.log(schedules);

    emitSchedules();
});

const emitCalendar = () => {
    list = [];
    var date = new Date();
    for (; list.length < 15;) {
        date = new Date(date.setTime(date.getTime() + 1 * 86400000));
        if (date.getDay() !== 0 && date.getDay() !== 6) list.push(date);
    }
    return list;
}

const createSchedule = (data, callback) => {
    var verify = true;
    data.start = new Date(data.start);
    allSchedules.forEach(schedule => {
        var start = new Date(schedule.start.seconds * 1000);
        var checkDate = start.getDate() + start.getHours() + start.getMinutes() === data.start.getDate() + data.start.getHours() + data.start.getMinutes();
        if (schedule.city === data.city && checkDate && verify) verify = false;
    });
    if (verify) {
        try {
            firebase.firestore()
                .collection('scheduling')
                .doc(data.cpf)
                .set(data).then(() => {
                    callback('Visita agendada!');
                    spredsheet.addScheduleToSheet(data).then(result => console.log(result));
                });
        } catch (e) {
            callback('Visita não agendada, tente novamente.');
        }
    } else callback('Visita não agendada, horário não disponível');
}

const emitListInvalidTimes = (data, callback) => {
    var [date, city] = data;
    date = new Date(date);
    var list = [];

    allSchedules.filter(value => value.city === city).map(schedule => {
        var start = new Date(schedule.start.seconds * 1000);
        if (date.getDate() === start.getDate() && date.getMonth() === start.getMonth()) {
            list.push(start.getHours().toString().padStart(2, '0') + ':' + start.getMinutes().toString().padStart(2, '0'));
        }
    });

    callback(list);
}

io.on('connection', socket => {
    console.log('Socket: ' + socket.id);

    socket.emit('calendar', emitCalendar());
    emitSchedules = () => { socket.emit('schedules', allSchedules); };

    emitSchedules();

    socket.on('createSchedule', data => {
        createSchedule(data, (message) => {
            socket.emit('message', message);
        });
    });

    // [yyyy-mm-dd, city]
    socket.on('checkDate', data => {
        emitListInvalidTimes(data, (list) => {
            socket.emit('listInvalidTimes', list);
        });
    });
});

server.listen(process.env.PORT || 4000);