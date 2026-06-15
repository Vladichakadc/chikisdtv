process.env.NODE_ENV = 'production';
process.env.DATABASE_PATH = 'C:\\Users\\vladi\\AppData\\Local\\Temp\\prodtest2\\database.sqlite';

const express = require('express');
const backupRouter = require('./routes/admin/backup');

const app = express();
app.use('/api/admin', backupRouter);
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ error: err.message });
});

app.listen(4098, () => console.log('ready on 4098'));
