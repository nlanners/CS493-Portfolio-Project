const express = require('express');

const app = express();

app.use('/', require('./api/index'));
app.enable('trust proxy');

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`);
});