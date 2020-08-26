const firebase = require('../firebase');

module.exports = removeDocument = async (docId, city) => {
    try {
        await firebase.firestore()
            .collection('cities')
            .doc(city)
            .collection('schedules')
            .doc(docId)
            .delete();
    } catch (e) {
        console.log(e);
    }
}