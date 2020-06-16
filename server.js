require('dotenv/config');
const express = require('express');

const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const routes = express.Router();

const firebase = require('./src/firebase');
const spredsheet = require('./src/spreadsheet');

var allSchedules = [];

const listTimes = ["07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
"12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
"17:00", "17:30", "18:00"];

firebase.firestore().collection('scheduling').onSnapshot(querySnapshot => {
    var schedules = [];
    querySnapshot.forEach(function (doc) {
        schedules.push(doc.data());
    });
    allSchedules = schedules;
});

app.use(routes.get('/calendar', (req, res) => {
    list = [];
    var date = new Date();
    for (; list.length < 15;) {
        date = new Date(date.setTime(date.getTime() + 1 * 86400000));
        if (date.getDay() !== 0){
            list.push(`${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${(date.getDate()).toString().padStart(2, '0')}`);
        }
    }
    res.json({calendar: list});
}));

app.use(routes.post('/schedules', (req, res) => {
    var {date, city} = req.body;

    date = new Date(date + ' 00:30:00');
    var list = [];

    allSchedules.filter(value => value.city === city).map(schedule => {
        var start = new Date(schedule.start.seconds * 1000);
        if (date.getDate() === start.getDate() && date.getMonth() === start.getMonth()) {
            list.push(start.getHours().toString().padStart(2, '0') + ':' + start.getMinutes().toString().padStart(2, '0'));
        }
    });
    var newList = [];

    if (date.getDay() !== 6) {
        listTimes.forEach(element => {
            if (!list.includes(element)) newList.push(element);
        });
    } else {
        listTimes.slice(0, 10).forEach(element => {
            if (!list.includes(element)) newList.push(element);
        });
    }

    res.json({schedules: newList});
}));

app.use(routes.post('/schedule' , (req, res) => {
    var data = req.body;
    
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
                    spredsheet.addScheduleToSheet(data).then(result => res.json({ message: "success" }));
                });
        } catch (e) {res.json({message: "error"})};
    } else res.json({message: "impossible schedule"})
}));

app.use('/', (req, res) => {
    res.json({message: " API online"})
});

app.listen(process.env.PORT || 3001);