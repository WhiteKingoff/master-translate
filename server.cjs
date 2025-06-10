// server.js
const express = require('express');
const path = require('path');
const { Translate } = require('@google-cloud/translate').v2;

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Явно указываем путь к JSON-ключу Google
const translate = new Translate({
  credentials: JSON.parse(process.env.GOOGLE_KEY_JSON)
});


// Маскировка ссылок, хештегов и чисел
function maskSpecials(text) {
  const map = {};
  let idx = 0;
  // Ссылки
  text = text.replace(/https?:\/\/\S+/g, m => {
    const key = `__LINK${idx++}__`;
    map[key] = m;
    return key;
  });
  // Хештеги
  text = text.replace(/#\w+/g, m => {
    const key = `__TAG${idx++}__`;
    map[key] = m;
    return key;
  });
  // Числа (целые и десятичные)
  text = text.replace(/\b\d+(?:\.\d+)?\b/g, m => {
    const key = `__NUM${idx++}__`;
    map[key] = m;
    return key;
  });
  return { text, map };
}

// Восстановление оригинальных значений по плейсхолдерам
function unmask(text, map) {
  for (const key in map) {
    text = text.split(key).join(map[key]);
  }
  return text;
}

app.post('/api/translate', async (req, res) => {
  const { text: original, target } = req.body;
  if (!original || !target) {
    return res.status(400).json({ error: 'Missing text or target' });
  }

  // Этап 1: маскируем специальные фрагменты
  const { text: masked, map } = maskSpecials(original);

  try {
    // Этап 2: переводим замаскированный текст
    const [translation] = await translate.translate(masked, target);
    // Этап 3: восстанавливаем оригинальные ссылки, теги и числа
    const result = unmask(translation, map);
    res.json({ translated: result });
  } catch (err) {
    console.error('Translate error:', err);
    res.status(500).json({ error: 'Translation failed' });
  }
});
// Маскировка ссылок, хештегов и чисел
function maskSpecials(text) {
  const map = {};
  let idx = 0;
  // … ссылки и теги …
  // Числа (целые и десятичные)
  text = text.replace(/\b\d+(?:\.\d+)?\b/g, m => {
    const key = `__NUM${idx++}__`;
    map[key] = m;
    return key;
  });
  return { text, map };
}

// Восстановление
function unmask(text, map) {
  for (const key in map) {
    text = text.split(key).join(map[key]);
  }
  return text;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening at http://localhost:${PORT}`));
