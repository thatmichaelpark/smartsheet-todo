'use strict';

const express = require('express');
const app = express();

const server = require('http').Server(app);
const io = require('socket.io')(server);

function handleError(error) {
    // TO DO: actual error handling
    console.log(error);
}

// socket.io stuff

io.sockets.on('connection', (socket) => {
    const accessToken = `67f0vs4aakjfkxpone5o7yjp5v`;
    const sheetId = `1892951438714756`;
    const client = require('smartsheet');
    const smartsheet = client.createClient({accessToken});

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
