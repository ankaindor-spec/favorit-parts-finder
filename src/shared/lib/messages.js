const MESSAGES = {
  missing_key: 'Не задан ключ доступа к сервису проценки. Укажите VITE_FAVORIT_API_KEY и пересоберите приложение.',
  invalid_key: 'Сервис не принял ключ доступа.',
  empty_number: 'Сервис не получил номер детали.',
  quota: 'Превышен лимит запросов к сервису. Попробуйте позже.',
  unavailable: 'Сервис проценки сейчас недоступен. Проверьте соединение и повторите попытку.',
  bad_response: 'Сервис вернул непонятный ответ.',
  unknown: 'Не удалось выполнить запрос. Попробуйте ещё раз.',
};

export function messageFor(error) {
  const code = error && typeof error.code === 'string' ? error.code : 'unknown';
  return MESSAGES[code] || MESSAGES.unknown;
}
