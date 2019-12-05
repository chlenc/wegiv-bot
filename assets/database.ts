require('dotenv').config();

import * as firebase from 'firebase';

var firebaseConfig = {
    apiKey: "AIzaSyC5Vd3Ku3d1JUQuQvXGyqPzcj8qoMQppV8",
    authDomain: "wegiv-bot.firebaseapp.com",
    databaseURL: "https://wegiv-bot.firebaseio.com",
    projectId: "wegiv-bot",
    storageBucket: "wegiv-bot.appspot.com",
};
var app = firebase.initializeApp(firebaseConfig);

module.exports = {
    getData(path) {
        return firebase.database().ref(path).once('value').then(function (data) {
            return data.val()
        })
    },
    pushData(path, data) {
        return firebase.database().ref(path).push(data).then(data => {
            return ((data as any).path.pieces_)
        });
    },
    setData(path, data) {
        firebase.database().ref(path).set(data)
    },
    updateData(path, data) {
        firebase.database().ref(path).update(data)
    },
    removeData(path) {
        firebase.database().ref(path).remove()
    }
}
