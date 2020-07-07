const express = require('express');
const firebase = require('./firebase');
const routes = express.Router();
const spredsheet = require('./spreadsheet');
const { listTimes } = require('./consts');


firebase.firestore().collection('schedules').onSnapshot(querySnapshot => {
    var schedules = [];
    querySnapshot.forEach(function (doc) {
        schedules.push(doc.data());
    });
    allSchedules = schedules;
});


routes.get('/admin/schedules', (req, res) => {
    res.json(allSchedules);
});

routes.put('/admin/schedule', (req, res) => {
    var data = req.body;
    data.start = new Date(data.start);
    try {
        firebase.firestore()
            .collection('schedules')
            .doc(data.cpf)
            .set(data).then(() => {
                spredsheet.updateShedule(data).then(result => res.json({ message: "success" }));
            });
    } catch (e) { res.json({ message: "error" }) };
});

routes.delete('/admin/schedule', (req, res) => {
    const data = req.body;

    try {
        firebase.firestore()
            .collection('schedules')
            .doc(data.cpf)
            .delete().then(async () => {
                spredsheet.removeSchedule(data).then((message) => {
                    res.json({ message });
                });
            });
    } catch (e) { res.json({ message: "error" }) };
});

routes.post('/schedules', (req, res) => {
    var { date, city } = req.body;

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
        listTimes.slice(2, 10).forEach(element => {
            if (!list.includes(element)) newList.push(element);
        });
    }

    res.json({ schedules: newList });
});

routes.post('/schedule', (req, res) => {
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
                .collection('schedules')
                .doc(data.cpf)
                .set(data).then(() => {
                    spredsheet.addScheduleToSheet(data).then(result => res.json({ message: "success" }));
                });
        } catch (e) { res.json({ message: "error" }) };
    } else res.json({ message: "impossible schedule" })
});


routes.get('/calendar', (req, res) => {
    list = [];
    var date = new Date();
    for (; list.length < 15;) {
        date = new Date(date.setTime(date.getTime() + 1 * 86400000));
        if (date.getDay() !== 0) {
            list.push(`${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${(date.getDate()).toString().padStart(2, '0')}`);
        }
    }
    res.json({ calendar: list });

});

routes.get('/schedules/today', (req, res) => {
    const date = new Date();
    const city = req.headers.city;

    const schedules = allSchedules.filter(schedule => schedule.city === city).filter(schedule => {
        var start = new Date(schedule.start.seconds * 1000);
        return (start.getDate() === date.getDate() && start.getMonth() === date.getMonth());
    }).map(schedule => {
        var start = new Date(schedule.start.seconds * 1000);
        return start.getHours().toString().padStart(2, '0') + ':' + start.getMinutes().toString().padStart(2, '0');
    });

    const todaySchedules = listTimes.filter(item => !schedules.includes(item));

    res.json({ today_schedules: todaySchedules });
});

module.exports = routes;