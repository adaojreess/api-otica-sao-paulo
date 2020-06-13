require('dotenv/config');
const server = require('http').createServer();
const io = require('socket.io')(server, { origins: process.env.ORIGINS });
const firebase = require('./src/firebase');
const spredsheet = require('./src/spreadsheet');
const moment = require('moment');

moment.locale('pt-br');
var allSchedules = [];
var emitSchedules = () => { };

const listTimes = ["07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
"12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
"17:00", "17:30", "18:00"]
const listTimesSat = [
    "07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00"
]

firebase.firestore().collection('scheduling').onSnapshot(querySnapshot => {
    var schedules = [];
    querySnapshot.forEach(function (doc) {
        schedules.push(doc.data());
    });
    allSchedules = schedules;

    emitSchedules();
});

const emitCalendar = () => {
    list = [];
    var date = new Date();
    for (; list.length < 15;) {
        date = new Date(date.setTime(date.getTime() + 1 * 86400000));
        if (date.getDay() !== 0){
            list.push({
                "label": moment(date).format('ll').toString(),
                "value": `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${(date.getDate()).toString().padStart(2, '0')}`
            });
        }
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

const emitScheduleList = (data, callback) => {
    var [date, city] = data;
    date = new Date(date);
    var list = [];

    allSchedules.filter(value => value.city === city).map(schedule => {
        var start = new Date(schedule.start.seconds * 1000);
        if (date.getDate() + 1 === start.getDate() && date.getMonth() === start.getMonth()) {
            list.push(start.getHours().toString().padStart(2, '0') + ':' + start.getMinutes().toString().padStart(2, '0'));
        }
    });

    callback(listTimes.map(element => {
        if (list.includes(element)) return {label: element, value: element, visibility: false}
        else return {label: element, value: element, visibility: true};
    }));
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
        emitScheduleList(data, (list) => {
            socket.emit('scheduleList', list);
        });
    });
});

server.listen(process.env.PORT || 4000);