const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Пути
const PYTHON_SCRIPT_PATH = path.join(__dirname, 'back.py');
const PUBLIC_PATH = path.join(__dirname, 'public');

// Раздача статики (в т.ч. /Tabels/output.csv)
app.use(express.static(PUBLIC_PATH));

// Разрешаем CORS (для React на другом порту)
app.use(cors());

// API: Запуск Python-скрипта для объединения CSV
app.get('/api/merge-csv', (req, res) => {
  const pythonProcess = spawn('python3', [PYTHON_SCRIPT_PATH], {
    cwd: __dirname
  });

  let output = '';
  let errorOutput = '';

  pythonProcess.stdout.on('data', (data) => {
    output += data.toString();
  });

  pythonProcess.stderr.on('data', (data) => {
    errorOutput += data.toString();
  });

  pythonProcess.on('close', (code) => {
    if (code === 0) {
      res.json({
        status: 'success',
        message: 'CSV объединены',
        log: output
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Ошибка при объединении CSV',
        error: errorOutput
      });
    }
  });
});

// Алиас, чтобы совпадало с вызовом из React
app.get('/api/merged_csv', (req, res) => {
  res.redirect('/api/merge-csv');
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
