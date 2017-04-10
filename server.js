'use strict';

const express = require('express');
const app = express();

const server = require('http').Server(app);
const io = require('socket.io')(server);

const bodyParser = require('body-parser');

app.use(bodyParser.json());

const utils = require('smartsheet/lib/utils/httpUtils.js');

const co = require('co');

const webhookUrl = '2.0/webhooks/';
const accessToken = `67f0vs4aakjfkxpone5o7yjp5v`;
const sheetId = `1892951438714756`;
const callbackUrl = 'https://582e2e20.ngrok.io';
const webhookName = 'todo webhook';
const client = require('smartsheet');
const smartsheet = client.createClient({accessToken});

let socket;

co(function* () {

    const existingWebhooks = (yield utils.get({
        url: webhookUrl,
        accessToken
    })).data;

    // Find existing todo webhook if it exists:
    let todoWebhook = existingWebhooks.find(w => w.name === webhookName);

    if (!todoWebhook) { // If no todo webhook exists, create one.
        todoWebhook = (yield utils.post({
            url: webhookUrl,
            accessToken,
            body: {
                callbackUrl,
                events: ['*.*'],
                name: webhookName,
                scope: 'sheet',
                version: 1,
                scopeObjectId: sheetId
            }
        })).result;
    }

    if (todoWebhook.status !== 'ENABLED') { // If webhook is disabled, update it to enabled.
        const webhookId = todoWebhook.id;

        todoWebhook = yield utils.put({
            url: webhookUrl,
            id: webhookId,
            accessToken,
            body: {
                enabled: true
            }
        });
    }

    return todoWebhook;
})
.then(function(data) {
    // console.log('webhook:', data);
})
.catch(function(error) {
    handleError(error);
});

// Here we handle POSTs from the webhook. A POST might be a webhook verification challenge
// or an event callback.
app.post('/', (req, res) => {
    if (req.headers['smartsheet-hook-challenge']) {
        res.set('smartsheet-hook-response', req.headers['smartsheet-hook-challenge']);
    }
    else { // Event callback
        const {events} = req.body;

        // First, determine if the event was caused by the client (this program), in which
        // case we can and must ignore it (else we enter an infinite loop of change events).
        //
        if (events[0].changeAgent !== 'todo client') {
            // In the case of an event callback, figure out what's changed and send the diffs
            // to the client... OR for simplicity's sake just refresh all the client's data.
            smartsheet.sheets.getSheet({
                id: sheetId
            })
                .then(function(data) {
                    socket.emit('refresh', data);
                })
                .catch(function(error) {
                    handleError(error);
                });
        }
    }
    res.sendStatus(200);
});

function handleError(error) {
    // TO DO: actual error handling
    console.log(error);
}

// socket.io stuff

io.sockets.on('connection', (s) => {
    socket = s

    // Get sheet.
    smartsheet.sheets.getSheet({
        id: sheetId
    })
        .then(function(data) {
            socket.emit('refresh', data);
        })
        .catch(function(error) {
            handleError(error);
        });

    socket.on('updateCell', ({rowId, columnId, value}) => {
        smartsheet.sheets.updateRow({
            sheetId,
            body: {
                id: rowId,
                cells: [
                    {
                        columnId,
                        value
                    }
                ]
            }
        })
            .then(function (data) {
                socket.emit('updateRow', data.result);
            })
            .catch(function (error) {
                handleError(error);
            });
    });

    socket.on('deleteRow', (rowId) => {
        smartsheet.sheets.deleteRow({
            sheetId,
            rowId
        })
            .then(function (data) {
                socket.emit('deleteRow', data.result);
            })
            .catch(function (error) {
                handleError(error);
            });
    });

    socket.on('addRow', (cells) => {
        smartsheet.sheets.addRow({
            sheetId,
            body: {
                toBottom: true,
                cells
            }
        })
            .then(function (data) {
                socket.emit('addRow', data.result);
            })
            .catch(function (error) {
                handleError(error);
            });
    });
});

const port = process.env.PORT || 3001;

server.listen(port, () => {
    console.log('Listening on port', port);
});
