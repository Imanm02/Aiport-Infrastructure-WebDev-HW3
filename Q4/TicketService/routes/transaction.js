const express = require('express');
const router = express.Router();
const Purchase = require('../models/purchase')
const Flight = require('../models/flightModel')
// const UserAccount = require('../models/userAccount')
const {dummyIsAuth} = require('../middlewares/auth');
const checkPostData = require('../middlewares/transactionMiddleware')
const axios = require('axios')
const {validationResult} = require("express-validator");
const {where} = require("sequelize");


router.post('/', dummyIsAuth, ...checkPostData, async function (req, res, next) {
    console.log('hi from transaction')
    const errors = validationResult(req);
    /* send errors of middlewares */
    if (!errors.isEmpty()) {
        return res.status(400).json({errors: errors.array()});
    }

    try {
        let clientHost = `http://${process.env.BANK_URL}/transaction/`;
        const postData = req.body;
        const options = {
            method: 'POST',
            headers: {
                'content-Type': 'application/json',
            },
            url: clientHost,
            data: JSON.stringify({
                amount: postData["offer_price"],
                receipt_id: process.env.RECEIPT_ID,
                callback: `http://${process.env.HOST}:${process.env.PORT}/transactionResult`
            }),
        }


        const response = await axios(options);
        const flight = await Flight.findOne({where: {flight_id: postData["flight_id"]}});
        // save the log of uncompleted transaction with the related user data (id, first name, last name)
        const buyer = req.user;
        const new_purchase = await Purchase.create({
            corresponding_user_id: postData["corresponding_user_id"],
            title: postData["title"],
            first_name: buyer.first_name,
            last_name: buyer.last_name,
            flight_serial: flight.flight_serial,
            offer_price: postData["offer_price"],
            offer_class: postData["offer_class"],
            transaction_id: response.data.id,
            transaction_result: 0,
        });

        // redirect to bank payment page
        // res.redirect('http://' + process.env.BANK_URL + "/payment/" + response.data.id);

        res.send({
            message: "transaction created successfully",
            redirect_url: 'http://' + process.env.BANK_URL + "/payment/" + response.data.id,
        });

        // console.log(response.data);
    } catch (e) {
        console.log(e)
    }
});


module.exports = router;