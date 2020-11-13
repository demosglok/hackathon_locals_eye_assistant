const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();

const smscred = {
  "customerid": process.env.SMS_CUSTOMER_ID,
  "key": process.env.SMS_KEY,
  "secret": process.env.SMS_SECRET
};
const test_api_sms_key='t0cecTvckE08XN4WScbbM057Hbk8GhdI';
app.get('/sms', (req, res) => {
    axios.post('https://api.sms.to/sms/send',{
        sender_id: 'iSsistant',
        to: '447468753210',
        message: 'Ya upal'
    }, {
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            Authorization: `Bearer ${test_api_sms_key}`
        },
    })
    .then(smsres => {
        console.log('sms result', smsres);
        res.json(smsres.data);
    })
    .catch(err => {
        console.log('err', err.message, err.response && err.response.data);
        res.json(err.response&&err.response.data);
    });



    /*
    axios.post('https://api.thesmsworks.co.uk/v1/auth/token', smscred, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
    })
    .then(response => {
        const token = response.data.token;
        console.log('smstoken', token);
        return axios.post('https://api.thesmsworks.co.uk/v1/message/send',{
                sender: 'iSsistant',
                destination: '447468753210',
                content: 'Ya upal'
            }, {
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                Authorization: token
            },
        });
    })
    .then(smsres => {
        console.log('sms result', smsres);
        res.json(smsres);
    })
    .catch(err => console.log('err', err.message, err.data, err));
    */
});

app.use('/', express.static('../front'))

const port = 8095;
console.log('starting');
app.listen(port, () => console.log(`server started on ${port}`));
