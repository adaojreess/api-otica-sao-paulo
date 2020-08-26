module.exports = (id, list) => {
    let appointment = list.find(element => element.id === id);
    return appointment;
}