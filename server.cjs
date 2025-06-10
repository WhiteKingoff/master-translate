const express = require('express');
const { Translate } = require('@google-cloud/translate').v2;

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Подключение Google Translate через переменную окружения
const googleCredentials = JSON.parse(process.env.GOOGLE_KEY_JSON);
const translate = new Translate({ credentials: googleCredentials });

// Маскировка ссылок, хештегов и чисел
function maskSpecials(text) {
  const map = {};
  let idx = 0;

  text = text.replace(/https?:\/\/\S+/g, m => {
    const key = `__LINK${idx++}__`;
    map[key] = m;
    return key;
  });

  text = text.replace(/#\w+/g, m => {
    const key = `__TAG${idx++}__`;
    map[key] = m;
    return key;
  });

  text = text.replace(/\b\d+(?:\.\d+)?\b/g, m => {
    const key = `__NUM${idx++}__`;
    map[key] = m;
    return key;
  });

  return { text, map };
}

// Восстановление оригинальных значений
function unmask(text, map) {
  for (const key in map) {
    text = text.split(key).join(map[key]);
  }
  return text;
}

// Обработка POST-запроса на перевод
app.post('/api/translate', async (req, res) => {
  const { text: original, target } = req.body;
  if (!original || !target) {
    return res.status(400).json({ error: 'Missing text or target' });
  }

  const { text: masked, map } = maskSpecials(original);

  try {
    const [translation] = await translate.translate(masked, target);
    const result = unmask(translation, map);
    res.json({ translated: result });
  } catch (err) {
    console.error('Translate error:', err);
    res.status(500).json({ error: 'Translation failed' });
  }
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening at http://localhost:${PORT}`));
