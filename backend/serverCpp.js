const express = require('express');
const cors = require('cors');
const { execFile } = require('child_process');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());

// API endpoint — вызов .exe
app.get('/api/all', (req, res) => {
  const exePath = path.join(__dirname, 'ConsoleApplication2.exe');  // Путь к exe

  execFile(exePath, (error, stdout, stderr) => {
    if (error) {
      console.error('Ошибка при запуске exe:', error);
      return res.status(500).json({ output: 'Ошибка запуска EXE' });
    }

    if (stderr) {
      console.warn('stderr из exe:', stderr);
    }

    console.log('stdout из exe:', stdout);
    res.json({ output: stdout });
  });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Backend сервер запущен на http://localhost:${PORT}`);
});
