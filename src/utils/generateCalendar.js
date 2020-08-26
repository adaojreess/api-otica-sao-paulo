const isDayAvailable = require('./isDayAvailable');
const moment = require('moment');

module.exports = generateCalendar = (city, appointmentList) => {
    let list = [];
    let localDate = moment().hours(0).minute(0).second(0);
    for (; list.length < 16;) {
        if (localDate.day() !== 0 && isDayAvailable(localDate, city, appointmentList)) {
            list.push(localDate.format());
        }
        localDate.add(1, 'd');
    }

    return {calendar: list, count: list.length };
}