export interface ApiEndpoint {
  method: string;
  path: string;
  description: string;
  contentType?: string;
  body?: string;
  bodyExample?: string;
  response?: string;
  responseExample?: string;
  notes?: string[];
}

export interface ApiService {
  name: string;
  description: string;
  category: string[];
  baseUrl: string;
  auth: {
    type: "bearer" | "header" | "basic" | "query" | "oauth2";
    setup: string;
    headerName?: string;
  };
  defaultHeaders?: Record<string, string>;
  endpoints: Record<string, ApiEndpoint>;
  n8nNotes: string[];
  rateLimits?: string;
  docsUrl: string;
}

export const services: ApiService[] = [
  {
    name: "OpenAI",
    description: "GPT chat completions, Whisper transcription, DALL-E image generation, TTS, embeddings",
    category: ["ai", "llm", "transcription", "image-generation", "tts", "embeddings"],
    baseUrl: "https://api.openai.com",
    auth: {
      type: "bearer",
      setup: "В n8n HTTP Request: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь OpenAI API Key (sk-...)."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      chat_completions: {
        method: "POST",
        path: "/v1/chat/completions",
        description: "Генерация текста через GPT. Основной эндпоинт для всех текстовых задач.",
        body: '{"model": "gpt-4o-mini", "messages": [{"role":"user","content":"..."}], "max_tokens": 2000}',
        bodyExample: '{"model":"gpt-4o-mini","messages":[{"role":"system","content":"Ты помощник."},{"role":"user","content":"Напиши резюме"}],"max_tokens":2000,"temperature":0.7}',
        response: "choices[0].message.content — строка с ответом",
        responseExample: '{"id":"chatcmpl-abc123","object":"chat.completion","choices":[{"index":0,"message":{"role":"assistant","content":"Текст ответа"},"finish_reason":"stop"}],"usage":{"prompt_tokens":13,"completion_tokens":18,"total_tokens":31}}',
        notes: [
          "Ответ в response.choices[0].message.content",
          "Для JSON ответа добавь: response_format: {type: 'json_object'} + инструкцию в промпте",
          "Актуальные модели: gpt-4o, gpt-4o-mini, o1, o3, gpt-4.1, gpt-4.1-mini"
        ]
      },
      whisper_transcription: {
        method: "POST",
        path: "/v1/audio/transcriptions",
        description: "Транскрипция аудио. КРИТИЧНО: принимает ТОЛЬКО файл, НЕ URL!",
        contentType: "multipart/form-data",
        body: "multipart/form-data: file (binary), model='whisper-1', language='ru' (опционально)",
        bodyExample: "Form Data: file=@audio.mp3, model=whisper-1, language=ru",
        response: "text — строка с транскрипцией (или JSON если response_format=verbose_json)",
        notes: [
          "КРИТИЧНО: Whisper НЕ принимает URL! Только binary файл через multipart/form-data!",
          "Паттерн в n8n: 1) HTTP Request скачать аудио как binary → 2) POST multipart к Whisper",
          "В n8n: Body Content Type = Multipart Form Data",
          "Макс 25MB. Форматы: mp3, mp4, wav, webm, m4a, mpeg, mpga, oga, ogg, flac"
        ]
      },
      dalle_generate: {
        method: "POST",
        path: "/v1/images/generations",
        description: "Генерация изображений через DALL-E",
        bodyExample: '{"model":"dall-e-3","prompt":"Кот в космосе","n":1,"size":"1024x1024","quality":"standard"}',
        response: "data[0].url — URL изображения (живёт ~1 час!) или data[0].b64_json",
        notes: [
          "DALL-E 3: n ТОЛЬКО 1 (нельзя несколько за раз)",
          "URL изображения истекает примерно через 1 час — сразу скачай или сохрани",
          "Размеры для DALL-E 3: 1024x1024, 1024x1792, 1792x1024"
        ]
      },
      tts: {
        method: "POST",
        path: "/v1/audio/speech",
        description: "Текст в речь (Text-to-Speech)",
        bodyExample: '{"model":"tts-1","input":"Привет, мир!","voice":"alloy","response_format":"mp3"}',
        response: "Binary аудио файл (mp3 по умолчанию)",
        notes: [
          "ОТВЕТ БИНАРНЫЙ! В n8n: Response Format = File",
          "Голоса: alloy, echo, fable, onyx, nova, shimmer",
          "Модели: tts-1 (быстрее), tts-1-hd (качественнее)",
          "Форматы: mp3, opus, aac, flac, wav, pcm"
        ]
      },
      embeddings: {
        method: "POST",
        path: "/v1/embeddings",
        description: "Генерация текстовых эмбеддингов для поиска и RAG",
        bodyExample: '{"model":"text-embedding-3-small","input":"Текст для эмбеддинга"}',
        response: "data[0].embedding — массив чисел (float[])",
        notes: [
          "Модели: text-embedding-3-small (дешёвый), text-embedding-3-large (точный)",
          "input может быть строкой или массивом строк (batch до 2048)"
        ]
      }
    },
    n8nNotes: [
      "Для Whisper: СНАЧАЛА скачай аудио как binary через отдельный HTTP Request, потом отправь multipart",
      "Для TTS: обязательно Response Format = File в настройках n8n HTTP Request",
      "Основной паттерн для GPT: response.choices[0].message.content",
      "Для DALL-E: URL изображения временный — сразу скачивай"
    ],
    rateLimits: "Зависит от tier. Tier 1: 500 RPM для gpt-4o-mini, 10,000 RPM для text-embedding-3-small",
    docsUrl: "https://platform.openai.com/docs/api-reference"
  },

  {
    name: "Anthropic",
    description: "Claude LLM — messages API для генерации текста (Sonnet, Opus, Haiku)",
    category: ["ai", "llm"],
    baseUrl: "https://api.anthropic.com",
    auth: {
      type: "header",
      setup: "В n8n HTTP Request: НЕ используй Bearer Auth! Добавь заголовок вручную: Header Name = x-api-key, Value = твой API ключ (sk-ant-...).",
      headerName: "x-api-key"
    },
    defaultHeaders: {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01"
    },
    endpoints: {
      messages: {
        method: "POST",
        path: "/v1/messages",
        description: "Основной эндпоинт для генерации текста через Claude",
        body: '{"model": "claude-sonnet-4-5-20250929", "max_tokens": 1024, "messages": [{"role":"user","content":"..."}]}',
        bodyExample: '{"model":"claude-sonnet-4-5-20250929","max_tokens":4096,"system":"Ты полезный ассистент.","messages":[{"role":"user","content":"Напиши резюме"}]}',
        response: "content[0].text — строка с ответом",
        responseExample: '{"id":"msg_01XFDUDYJgAACzvnptvVoYEL","type":"message","role":"assistant","content":[{"type":"text","text":"Текст ответа"}],"model":"claude-sonnet-4-5-20250929","stop_reason":"end_turn","usage":{"input_tokens":25,"output_tokens":150}}',
        notes: [
          "ОТВЕТ НЕ КАК У OPENAI! Результат в content[0].text, НЕ в choices[0].message.content",
          "system — ОТДЕЛЬНОЕ поле верхнего уровня, НЕ system message в массиве messages",
          "max_tokens ОБЯЗАТЕЛЕН (у OpenAI — опционален)",
          "stop_reason вместо finish_reason",
          "Актуальные модели: claude-opus-4-6, claude-sonnet-4-5-20250929, claude-haiku-4-5-20251001"
        ]
      }
    },
    n8nNotes: [
      "НЕ ИСПОЛЬЗОВАТЬ Bearer Auth! Anthropic использует кастомный заголовок x-api-key",
      "ОБЯЗАТЕЛЬНО добавь заголовок anthropic-version: 2023-06-01 — без него API вернёт ошибку",
      "system промпт — ОТДЕЛЬНОЕ поле в body, НЕ сообщение с role: system",
      "Ответ в content[0].text (НЕ choices[0].message.content как у OpenAI)",
      "max_tokens ОБЯЗАТЕЛЕН в каждом запросе"
    ],
    rateLimits: "Зависит от tier. Tier 1: 50 RPM, 40,000 input tokens/min",
    docsUrl: "https://docs.anthropic.com/en/api/getting-started"
  },

  {
    name: "Google Gemini",
    description: "Google Gemini API — генерация текста, мультимодальность (текст + изображения)",
    category: ["ai", "llm", "multimodal"],
    baseUrl: "https://generativelanguage.googleapis.com",
    auth: {
      type: "query",
      setup: "API ключ передаётся как query параметр key=YOUR_API_KEY. В n8n: добавь ?key=YOUR_API_KEY к URL. Альтернативно: заголовок x-goog-api-key.",
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      generateContent: {
        method: "POST",
        path: "/v1beta/models/{model}:generateContent",
        description: "Генерация текста. ФОРМАТ ПОЛНОСТЬЮ ОТЛИЧАЕТСЯ ОТ OPENAI!",
        body: '{"contents": [{"parts": [{"text": "..."}]}]}',
        bodyExample: '{"contents":[{"role":"user","parts":[{"text":"Объясни квантовую физику простыми словами"}]}],"generationConfig":{"temperature":0.7,"maxOutputTokens":2048}}',
        response: "candidates[0].content.parts[0].text — строка с ответом",
        responseExample: '{"candidates":[{"content":{"parts":[{"text":"Текст ответа"}],"role":"model"},"finishReason":"STOP"}],"usageMetadata":{"promptTokenCount":10,"candidatesTokenCount":100,"totalTokenCount":110}}',
        notes: [
          "ФОРМАТ СОВЕРШЕННО НЕ OPENAI-СОВМЕСТИМЫЙ!",
          "Модель указывается В URL, не в body: /models/gemini-2.5-flash:generateContent",
          "Структура: contents[].parts[].text, НЕ messages[].content",
          "Роли: 'user' и 'model' (НЕ 'assistant'!)",
          "API ключ можно передать через query param ?key= ИЛИ через заголовок x-goog-api-key",
          "Актуальные модели: gemini-2.5-flash, gemini-2.5-pro, gemini-2.0-flash"
        ]
      },
      embedContent: {
        method: "POST",
        path: "/v1beta/models/{model}:embedContent",
        description: "Генерация эмбеддингов",
        bodyExample: '{"model":"models/text-embedding-004","content":{"parts":[{"text":"Текст для эмбеддинга"}]}}',
        response: "embedding.values — массив чисел",
        notes: [
          "Модель эмбеддингов: text-embedding-004",
          "Формат body отличается от OpenAI embeddings"
        ]
      }
    },
    n8nNotes: [
      "ПОЛНОСТЬЮ ДРУГОЙ ФОРМАТ! НЕ совместим с OpenAI-стилем",
      "URL включает имя модели: /v1beta/models/gemini-2.5-flash:generateContent",
      "API ключ через query ?key=... — самый простой способ в n8n",
      "Ответ в candidates[0].content.parts[0].text",
      "system prompt передаётся через systemInstruction в body, НЕ через role",
      "При использовании x-goog-api-key заголовка: в n8n Headers добавь вручную"
    ],
    rateLimits: "Free tier: 15 RPM для Flash, 2 RPM для Pro. Pay-as-you-go: значительно выше",
    docsUrl: "https://ai.google.dev/api"
  },

  {
    name: "Mistral AI",
    description: "Mistral chat completions — OpenAI-совместимый API",
    category: ["ai", "llm"],
    baseUrl: "https://api.mistral.ai",
    auth: {
      type: "bearer",
      setup: "В n8n HTTP Request: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь Mistral API Key."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      chat_completions: {
        method: "POST",
        path: "/v1/chat/completions",
        description: "Генерация текста. OpenAI-совместимый формат!",
        bodyExample: '{"model":"mistral-large-latest","messages":[{"role":"system","content":"Ты ассистент."},{"role":"user","content":"Расскажи про Париж"}],"max_tokens":2000,"temperature":0.7}',
        response: "choices[0].message.content — строка с ответом (идентично OpenAI)",
        notes: [
          "Полностью OpenAI-совместимый формат запроса и ответа",
          "Актуальные модели: mistral-large-latest, mistral-small-latest, mistral-medium-latest",
          "Поддерживает JSON mode: response_format: {type: 'json_object'}",
          "Поддерживает function calling (tools)",
          "Есть модели magistral для reasoning: magistral-medium-2506"
        ]
      },
      embeddings: {
        method: "POST",
        path: "/v1/embeddings",
        description: "Генерация эмбеддингов",
        bodyExample: '{"model":"mistral-embed","input":["Текст для эмбеддинга"]}',
        response: "data[0].embedding — массив чисел (идентично OpenAI)",
        notes: ["OpenAI-совместимый формат"]
      }
    },
    n8nNotes: [
      "OpenAI-совместимый! Можно копировать конфигурацию OpenAI и менять только baseUrl и ключ",
      "Формат ответа идентичен OpenAI: choices[0].message.content",
      "Есть OCR и Audio Transcription endpoints (beta)"
    ],
    rateLimits: "Зависит от tier и модели. Обычно 1-5 RPS",
    docsUrl: "https://docs.mistral.ai/api"
  },

  {
    name: "Groq",
    description: "Сверхбыстрый LLM inference (LPU). OpenAI-совместимый API.",
    category: ["ai", "llm", "fast-inference"],
    baseUrl: "https://api.groq.com/openai",
    auth: {
      type: "bearer",
      setup: "В n8n HTTP Request: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь Groq API Key (gsk_...)."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      chat_completions: {
        method: "POST",
        path: "/v1/chat/completions",
        description: "Генерация текста. OpenAI-совместимый. Ультра-быстрый inference.",
        bodyExample: '{"model":"llama-3.3-70b-versatile","messages":[{"role":"system","content":"Ты ассистент."},{"role":"user","content":"Привет!"}],"max_tokens":2000,"temperature":0.7}',
        response: "choices[0].message.content — строка с ответом (идентично OpenAI)",
        notes: [
          "OpenAI-совместимый формат",
          "ВАЖНО: base URL = https://api.groq.com/openai/v1 (НЕ просто /v1!)",
          "Модели: llama-3.3-70b-versatile, llama-3.1-8b-instant, mixtral-8x7b-32768, gemma2-9b-it",
          "Поддерживает Whisper транскрипцию (whisper-large-v3-turbo)",
          "Поддерживает tool calling"
        ]
      },
      audio_transcription: {
        method: "POST",
        path: "/v1/audio/transcriptions",
        description: "Транскрипция аудио через Whisper на Groq (очень быстро)",
        contentType: "multipart/form-data",
        bodyExample: "Form Data: file=@audio.mp3, model=whisper-large-v3-turbo",
        response: "text — строка с транскрипцией",
        notes: [
          "Тот же формат что и OpenAI Whisper",
          "Модель: whisper-large-v3-turbo",
          "Только binary файл, НЕ URL"
        ]
      }
    },
    n8nNotes: [
      "ВНИМАНИЕ: Base URL = https://api.groq.com/openai/v1 — в пути есть /openai/",
      "Без /openai/ в пути API вернёт 404! Частая ошибка.",
      "OpenAI-совместимый формат. Меняй только baseUrl, ключ и модель",
      "Самый быстрый inference — идеален для real-time приложений"
    ],
    rateLimits: "Free tier: 30 RPM, 14,400 RPD. Лимиты зависят от модели и tier.",
    docsUrl: "https://console.groq.com/docs/api-reference"
  },

  {
    name: "DeepSeek",
    description: "DeepSeek V3 chat completions и reasoning (R1). OpenAI-совместимый. Очень дешёвый.",
    category: ["ai", "llm", "reasoning"],
    baseUrl: "https://api.deepseek.com",
    auth: {
      type: "bearer",
      setup: "В n8n HTTP Request: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь DeepSeek API Key."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      chat_completions: {
        method: "POST",
        path: "/chat/completions",
        description: "Генерация текста. OpenAI-совместимый формат.",
        bodyExample: '{"model":"deepseek-chat","messages":[{"role":"system","content":"Ты помощник."},{"role":"user","content":"Привет!"}],"max_tokens":2000,"temperature":0.7,"stream":false}',
        response: "choices[0].message.content — строка с ответом",
        notes: [
          "OpenAI-совместимый формат",
          "ВАЖНО: base URL https://api.deepseek.com (БЕЗ /v1). Можно и с /v1 для совместимости",
          "Две модели: deepseek-chat (быстрый, V3.2) и deepseek-reasoner (thinking mode, V3.2)",
          "deepseek-reasoner возвращает reasoning_content в ответе (цепочка рассуждений)",
          "Поддерживает JSON mode и function calling",
          "Кэширование промптов — повторные запросы значительно дешевле"
        ]
      },
      chat_completions_reasoning: {
        method: "POST",
        path: "/chat/completions",
        description: "Reasoning mode (thinking) — цепочка рассуждений перед ответом",
        bodyExample: '{"model":"deepseek-reasoner","messages":[{"role":"user","content":"Реши задачу: ..."}],"max_tokens":4000,"stream":false}',
        response: "choices[0].message.content — финальный ответ, choices[0].message.reasoning_content — цепочка рассуждений",
        notes: [
          "reasoning_content содержит 'мысли' модели — полезно для отладки",
          "Значительно медленнее deepseek-chat, но точнее для сложных задач",
          "Для prefix completion: base_url = https://api.deepseek.com/beta"
        ]
      }
    },
    n8nNotes: [
      "Base URL: https://api.deepseek.com (без /v1 в основном пути, /v1 тоже работает для совместимости)",
      "OpenAI-совместимый — меняй только baseUrl, ключ и модель",
      "Очень дешёвый: ~10-30x дешевле OpenAI и Anthropic",
      "API может быть нестабилен при высокой нагрузке (503 ошибки) — добавь retry логику"
    ],
    rateLimits: "Зависит от tier. Возможны 503 при высокой нагрузке.",
    docsUrl: "https://api-docs.deepseek.com/"
  },

  {
    name: "Perplexity AI",
    description: "AI-поиск с цитатами. Chat completions с встроенным поиском по интернету.",
    category: ["ai", "llm", "search", "rag"],
    baseUrl: "https://api.perplexity.ai",
    auth: {
      type: "bearer",
      setup: "В n8n HTTP Request: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь Perplexity API Key (pplx-...)."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      chat_completions: {
        method: "POST",
        path: "/chat/completions",
        description: "Chat completion с автоматическим поиском по интернету. Возвращает ответ с цитатами.",
        bodyExample: '{"model":"sonar","messages":[{"role":"system","content":"Будь точным и кратким."},{"role":"user","content":"Какие последние новости про ИИ?"}],"max_tokens":1000}',
        response: "choices[0].message.content — ответ с цитатами. citations — массив URL источников.",
        notes: [
          "OpenAI-совместимый формат запроса",
          "УНИКАЛЬНОСТЬ: модели sonar автоматически ищут по интернету и возвращают citations",
          "Модели: sonar (быстрый поиск), sonar-pro (глубокий поиск)",
          "Дополнительные параметры: search_domain_filter (фильтр доменов), search_recency_filter ('day','week','month')",
          "Можно фильтровать источники: search_domain_filter: ['wikipedia.org', '-reddit.com']",
          "return_related_questions: true — вернёт предложения follow-up вопросов"
        ]
      }
    },
    n8nNotes: [
      "OpenAI-совместимый формат запроса",
      "Base URL: https://api.perplexity.ai (БЕЗ /v1!)",
      "Нет эндпоинта embeddings — только chat completions",
      "Модели sonar — с поиском, возвращают citations в ответе",
      "Идеален для задач требующих актуальную информацию из интернета"
    ],
    rateLimits: "Зависит от tier. Стандарт: ~50 RPM.",
    docsUrl: "https://docs.perplexity.ai"
  },

  {
    name: "OpenRouter",
    description: "Единый API-шлюз к 400+ моделям (OpenAI, Anthropic, Google, Meta и др.). OpenAI-совместимый.",
    category: ["ai", "llm", "gateway", "multi-model"],
    baseUrl: "https://openrouter.ai/api",
    auth: {
      type: "bearer",
      setup: "В n8n HTTP Request: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь OpenRouter API Key (sk-or-...)."
    },
    defaultHeaders: {
      "Content-Type": "application/json",
      "HTTP-Referer": "https://your-app.com",
      "X-Title": "Your App Name"
    },
    endpoints: {
      chat_completions: {
        method: "POST",
        path: "/v1/chat/completions",
        description: "Единый endpoint для всех 400+ моделей. OpenAI-совместимый.",
        bodyExample: '{"model":"anthropic/claude-sonnet-4-5","messages":[{"role":"user","content":"Привет!"}],"max_tokens":2000}',
        response: "choices[0].message.content — строка с ответом",
        notes: [
          "OpenAI-совместимый формат",
          "МОДЕЛЬ УКАЗЫВАЕТСЯ С ПРЕФИКСОМ ОРГАНИЗАЦИИ: openai/gpt-4o, anthropic/claude-sonnet-4-5, google/gemini-2.5-flash, meta-llama/llama-3.3-70b-instruct",
          "Опциональные заголовки HTTP-Referer и X-Title — для отображения в рейтинге OpenRouter",
          "Автоматический fallback между провайдерами при ошибках",
          "Если model не указан — используется модель по умолчанию из настроек аккаунта"
        ]
      }
    },
    n8nNotes: [
      "OpenAI-совместимый — самый простой способ переключаться между моделями",
      "Base URL: https://openrouter.ai/api/v1",
      "Модель = организация/модель: openai/gpt-4o, anthropic/claude-sonnet-4-5",
      "Заголовки HTTP-Referer и X-Title опциональны, но рекомендуются",
      "Цена = цена провайдера + 5% комиссия OpenRouter",
      "Есть бесплатные модели (с дневным лимитом)"
    ],
    rateLimits: "Зависит от модели и провайдера. OpenRouter добавляет свои лимиты поверх.",
    docsUrl: "https://openrouter.ai/docs/api/reference/overview"
  },

  {
    name: "Ollama",
    description: "Локальный LLM inference. Бесплатный, без API ключа. Свой формат API + OpenAI-совместимый endpoint.",
    category: ["ai", "llm", "local", "self-hosted"],
    baseUrl: "http://localhost:11434",
    auth: {
      type: "header",
      setup: "Авторизация НЕ требуется для локального использования. Просто отправляй запросы на localhost:11434.",
      headerName: "none"
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      chat: {
        method: "POST",
        path: "/api/chat",
        description: "Chat completion в нативном формате Ollama",
        bodyExample: '{"model":"llama3.2","messages":[{"role":"user","content":"Почему небо голубое?"}],"stream":false}',
        response: "message.content — строка с ответом (когда stream: false)",
        responseExample: '{"model":"llama3.2","created_at":"2025-01-01T00:00:00Z","message":{"role":"assistant","content":"Текст ответа"},"done":true,"done_reason":"stop"}',
        notes: [
          "Нативный формат Ollama — НЕ OpenAI совместимый!",
          "ОБЯЗАТЕЛЬНО stream: false если нужен единый ответ (по умолчанию stream: true!)",
          "Без stream: false вернёт NDJSON поток (несколько JSON объектов)",
          "Ответ в message.content (НЕ choices[0]!)",
          "Поддерживает tool calling через параметр tools"
        ]
      },
      generate: {
        method: "POST",
        path: "/api/generate",
        description: "Простая генерация (без chat формата)",
        bodyExample: '{"model":"llama3.2","prompt":"Расскажи анекдот","stream":false}',
        response: "response — строка с ответом",
        notes: [
          "Для простых запросов без истории диалога",
          "stream: false обязателен для единого ответа"
        ]
      },
      embeddings: {
        method: "POST",
        path: "/api/embed",
        description: "Генерация эмбеддингов (новый endpoint вместо /api/embeddings)",
        bodyExample: '{"model":"mxbai-embed-large","input":"Текст для эмбеддинга"}',
        response: "embeddings — массив массивов чисел",
        notes: [
          "Старый endpoint /api/embeddings deprecated, используй /api/embed",
          "input может быть строкой или массивом строк"
        ]
      },
      openai_compatible_chat: {
        method: "POST",
        path: "/v1/chat/completions",
        description: "OpenAI-совместимый endpoint (для совместимости с существующим кодом)",
        bodyExample: '{"model":"llama3.2","messages":[{"role":"user","content":"Привет!"}]}',
        response: "choices[0].message.content — идентично OpenAI",
        notes: [
          "OpenAI-совместимый обёртка над нативным API",
          "Путь: /v1/chat/completions (БЕЗ /api/ в начале!)",
          "Удобно если уже есть OpenAI-совместимый код"
        ]
      }
    },
    n8nNotes: [
      "НЕ НУЖНА АВТОРИЗАЦИЯ для локального использования",
      "ОБЯЗАТЕЛЬНО stream: false в body! Иначе n8n не сможет распарсить NDJSON поток",
      "Два варианта: нативный /api/chat (ответ в message.content) или совместимый /v1/chat/completions (ответ в choices[0])",
      "Модель должна быть предварительно скачана: ollama pull llama3.2",
      "Для облачного Ollama (ollama.com) — другой base URL и нужна авторизация",
      "URL по умолчанию: http://localhost:11434 — убедись что Ollama запущен"
    ],
    rateLimits: "Нет лимитов — ограничено только мощностью локального железа",
    docsUrl: "https://docs.ollama.com/api/introduction"
  },

  {
    name: "Cohere",
    description: "Command models — chat, embed, rerank. Сильный в RAG и tool use. НЕ OpenAI-совместимый формат.",
    category: ["ai", "llm", "embeddings", "rerank", "rag"],
    baseUrl: "https://api.cohere.com",
    auth: {
      type: "bearer",
      setup: "В n8n HTTP Request: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь Cohere API Key."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      chat: {
        method: "POST",
        path: "/v2/chat",
        description: "Chat completion. СВОЙ формат, НЕ OpenAI-совместимый!",
        bodyExample: '{"model":"command-a-03-2025","messages":[{"role":"system","content":"Ты помощник."},{"role":"user","content":"Привет!"}],"max_tokens":2000}',
        response: "message.content[0].text — строка с ответом",
        responseExample: '{"id":"abc123","type":"chat","message":{"role":"assistant","content":[{"type":"text","text":"Текст ответа"}]},"finish_reason":"COMPLETE","usage":{"billed_units":{"input_tokens":10,"output_tokens":50}}}',
        notes: [
          "API v2 — НЕ OpenAI-совместимый формат!",
          "Ответ в message.content[0].text (НЕ choices[0])",
          "finish_reason: COMPLETE (не 'stop')",
          "Актуальные модели: command-a-03-2025 (самый мощный), command-r-08-2024, command-r-plus-08-2024",
          "Встроенная поддержка RAG: передай documents в body для цитирования",
          "Встроенный tool use без дополнительной настройки",
          "Поддерживает JSON mode: response_format: {type: 'json_object'}"
        ]
      },
      embed: {
        method: "POST",
        path: "/v2/embed",
        description: "Генерация эмбеддингов для поиска и RAG",
        bodyExample: '{"model":"embed-v4.0","texts":["Текст для эмбеддинга"],"input_type":"search_document","embedding_types":["float"]}',
        response: "embeddings.float[0] — массив чисел",
        notes: [
          "ОБЯЗАТЕЛЬНЫЙ параметр input_type: 'search_document' (для индексации) или 'search_query' (для запроса)",
          "Поле texts (НЕ input как у OpenAI!)",
          "embedding_types: ['float'] или ['int8'] или ['ubinary']",
          "Модель: embed-v4.0 (новейшая), embed-english-v3.0, embed-multilingual-v3.0"
        ]
      },
      rerank: {
        method: "POST",
        path: "/v2/rerank",
        description: "Ранжирование документов по релевантности к запросу",
        bodyExample: '{"model":"rerank-v3.5","query":"Что такое машинное обучение?","documents":["Документ 1...","Документ 2..."],"top_n":3}',
        response: "results — массив объектов с index и relevance_score",
        notes: [
          "Незаменим для RAG пайплайнов — переранжирует результаты поиска",
          "documents — массив строк или объектов",
          "top_n — сколько лучших вернуть"
        ]
      }
    },
    n8nNotes: [
      "НЕ OpenAI-совместимый формат! Свой формат запросов и ответов",
      "API v2: endpoint /v2/chat (не /v1/chat/completions)",
      "Ответ в message.content[0].text",
      "Для embed: texts (НЕ input), input_type ОБЯЗАТЕЛЕН",
      "Rerank — уникальная фича: используй для улучшения RAG",
      "Есть OpenAI-compatible mode через отдельные инструменты/прокси"
    ],
    rateLimits: "Trial: 20 RPM. Production: зависит от плана.",
    docsUrl: "https://docs.cohere.com/reference/chat"
  },

  {
    name: "Together AI",
    description: "Платформа для inference open-source моделей. OpenAI-совместимый API.",
    category: ["ai", "llm", "inference", "open-source"],
    baseUrl: "https://api.together.xyz",
    auth: {
      type: "bearer",
      setup: "В n8n HTTP Request: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь Together API Key."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      chat_completions: {
        method: "POST",
        path: "/v1/chat/completions",
        description: "Chat completion. Полностью OpenAI-совместимый.",
        bodyExample: '{"model":"meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8","messages":[{"role":"system","content":"Ты помощник."},{"role":"user","content":"Привет!"}],"max_tokens":2000,"temperature":0.7}',
        response: "choices[0].message.content — идентично OpenAI",
        notes: [
          "Полностью OpenAI-совместимый формат",
          "Модели указываются полным именем: meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
          "Поддерживает vision (изображения в messages), embeddings, function calling",
          "Есть image generation endpoint: /v1/images/generations"
        ]
      },
      embeddings: {
        method: "POST",
        path: "/v1/embeddings",
        description: "Генерация эмбеддингов. OpenAI-совместимый.",
        bodyExample: '{"model":"togethercomputer/m2-bert-80M-8k-retrieval","input":"Текст для эмбеддинга"}',
        response: "data[0].embedding — идентично OpenAI",
        notes: ["OpenAI-совместимый формат"]
      },
      image_generation: {
        method: "POST",
        path: "/v1/images/generations",
        description: "Генерация изображений через Flux и другие модели",
        bodyExample: '{"model":"black-forest-labs/FLUX.1-schnell-Free","prompt":"Кот в космосе","n":1,"steps":4}',
        response: "data[0].url или data[0].b64_json",
        notes: ["Поддерживает Flux, SDXL и другие open-source модели"]
      }
    },
    n8nNotes: [
      "OpenAI-совместимый — копируй OpenAI конфигурацию, меняй baseUrl и ключ",
      "Base URL: https://api.together.xyz/v1",
      "Большой выбор open-source моделей: Llama, Qwen, Mixtral, DeepSeek и др."
    ],
    rateLimits: "Зависит от tier и модели.",
    docsUrl: "https://docs.together.ai/docs/openai-api-compatibility"
  },

  {
    name: "Fireworks AI",
    description: "Быстрый inference open-source моделей. OpenAI-совместимый API.",
    category: ["ai", "llm", "inference", "fast-inference"],
    baseUrl: "https://api.fireworks.ai/inference",
    auth: {
      type: "bearer",
      setup: "В n8n HTTP Request: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь Fireworks API Key."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      chat_completions: {
        method: "POST",
        path: "/v1/chat/completions",
        description: "Chat completion. OpenAI-совместимый.",
        bodyExample: '{"model":"accounts/fireworks/models/llama-v3p3-70b-instruct","messages":[{"role":"user","content":"Привет!"}],"max_tokens":2000,"temperature":0.7}',
        response: "choices[0].message.content — идентично OpenAI",
        notes: [
          "OpenAI-совместимый формат",
          "МОДЕЛИ: длинный формат accounts/fireworks/models/{model-name}",
          "Поддерживает JSON mode, function calling, structured outputs",
          "Поддерживает document inlining (PDF/images через image_url)",
          "Есть Responses API (новый, совместимый с OpenAI Responses)"
        ]
      }
    },
    n8nNotes: [
      "Base URL: https://api.fireworks.ai/inference/v1 — обрати внимание на /inference/ в пути!",
      "OpenAI-совместимый формат запроса и ответа",
      "Модели в формате accounts/fireworks/models/{name}",
      "Быстрый inference, хорошие цены"
    ],
    rateLimits: "Зависит от tier. Generous free tier.",
    docsUrl: "https://docs.fireworks.ai/api-reference/post-chatcompletions"
  },

  {
    name: "Cerebras",
    description: "Ультра-быстрый AI inference на Wafer-Scale Engine. OpenAI-совместимый API.",
    category: ["ai", "llm", "fast-inference"],
    baseUrl: "https://api.cerebras.ai",
    auth: {
      type: "bearer",
      setup: "В n8n HTTP Request: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь Cerebras API Key (csk-...)."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      chat_completions: {
        method: "POST",
        path: "/v1/chat/completions",
        description: "Chat completion. OpenAI-совместимый. Ультра-быстрый inference.",
        bodyExample: '{"model":"llama-3.3-70b","messages":[{"role":"user","content":"Привет!"}],"max_tokens":2000,"temperature":0.7}',
        response: "choices[0].message.content — идентично OpenAI",
        notes: [
          "OpenAI-совместимый формат",
          "Модели: llama-3.3-70b, llama-4-scout-17b-16e-instruct, gpt-oss-120b (reasoning), qwen-3-32b",
          "gpt-oss-120b поддерживает reasoning_effort: 'low' | 'medium' | 'high'",
          "Рассуждения модели в choices[0].message.reasoning",
          "Поддерживает tool calling, JSON mode, structured outputs"
        ]
      }
    },
    n8nNotes: [
      "OpenAI-совместимый — копируй OpenAI конфигурацию",
      "Base URL: https://api.cerebras.ai/v1",
      "Самый быстрый inference — WSE (Wafer-Scale Engine) архитектура",
      "Для reasoning моделей: reasoning content в отдельном поле"
    ],
    rateLimits: "Free tier доступен. Лимиты зависят от tier.",
    docsUrl: "https://inference-docs.cerebras.ai/api-reference/chat-completions"
  },

  {
    name: "xAI (Grok)",
    description: "Grok LLM от xAI. OpenAI-совместимый API + Live Search + Image Generation.",
    category: ["ai", "llm", "search", "image-generation"],
    baseUrl: "https://api.x.ai",
    auth: {
      type: "bearer",
      setup: "В n8n HTTP Request: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь xAI API Key."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      chat_completions: {
        method: "POST",
        path: "/v1/chat/completions",
        description: "Chat completion. OpenAI-совместимый. Grok модели.",
        bodyExample: '{"model":"grok-4","messages":[{"role":"system","content":"You are Grok."},{"role":"user","content":"What is the meaning of life?"}],"max_tokens":2000,"stream":false}',
        response: "choices[0].message.content — идентично OpenAI",
        notes: [
          "OpenAI-совместимый формат",
          "Модели: grok-4, grok-4-1-fast-reasoning, grok-code-fast-1",
          "Reasoning модели используют max_completion_tokens вместо max_tokens!",
          "reasoning_content доступен в ответе для reasoning моделей",
          "Anthropic SDK совместимость DEPRECATED — используй только OpenAI формат",
          "Поддерживает vision (изображения в messages)"
        ]
      },
      image_generation: {
        method: "POST",
        path: "/v1/images/generations",
        description: "Генерация изображений через Aurora (xAI image model)",
        bodyExample: '{"model":"grok-2-image","prompt":"Кот в космосе","n":1,"size":"1024x1024"}',
        response: "data[0].url — URL изображения",
        notes: ["OpenAI-совместимый формат images/generations"]
      }
    },
    n8nNotes: [
      "OpenAI-совместимый — копируй OpenAI конфигурацию",
      "Base URL: https://api.x.ai/v1",
      "Для reasoning моделей (grok-4): используй max_completion_tokens, НЕ max_tokens",
      "Есть Responses API (/v1/responses) — новый формат с web search и X search",
      "Региональные endpoints доступны: https://us-west-1.api.x.ai/v1",
      "Таймауты могут быть длинными для reasoning моделей — увеличь до 3600с"
    ],
    rateLimits: "Зависит от tier. Free tier с $25 кредитов.",
    docsUrl: "https://docs.x.ai/docs/api-reference"
  },

  {
    name: "AI21 Labs",
    description: "Jamba модели — гибридная SSM-Transformer архитектура. OpenAI-совместимый chat completions.",
    category: ["ai", "llm", "enterprise"],
    baseUrl: "https://api.ai21.com",
    auth: {
      type: "bearer",
      setup: "В n8n HTTP Request: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь AI21 API Key."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      chat_completions: {
        method: "POST",
        path: "/studio/v1/chat/completions",
        description: "Chat completion для Jamba моделей. OpenAI-совместимый формат.",
        bodyExample: '{"model":"jamba-large","messages":[{"role":"system","content":"Ты помощник."},{"role":"user","content":"Привет!"}],"max_tokens":1024,"temperature":0.7}',
        response: "choices[0].message.content — идентично OpenAI",
        notes: [
          "OpenAI-совместимый формат запроса и ответа",
          "ПУТЬ: /studio/v1/chat/completions (есть /studio/ в пути!)",
          "Модели: jamba-large (94B active/398B total), jamba-mini (12B active/52B total)",
          "Контекст 256K токенов",
          "max_tokens максимум 4096",
          "Поддерживает function calling, JSON mode, documents (для RAG)",
          "Поле documents в body — уникальная фича для grounded generation (RAG)"
        ]
      }
    },
    n8nNotes: [
      "Base URL: https://api.ai21.com/studio/v1 — обрати внимание на /studio/!",
      "OpenAI-совместимый формат, но с уникальными фичами (documents для RAG)",
      "max_tokens ограничен 4096 — для длинных ответов разбивай на части",
      "Также доступен через AWS Bedrock и Google Vertex AI"
    ],
    rateLimits: "Зависит от tier.",
    docsUrl: "https://docs.ai21.com/reference/jamba-1-6-api-ref"
  },

  {
    name: "Hugging Face",
    description: "Единый API к тысячам моделей через Inference Providers (15+ провайдеров). OpenAI-совместимый для LLM.",
    category: ["ai", "llm", "inference", "multi-model", "embeddings", "image-generation"],
    baseUrl: "https://router.huggingface.co",
    auth: {
      type: "bearer",
      setup: "В n8n HTTP Request: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь Hugging Face Token (hf_...)."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      chat_completions: {
        method: "POST",
        path: "/v1/chat/completions",
        description: "Chat completion через Inference Providers. OpenAI-совместимый.",
        bodyExample: '{"model":"deepseek-ai/DeepSeek-V3","messages":[{"role":"user","content":"Привет!"}],"max_tokens":2000,"stream":false}',
        response: "choices[0].message.content — идентично OpenAI",
        notes: [
          "OpenAI-совместимый для chat completions",
          "Модель = HF model ID: meta-llama/Llama-3.3-70B-Instruct, deepseek-ai/DeepSeek-V3",
          "Автоматически выбирает провайдера (Together, Fireworks, Sambanova и др.)",
          "Можно указать провайдера через X-HF-Provider header",
          "Не все модели доступны — зависит от провайдеров"
        ]
      },
      dedicated_endpoint: {
        method: "POST",
        path: "/v1/chat/completions",
        description: "Свой Inference Endpoint (выделенный GPU). URL уникальный для каждого endpoint.",
        bodyExample: '{"model":"tgi","messages":[{"role":"user","content":"Привет!"}],"max_tokens":500}',
        response: "choices[0].message.content",
        notes: [
          "URL уникальный: https://your-endpoint.region.aws.endpoints.huggingface.cloud/v1/chat/completions",
          "Нужно заменить base URL на URL вашего endpoint + /v1/",
          "Формат OpenAI-совместимый (TGI backend)"
        ]
      }
    },
    n8nNotes: [
      "Два режима: Inference Providers (serverless) и Inference Endpoints (dedicated)",
      "Для Providers: base URL = https://router.huggingface.co/v1, модель = HF model ID",
      "Для Endpoints: base URL = URL вашего endpoint + /v1/",
      "OpenAI-совместимый только для chat completions",
      "Для других задач (text-to-image, ASR и др.) — свой формат API",
      "Токен HF (hf_...) работает как Bearer token"
    ],
    rateLimits: "Зависит от провайдера и tier. Free tier с ограничениями.",
    docsUrl: "https://huggingface.co/docs/inference-providers/en/index"
  },

  {
    name: "Replicate",
    description: "Платформа для запуска ML моделей через API. ASYNC паттерн: POST создать → GET получить результат.",
    category: ["ai", "llm", "image-generation", "audio", "video", "ml-platform"],
    baseUrl: "https://api.replicate.com",
    auth: {
      type: "bearer",
      setup: "В n8n HTTP Request: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь Replicate API Token (r8_...)."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_prediction: {
        method: "POST",
        path: "/v1/predictions",
        description: "Создать prediction (запуск модели). ASYNC по умолчанию! Для sync добавь ?wait=60.",
        bodyExample: '{"version":"black-forest-labs/flux-schnell","input":{"prompt":"Кот в космосе"}}',
        response: "id — ID prediction для последующего GET запроса. output — результат (если sync).",
        responseExample: '{"id":"abc123","status":"starting","urls":{"get":"https://api.replicate.com/v1/predictions/abc123"}}',
        notes: [
          "ASYNC ПО УМОЛЧАНИЮ! Возвращает prediction с status 'starting' или 'processing'",
          "Для SYNC: добавь ?wait=60 к URL (ждёт до 60 сек)",
          "version = owner/model (для official) или owner/model:version_id (для community)",
          "input зависит от конкретной модели — проверь документацию модели",
          "Для LLM: результат в output (строка или массив строк)",
          "Для image: результат в output (URL изображения или массив URL)"
        ]
      },
      get_prediction: {
        method: "GET",
        path: "/v1/predictions/{prediction_id}",
        description: "Получить статус и результат prediction. Используй для polling в async режиме.",
        response: "status ('starting'|'processing'|'succeeded'|'failed'), output — результат когда succeeded",
        notes: [
          "Polling: повторяй GET каждые 1-2 секунды пока status != 'succeeded'",
          "В n8n: используй Wait нод между POST и GET для polling",
          "Альтернатива polling: webhooks (передай webhook URL в POST)"
        ]
      }
    },
    n8nNotes: [
      "НЕ OpenAI-совместимый! Свой формат API с predictions.",
      "ASYNC паттерн: 1) POST /v1/predictions → получи ID, 2) GET /v1/predictions/{id} → проверь status",
      "Для простых случаев: POST /v1/predictions?wait=60 — подождёт до минуты",
      "Auth: Authorization: Bearer (НЕ Token! Хотя старые доки говорят Token, Bearer тоже работает)",
      "input зависит от модели — нет единого формата body",
      "Идеален для image/video/audio генерации (Flux, Stable Diffusion и др.)",
      "Для LLM лучше использовать OpenAI-совместимые платформы"
    ],
    rateLimits: "predictions.create: 600 RPM. Другие endpoints: 3000 RPM.",
    docsUrl: "https://replicate.com/docs/reference/http"
  },

  {
    name: "AWS Bedrock",
    description: "AWS managed AI сервис. OpenAI-совместимый endpoint + нативный AWS API. Модели: Claude, Llama, Mistral и др.",
    category: ["ai", "llm", "cloud", "enterprise", "aws"],
    baseUrl: "https://bedrock-runtime.{region}.amazonaws.com",
    auth: {
      type: "header",
      setup: "Два варианта: 1) AWS SigV4 подпись (сложно для n8n) — нужны AWS credentials. 2) Bedrock API Key (проще) — передай как Bearer token. В n8n: проще использовать OpenAI-compatible endpoint с Bedrock API Key.",
      headerName: "Authorization"
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      openai_chat_completions: {
        method: "POST",
        path: "/openai/v1/chat/completions",
        description: "OpenAI-совместимый endpoint. РЕКОМЕНДУЕТСЯ для n8n!",
        bodyExample: '{"model":"anthropic.claude-sonnet-4-5-v1:0","messages":[{"role":"user","content":"Привет!"}],"max_tokens":2000}',
        response: "choices[0].message.content — идентично OpenAI",
        notes: [
          "OpenAI-совместимый формат!",
          "model = Bedrock model ID: anthropic.claude-sonnet-4-5-v1:0, meta.llama3-70b-instruct-v1:0",
          "URL: https://bedrock-runtime.{region}.amazonaws.com/openai/v1/chat/completions",
          "Auth: Bedrock API Key как Bearer token (самый простой вариант)",
          "Альтернатива: AWS SigV4 подпись (сложнее настроить в n8n)"
        ]
      },
      invoke_model: {
        method: "POST",
        path: "/model/{modelId}/invoke",
        description: "Нативный Bedrock API. Формат body зависит от провайдера модели.",
        notes: [
          "Формат body РАЗНЫЙ для каждого провайдера (Anthropic, Meta, Mistral)",
          "Требует AWS SigV4 подпись — сложно в n8n без AWS ноды",
          "Рекомендуется использовать OpenAI-compatible endpoint вместо этого"
        ]
      }
    },
    n8nNotes: [
      "РЕКОМЕНДАЦИЯ: используй OpenAI-совместимый endpoint /openai/v1/chat/completions",
      "URL = https://bedrock-runtime.us-east-1.amazonaws.com/openai/v1/chat/completions",
      "Для Auth: сгенерируй Bedrock API Key в AWS Console → используй как Bearer token",
      "Без API Key нужна AWS SigV4 подпись — это ОЧЕНЬ сложно в n8n HTTP Request",
      "Модели: anthropic.claude-*, meta.llama3-*, mistral.*, ai21.jamba-*",
      "Region-specific: замени {region} на нужный регион (us-east-1, eu-west-1 и т.д.)"
    ],
    rateLimits: "Зависит от модели и региона. Настраиваемые quotas в AWS.",
    docsUrl: "https://docs.aws.amazon.com/bedrock/latest/userguide/inference-chat-completions.html"
  },

  {
    name: "Azure OpenAI",
    description: "OpenAI модели через Azure. OpenAI-совместимый API, но с другим URL и api-version.",
    category: ["ai", "llm", "cloud", "enterprise", "azure"],
    baseUrl: "https://{resource-name}.openai.azure.com",
    auth: {
      type: "header",
      setup: "В n8n HTTP Request: добавь заголовок api-key: YOUR_AZURE_OPENAI_KEY. Альтернативно: Azure AD Bearer token.",
      headerName: "api-key"
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      chat_completions_v1: {
        method: "POST",
        path: "/openai/v1/chat/completions",
        description: "НОВЫЙ v1 API (с августа 2025). Стандартный OpenAI формат. Рекомендуется.",
        bodyExample: '{"model":"gpt-4o","messages":[{"role":"user","content":"Привет!"}],"max_tokens":2000}',
        response: "choices[0].message.content — идентично OpenAI",
        notes: [
          "НОВЫЙ формат (v1): НЕ нужен api-version query param!",
          "URL: https://{resource-name}.openai.azure.com/openai/v1/chat/completions",
          "model = имя deployment (НЕ имя модели OpenAI!)",
          "Auth: заголовок api-key (НЕ Authorization Bearer!)",
          "Поддерживает модели из других провайдеров (DeepSeek, Grok) тоже"
        ]
      },
      chat_completions_classic: {
        method: "POST",
        path: "/openai/deployments/{deployment-id}/chat/completions",
        description: "Классический API с api-version. Всё ещё поддерживается.",
        bodyExample: '{"messages":[{"role":"user","content":"Привет!"}],"max_tokens":2000}',
        response: "choices[0].message.content",
        notes: [
          "URL: https://{resource}.openai.azure.com/openai/deployments/{deployment}/chat/completions?api-version=2024-10-21",
          "ОБЯЗАТЕЛЕН query param api-version!",
          "deployment-id — имя твоего deployment в Azure Portal",
          "model НЕ указывается в body — он определяется deployment",
          "Auth: заголовок api-key"
        ]
      }
    },
    n8nNotes: [
      "РЕКОМЕНДАЦИЯ: используй новый v1 API (без api-version)",
      "URL: https://{resource-name}.openai.azure.com/openai/v1/chat/completions",
      "Auth: заголовок api-key (НЕ Bearer!). Добавь в n8n: Header Name = api-key, Value = ключ",
      "model в body = имя deployment, НЕ имя модели OpenAI",
      "Если используешь классический API: ОБЯЗАТЕЛЬНО добавь ?api-version=2024-10-21 к URL",
      "Resource name = имя ресурса из Azure Portal (уникальное имя твоего Azure OpenAI Service)"
    ],
    rateLimits: "Настраиваемые в Azure Portal. TPM (tokens per minute) на уровне deployment.",
    docsUrl: "https://learn.microsoft.com/en-us/azure/foundry/openai/api-version-lifecycle"
  },

  {
    name: "Google Vertex AI",
    description: "Google Cloud AI платформа. Gemini модели + модели третьих сторон. НЕ OpenAI-совместимый нативный API.",
    category: ["ai", "llm", "cloud", "enterprise", "gcp"],
    baseUrl: "https://{region}-aiplatform.googleapis.com",
    auth: {
      type: "bearer",
      setup: "В n8n: нужен Google Cloud OAuth2 access token (не API key!). Используй n8n Google Cloud credentials или получи токен через gcloud auth print-access-token."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      generateContent: {
        method: "POST",
        path: "/v1/projects/{PROJECT_ID}/locations/{LOCATION}/publishers/google/models/{MODEL_ID}:generateContent",
        description: "Генерация текста через Gemini. Формат как у Gemini API (НЕ OpenAI!).",
        bodyExample: '{"contents":[{"role":"user","parts":[{"text":"Расскажи про Париж"}]}],"generationConfig":{"temperature":0.7,"maxOutputTokens":2048}}',
        response: "candidates[0].content.parts[0].text",
        notes: [
          "ФОРМАТ КАК У GEMINI API — НЕ OpenAI-совместимый!",
          "Длинный URL: /v1/projects/{PROJECT}/locations/{LOCATION}/publishers/google/models/{MODEL}:generateContent",
          "Auth: OAuth2 Bearer token (НЕ API key как в Gemini API!)",
          "Модели: gemini-2.5-flash, gemini-2.5-pro",
          "Location: us-central1, europe-west1 и др."
        ]
      },
      openai_compatible: {
        method: "POST",
        path: "/v1beta1/projects/{PROJECT_ID}/locations/{LOCATION}/endpoints/openapi/chat/completions",
        description: "OpenAI-совместимый endpoint (beta). Проще для интеграции.",
        bodyExample: '{"model":"google/gemini-2.5-flash","messages":[{"role":"user","content":"Привет!"}],"max_tokens":2000}',
        response: "choices[0].message.content",
        notes: [
          "OpenAI-совместимый формат (beta)",
          "Доступен для ограниченного набора моделей",
          "Auth: всё ещё OAuth2 Bearer token"
        ]
      }
    },
    n8nNotes: [
      "СЛОЖНАЯ НАСТРОЙКА: требует Google Cloud OAuth2 (не просто API key!)",
      "Для простых случаев РЕКОМЕНДУЕТСЯ использовать Gemini API напрямую (с API key)",
      "Если нужен именно Vertex AI: используй n8n Google Cloud credentials для получения OAuth2 токена",
      "URL включает project ID, location и model — очень длинный",
      "Формат body как у Gemini API: contents[].parts[].text",
      "Есть OpenAI-compatible endpoint (beta) — проще, но с ограничениями",
      "Vertex AI нужен для: enterprise security, VPC, private endpoints, моделей третьих сторон"
    ],
    rateLimits: "Настраиваемые quotas в GCP Console.",
    docsUrl: "https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/inference"
  },

  {
    name: "DALL-E (OpenAI)",
    description: "Генерация изображений через DALL-E 3 от OpenAI",
    category: ["image-generation"],
    baseUrl: "https://api.openai.com",
    auth: {
      type: "bearer",
      setup: "В n8n HTTP Request: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь OpenAI API Key."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      generate: {
        method: "POST",
        path: "/v1/images/generations",
        description: "Генерация изображения по текстовому промпту",
        bodyExample: '{"model":"dall-e-3","prompt":"Кот в космосе в стиле ван Гога","n":1,"size":"1024x1024","quality":"standard","response_format":"url"}',
        response: "data[0].url — URL изображения (временный!) или data[0].b64_json",
        notes: [
          "DALL-E 3: n ТОЛЬКО 1 (нельзя несколько за раз)",
          "URL изображения временный (~1 час) — сразу скачай!",
          "Размеры DALL-E 3: 1024x1024, 1024x1792, 1792x1024",
          "quality: 'standard' или 'hd'",
          "response_format: 'url' (по умолчанию) или 'b64_json'"
        ]
      },
      edit: {
        method: "POST",
        path: "/v1/images/edits",
        description: "Редактирование изображения (inpainting)",
        contentType: "multipart/form-data",
        bodyExample: "Form Data: image=@image.png, mask=@mask.png, prompt='Добавь шляпу', model=dall-e-2, n=1, size=1024x1024",
        response: "data[0].url",
        notes: [
          "ТОЛЬКО multipart/form-data!",
          "В n8n: Body Content Type = Multipart Form Data",
          "Edits доступны только для DALL-E 2 (не 3!)",
          "Изображение должно быть PNG, квадратное, до 4MB"
        ]
      }
    },
    n8nNotes: [
      "Для generations: стандартный JSON body",
      "Для edits: ОБЯЗАТЕЛЬНО multipart/form-data",
      "URL результата временный — добавь HTTP Request для скачивания сразу после",
      "DALL-E 3 генерирует только 1 изображение за раз"
    ],
    rateLimits: "Tier 1: 5 images/min для DALL-E 3",
    docsUrl: "https://platform.openai.com/docs/api-reference/images"
  },

  {
    name: "Stability AI",
    description: "Stable Diffusion API — генерация через SDXL, SD3, Ultra. ОТВЕТ БИНАРНЫЙ!",
    category: ["image-generation", "image-editing"],
    baseUrl: "https://api.stability.ai",
    auth: {
      type: "bearer",
      setup: "В n8n HTTP Request: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь Stability AI API Key."
    },
    defaultHeaders: {},
    endpoints: {
      generate_sd3: {
        method: "POST",
        path: "/v2beta/stable-image/generate/sd3",
        description: "Генерация через SD3/SD3-Turbo. ВНИМАНИЕ: multipart/form-data + бинарный ответ!",
        contentType: "multipart/form-data",
        body: "multipart/form-data: prompt (string), model ('sd3'|'sd3-turbo'), aspect_ratio, output_format ('jpeg'|'png'), seed",
        bodyExample: "Form Data: prompt=A cat in space, model=sd3-turbo, aspect_ratio=1:1, output_format=jpeg, seed=0",
        response: "BINARY! Тело ответа = файл изображения. finish-reason и seed в заголовках ответа.",
        notes: [
          "КРИТИЧНО: запрос multipart/form-data, ответ БИНАРНЫЙ!",
          "В n8n: Body Content Type = Multipart Form Data, Response Format = File",
          "Результат — raw binary image, НЕ JSON!",
          "finish-reason в заголовке ответа: если 'CONTENT_FILTERED' — NSFW фильтр сработал",
          "seed возвращается в заголовке ответа"
        ]
      },
      generate_ultra: {
        method: "POST",
        path: "/v2beta/stable-image/generate/ultra",
        description: "Генерация высококачественных изображений через Ultra модель",
        contentType: "multipart/form-data",
        bodyExample: "Form Data: prompt=Beautiful landscape, aspect_ratio=16:9, output_format=png",
        response: "BINARY файл изображения",
        notes: [
          "Тот же паттерн: multipart запрос, бинарный ответ",
          "Ultra — более высокое качество чем SD3"
        ]
      },
      generate_core: {
        method: "POST",
        path: "/v2beta/stable-image/generate/core",
        description: "Быстрая генерация через Core модель (дешевле)",
        contentType: "multipart/form-data",
        bodyExample: "Form Data: prompt=A dog playing, aspect_ratio=1:1, output_format=jpeg",
        response: "BINARY файл изображения",
        notes: ["Core — быстрее и дешевле чем Ultra/SD3"]
      }
    },
    n8nNotes: [
      "ВСЕ endpoints: Body Content Type = Multipart Form Data!",
      "ВСЕ endpoints: Response Format = File! Ответ — бинарный файл, НЕ JSON!",
      "НЕ как OpenAI DALL-E (где JSON с URL). Здесь сразу binary image.",
      "Проверяй заголовок finish-reason в ответе на CONTENT_FILTERED",
      "Aspect ratios: 21:9, 16:9, 3:2, 5:4, 1:1, 4:5, 2:3, 9:16, 9:21"
    ],
    rateLimits: "Зависит от tier. Кредитная система.",
    docsUrl: "https://platform.stability.ai/docs/api-reference"
  },

  {
    name: "Flux (Black Forest Labs)",
    description: "FLUX image generation. ASYNC паттерн: POST создать → GET polling результата.",
    category: ["image-generation"],
    baseUrl: "https://api.bfl.ai",
    auth: {
      type: "header",
      setup: "В n8n HTTP Request: добавь заголовок x-key: YOUR_BFL_API_KEY.",
      headerName: "x-key"
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      generate: {
        method: "POST",
        path: "/v1/flux-2-pro",
        description: "Создать задачу на генерацию. Возвращает task ID для polling. ASYNC!",
        bodyExample: '{"prompt":"A cat on its back legs running holding a fish","width":1024,"height":1024,"output_format":"png"}',
        response: "id — task ID для polling",
        responseExample: '{"id":"abc123-task-id"}',
        notes: [
          "ASYNC API! Возвращает только ID задачи, НЕ изображение!",
          "Эндпоинт модели в URL: /v1/flux-2-pro, /v1/flux-2-max, /v1/flux-dev",
          "Auth: заголовок x-key (НЕ Bearer, НЕ Authorization!)",
          "Также доступны: flux-kontext-pro (image editing), flux-kontext-max",
          "Региональные endpoints: api.eu.bfl.ai, api.us.bfl.ai"
        ]
      },
      get_result: {
        method: "GET",
        path: "/v1/get_result",
        description: "Polling результата по task ID",
        body: "Query param: id=TASK_ID",
        response: "status ('Pending'|'Ready'|'Error'), result.sample — URL изображения когда Ready",
        responseExample: '{"status":"Ready","result":{"sample":"https://delivery-us.bfl.ai/...image.png"}}',
        notes: [
          "Polling: повторяй GET каждые 1-2 сек пока status != 'Ready'",
          "URL изображения в result.sample",
          "Delivery URLs (delivery-eu.bfl.ai) — НЕ для прямой раздачи пользователям!",
          "Скачай изображение и раздавай со своей инфры",
          "CORS не включён на delivery URLs"
        ]
      }
    },
    n8nNotes: [
      "ASYNC паттерн: 1) POST /v1/flux-2-pro → получи ID, 2) Wait нод, 3) GET /v1/get_result?id=...",
      "Auth: кастомный заголовок x-key (НЕ Bearer!)",
      "Модель указывается в URL пути, не в body",
      "Лимит: 24 active tasks одновременно (flux-kontext-max: 6)",
      "Delivery URL изображений НЕ для прямой раздачи — скачай и пересохрани"
    ],
    rateLimits: "24 active tasks max. 402 если кончились кредиты.",
    docsUrl: "https://docs.bfl.ml/quick_start/generating_images"
  },

  {
    name: "Leonardo AI",
    description: "Генерация изображений с моделями Leonardo, Flux Kontext и др. ASYNC: POST → polling GET.",
    category: ["image-generation", "image-editing"],
    baseUrl: "https://cloud.leonardo.ai/api/rest/v1",
    auth: {
      type: "bearer",
      setup: "В n8n HTTP Request: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь Leonardo API Key."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_generation: {
        method: "POST",
        path: "/generations",
        description: "Создать задачу на генерацию изображений. ASYNC — возвращает generationId.",
        bodyExample: '{"prompt":"An oil painting of a cat","modelId":"6bef9f1b-29cb-40c7-b9df-32b51c1f67d3","height":512,"width":512,"num_images":4}',
        response: "sdGenerationJob.generationId — ID для получения результата",
        notes: [
          "ASYNC! Возвращает generationId, НЕ изображения!",
          "modelId ОБЯЗАТЕЛЕН — это UUID модели из Leonardo (НЕ имя модели!)",
          "Найди modelId через GET /platformModels или в UI Leonardo",
          "num_images: 1-8 (сколько изображений генерировать)",
          "Поддерживает Flux Kontext: modelId=28aeddf8-bd19-4803-80fc-79602d1a9989",
          "Есть webhooks — настрой при создании API key"
        ]
      },
      get_generation: {
        method: "GET",
        path: "/generations/{generationId}",
        description: "Получить результат генерации по ID. Polling пока status=COMPLETE.",
        response: "generations_by_pk.generated_images[].url — массив URL изображений",
        notes: [
          "status: PENDING → ... → COMPLETE или FAILED",
          "Polling: повторяй каждые 2-3 сек пока status != COMPLETE",
          "URL изображений НЕ истекают (в отличие от DALL-E)",
          "generated_images — массив объектов с url и id"
        ]
      }
    },
    n8nNotes: [
      "ASYNC: 1) POST /generations → generationId, 2) Wait нод 3-5с, 3) GET /generations/{id}",
      "modelId — UUID, не имя! Используй UI Leonardo или GET /platformModels",
      "Изображения не истекают — URL постоянные",
      "Webhooks доступны как альтернатива polling"
    ],
    rateLimits: "Зависит от API плана. Concurrency limits.",
    docsUrl: "https://docs.leonardo.ai/reference/creategeneration"
  },

  {
    name: "Midjourney (GoAPI)",
    description: "Неофициальный API для Midjourney через GoAPI. ASYNC: POST задачу → polling результата.",
    category: ["image-generation"],
    baseUrl: "https://api.goapi.ai",
    auth: {
      type: "header",
      setup: "В n8n HTTP Request: добавь заголовок x-api-key: YOUR_GOAPI_KEY.",
      headerName: "x-api-key"
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      imagine: {
        method: "POST",
        path: "/mj/v2/imagine",
        description: "Создать задачу Midjourney /imagine. ASYNC!",
        bodyExample: '{"prompt":"A cat in space --ar 16:9 --v 6.1","process_mode":"fast"}',
        response: "task_id — ID задачи для polling",
        notes: [
          "ASYNC! Возвращает task_id",
          "prompt включает параметры Midjourney: --ar, --v, --style и др.",
          "process_mode: 'fast', 'relax', 'turbo'",
          "Это НЕОФИЦИАЛЬНЫЙ API — может быть нестабильным"
        ]
      },
      fetch_task: {
        method: "POST",
        path: "/mj/v2/fetch",
        description: "Получить статус и результат задачи",
        bodyExample: '{"task_id":"YOUR_TASK_ID"}',
        response: "status, task_result.image_url — URL готового изображения",
        notes: [
          "Polling до status=finished",
          "Результат в task_result.image_url"
        ]
      }
    },
    n8nNotes: [
      "НЕОФИЦИАЛЬНЫЙ API через GoAPI — Midjourney не имеет официального REST API",
      "ASYNC: POST /mj/v2/imagine → task_id, потом POST /mj/v2/fetch с task_id",
      "Auth: заголовок x-api-key",
      "Поддерживает все MJ параметры через промпт",
      "Может быть нестабильным и медленным"
    ],
    rateLimits: "Зависит от GoAPI плана.",
    docsUrl: "https://api.goapi.ai/docs"
  },

  {
    name: "Ideogram",
    description: "AI генерация изображений с отличным рендерингом текста. Кастомный заголовок Api-Key.",
    category: ["image-generation", "design"],
    baseUrl: "https://api.ideogram.ai",
    auth: {
      type: "header",
      setup: "В n8n HTTP Request: добавь заголовок Api-Key: YOUR_IDEOGRAM_KEY.",
      headerName: "Api-Key"
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      generate_v3: {
        method: "POST",
        path: "/v3/generate",
        description: "Генерация через Ideogram 3.0. Лучший рендеринг текста на изображениях.",
        bodyExample: '{"prompt":"A poster with text HELLO WORLD in neon lights","aspect_ratio":"1x1","rendering_speed":"DEFAULT","magic_prompt_option":"AUTO","num_images":1}',
        response: "data[].url — массив URL изображений",
        notes: [
          "Лучший среди всех в рендеринге текста на изображениях!",
          "Auth: заголовок Api-Key (НЕ Bearer, НЕ x-api-key!)",
          "URL изображений ВРЕМЕННЫЕ — скачай сразу!",
          "aspect_ratio: '1x1', '16x9', '9x16' и др. (формат Xx не X:Y!)",
          "rendering_speed: 'DEFAULT' или 'QUALITY'",
          "magic_prompt_option: 'AUTO', 'ON', 'OFF' — AI улучшение промпта",
          "style_type: 'AUTO', 'REALISTIC', 'DESIGN', 'RENDER_3D'",
          "Поддерживает character reference и style reference images"
        ]
      },
      generate_legacy: {
        method: "POST",
        path: "/generate",
        description: "Legacy генерация (V2). JSON body.",
        bodyExample: '{"image_request":{"prompt":"A beach scene","model":"V_2","aspect_ratio":"ASPECT_1_1","magic_prompt_option":"AUTO"}}',
        response: "data[].url",
        notes: [
          "Legacy формат: body обёрнут в image_request",
          "model: 'V_2', 'V_2_TURBO'"
        ]
      },
      describe: {
        method: "POST",
        path: "/describe",
        description: "Описание изображения (image-to-text). MULTIPART!",
        contentType: "multipart/form-data",
        bodyExample: "Form Data: image_file=@photo.jpg",
        response: "descriptions[] — массив текстовых описаний",
        notes: [
          "MULTIPART: загружай файл через form-data",
          "Полезно для генерации промптов из существующих изображений"
        ]
      }
    },
    n8nNotes: [
      "Auth: заголовок Api-Key (кастомный!)",
      "URL изображений ВРЕМЕННЫЕ — обязательно скачивай сразу",
      "Лучший для изображений с текстом (вывески, постеры, логотипы)",
      "V3: используй /v3/generate (новый формат), legacy: /generate",
      "describe и edit endpoints: multipart/form-data"
    ],
    rateLimits: "По умолчанию 10 inflight requests.",
    docsUrl: "https://developer.ideogram.ai/ideogram-api/api-overview"
  },

  {
    name: "Recraft AI",
    description: "Генерация изображений и SVG векторов для дизайна. OpenAI-совместимый /v1/images/generations.",
    category: ["image-generation", "design", "vector", "svg"],
    baseUrl: "https://external.api.recraft.ai",
    auth: {
      type: "bearer",
      setup: "В n8n HTTP Request: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь Recraft API Token."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      generate: {
        method: "POST",
        path: "/v1/images/generations",
        description: "Генерация изображения или SVG вектора. OpenAI-совместимый формат!",
        bodyExample: '{"prompt":"A beautiful sunset over ocean","style":"realistic_image","size":"1024x1024","response_format":"url"}',
        response: "data[0].url — URL изображения",
        notes: [
          "OpenAI images/generations совместимый!",
          "УНИКАЛЬНОСТЬ: может генерировать SVG векторы! style='vector_illustration'",
          "Стили: realistic_image, digital_illustration, vector_illustration, icon и др.",
          "vector_illustration подстили: /engraving, /line_art, /flat_2 и др.",
          "Модели: recraftv3, recraft-v4, recraft-v4-pro (4MP)",
          "Совместим с OpenAI Python library (меняй base_url)"
        ]
      },
      image_to_image: {
        method: "POST",
        path: "/v1/images/imageToImage",
        description: "Преобразование изображения. MULTIPART!",
        contentType: "multipart/form-data",
        bodyExample: "Form Data: image=@input.png, prompt=winter, strength=0.2",
        response: "data[0].url",
        notes: ["MULTIPART: загружай файл через form-data"]
      },
      vectorize: {
        method: "POST",
        path: "/v1/images/vectorize",
        description: "Конвертация растрового изображения в SVG вектор. MULTIPART!",
        contentType: "multipart/form-data",
        bodyExample: "Form Data: file=@image.png",
        response: "image.url — URL SVG файла",
        notes: ["Уникальная фича: растр → вектор SVG"]
      }
    },
    n8nNotes: [
      "OpenAI-совместимый для /v1/images/generations — меняй только base_url",
      "УНИКАЛЬНОСТЬ: генерация SVG векторов (style=vector_illustration)",
      "Для image editing: multipart/form-data",
      "Модели: recraftv3 (по умолчанию), recraft-v4, recraft-v4-pro"
    ],
    rateLimits: "Зависит от плана.",
    docsUrl: "https://www.recraft.ai/docs/api-reference/getting-started"
  },

  {
    name: "Clipdrop",
    description: "Набор API для обработки изображений: remove bg, upscale, reimagine и др. Все MULTIPART + бинарный ответ.",
    category: ["image-editing", "background-removal", "upscaling"],
    baseUrl: "https://clipdrop-api.co",
    auth: {
      type: "header",
      setup: "В n8n HTTP Request: добавь заголовок x-api-key: YOUR_CLIPDROP_KEY.",
      headerName: "x-api-key"
    },
    defaultHeaders: {},
    endpoints: {
      remove_background: {
        method: "POST",
        path: "/remove-background/v1",
        description: "Удаление фона. MULTIPART запрос, БИНАРНЫЙ ответ!",
        contentType: "multipart/form-data",
        bodyExample: "Form Data: image_file=@photo.jpg",
        response: "BINARY PNG файл без фона",
        notes: [
          "Запрос: multipart/form-data с файлом",
          "Ответ БИНАРНЫЙ! В n8n: Response Format = File",
          "Макс 25MB, до 50MP"
        ]
      },
      text_to_image: {
        method: "POST",
        path: "/text-to-image/v1",
        description: "Генерация изображения по тексту. MULTIPART + бинарный ответ!",
        contentType: "multipart/form-data",
        bodyExample: "Form Data: prompt=A cat in space",
        response: "BINARY файл изображения",
        notes: ["multipart запрос, бинарный ответ"]
      }
    },
    n8nNotes: [
      "ВСЕ endpoints: multipart/form-data запрос + бинарный ответ!",
      "В n8n: Body Content Type = Multipart Form Data, Response Format = File",
      "Auth: заголовок x-api-key",
      "Clipdrop теперь часть Stability AI Platform"
    ],
    rateLimits: "Зависит от endpoint и плана.",
    docsUrl: "https://clipdrop-api.co"
  },

  {
    name: "Remove.bg",
    description: "Удаление фона с изображений. MULTIPART запрос, бинарный PNG ответ.",
    category: ["image-editing", "background-removal"],
    baseUrl: "https://api.remove.bg",
    auth: {
      type: "header",
      setup: "В n8n HTTP Request: добавь заголовок X-Api-Key: YOUR_REMOVEBG_KEY.",
      headerName: "X-Api-Key"
    },
    defaultHeaders: {},
    endpoints: {
      removebg: {
        method: "POST",
        path: "/v1.0/removebg",
        description: "Удаление фона. Принимает файл ИЛИ URL. Ответ — бинарный!",
        contentType: "multipart/form-data",
        body: "image_file (binary) ИЛИ image_url (string), size ('auto'|'small'|'hd'|'4k'), format ('png'|'jpg'|'zip')",
        bodyExample: "Form Data: image_file=@photo.jpg, size=auto",
        response: "BINARY PNG/JPG файл без фона",
        notes: [
          "Запрос: multipart/form-data",
          "ОТВЕТ БИНАРНЫЙ! В n8n: Response Format = File",
          "Можно вместо файла передать image_url — удобно для n8n!",
          "Auth: заголовок X-Api-Key (с большой X!)",
          "size: auto (по умолчанию), small (до 625x400), hd, 4k",
          "Дополнительно: bg_color (цвет фона), bg_image_url (замена фона), crop (обрезка)",
          "Для авто: type='auto', или указать type='person'|'car'|'product'"
        ]
      },
      account: {
        method: "GET",
        path: "/v1.0/account",
        description: "Проверка баланса кредитов",
        response: "data.attributes.credits.total — оставшиеся кредиты",
        notes: ["Полезно для мониторинга баланса"]
      }
    },
    n8nNotes: [
      "Body Content Type = Multipart Form Data, Response Format = File",
      "Auth: заголовок X-Api-Key",
      "Можно передать URL вместо файла (image_url) — проще в n8n!",
      "50 бесплатных вызовов в месяц (small size)",
      "ZIP формат — самый быстрый для прозрачных изображений"
    ],
    rateLimits: "Free: 50 calls/month (small). Paid: 500-100,000+/month.",
    docsUrl: "https://www.remove.bg/api"
  },

  {
    name: "Cloudinary",
    description: "Управление медиа: upload, transform, AI-обработка. Basic Auth.",
    category: ["media-management", "image-editing", "cdn", "upload"],
    baseUrl: "https://api.cloudinary.com/v1_1/{cloud_name}",
    auth: {
      type: "basic",
      setup: "В n8n HTTP Request: Authentication = Generic Credential Type → HTTP Basic Auth. Username = API Key, Password = API Secret."
    },
    defaultHeaders: {},
    endpoints: {
      upload: {
        method: "POST",
        path: "/image/upload",
        description: "Загрузка изображения. MULTIPART!",
        contentType: "multipart/form-data",
        bodyExample: "Form Data: file=@photo.jpg, upload_preset=YOUR_PRESET (или api_key + signature)",
        response: "secure_url — HTTPS URL загруженного файла, public_id — ID для трансформаций",
        notes: [
          "MULTIPART: файл через form-data",
          "file может быть: binary файл, URL, base64 data URI",
          "Для unsigned upload: только upload_preset (без API key)",
          "Для signed upload: api_key + timestamp + signature",
          "Поддерживает auto-tagging, AI описание, face detection"
        ]
      },
      destroy: {
        method: "POST",
        path: "/image/destroy",
        description: "Удаление изображения по public_id",
        bodyExample: "Form Data: public_id=sample_image, api_key=YOUR_KEY, timestamp=UNIX_TS, signature=HASH",
        response: "result: 'ok'",
        notes: ["Требует signed request (api_key + signature)"]
      }
    },
    n8nNotes: [
      "Замени {cloud_name} в URL на имя твоего cloud из Cloudinary Dashboard",
      "Для unsigned upload: проще всего создать upload_preset в Settings",
      "Для signed upload: нужно генерировать signature (SHA1 hash) — сложнее в n8n",
      "Трансформации — через URL: https://res.cloudinary.com/{cloud}/image/upload/w_500,h_500/{public_id}",
      "AI фичи: auto-tagging, background removal, upscale — через eager transformations"
    ],
    rateLimits: "Free: 25K transformations/month, 25GB storage.",
    docsUrl: "https://cloudinary.com/documentation/image_upload_api_reference"
  },

  {
    name: "imgBB",
    description: "Простой image hosting API. Загрузка через API key в query параметре.",
    category: ["image-hosting", "upload"],
    baseUrl: "https://api.imgbb.com",
    auth: {
      type: "query",
      setup: "API key передаётся как query параметр: ?key=YOUR_API_KEY. В n8n: добавь ?key=... к URL."
    },
    defaultHeaders: {},
    endpoints: {
      upload: {
        method: "POST",
        path: "/1/upload",
        description: "Загрузка изображения. API key в query, файл в form-data.",
        contentType: "multipart/form-data",
        body: "image (base64 string ИЛИ URL ИЛИ file binary), name (опционально), expiration (секунды, опционально)",
        bodyExample: "URL: /1/upload?key=YOUR_API_KEY  Form Data: image=BASE64_STRING (или image=https://example.com/photo.jpg)",
        response: "data.url — прямой URL, data.display_url — страница, data.delete_url — URL для удаления",
        responseExample: '{"data":{"id":"abc123","url":"https://i.ibb.co/abc123/image.png","display_url":"https://ibb.co/abc123","delete_url":"https://ibb.co/abc123/delete"},"success":true}',
        notes: [
          "API key в query параметре ?key=...",
          "image может быть: base64 string, URL изображения, или binary файл",
          "expiration: время жизни в секундах (60-15552000). Без него — бессрочно",
          "Макс размер: 32MB"
        ]
      }
    },
    n8nNotes: [
      "API key в URL: /1/upload?key=YOUR_KEY",
      "Body Content Type = Multipart Form Data",
      "image может быть URL — самый простой вариант для n8n!",
      "Бесплатный hosting — идеален для временного хранения"
    ],
    rateLimits: "Не документировано точно. Есть rate limiting.",
    docsUrl: "https://api.imgbb.com/"
  },

  {
    name: "Imgur",
    description: "Популярный image hosting с API. OAuth2 или Client-ID авторизация.",
    category: ["image-hosting", "upload", "social"],
    baseUrl: "https://api.imgur.com",
    auth: {
      type: "header",
      setup: "Для anonymous upload: заголовок Authorization: Client-ID YOUR_CLIENT_ID. Для user actions: Authorization: Bearer YOUR_ACCESS_TOKEN.",
      headerName: "Authorization"
    },
    defaultHeaders: {},
    endpoints: {
      upload: {
        method: "POST",
        path: "/3/image",
        description: "Загрузка изображения. Поддерживает binary, base64, URL.",
        contentType: "multipart/form-data",
        body: "image (base64|URL|binary), type ('base64'|'url'|'file'), title, description",
        bodyExample: "Form Data: image=https://example.com/photo.jpg, type=url, title=My Image",
        response: "data.link — прямой URL изображения, data.id — ID, data.deletehash — для удаления",
        notes: [
          "Для анонимного upload: Authorization: Client-ID YOUR_ID",
          "image: base64 строка, URL, или binary файл",
          "type: 'base64', 'url', или 'file' (для binary)",
          "Макс 20MB для image, 200MB для gif"
        ]
      },
      get_image: {
        method: "GET",
        path: "/3/image/{imageHash}",
        description: "Получить информацию об изображении",
        response: "data.link — URL, data.width, data.height, data.size",
        notes: ["imageHash = id изображения"]
      },
      delete_image: {
        method: "DELETE",
        path: "/3/image/{imageDeleteHash}",
        description: "Удаление изображения",
        response: "data: true при успехе",
        notes: [
          "Для анонимных upload: используй deletehash (НЕ id!)",
          "Для авторизованных: можно использовать id"
        ]
      }
    },
    n8nNotes: [
      "Для анонимного upload: Authorization: Client-ID YOUR_CLIENT_ID (НЕ Bearer!)",
      "Формат Authorization нестандартный: 'Client-ID abc123' — без Bearer!",
      "image может быть URL — самый простой вариант для n8n",
      "Для удаления анонимных upload: сохраняй deletehash из ответа upload"
    ],
    rateLimits: "1250 uploads/day, 12500 requests/day для anonymous.",
    docsUrl: "https://apidocs.imgur.com/"
  },

  {
    name: "ElevenLabs",
    description: "Лучший TTS API: text-to-speech, voice cloning, speech-to-text, sound effects. Бинарный аудио ответ.",
    category: ["tts", "voice-cloning", "stt", "audio"],
    baseUrl: "https://api.elevenlabs.io",
    auth: {
      type: "header",
      setup: "В n8n HTTP Request: добавь заголовок xi-api-key: YOUR_ELEVENLABS_KEY.",
      headerName: "xi-api-key"
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      text_to_speech: {
        method: "POST",
        path: "/v1/text-to-speech/{voice_id}",
        description: "Конвертация текста в речь. ОТВЕТ БИНАРНЫЙ (аудио файл)!",
        bodyExample: '{"text":"Привет, мир! Это тест голоса.","model_id":"eleven_flash_v2_5","voice_settings":{"stability":0.5,"similarity_boost":0.75}}',
        response: "BINARY аудио файл (mp3 по умолчанию)",
        notes: [
          "ОТВЕТ БИНАРНЫЙ! В n8n: Response Format = File",
          "voice_id в URL пути — получи через GET /v1/voices",
          "Дефолтный голос Rachel: 21m00Tcm4TlvDq8ikWAM",
          "model_id: eleven_v3 (лучший), eleven_flash_v2_5 (быстрый), eleven_multilingual_v2",
          "Формат аудио через query param: ?output_format=mp3_44100_128",
          "Другие форматы: mp3_22050_32, pcm_16000, ulaw_8000"
        ]
      },
      text_to_speech_stream: {
        method: "POST",
        path: "/v1/text-to-speech/{voice_id}/stream",
        description: "Стриминг TTS. Тот же формат, но бинарный поток.",
        bodyExample: '{"text":"Длинный текст для стриминга...","model_id":"eleven_flash_v2_5"}',
        response: "BINARY streaming аудио (chunked transfer encoding)",
        notes: [
          "БИНАРНЫЙ ПОТОК! В n8n: Response Format = File",
          "Для стриминга: тот же body, другой URL (/stream)",
          "Идеален для длинных текстов — начинает отдавать аудио быстрее"
        ]
      },
      get_voices: {
        method: "GET",
        path: "/v1/voices",
        description: "Список доступных голосов",
        response: "voices[] — массив объектов с voice_id, name, labels",
        notes: ["Используй voice_id из ответа для TTS endpoint"]
      },
      speech_to_text: {
        method: "POST",
        path: "/v1/speech-to-text",
        description: "Транскрипция аудио (Speech-to-Text). MULTIPART!",
        contentType: "multipart/form-data",
        bodyExample: "Form Data: file=@audio.mp3, model_id=scribe_v2",
        response: "text — строка с транскрипцией",
        notes: [
          "MULTIPART: файл через form-data",
          "model_id: scribe_v2 (по умолчанию)"
        ]
      }
    },
    n8nNotes: [
      "Auth: заголовок xi-api-key (кастомный! НЕ Bearer, НЕ x-api-key)",
      "TTS: Response Format = File! Ответ — binary audio, НЕ JSON!",
      "voice_id указывается В URL: /v1/text-to-speech/{voice_id}",
      "Получи voice_id через GET /v1/voices или используй дефолтный Rachel: 21m00Tcm4TlvDq8ikWAM",
      "STT: Body Content Type = Multipart Form Data"
    ],
    rateLimits: "Зависит от плана. Free: ограничено символами в месяц.",
    docsUrl: "https://elevenlabs.io/docs/api-reference/text-to-speech/convert"
  },

  {
    name: "OpenAI TTS",
    description: "OpenAI Text-to-Speech. Бинарный аудио ответ.",
    category: ["tts", "audio"],
    baseUrl: "https://api.openai.com",
    auth: {
      type: "bearer",
      setup: "В n8n HTTP Request: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь OpenAI API Key."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      speech: {
        method: "POST",
        path: "/v1/audio/speech",
        description: "Текст в речь. ОТВЕТ БИНАРНЫЙ!",
        bodyExample: '{"model":"tts-1","input":"Привет, мир!","voice":"alloy","response_format":"mp3","speed":1.0}',
        response: "BINARY аудио файл",
        notes: [
          "ОТВЕТ БИНАРНЫЙ! В n8n: Response Format = File",
          "Голоса: alloy, echo, fable, onyx, nova, shimmer",
          "Модели: tts-1 (быстрее, дешевле), tts-1-hd (качественнее)",
          "Форматы: mp3, opus, aac, flac, wav, pcm",
          "speed: 0.25 - 4.0 (по умолчанию 1.0)"
        ]
      }
    },
    n8nNotes: [
      "Response Format = File! Ответ — binary audio",
      "Стандартный OpenAI Bearer Auth",
      "Простейший TTS API: model + input + voice — минимум"
    ],
    rateLimits: "Tier 1: 50 RPM",
    docsUrl: "https://platform.openai.com/docs/api-reference/audio/createSpeech"
  },

  {
    name: "OpenAI Whisper",
    description: "OpenAI Speech-to-Text (Whisper). Принимает ТОЛЬКО файл, НЕ URL!",
    category: ["stt", "transcription", "audio"],
    baseUrl: "https://api.openai.com",
    auth: {
      type: "bearer",
      setup: "В n8n: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь OpenAI API Key."
    },
    defaultHeaders: {},
    endpoints: {
      transcription: {
        method: "POST",
        path: "/v1/audio/transcriptions",
        description: "Транскрипция аудио в текст. MULTIPART!",
        contentType: "multipart/form-data",
        body: "file (binary), model='whisper-1', language (опционально, ISO-639-1), response_format ('json'|'text'|'srt'|'vtt')",
        bodyExample: "Form Data: file=@audio.mp3, model=whisper-1, language=ru",
        response: "text — строка с транскрипцией (при response_format=json)",
        notes: [
          "ТОЛЬКО multipart/form-data с binary файлом!",
          "НЕ принимает URL! Нужно сначала скачать аудио!",
          "В n8n: 1) HTTP Request скачай аудио как binary, 2) POST multipart к Whisper",
          "Макс 25MB. Форматы: mp3, mp4, wav, webm, m4a, mpeg, mpga, oga, ogg, flac",
          "response_format: json (дефолт), text, srt, vtt, verbose_json",
          "verbose_json включает timestamps для каждого сегмента"
        ]
      },
      translation: {
        method: "POST",
        path: "/v1/audio/translations",
        description: "Перевод аудио на английский + транскрипция. MULTIPART!",
        contentType: "multipart/form-data",
        bodyExample: "Form Data: file=@audio_ru.mp3, model=whisper-1",
        response: "text — транскрипция на английском",
        notes: [
          "Переводит ЛЮБОЙ язык → английский",
          "Тот же multipart формат что и transcriptions"
        ]
      }
    },
    n8nNotes: [
      "Body Content Type = Multipart Form Data",
      "КРИТИЧНО: НЕ принимает URL аудио! Только binary файл!",
      "Паттерн в n8n: 1) HTTP Request (GET) скачай аудио → binary, 2) HTTP Request (POST) multipart к Whisper",
      "Для SRT субтитров: response_format=srt"
    ],
    rateLimits: "Tier 1: 50 RPM",
    docsUrl: "https://platform.openai.com/docs/api-reference/audio/createTranscription"
  },

  {
    name: "AssemblyAI",
    description: "Мощная транскрипция: speaker diarization, PII redaction, sentiment, LeMUR (AI insights). ASYNC API.",
    category: ["stt", "transcription", "audio", "ai-insights"],
    baseUrl: "https://api.assemblyai.com",
    auth: {
      type: "bearer",
      setup: "В n8n HTTP Request: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь AssemblyAI API Key."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      submit_transcript: {
        method: "POST",
        path: "/v2/transcript",
        description: "Создать задачу транскрипции. ASYNC! Принимает URL аудио (НЕ файл!).",
        bodyExample: '{"audio_url":"https://example.com/audio.mp3","speaker_labels":true,"language_code":"ru"}',
        response: "id — transcript ID для polling, status: 'queued'",
        notes: [
          "ASYNC! Возвращает ID и status='queued'",
          "Принимает URL аудио (не binary файл!) — удобно для n8n!",
          "Для загрузки файла: сначала POST /v2/upload → получи URL → передай в audio_url",
          "speaker_labels: true — определение говорящих",
          "language_code: 'ru', 'en' и др. (или auto detection)",
          "Дополнительные фичи: sentiment_analysis, entity_detection, auto_chapters, summarization"
        ]
      },
      get_transcript: {
        method: "GET",
        path: "/v2/transcript/{transcript_id}",
        description: "Получить результат транскрипции. Polling пока status=completed.",
        response: "status ('queued'|'processing'|'completed'|'error'), text — полный текст, utterances[] — по говорящим",
        notes: [
          "Polling: повторяй GET каждые 3-5 сек пока status != 'completed'",
          "text — полный текст транскрипции",
          "words[] — массив слов с timestamps",
          "utterances[] — массив реплик по говорящим (если speaker_labels=true)"
        ]
      },
      lemur_task: {
        method: "POST",
        path: "/v2/lemur/v3/task",
        description: "LeMUR: применение LLM к транскрипции (резюме, анализ, Q&A)",
        bodyExample: '{"transcript_ids":["YOUR_TRANSCRIPT_ID"],"prompt":"Summarize the key points from this conversation.","final_model":"anthropic/claude-3-5-sonnet"}',
        response: "response — текстовый ответ LLM",
        notes: [
          "Работает ТОЛЬКО с готовыми transcript_ids",
          "final_model: anthropic/claude-3-5-sonnet, и др.",
          "Мощная фича: AI-анализ поверх транскрипции"
        ]
      }
    },
    n8nNotes: [
      "ASYNC: 1) POST /v2/transcript с audio_url → получи ID, 2) Wait нод, 3) GET /v2/transcript/{id}",
      "ПРИНИМАЕТ URL АУДИО (не файл!) — это удобнее Whisper для n8n!",
      "Для загрузки файла: POST /v2/upload (binary body) → получишь URL",
      "EU endpoint: api.eu.assemblyai.com (для GDPR)",
      "LeMUR — уникальная фича: AI-анализ транскрипции (резюме, Q&A)"
    ],
    rateLimits: "До 100 concurrent transcriptions.",
    docsUrl: "https://www.assemblyai.com/docs/api-reference/overview"
  },

  {
    name: "Deepgram",
    description: "Быстрая STT и TTS. Pre-recorded (sync) и Streaming (WebSocket). Nova-3 модель.",
    category: ["stt", "tts", "transcription", "audio"],
    baseUrl: "https://api.deepgram.com",
    auth: {
      type: "bearer",
      setup: "В n8n HTTP Request: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь Deepgram API Key."
    },
    defaultHeaders: {},
    endpoints: {
      transcribe_url: {
        method: "POST",
        path: "/v1/listen",
        description: "Транскрипция pre-recorded аудио по URL. SYNC — ответ сразу.",
        bodyExample: '{"url":"https://example.com/audio.mp3"}',
        response: "results.channels[0].alternatives[0].transcript — текст транскрипции",
        notes: [
          "SYNC! Ответ приходит сразу (не async как AssemblyAI)",
          "Query params для настроек: ?model=nova-3&smart_format=true&language=ru",
          "model: nova-3 (лучший), base, enhanced",
          "smart_format=true — форматирует числа, email, телефоны",
          "speaker_labels=true (diarization), punctuate=true",
          "Body: JSON с url, ИЛИ binary audio (Content-Type: audio/*)"
        ]
      },
      transcribe_file: {
        method: "POST",
        path: "/v1/listen",
        description: "Транскрипция binary аудио файла. SYNC.",
        contentType: "audio/*",
        bodyExample: "Binary audio data (raw bytes). Content-Type: audio/mp3 или audio/wav",
        response: "results.channels[0].alternatives[0].transcript",
        notes: [
          "Content-Type должен быть аудио тип: audio/mp3, audio/wav, audio/ogg и т.д.",
          "Body = raw binary аудио (НЕ JSON, НЕ multipart!)",
          "В n8n: Body Content Type = Raw, прикрепи binary data",
          "Тот же endpoint /v1/listen, но с другим Content-Type"
        ]
      },
      text_to_speech: {
        method: "POST",
        path: "/v1/speak",
        description: "Текст в речь (TTS). Query param ?model=... БИНАРНЫЙ ответ!",
        bodyExample: '{"text":"Hello, this is Deepgram text to speech."}',
        response: "BINARY аудио файл",
        notes: [
          "ОТВЕТ БИНАРНЫЙ! В n8n: Response Format = File",
          "Модель через query param: ?model=aura-asteria-en",
          "Content-Type ответа: audio/mp3 или audio/wav"
        ]
      }
    },
    n8nNotes: [
      "STT: SYNC (не async!) — ответ приходит сразу, не нужен polling!",
      "Два способа передать аудио: JSON с URL (проще) или raw binary (если файл уже есть)",
      "Настройки через query params: ?model=nova-3&smart_format=true&language=ru",
      "TTS: Response Format = File (бинарный ответ)",
      "Макс файл 2GB, timeout 10 мин для Nova"
    ],
    rateLimits: "До 100 concurrent requests для Nova/Base/Enhanced.",
    docsUrl: "https://developers.deepgram.com/reference/deepgram-api-overview"
  },

  {
    name: "PlayHT",
    description: "Высококачественный TTS с клонированием голосов. PlayDialog, Play3.0-mini. Стриминг аудио.",
    category: ["tts", "voice-cloning", "audio"],
    baseUrl: "https://api.play.ht/api",
    auth: {
      type: "header",
      setup: "В n8n HTTP Request: добавь ДВА заголовка: 1) Authorization: Bearer YOUR_SECRET_KEY, 2) X-User-ID: YOUR_USER_ID.",
      headerName: "Authorization + X-User-ID"
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      tts_stream: {
        method: "POST",
        path: "/v2/tts/stream",
        description: "Text-to-speech стриминг. БИНАРНЫЙ аудио ответ!",
        bodyExample: '{"text":"Hello, world!","voice":"s3://voice-cloning-zero-shot/775ae416-49bb-4fb6-bd45-740f205d20a1/jennifersaad/manifest.json","output_format":"mp3","voice_engine":"PlayDialog","language":"english"}',
        response: "BINARY streaming аудио",
        notes: [
          "ОТВЕТ БИНАРНЫЙ! В n8n: Response Format = File",
          "ДВА заголовка auth: Authorization: Bearer + X-User-ID",
          "voice = URL вида s3://voice-cloning-zero-shot/... (получи через GET /v2/voices)",
          "voice_engine: 'PlayDialog' (диалоги), 'Play3.0-mini' (быстрый), 'PlayHT2.0-turbo'",
          "output_format: mp3, wav, ogg, flac, mulaw",
          "language: 'english', 'russian', 'german' и др."
        ]
      },
      get_voices: {
        method: "GET",
        path: "/v2/voices",
        description: "Список доступных голосов",
        response: "массив объектов с id (voice URL), name, language",
        notes: ["Voice ID = длинный S3 URL, не короткий ID"]
      }
    },
    n8nNotes: [
      "НУЖНЫ ДВА заголовка: Authorization (Bearer) И X-User-ID!",
      "Без X-User-ID запрос провалится — частая ошибка!",
      "Voice ID — это длинный URL (s3://...), не короткий ID",
      "Response Format = File для TTS (бинарный ответ)",
      "PlayDialog — лучший для выразительных диалогов"
    ],
    rateLimits: "Зависит от плана.",
    docsUrl: "https://docs.play.ht/reference/api-generate-tts-audio-stream"
  },

  {
    name: "D-ID",
    description: "Генерация talking head видео из фото + текст/аудио. ASYNC API. Basic Auth.",
    category: ["video-generation", "avatar", "talking-head"],
    baseUrl: "https://api.d-id.com",
    auth: {
      type: "basic",
      setup: "В n8n HTTP Request: Authentication = Generic Credential Type → HTTP Basic Auth. Username = пустой или твой email, Password = твой D-ID API Key."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_talk: {
        method: "POST",
        path: "/talks",
        description: "Создать talking head видео. ASYNC! Возвращает talk ID.",
        bodyExample: '{"source_url":"https://example.com/photo.jpg","script":{"type":"text","input":"Привет! Это D-ID тест.","provider":{"type":"microsoft","voice_id":"ru-RU-DmitryNeural"}}}',
        response: "id — talk ID для polling, status: 'created'",
        notes: [
          "ASYNC! Возвращает ID, не готовое видео!",
          "source_url — URL фото лица (JPG/PNG)",
          "script.type: 'text' (TTS внутри) или 'audio' (свой аудио файл)",
          "Для text: указать provider (microsoft/amazon/elevenlabs) и voice_id",
          "Для audio: script.audio_url вместо input",
          "Auth: Basic Auth (НЕ Bearer!)"
        ]
      },
      get_talk: {
        method: "GET",
        path: "/talks/{id}",
        description: "Получить статус и результат видео. Polling пока status=done.",
        response: "status ('created'|'started'|'done'|'error'), result_url — URL готового видео",
        notes: [
          "Polling: повторяй GET пока status != 'done'",
          "result_url — URL MP4 видео",
          "Видео генерируется 10-60 секунд"
        ]
      }
    },
    n8nNotes: [
      "Auth: Basic Auth (НЕ Bearer!). Username = пусто, Password = API Key",
      "ASYNC: 1) POST /talks → ID, 2) Wait нод 10-30с, 3) GET /talks/{id}",
      "source_url — публично доступный URL фото лица",
      "Поддерживает webhooks как альтернативу polling",
      "Есть Agents API (новый, рекомендуемый для live стриминга)"
    ],
    rateLimits: "Зависит от плана. Trial: ограниченные кредиты.",
    docsUrl: "https://docs.d-id.com/reference/createtalk"
  },

  {
    name: "HeyGen",
    description: "AI avatar видео генерация. Фото аватары, digital twins, перевод видео. ASYNC API.",
    category: ["video-generation", "avatar", "talking-head", "video-translation"],
    baseUrl: "https://api.heygen.com",
    auth: {
      type: "header",
      setup: "В n8n HTTP Request: добавь заголовок X-Api-Key: YOUR_HEYGEN_KEY (или x-api-key).",
      headerName: "X-Api-Key"
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_video: {
        method: "POST",
        path: "/v2/video/generate",
        description: "Создать avatar видео. ASYNC! Поддерживает Avatar III и IV.",
        bodyExample: '{"video_inputs":[{"character":{"type":"avatar","avatar_id":"YOUR_AVATAR_ID","avatar_style":"normal"},"voice":{"type":"text","input_text":"Привет! Это тестовое видео.","voice_id":"YOUR_VOICE_ID"}}],"dimension":{"width":1920,"height":1080}}',
        response: "data.video_id — ID видео для polling",
        notes: [
          "ASYNC! Возвращает video_id",
          "avatar_id: получи через GET /v2/avatars",
          "voice_id: получи через GET /v2/voices",
          "Текст до 5000 символов",
          "Поддерживает ElevenLabs голоса через voice.elevenlabs_settings",
          "dimension: ширина и высота видео"
        ]
      },
      get_video_status: {
        method: "GET",
        path: "/v1/video_status.get",
        description: "Получить статус и URL видео. Polling.",
        body: "Query param: video_id=YOUR_VIDEO_ID",
        response: "data.status ('processing'|'completed'|'failed'), data.video_url — URL видео",
        notes: [
          "Polling: GET /v1/video_status.get?video_id=...",
          "video_url — временный URL! Скачай сразу",
          "URL обновляется при каждом запросе status"
        ]
      },
      video_agent: {
        method: "POST",
        path: "/v1/video_agent/generate",
        description: "Быстрая генерация видео из промпта (без настройки аватара). НОВЫЙ!",
        bodyExample: '{"prompt":"A presenter explaining our product launch in 30 seconds"}',
        response: "data.video_id — ID для polling",
        notes: [
          "Самый простой способ: один промпт → готовое видео",
          "Не нужно указывать avatar_id и voice_id",
          "Новый endpoint, рекомендуется для быстрого старта"
        ]
      },
      video_translate: {
        method: "POST",
        path: "/v2/video_translate/translate",
        description: "Перевод видео на другой язык с lip-sync",
        bodyExample: '{"video_url":"https://example.com/video.mp4","output_language":"ru","mode":"quality"}',
        response: "data.video_translate_id",
        notes: [
          "ASYNC: перевод занимает время",
          "mode: 'speed' (быстрый) или 'quality' (лучший lip-sync)",
          "Поддерживает множество языков"
        ]
      },
      list_avatars: {
        method: "GET",
        path: "/v2/avatars",
        description: "Список доступных аватаров",
        response: "data.avatars[] — массив с avatar_id, avatar_name, preview_image_url",
        notes: ["Используй avatar_id для create_video"]
      }
    },
    n8nNotes: [
      "Auth: заголовок X-Api-Key (или x-api-key)",
      "ASYNC: 1) POST /v2/video/generate → video_id, 2) Wait нод, 3) GET /v1/video_status.get?video_id=...",
      "Самый простой старт: /v1/video_agent/generate — один промпт, без настройки",
      "video_url в ответе ВРЕМЕННЫЙ — скачай сразу",
      "Уникальная фича: перевод видео с lip-sync (/v2/video_translate/translate)"
    ],
    rateLimits: "Зависит от плана. Есть лимиты на concurrent requests.",
    docsUrl: "https://docs.heygen.com/"
  },

  {
    name: "Runway ML",
    description: "Gen-4.5/Gen-4/Veo video generation. ASYNC: POST task → GET polling. Обязательный заголовок X-Runway-Version.",
    category: ["video-generation", "ai-video"],
    baseUrl: "https://api.dev.runwayml.com",
    auth: {
      type: "bearer",
      setup: "В n8n HTTP Request: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь Runway API Secret."
    },
    defaultHeaders: {
      "Content-Type": "application/json",
      "X-Runway-Version": "2024-11-06"
    },
    endpoints: {
      image_to_video: {
        method: "POST",
        path: "/v1/image_to_video",
        description: "Генерация видео из изображения. ASYNC!",
        bodyExample: '{"model":"gen4_turbo","promptImage":"https://example.com/photo.jpg","promptText":"A timelapse on a sunny day","duration":10}',
        response: "id — task ID для polling",
        notes: [
          "ASYNC! Возвращает task ID",
          "ОБЯЗАТЕЛЬНЫЙ заголовок X-Runway-Version: 2024-11-06 — без него 400 ошибка!",
          "model: gen4_turbo, gen4.5, gen4, gen3a_turbo",
          "promptImage: HTTPS URL, Runway URI, или data URI",
          "duration: 5 или 10 секунд",
          "Есть text_to_video и video_to_video endpoints тоже"
        ]
      },
      text_to_video: {
        method: "POST",
        path: "/v1/text_to_video",
        description: "Генерация видео из текста. ASYNC!",
        bodyExample: '{"model":"veo3.1","promptText":"A cute bunny hopping in a meadow","ratio":"1280:720","duration":8}',
        response: "id — task ID",
        notes: [
          "model: veo3.1, gen4_turbo, gen4.5",
          "ratio: '1280:720', '720:1280', '960:960' и др.",
          "duration: 5 или 8 секунд (зависит от модели)"
        ]
      },
      get_task: {
        method: "GET",
        path: "/v1/tasks/{taskId}",
        description: "Получить статус задачи. Polling пока status=SUCCEEDED.",
        response: "status ('PENDING'|'RUNNING'|'SUCCEEDED'|'FAILED'), output[] — массив URL видео когда SUCCEEDED",
        notes: [
          "Polling: GET каждые 5-10 сек пока status != SUCCEEDED",
          "output — массив URL видео файлов",
          "Таймаут по умолчанию 10 минут"
        ]
      }
    },
    n8nNotes: [
      "ОБЯЗАТЕЛЬНО добавь заголовок X-Runway-Version: 2024-11-06!",
      "ASYNC: 1) POST /v1/image_to_video → task ID, 2) Wait нод, 3) GET /v1/tasks/{id}",
      "Модели: gen4.5 (лучший), gen4_turbo (быстрый), veo3.1 (Google через Runway)",
      "1 credit = $0.01. Генерация стоит 50-500 credits в зависимости от модели и длины"
    ],
    rateLimits: "Concurrency limits зависят от плана.",
    docsUrl: "https://docs.dev.runwayml.com/api/"
  },

  {
    name: "Kling AI",
    description: "Kuaishou video generation (Kling 2.x). Официальный API + доступ через третьи стороны (PiAPI). ASYNC.",
    category: ["video-generation", "ai-video", "effects"],
    baseUrl: "https://api.klingai.com",
    auth: {
      type: "bearer",
      setup: "В n8n: Authentication = Generic Credential Type → HTTP Bearer Auth. Используй JWT токен (генерируется из access_key + secret_key через JWT). Проще через PiAPI или AIML API как прокси."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      text_to_video: {
        method: "POST",
        path: "/v1/videos/text2video",
        description: "Генерация видео из текста. ASYNC!",
        bodyExample: '{"model_name":"kling-v2-master","prompt":"A cheerful raccoon running through a forest","negative_prompt":"","cfg_scale":0.5,"mode":"pro","aspect_ratio":"16:9","duration":"5"}',
        response: "data.task_id — ID задачи для polling",
        notes: [
          "ASYNC! Возвращает task_id",
          "Auth: JWT токен (сложная генерация из access_key+secret_key)",
          "model_name: kling-v1, kling-v1-5, kling-v1-6, kling-v2, kling-v2-master, kling-v2-1",
          "mode: 'std' (стандартный) или 'pro' (профессиональный)",
          "duration: '5' или '10' секунд",
          "prompt: до 2500 символов"
        ]
      },
      image_to_video: {
        method: "POST",
        path: "/v1/videos/image2video",
        description: "Генерация видео из изображения. ASYNC!",
        bodyExample: '{"model_name":"kling-v2","image":"https://example.com/photo.jpg","prompt":"Camera slowly zooms in","mode":"pro","duration":"5"}',
        response: "data.task_id",
        notes: ["Тот же async паттерн. image: URL или base64."]
      },
      get_task: {
        method: "GET",
        path: "/v1/videos/text2video/{task_id}",
        description: "Получить статус и результат видео.",
        response: "data.task_status ('submitted'|'processing'|'succeed'|'failed'), data.task_result.videos[0].url — URL видео",
        notes: [
          "Polling: GET каждые 10 сек",
          "URL эндпоинта зависит от типа задачи (text2video или image2video)"
        ]
      }
    },
    n8nNotes: [
      "СЛОЖНАЯ AUTH: нужен JWT токен из access_key + secret_key (HS256)",
      "РЕКОМЕНДАЦИЯ: используй через PiAPI.ai или AIML API — они обеспечивают простой Bearer auth",
      "ASYNC: POST → task_id → polling GET",
      "Поддерживает lip-sync, effects, virtual try-on через отдельные endpoints",
      "Видео генерируется долго: 1-5 минут"
    ],
    rateLimits: "Зависит от плана и mode (std/pro).",
    docsUrl: "https://app.klingai.com/global/dev/document-api/quickStart/productIntroduction/overview"
  },

  {
    name: "Pika Labs",
    description: "AI video generation (Pika 2.x). Эффекты, text-to-video, image-to-video. Официальный API ограничен.",
    category: ["video-generation", "ai-video", "effects"],
    baseUrl: "https://api.pika.art",
    auth: {
      type: "bearer",
      setup: "В n8n: Authentication = Generic Credential Type → HTTP Bearer Auth. API ключ получи в Pika Dashboard."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      generate: {
        method: "POST",
        path: "/v1/generate",
        description: "Генерация видео. ASYNC!",
        bodyExample: '{"prompt":"A dog running on the beach","style":"Anime","ratio":"16:9","duration":4}',
        response: "id — generation ID для polling",
        notes: [
          "ASYNC: POST → ID → polling GET",
          "Официальный API может быть ограничен по доступу",
          "Также доступен через PiAPI и другие прокси-сервисы",
          "Поддерживает Pikaffects (эффекты: crush, melt и др.)"
        ]
      }
    },
    n8nNotes: [
      "Официальный API Pika может требовать специальный доступ (enterprise)",
      "Для быстрого старта: рассмотри PiAPI.ai как прокси для Pika",
      "ASYNC паттерн как у других видео генераторов",
      "Уникальные эффекты (Pikaffects): crush, melt, inflate и др."
    ],
    rateLimits: "Зависит от плана.",
    docsUrl: "https://api.pika.art/docs"
  },

  {
    name: "Creatomate",
    description: "Программная генерация видео/изображений из шаблонов. Template-based rendering. ASYNC.",
    category: ["video-rendering", "template-video", "social-media"],
    baseUrl: "https://api.creatomate.com",
    auth: {
      type: "bearer",
      setup: "В n8n HTTP Request: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь Creatomate API Key."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_render: {
        method: "POST",
        path: "/v1/renders",
        description: "Создать render (видео/изображение) из шаблона. ASYNC!",
        bodyExample: '{"template_id":"YOUR_TEMPLATE_ID","modifications":{"Title":"Your Custom Text","Background-Video":"https://example.com/video.mp4"},"webhook_url":"https://your-server.com/webhook"}',
        response: "Массив render объектов с id и status",
        responseExample: '[{"id":"a862048b-...","status":"planned","url":null}]',
        notes: [
          "ASYNC! status: planned → rendering → succeeded/failed",
          "template_id: UUID шаблона из Creatomate Editor",
          "modifications: ключ = имя элемента в шаблоне, значение = новый контент",
          "Можно рендерить несколько renders по tags (batch)",
          "Без template_id: можно передать source (RenderScript JSON) напрямую",
          "Webhook рекомендуется вместо polling"
        ]
      },
      get_render: {
        method: "GET",
        path: "/v1/renders/{renderId}",
        description: "Получить статус render. Polling.",
        response: "status ('planned'|'rendering'|'succeeded'|'failed'), url — URL готового файла",
        notes: [
          "url — прямой URL файла (mp4/jpg/png/gif)",
          "Файл хранится 30 дней",
          "snapshot_url — превью кадр (если настроен)"
        ]
      },
      list_templates: {
        method: "GET",
        path: "/v1/templates",
        description: "Список шаблонов в проекте",
        response: "Массив template объектов с id, name, tags",
        notes: ["Используй id для create_render"]
      }
    },
    n8nNotes: [
      "НЕ AI-генерация! Это template-based rendering: вставляй данные в шаблоны",
      "Создай шаблон в визуальном редакторе Creatomate → используй template_id в API",
      "modifications: имя_элемента → новое значение (текст, URL видео/изображения, цвет и т.д.)",
      "Для batch: используй tags вместо template_id — рендерит все шаблоны с этим тегом",
      "ASYNC: POST → webhook ИЛИ polling GET",
      "Есть v1 и v2 endpoints (v2 новее)"
    ],
    rateLimits: "Зависит от плана. Free: 50 renders/month.",
    docsUrl: "https://creatomate.com/docs/api/reference/introduction"
  },

  {
    name: "Suno",
    description: "AI генерация музыки и песен. НЕТ официального API! Доступ через неофициальные прокси (RapidAPI, PiAPI).",
    category: ["music-generation", "audio", "ai-music"],
    baseUrl: "https://api.piapi.ai",
    auth: {
      type: "header",
      setup: "Через PiAPI: заголовок x-api-key: YOUR_PIAPI_KEY. Через RapidAPI: заголовок X-RapidAPI-Key.",
      headerName: "x-api-key"
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      generate_music: {
        method: "POST",
        path: "/api/suno/v1/music",
        description: "Генерация песни по промпту. ASYNC через PiAPI.",
        bodyExample: '{"prompt":"A cheerful pop song about summer vacation","make_instrumental":false,"model":"chirp-v4"}',
        response: "task_id — ID задачи для polling",
        notes: [
          "НЕОФИЦИАЛЬНЫЙ API! Suno не имеет публичного REST API",
          "Доступ через прокси: PiAPI.ai, RapidAPI и др.",
          "ASYNC: POST → task_id → polling GET",
          "prompt: описание песни ИЛИ lyrics",
          "make_instrumental: true — без вокала",
          "model: chirp-v3.5, chirp-v4",
          "Результат: URL аудио файлов (обычно 2 варианта)"
        ]
      }
    },
    n8nNotes: [
      "НЕТ ОФИЦИАЛЬНОГО API! Используй прокси-сервисы",
      "PiAPI.ai — один из самых стабильных прокси для Suno",
      "ASYNC: создание песни занимает 30-120 секунд",
      "Результат: обычно 2 варианта песни (URL аудио)",
      "Может быть нестабильным — добавь retry логику"
    ],
    rateLimits: "Зависит от прокси-провайдера.",
    docsUrl: "https://piapi.ai/suno-api"
  },

  {
    name: "Murf AI",
    description: "Enterprise TTS с качественными голосами. Text-to-speech API.",
    category: ["tts", "voice-generation", "enterprise"],
    baseUrl: "https://api.murf.ai",
    auth: {
      type: "bearer",
      setup: "В n8n HTTP Request: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь Murf AI API Key."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      text_to_speech: {
        method: "POST",
        path: "/v1/speech/generate",
        description: "Генерация речи из текста. ASYNC — возвращает URL аудио после обработки.",
        bodyExample: '{"text":"Hello, welcome to our product demo.","voiceId":"en-US-natalie","style":"Conversational","format":"MP3","sampleRate":24000}',
        response: "audioFile — URL сгенерированного аудио файла",
        notes: [
          "voiceId: получи через GET /v1/voices",
          "style: зависит от голоса (Conversational, Newscast, Narration и др.)",
          "format: MP3, WAV, FLAC, OGG",
          "sampleRate: 8000, 16000, 22050, 24000, 44100, 48000",
          "Может быть sync или async в зависимости от длины текста"
        ]
      },
      list_voices: {
        method: "GET",
        path: "/v1/voices",
        description: "Список доступных голосов",
        response: "voices[] — массив с voiceId, name, language, styles",
        notes: ["Фильтруй по language для нужного языка"]
      }
    },
    n8nNotes: [
      "Стандартный Bearer Auth",
      "Для коротких текстов: sync ответ с URL аудио",
      "Для длинных текстов: может потребоваться polling",
      "Качественные enterprise голоса для продакшн контента"
    ],
    rateLimits: "Зависит от плана.",
    docsUrl: "https://api.murf.ai/docs"
  },

  {
    name: "Luma AI (Dream Machine)",
    description: "Ray 2/3 video generation. Text-to-video, image-to-video, extend. ASYNC с callback.",
    category: ["video-generation", "ai-video"],
    baseUrl: "https://api.lumalabs.ai/dream-machine/v1",
    auth: {
      type: "bearer",
      setup: "В n8n HTTP Request: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь Luma API Key (luma-xxxx)."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_generation: {
        method: "POST",
        path: "/generations",
        description: "Создать видео. ASYNC! Поддерживает text-to-video и image-to-video.",
        bodyExample: '{"prompt":"A tiger walking in snow","model":"ray-2","callback_url":"https://your-server.com/webhook"}',
        response: "id — generation ID для polling, state: 'dreaming'",
        notes: [
          "ASYNC! state: queued → dreaming → completed/failed",
          "model: ray-2 (текущий лучший), ray-flash-2 (быстрый)",
          "Для image-to-video: добавь keyframes.frame0.type='image', keyframes.frame0.url=...",
          "callback_url — webhook для получения результата (рекомендуется!)",
          "Webhook retry: до 3 раз при ошибке, timeout 5 сек",
          "duration: '5s' (по умолчанию), concepts: для спецэффектов"
        ]
      },
      get_generation: {
        method: "GET",
        path: "/generations/{generationId}",
        description: "Получить статус и URL видео. Polling.",
        response: "state ('dreaming'|'completed'|'failed'), assets.video — URL видео",
        notes: [
          "Polling: GET каждые 5-10 сек",
          "assets.video — URL MP4 видео",
          "Также есть assets.thumbnail для превью"
        ]
      },
      extend_video: {
        method: "POST",
        path: "/generations/{generationId}/extend",
        description: "Продлить существующее видео (добавить длительность)",
        bodyExample: '{"prompt":"Continue the scene with more snow falling"}',
        response: "Новый generation ID для расширенного видео",
        notes: ["generationId = ID предыдущей генерации"]
      },
      list_camera_motions: {
        method: "GET",
        path: "/generations/camera_motion/list",
        description: "Список поддерживаемых camera motion строк",
        response: "Массив строк: 'camera orbit left', 'camera zoom in' и др.",
        notes: ["Используй эти строки в промпте для управления камерой"]
      }
    },
    n8nNotes: [
      "ASYNC: POST /generations → ID, callback webhook ИЛИ polling GET",
      "Callback URL РЕКОМЕНДУЕТСЯ — Luma retry до 3 раз при ошибке",
      "model: ray-2 (лучший), ray-flash-2 (быстрый)",
      "Для image-to-video: передай keyframes.frame0 с type и url",
      "Camera motion управляется текстом в промпте ('camera orbit left')",
      "Concepts endpoint для спецэффектов (dolly_zoom и др.)"
    ],
    rateLimits: "Зависит от плана. Start/Scale/Enterprise.",
    docsUrl: "https://docs.lumalabs.ai/docs/video-generation"
  },

  {
    name: "Telegram Bot API",
    description: "Bot API для Telegram. Токен в URL пути. Простейший мессенджер API.",
    category: ["messaging", "bot", "telegram"],
    baseUrl: "https://api.telegram.org/bot{token}",
    auth: {
      type: "query",
      setup: "Токен встраивается ПРЯМО В URL: https://api.telegram.org/bot123456:ABC-DEF/sendMessage. В n8n: замени {token} на токен от @BotFather."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      sendMessage: {
        method: "POST",
        path: "/sendMessage",
        description: "Отправить текстовое сообщение",
        bodyExample: '{"chat_id":"YOUR_CHAT_ID","text":"Привет!","parse_mode":"HTML"}',
        response: "result.message_id — ID отправленного сообщения",
        notes: [
          "chat_id: число (ID чата) или строка (@username для публичных)",
          "parse_mode: 'HTML', 'Markdown', 'MarkdownV2'",
          "Полный URL: https://api.telegram.org/bot{TOKEN}/sendMessage"
        ]
      },
      sendPhoto: {
        method: "POST",
        path: "/sendPhoto",
        description: "Отправить изображение",
        bodyExample: '{"chat_id":"YOUR_CHAT_ID","photo":"https://example.com/photo.jpg","caption":"Описание фото"}',
        response: "result.message_id",
        notes: [
          "photo: URL изображения ИЛИ file_id ИЛИ multipart upload",
          "Для multipart: Content-Type = multipart/form-data"
        ]
      },
      getUpdates: {
        method: "GET",
        path: "/getUpdates",
        description: "Получить входящие сообщения (long polling)",
        response: "result[] — массив Update объектов",
        notes: [
          "Для webhook: используй setWebhook вместо getUpdates",
          "offset: ID последнего обработанного update + 1"
        ]
      },
      setWebhook: {
        method: "POST",
        path: "/setWebhook",
        description: "Установить webhook URL для получения обновлений",
        bodyExample: '{"url":"https://your-server.com/telegram/webhook"}',
        response: "ok: true",
        notes: ["Webhook и getUpdates взаимоисключающие"]
      }
    },
    n8nNotes: [
      "Токен ПРЯМО В URL: https://api.telegram.org/bot{TOKEN}/method",
      "НЕТ заголовка Authorization — токен только в URL!",
      "chat_id получи: отправь сообщение боту → GET /getUpdates → chat.id",
      "Для файлов: можно передать URL (проще) или multipart upload",
      "n8n имеет встроенную Telegram ноду — проще использовать её"
    ],
    rateLimits: "30 msg/sec в группы, 1 msg/sec в один чат.",
    docsUrl: "https://core.telegram.org/bots/api"
  },

  {
    name: "Slack",
    description: "Slack Web API. Bearer token. Некоторые endpoints принимают application/x-www-form-urlencoded!",
    category: ["messaging", "team-chat", "slack"],
    baseUrl: "https://slack.com/api",
    auth: {
      type: "bearer",
      setup: "В n8n HTTP Request: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь Slack Bot Token (xoxb-...)."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      chat_postMessage: {
        method: "POST",
        path: "/chat.postMessage",
        description: "Отправить сообщение в канал/чат",
        bodyExample: '{"channel":"C0123456789","text":"Привет!","mrkdwn":true}',
        response: "ok: true, ts — timestamp (ID сообщения), channel — ID канала",
        notes: [
          "channel: ID канала (C...) или ID DM (D...)",
          "Для rich сообщений: используй blocks[] вместо text",
          "ts (timestamp) используется как message ID для обновления/удаления",
          "Принимает как JSON так и form-urlencoded"
        ]
      },
      chat_update: {
        method: "POST",
        path: "/chat.update",
        description: "Обновить существующее сообщение",
        bodyExample: '{"channel":"C0123456789","ts":"1234567890.123456","text":"Обновлённый текст"}',
        response: "ok: true",
        notes: ["ts = timestamp оригинального сообщения (ID)"]
      },
      files_uploadV2: {
        method: "POST",
        path: "/files.uploadV2",
        description: "Загрузить файл. MULTIPART!",
        contentType: "multipart/form-data",
        bodyExample: "Form Data: channel_id=C0123456789, file=@document.pdf, title=My File",
        response: "ok: true, file.id",
        notes: [
          "MULTIPART: Body Content Type = Multipart Form Data",
          "Новый V2 endpoint (старый files.upload deprecated)"
        ]
      },
      conversations_list: {
        method: "GET",
        path: "/conversations.list",
        description: "Список каналов",
        response: "channels[] — массив каналов с id и name",
        notes: ["Пагинация через cursor"]
      }
    },
    n8nNotes: [
      "Токен xoxb-... (Bot Token) — самый распространённый",
      "Ответ ВСЕГДА 200 OK! Ошибки в ok: false + error поле",
      "ts (timestamp) = ID сообщения — сохраняй для update/delete",
      "Для файлов: files.uploadV2 (multipart), НЕ старый files.upload",
      "n8n имеет встроенную Slack ноду"
    ],
    rateLimits: "Tier 1: 1 req/min, Tier 2: 20 req/min, Tier 3: 50 req/min, Tier 4: 100+ req/min. Зависит от метода.",
    docsUrl: "https://api.slack.com/methods"
  },

  {
    name: "Discord",
    description: "Discord REST API v10. Bot token с префиксом 'Bot'. Webhooks для простых уведомлений.",
    category: ["messaging", "gaming", "community", "discord"],
    baseUrl: "https://discord.com/api/v10",
    auth: {
      type: "header",
      setup: "В n8n HTTP Request: добавь заголовок Authorization: Bot YOUR_BOT_TOKEN. ВНИМАНИЕ: префикс 'Bot ' обязателен!",
      headerName: "Authorization"
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_message: {
        method: "POST",
        path: "/channels/{channel_id}/messages",
        description: "Отправить сообщение в канал",
        bodyExample: '{"content":"Привет!","embeds":[{"title":"Заголовок","description":"Описание","color":5814783}]}',
        response: "id — ID сообщения, channel_id, content",
        notes: [
          "Auth: 'Bot YOUR_TOKEN' (с префиксом Bot!)",
          "content: текст, embeds: rich content",
          "Для файлов: multipart/form-data с payload_json"
        ]
      },
      execute_webhook: {
        method: "POST",
        path: "/webhooks/{webhook_id}/{webhook_token}",
        description: "Отправить через webhook (БЕЗ авторизации!). Самый простой вариант.",
        bodyExample: '{"content":"Уведомление!","username":"My Bot","embeds":[{"title":"Alert","description":"Something happened","color":16711680}]}',
        response: "Пустой ответ при успехе (204) если ?wait=false, или message object если ?wait=true",
        notes: [
          "НЕ НУЖНА авторизация! Webhook URL содержит токен",
          "?wait=true — вернёт message object вместо 204",
          "username: переопределяет имя бота",
          "САМЫЙ ПРОСТОЙ способ отправить в Discord из n8n!"
        ]
      }
    },
    n8nNotes: [
      "ДЛЯ УВЕДОМЛЕНИЙ: используй webhook (не нужен Bot token!). URL: https://discord.com/api/webhooks/{id}/{token}",
      "Для Bot API: Authorization = 'Bot YOUR_TOKEN' (с пробелом после Bot!)",
      "Webhook URL получи: Server Settings → Integrations → Webhooks → New Webhook",
      "n8n имеет встроенную Discord ноду"
    ],
    rateLimits: "Global: 50 req/sec. Per-route лимиты в заголовках X-RateLimit-*.",
    docsUrl: "https://discord.com/developers/docs/reference"
  },

  {
    name: "WhatsApp Business (Meta Cloud API)",
    description: "Официальный WhatsApp API через Meta Graph API. Сложная настройка, messaging_product обязателен.",
    category: ["messaging", "whatsapp", "business"],
    baseUrl: "https://graph.facebook.com/v21.0",
    auth: {
      type: "bearer",
      setup: "В n8n: Authentication = Generic Credential Type → HTTP Bearer Auth. Используй Permanent System User Token из Meta Business Settings."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      send_text: {
        method: "POST",
        path: "/{phone_number_id}/messages",
        description: "Отправить текстовое сообщение",
        bodyExample: '{"messaging_product":"whatsapp","to":"79991234567","type":"text","text":{"body":"Привет!"}}',
        response: "messages[0].id — ID сообщения",
        notes: [
          "messaging_product: 'whatsapp' — ОБЯЗАТЕЛЬНОЕ поле в КАЖДОМ запросе!",
          "phone_number_id: ID номера из WhatsApp Manager (НЕ сам номер!)",
          "to: номер получателя в международном формате БЕЗ + (79991234567)",
          "Для отправки ВНЕ 24ч окна: используй template messages",
          "Temporary token: истекает через 24ч! Используй permanent system user token"
        ]
      },
      send_template: {
        method: "POST",
        path: "/{phone_number_id}/messages",
        description: "Отправить шаблонное сообщение (для инициации диалога)",
        bodyExample: '{"messaging_product":"whatsapp","to":"79991234567","type":"template","template":{"name":"hello_world","language":{"code":"en_US"}}}',
        response: "messages[0].id",
        notes: [
          "Templates нужны для отправки ПЕРВОГО сообщения (вне 24ч окна)",
          "Template должен быть предварительно создан и одобрен в WhatsApp Manager",
          "Для параметров: template.components[].parameters[]"
        ]
      },
      send_media: {
        method: "POST",
        path: "/{phone_number_id}/messages",
        description: "Отправить медиа (изображение, документ, аудио, видео)",
        bodyExample: '{"messaging_product":"whatsapp","to":"79991234567","type":"image","image":{"link":"https://example.com/photo.jpg","caption":"Фото"}}',
        response: "messages[0].id",
        notes: [
          "type: image, document, audio, video, sticker",
          "Медиа через link (URL) или id (предварительно загруженный через /media)"
        ]
      }
    },
    n8nNotes: [
      "messaging_product: 'whatsapp' — ОБЯЗАТЕЛЬНО в каждом запросе!",
      "phone_number_id — это НЕ номер телефона! Получи в WhatsApp Manager → API Setup",
      "Temporary token истекает за 24ч — создай Permanent System User Token!",
      "Вне 24ч окна: только template messages (предварительно одобренные)",
      "Номер получателя БЕЗ + и пробелов: 79991234567",
      "n8n имеет встроенную WhatsApp Business Cloud ноду"
    ],
    rateLimits: "80 msg/sec (стандартный tier). Зависит от business verification.",
    docsUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api"
  },

  {
    name: "WhatsApp (Evolution API)",
    description: "Open-source WhatsApp API (неофициальная). Проще Meta Cloud API для простых задач.",
    category: ["messaging", "whatsapp", "self-hosted"],
    baseUrl: "https://{your-instance}",
    auth: {
      type: "header",
      setup: "В n8n HTTP Request: добавь заголовок apikey: YOUR_EVOLUTION_API_KEY.",
      headerName: "apikey"
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      send_text: {
        method: "POST",
        path: "/message/sendText/{instance_name}",
        description: "Отправить текстовое сообщение",
        bodyExample: '{"number":"79991234567","text":"Привет!"}',
        response: "key.id — ID сообщения",
        notes: [
          "instance_name: имя инстанса в URL пути",
          "number: номер телефона (с кодом страны)",
          "Auth: заголовок apikey",
          "НЕОФИЦИАЛЬНОЕ API — может нарушать ToS WhatsApp!"
        ]
      },
      send_media: {
        method: "POST",
        path: "/message/sendMedia/{instance_name}",
        description: "Отправить медиа файл",
        bodyExample: '{"number":"79991234567","mediatype":"image","media":"https://example.com/photo.jpg","caption":"Описание"}',
        response: "key.id",
        notes: ["mediatype: image, video, audio, document"]
      }
    },
    n8nNotes: [
      "Self-hosted: нужен свой сервер с Evolution API",
      "Auth: заголовок apikey (не Bearer!)",
      "Instance name в URL пути",
      "Проще Meta Cloud API, но неофициальное — риск блокировки",
      "Замени {your-instance} на URL твоего сервера"
    ],
    rateLimits: "Зависит от настроек сервера и WhatsApp лимитов.",
    docsUrl: "https://doc.evolution-api.com/"
  },

  {
    name: "Twilio",
    description: "SMS, WhatsApp, Voice API. Basic Auth (Account SID : Auth Token). form-urlencoded body!",
    category: ["messaging", "sms", "voice", "whatsapp"],
    baseUrl: "https://api.twilio.com/2010-04-01",
    auth: {
      type: "basic",
      setup: "В n8n HTTP Request: Authentication = Generic Credential Type → HTTP Basic Auth. Username = Account SID (AC...), Password = Auth Token."
    },
    defaultHeaders: {},
    endpoints: {
      send_sms: {
        method: "POST",
        path: "/Accounts/{AccountSid}/Messages.json",
        description: "Отправить SMS. ВНИМАНИЕ: form-urlencoded, НЕ JSON!",
        contentType: "application/x-www-form-urlencoded",
        body: "To=+79991234567&From=+14155552671&Body=Hello!",
        bodyExample: "To=+79991234567&From=+14155552671&Body=Привет!",
        response: "sid — ID сообщения, status — статус доставки",
        notes: [
          "КРИТИЧНО: Content-Type = application/x-www-form-urlencoded, НЕ JSON!",
          "В n8n: Body Content Type = Form URL Encoded",
          "From: твой Twilio номер (купленный)",
          "To: номер получателя с + (обязательно!)",
          "AccountSid в URL пути = тот же что Username в Basic Auth"
        ]
      },
      send_whatsapp: {
        method: "POST",
        path: "/Accounts/{AccountSid}/Messages.json",
        description: "Отправить WhatsApp сообщение через Twilio",
        contentType: "application/x-www-form-urlencoded",
        bodyExample: "To=whatsapp:+79991234567&From=whatsapp:+14155238886&Body=Привет!",
        response: "sid, status",
        notes: [
          "Тот же endpoint что SMS, но номера с префиксом whatsapp:",
          "From: whatsapp:+14155238886 (Twilio Sandbox или купленный номер)",
          "To: whatsapp:+79991234567"
        ]
      }
    },
    n8nNotes: [
      "Body Content Type = Form URL Encoded (НЕ JSON!). Это самая частая ошибка с Twilio!",
      "Basic Auth: Username = Account SID (AC...), Password = Auth Token",
      "AccountSid также указывается в URL пути",
      "Номера ВСЕГДА с + (E.164 формат)",
      "n8n имеет встроенную Twilio ноду"
    ],
    rateLimits: "SMS: 1 msg/sec per number. Configurable MPS.",
    docsUrl: "https://www.twilio.com/docs/messaging/api/message-resource"
  },

  {
    name: "Microsoft Teams",
    description: "Через Microsoft Graph API. OAuth2 Bearer token. Сложная настройка Azure AD.",
    category: ["messaging", "team-chat", "microsoft"],
    baseUrl: "https://graph.microsoft.com/v1.0",
    auth: {
      type: "bearer",
      setup: "В n8n: OAuth2 через Azure AD. Или используй n8n Microsoft Teams ноду (проще). Для webhook: Incoming Webhook Connector (без OAuth)."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      send_message: {
        method: "POST",
        path: "/teams/{team_id}/channels/{channel_id}/messages",
        description: "Отправить сообщение в канал Teams",
        bodyExample: '{"body":{"content":"<h1>Привет!</h1>","contentType":"html"}}',
        response: "id — ID сообщения",
        notes: [
          "Требует OAuth2 с правами ChannelMessage.Send",
          "contentType: 'html' или 'text'",
          "Сложная настройка Azure AD App Registration"
        ]
      },
      send_chat_message: {
        method: "POST",
        path: "/chats/{chat_id}/messages",
        description: "Отправить сообщение в личный/групповой чат",
        bodyExample: '{"body":{"content":"Привет!","contentType":"text"}}',
        response: "id",
        notes: ["chat_id: получи через GET /me/chats"]
      },
      incoming_webhook: {
        method: "POST",
        path: "WEBHOOK_URL",
        description: "Отправить через Incoming Webhook (БЕЗ OAuth2!). САМЫЙ ПРОСТОЙ СПОСОБ.",
        bodyExample: '{"@type":"MessageCard","@context":"http://schema.org/extensions","summary":"Alert","themeColor":"FF0000","sections":[{"activityTitle":"Уведомление","text":"Что-то произошло!"}]}',
        response: "1 — при успехе (просто число!)",
        notes: [
          "НЕ НУЖНА авторизация! URL содержит токен",
          "URL получи: Канал → ... → Connectors → Incoming Webhook → Configure",
          "Формат: MessageCard (legacy) или Adaptive Card",
          "САМЫЙ ПРОСТОЙ способ отправить в Teams из n8n"
        ]
      }
    },
    n8nNotes: [
      "ДЛЯ УВЕДОМЛЕНИЙ: Incoming Webhook (без OAuth!) — как Discord webhooks",
      "Для полного API: нужна Azure AD App Registration + OAuth2",
      "n8n имеет встроенную Microsoft Teams ноду (обрабатывает OAuth)",
      "Incoming Webhook URL: полный URL прямо в HTTP Request"
    ],
    rateLimits: "Graph API: throttling по приложению.",
    docsUrl: "https://learn.microsoft.com/en-us/graph/api/channel-post-messages"
  },

  {
    name: "Viber",
    description: "Viber Bot API. Кастомный заголовок X-Viber-Auth-Token.",
    category: ["messaging", "viber"],
    baseUrl: "https://chatapi.viber.com/pa",
    auth: {
      type: "header",
      setup: "В n8n HTTP Request: добавь заголовок X-Viber-Auth-Token: YOUR_VIBER_AUTH_TOKEN.",
      headerName: "X-Viber-Auth-Token"
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      send_message: {
        method: "POST",
        path: "/send_message",
        description: "Отправить сообщение пользователю",
        bodyExample: '{"receiver":"USER_ID","min_api_version":1,"sender":{"name":"My Bot"},"type":"text","text":"Привет!"}',
        response: "status: 0 — успех, status_message: 'ok'",
        notes: [
          "receiver: Viber User ID (получи через webhook)",
          "sender.name ОБЯЗАТЕЛЕН!",
          "type: text, picture, video, file, sticker, contact, location, url",
          "status: 0 = успех, другие числа = ошибка"
        ]
      },
      set_webhook: {
        method: "POST",
        path: "/set_webhook",
        description: "Установить webhook URL",
        bodyExample: '{"url":"https://your-server.com/viber/webhook","event_types":["delivered","seen","message"]}',
        response: "status: 0",
        notes: ["Обязательный первый шаг для получения сообщений"]
      }
    },
    n8nNotes: [
      "Auth: заголовок X-Viber-Auth-Token",
      "sender.name ОБЯЗАТЕЛЕН в send_message!",
      "User ID получается только через webhook (нет поиска по номеру)",
      "Бот должен быть создан в Viber Admin Panel"
    ],
    rateLimits: "Не документировано точно.",
    docsUrl: "https://developers.viber.com/docs/api/rest-bot-api/"
  },

  {
    name: "Matrix (Element)",
    description: "Открытый протокол мессенджера. Self-hosted или matrix.org. Bearer access_token.",
    category: ["messaging", "open-source", "self-hosted", "matrix"],
    baseUrl: "https://{homeserver}/_matrix/client/v3",
    auth: {
      type: "bearer",
      setup: "В n8n: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь Matrix access_token."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      send_message: {
        method: "PUT",
        path: "/rooms/{roomId}/send/m.room.message/{txnId}",
        description: "Отправить сообщение в комнату. ВНИМАНИЕ: PUT, не POST!",
        bodyExample: '{"msgtype":"m.text","body":"Привет!"}',
        response: "event_id — ID события",
        notes: [
          "МЕТОД PUT, НЕ POST!",
          "txnId: уникальный ID транзакции (любая строка, для идемпотентности)",
          "roomId: !abc123:matrix.org (начинается с !)",
          "msgtype: m.text, m.image, m.file, m.notice, m.emote"
        ]
      },
      login: {
        method: "POST",
        path: "/login",
        description: "Получить access_token по логину/паролю",
        bodyExample: '{"type":"m.login.password","identifier":{"type":"m.id.user","user":"@yourbot:matrix.org"},"password":"YOUR_PASSWORD"}',
        response: "access_token — токен для всех последующих запросов",
        notes: ["Используй полученный access_token как Bearer"]
      }
    },
    n8nNotes: [
      "Замени {homeserver} на свой сервер: matrix.org, your-server.com и т.д.",
      "send_message: метод PUT (не POST!) с уникальным txnId",
      "Room ID начинается с ! (напр. !abc123:matrix.org)",
      "Для получения access_token: POST /login с паролем",
      "Self-hosted: полный контроль над данными"
    ],
    rateLimits: "Зависит от homeserver настроек.",
    docsUrl: "https://spec.matrix.org/latest/client-server-api/"
  },

  {
    name: "Vonage (Nexmo)",
    description: "SMS и Voice API. API key + secret в body ИЛИ Basic Auth.",
    category: ["messaging", "sms", "voice"],
    baseUrl: "https://rest.nexmo.com",
    auth: {
      type: "basic",
      setup: "В n8n: HTTP Basic Auth. Username = API Key, Password = API Secret. Альтернативно: api_key и api_secret прямо в body."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      send_sms: {
        method: "POST",
        path: "/sms/json",
        description: "Отправить SMS",
        bodyExample: '{"from":"MyApp","to":"79991234567","text":"Привет!","api_key":"YOUR_API_KEY","api_secret":"YOUR_API_SECRET"}',
        response: "messages[0].status — '0' при успехе, messages[0].message-id",
        notes: [
          "Auth можно передать в body (api_key + api_secret) ИЛИ через Basic Auth",
          "status: '0' = успех (строка, не число!)",
          "from: alphanumeric sender ID или номер",
          "Ответ ВСЕГДА 200 OK, ошибки в messages[0].status"
        ]
      }
    },
    n8nNotes: [
      "Два способа auth: Basic Auth ИЛИ api_key+api_secret в body",
      "Ответ всегда 200 — проверяй messages[0].status == '0'!",
      "from: можно использовать текстовое имя (MyApp) вместо номера"
    ],
    rateLimits: "1 msg/sec на номер. Throughput настраивается.",
    docsUrl: "https://developer.vonage.com/en/api/sms"
  },

  {
    name: "LINE Messenger",
    description: "LINE Messaging API. Bearer Channel Access Token.",
    category: ["messaging", "line", "japan"],
    baseUrl: "https://api.line.me/v2/bot",
    auth: {
      type: "bearer",
      setup: "В n8n: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь Channel Access Token из LINE Developers Console."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      push_message: {
        method: "POST",
        path: "/message/push",
        description: "Отправить сообщение пользователю (инициировать)",
        bodyExample: '{"to":"USER_ID","messages":[{"type":"text","text":"Привет!"}]}',
        response: "Пустое тело при успехе (200 OK). sentMessages[].id для tracking.",
        notes: [
          "to: User ID (получи через webhook follow event)",
          "messages: массив (до 5 сообщений за раз)",
          "type: text, image, video, audio, location, sticker, template, flex",
          "ПУСТОЕ ТЕЛО при 200 OK — не ожидай JSON ответ!"
        ]
      },
      reply_message: {
        method: "POST",
        path: "/message/reply",
        description: "Ответить на сообщение пользователя (бесплатно!)",
        bodyExample: '{"replyToken":"REPLY_TOKEN","messages":[{"type":"text","text":"Ответ!"}]}',
        response: "Пустое тело при успехе",
        notes: [
          "replyToken: из webhook event (одноразовый, живёт ~1 мин!)",
          "Reply бесплатен, Push платный — используй reply когда возможно"
        ]
      }
    },
    n8nNotes: [
      "push (инициация) — платный, reply (ответ) — бесплатный!",
      "ПУСТОЕ ТЕЛО при успехе (200 OK) — n8n может показать ошибку парсинга, это нормально",
      "replyToken одноразовый и живёт ~1 мин — отвечай быстро!",
      "User ID получи из webhook при follow/message event"
    ],
    rateLimits: "Зависит от плана. Free: 500 push/month.",
    docsUrl: "https://developers.line.biz/en/reference/messaging-api/"
  },

  {
    name: "Pushover",
    description: "Простейший push notification API. Всё в form-urlencoded body.",
    category: ["messaging", "notifications", "push"],
    baseUrl: "https://api.pushover.net",
    auth: {
      type: "query",
      setup: "API token и user key передаются В ТЕЛЕ запроса, НЕ в заголовках."
    },
    defaultHeaders: {},
    endpoints: {
      send_notification: {
        method: "POST",
        path: "/1/messages.json",
        description: "Отправить push уведомление",
        bodyExample: '{"token":"YOUR_APP_TOKEN","user":"YOUR_USER_KEY","message":"Привет!","title":"Заголовок","priority":0,"sound":"pushover"}',
        response: "status: 1 — успех, request — ID запроса",
        notes: [
          "token: Application API Token",
          "user: User Key (или Group Key)",
          "ОБА обязательны В BODY (не в заголовках!)",
          "Принимает JSON и form-urlencoded",
          "priority: -2 (silent) до 2 (emergency)",
          "priority=2: ОБЯЗАТЕЛЬНЫ retry и expire параметры",
          "sound: pushover, bike, bugle, cashregister, cosmic и др.",
          "Для вложений: multipart/form-data с attachment файлом"
        ]
      }
    },
    n8nNotes: [
      "НЕТ заголовков авторизации! token и user прямо в body запроса",
      "Принимает и JSON и form-urlencoded — оба работают",
      "priority=2 (emergency): ОБЯЗАТЕЛЬНО добавь retry (сек) и expire (сек)",
      "Самый простой notification API: token + user + message = всё",
      "Для HTML: html=1 параметр"
    ],
    rateLimits: "10,000 requests/month per app. 250 messages/email/month.",
    docsUrl: "https://pushover.net/api"
  },

  {
    name: "Gmail API",
    description: "Google Gmail API. OAuth2 обязателен. Сложная настройка, но мощные возможности.",
    category: ["email", "google"],
    baseUrl: "https://gmail.googleapis.com/gmail/v1",
    auth: {
      type: "oauth2",
      setup: "В n8n: используй встроенную Gmail ноду (обрабатывает OAuth2). Для HTTP Request: нужен OAuth2 токен через Google Cloud Console → Credentials → OAuth 2.0 Client."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      send_message: {
        method: "POST",
        path: "/users/me/messages/send",
        description: "Отправить email. ВНИМАНИЕ: тело в base64url формате RFC 2822!",
        bodyExample: '{"raw":"BASE64URL_ENCODED_EMAIL"}',
        response: "id — ID отправленного сообщения, threadId",
        notes: [
          "КРИТИЧНО: raw = base64url-encoded RFC 2822 email!",
          "Нужно сформировать email с заголовками (From, To, Subject) → закодировать в base64url",
          "Пример raw: btoa('From: me@gmail.com\\r\\nTo: user@example.com\\r\\nSubject: Test\\r\\n\\r\\nHello!').replace(/\\+/g,'-').replace(/\\//g,'_')",
          "OAuth2 обязателен — нет API key варианта",
          "Scope: https://www.googleapis.com/auth/gmail.send"
        ]
      },
      list_messages: {
        method: "GET",
        path: "/users/me/messages",
        description: "Список сообщений с фильтрацией",
        response: "messages[] — массив с id и threadId (без содержимого!)",
        notes: [
          "Возвращает только ID! Для содержимого: GET /users/me/messages/{id}",
          "q: поисковый запрос (Gmail синтаксис: from:, subject:, is:unread и т.д.)",
          "maxResults: до 500"
        ]
      },
      get_message: {
        method: "GET",
        path: "/users/me/messages/{id}",
        description: "Получить полное сообщение по ID",
        response: "payload.headers[] — заголовки, payload.body.data — содержимое (base64url)",
        notes: [
          "format=full (по умолчанию) или format=metadata (только заголовки)",
          "Содержимое в base64url — нужно декодировать!"
        ]
      }
    },
    n8nNotes: [
      "РЕКОМЕНДАЦИЯ: используй встроенную Gmail ноду в n8n (обрабатывает OAuth2 и base64)",
      "Для HTTP Request: OAuth2 + base64url encoding — очень сложно вручную",
      "raw email формат: сначала сформируй RFC 2822, потом base64url encode",
      "n8n Gmail нода делает всё это автоматически"
    ],
    rateLimits: "250 sends/day для бесплатных, 2000/day для Workspace.",
    docsUrl: "https://developers.google.com/gmail/api/reference/rest"
  },

  {
    name: "Microsoft Outlook (Graph API)",
    description: "Outlook email через Microsoft Graph API. OAuth2 обязателен.",
    category: ["email", "microsoft"],
    baseUrl: "https://graph.microsoft.com/v1.0",
    auth: {
      type: "oauth2",
      setup: "В n8n: используй встроенную Microsoft Outlook ноду. Для HTTP Request: OAuth2 через Azure AD App Registration."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      send_mail: {
        method: "POST",
        path: "/me/sendMail",
        description: "Отправить email",
        bodyExample: '{"message":{"subject":"Test","body":{"contentType":"HTML","content":"<h1>Привет!</h1>"},"toRecipients":[{"emailAddress":{"address":"user@example.com"}}]},"saveToSentItems":true}',
        response: "Пустое тело при успехе (202 Accepted)",
        notes: [
          "ПУСТОЕ ТЕЛО при успехе (202)!",
          "contentType: 'HTML' или 'Text'",
          "toRecipients: массив объектов с emailAddress.address",
          "saveToSentItems: true — сохранить в Sent",
          "OAuth2 scope: Mail.Send"
        ]
      },
      list_messages: {
        method: "GET",
        path: "/me/messages",
        description: "Список сообщений в Inbox",
        response: "value[] — массив сообщений с subject, body, from",
        notes: [
          "$filter, $select, $top, $orderby для фильтрации",
          "Пример: ?$filter=isRead eq false&$top=10"
        ]
      }
    },
    n8nNotes: [
      "РЕКОМЕНДАЦИЯ: используй встроенную Microsoft Outlook ноду в n8n",
      "Для HTTP Request: нужна Azure AD App Registration + OAuth2",
      "sendMail возвращает ПУСТОЕ ТЕЛО при успехе (202)",
      "OData query params ($filter, $select) для фильтрации"
    ],
    rateLimits: "10,000 requests per 10 min per app.",
    docsUrl: "https://learn.microsoft.com/en-us/graph/api/user-sendmail"
  },

  {
    name: "SendGrid",
    description: "Email API от Twilio. Bearer token. Самый популярный transactional email API.",
    category: ["email", "transactional"],
    baseUrl: "https://api.sendgrid.com",
    auth: {
      type: "bearer",
      setup: "В n8n HTTP Request: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь SendGrid API Key (SG....)."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      send_mail: {
        method: "POST",
        path: "/v3/mail/send",
        description: "Отправить email. ПУСТОЕ ТЕЛО при успехе (202)!",
        bodyExample: '{"personalizations":[{"to":[{"email":"user@example.com","name":"User"}]}],"from":{"email":"sender@yourdomain.com","name":"Sender"},"subject":"Привет!","content":[{"type":"text/html","value":"<h1>Hello!</h1>"}]}',
        response: "ПУСТОЕ ТЕЛО при успехе! HTTP 202 Accepted.",
        notes: [
          "ПУСТОЕ ТЕЛО при 202 Accepted — это НОРМАЛЬНО, не ошибка!",
          "personalizations: массив (до 1000 получателей)",
          "content: массив с type (text/plain или text/html) и value",
          "Для шаблонов: template_id вместо subject/content",
          "Для вложений: attachments[].content (base64), filename, type"
        ]
      },
      add_contact: {
        method: "PUT",
        path: "/v3/marketing/contacts",
        description: "Добавить/обновить контакт в Marketing",
        bodyExample: '{"contacts":[{"email":"user@example.com","first_name":"John","last_name":"Doe"}]}',
        response: "job_id — ID фоновой задачи",
        notes: [
          "PUT, не POST!",
          "Batch: до 30,000 контактов за раз",
          "ASYNC: возвращает job_id, обработка в фоне"
        ]
      }
    },
    n8nNotes: [
      "ПУСТОЕ ТЕЛО при 202 — это успех! n8n может показать 'пустой ответ' — это нормально",
      "personalizations — самая запутанная часть: это массив наборов получателей",
      "Каждый personalizations[] может иметь свои to, cc, bcc, dynamic_template_data",
      "Для простого письма: 1 элемент в personalizations с 1 получателем",
      "n8n имеет встроенную SendGrid ноду"
    ],
    rateLimits: "Зависит от плана. Free: 100/day.",
    docsUrl: "https://docs.sendgrid.com/api-reference/mail-send/mail-send"
  },

  {
    name: "Mailchimp",
    description: "Email marketing API. Datacenter в URL! Basic Auth или OAuth2.",
    category: ["email", "marketing", "newsletter"],
    baseUrl: "https://{dc}.api.mailchimp.com/3.0",
    auth: {
      type: "basic",
      setup: "В n8n: HTTP Basic Auth. Username = 'anystring' (любой), Password = API Key. ВАЖНО: замени {dc} на свой datacenter (us1, us2, etc.) из API key."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      add_member: {
        method: "POST",
        path: "/lists/{list_id}/members",
        description: "Добавить подписчика в список",
        bodyExample: '{"email_address":"user@example.com","status":"subscribed","merge_fields":{"FNAME":"John","LNAME":"Doe"}}',
        response: "id — ID подписчика, status",
        notes: [
          "status: 'subscribed', 'unsubscribed', 'cleaned', 'pending' (double opt-in)",
          "list_id: ID списка (audience) из Mailchimp Dashboard",
          "merge_fields: кастомные поля (FNAME, LNAME и др.)",
          "Если подписчик уже есть: 400 ошибка! Используй PUT для upsert"
        ]
      },
      upsert_member: {
        method: "PUT",
        path: "/lists/{list_id}/members/{subscriber_hash}",
        description: "Добавить или обновить подписчика (upsert)",
        bodyExample: '{"email_address":"user@example.com","status_if_new":"subscribed","merge_fields":{"FNAME":"John"}}',
        response: "id, status",
        notes: [
          "subscriber_hash = MD5 hash email (lowercase!)",
          "status_if_new: статус для новых (для существующих не меняет)",
          "Предпочтительнее POST — не дублирует записи"
        ]
      },
      send_campaign: {
        method: "POST",
        path: "/campaigns/{campaign_id}/actions/send",
        description: "Отправить кампанию",
        response: "Пустое тело при успехе (204)",
        notes: ["Кампанию нужно сначала создать через POST /campaigns"]
      }
    },
    n8nNotes: [
      "DATACENTER В URL! Замени {dc} на us1, us2 и т.д. (последние символы API key после -)",
      "API key формат: xxxx-us1 → dc = us1 → https://us1.api.mailchimp.com/3.0",
      "Basic Auth: Username = любая строка, Password = API Key",
      "subscriber_hash для PUT = MD5(email.toLowerCase())",
      "n8n имеет встроенную Mailchimp ноду"
    ],
    rateLimits: "10 concurrent connections. 10 requests/sec.",
    docsUrl: "https://mailchimp.com/developer/marketing/api/"
  },

  {
    name: "Brevo",
    description: "Email marketing + transactional. Кастомный заголовок api-key.",
    category: ["email", "marketing", "transactional"],
    baseUrl: "https://api.brevo.com/v3",
    auth: {
      type: "header",
      setup: "В n8n HTTP Request: добавь заголовок api-key: YOUR_BREVO_API_KEY.",
      headerName: "api-key"
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      send_transactional: {
        method: "POST",
        path: "/smtp/email",
        description: "Отправить transactional email",
        bodyExample: '{"sender":{"name":"My App","email":"noreply@yourdomain.com"},"to":[{"email":"user@example.com","name":"User"}],"subject":"Привет!","htmlContent":"<h1>Hello!</h1>"}',
        response: "messageId — ID сообщения",
        notes: [
          "Auth: заголовок api-key (НЕ Bearer, НЕ x-api-key!)",
          "sender: обязателен (name + email)",
          "htmlContent ИЛИ textContent ИЛИ templateId",
          "Для шаблонов: templateId + params для переменных"
        ]
      },
      create_contact: {
        method: "POST",
        path: "/contacts",
        description: "Создать/обновить контакт",
        bodyExample: '{"email":"user@example.com","attributes":{"FIRSTNAME":"John","LASTNAME":"Doe"},"listIds":[1,2],"updateEnabled":true}',
        response: "id — ID контакта",
        notes: [
          "updateEnabled: true — обновить если существует (upsert)",
          "listIds: массив ID списков"
        ]
      }
    },
    n8nNotes: [
      "Auth: заголовок api-key (кастомный! НЕ Bearer!)",
      "Transactional: /smtp/email, Marketing: другие endpoints",
      "updateEnabled:true для upsert контактов",
      "Ранее назывался Sendinblue — если видишь старые доки"
    ],
    rateLimits: "Зависит от плана. Free: 300 emails/day.",
    docsUrl: "https://developers.brevo.com/reference/sendtransacemail"
  },

  {
    name: "Mailgun",
    description: "Email API. Basic Auth + form-urlencoded body! НЕ JSON!",
    category: ["email", "transactional"],
    baseUrl: "https://api.mailgun.net/v3",
    auth: {
      type: "basic",
      setup: "В n8n: HTTP Basic Auth. Username = 'api' (буквально строка 'api'), Password = API Key (key-xxxx)."
    },
    defaultHeaders: {},
    endpoints: {
      send_message: {
        method: "POST",
        path: "/{domain}/messages",
        description: "Отправить email. КРИТИЧНО: form-urlencoded, НЕ JSON!",
        contentType: "application/x-www-form-urlencoded",
        body: "from=Sender <sender@yourdomain.com>&to=user@example.com&subject=Hello&html=<h1>Hi!</h1>",
        bodyExample: "from=My App <noreply@yourdomain.com>&to=user@example.com&subject=Привет!&html=<h1>Hello!</h1>",
        response: "id — Message-Id, message — 'Queued. Thank you.'",
        notes: [
          "КРИТИЧНО: Content-Type = application/x-www-form-urlencoded, НЕ JSON!",
          "В n8n: Body Content Type = Form URL Encoded",
          "Basic Auth: Username = 'api' (строка), Password = API Key",
          "{domain}: твой домен в Mailgun (не api.mailgun.net!)",
          "Для EU: base URL = https://api.eu.mailgun.net/v3",
          "Для вложений: multipart/form-data"
        ]
      }
    },
    n8nNotes: [
      "Body Content Type = Form URL Encoded (НЕ JSON!) — частая ошибка!",
      "Basic Auth: Username = 'api' (буквально), Password = API Key",
      "Домен в URL пути: /v3/yourdomain.com/messages",
      "EU region: замени api.mailgun.net на api.eu.mailgun.net",
      "n8n имеет встроенную Mailgun ноду"
    ],
    rateLimits: "Зависит от плана.",
    docsUrl: "https://documentation.mailgun.com/docs/mailgun/api-reference/openapi-final/tag/Messages/"
  },

  {
    name: "Amazon SES",
    description: "AWS Simple Email Service. AWS SigV4 auth (сложно) или SMTP (проще).",
    category: ["email", "transactional", "aws"],
    baseUrl: "https://email.{region}.amazonaws.com",
    auth: {
      type: "header",
      setup: "AWS SigV4 подпись — очень сложно в n8n HTTP Request. РЕКОМЕНДАЦИЯ: используй SMTP (порт 587, TLS) через n8n Send Email ноду, или AWS SDK.",
      headerName: "Authorization (AWS SigV4)"
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      send_email_v2: {
        method: "POST",
        path: "/v2/email/outbound-emails",
        description: "Отправить email через SES v2 API",
        bodyExample: '{"FromEmailAddress":"noreply@yourdomain.com","Destination":{"ToAddresses":["user@example.com"]},"Content":{"Simple":{"Subject":{"Data":"Hello"},"Body":{"Html":{"Data":"<h1>Hi!</h1>"}}}}}',
        response: "MessageId",
        notes: [
          "AWS SigV4 подпись ОБЯЗАТЕЛЬНА — очень сложно вручную!",
          "РЕКОМЕНДАЦИЯ: используй SMTP вместо REST API",
          "SMTP endpoint: email-smtp.{region}.amazonaws.com:587",
          "SMTP credentials генерируются из IAM user (не тот же что API key!)"
        ]
      }
    },
    n8nNotes: [
      "НЕ РЕКОМЕНДУЕТСЯ через HTTP Request — SigV4 подпись слишком сложна",
      "РЕКОМЕНДАЦИЯ 1: n8n Send Email нода + SMTP (email-smtp.{region}.amazonaws.com:587)",
      "РЕКОМЕНДАЦИЯ 2: n8n AWS Lambda нода → Lambda функция с SES SDK",
      "SMTP credentials: IAM Console → Create SMTP Credentials (НЕ обычные IAM credentials!)"
    ],
    rateLimits: "Sandbox: 200/day. Production: 50,000+/day.",
    docsUrl: "https://docs.aws.amazon.com/ses/latest/APIReference-V2/Welcome.html"
  },

  {
    name: "ConvertKit (Kit)",
    description: "Email marketing для creators. Bearer API key. Простой REST API.",
    category: ["email", "marketing", "newsletter", "creators"],
    baseUrl: "https://api.convertkit.com/v4",
    auth: {
      type: "bearer",
      setup: "В n8n HTTP Request: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь ConvertKit API Key."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      add_subscriber: {
        method: "POST",
        path: "/subscribers",
        description: "Добавить подписчика",
        bodyExample: '{"email_address":"user@example.com","first_name":"John","state":"active"}',
        response: "subscriber.id — ID подписчика",
        notes: [
          "state: 'active' (подтверждён), 'inactive'",
          "Если подписчик существует — обновляется (upsert)"
        ]
      },
      add_subscriber_to_form: {
        method: "POST",
        path: "/forms/{form_id}/subscribers",
        description: "Подписать через форму (с double opt-in если настроен)",
        bodyExample: '{"email_address":"user@example.com","first_name":"John"}',
        response: "subscriber.id",
        notes: ["form_id: ID формы из ConvertKit Dashboard"]
      },
      list_subscribers: {
        method: "GET",
        path: "/subscribers",
        description: "Список подписчиков с фильтрацией",
        response: "subscribers[] — массив подписчиков",
        notes: ["Пагинация: page, per_page (до 100)"]
      }
    },
    n8nNotes: [
      "v4 API — новее чем v3 (Bearer auth вместо api_key в query)",
      "Ранее назывался ConvertKit, теперь Kit — API тот же",
      "Подписка через форму запускает automation sequences"
    ],
    rateLimits: "120 requests/min.",
    docsUrl: "https://developers.convertkit.com/v4"
  },

  {
    name: "Resend",
    description: "Современный email API для разработчиков. Простейший из всех — 3 поля и готово.",
    category: ["email", "transactional", "developer"],
    baseUrl: "https://api.resend.com",
    auth: {
      type: "bearer",
      setup: "В n8n HTTP Request: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь Resend API Key (re_...)."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      send_email: {
        method: "POST",
        path: "/emails",
        description: "Отправить email. Самый простой email API!",
        bodyExample: '{"from":"My App <noreply@yourdomain.com>","to":["user@example.com"],"subject":"Привет!","html":"<h1>Hello World!</h1>"}',
        response: "id — ID email для tracking",
        notes: [
          "САМЫЙ ПРОСТОЙ email API: from + to + subject + html = всё!",
          "to: строка или массив (до 50 получателей)",
          "from: 'Name <email>' формат",
          "Для шаблонов: template_id вместо html/text",
          "Для вложений: attachments[].filename + content (base64)",
          "Для scheduling: scheduled_at (ISO 8601)",
          "Тестовые адреса: delivered@resend.dev, bounced@resend.dev"
        ]
      },
      send_batch: {
        method: "POST",
        path: "/emails/batch",
        description: "Отправить batch emails (несколько за раз)",
        bodyExample: '[{"from":"noreply@yourdomain.com","to":"user1@example.com","subject":"Hi 1","html":"<p>Hello 1</p>"},{"from":"noreply@yourdomain.com","to":"user2@example.com","subject":"Hi 2","html":"<p>Hello 2</p>"}]',
        response: "data[] — массив с id каждого email",
        notes: [
          "Body = МАССИВ объектов (не объект!)",
          "До 100 emails за batch запрос"
        ]
      },
      get_email: {
        method: "GET",
        path: "/emails/{email_id}",
        description: "Получить статус email по ID",
        response: "id, from, to, subject, last_event ('delivered'|'bounced'|'complained')",
        notes: ["last_event показывает текущий статус доставки"]
      }
    },
    n8nNotes: [
      "САМЫЙ ПРОСТОЙ email API для n8n — минимум настройки",
      "Стандартный Bearer auth, стандартный JSON",
      "from: домен должен быть верифицирован в Resend Dashboard",
      "Для тестирования: onboarding@resend.dev как from (без верификации домена)",
      "Batch: body = массив (не объект!) — до 100 emails"
    ],
    rateLimits: "Free: 100/day, 3000/month. Paid: значительно больше.",
    docsUrl: "https://resend.com/docs/api-reference/emails/send-email"
  },

  {
    name: "Postmark",
    description: "Transactional email с отличной доставляемостью. Кастомный заголовок X-Postmark-Server-Token.",
    category: ["email", "transactional"],
    baseUrl: "https://api.postmarkapp.com",
    auth: {
      type: "header",
      setup: "В n8n HTTP Request: добавь заголовок X-Postmark-Server-Token: YOUR_SERVER_TOKEN.",
      headerName: "X-Postmark-Server-Token"
    },
    defaultHeaders: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    endpoints: {
      send_email: {
        method: "POST",
        path: "/email",
        description: "Отправить transactional email",
        bodyExample: '{"From":"sender@yourdomain.com","To":"user@example.com","Subject":"Привет!","HtmlBody":"<h1>Hello!</h1>","TextBody":"Hello!","MessageStream":"outbound"}',
        response: "MessageID — UUID сообщения, To, SubmittedAt",
        notes: [
          "Auth: заголовок X-Postmark-Server-Token",
          "From: должен быть верифицирован (Sender Signature)",
          "MessageStream: 'outbound' (transactional) или 'broadcast' (marketing)",
          "Поля в PascalCase: From, To, Subject, HtmlBody (НЕ camelCase!)",
          "TextBody рекомендуется (fallback для клиентов без HTML)"
        ]
      },
      send_with_template: {
        method: "POST",
        path: "/email/withTemplate",
        description: "Отправить email по шаблону",
        bodyExample: '{"From":"sender@yourdomain.com","To":"user@example.com","TemplateId":12345,"TemplateModel":{"name":"John","action_url":"https://example.com/activate"}}',
        response: "MessageID",
        notes: [
          "TemplateId: ID шаблона из Postmark Dashboard",
          "TemplateModel: объект с переменными для шаблона"
        ]
      },
      send_batch: {
        method: "POST",
        path: "/email/batch",
        description: "Отправить batch emails (до 500 за раз)",
        bodyExample: '[{"From":"sender@yourdomain.com","To":"user1@example.com","Subject":"Hi 1","HtmlBody":"<p>1</p>"},{"From":"sender@yourdomain.com","To":"user2@example.com","Subject":"Hi 2","HtmlBody":"<p>2</p>"}]',
        response: "Массив результатов с MessageID для каждого",
        notes: [
          "Body = МАССИВ объектов",
          "До 500 emails за batch!"
        ]
      }
    },
    n8nNotes: [
      "Auth: заголовок X-Postmark-Server-Token (кастомный!)",
      "Поля в PascalCase: From, To, Subject, HtmlBody — не camelCase!",
      "Accept: application/json рекомендуется",
      "MessageStream: 'outbound' для transactional (по умолчанию)",
      "Batch: до 500 emails — больше чем у большинства"
    ],
    rateLimits: "Зависит от плана. Standard: 10/sec.",
    docsUrl: "https://postmarkapp.com/developer/api/email-api"
  },

  {
    name: "HubSpot",
    description: "CRM, marketing, sales API. Bearer token. Мощный REST API с associations.",
    category: ["crm", "marketing", "sales"],
    baseUrl: "https://api.hubapi.com",
    auth: {
      type: "bearer",
      setup: "В n8n: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь Private App Token (pat-...)."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_contact: {
        method: "POST",
        path: "/crm/v3/objects/contacts",
        description: "Создать контакт",
        bodyExample: '{"properties":{"email":"user@example.com","firstname":"John","lastname":"Doe","phone":"+79991234567"}}',
        response: "id — ID контакта, properties — все свойства",
        notes: [
          "Все данные в properties объекте",
          "email — основной идентификатор контакта",
          "Если контакт с таким email существует: 409 Conflict"
        ]
      },
      search_contacts: {
        method: "POST",
        path: "/crm/v3/objects/contacts/search",
        description: "Поиск контактов с фильтрами",
        bodyExample: '{"filterGroups":[{"filters":[{"propertyName":"email","operator":"EQ","value":"user@example.com"}]}],"properties":["email","firstname","lastname"],"limit":10}',
        response: "results[] — массив контактов",
        notes: [
          "POST для поиска (не GET!)",
          "filterGroups с AND/OR логикой",
          "properties: явно указать какие поля вернуть"
        ]
      },
      create_deal: {
        method: "POST",
        path: "/crm/v3/objects/deals",
        description: "Создать сделку",
        bodyExample: '{"properties":{"dealname":"New Deal","amount":"10000","dealstage":"appointmentscheduled","pipeline":"default"}}',
        response: "id, properties",
        notes: [
          "dealstage: internal name стадии (не label!)",
          "pipeline: internal name пайплайна"
        ]
      },
      create_association: {
        method: "PUT",
        path: "/crm/v4/objects/{fromObjectType}/{fromObjectId}/associations/{toObjectType}/{toObjectId}",
        description: "Связать два объекта (контакт ↔ сделка и т.д.)",
        bodyExample: '[{"associationCategory":"HUBSPOT_DEFINED","associationTypeId":3}]',
        response: "Пустое тело при успехе",
        notes: [
          "PUT, не POST!",
          "associationTypeId: 3 = deal→contact, 1 = contact→company и т.д.",
          "Тело = МАССИВ (не объект!)"
        ]
      }
    },
    n8nNotes: [
      "Private App Token (pat-...) — самый простой способ auth",
      "Все CRM объекты через единый паттерн: /crm/v3/objects/{type}",
      "Поиск = POST (не GET!)",
      "Associations: связывание объектов через отдельный endpoint",
      "n8n имеет встроенную HubSpot ноду"
    ],
    rateLimits: "Private apps: 200 req/10sec. OAuth: 200 req/10sec.",
    docsUrl: "https://developers.hubspot.com/docs/api/crm/contacts"
  },

  {
    name: "Salesforce",
    description: "Enterprise CRM. OAuth2 обязателен. Instance-specific URL.",
    category: ["crm", "enterprise", "sales"],
    baseUrl: "https://{instance}.salesforce.com/services/data/v59.0",
    auth: {
      type: "oauth2",
      setup: "OAuth2 обязателен. В n8n: используй встроенную Salesforce ноду (обрабатывает OAuth). Для HTTP Request: Connected App в Salesforce Setup → OAuth2 flow."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_record: {
        method: "POST",
        path: "/sobjects/{SObjectType}",
        description: "Создать запись (Contact, Lead, Account, Opportunity и т.д.)",
        bodyExample: '{"FirstName":"John","LastName":"Doe","Email":"john@example.com","Phone":"+79991234567"}',
        response: "id — Salesforce Record ID (18 символов), success: true",
        notes: [
          "{SObjectType}: Contact, Lead, Account, Opportunity, Case и т.д.",
          "Поля зависят от объекта и кастомизации",
          "Instance URL уникален: mycompany.salesforce.com",
          "OAuth2 access_token живёт ~2 часа → нужен refresh"
        ]
      },
      query: {
        method: "GET",
        path: "/query",
        description: "SOQL запрос (Salesforce Object Query Language)",
        response: "records[] — массив записей",
        notes: [
          "q= query param с SOQL: ?q=SELECT Id,Name FROM Contact WHERE Email='test@test.com'",
          "SOQL похож на SQL но со своими особенностями",
          "Пагинация через nextRecordsUrl"
        ]
      }
    },
    n8nNotes: [
      "РЕКОМЕНДАЦИЯ: n8n встроенная Salesforce нода (обрабатывает OAuth2)",
      "Для HTTP Request: нужна Connected App + OAuth2 flow",
      "Instance URL уникален для каждой организации",
      "SOQL для запросов (не SQL!)",
      "API version в URL: /v59.0 (обновляется 3 раза в год)"
    ],
    rateLimits: "Зависит от edition. Enterprise: 100,000 req/day.",
    docsUrl: "https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/"
  },

  {
    name: "Pipedrive",
    description: "CRM для продаж. API token в query параметре ИЛИ Bearer.",
    category: ["crm", "sales", "pipeline"],
    baseUrl: "https://api.pipedrive.com/v1",
    auth: {
      type: "query",
      setup: "API token в query: ?api_token=YOUR_TOKEN. ИЛИ Bearer auth через OAuth2. В n8n: проще через query param."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_deal: {
        method: "POST",
        path: "/deals",
        description: "Создать сделку",
        bodyExample: '{"title":"New Deal","value":10000,"currency":"USD","person_id":123,"org_id":456,"stage_id":1}',
        response: "data.id — ID сделки, success: true",
        notes: [
          "URL: /deals?api_token=YOUR_TOKEN",
          "person_id и org_id: привязка к контакту и компании",
          "stage_id: ID стадии в pipeline"
        ]
      },
      create_person: {
        method: "POST",
        path: "/persons",
        description: "Создать контакт (person)",
        bodyExample: '{"name":"John Doe","email":[{"value":"john@example.com","primary":true}],"phone":[{"value":"+79991234567","primary":true}]}',
        response: "data.id, success: true",
        notes: [
          "email и phone — МАССИВЫ объектов (не строки!)",
          "primary: true для основного email/phone"
        ]
      },
      search: {
        method: "GET",
        path: "/itemSearch",
        description: "Поиск по всем типам объектов",
        response: "data.items[] — массив результатов",
        notes: [
          "Query params: term=search_text&item_types=deal,person",
          "item_types: deal, person, organization, product, lead"
        ]
      }
    },
    n8nNotes: [
      "API token в query: ?api_token=YOUR_TOKEN — самый простой способ",
      "email и phone — МАССИВЫ объектов, не строки!",
      "Ответы обёрнуты: {success: true, data: {...}}",
      "n8n имеет встроенную Pipedrive ноду"
    ],
    rateLimits: "80-400 req/10sec в зависимости от плана.",
    docsUrl: "https://developers.pipedrive.com/docs/api/v1"
  },

  {
    name: "Zoho CRM",
    description: "CRM от Zoho. OAuth2 обязателен. DC-specific URL (us, eu, in, au, jp).",
    category: ["crm", "sales", "zoho"],
    baseUrl: "https://www.zohoapis.com/crm/v2",
    auth: {
      type: "oauth2",
      setup: "OAuth2 обязателен. В n8n: используй встроенную Zoho CRM ноду. Для HTTP Request: Zoho Developer Console → Self Client → OAuth2."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_record: {
        method: "POST",
        path: "/{module}",
        description: "Создать запись (Leads, Contacts, Deals и т.д.)",
        bodyExample: '{"data":[{"Last_Name":"Doe","First_Name":"John","Email":"john@example.com","Phone":"+79991234567"}]}',
        response: "data[0].details.id — ID записи, data[0].status: 'success'",
        notes: [
          "{module}: Leads, Contacts, Deals, Accounts, Tasks и т.д.",
          "data: МАССИВ записей (batch до 100!)",
          "DC в URL: zohoapis.com (US), zohoapis.eu (EU), zohoapis.in (India)",
          "OAuth2 access_token живёт 1 час → обязателен refresh_token"
        ]
      },
      search_records: {
        method: "GET",
        path: "/{module}/search",
        description: "Поиск записей",
        response: "data[] — массив записей",
        notes: [
          "criteria: (Email:equals:test@test.com)",
          "word: простой текстовый поиск"
        ]
      }
    },
    n8nNotes: [
      "РЕКОМЕНДАЦИЯ: n8n встроенная Zoho CRM нода",
      "DC-specific URL! US: zohoapis.com, EU: zohoapis.eu",
      "data в body = МАССИВ (даже для одной записи)",
      "OAuth2 refresh token обязателен (access token живёт 1 час)"
    ],
    rateLimits: "Зависит от edition. Free: 5,000 req/day.",
    docsUrl: "https://www.zoho.com/crm/developer/docs/api/v2/"
  },

  {
    name: "Monday.com",
    description: "Work management. GRAPHQL API! Один endpoint для всего. POST с query в body.",
    category: ["crm", "project-management", "work-management"],
    baseUrl: "https://api.monday.com/v2",
    auth: {
      type: "bearer",
      setup: "В n8n HTTP Request: добавь заголовок Authorization: YOUR_API_TOKEN (БЕЗ 'Bearer' префикса!)."
    },
    defaultHeaders: {
      "Content-Type": "application/json",
      "API-Version": "2025-07"
    },
    endpoints: {
      graphql_query: {
        method: "POST",
        path: "",
        description: "ВСЕ операции через один POST endpoint с GraphQL query в body",
        bodyExample: '{"query":"query { boards (limit:5) { id name } }"}',
        response: "data — объект с результатом запроса",
        notes: [
          "GRAPHQL! Один endpoint для всего: POST https://api.monday.com/v2",
          "Body: {\"query\": \"...\"}  — GraphQL query в поле query",
          "Authorization: токен БЕЗ 'Bearer ' префикса!",
          "API-Version: '2025-07' рекомендуется",
          "Query ОБЯЗАТЕЛЬНО в body (не в URL параметрах!)"
        ]
      },
      create_item: {
        method: "POST",
        path: "",
        description: "Создать item (запись) на доске",
        bodyExample: '{"query":"mutation { create_item (board_id: 1234567890, group_id: \\\"topics\\\", item_name: \\\"New Task\\\", column_values: \\\"{}\\\") { id name } }"}',
        response: "data.create_item.id — ID созданного item",
        notes: [
          "Тот же endpoint! Mutations для создания/обновления",
          "column_values: JSON строка (двойное экранирование!)",
          "board_id и group_id обязательны"
        ]
      },
      query_items: {
        method: "POST",
        path: "",
        description: "Получить items с доски",
        bodyExample: '{"query":"query { boards (ids: 1234567890) { items_page (limit: 50) { items { id name column_values { id text value } } } } }"}',
        response: "data.boards[0].items_page.items[]",
        notes: [
          "items_page вместо устаревшего items",
          "column_values: id, text (display), value (raw JSON)"
        ]
      }
    },
    n8nNotes: [
      "GRAPHQL! ВСЕ запросы = POST на https://api.monday.com/v2 с {\"query\": \"...\"}",
      "Authorization: токен БЕЗ 'Bearer' префикса — просто токен!",
      "Рекомендуется заголовок API-Version: 2025-07",
      "column_values — JSON строка с двойным экранированием (ад)",
      "n8n имеет встроенную Monday.com ноду (проще!)"
    ],
    rateLimits: "Complexity-based. 5,000,000 complexity points/min.",
    docsUrl: "https://developer.monday.com/api-reference/docs/basics"
  },

  {
    name: "Close CRM",
    description: "CRM для sales teams. Basic Auth (API key как username).",
    category: ["crm", "sales"],
    baseUrl: "https://api.close.com/api/v1",
    auth: {
      type: "basic",
      setup: "В n8n: HTTP Basic Auth. Username = API Key, Password = пустой."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_lead: {
        method: "POST",
        path: "/lead",
        description: "Создать lead (компанию с контактами)",
        bodyExample: '{"name":"Acme Corp","contacts":[{"name":"John Doe","emails":[{"email":"john@acme.com","type":"office"}],"phones":[{"phone":"+79991234567","type":"mobile"}]}]}',
        response: "id — lead ID (lead_...)",
        notes: [
          "Lead = компания. Contacts вложены в lead.",
          "ID формат: lead_xxxxx, cont_xxxxx, task_xxxxx"
        ]
      },
      search: {
        method: "GET",
        path: "/lead",
        description: "Поиск leads",
        response: "data[] — массив leads",
        notes: ["query param: ?query=email:john@example.com"]
      }
    },
    n8nNotes: [
      "Basic Auth: Username = API Key, Password = пусто",
      "Lead содержит contacts (вложенная структура)",
      "ID с префиксами: lead_, cont_, task_, oppo_"
    ],
    rateLimits: "Зависит от плана.",
    docsUrl: "https://developer.close.com/"
  },

  {
    name: "Freshsales",
    description: "CRM от Freshworks. Bearer token. Domain-specific URL.",
    category: ["crm", "sales", "freshworks"],
    baseUrl: "https://{domain}.freshsales.io/api",
    auth: {
      type: "bearer",
      setup: "В n8n: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь Freshsales API Key."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_contact: {
        method: "POST",
        path: "/contacts",
        description: "Создать контакт",
        bodyExample: '{"contact":{"first_name":"John","last_name":"Doe","email":"john@example.com","mobile_number":"+79991234567"}}',
        response: "contact.id",
        notes: [
          "Body обёрнут: {\"contact\": {...}} (не прямые поля!)",
          "Замени {domain} на ваш поддомен Freshsales"
        ]
      }
    },
    n8nNotes: [
      "Domain-specific URL: {yourdomain}.freshsales.io/api",
      "Body обёрнут в объект типа сущности: {contact: {...}}, {deal: {...}}",
      "Также может использовать заголовок Authorization: Token token=YOUR_KEY"
    ],
    rateLimits: "Зависит от плана.",
    docsUrl: "https://developers.freshworks.com/crm/api/"
  },

  {
    name: "Copper CRM",
    description: "CRM интегрированный с Google Workspace. Кастомные заголовки X-PW-*.",
    category: ["crm", "sales", "google-workspace"],
    baseUrl: "https://api.copper.com/developer_api/v1",
    auth: {
      type: "header",
      setup: "В n8n: добавь ДВА заголовка: 1) X-PW-AccessToken: YOUR_API_KEY, 2) X-PW-Application: developer_api, 3) X-PW-UserEmail: YOUR_EMAIL.",
      headerName: "X-PW-AccessToken"
    },
    defaultHeaders: {
      "Content-Type": "application/json",
      "X-PW-Application": "developer_api"
    },
    endpoints: {
      create_person: {
        method: "POST",
        path: "/people",
        description: "Создать person (контакт)",
        bodyExample: '{"name":"John Doe","emails":[{"email":"john@example.com","category":"work"}],"phone_numbers":[{"number":"+79991234567","category":"mobile"}]}',
        response: "id — ID контакта",
        notes: [
          "ТРИ обязательных заголовка: X-PW-AccessToken, X-PW-Application, X-PW-UserEmail",
          "emails и phone_numbers — массивы объектов"
        ]
      },
      search_people: {
        method: "POST",
        path: "/people/search",
        description: "Поиск контактов",
        bodyExample: '{"emails":["john@example.com"]}',
        response: "Массив person объектов",
        notes: ["POST для поиска (не GET!)"]
      }
    },
    n8nNotes: [
      "ТРИ кастомных заголовка: X-PW-AccessToken, X-PW-Application, X-PW-UserEmail",
      "X-PW-Application: всегда 'developer_api'",
      "X-PW-UserEmail: email пользователя от имени которого делается запрос",
      "Поиск через POST (не GET!)"
    ],
    rateLimits: "36,000 req/hour.",
    docsUrl: "https://developer.copper.com/"
  },

  {
    name: "ActiveCampaign",
    description: "Marketing automation + CRM. Кастомный заголовок Api-Token. Account-specific URL.",
    category: ["crm", "marketing-automation", "email"],
    baseUrl: "https://{account}.api-us1.com/api/3",
    auth: {
      type: "header",
      setup: "В n8n HTTP Request: добавь заголовок Api-Token: YOUR_API_KEY.",
      headerName: "Api-Token"
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_contact: {
        method: "POST",
        path: "/contacts",
        description: "Создать контакт",
        bodyExample: '{"contact":{"email":"john@example.com","firstName":"John","lastName":"Doe","phone":"+79991234567"}}',
        response: "contact.id",
        notes: [
          "Body обёрнут: {\"contact\": {...}}",
          "Замени {account} на имя аккаунта из URL ActiveCampaign"
        ]
      },
      add_tag: {
        method: "POST",
        path: "/contactTags",
        description: "Добавить тег контакту",
        bodyExample: '{"contactTag":{"contact":"123","tag":"456"}}',
        response: "contactTag.id",
        notes: [
          "contact и tag — это ID (не имена!)",
          "Получи tag ID через GET /tags"
        ]
      }
    },
    n8nNotes: [
      "Auth: заголовок Api-Token (с большой A!)",
      "Account-specific URL: {account}.api-us1.com",
      "Body обёрнут в тип сущности: {contact: {...}}, {deal: {...}}",
      "n8n имеет встроенную ActiveCampaign ноду"
    ],
    rateLimits: "5 req/sec.",
    docsUrl: "https://developers.activecampaign.com/reference"
  },

  {
    name: "Lemlist",
    description: "Cold email outreach. Basic Auth или API key в header.",
    category: ["sales", "outreach", "cold-email"],
    baseUrl: "https://api.lemlist.com/api",
    auth: {
      type: "basic",
      setup: "В n8n: HTTP Basic Auth. Username = пустой, Password = API Key. Или: заголовок Authorization: Bearer API_KEY."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      add_lead_to_campaign: {
        method: "POST",
        path: "/campaigns/{campaignId}/leads/{leadEmail}",
        description: "Добавить lead в кампанию",
        bodyExample: '{"firstName":"John","lastName":"Doe","companyName":"Acme Corp"}',
        response: "Lead object с _id",
        notes: [
          "leadEmail В URL пути (не в body!)",
          "campaignId: ID кампании из Lemlist Dashboard",
          "Доп. поля в body: firstName, lastName, companyName, customFields"
        ]
      },
      list_campaigns: {
        method: "GET",
        path: "/campaigns",
        description: "Список кампаний",
        response: "Массив campaign объектов с _id и name",
        notes: ["_id используется как campaignId"]
      }
    },
    n8nNotes: [
      "Basic Auth: Username = пусто, Password = API Key",
      "Lead email В URL (не в body!): /campaigns/{id}/leads/{email}",
      "Кастомные поля через body при добавлении lead"
    ],
    rateLimits: "Зависит от плана.",
    docsUrl: "https://developer.lemlist.com/"
  },

  {
    name: "Apollo.io",
    description: "Sales intelligence: поиск людей, enrichment, sequences. Кастомный заголовок x-api-key.",
    category: ["sales", "lead-generation", "enrichment"],
    baseUrl: "https://api.apollo.io",
    auth: {
      type: "header",
      setup: "В n8n HTTP Request: добавь заголовок x-api-key: YOUR_APOLLO_API_KEY.",
      headerName: "x-api-key"
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      people_search: {
        method: "POST",
        path: "/api/v1/mixed_people/api_search",
        description: "Поиск людей в базе Apollo (prospecting). НЕ тратит кредиты!",
        bodyExample: '{"person_titles":["Sales Director"],"person_locations":["California, US"],"per_page":25,"page":1}',
        response: "people[] — массив людей (без email! используй enrichment для email)",
        notes: [
          "POST для поиска!",
          "НЕ возвращает email/phone! Используй People Enrichment для этого",
          "НЕ тратит кредиты (поиск бесплатный)",
          "Лимит отображения: 50,000 записей (100/page, 500 pages)",
          "Требует master API key"
        ]
      },
      people_enrichment: {
        method: "POST",
        path: "/api/v1/people/match",
        description: "Enrichment данных человека (email, phone, company и т.д.)",
        bodyExample: '{"email":"john@example.com","reveal_personal_emails":false,"reveal_phone_number":false}',
        response: "person — объект с полными данными (email, phone, company, title и т.д.)",
        notes: [
          "ТРАТИТ кредиты!",
          "Чем больше данных передашь (email, name, domain) — тем точнее match",
          "reveal_personal_emails: true — вернёт personal email (доп. кредиты)",
          "reveal_phone_number: true — вернёт телефон (доп. кредиты)"
        ]
      },
      search_contacts: {
        method: "POST",
        path: "/api/v1/contacts/search",
        description: "Поиск среди уже добавленных контактов (ваша CRM)",
        bodyExample: '{"q_keywords":"sales director","sort_by_field":"created_at","sort_ascending":false,"per_page":25,"page":1}',
        response: "contacts[] — массив контактов из вашего CRM",
        notes: ["Это ваши контакты, не база Apollo"]
      }
    },
    n8nNotes: [
      "Auth: заголовок x-api-key",
      "People Search = бесплатный (без email). Enrichment = платный (с email)",
      "POST для всех операций поиска (не GET!)",
      "Bulk enrichment: до 10 людей за запрос через /people/bulk_match"
    ],
    rateLimits: "Зависит от плана. Rate limits видны в Developer Dashboard.",
    docsUrl: "https://docs.apollo.io/"
  },

  {
    name: "Instantly",
    description: "Cold email platform. Bearer API key. Простой REST API.",
    category: ["sales", "outreach", "cold-email"],
    baseUrl: "https://api.instantly.ai/api/v1",
    auth: {
      type: "bearer",
      setup: "В n8n: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь Instantly API Key."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      add_lead: {
        method: "POST",
        path: "/lead/add",
        description: "Добавить lead в кампанию",
        bodyExample: '{"campaign_id":"YOUR_CAMPAIGN_ID","email":"john@example.com","first_name":"John","last_name":"Doe","company_name":"Acme Corp","custom_variables":{"city":"New York"}}',
        response: "status: 'success'",
        notes: [
          "campaign_id обязателен",
          "custom_variables: объект с кастомными переменными для персонализации"
        ]
      },
      list_campaigns: {
        method: "GET",
        path: "/campaign/list",
        description: "Список кампаний",
        response: "Массив кампаний с id и name",
        notes: ["id используется как campaign_id"]
      },
      get_analytics: {
        method: "GET",
        path: "/analytics/campaign/summary",
        description: "Аналитика кампании",
        response: "sent, opened, replied, bounced и т.д.",
        notes: ["Query param: campaign_id=YOUR_ID"]
      }
    },
    n8nNotes: [
      "Стандартный Bearer auth, стандартный JSON",
      "campaign_id обязателен для добавления leads",
      "custom_variables для персонализации писем ({{city}} в шаблоне)"
    ],
    rateLimits: "Зависит от плана.",
    docsUrl: "https://developer.instantly.ai/"
  },

  {
    name: "Notion",
    description: "All-in-one workspace API. ОБЯЗАТЕЛЬНЫЙ заголовок Notion-Version. Сложная структура blocks/properties.",
    category: ["project-management", "database", "wiki", "notes"],
    baseUrl: "https://api.notion.com/v1",
    auth: {
      type: "bearer",
      setup: "В n8n: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь Internal Integration Token (secret_...)."
    },
    defaultHeaders: {
      "Content-Type": "application/json",
      "Notion-Version": "2025-09-03"
    },
    endpoints: {
      create_page: {
        method: "POST",
        path: "/pages",
        description: "Создать страницу (запись в БД или subpage)",
        bodyExample: '{"parent":{"type":"data_source_id","data_source_id":"YOUR_DATA_SOURCE_ID"},"properties":{"Name":{"title":[{"text":{"content":"Новая задача"}}]},"Status":{"status":{"name":"Not started"}}}}',
        response: "id — ID страницы, url — URL в Notion",
        notes: [
          "ОБЯЗАТЕЛЬНЫЙ заголовок Notion-Version: 2025-09-03!",
          "parent: data_source_id (новый, с 2025-09-03) или page_id (для subpage)",
          "properties: структура зависит от типа свойства (title, rich_text, status, select и т.д.)",
          "title property: обёрнут в [{text:{content:'...'}}] (массив rich_text!)",
          "Интеграция должна быть подключена к странице/БД в Notion UI"
        ]
      },
      query_database: {
        method: "POST",
        path: "/data_sources/{data_source_id}/query",
        description: "Запрос к data source (бывший database query). POST с фильтрами.",
        bodyExample: '{"filter":{"property":"Status","status":{"equals":"Done"}},"sorts":[{"property":"Created","direction":"descending"}],"page_size":100}',
        response: "results[] — массив page объектов",
        notes: [
          "POST для запроса (не GET!)",
          "Новый endpoint с 2025-09-03: /data_sources/{id}/query (вместо /databases/{id}/query)",
          "filter: вложенная структура зависит от типа свойства",
          "page_size: до 100. Пагинация через start_cursor"
        ]
      },
      search: {
        method: "POST",
        path: "/search",
        description: "Полнотекстовый поиск по всем подключённым страницам и БД",
        bodyExample: '{"query":"meeting notes","filter":{"value":"page","property":"object"},"page_size":10}',
        response: "results[] — массив page/database объектов",
        notes: [
          "POST для поиска!",
          "filter.value: 'page' или 'data_source'",
          "Ищет только в страницах/БД подключённых к интеграции"
        ]
      },
      append_blocks: {
        method: "PATCH",
        path: "/blocks/{block_id}/children",
        description: "Добавить контент (блоки) к странице. PATCH, не POST!",
        bodyExample: '{"children":[{"object":"block","type":"paragraph","paragraph":{"rich_text":[{"type":"text","text":{"content":"Hello World!"}}]}}]}',
        response: "results[] — массив созданных block объектов",
        notes: [
          "МЕТОД PATCH (не POST!)",
          "block_id = page_id для добавления в страницу",
          "Типы блоков: paragraph, heading_1/2/3, bulleted_list_item, to_do, toggle, code и др.",
          "Контент всегда в rich_text массиве"
        ]
      }
    },
    n8nNotes: [
      "ОБЯЗАТЕЛЬНО: заголовок Notion-Version: 2025-09-03",
      "Интеграция должна быть подключена к БД/странице в Notion UI (Connections → Add)",
      "Все свойства обёрнуты в типовые структуры (title, rich_text, status и т.д.)",
      "append_blocks: PATCH метод (не POST!)",
      "n8n имеет встроенную Notion ноду (проще для базовых операций)"
    ],
    rateLimits: "3 req/sec per integration.",
    docsUrl: "https://developers.notion.com/reference"
  },

  {
    name: "Jira",
    description: "Atlassian Jira. Basic Auth (email:API token). Domain-specific URL.",
    category: ["project-management", "issue-tracking", "agile"],
    baseUrl: "https://{domain}.atlassian.net/rest/api/3",
    auth: {
      type: "basic",
      setup: "В n8n: HTTP Basic Auth. Username = email, Password = API Token (из id.atlassian.com/manage-profile/security/api-tokens)."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_issue: {
        method: "POST",
        path: "/issue",
        description: "Создать issue (задачу, баг, story и т.д.)",
        bodyExample: '{"fields":{"project":{"key":"PROJ"},"summary":"Bug: login broken","description":{"type":"doc","version":1,"content":[{"type":"paragraph","content":[{"type":"text","text":"Login page returns 500"}]}]},"issuetype":{"name":"Bug"},"priority":{"name":"High"}}}',
        response: "id — issue ID (число), key — 'PROJ-123', self — URL",
        notes: [
          "description: Atlassian Document Format (ADF), НЕ plain text!",
          "ADF = JSON документ с type:'doc', version:1, content:[...]",
          "project.key: код проекта (PROJ, DEV и т.д.)",
          "issuetype.name: Bug, Task, Story, Epic, Sub-task"
        ]
      },
      search_issues: {
        method: "POST",
        path: "/search",
        description: "Поиск issues через JQL (Jira Query Language)",
        bodyExample: '{"jql":"project = PROJ AND status = Open ORDER BY created DESC","maxResults":50,"fields":["summary","status","assignee","priority"]}',
        response: "issues[] — массив issue объектов",
        notes: [
          "POST для поиска (хотя GET тоже работает)",
          "JQL: мощный язык запросов (project=X AND status=Open)",
          "fields: явно указать какие поля вернуть (экономит трафик)"
        ]
      },
      transition_issue: {
        method: "POST",
        path: "/issue/{issueIdOrKey}/transitions",
        description: "Изменить статус issue (перевести по workflow)",
        bodyExample: '{"transition":{"id":"31"}}',
        response: "Пустое тело при успехе (204)",
        notes: [
          "transition.id: получи через GET /issue/{key}/transitions",
          "ПУСТОЕ ТЕЛО при успехе (204)",
          "Нельзя просто установить status — нужно знать transition ID!"
        ]
      }
    },
    n8nNotes: [
      "Basic Auth: email + API Token (НЕ пароль!)",
      "Domain в URL: {yourdomain}.atlassian.net",
      "Description: ADF формат (сложная JSON структура), НЕ plain text",
      "Смена статуса: через transitions (не прямое обновление status!)",
      "n8n имеет встроенную Jira ноду"
    ],
    rateLimits: "Зависит от плана. Standard: ~100 req/10sec.",
    docsUrl: "https://developer.atlassian.com/cloud/jira/platform/rest/v3/"
  },

  {
    name: "Trello",
    description: "Kanban board. API key + token В QUERY параметрах (не в заголовках!).",
    category: ["project-management", "kanban"],
    baseUrl: "https://api.trello.com/1",
    auth: {
      type: "query",
      setup: "API key и token В QUERY: ?key=YOUR_KEY&token=YOUR_TOKEN. НЕТ заголовков auth!"
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_card: {
        method: "POST",
        path: "/cards",
        description: "Создать карточку",
        bodyExample: '{"idList":"YOUR_LIST_ID","name":"New Task","desc":"Description here","pos":"bottom"}',
        response: "id — card ID, shortUrl — короткий URL",
        notes: [
          "idList ОБЯЗАТЕЛЕН (ID списка/колонки)",
          "URL: /cards?key=YOUR_KEY&token=YOUR_TOKEN",
          "pos: 'top', 'bottom', или число"
        ]
      },
      get_board_lists: {
        method: "GET",
        path: "/boards/{boardId}/lists",
        description: "Список колонок (lists) на доске",
        response: "Массив list объектов с id и name",
        notes: ["Получи board ID из URL доски в Trello"]
      },
      update_card: {
        method: "PUT",
        path: "/cards/{cardId}",
        description: "Обновить карточку (перенести в другую колонку, изменить текст и т.д.)",
        bodyExample: '{"idList":"NEW_LIST_ID","name":"Updated Name"}',
        response: "Обновлённый card объект",
        notes: ["Для перемещения: просто смени idList"]
      }
    },
    n8nNotes: [
      "Auth В QUERY: ?key=...&token=... (НЕ в заголовках!)",
      "Power-Up API Key: trello.com/power-ups/admin",
      "Token: авторизуй через https://trello.com/1/authorize?key=...&scope=read,write&response_type=token",
      "n8n имеет встроенную Trello ноду"
    ],
    rateLimits: "300 req/10sec per token, 100 req/10sec per API key.",
    docsUrl: "https://developer.atlassian.com/cloud/trello/rest/"
  },

  {
    name: "Asana",
    description: "Work management. Bearer token. Данные обёрнуты в data объект.",
    category: ["project-management", "task-management"],
    baseUrl: "https://app.asana.com/api/1.0",
    auth: {
      type: "bearer",
      setup: "В n8n: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь Asana Personal Access Token."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_task: {
        method: "POST",
        path: "/tasks",
        description: "Создать задачу",
        bodyExample: '{"data":{"name":"New Task","notes":"Task description","projects":["PROJECT_GID"],"assignee":"me","due_on":"2026-03-15"}}',
        response: "data.gid — ID задачи, data.name",
        notes: [
          "Body обёрнут в data: {...}",
          "Ответ тоже обёрнут в data: {...}",
          "projects: массив GID проектов",
          "assignee: 'me', email, или user GID",
          "due_on: YYYY-MM-DD формат"
        ]
      },
      search_tasks: {
        method: "GET",
        path: "/workspaces/{workspace_gid}/tasks/search",
        description: "Поиск задач в workspace",
        response: "data[] — массив task объектов",
        notes: [
          "Query params: text=search_text, assignee.any=USER_GID, completed=false",
          "opt_fields: явно указать поля (name,assignee,due_on,completed)"
        ]
      }
    },
    n8nNotes: [
      "Body и ответ обёрнуты в data: {...}",
      "opt_fields query param: указать какие поля вернуть",
      "GID: все ID в Asana — это GID (строка-число)",
      "n8n имеет встроенную Asana ноду"
    ],
    rateLimits: "1500 req/min.",
    docsUrl: "https://developers.asana.com/reference"
  },

  {
    name: "ClickUp",
    description: "Project management. Bearer token. Иерархия: Workspace → Space → Folder → List → Task.",
    category: ["project-management", "task-management"],
    baseUrl: "https://api.clickup.com/api/v2",
    auth: {
      type: "bearer",
      setup: "В n8n: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь ClickUp API Token."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_task: {
        method: "POST",
        path: "/list/{list_id}/task",
        description: "Создать задачу в списке",
        bodyExample: '{"name":"New Task","description":"Task description","assignees":[USER_ID],"status":"to do","priority":3,"due_date":1741024800000,"tags":["urgent"]}',
        response: "id — task ID (строка), url — URL в ClickUp",
        notes: [
          "list_id в URL пути (не в body!)",
          "due_date: UNIX timestamp в МИЛЛИСЕКУНДАХ (не секундах!)",
          "priority: 1 (urgent) - 4 (low), null = no priority",
          "status: имя статуса (зависит от списка)"
        ]
      },
      get_tasks: {
        method: "GET",
        path: "/list/{list_id}/task",
        description: "Получить задачи из списка",
        response: "tasks[] — массив задач",
        notes: [
          "Query params: statuses[]=to do&assignees[]=USER_ID",
          "page: пагинация (0-based)"
        ]
      },
      update_task: {
        method: "PUT",
        path: "/task/{task_id}",
        description: "Обновить задачу",
        bodyExample: '{"status":"complete","priority":1}',
        response: "Обновлённый task объект",
        notes: ["Частичное обновление: передай только изменяемые поля"]
      }
    },
    n8nNotes: [
      "due_date: UNIX timestamp в МИЛЛИСЕКУНДАХ! (Date.now() или * 1000)",
      "Иерархия: Team → Space → Folder → List → Task",
      "status: зависит от конкретного списка (не глобальный)",
      "n8n имеет встроенную ClickUp ноду"
    ],
    rateLimits: "100 req/min per token.",
    docsUrl: "https://clickup.com/api/"
  },

  {
    name: "Linear",
    description: "Issue tracking для dev teams. GRAPHQL ТОЛЬКО! Один POST endpoint.",
    category: ["project-management", "issue-tracking", "dev-tools"],
    baseUrl: "https://api.linear.app",
    auth: {
      type: "bearer",
      setup: "В n8n: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь Linear API Key."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      graphql: {
        method: "POST",
        path: "/graphql",
        description: "ВСЕ операции через GraphQL. Один endpoint.",
        bodyExample: '{"query":"mutation { issueCreate(input: { title: \\\"New Bug\\\", teamId: \\\"TEAM_ID\\\", description: \\\"Bug description\\\" }) { success issue { id identifier title url } } }"}',
        response: "data — результат GraphQL запроса",
        notes: [
          "GRAPHQL ONLY! Нет REST API!",
          "Query для чтения, mutation для создания/обновления",
          "teamId ОБЯЗАТЕЛЕН при создании issue",
          "identifier: 'TEAM-123' — читаемый ID issue",
          "Поддерживает subscriptions (webhooks)"
        ]
      },
      query_issues: {
        method: "POST",
        path: "/graphql",
        description: "Получить список issues",
        bodyExample: '{"query":"query { issues(filter: { state: { name: { eq: \\\"In Progress\\\" } } }) { nodes { id identifier title state { name } assignee { name } } } }"}',
        response: "data.issues.nodes[] — массив issue объектов",
        notes: [
          "filter: вложенная структура для фильтрации",
          "nodes: массив результатов (GraphQL pagination)",
          "Тот же /graphql endpoint"
        ]
      }
    },
    n8nNotes: [
      "GRAPHQL ONLY! POST на /graphql с {\"query\": \"...\"}",
      "Нет REST API вообще — только GraphQL",
      "teamId обязателен для создания issues",
      "Linear имеет отличный GraphQL playground: linear.app/graphql",
      "n8n имеет встроенную Linear ноду (не нужен GraphQL вручную)"
    ],
    rateLimits: "1500 req/hour. Complexity-based.",
    docsUrl: "https://developers.linear.app/docs/graphql/working-with-the-graphql-api"
  },

  {
    name: "Basecamp",
    description: "Project management от 37signals. OAuth2 или special auth. Account ID в URL.",
    category: ["project-management", "team-collaboration"],
    baseUrl: "https://3.basecampapi.com/{account_id}",
    auth: {
      type: "oauth2",
      setup: "OAuth2 обязателен. В n8n: используй OAuth2 credentials. Или Personal Access Token через launchpad.37signals.com."
    },
    defaultHeaders: {
      "Content-Type": "application/json",
      "User-Agent": "YourApp (you@example.com)"
    },
    endpoints: {
      create_todo: {
        method: "POST",
        path: "/buckets/{project_id}/todolists/{todolist_id}/todos.json",
        description: "Создать todo задачу",
        bodyExample: '{"content":"New task","description":"<div>Task details</div>","assignee_ids":[USER_ID],"due_on":"2026-03-15"}',
        response: "id, title, status",
        notes: [
          "account_id В URL: 3.basecampapi.com/{account_id}/...",
          "ОБЯЗАТЕЛЬНЫЙ заголовок User-Agent! Без него 403!",
          "project_id = bucket_id",
          "description: HTML формат",
          ".json суффикс в URL путях!"
        ]
      },
      create_message: {
        method: "POST",
        path: "/buckets/{project_id}/message_boards/{board_id}/messages.json",
        description: "Создать сообщение на message board",
        bodyExample: '{"subject":"Meeting Notes","content":"<div>Notes here</div>","status":"active"}',
        response: "id, subject",
        notes: ["content: HTML"]
      }
    },
    n8nNotes: [
      "ОБЯЗАТЕЛЬНЫЙ User-Agent заголовок! Формат: 'AppName (email)'",
      "Account ID в URL пути",
      ".json суффикс во всех URL путях!",
      "Description/content: HTML, не plain text"
    ],
    rateLimits: "50 req/10sec.",
    docsUrl: "https://github.com/basecamp/bc3-api"
  },

  {
    name: "Todoist",
    description: "Todo app API. Bearer token. Простейший task management API.",
    category: ["task-management", "todo"],
    baseUrl: "https://api.todoist.com/rest/v2",
    auth: {
      type: "bearer",
      setup: "В n8n: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь Todoist API Token."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_task: {
        method: "POST",
        path: "/tasks",
        description: "Создать задачу",
        bodyExample: '{"content":"Buy groceries","description":"Milk, eggs, bread","project_id":"PROJECT_ID","due_string":"tomorrow at 12:00","priority":4,"labels":["urgent"]}',
        response: "id — task ID, url — URL в Todoist",
        notes: [
          "due_string: natural language! ('tomorrow', 'every friday', 'Jan 15')",
          "due_date: YYYY-MM-DD (альтернатива due_string)",
          "priority: 1 (normal) - 4 (urgent). ВНИМАНИЕ: 4 = highest!",
          "labels: массив строк (имена лейблов)"
        ]
      },
      get_tasks: {
        method: "GET",
        path: "/tasks",
        description: "Получить список задач",
        response: "Массив task объектов",
        notes: [
          "filter: Todoist filter syntax ('today', 'overdue', '#ProjectName')",
          "project_id: фильтр по проекту"
        ]
      },
      close_task: {
        method: "POST",
        path: "/tasks/{task_id}/close",
        description: "Завершить задачу",
        response: "Пустое тело при успехе (204)",
        notes: ["ПУСТОЕ ТЕЛО при 204"]
      }
    },
    n8nNotes: [
      "due_string: natural language дата! ('tomorrow at 3pm', 'every monday')",
      "priority: 4 = HIGHEST (обратная логика!)",
      "close: POST /tasks/{id}/close (ПУСТОЕ ТЕЛО при успехе)",
      "n8n имеет встроенную Todoist ноду"
    ],
    rateLimits: "450 req/15min.",
    docsUrl: "https://developer.todoist.com/rest/v2/"
  },

  {
    name: "Coda",
    description: "Docs + tables API. Bearer token. Документы с таблицами и формулами.",
    category: ["project-management", "database", "docs"],
    baseUrl: "https://coda.io/apis/v1",
    auth: {
      type: "bearer",
      setup: "В n8n: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь Coda API Token."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      insert_rows: {
        method: "POST",
        path: "/docs/{docId}/tables/{tableId}/rows",
        description: "Вставить строки в таблицу",
        bodyExample: '{"rows":[{"cells":[{"column":"c-abc123","value":"Task 1"},{"column":"c-def456","value":"In Progress"}]}],"keyColumns":["c-abc123"]}',
        response: "requestId — ID запроса",
        notes: [
          "cells: массив с column ID и value",
          "column: ID колонки (c-...), не имя!",
          "keyColumns: для upsert (обновить если существует)",
          "Batch: можно вставить несколько rows за раз"
        ]
      },
      list_rows: {
        method: "GET",
        path: "/docs/{docId}/tables/{tableId}/rows",
        description: "Получить строки таблицы",
        response: "items[] — массив row объектов с values",
        notes: [
          "query: текстовый поиск",
          "useColumnNames: true — имена колонок вместо ID в ответе"
        ]
      }
    },
    n8nNotes: [
      "Стандартный Bearer auth",
      "Column ID (c-...) нужен для вставки — получи через GET /docs/{id}/tables/{id}/columns",
      "useColumnNames=true — удобнее для чтения"
    ],
    rateLimits: "Зависит от плана. Обычно 10-20 req/sec.",
    docsUrl: "https://coda.io/developers/apis/v1"
  },

  {
    name: "Miro",
    description: "Whiteboard API. Bearer OAuth2 token. Работа с досками и виджетами.",
    category: ["whiteboard", "collaboration", "design"],
    baseUrl: "https://api.miro.com/v2",
    auth: {
      type: "bearer",
      setup: "В n8n: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь Miro Access Token."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_sticky_note: {
        method: "POST",
        path: "/boards/{board_id}/sticky_notes",
        description: "Создать стикер на доске",
        bodyExample: '{"data":{"content":"Important note!","shape":"square"},"style":{"fillColor":"yellow"},"position":{"x":0,"y":0}}',
        response: "id — widget ID, type: 'sticky_note'",
        notes: [
          "board_id в URL пути",
          "data.content: текст стикера",
          "position: координаты на доске (x, y)"
        ]
      },
      create_card: {
        method: "POST",
        path: "/boards/{board_id}/cards",
        description: "Создать карточку на доске",
        bodyExample: '{"data":{"title":"Task Card","description":"Details here"},"position":{"x":100,"y":200}}',
        response: "id, type: 'card'",
        notes: ["Cards: для задач и заметок с заголовком"]
      }
    },
    n8nNotes: [
      "Bearer token через OAuth2 или REST API token в Miro Dashboard",
      "board_id: из URL доски в Miro",
      "Разные endpoints для разных типов виджетов (sticky_notes, cards, shapes, text и т.д.)"
    ],
    rateLimits: "Зависит от плана. Rate limit headers в ответе.",
    docsUrl: "https://developers.miro.com/reference"
  },

  {
    name: "Confluence",
    description: "Atlassian wiki/docs. Basic Auth (как Jira). Контент в storage format (HTML-like).",
    category: ["wiki", "documentation", "knowledge-base"],
    baseUrl: "https://{domain}.atlassian.net/wiki/api/v2",
    auth: {
      type: "basic",
      setup: "В n8n: HTTP Basic Auth. Username = email, Password = API Token (как Jira)."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_page: {
        method: "POST",
        path: "/pages",
        description: "Создать страницу",
        bodyExample: '{"spaceId":"SPACE_ID","status":"current","title":"New Page","body":{"representation":"storage","value":"<p>Page content here</p>"}}',
        response: "id — page ID, title, _links.webui",
        notes: [
          "body.representation: 'storage' (XHTML-like формат!)",
          "body.value: контент в Confluence storage format (HTML с макросами)",
          "spaceId: ID пространства (получи через GET /spaces)",
          "Для создания под parent: parentId поле"
        ]
      },
      search: {
        method: "GET",
        path: "/search",
        description: "Поиск контента через CQL (Confluence Query Language)",
        response: "results[] — массив результатов",
        notes: [
          "cql: 'type=page AND space=SPACEKEY AND text~\"search term\"'",
          "CQL = Confluence Query Language (похож на JQL)"
        ]
      }
    },
    n8nNotes: [
      "Basic Auth как Jira: email + API Token",
      "Контент в storage format (XHTML): <p>, <h1>, <ac:structured-macro> и т.д.",
      "v2 API (не v1!) — разные структуры ответа",
      "n8n имеет встроенную Confluence ноду (через Jira Server)"
    ],
    rateLimits: "Как Jira — зависит от плана.",
    docsUrl: "https://developer.atlassian.com/cloud/confluence/rest/v2/"
  },

  {
    name: "Fibery",
    description: "Work management платформа. Свой command-based API (не REST, не GraphQL!).",
    category: ["project-management", "no-code", "work-management"],
    baseUrl: "https://{workspace}.fibery.io/api",
    auth: {
      type: "bearer",
      setup: "В n8n: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь Fibery API Token."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      command: {
        method: "POST",
        path: "/commands",
        description: "Единый endpoint для ВСЕХ операций. Body = массив команд.",
        bodyExample: '[{"command":"fibery.entity/query","args":{"query":{"q/from":"Project Management/Task","q/select":["fibery/id","Project Management/Name","workflow/state"],"q/limit":50}}}]',
        response: "Массив результатов (по одному на команду)",
        notes: [
          "УНИКАЛЬНЫЙ ФОРМАТ! Не REST, не GraphQL — command-based API!",
          "Body = МАССИВ команд (можно несколько за раз)",
          "command: 'fibery.entity/query', 'fibery.entity/create', 'fibery.entity/update'",
          "Type names: 'Project Management/Task' (Space/Type формат)",
          "Field names: 'Project Management/Name', 'fibery/id', 'workflow/state'",
          "q/from, q/select, q/where, q/limit — свой query DSL"
        ]
      }
    },
    n8nNotes: [
      "УНИКАЛЬНЫЙ API! Не REST и не GraphQL — command-based",
      "Body = массив команд, ответ = массив результатов",
      "Type/field names через / разделитель: 'Space/Type', 'Space/Field'",
      "Workspace в URL: {workspace}.fibery.io",
      "Документация: fibery.io/api-docs"
    ],
    rateLimits: "Не документировано точно.",
    docsUrl: "https://the.fibery.io/@public/User_Guide/Guide/API-140"
  },

  {
    name: "Google Sheets",
    description: "Spreadsheet API. OAuth2. valueInputOption ОБЯЗАТЕЛЕН при записи!",
    category: ["google", "spreadsheet", "database"],
    baseUrl: "https://sheets.googleapis.com/v4",
    auth: {
      type: "oauth2",
      setup: "OAuth2 через Google Cloud Console. В n8n: используй встроенную Google Sheets ноду (обрабатывает OAuth2). Для HTTP Request: OAuth2 credentials."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      get_values: {
        method: "GET",
        path: "/spreadsheets/{spreadsheetId}/values/{range}",
        description: "Прочитать данные из диапазона",
        response: "values[][] — двумерный массив (строки × колонки)",
        notes: [
          "range: A1 нотация: 'Sheet1!A1:D10', 'Sheet1!A:D', 'Sheet1'",
          "spreadsheetId: из URL таблицы (docs.google.com/spreadsheets/d/{ID}/...)",
          "Ответ: values = [[row1col1, row1col2], [row2col1, row2col2]]"
        ]
      },
      append_values: {
        method: "POST",
        path: "/spreadsheets/{spreadsheetId}/values/{range}:append",
        description: "Добавить строки в конец таблицы. valueInputOption ОБЯЗАТЕЛЕН!",
        bodyExample: '{"range":"Sheet1!A1","majorDimension":"ROWS","values":[["John","Doe","john@example.com"],["Jane","Smith","jane@example.com"]]}',
        response: "updates.updatedRows — кол-во добавленных строк",
        notes: [
          "ОБЯЗАТЕЛЬНЫЙ query param: ?valueInputOption=USER_ENTERED",
          "USER_ENTERED: формулы и форматирование обрабатываются",
          "RAW: данные как есть (без обработки формул)",
          "БЕЗ valueInputOption = 400 ошибка!",
          "range: указывает где искать таблицу (данные добавятся после последней строки)",
          "values: двумерный массив [[row1], [row2]]"
        ]
      },
      update_values: {
        method: "PUT",
        path: "/spreadsheets/{spreadsheetId}/values/{range}",
        description: "Обновить (перезаписать) данные в диапазоне",
        bodyExample: '{"range":"Sheet1!A1:C2","majorDimension":"ROWS","values":[["Name","Email","Phone"],["John","john@test.com","+79991234567"]]}',
        response: "updatedRows, updatedColumns, updatedCells",
        notes: [
          "ОБЯЗАТЕЛЬНЫЙ query param: ?valueInputOption=USER_ENTERED",
          "PUT метод! Перезаписывает указанный диапазон"
        ]
      },
      batch_update: {
        method: "POST",
        path: "/spreadsheets/{spreadsheetId}:batchUpdate",
        description: "Batch операции: форматирование, добавление листов, слияние ячеек и т.д.",
        bodyExample: '{"requests":[{"addSheet":{"properties":{"title":"NewSheet"}}},{"updateCells":{"range":{"sheetId":0,"startRowIndex":0,"endRowIndex":1,"startColumnIndex":0,"endColumnIndex":3},"fields":"userEnteredFormat.bold","rows":[{"values":[{"userEnteredFormat":{"textFormat":{"bold":true}}}]}]}}]}',
        response: "replies[] — массив ответов на каждый request",
        notes: [
          "Для операций КРОМЕ чтения/записи значений: форматирование, листы, charts",
          "requests: массив операций (выполняются атомарно)"
        ]
      }
    },
    n8nNotes: [
      "РЕКОМЕНДАЦИЯ: n8n встроенная Google Sheets нода (обрабатывает OAuth2 и valueInputOption)",
      "Для HTTP Request: ОБЯЗАТЕЛЬНО ?valueInputOption=USER_ENTERED в URL при записи!",
      "spreadsheetId: из URL таблицы между /d/ и /edit",
      "values: ДВУМЕРНЫЙ массив [[строка1], [строка2]]",
      "range: A1 нотация (Sheet1!A1:D10)"
    ],
    rateLimits: "300 req/min per project, 60 req/min per user.",
    docsUrl: "https://developers.google.com/workspace/sheets/api/reference/rest"
  },

  {
    name: "Google Drive",
    description: "File storage API. OAuth2. Upload = multipart. Метаданные отдельно от файла.",
    category: ["google", "storage", "files"],
    baseUrl: "https://www.googleapis.com/drive/v3",
    auth: {
      type: "oauth2",
      setup: "OAuth2 через Google Cloud Console. В n8n: используй встроенную Google Drive ноду."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      list_files: {
        method: "GET",
        path: "/files",
        description: "Список файлов",
        response: "files[] — массив файлов с id, name, mimeType",
        notes: [
          "q: поисковый запрос ('name contains \"report\"', 'mimeType=\"application/pdf\"')",
          "fields: 'files(id,name,mimeType,webViewLink)' — указать какие поля вернуть!",
          "БЕЗ fields вернёт только id и name!",
          "orderBy: 'modifiedTime desc'"
        ]
      },
      upload_file: {
        method: "POST",
        path: "/upload/drive/v3/files",
        description: "Загрузить файл. MULTIPART! Другой base URL (/upload/)!",
        contentType: "multipart/related",
        response: "id — file ID, name, mimeType",
        notes: [
          "ДРУГОЙ base URL: www.googleapis.com/upload/drive/v3/files",
          "Query param: ?uploadType=multipart",
          "MULTIPART: Part 1 = JSON metadata, Part 2 = file content",
          "Для простого upload: ?uploadType=media + raw file в body",
          "Для больших файлов: ?uploadType=resumable"
        ]
      },
      download_file: {
        method: "GET",
        path: "/files/{fileId}",
        description: "Скачать файл",
        response: "Бинарный контент файла",
        notes: [
          "Query param: ?alt=media — ОБЯЗАТЕЛЕН для скачивания!",
          "БЕЗ ?alt=media вернёт МЕТАДАННЫЕ файла (JSON), не содержимое!",
          "Ответ бинарный. В n8n: Response Format = File",
          "Для Google Docs/Sheets: используй /files/{id}/export с ?mimeType="
        ]
      },
      export_google_doc: {
        method: "GET",
        path: "/files/{fileId}/export",
        description: "Экспортировать Google Doc/Sheet/Slide в другой формат",
        response: "Бинарный контент",
        notes: [
          "Query param: ?mimeType=application/pdf (или text/plain, text/csv и т.д.)",
          "ТОЛЬКО для Google-native файлов (Docs, Sheets, Slides)",
          "Ответ бинарный. В n8n: Response Format = File"
        ]
      }
    },
    n8nNotes: [
      "РЕКОМЕНДАЦИЯ: n8n встроенная Google Drive нода",
      "Скачивание: ?alt=media обязателен (иначе получишь JSON метаданные!)",
      "Upload: другой URL (/upload/drive/v3/files) + multipart",
      "fields param: укажи какие поля вернуть (по умолчанию — минимум)",
      "Google Docs export: /files/{id}/export?mimeType=application/pdf"
    ],
    rateLimits: "20,000 req/100sec per project.",
    docsUrl: "https://developers.google.com/drive/api/reference/rest/v3"
  },

  {
    name: "Google Docs",
    description: "Document API. OAuth2. Сложный формат с структурными элементами.",
    category: ["google", "docs", "documents"],
    baseUrl: "https://docs.googleapis.com/v1",
    auth: {
      type: "oauth2",
      setup: "OAuth2 через Google Cloud Console. В n8n: используй Google Drive/Docs ноду или HTTP Request с OAuth2."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      get_document: {
        method: "GET",
        path: "/documents/{documentId}",
        description: "Получить документ (структура, не plain text!)",
        response: "body.content[] — массив структурных элементов",
        notes: [
          "Ответ: сложная вложенная структура (paragraphs, tables, lists и т.д.)",
          "Для plain text: нужно парсить body.content[].paragraph.elements[].textRun.content",
          "documentId: из URL документа"
        ]
      },
      batch_update: {
        method: "POST",
        path: "/documents/{documentId}:batchUpdate",
        description: "Обновить документ: вставить текст, удалить, форматировать",
        bodyExample: '{"requests":[{"insertText":{"location":{"index":1},"text":"Hello World!\\n"}},{"updateTextStyle":{"range":{"startIndex":1,"endIndex":12},"textStyle":{"bold":true},"fields":"bold"}}]}',
        response: "replies[] — массив ответов",
        notes: [
          "requests: массив операций (insertText, deleteContentRange, updateTextStyle)",
          "location.index: позиция символа в документе (1-based!)",
          "Операции применяются последовательно — индексы сдвигаются!",
          "СОВЕТ: вставляй текст с КОНЦА документа (чтобы индексы не сдвигались)"
        ]
      },
      create_document: {
        method: "POST",
        path: "/documents",
        description: "Создать новый документ",
        bodyExample: '{"title":"My New Document"}',
        response: "documentId — ID нового документа",
        notes: ["Создаёт пустой документ. Контент добавляй через batchUpdate."]
      }
    },
    n8nNotes: [
      "Документ = сложная вложенная JSON структура, не plain text",
      "Обновление: через batchUpdate с requests[] массивом",
      "Index-based: позиция символа, индексы сдвигаются при изменениях!",
      "Для простой записи: проще создать Google Doc через Drive API + export"
    ],
    rateLimits: "300 req/min per project.",
    docsUrl: "https://developers.google.com/docs/api/reference/rest"
  },

  {
    name: "Google Calendar",
    description: "Calendar API. OAuth2. RFC 3339 datetime формат.",
    category: ["google", "calendar", "scheduling"],
    baseUrl: "https://www.googleapis.com/calendar/v3",
    auth: {
      type: "oauth2",
      setup: "OAuth2 через Google Cloud Console. В n8n: используй встроенную Google Calendar ноду."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_event: {
        method: "POST",
        path: "/calendars/{calendarId}/events",
        description: "Создать событие в календаре",
        bodyExample: '{"summary":"Meeting","description":"Team sync","start":{"dateTime":"2026-03-15T10:00:00+03:00","timeZone":"Europe/Warsaw"},"end":{"dateTime":"2026-03-15T11:00:00+03:00","timeZone":"Europe/Warsaw"},"attendees":[{"email":"user@example.com"}]}',
        response: "id — event ID, htmlLink — URL события",
        notes: [
          "calendarId: 'primary' для основного календаря или email",
          "dateTime: RFC 3339 формат с timezone offset!",
          "Для целодневных событий: date вместо dateTime ('2026-03-15')",
          "timeZone: IANA timezone (Europe/Warsaw, America/New_York)"
        ]
      },
      list_events: {
        method: "GET",
        path: "/calendars/{calendarId}/events",
        description: "Список событий",
        response: "items[] — массив event объектов",
        notes: [
          "timeMin, timeMax: фильтр по времени (RFC 3339)",
          "singleEvents=true: раскрыть повторяющиеся события",
          "orderBy=startTime: сортировка (требует singleEvents=true)"
        ]
      }
    },
    n8nNotes: [
      "РЕКОМЕНДАЦИЯ: n8n встроенная Google Calendar нода",
      "calendarId='primary' для основного календаря",
      "datetime: RFC 3339 с timezone! (2026-03-15T10:00:00+03:00)",
      "singleEvents=true для раскрытия повторяющихся событий"
    ],
    rateLimits: "1,000,000 req/day per project.",
    docsUrl: "https://developers.google.com/calendar/api/v3/reference"
  },

  {
    name: "YouTube Data API",
    description: "YouTube API v3. API key для публичных данных, OAuth2 для действий от имени пользователя.",
    category: ["google", "video", "youtube"],
    baseUrl: "https://www.googleapis.com/youtube/v3",
    auth: {
      type: "query",
      setup: "Для чтения публичных данных: API key в query ?key=YOUR_API_KEY. Для записи (upload, comment): OAuth2."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      search: {
        method: "GET",
        path: "/search",
        description: "Поиск видео, каналов, плейлистов",
        response: "items[] — массив результатов с id.videoId",
        notes: [
          "Query params: ?part=snippet&q=search_text&type=video&maxResults=10&key=YOUR_KEY",
          "part=snippet ОБЯЗАТЕЛЕН!",
          "type: video, channel, playlist",
          "Каждый запрос тратит quota (100 units!)",
          "videoId: items[].id.videoId"
        ]
      },
      get_video_details: {
        method: "GET",
        path: "/videos",
        description: "Детали видео (статистика, описание и т.д.)",
        response: "items[0].snippet — метаданные, items[0].statistics — просмотры/лайки",
        notes: [
          "Query: ?part=snippet,statistics&id=VIDEO_ID&key=YOUR_KEY",
          "part: snippet, statistics, contentDetails (можно несколько через запятую)",
          "Можно передать несколько id через запятую: id=ID1,ID2,ID3"
        ]
      },
      list_channel_videos: {
        method: "GET",
        path: "/search",
        description: "Получить видео канала",
        response: "items[] — массив видео",
        notes: [
          "Query: ?part=snippet&channelId=CHANNEL_ID&type=video&order=date&key=YOUR_KEY",
          "order: date, viewCount, rating, relevance"
        ]
      }
    },
    n8nNotes: [
      "API key для чтения: ?key=YOUR_KEY в URL",
      "part= ОБЯЗАТЕЛЕН в каждом запросе! (snippet, statistics, contentDetails)",
      "Search стоит 100 quota units — лимит 10,000/day!",
      "Для upload/comment: нужен OAuth2",
      "n8n имеет встроенную YouTube ноду"
    ],
    rateLimits: "10,000 quota units/day. Search = 100 units, Videos.list = 1 unit.",
    docsUrl: "https://developers.google.com/youtube/v3/docs"
  },

  {
    name: "Google Maps / Places API",
    description: "Geocoding, Places, Directions. API key в query. Нет OAuth.",
    category: ["google", "maps", "geocoding", "places"],
    baseUrl: "https://maps.googleapis.com/maps/api",
    auth: {
      type: "query",
      setup: "API key в query: ?key=YOUR_API_KEY. Включи нужные APIs в Google Cloud Console."
    },
    defaultHeaders: {},
    endpoints: {
      geocode: {
        method: "GET",
        path: "/geocode/json",
        description: "Адрес → координаты (или наоборот)",
        response: "results[0].geometry.location — {lat, lng}",
        notes: [
          "?address=1600+Amphitheatre+Parkway&key=YOUR_KEY",
          "Обратное: ?latlng=40.714,-73.998&key=YOUR_KEY",
          "status: 'OK', 'ZERO_RESULTS', 'OVER_QUERY_LIMIT'"
        ]
      },
      places_nearby: {
        method: "GET",
        path: "/place/nearbysearch/json",
        description: "Поиск мест поблизости",
        response: "results[] — массив мест с name, geometry, place_id",
        notes: [
          "?location=lat,lng&radius=1000&type=restaurant&key=YOUR_KEY",
          "radius: в метрах (макс 50,000)",
          "type: restaurant, hospital, gas_station, pharmacy и т.д."
        ]
      },
      place_details: {
        method: "GET",
        path: "/place/details/json",
        description: "Детали места по place_id",
        response: "result — объект с name, formatted_address, rating, reviews",
        notes: [
          "?place_id=PLACE_ID&fields=name,rating,formatted_phone_number&key=YOUR_KEY",
          "fields: указать какие поля вернуть (влияет на стоимость!)"
        ]
      },
      directions: {
        method: "GET",
        path: "/directions/json",
        description: "Маршрут между точками",
        response: "routes[0].legs[0] — distance, duration, steps[]",
        notes: [
          "?origin=Chicago&destination=Los+Angeles&mode=driving&key=YOUR_KEY",
          "mode: driving, walking, bicycling, transit"
        ]
      }
    },
    n8nNotes: [
      "API key в query: ?key=YOUR_KEY (все endpoints)",
      "Нет OAuth — только API key!",
      "Включи конкретные API в Google Cloud Console (Geocoding, Places, Directions)",
      "Places API (New) имеет другой формат — проверь какой включён",
      "fields param в Place Details влияет на стоимость запроса!"
    ],
    rateLimits: "Зависит от API и billing. QPS лимиты.",
    docsUrl: "https://developers.google.com/maps/documentation"
  },

  {
    name: "Google Forms",
    description: "Forms API. OAuth2. Только чтение форм и ответов (создание ограничено).",
    category: ["google", "forms", "surveys"],
    baseUrl: "https://forms.googleapis.com/v1",
    auth: {
      type: "oauth2",
      setup: "OAuth2 через Google Cloud Console. Scope: https://www.googleapis.com/auth/forms.body.readonly (чтение) или forms.body (запись)."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      get_form: {
        method: "GET",
        path: "/forms/{formId}",
        description: "Получить структуру формы (вопросы, настройки)",
        response: "items[] — массив вопросов с questionItem.question",
        notes: [
          "formId: из URL формы",
          "Возвращает структуру формы, НЕ ответы!"
        ]
      },
      list_responses: {
        method: "GET",
        path: "/forms/{formId}/responses",
        description: "Получить все ответы на форму",
        response: "responses[] — массив ответов с answers объектом",
        notes: [
          "answers: ключ = questionId, значение = textAnswers",
          "filter: ?filter=timestamp >= 2026-01-01T00:00:00Z"
        ]
      }
    },
    n8nNotes: [
      "Основной use case: чтение ответов из форм",
      "formId: из URL формы (docs.google.com/forms/d/{formId}/...)",
      "Создание форм через API ограничено",
      "Для триггера: используй Google Forms Trigger в n8n"
    ],
    rateLimits: "300 req/min per project.",
    docsUrl: "https://developers.google.com/forms/api/reference/rest"
  },

  {
    name: "Google Cloud Translation",
    description: "Перевод текста. API key в query (Basic) или OAuth2 (Advanced v3).",
    category: ["google", "translation", "nlp"],
    baseUrl: "https://translation.googleapis.com",
    auth: {
      type: "query",
      setup: "Для Basic (v2): API key в query ?key=YOUR_KEY. Для Advanced (v3): OAuth2 + project ID."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      translate_basic: {
        method: "POST",
        path: "/language/translate/v2",
        description: "Перевод текста (Basic API v2). Самый простой.",
        bodyExample: '{"q":"Hello, how are you?","target":"ru","source":"en"}',
        response: "data.translations[0].translatedText — переведённый текст",
        notes: [
          "URL с API key: /language/translate/v2?key=YOUR_KEY",
          "q: текст для перевода (строка или массив строк!)",
          "target: язык назначения (ISO 639-1: ru, de, fr, ja)",
          "source: опционален (auto-detect если не указан)",
          "q может быть массивом: [\"Hello\",\"World\"] — batch перевод!"
        ]
      },
      detect_language: {
        method: "POST",
        path: "/language/translate/v2/detect",
        description: "Определить язык текста",
        bodyExample: '{"q":"Bonjour le monde"}',
        response: "data.detections[0][0].language — код языка, confidence",
        notes: ["?key=YOUR_KEY в query"]
      },
      list_languages: {
        method: "GET",
        path: "/language/translate/v2/languages",
        description: "Список поддерживаемых языков",
        response: "data.languages[] — массив с language кодами",
        notes: ["?target=ru — вернёт имена языков на русском"]
      }
    },
    n8nNotes: [
      "Basic API (v2): API key в query — самый простой вариант",
      "q может быть массивом строк — batch перевод в одном запросе!",
      "source опционален — auto-detect работает хорошо",
      "Advanced (v3): /v3/projects/{projectId}:translateText — OAuth2, больше фичей",
      "n8n имеет встроенную Google Translate ноду"
    ],
    rateLimits: "Зависит от billing. Default: 6000 chars/100sec.",
    docsUrl: "https://cloud.google.com/translate/docs/reference/rest"
  },

  {
    name: "Twitter / X",
    description: "X (бывший Twitter) API v2. OAuth2 Bearer ИЛИ OAuth 1.0a для действий от имени пользователя.",
    category: ["social-media", "twitter", "microblogging"],
    baseUrl: "https://api.x.com/2",
    auth: {
      type: "bearer",
      setup: "Для чтения публичных данных: Bearer Token (App-only). Для постинга: OAuth 1.0a (User Context) или OAuth 2.0 PKCE."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_tweet: {
        method: "POST",
        path: "/tweets",
        description: "Опубликовать твит. Требует OAuth 1.0a или OAuth 2.0 User Context!",
        bodyExample: '{"text":"Hello World from API!"}',
        response: "data.id — tweet ID, data.text",
        notes: [
          "НЕ работает с App-only Bearer token! Нужен User Context (OAuth 1.0a или OAuth 2.0 PKCE)",
          "Для media: сначала upload через /1.1/media/upload.json, затем media.media_ids в tweet"
        ]
      },
      search_tweets: {
        method: "GET",
        path: "/tweets/search/recent",
        description: "Поиск твитов за последние 7 дней",
        response: "data[] — массив tweet объектов",
        notes: [
          "query: поисковый запрос (operators: from:, has:media, -is:retweet)",
          "tweet.fields: author_id,created_at,public_metrics",
          "max_results: 10-100",
          "App-only Bearer token достаточен для чтения"
        ]
      },
      get_user: {
        method: "GET",
        path: "/users/by/username/{username}",
        description: "Получить информацию о пользователе по username",
        response: "data.id, data.name, data.username",
        notes: ["user.fields: public_metrics,description,profile_image_url"]
      }
    },
    n8nNotes: [
      "ДВА типа auth: App-only (Bearer) для чтения, OAuth 1.0a для записи",
      "Постинг требует OAuth 1.0a — СЛОЖНАЯ настройка (4 ключа: consumer key/secret + access token/secret)",
      "Media upload: v1.1 endpoint (НЕ v2!): /1.1/media/upload.json (multipart)",
      "tweet.fields, user.fields, expansions — указывай явно (по умолчанию минимум полей)",
      "n8n имеет встроенную X (Twitter) ноду"
    ],
    rateLimits: "Free: 1,500 tweets/month read, 500 writes/month. Basic: 10K reads. Pro: 1M reads.",
    docsUrl: "https://developer.x.com/en/docs/x-api"
  },

  {
    name: "LinkedIn",
    description: "LinkedIn Marketing/Community API. OAuth2 обязателен. URN-based IDs.",
    category: ["social-media", "professional", "linkedin"],
    baseUrl: "https://api.linkedin.com",
    auth: {
      type: "oauth2",
      setup: "OAuth2 обязателен. LinkedIn Developer Portal → Create App → OAuth2 flow. Для постинга: Community Management API scope."
    },
    defaultHeaders: {
      "Content-Type": "application/json",
      "LinkedIn-Version": "202402"
    },
    endpoints: {
      create_post: {
        method: "POST",
        path: "/rest/posts",
        description: "Создать пост на LinkedIn",
        bodyExample: '{"author":"urn:li:person:YOUR_PERSON_ID","commentary":"Hello LinkedIn from API!","visibility":"PUBLIC","distribution":{"feedDistribution":"MAIN_FEED"},"lifecycleState":"PUBLISHED"}',
        response: "x-restli-id header — ID поста (URN)",
        notes: [
          "author: URN формат! urn:li:person:ID или urn:li:organization:ID",
          "visibility: PUBLIC или CONNECTIONS",
          "ID поста в HEADER x-restli-id (не в body!)",
          "LinkedIn-Version header ОБЯЗАТЕЛЕН",
          "lifecycleState: PUBLISHED обязателен"
        ]
      },
      get_profile: {
        method: "GET",
        path: "/rest/me",
        description: "Получить профиль текущего пользователя",
        response: "id — person URN, localizedFirstName, localizedLastName",
        notes: ["Для получения person ID (нужен как author при постинге)"]
      }
    },
    n8nNotes: [
      "OAuth2 ОБЯЗАТЕЛЕН — нет API key варианта",
      "LinkedIn-Version header обязателен (формат: YYYYMM, напр. 202402)",
      "URN-based IDs: urn:li:person:ID, urn:li:organization:ID",
      "ID созданного поста в HEADER ответа (x-restli-id), не в body!",
      "n8n имеет встроенную LinkedIn ноду"
    ],
    rateLimits: "100 req/day для Community Management, varies по endpoint.",
    docsUrl: "https://learn.microsoft.com/en-us/linkedin/marketing/"
  },

  {
    name: "Facebook (Meta Graph API)",
    description: "Facebook Graph API. OAuth2 Page/User token. Публикация, чтение, insights.",
    category: ["social-media", "facebook", "meta"],
    baseUrl: "https://graph.facebook.com/v21.0",
    auth: {
      type: "bearer",
      setup: "Page Access Token для действий от имени страницы. User Access Token для пользователя. Получи через Facebook Login flow или Graph API Explorer."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_post: {
        method: "POST",
        path: "/{page_id}/feed",
        description: "Создать пост на странице Facebook",
        bodyExample: '{"message":"Hello Facebook from API!","link":"https://example.com"}',
        response: "id — post ID (формат: pageId_postId)",
        notes: [
          "Требует Page Access Token с publish_pages permission",
          "message: текст поста",
          "link: URL для превью (опционален)",
          "Для фото: /{page_id}/photos с url или source (multipart)"
        ]
      },
      get_page_posts: {
        method: "GET",
        path: "/{page_id}/posts",
        description: "Получить посты страницы",
        response: "data[] — массив постов с id, message, created_time",
        notes: [
          "fields: message,created_time,permalink_url,shares",
          "Пагинация: paging.next URL"
        ]
      }
    },
    n8nNotes: [
      "Page Token vs User Token — разные permissions!",
      "Page Token: долгоживущий (через Page settings)",
      "User Token: истекает через 1-2 часа → конвертируй в long-lived",
      "fields param: указать какие поля вернуть",
      "n8n имеет встроенную Facebook Graph API ноду"
    ],
    rateLimits: "200 calls/hour per user token. 4800 calls/24hrs per app per page.",
    docsUrl: "https://developers.facebook.com/docs/graph-api"
  },

  {
    name: "Instagram (Meta Graph API)",
    description: "Instagram API через Meta Graph. OAuth2. Двухшаговая публикация: create container → publish.",
    category: ["social-media", "instagram", "meta"],
    baseUrl: "https://graph.facebook.com/v21.0",
    auth: {
      type: "bearer",
      setup: "Instagram Business/Creator Account + Page Access Token через Facebook. В n8n: Bearer auth."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_media_container: {
        method: "POST",
        path: "/{ig_user_id}/media",
        description: "ШАГ 1: Создать media container (НЕ публикует!)",
        bodyExample: '{"image_url":"https://example.com/photo.jpg","caption":"My photo! #hashtag","access_token":"YOUR_TOKEN"}',
        response: "id — container ID (для шага 2)",
        notes: [
          "ДВУХШАГОВАЯ ПУБЛИКАЦИЯ! Это только создание container!",
          "image_url: публично доступный URL изображения",
          "Для video: video_url + media_type=VIDEO",
          "Для carousel: media_type=CAROUSEL + children[]",
          "Container НЕ опубликован пока не вызовешь publish!"
        ]
      },
      publish_media: {
        method: "POST",
        path: "/{ig_user_id}/media_publish",
        description: "ШАГ 2: Опубликовать media container",
        bodyExample: '{"creation_id":"CONTAINER_ID","access_token":"YOUR_TOKEN"}',
        response: "id — media ID опубликованного поста",
        notes: [
          "creation_id = ID из шага 1",
          "Для видео: подожди пока container.status_code = 'FINISHED' (GET /{container_id}?fields=status_code)"
        ]
      },
      get_media: {
        method: "GET",
        path: "/{ig_user_id}/media",
        description: "Получить медиа пользователя",
        response: "data[] — массив media объектов",
        notes: ["fields: id,caption,media_type,media_url,timestamp,like_count"]
      }
    },
    n8nNotes: [
      "ДВУХШАГОВАЯ публикация: 1) POST /media → container_id, 2) POST /media_publish",
      "ig_user_id: Instagram Business Account ID (получи через /me/accounts → instagram_business_account)",
      "Только Business/Creator аккаунты (не личные!)",
      "image_url ДОЛЖЕН быть публично доступным URL",
      "Для видео: polling status_code до 'FINISHED' перед publish"
    ],
    rateLimits: "200 calls/hour. 25 API-published posts per 24h.",
    docsUrl: "https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/content-publishing"
  },

  {
    name: "TikTok",
    description: "TikTok Content API. OAuth2. Публикация видео через двухшаговый процесс.",
    category: ["social-media", "video", "tiktok"],
    baseUrl: "https://open.tiktokapis.com/v2",
    auth: {
      type: "oauth2",
      setup: "OAuth2 обязателен. TikTok for Developers → Create App → OAuth2. Требует Creator approval для публикации."
    },
    defaultHeaders: {
      "Content-Type": "application/json"
    },
    endpoints: {
      init_video_upload: {
        method: "POST",
        path: "/post/publish/inbox/video/init/",
        description: "ШАГ 1: Инициализировать upload видео",
        bodyExample: '{"post_info":{"title":"My Video","privacy_level":"SELF_ONLY","disable_duet":false,"disable_stitch":false,"disable_comment":false},"source_info":{"source":"FILE_UPLOAD","video_size":VIDEO_SIZE_IN_BYTES,"chunk_size":10000000}}',
        response: "data.publish_id — ID для tracking, data.upload_url — URL для загрузки",
        notes: [
          "ДВУХШАГОВАЯ загрузка: 1) init → upload_url, 2) PUT видео на upload_url",
          "privacy_level: SELF_ONLY, MUTUAL_FOLLOW_FRIENDS, FOLLOWER_OF_CREATOR, PUBLIC_TO_EVERYONE",
          "Требует scope: video.publish",
          "Auth: Bearer access_token в Authorization header"
        ]
      },
      query_creator_info: {
        method: "POST",
        path: "/post/publish/creator_info/query/",
        description: "Получить info о creator (лимиты, доступные features)",
        response: "data.creator_info — privacy_level_options, max_video_post_duration и т.д.",
        notes: ["Используй для проверки доступных опций перед публикацией"]
      }
    },
    n8nNotes: [
      "OAuth2 обязателен с approval для posting scope",
      "Публикация видео: POST init → PUT binary на upload_url → tracking через publish_id",
      "Нет простого 'create text post' — TikTok = видео платформа",
      "privacy_level ОБЯЗАТЕЛЕН в каждом запросе публикации",
      "Trailing slash в URL путях (напр. /init/ — не /init)"
    ],
    rateLimits: "Зависит от app tier.",
    docsUrl: "https://developers.tiktok.com/doc/content-posting-api-get-started"
  },

  {
    name: "Pinterest",
    description: "Pinterest API v5. OAuth2 Bearer token. Создание пинов.",
    category: ["social-media", "visual", "pinterest"],
    baseUrl: "https://api.pinterest.com/v5",
    auth: {
      type: "bearer",
      setup: "OAuth2 через Pinterest Developer Portal. В n8n: Bearer auth с access_token."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_pin: {
        method: "POST",
        path: "/pins",
        description: "Создать пин",
        bodyExample: '{"board_id":"BOARD_ID","title":"My Pin","description":"Pin description","link":"https://example.com","media_source":{"source_type":"image_url","url":"https://example.com/photo.jpg"}}',
        response: "id — pin ID",
        notes: [
          "board_id ОБЯЗАТЕЛЕН",
          "media_source.source_type: 'image_url', 'image_base64', 'video_id'",
          "link: URL для клика с пина"
        ]
      },
      list_boards: {
        method: "GET",
        path: "/boards",
        description: "Список досок пользователя",
        response: "items[] — массив board объектов с id и name",
        notes: ["Пагинация: bookmark param"]
      }
    },
    n8nNotes: [
      "OAuth2 обязателен",
      "board_id обязателен для создания пина",
      "media_source: URL или base64 изображения",
      "Bookmark-based пагинация (не offset)"
    ],
    rateLimits: "1000 writes/day, 200 req/hour.",
    docsUrl: "https://developers.pinterest.com/docs/api/v5/"
  },

  {
    name: "Reddit",
    description: "Reddit API. OAuth2 обязателен. Base URL = oauth.reddit.com (не www!). User-Agent ОБЯЗАТЕЛЕН.",
    category: ["social-media", "forum", "reddit"],
    baseUrl: "https://oauth.reddit.com",
    auth: {
      type: "bearer",
      setup: "OAuth2 обязателен: 1) Basic Auth (client_id:secret) POST /api/v1/access_token, 2) Bearer с полученным token. User-Agent ОБЯЗАТЕЛЕН."
    },
    defaultHeaders: {
      "User-Agent": "n8n:myapp:v1.0 (by /u/YOUR_USERNAME)"
    },
    endpoints: {
      submit_post: {
        method: "POST",
        path: "/api/submit",
        description: "Создать пост в subreddit. FORM-URLENCODED!",
        contentType: "application/x-www-form-urlencoded",
        bodyExample: "sr=test&kind=self&title=My Post&text=Hello Reddit!",
        response: "json.data.url — URL поста, json.data.name — fullname",
        notes: [
          "FORM-URLENCODED, НЕ JSON!",
          "sr: subreddit name (без r/)",
          "kind: self (text), link (URL), image, video",
          "Для link posts: url вместо text"
        ]
      },
      get_subreddit: {
        method: "GET",
        path: "/r/{subreddit}/hot",
        description: "Получить посты из subreddit",
        response: "data.children[] — массив постов (data.title, data.url, data.score)",
        notes: [
          "Замени /hot на /new, /top, /rising",
          "limit: до 100",
          "after/before: пагинация через fullname (t3_xxx)"
        ]
      }
    },
    n8nNotes: [
      "User-Agent ОБЯЗАТЕЛЕН! Формат: 'platform:appid:version (by /u/username)'",
      "БЕЗ User-Agent = 429 Too Many Requests!",
      "Base URL: oauth.reddit.com (НЕ www.reddit.com!)",
      "Submit: form-urlencoded (не JSON!)",
      "OAuth2 flow: POST https://www.reddit.com/api/v1/access_token с Basic Auth (client_id:secret)"
    ],
    rateLimits: "60 req/min (с User-Agent). Без — жёсткий throttling.",
    docsUrl: "https://www.reddit.com/dev/api/"
  },

  {
    name: "YouTube Upload",
    description: "YouTube видео upload. OAuth2. Multipart upload. Отдельный /upload/ URL.",
    category: ["social-media", "video", "youtube", "google"],
    baseUrl: "https://www.googleapis.com/upload/youtube/v3",
    auth: {
      type: "oauth2",
      setup: "OAuth2 через Google Cloud Console. Scope: https://www.googleapis.com/auth/youtube.upload"
    },
    defaultHeaders: {},
    endpoints: {
      upload_video: {
        method: "POST",
        path: "/videos",
        description: "Загрузить видео на YouTube. MULTIPART!",
        contentType: "multipart/related",
        response: "id — video ID, snippet.title",
        notes: [
          "URL: /upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
          "part=snippet,status ОБЯЗАТЕЛЕН!",
          "ШАГ 1: POST с metadata → получи upload URL в Location header",
          "ШАГ 2: PUT binary видео на upload URL",
          "Resumable upload рекомендуется для больших файлов",
          "snippet: title, description, tags, categoryId",
          "status.privacyStatus: 'private', 'public', 'unlisted'"
        ]
      }
    },
    n8nNotes: [
      "СЛОЖНЫЙ процесс: resumable upload (POST metadata → PUT binary)",
      "Отдельный URL: /upload/youtube/v3/ (не стандартный youtube/v3/)",
      "part= ОБЯЗАТЕЛЕН в query",
      "Для простых задач: n8n YouTube ноду проще",
      "Видео metadata также через стандартный YouTube Data API v3"
    ],
    rateLimits: "10,000 quota units/day. Upload = 1600 units.",
    docsUrl: "https://developers.google.com/youtube/v3/docs/videos/insert"
  },

  {
    name: "Medium",
    description: "Medium публикация API. Bearer token. Простой, но ограниченный (только создание постов).",
    category: ["social-media", "blogging", "publishing"],
    baseUrl: "https://api.medium.com/v1",
    auth: {
      type: "bearer",
      setup: "В n8n: Bearer auth. Integration Token из Medium Settings → Security and apps → Integration tokens."
    },
    defaultHeaders: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    endpoints: {
      get_me: {
        method: "GET",
        path: "/me",
        description: "Получить текущего пользователя (нужен для authorId)",
        response: "data.id — authorId для публикации",
        notes: ["Вызови первым делом для получения authorId"]
      },
      create_post: {
        method: "POST",
        path: "/users/{authorId}/posts",
        description: "Опубликовать пост",
        bodyExample: '{"title":"My Post","contentFormat":"html","content":"<h1>Title</h1><p>Content here</p>","tags":["tech","api"],"publishStatus":"draft"}',
        response: "data.id — post ID, data.url — URL поста",
        notes: [
          "authorId: из GET /me → data.id",
          "contentFormat: 'html' или 'markdown'",
          "publishStatus: 'draft' или 'public'",
          "tags: до 5 тегов",
          "API ОГРАНИЧЕН: только создание, нет обновления/удаления!",
          "canonicalUrl: для SEO (original source)"
        ]
      }
    },
    n8nNotes: [
      "Integration Token из Medium Settings (не OAuth2)",
      "authorId нужен из GET /me — вызови первым",
      "API только для СОЗДАНИЯ постов — нет update/delete!",
      "contentFormat: 'html' (рекомендуется) или 'markdown'"
    ],
    rateLimits: "Не документировано точно. Не для bulk posting.",
    docsUrl: "https://github.com/Medium/medium-api-docs"
  },

  {
    name: "Mastodon",
    description: "Децентрализованный microblogging. Bearer token. Instance-specific URL.",
    category: ["social-media", "fediverse", "microblogging", "open-source"],
    baseUrl: "https://{instance}/api/v1",
    auth: {
      type: "bearer",
      setup: "В n8n: Bearer auth. Получи access_token: Settings → Development → New Application → Токен."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_status: {
        method: "POST",
        path: "/statuses",
        description: "Создать пост (toot/status)",
        bodyExample: '{"status":"Hello Fediverse! #mastodon","visibility":"public","language":"en"}',
        response: "id — status ID, url — URL поста",
        notes: [
          "status: текст поста (до 500 символов на большинстве серверов)",
          "visibility: public, unlisted, private, direct",
          "Для медиа: сначала POST /api/v2/media (multipart) → media_ids[] в statuses",
          "spoiler_text: Content Warning текст"
        ]
      },
      upload_media: {
        method: "POST",
        path: "/api/v2/media",
        description: "Загрузить медиа для прикрепления к посту. MULTIPART!",
        contentType: "multipart/form-data",
        response: "id — media ID для media_ids[]",
        notes: [
          "MULTIPART: file + description (alt text)",
          "ASYNC: может вернуть 202 (обработка) → poll GET /api/v1/media/{id}",
          "Используй v2 (не v1) для media upload — поддерживает async processing"
        ]
      },
      get_timeline: {
        method: "GET",
        path: "/timelines/home",
        description: "Домашняя лента",
        response: "Массив status объектов",
        notes: ["limit: до 40. Пагинация: max_id, since_id в Link header"]
      }
    },
    n8nNotes: [
      "Instance-specific URL! Замени {instance} на mastodon.social, или свой сервер",
      "Простой Bearer token (из Settings → Development)",
      "Медиа upload: multipart → media_ids[], ASYNC возможен",
      "Пагинация через Link header (не в body!)"
    ],
    rateLimits: "300 req/5min (зависит от instance).",
    docsUrl: "https://docs.joinmastodon.org/methods/"
  },

  {
    name: "Bluesky (AT Protocol)",
    description: "Decentralized social. XRPC API. Двухшаговый auth: createSession → Bearer JWT.",
    category: ["social-media", "decentralized", "microblogging"],
    baseUrl: "https://bsky.social/xrpc",
    auth: {
      type: "bearer",
      setup: "ШАГ 1: POST /xrpc/com.atproto.server.createSession → accessJwt. ШАГ 2: Bearer accessJwt во всех запросах. Используй App Password (не основной пароль!)."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_session: {
        method: "POST",
        path: "/com.atproto.server.createSession",
        description: "Авторизация: получить JWT токен",
        bodyExample: '{"identifier":"your.handle.bsky.social","password":"YOUR_APP_PASSWORD"}',
        response: "accessJwt — Bearer token (живёт несколько минут!), refreshJwt, did — ваш DID",
        notes: [
          "Используй App Password (Settings → App Passwords), НЕ основной пароль!",
          "accessJwt КОРОТКОЖИВУЩИЙ (минуты!) — refresh через com.atproto.server.refreshSession",
          "did: decentralized identifier (нужен как repo при создании записей)"
        ]
      },
      create_post: {
        method: "POST",
        path: "/com.atproto.repo.createRecord",
        description: "Создать пост (запись в репозитории)",
        bodyExample: '{"repo":"YOUR_DID_OR_HANDLE","collection":"app.bsky.feed.post","record":{"$type":"app.bsky.feed.post","text":"Hello Bluesky!","createdAt":"2026-03-05T12:00:00Z"}}',
        response: "uri — at:// URI поста, cid — content hash",
        notes: [
          "repo: ваш DID (did:plc:...) или handle",
          "collection: 'app.bsky.feed.post' для постов",
          "record.$type: 'app.bsky.feed.post' ОБЯЗАТЕЛЕН",
          "record.createdAt: ОБЯЗАТЕЛЕН (ISO 8601 UTC)",
          "Для images: сначала uploadBlob, затем embed в record"
        ]
      },
      upload_blob: {
        method: "POST",
        path: "/com.atproto.repo.uploadBlob",
        description: "Загрузить изображение. Content-Type = image MIME type!",
        contentType: "image/jpeg",
        response: "blob — объект для использования в embed",
        notes: [
          "Content-Type: image/jpeg, image/png и т.д. (НЕ JSON!)",
          "Body: raw binary данные изображения",
          "Макс 1MB для изображений",
          "В n8n: Response Format = File для получения binary"
        ]
      }
    },
    n8nNotes: [
      "ДВУХШАГОВЫЙ AUTH: 1) createSession → accessJwt, 2) Bearer accessJwt",
      "accessJwt КОРОТКОЖИВУЩИЙ — нужен refresh или новая сессия",
      "Используй App Password (не основной!)",
      "XRPC endpoints: reverse DNS notation (com.atproto.*, app.bsky.*)",
      "createdAt ОБЯЗАТЕЛЕН в каждом посте (клиент генерирует!)",
      "Нет n8n встроенной ноды — только HTTP Request"
    ],
    rateLimits: "Rate limits в response headers. ~3000 req/5min.",
    docsUrl: "https://docs.bsky.app/docs/api/at-protocol-xrpc-api"
  },

  {
    name: "Threads (Meta)",
    description: "Threads API через Meta Graph. OAuth2. Двухшаговая публикация (как Instagram).",
    category: ["social-media", "microblogging", "meta"],
    baseUrl: "https://graph.threads.net/v1.0",
    auth: {
      type: "bearer",
      setup: "OAuth2 через Facebook Developer Portal. Threads API permission. Bearer access_token."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_container: {
        method: "POST",
        path: "/{user_id}/threads",
        description: "ШАГ 1: Создать media container",
        bodyExample: '{"media_type":"TEXT","text":"Hello Threads!","access_token":"YOUR_TOKEN"}',
        response: "id — container ID",
        notes: [
          "ДВУХШАГОВАЯ публикация (как Instagram): create → publish",
          "media_type: TEXT, IMAGE, VIDEO, CAROUSEL",
          "Для IMAGE: image_url обязателен",
          "Для VIDEO: video_url обязателен"
        ]
      },
      publish_container: {
        method: "POST",
        path: "/{user_id}/threads_publish",
        description: "ШАГ 2: Опубликовать container",
        bodyExample: '{"creation_id":"CONTAINER_ID","access_token":"YOUR_TOKEN"}',
        response: "id — published thread ID",
        notes: ["creation_id = ID из шага 1"]
      },
      get_threads: {
        method: "GET",
        path: "/{user_id}/threads",
        description: "Получить threads пользователя",
        response: "data[] — массив thread объектов",
        notes: ["fields: id,text,timestamp,media_type,permalink"]
      }
    },
    n8nNotes: [
      "ДВУХШАГОВАЯ публикация: 1) POST /threads → container_id, 2) POST /threads_publish",
      "Тот же паттерн что Instagram (Meta Graph)",
      "OAuth2 через Facebook Developer Portal",
      "Для TEXT постов: не нужен media URL",
      "rate limit: 250 API calls/user/hour"
    ],
    rateLimits: "250 calls/user/hour. 500 published posts/24h.",
    docsUrl: "https://developers.facebook.com/docs/threads/threads-api"
  },

  {
    name: "Stripe",
    description: "Платёжный API. Basic Auth (Secret Key). FORM-URLENCODED, НЕ JSON!",
    category: ["payments", "ecommerce", "billing"],
    baseUrl: "https://api.stripe.com/v1",
    auth: {
      type: "bearer",
      setup: "В n8n: Bearer auth с Secret Key (sk_live_... или sk_test_...). Альтернативно: Basic Auth с Secret Key как username, пароль пустой."
    },
    defaultHeaders: {},
    endpoints: {
      create_payment_intent: {
        method: "POST",
        path: "/payment_intents",
        description: "Создать Payment Intent. FORM-URLENCODED!",
        contentType: "application/x-www-form-urlencoded",
        bodyExample: "amount=2000&currency=usd&payment_method_types[]=card&metadata[order_id]=12345",
        response: "id — pi_... ID, client_secret — для фронтенда, status",
        notes: [
          "КРИТИЧНО: Content-Type = application/x-www-form-urlencoded, НЕ JSON!",
          "В n8n: Body Content Type = Form URL Encoded",
          "amount: в МИНИМАЛЬНЫХ единицах валюты (центы для USD)! $20.00 = 2000",
          "currency: 3-letter ISO code (usd, eur, gbp)",
          "Массивы: payment_method_types[]=card",
          "Вложенные объекты: metadata[key]=value"
        ]
      },
      create_customer: {
        method: "POST",
        path: "/customers",
        description: "Создать клиента",
        contentType: "application/x-www-form-urlencoded",
        bodyExample: "email=john@example.com&name=John Doe&metadata[user_id]=12345",
        response: "id — cus_... ID",
        notes: [
          "form-urlencoded!",
          "metadata: до 50 ключей, ключ до 40 символов"
        ]
      },
      list_charges: {
        method: "GET",
        path: "/charges",
        description: "Список платежей",
        response: "data[] — массив charge объектов, has_more — есть ли ещё",
        notes: [
          "Query params: limit, starting_after (для пагинации), customer",
          "Cursor-based пагинация: starting_after=ch_xxx"
        ]
      },
      create_checkout_session: {
        method: "POST",
        path: "/checkout/sessions",
        description: "Создать Checkout Session (hosted payment page)",
        contentType: "application/x-www-form-urlencoded",
        bodyExample: "mode=payment&success_url=https://example.com/success&cancel_url=https://example.com/cancel&line_items[0][price]=price_xxxx&line_items[0][quantity]=1",
        response: "id — cs_... ID, url — URL страницы оплаты",
        notes: [
          "mode: 'payment' (разовый), 'subscription', 'setup'",
          "url: редиректь клиента сюда для оплаты",
          "line_items: массив товаров (price ID или price_data)",
          "Самый простой способ принять платёж!"
        ]
      }
    },
    n8nNotes: [
      "ВСЕ запросы = Form URL Encoded (НЕ JSON!). Это САМАЯ частая ошибка с Stripe!",
      "amount в ЦЕНТАХ: $20.00 = 2000",
      "Массивы: items[0][price]=xxx&items[0][quantity]=1",
      "Вложенные объекты: metadata[key]=value",
      "Bearer auth: Authorization: Bearer sk_live_...",
      "n8n имеет встроенную Stripe ноду (обрабатывает form-urlencoded)"
    ],
    rateLimits: "100 req/sec (read), 100 req/sec (write) в live mode.",
    docsUrl: "https://docs.stripe.com/api"
  },

  {
    name: "Shopify",
    description: "E-commerce API. Bearer (Custom App token) или Basic Auth (API key:password). Version в URL!",
    category: ["ecommerce", "shop"],
    baseUrl: "https://{store}.myshopify.com/admin/api/2024-10",
    auth: {
      type: "header",
      setup: "В n8n: добавь заголовок X-Shopify-Access-Token: YOUR_ACCESS_TOKEN. Или Bearer auth.",
      headerName: "X-Shopify-Access-Token"
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      list_products: {
        method: "GET",
        path: "/products.json",
        description: "Список товаров",
        response: "products[] — массив товаров с id, title, variants",
        notes: [
          "API version в URL: /admin/api/2024-10/...",
          ".json суффикс в URL путях!",
          "limit: до 250 (по умолчанию 50)",
          "Пагинация: Link header с cursor (rel='next')"
        ]
      },
      create_product: {
        method: "POST",
        path: "/products.json",
        description: "Создать товар",
        bodyExample: '{"product":{"title":"New Product","body_html":"<p>Description</p>","vendor":"My Store","product_type":"Shoes","variants":[{"price":"29.99","sku":"SKU001"}]}}',
        response: "product.id — ID товара",
        notes: [
          "Body обёрнут: {\"product\": {...}}",
          "variants: массив вариантов (размеры, цвета)"
        ]
      },
      create_order: {
        method: "POST",
        path: "/orders.json",
        description: "Создать заказ",
        bodyExample: '{"order":{"line_items":[{"variant_id":VARIANT_ID,"quantity":1}],"customer":{"id":CUSTOMER_ID},"financial_status":"paid"}}',
        response: "order.id",
        notes: ["Body обёрнут: {\"order\": {...}}"]
      }
    },
    n8nNotes: [
      "Auth: заголовок X-Shopify-Access-Token (не Bearer!)",
      "API version В URL: /admin/api/2024-10/ (обновляется quarterly)",
      ".json суффикс в КАЖДОМ URL!",
      "Body обёрнут в тип объекта: {product: {...}}, {order: {...}}",
      "Пагинация через Link header (cursor-based)",
      "n8n имеет встроенную Shopify ноду"
    ],
    rateLimits: "2 req/sec (Basic Shopify), 4 req/sec (Shopify Plus). Leaky bucket.",
    docsUrl: "https://shopify.dev/docs/api/admin-rest"
  },

  {
    name: "WooCommerce",
    description: "WordPress e-commerce REST API. Basic Auth (Consumer Key:Secret). WordPress site URL.",
    category: ["ecommerce", "wordpress"],
    baseUrl: "https://{site}/wp-json/wc/v3",
    auth: {
      type: "basic",
      setup: "В n8n: HTTP Basic Auth. Username = Consumer Key (ck_...), Password = Consumer Secret (cs_...). Генерируй в WooCommerce → Settings → Advanced → REST API."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_order: {
        method: "POST",
        path: "/orders",
        description: "Создать заказ",
        bodyExample: '{"payment_method":"bacs","payment_method_title":"Direct Bank Transfer","set_paid":true,"billing":{"first_name":"John","last_name":"Doe","email":"john@example.com"},"line_items":[{"product_id":93,"quantity":2}]}',
        response: "id — order ID, status, total",
        notes: [
          "set_paid: true — пометить как оплаченный",
          "line_items: product_id + quantity"
        ]
      },
      list_products: {
        method: "GET",
        path: "/products",
        description: "Список товаров",
        response: "Массив product объектов",
        notes: ["per_page: до 100. page: номер страницы"]
      },
      update_product: {
        method: "PUT",
        path: "/products/{id}",
        description: "Обновить товар",
        bodyExample: '{"regular_price":"24.99","stock_quantity":10}',
        response: "Обновлённый product объект",
        notes: ["Частичное обновление: передай только изменяемые поля"]
      }
    },
    n8nNotes: [
      "Basic Auth: Consumer Key (ck_...) как username, Consumer Secret (cs_...) как password",
      "URL зависит от сайта: https://your-site.com/wp-json/wc/v3/",
      "Для HTTP (не HTTPS): используй query auth: ?consumer_key=ck_...&consumer_secret=cs_...",
      "n8n имеет встроенную WooCommerce ноду"
    ],
    rateLimits: "Зависит от хостинга.",
    docsUrl: "https://woocommerce.github.io/woocommerce-rest-api-docs/"
  },

  {
    name: "PayPal",
    description: "Платёжный API. Basic Auth для получения token, затем Bearer. Двухшаговый auth.",
    category: ["payments"],
    baseUrl: "https://api-m.paypal.com",
    auth: {
      type: "bearer",
      setup: "ШАГ 1: POST /v1/oauth2/token (Basic Auth: Client ID : Secret, form-urlencoded body: grant_type=client_credentials) → access_token. ШАГ 2: Bearer access_token. Sandbox: api-m.sandbox.paypal.com."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      get_token: {
        method: "POST",
        path: "/v1/oauth2/token",
        description: "Получить access token. Basic Auth + form-urlencoded!",
        contentType: "application/x-www-form-urlencoded",
        bodyExample: "grant_type=client_credentials",
        response: "access_token — Bearer token, expires_in — секунды",
        notes: [
          "FORM-URLENCODED body!",
          "Basic Auth: Client ID как username, Secret как password",
          "access_token живёт ~9 часов"
        ]
      },
      create_order: {
        method: "POST",
        path: "/v2/checkout/orders",
        description: "Создать order (checkout). Bearer auth.",
        bodyExample: '{"intent":"CAPTURE","purchase_units":[{"amount":{"currency_code":"USD","value":"100.00"},"description":"My Product"}],"application_context":{"return_url":"https://example.com/success","cancel_url":"https://example.com/cancel"}}',
        response: "id — order ID, links[] — массив URL (approval_url для redirect)",
        notes: [
          "intent: 'CAPTURE' (списать сразу) или 'AUTHORIZE' (заморозить)",
          "links: найди rel:'approve' → redirect клиента туда",
          "amount.value: СТРОКА с точкой! '100.00' (не число!)",
          "После approve клиентом: POST /v2/checkout/orders/{id}/capture"
        ]
      },
      capture_order: {
        method: "POST",
        path: "/v2/checkout/orders/{id}/capture",
        description: "Захватить платёж после approve клиентом",
        response: "status: 'COMPLETED', purchase_units[0].payments.captures[0].id",
        notes: [
          "Вызывай после того как клиент approve на PayPal",
          "Body может быть пустым"
        ]
      }
    },
    n8nNotes: [
      "ДВУХШАГОВЫЙ AUTH: 1) Basic Auth → token (form-urlencoded!), 2) Bearer token",
      "Sandbox: api-m.sandbox.paypal.com",
      "amount.value — СТРОКА: '100.00' (не число 100!)",
      "Order flow: create → redirect клиента → capture после approve",
      "n8n имеет встроенную PayPal ноду (не нужен двухшаговый auth)"
    ],
    rateLimits: "Зависит от типа аккаунта.",
    docsUrl: "https://developer.paypal.com/docs/api/orders/v2/"
  },

  {
    name: "Gumroad",
    description: "Digital products платформа. Bearer или access_token в body/query.",
    category: ["ecommerce", "digital-products"],
    baseUrl: "https://api.gumroad.com/v2",
    auth: {
      type: "bearer",
      setup: "В n8n: Bearer auth с access_token. Или передай access_token в body/query каждого запроса."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      list_products: {
        method: "GET",
        path: "/products",
        description: "Список товаров",
        response: "products[] — массив product объектов",
        notes: ["?access_token=YOUR_TOKEN (альтернатива Bearer)"]
      },
      list_sales: {
        method: "GET",
        path: "/sales",
        description: "Список продаж",
        response: "sales[] — массив sale объектов с email, price, created_at",
        notes: [
          "after, before: дата-фильтры (YYYY-MM-DD)",
          "page: пагинация"
        ]
      },
      verify_license: {
        method: "POST",
        path: "/licenses/verify",
        description: "Проверить лицензионный ключ",
        bodyExample: '{"product_id":"YOUR_PRODUCT_ID","license_key":"LICENSE_KEY"}',
        response: "success: true, purchase — объект покупки",
        notes: ["Для верификации лицензий software продуктов"]
      }
    },
    n8nNotes: [
      "access_token можно передать в body, query ИЛИ Bearer header",
      "Простой API для digital products и подписок"
    ],
    rateLimits: "Не документировано точно.",
    docsUrl: "https://app.gumroad.com/api"
  },

  {
    name: "LemonSqueezy",
    description: "Digital payments. JSON:API формат! Обязательные Accept + Content-Type headers.",
    category: ["payments", "digital-products", "saas"],
    baseUrl: "https://api.lemonsqueezy.com/v1",
    auth: {
      type: "bearer",
      setup: "В n8n: Bearer auth с API Key из LemonSqueezy Dashboard → Settings → API."
    },
    defaultHeaders: {
      "Accept": "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json"
    },
    endpoints: {
      create_checkout: {
        method: "POST",
        path: "/checkouts",
        description: "Создать checkout URL для оплаты",
        bodyExample: '{"data":{"type":"checkouts","attributes":{"checkout_data":{"custom":{"user_id":"123"}}},"relationships":{"store":{"data":{"type":"stores","id":"YOUR_STORE_ID"}},"variant":{"data":{"type":"variants","id":"YOUR_VARIANT_ID"}}}}}',
        response: "data.attributes.url — URL для оплаты, data.id — checkout ID",
        notes: [
          "JSON:API формат! Сложная вложенная структура: data.type, data.attributes, data.relationships",
          "ОБЯЗАТЕЛЬНЫЕ headers: Accept: application/vnd.api+json, Content-Type: application/vnd.api+json",
          "store_id и variant_id: из LemonSqueezy Dashboard",
          "checkout_data.custom: произвольные данные (придут в webhook)",
          "data.attributes.url: redirect клиента сюда"
        ]
      },
      list_orders: {
        method: "GET",
        path: "/orders",
        description: "Список заказов",
        response: "data[] — массив order объектов в JSON:API формате",
        notes: [
          "filter[store_id]: фильтр по магазину",
          "include: customer,order-items — включить связанные объекты"
        ]
      }
    },
    n8nNotes: [
      "JSON:API формат! Content-Type И Accept = application/vnd.api+json (НЕ application/json!)",
      "Данные обёрнуты: {data: {type: '...', attributes: {...}, relationships: {...}}}",
      "Для webhooks: custom_data приходит в meta.custom_data",
      "Альтернатива Stripe для digital products/SaaS"
    ],
    rateLimits: "300 req/min.",
    docsUrl: "https://docs.lemonsqueezy.com/api"
  },

  {
    name: "Square",
    description: "Платёжный API + POS. Bearer token. Стандартный JSON REST API.",
    category: ["payments", "pos", "ecommerce"],
    baseUrl: "https://connect.squareup.com/v2",
    auth: {
      type: "bearer",
      setup: "В n8n: Bearer auth с Square Access Token. Sandbox: connect.squareupsandbox.com."
    },
    defaultHeaders: {
      "Content-Type": "application/json",
      "Square-Version": "2024-10-17"
    },
    endpoints: {
      create_payment: {
        method: "POST",
        path: "/payments",
        description: "Создать платёж",
        bodyExample: '{"source_id":"CARD_NONCE_OR_TOKEN","idempotency_key":"UNIQUE_KEY","amount_money":{"amount":200,"currency":"USD"},"location_id":"YOUR_LOCATION_ID"}',
        response: "payment.id — payment ID, payment.status",
        notes: [
          "idempotency_key ОБЯЗАТЕЛЕН! Уникальная строка для каждого запроса",
          "amount_money.amount: в МИНИМАЛЬНЫХ единицах (центы) — как Stripe",
          "source_id: card nonce от Web Payments SDK или card_id",
          "location_id: ID точки продаж"
        ]
      },
      list_payments: {
        method: "GET",
        path: "/payments",
        description: "Список платежей",
        response: "payments[] — массив payment объектов",
        notes: ["cursor: для пагинации"]
      }
    },
    n8nNotes: [
      "idempotency_key ОБЯЗАТЕЛЕН для всех POST/PUT — используй UUID!",
      "Square-Version header рекомендуется",
      "amount в центах (как Stripe)",
      "Sandbox: connect.squareupsandbox.com"
    ],
    rateLimits: "Зависит от endpoint. Обычно 10-30 req/sec.",
    docsUrl: "https://developer.squareup.com/reference/square"
  },

  {
    name: "Paddle",
    description: "Платёжный API для SaaS. Bearer token. Sandbox отдельный URL.",
    category: ["payments", "saas", "billing"],
    baseUrl: "https://api.paddle.com",
    auth: {
      type: "bearer",
      setup: "В n8n: Bearer auth с Paddle API Key. Sandbox: sandbox-api.paddle.com."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_transaction: {
        method: "POST",
        path: "/transactions",
        description: "Создать транзакцию (checkout)",
        bodyExample: '{"items":[{"price_id":"pri_xxxx","quantity":1}],"customer_id":"ctm_xxxx","collection_mode":"automatic"}',
        response: "data.id — txn_... ID, data.checkout.url — URL оплаты",
        notes: [
          "items[].price_id: ID цены из Paddle Dashboard",
          "collection_mode: 'automatic' (немедленный платёж) или 'manual' (invoice)",
          "data.checkout.url: URL для redirect клиента"
        ]
      },
      list_subscriptions: {
        method: "GET",
        path: "/subscriptions",
        description: "Список подписок",
        response: "data[] — массив subscription объектов",
        notes: ["status[]=active: фильтр по статусу"]
      }
    },
    n8nNotes: [
      "Sandbox: sandbox-api.paddle.com",
      "Ответы обёрнуты в data: {data: {...}, meta: {...}}",
      "price_id из Paddle Dashboard (не product_id!)",
      "Webhooks: основной способ получать обновления"
    ],
    rateLimits: "Зависит от endpoint.",
    docsUrl: "https://developer.paddle.com/api-reference/"
  },

  {
    name: "Mollie",
    description: "Европейский платёжный API. Bearer token. Простой REST.",
    category: ["payments", "europe"],
    baseUrl: "https://api.mollie.com/v2",
    auth: {
      type: "bearer",
      setup: "В n8n: Bearer auth с Mollie API Key (live_... или test_...)."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_payment: {
        method: "POST",
        path: "/payments",
        description: "Создать платёж",
        bodyExample: '{"amount":{"currency":"EUR","value":"10.00"},"description":"Order #12345","redirectUrl":"https://example.com/success","webhookUrl":"https://example.com/webhook","metadata":{"order_id":"12345"}}',
        response: "id — tr_... ID, _links.checkout.href — URL оплаты",
        notes: [
          "amount.value: СТРОКА с точкой! '10.00' (как PayPal)",
          "amount.currency: ISO 4217 (EUR, USD)",
          "redirectUrl: куда вернуть клиента после оплаты",
          "webhookUrl: куда отправить статус (ОБЯЗАТЕЛЕН для production!)",
          "_links.checkout.href: redirect клиента сюда"
        ]
      },
      get_payment: {
        method: "GET",
        path: "/payments/{id}",
        description: "Получить статус платежа",
        response: "status — 'open', 'paid', 'failed', 'expired', 'canceled'",
        notes: ["Polling: проверяй status после webhook"]
      }
    },
    n8nNotes: [
      "amount.value — СТРОКА: '10.00' (не число!)",
      "API Key: live_... (production) или test_... (sandbox)",
      "Flow: create → redirect → webhook notification → get status",
      "Популярен в Европе: iDEAL, Bancontact, SOFORT и др."
    ],
    rateLimits: "~500 req/sec.",
    docsUrl: "https://docs.mollie.com/reference/v2/payments-api/create-payment"
  },

  {
    name: "WooCommerce Subscriptions",
    description: "Расширение WooCommerce для подписок. Тот же auth что WooCommerce.",
    category: ["ecommerce", "wordpress", "subscriptions"],
    baseUrl: "https://{site}/wp-json/wc/v3",
    auth: {
      type: "basic",
      setup: "Как WooCommerce: Basic Auth с Consumer Key (ck_...) и Consumer Secret (cs_...)."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      list_subscriptions: {
        method: "GET",
        path: "/subscriptions",
        description: "Список подписок",
        response: "Массив subscription объектов с id, status, billing_period",
        notes: [
          "Требует плагин WooCommerce Subscriptions",
          "status: active, on-hold, cancelled, expired, pending-cancel"
        ]
      },
      update_subscription: {
        method: "PUT",
        path: "/subscriptions/{id}",
        description: "Обновить подписку (статус, даты и т.д.)",
        bodyExample: '{"status":"on-hold"}',
        response: "Обновлённый subscription объект",
        notes: ["status: 'active', 'on-hold', 'cancelled'"]
      }
    },
    n8nNotes: [
      "Тот же auth и base URL что WooCommerce",
      "Требует установленный плагин WooCommerce Subscriptions на сайте",
      "Endpoints: /subscriptions, /subscriptions/{id}"
    ],
    rateLimits: "Зависит от хостинга.",
    docsUrl: "https://woocommerce.github.io/subscriptions-rest-api-docs/"
  },

  {
    name: "Tilda",
    description: "Конструктор сайтов. Простой GET API для чтения. Webhook для заказов.",
    category: ["website-builder", "ecommerce"],
    baseUrl: "https://api.tildacdn.info/v1",
    auth: {
      type: "query",
      setup: "API key в query: ?publickey=YOUR_PUBLIC_KEY&secretkey=YOUR_SECRET_KEY"
    },
    defaultHeaders: {},
    endpoints: {
      get_projects: {
        method: "GET",
        path: "/getprojectslist",
        description: "Список проектов",
        response: "result[] — массив проектов с id и title",
        notes: [
          "?publickey=...&secretkey=... в каждом запросе",
          "Только GET запросы — нет создания/обновления через API!"
        ]
      },
      get_pages: {
        method: "GET",
        path: "/getpageslist",
        description: "Список страниц проекта",
        response: "result[] — массив страниц",
        notes: ["?projectid=YOUR_PROJECT_ID&publickey=...&secretkey=..."]
      },
      get_page_full: {
        method: "GET",
        path: "/getpagefullexport",
        description: "Экспорт полной страницы (HTML, CSS, JS)",
        response: "result.html — HTML контент страницы",
        notes: [
          "?pageid=PAGE_ID&publickey=...&secretkey=...",
          "Возвращает полный HTML страницы"
        ]
      }
    },
    n8nNotes: [
      "ТОЛЬКО ЧТЕНИЕ! Нет создания контента через API",
      "Auth: publickey + secretkey в query параметрах",
      "Для заказов: настрой Webhook в Tilda → выходные данные в JSON",
      "Основной use case для n8n: webhook от Tilda форм/заказов"
    ],
    rateLimits: "150 req/hour.",
    docsUrl: "https://help-ru.tilda.cc/api"
  },

  {
    name: "Ecwid",
    description: "E-commerce API (Ecwid by Lightspeed). Bearer token. Store ID в URL.",
    category: ["ecommerce"],
    baseUrl: "https://app.ecwid.com/api/v3/{storeId}",
    auth: {
      type: "bearer",
      setup: "В n8n: Bearer auth с Ecwid Secret Token. Store ID в URL пути."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      list_products: {
        method: "GET",
        path: "/products",
        description: "Список товаров",
        response: "items[] — массив product объектов, total — общее кол-во",
        notes: [
          "Store ID в URL: /api/v3/{storeId}/products",
          "keyword: текстовый поиск",
          "limit, offset: пагинация"
        ]
      },
      create_product: {
        method: "POST",
        path: "/products",
        description: "Создать товар",
        bodyExample: '{"name":"New Product","price":29.99,"description":"<p>Product description</p>","sku":"SKU001","quantity":100,"enabled":true}',
        response: "id — product ID",
        notes: ["price: число с десятичными (не центы!)"]
      },
      list_orders: {
        method: "GET",
        path: "/orders",
        description: "Список заказов",
        response: "items[] — массив order объектов",
        notes: ["createdFrom, createdTo: дата-фильтры (unix timestamp)"]
      }
    },
    n8nNotes: [
      "Store ID В URL: /api/v3/{storeId}/...",
      "price: десятичное число (29.99), НЕ центы (в отличие от Stripe/Square)",
      "Bearer auth с Secret Token (не public token!)"
    ],
    rateLimits: "600 req/min.",
    docsUrl: "https://api-docs.ecwid.com/reference"
  },

  {
    name: "PostgreSQL",
    description: "TCP-based реляционная БД. НЕТ HTTP API. Используй n8n Postgres ноду.",
    category: ["database", "sql", "relational"],
    baseUrl: "tcp://localhost:5432",
    auth: {
      type: "basic",
      setup: "В n8n: используй Postgres ноду (НЕ HTTP Request!). Credentials: host, port(5432), database, user, password."
    },
    defaultHeaders: {},
    endpoints: {},
    n8nNotes: [
      "НЕ HTTP API! Используй n8n Postgres ноду",
      "Connection: host, port, database, user, password, SSL",
      "Операции: Execute Query, Insert, Update, Select",
      "Для HTTP доступа к Postgres: используй Supabase (PostgREST) или Hasura",
      "Альтернатива: n8n Execute Command нода для psql CLI"
    ],
    rateLimits: "Зависит от сервера.",
    docsUrl: "https://www.postgresql.org/docs/"
  },

  {
    name: "MySQL / MariaDB",
    description: "TCP-based реляционная БД. НЕТ HTTP API. Используй n8n MySQL ноду.",
    category: ["database", "sql", "relational"],
    baseUrl: "tcp://localhost:3306",
    auth: {
      type: "basic",
      setup: "В n8n: используй MySQL ноду (НЕ HTTP Request!). Credentials: host, port(3306), database, user, password."
    },
    defaultHeaders: {},
    endpoints: {},
    n8nNotes: [
      "НЕ HTTP API! Используй n8n MySQL ноду",
      "Connection: host, port, database, user, password, SSL",
      "Операции: Execute Query, Insert, Update, Select",
      "MariaDB совместима с MySQL протоколом — та же нода"
    ],
    rateLimits: "Зависит от сервера.",
    docsUrl: "https://dev.mysql.com/doc/"
  },

  {
    name: "MongoDB",
    description: "Document DB. Нативный TCP протокол + HTTP Data API (Atlas). Используй n8n MongoDB ноду или Atlas Data API.",
    category: ["database", "nosql", "document"],
    baseUrl: "https://data.mongodb-api.com/app/{appId}/endpoint/data/v1",
    auth: {
      type: "bearer",
      setup: "Для Atlas Data API: Bearer auth с API Key. Для нативного: n8n MongoDB нода с connection string."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      find: {
        method: "POST",
        path: "/action/find",
        description: "Найти документы (Atlas Data API)",
        bodyExample: '{"dataSource":"YOUR_CLUSTER","database":"mydb","collection":"users","filter":{"email":"john@example.com"},"limit":10}',
        response: "documents[] — массив найденных документов",
        notes: [
          "Atlas Data API: POST для ВСЕХ операций (даже чтения!)",
          "dataSource, database, collection ОБЯЗАТЕЛЬНЫ в каждом запросе",
          "filter: MongoDB query syntax ({field: value}, {$gt: 5} и т.д.)"
        ]
      },
      insertOne: {
        method: "POST",
        path: "/action/insertOne",
        description: "Вставить один документ",
        bodyExample: '{"dataSource":"YOUR_CLUSTER","database":"mydb","collection":"users","document":{"name":"John","email":"john@example.com","age":30}}',
        response: "insertedId — ID нового документа",
        notes: ["document: объект для вставки"]
      },
      updateOne: {
        method: "POST",
        path: "/action/updateOne",
        description: "Обновить один документ",
        bodyExample: '{"dataSource":"YOUR_CLUSTER","database":"mydb","collection":"users","filter":{"email":"john@example.com"},"update":{"$set":{"age":31}}}',
        response: "matchedCount, modifiedCount",
        notes: ["update: MongoDB update operators ($set, $inc, $push и т.д.)"]
      }
    },
    n8nNotes: [
      "ДВА ВАРИАНТА: 1) n8n MongoDB нода (нативный протокол), 2) Atlas Data API (HTTP)",
      "MongoDB нода: connection string (mongodb+srv://user:pass@cluster/db)",
      "Atlas Data API: нужно включить в Atlas Dashboard → Data API → Enable",
      "POST для ВСЕХ операций (даже find)!",
      "dataSource, database, collection обязательны в каждом HTTP запросе"
    ],
    rateLimits: "Atlas Data API: зависит от tier.",
    docsUrl: "https://www.mongodb.com/docs/atlas/api/data-api/"
  },

  {
    name: "Supabase",
    description: "Postgres через REST API (PostgREST). ДВА заголовка: apikey + Authorization. Таблицы = endpoints.",
    category: ["database", "baas", "postgres", "realtime"],
    baseUrl: "https://{ref}.supabase.co/rest/v1",
    auth: {
      type: "header",
      setup: "В n8n HTTP Request: добавь ДВА заголовка: 1) apikey: YOUR_ANON_KEY, 2) Authorization: Bearer YOUR_ANON_KEY. Для admin: используй service_role key.",
      headerName: "apikey"
    },
    defaultHeaders: {
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    },
    endpoints: {
      select_rows: {
        method: "GET",
        path: "/{table_name}",
        description: "Получить строки из таблицы. Мощные query params для фильтрации.",
        response: "Массив объектов (строк)",
        notes: [
          "Таблица = endpoint: /rest/v1/users, /rest/v1/orders",
          "Фильтрация: ?email=eq.john@example.com",
          "Операторы: eq, neq, gt, gte, lt, lte, like, ilike, in, is",
          "select: ?select=id,name,email (выбор колонок)",
          "order: ?order=created_at.desc",
          "limit: ?limit=10&offset=0",
          "Связи: ?select=*,orders(*) — JOIN!"
        ]
      },
      insert_row: {
        method: "POST",
        path: "/{table_name}",
        description: "Вставить строку(и) в таблицу",
        bodyExample: '{"name":"John Doe","email":"john@example.com","age":30}',
        response: "Вставленная строка (если Prefer: return=representation)",
        notes: [
          "Body = объект (одна строка) или массив (batch insert)",
          "Prefer: return=representation — вернуть вставленные данные",
          "Prefer: return=minimal — пустой ответ (быстрее)",
          "БЕЗ Prefer header: ПУСТОЙ ОТВЕТ при успехе!"
        ]
      },
      update_row: {
        method: "PATCH",
        path: "/{table_name}",
        description: "Обновить строки по фильтру. PATCH, не PUT!",
        bodyExample: '{"age":31}',
        response: "Обновлённые строки",
        notes: [
          "ФИЛЬТР ОБЯЗАТЕЛЕН! Без фильтра обновит ВСЕ строки!",
          "?email=eq.john@example.com — фильтр в query params",
          "PATCH метод (не PUT!)"
        ]
      },
      delete_row: {
        method: "DELETE",
        path: "/{table_name}",
        description: "Удалить строки по фильтру",
        response: "Удалённые строки (если Prefer: return=representation)",
        notes: [
          "ФИЛЬТР ОБЯЗАТЕЛЕН! Без фильтра удалит ВСЕ строки!",
          "?id=eq.123"
        ]
      },
      rpc: {
        method: "POST",
        path: "/rpc/{function_name}",
        description: "Вызвать Postgres функцию (RPC)",
        bodyExample: '{"param1":"value1","param2":"value2"}',
        response: "Результат функции",
        notes: [
          "Функция должна быть создана в Postgres",
          "Body: параметры функции как JSON объект"
        ]
      }
    },
    n8nNotes: [
      "ДВА заголовка auth: apikey + Authorization: Bearer (оба с одним ключом!)",
      "Prefer: return=representation — ОБЯЗАТЕЛЬНО добавить для получения ответа при INSERT/UPDATE!",
      "Фильтры в query: ?column=operator.value (eq, gt, lt, like, in)",
      "UPDATE и DELETE БЕЗ ФИЛЬТРА — опасно! Затронет ВСЕ строки!",
      "service_role key: обходит RLS (для серверных операций)",
      "anon key: подчиняется RLS (для клиентских операций)",
      "n8n имеет встроенную Supabase ноду"
    ],
    rateLimits: "Зависит от плана. Free: 500 req/min.",
    docsUrl: "https://supabase.com/docs/guides/api"
  },

  {
    name: "Airtable",
    description: "Spreadsheet-database hybrid. Bearer token. Base ID + Table в URL.",
    category: ["database", "spreadsheet", "no-code"],
    baseUrl: "https://api.airtable.com/v0",
    auth: {
      type: "bearer",
      setup: "В n8n: Authentication = Generic Credential Type → HTTP Bearer Auth. Вставь Airtable Personal Access Token (pat...)."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      list_records: {
        method: "GET",
        path: "/{baseId}/{tableIdOrName}",
        description: "Получить записи из таблицы",
        response: "records[] — массив записей с id и fields",
        notes: [
          "baseId: из URL базы в Airtable (appXXXXX)",
          "tableIdOrName: имя или ID таблицы",
          "filterByFormula: Airtable formula для фильтрации (напр. {Email}='john@test.com')",
          "maxRecords: макс количество",
          "pageSize: до 100 записей за запрос",
          "offset: для пагинации (из предыдущего ответа)"
        ]
      },
      create_records: {
        method: "POST",
        path: "/{baseId}/{tableIdOrName}",
        description: "Создать записи (batch до 10!)",
        bodyExample: '{"records":[{"fields":{"Name":"John Doe","Email":"john@example.com","Status":"Active"}}]}',
        response: "records[] — массив созданных записей с id",
        notes: [
          "records: МАССИВ (даже для одной записи!)",
          "fields: объект с именами колонок как ключами",
          "BATCH: до 10 записей за запрос! (не 100!)",
          "Для >10: нужно несколько запросов"
        ]
      },
      update_records: {
        method: "PATCH",
        path: "/{baseId}/{tableIdOrName}",
        description: "Обновить записи",
        bodyExample: '{"records":[{"id":"recXXXXXX","fields":{"Status":"Completed"}}]}',
        response: "records[] — обновлённые записи",
        notes: [
          "id ОБЯЗАТЕЛЕН в каждой записи!",
          "PATCH: частичное обновление. PUT: полная замена",
          "Batch: до 10 записей"
        ]
      }
    },
    n8nNotes: [
      "Personal Access Token (pat...) — рекомендуется (не API key!)",
      "Base ID (appXXX) + Table name в URL",
      "BATCH ЛИМИТ: только 10 записей за запрос! (очень мало)",
      "records: всегда МАССИВ (даже для одной записи)",
      "fields: данные по именам колонок",
      "filterByFormula: Airtable formula синтаксис",
      "n8n имеет встроенную Airtable ноду"
    ],
    rateLimits: "5 req/sec per base.",
    docsUrl: "https://airtable.com/developers/web/api/introduction"
  },

  {
    name: "Firebase Firestore",
    description: "Google NoSQL document DB. OAuth2 или Firebase ID token. Сложный REST формат.",
    category: ["database", "nosql", "google", "baas"],
    baseUrl: "https://firestore.googleapis.com/v1",
    auth: {
      type: "bearer",
      setup: "Bearer auth с OAuth2 token или Firebase ID token. Для сервисных запросов: Service Account JSON → OAuth2 token."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      get_document: {
        method: "GET",
        path: "/projects/{projectId}/databases/(default)/documents/{collection}/{documentId}",
        description: "Получить документ по ID",
        response: "fields — объект с typed values (stringValue, integerValue и т.д.)",
        notes: [
          "Путь ОЧЕНЬ длинный: /projects/{pid}/databases/(default)/documents/{collection}/{docId}",
          "Значения typed: {\"name\": {\"stringValue\": \"John\"}} (НЕ просто \"John\"!)",
          "СЛОЖНЫЙ формат — рекомендуется SDK или Supabase/Hasura вместо REST"
        ]
      },
      create_document: {
        method: "POST",
        path: "/projects/{projectId}/databases/(default)/documents/{collection}",
        description: "Создать документ в коллекции",
        bodyExample: '{"fields":{"name":{"stringValue":"John"},"age":{"integerValue":"30"},"active":{"booleanValue":true}}}',
        response: "name — полный путь документа, fields — данные",
        notes: [
          "Typed values: stringValue, integerValue, booleanValue, doubleValue, timestampValue, arrayValue, mapValue",
          "integerValue: СТРОКА ('30', не 30!)",
          "documentId: query param ?documentId=myId (или auto-generated)"
        ]
      },
      run_query: {
        method: "POST",
        path: "/projects/{projectId}/databases/(default)/documents:runQuery",
        description: "Выполнить structured query",
        bodyExample: '{"structuredQuery":{"from":[{"collectionId":"users"}],"where":{"fieldFilter":{"field":{"fieldPath":"age"},"op":"GREATER_THAN","value":{"integerValue":"18"}}},"limit":10}}',
        response: "Массив с document объектами",
        notes: ["Сложная JSON структура для query"]
      }
    },
    n8nNotes: [
      "REST API ОЧЕНЬ СЛОЖНЫЙ — typed values, длинные пути",
      "РЕКОМЕНДАЦИЯ: используй n8n Firebase/Firestore ноду (если есть) или Supabase вместо Firestore REST",
      "Typed values: {stringValue: 'text'}, {integerValue: '30'} (число как строка!)",
      "Для admin: Service Account → google-auth-library → OAuth2 token"
    ],
    rateLimits: "Зависит от плана Firebase.",
    docsUrl: "https://firebase.google.com/docs/firestore/reference/rest"
  },

  {
    name: "Redis",
    description: "TCP-based key-value store. НЕТ HTTP API (кроме Redis Cloud REST). Используй n8n Redis ноду.",
    category: ["database", "cache", "key-value"],
    baseUrl: "tcp://localhost:6379",
    auth: {
      type: "basic",
      setup: "В n8n: используй Redis ноду (НЕ HTTP Request!). Credentials: host, port(6379), password (если есть)."
    },
    defaultHeaders: {},
    endpoints: {},
    n8nNotes: [
      "НЕ HTTP API! Используй n8n Redis ноду",
      "Connection: host, port, password",
      "Операции: Get, Set, Delete, Publish, Info",
      "Для HTTP: Redis Cloud REST API (Upstash Redis) имеет HTTP endpoint",
      "Upstash: https://{endpoint}.upstash.io → GET/POST с Redis командами в URL"
    ],
    rateLimits: "Зависит от сервера.",
    docsUrl: "https://redis.io/docs/"
  },

  {
    name: "SQLite",
    description: "Файловая БД. НЕТ HTTP API. НЕТ сервера. Используй n8n через Execute Command или специальную ноду.",
    category: ["database", "sql", "embedded"],
    baseUrl: "file:///path/to/database.db",
    auth: {
      type: "basic",
      setup: "В n8n: нет нативной SQLite ноды. Используй Execute Command ноду: sqlite3 /path/to/db.db 'SELECT * FROM table'."
    },
    defaultHeaders: {},
    endpoints: {},
    n8nNotes: [
      "НЕТ HTTP API и НЕТ сервера — файловая БД!",
      "Вариант 1: n8n Execute Command нода + sqlite3 CLI",
      "Вариант 2: Community нода n8n-nodes-sqlite",
      "Вариант 3: Оберни SQLite в HTTP через Datasette (datasette.io)",
      "SQLite файл должен быть доступен на сервере n8n"
    ],
    rateLimits: "Нет — локальная файловая БД.",
    docsUrl: "https://www.sqlite.org/docs.html"
  },

  {
    name: "NocoDB",
    description: "Open-source Airtable альтернатива. Bearer token или xc-token header. REST API.",
    category: ["database", "spreadsheet", "no-code", "open-source"],
    baseUrl: "https://{host}/api/v1",
    auth: {
      type: "header",
      setup: "В n8n HTTP Request: добавь заголовок xc-token: YOUR_API_TOKEN. Или xc-auth для JWT.",
      headerName: "xc-token"
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      list_rows: {
        method: "GET",
        path: "/db/data/v1/{tableId}",
        description: "Получить строки из таблицы",
        response: "list[] — массив строк, pageInfo — пагинация",
        notes: [
          "where: фильтр (column,op,value) напр. (Status,eq,Active)",
          "sort: сортировка (-column для DESC)",
          "limit, offset: пагинация"
        ]
      },
      create_row: {
        method: "POST",
        path: "/db/data/v1/{tableId}",
        description: "Создать строку",
        bodyExample: '{"Name":"John Doe","Email":"john@example.com","Status":"Active"}',
        response: "Созданная строка с Id",
        notes: [
          "Body: простой объект (ключи = имена колонок)",
          "Проще чем Airtable (нет обёртки в records/fields)"
        ]
      },
      update_row: {
        method: "PATCH",
        path: "/db/data/v1/{tableId}/{rowId}",
        description: "Обновить строку по ID",
        bodyExample: '{"Status":"Completed"}',
        response: "Обновлённая строка",
        notes: ["rowId в URL пути"]
      }
    },
    n8nNotes: [
      "Auth: заголовок xc-token (API token из NocoDB Dashboard)",
      "Self-hosted или NocoDB Cloud",
      "Проще чем Airtable API: нет обёртки records/fields",
      "Body = простой объект с именами колонок",
      "n8n имеет встроенную NocoDB ноду (но может быть outdated)"
    ],
    rateLimits: "Зависит от хостинга.",
    docsUrl: "https://docs.nocodb.com/"
  },

  {
    name: "Baserow",
    description: "Open-source Airtable альтернатива. Bearer JWT token. Простой REST API.",
    category: ["database", "spreadsheet", "no-code", "open-source"],
    baseUrl: "https://api.baserow.io/api",
    auth: {
      type: "bearer",
      setup: "В n8n: Bearer auth. Получи JWT: POST /api/user/token-auth/ с {email, password}. Или Database Token из Baserow UI (Token YOUR_TOKEN в Authorization header)."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      list_rows: {
        method: "GET",
        path: "/database/rows/table/{table_id}/",
        description: "Получить строки из таблицы",
        response: "results[] — массив строк, count — общее кол-во",
        notes: [
          "table_id: ID таблицы (число)",
          "filter__field_{id}__contains=value — фильтрация",
          "order_by: -field_{id} для DESC",
          "size, page: пагинация",
          "user_field_names=true: имена полей вместо field_{id}"
        ]
      },
      create_row: {
        method: "POST",
        path: "/database/rows/table/{table_id}/",
        description: "Создать строку",
        bodyExample: '{"field_123":"John Doe","field_456":"john@example.com"}',
        response: "id — row ID, field_XXX — данные",
        notes: [
          "Поля по ID: field_123, field_456 (не по имени!)",
          "user_field_names=true в query: можно использовать имена полей",
          "С user_field_names=true: {\"Name\": \"John\"} вместо {\"field_123\": \"John\"}"
        ]
      },
      update_row: {
        method: "PATCH",
        path: "/database/rows/table/{table_id}/{row_id}/",
        description: "Обновить строку",
        bodyExample: '{"field_123":"Updated Name"}',
        response: "Обновлённая строка",
        notes: ["PATCH для частичного обновления"]
      }
    },
    n8nNotes: [
      "ДВА типа auth: JWT token (POST /api/user/token-auth/) или Database Token",
      "Database Token проще: Authorization: Token YOUR_TOKEN",
      "Поля по ID (field_123) по умолчанию! Добавь ?user_field_names=true для имён",
      "Trailing slash в URL: /table/{id}/ (обязательный!)",
      "Self-hosted или Baserow Cloud (api.baserow.io)"
    ],
    rateLimits: "Зависит от плана. Baserow Cloud: rate limits.",
    docsUrl: "https://baserow.io/docs/apis/introduction"
  },

  {
    name: "Pinecone",
    description: "Managed vector DB. Кастомный заголовок Api-Key. ДВА base URL: control plane + index host.",
    category: ["vector-db", "rag", "embeddings"],
    baseUrl: "https://api.pinecone.io",
    auth: {
      type: "header",
      setup: "В n8n HTTP Request: добавь заголовок Api-Key: YOUR_PINECONE_API_KEY.",
      headerName: "Api-Key"
    },
    defaultHeaders: {
      "Content-Type": "application/json",
      "X-Pinecone-Api-Version": "2025-10"
    },
    endpoints: {
      upsert: {
        method: "POST",
        path: "/vectors/upsert",
        description: "Вставить/обновить вектор(ы). URL = INDEX HOST (не api.pinecone.io!)",
        bodyExample: '{"vectors":[{"id":"vec1","values":[0.1,0.2,0.3,0.4],"metadata":{"text":"Hello world","source":"doc1"}}],"namespace":"my-namespace"}',
        response: "upsertedCount — количество вставленных векторов",
        notes: [
          "URL: https://{INDEX_HOST}/vectors/upsert (НЕ api.pinecone.io!)",
          "INDEX_HOST: уникальный для каждого index (получи через GET /indexes/{name})",
          "vectors[]: массив объектов с id, values[], metadata{}",
          "values: массив float (размерность = dimension index)",
          "namespace: опционален, для разделения данных",
          "Batch: до 100 векторов или 2MB за запрос"
        ]
      },
      query: {
        method: "POST",
        path: "/query",
        description: "Поиск ближайших векторов. URL = INDEX HOST.",
        bodyExample: '{"vector":[0.1,0.2,0.3,0.4],"topK":5,"includeMetadata":true,"namespace":"my-namespace","filter":{"source":{"$eq":"doc1"}}}',
        response: "matches[] — массив с id, score, metadata",
        notes: [
          "URL: https://{INDEX_HOST}/query",
          "vector: query вектор (float массив той же размерности)",
          "topK: сколько результатов (1-10000)",
          "includeMetadata: true — вернуть metadata (нужно для RAG!)",
          "filter: MongoDB-like синтаксис ($eq, $ne, $gt, $in и т.д.)"
        ]
      },
      create_index: {
        method: "POST",
        path: "/indexes",
        description: "Создать index. URL = api.pinecone.io (control plane)",
        bodyExample: '{"name":"my-index","dimension":1536,"metric":"cosine","spec":{"serverless":{"cloud":"aws","region":"us-east-1"}}}',
        response: "name, host — INDEX_HOST для data operations",
        notes: [
          "URL: https://api.pinecone.io/indexes (control plane!)",
          "dimension: ОБЯЗАТЕЛЕН — размерность векторов (OpenAI = 1536, 3072)",
          "metric: cosine, euclidean, dotproduct"
        ]
      }
    },
    n8nNotes: [
      "ДВА URL! Control plane: api.pinecone.io. Data plane: {INDEX_HOST} (уникальный per index)",
      "Auth: заголовок Api-Key (с большой A!)",
      "X-Pinecone-Api-Version: 2025-10 рекомендуется",
      "includeMetadata:true обязателен для RAG (иначе не вернёт текст!)",
      "Eventually consistent: вектор может быть недоступен сразу после upsert",
      "n8n имеет встроенную Pinecone Vector Store ноду"
    ],
    rateLimits: "Зависит от плана. Serverless: ~100 write units/sec.",
    docsUrl: "https://docs.pinecone.io/reference/api/introduction"
  },

  {
    name: "Qdrant",
    description: "Open-source vector DB. Bearer или api-key header. Self-hosted или Qdrant Cloud.",
    category: ["vector-db", "rag", "embeddings", "open-source"],
    baseUrl: "http://localhost:6333",
    auth: {
      type: "header",
      setup: "Self-hosted без auth: нет заголовков. Qdrant Cloud: добавь заголовок api-key: YOUR_QDRANT_API_KEY.",
      headerName: "api-key"
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      upsert_points: {
        method: "PUT",
        path: "/collections/{collection_name}/points",
        description: "Вставить/обновить точки (vectors). PUT, не POST!",
        bodyExample: '{"points":[{"id":1,"vector":[0.1,0.2,0.3,0.4],"payload":{"text":"Hello world","source":"doc1"}},{"id":2,"vector":[0.5,0.6,0.7,0.8],"payload":{"text":"Another text","source":"doc2"}}]}',
        response: "status: 'ok', result.operation_id",
        notes: [
          "PUT метод (не POST!)",
          "id: число или UUID строка",
          "vector: float массив",
          "payload: произвольный JSON (аналог metadata)",
          "Batch: до 100+ точек за запрос",
          "?wait=true: дождаться индексации"
        ]
      },
      search: {
        method: "POST",
        path: "/collections/{collection_name}/points/search",
        description: "Поиск ближайших векторов",
        bodyExample: '{"vector":[0.1,0.2,0.3,0.4],"limit":5,"with_payload":true,"filter":{"must":[{"key":"source","match":{"value":"doc1"}}]}}',
        response: "result[] — массив с id, score, payload",
        notes: [
          "with_payload: true — вернуть payload (как includeMetadata в Pinecone)",
          "filter: must/should/must_not с match/range условиями",
          "score_threshold: минимальный score"
        ]
      },
      create_collection: {
        method: "PUT",
        path: "/collections/{collection_name}",
        description: "Создать коллекцию. PUT, не POST!",
        bodyExample: '{"vectors":{"size":1536,"distance":"Cosine"}}',
        response: "result: true",
        notes: [
          "PUT метод!",
          "size: размерность вектора",
          "distance: Cosine, Euclid, Dot, Manhattan"
        ]
      }
    },
    n8nNotes: [
      "Self-hosted: http://localhost:6333 (без auth)",
      "Qdrant Cloud: api-key заголовок + https URL",
      "PUT для upsert и create (не POST!)",
      "payload = metadata (произвольный JSON)",
      "with_payload:true обязателен для RAG",
      "n8n имеет встроенную Qdrant Vector Store ноду"
    ],
    rateLimits: "Self-hosted: нет лимитов. Cloud: зависит от плана.",
    docsUrl: "https://qdrant.tech/documentation/concepts/"
  },

  {
    name: "Weaviate",
    description: "Open-source vector DB с GraphQL и REST API. Встроенные vectorizers.",
    category: ["vector-db", "rag", "embeddings", "open-source"],
    baseUrl: "http://localhost:8080/v1",
    auth: {
      type: "header",
      setup: "Self-hosted: без auth. Weaviate Cloud: заголовок Authorization: Bearer YOUR_WEAVIATE_API_KEY.",
      headerName: "Authorization"
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_objects: {
        method: "POST",
        path: "/objects",
        description: "Создать объект (с автоматической векторизацией или с явным вектором)",
        bodyExample: '{"class":"Document","properties":{"text":"Hello world","source":"doc1"},"vector":[0.1,0.2,0.3,0.4]}',
        response: "id — UUID объекта",
        notes: [
          "class: имя коллекции (с большой буквы!)",
          "properties: данные объекта (text, metadata и т.д.)",
          "vector: опционален если настроен vectorizer модуль (text2vec-openai и т.д.)",
          "Если vectorizer настроен: Weaviate сам генерирует embedding!"
        ]
      },
      batch_create: {
        method: "POST",
        path: "/batch/objects",
        description: "Batch вставка объектов",
        bodyExample: '{"objects":[{"class":"Document","properties":{"text":"Text 1"},"vector":[0.1,0.2,0.3]},{"class":"Document","properties":{"text":"Text 2"},"vector":[0.4,0.5,0.6]}]}',
        response: "Массив результатов по каждому объекту",
        notes: ["Batch: рекомендуется для больших объёмов"]
      },
      graphql_search: {
        method: "POST",
        path: "/graphql",
        description: "GraphQL поиск (nearVector, nearText, hybrid)",
        bodyExample: '{"query":"{Get{Document(nearVector:{vector:[0.1,0.2,0.3,0.4],certainty:0.7}){text source _additional{distance}}}}"}',
        response: "data.Get.Document[] — массив результатов",
        notes: [
          "GRAPHQL для поиска!",
          "nearVector: поиск по вектору",
          "nearText: поиск по тексту (если vectorizer настроен)",
          "hybrid: комбинация semantic + keyword search",
          "_additional: distance, certainty, id"
        ]
      }
    },
    n8nNotes: [
      "Поиск через GRAPHQL (POST /v1/graphql с {\"query\": \"...\"})",
      "CRUD через REST (POST /v1/objects)",
      "class name с БОЛЬШОЙ буквы! (Document, не document)",
      "Встроенная векторизация: text2vec-openai, text2vec-cohere и др.",
      "Если vectorizer настроен: не нужно передавать vector — Weaviate сам сгенерит",
      "n8n имеет встроенную Weaviate Vector Store ноду"
    ],
    rateLimits: "Self-hosted: нет. Cloud: зависит от плана.",
    docsUrl: "https://weaviate.io/developers/weaviate/api/rest"
  },

  {
    name: "PGVector",
    description: "PostgreSQL расширение для векторов. НЕТ HTTP API. SQL через Postgres/Supabase.",
    category: ["vector-db", "rag", "postgresql"],
    baseUrl: "tcp://localhost:5432",
    auth: {
      type: "basic",
      setup: "Через PostgreSQL: n8n Postgres нода. Через Supabase: HTTP REST API (см. Supabase)."
    },
    defaultHeaders: {},
    endpoints: {
      sql_insert: {
        method: "SQL",
        path: "INSERT INTO documents (content, embedding) VALUES ($1, $2)",
        description: "Вставить вектор через SQL",
        notes: [
          "НЕ HTTP! SQL через Postgres подключение",
          "embedding тип: vector(1536)",
          "Установи расширение: CREATE EXTENSION vector;",
          "Создай таблицу: CREATE TABLE documents (id serial, content text, embedding vector(1536));"
        ]
      },
      sql_search: {
        method: "SQL",
        path: "SELECT * FROM documents ORDER BY embedding <=> $1 LIMIT 5",
        description: "Поиск ближайших векторов через SQL",
        notes: [
          "<=> : cosine distance",
          "<-> : L2 (euclidean) distance",
          "<#> : inner product (negative)",
          "Создай index: CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops);"
        ]
      }
    },
    n8nNotes: [
      "НЕ HTTP API! Используй n8n Postgres ноду с SQL запросами",
      "Установи расширение: CREATE EXTENSION vector;",
      "Операторы: <=> (cosine), <-> (euclidean), <#> (inner product)",
      "Через Supabase: можно использовать RPC функцию для HTTP доступа",
      "Самый простой способ добавить RAG к существующему Postgres"
    ],
    rateLimits: "Зависит от сервера Postgres.",
    docsUrl: "https://github.com/pgvector/pgvector"
  },

  {
    name: "ChromaDB",
    description: "Open-source embedding DB. Простейший API. Self-hosted.",
    category: ["vector-db", "rag", "embeddings", "open-source"],
    baseUrl: "http://localhost:8000/api/v2",
    auth: {
      type: "bearer",
      setup: "Self-hosted по умолчанию без auth. Для auth: настрой token в конфиге. Bearer token если включен."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      add: {
        method: "POST",
        path: "/tenants/{tenant}/databases/{database}/collections/{collection_id}/add",
        description: "Добавить документы с embeddings",
        bodyExample: '{"ids":["doc1","doc2"],"embeddings":[[0.1,0.2,0.3],[0.4,0.5,0.6]],"documents":["Hello world","Another text"],"metadatas":[{"source":"a"},{"source":"b"}]}',
        response: "true при успехе",
        notes: [
          "ids: ОБЯЗАТЕЛЬНЫ (уникальные строки для каждого документа)",
          "embeddings: массив массивов float (если не настроен embedding function)",
          "documents: оригинальные тексты (для retrieval)",
          "metadatas: массив metadata объектов",
          "Если embedding function настроена: можно передать только documents (embeddings сгенерятся автоматически)"
        ]
      },
      query: {
        method: "POST",
        path: "/tenants/{tenant}/databases/{database}/collections/{collection_id}/query",
        description: "Поиск похожих документов",
        bodyExample: '{"query_embeddings":[[0.1,0.2,0.3]],"n_results":5,"include":["documents","metadatas","distances"]}',
        response: "ids[], documents[], metadatas[], distances[]",
        notes: [
          "query_embeddings: массив query векторов",
          "n_results: количество результатов",
          "include: что вернуть (documents, metadatas, distances, embeddings)",
          "where: filter по metadata ({\"source\": \"a\"})",
          "where_document: filter по содержимому документа"
        ]
      },
      create_collection: {
        method: "POST",
        path: "/tenants/{tenant}/databases/{database}/collections",
        description: "Создать коллекцию",
        bodyExample: '{"name":"my-collection","metadata":{"hnsw:space":"cosine"}}',
        response: "id — UUID коллекции, name",
        notes: ["hnsw:space: cosine, l2, ip (inner product)"]
      }
    },
    n8nNotes: [
      "Self-hosted: docker run -p 8000:8000 chromadb/chroma",
      "Простейший vector DB API — идеален для прототипов",
      "ids ОБЯЗАТЕЛЬНЫ при добавлении (нет auto-generate!)",
      "include: указать какие данные вернуть в query",
      "v2 API (проверь версию Chroma)"
    ],
    rateLimits: "Self-hosted: нет лимитов.",
    docsUrl: "https://docs.trychroma.com/reference/"
  },

  {
    name: "Milvus / Zilliz Cloud",
    description: "Масштабируемый vector DB. REST API (v2) или gRPC. Bearer token для Zilliz Cloud.",
    category: ["vector-db", "rag", "embeddings"],
    baseUrl: "https://{cluster}.api.gcp-us-west1.zillizcloud.com",
    auth: {
      type: "bearer",
      setup: "Zilliz Cloud: Bearer auth с API Key. Self-hosted Milvus: Token auth или без auth."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      insert: {
        method: "POST",
        path: "/v2/vectordb/entities/insert",
        description: "Вставить вектор(ы)",
        bodyExample: '{"collectionName":"my_collection","data":[{"id":1,"vector":[0.1,0.2,0.3,0.4],"text":"Hello world","source":"doc1"}]}',
        response: "data.insertCount — количество вставленных",
        notes: [
          "v2 REST API",
          "data: массив объектов (dynamic schema)",
          "vector: поле с float массивом",
          "collectionName обязателен"
        ]
      },
      search: {
        method: "POST",
        path: "/v2/vectordb/entities/search",
        description: "Поиск ближайших векторов",
        bodyExample: '{"collectionName":"my_collection","data":[0.1,0.2,0.3,0.4],"annsField":"vector","limit":5,"outputFields":["text","source"]}',
        response: "data[] — массив результатов с id, distance, и запрошенными полями",
        notes: [
          "data: query вектор (один массив float)",
          "annsField: имя поля с вектором",
          "outputFields: какие поля вернуть (для RAG: текстовые поля!)",
          "filter: 'source == \"doc1\"' — scalar filter"
        ]
      },
      create_collection: {
        method: "POST",
        path: "/v2/vectordb/collections/create",
        description: "Создать коллекцию",
        bodyExample: '{"collectionName":"my_collection","dimension":1536,"metricType":"COSINE"}',
        response: "code: 0 при успехе",
        notes: [
          "dimension: размерность вектора",
          "metricType: COSINE, L2, IP"
        ]
      }
    },
    n8nNotes: [
      "Zilliz Cloud (managed): Bearer auth + cloud URL",
      "Self-hosted Milvus: localhost:19530 (gRPC) или :9091 (REST)",
      "v2 REST API: /v2/vectordb/...",
      "outputFields обязателен для получения данных (для RAG!)",
      "Dynamic schema: можно добавлять произвольные поля"
    ],
    rateLimits: "Zilliz: зависит от CU (Capacity Units).",
    docsUrl: "https://docs.zilliz.com/reference/restful/data-plane-v2/"
  },

  {
    name: "Elasticsearch",
    description: "Search engine с vector search (kNN). Basic Auth или API key. Self-hosted или Elastic Cloud.",
    category: ["search", "vector-db", "rag", "full-text"],
    baseUrl: "https://localhost:9200",
    auth: {
      type: "basic",
      setup: "Basic Auth: elastic:password. Или API key: заголовок Authorization: ApiKey BASE64_ENCODED_KEY. Elastic Cloud: cloud URL + API key."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      index_document: {
        method: "POST",
        path: "/{index}/_doc/{id}",
        description: "Индексировать документ (с вектором)",
        bodyExample: '{"text":"Hello world","source":"doc1","embedding":[0.1,0.2,0.3,0.4]}',
        response: "_id — document ID, result: 'created'",
        notes: [
          "embedding поле должно быть типа dense_vector в mapping",
          "Без {id}: auto-generated ID (POST /{index}/_doc)"
        ]
      },
      knn_search: {
        method: "POST",
        path: "/{index}/_search",
        description: "kNN vector search",
        bodyExample: '{"knn":{"field":"embedding","query_vector":[0.1,0.2,0.3,0.4],"k":5,"num_candidates":100},"_source":["text","source"]}',
        response: "hits.hits[] — массив с _source (данные) и _score",
        notes: [
          "knn.field: имя поля dense_vector",
          "k: количество результатов",
          "num_candidates: сколько кандидатов рассмотреть (больше = точнее, медленнее)",
          "_source: какие поля вернуть",
          "Можно комбинировать с обычным text search (hybrid!)"
        ]
      },
      create_index: {
        method: "PUT",
        path: "/{index}",
        description: "Создать index с mapping для vectors",
        bodyExample: '{"mappings":{"properties":{"text":{"type":"text"},"source":{"type":"keyword"},"embedding":{"type":"dense_vector","dims":1536,"index":true,"similarity":"cosine"}}}}',
        response: "acknowledged: true",
        notes: [
          "PUT метод!",
          "dense_vector: тип для embeddings",
          "dims: размерность",
          "similarity: cosine, l2_norm, dot_product",
          "index:true: включить kNN индексацию"
        ]
      },
      bulk: {
        method: "POST",
        path: "/_bulk",
        description: "Batch операции. NDJSON формат!",
        contentType: "application/x-ndjson",
        bodyExample: '{"index":{"_index":"my-index","_id":"1"}}\n{"text":"doc1","embedding":[0.1,0.2]}\n{"index":{"_index":"my-index","_id":"2"}}\n{"text":"doc2","embedding":[0.3,0.4]}\n',
        response: "items[] — результат для каждой операции",
        notes: [
          "NDJSON: каждая строка = отдельный JSON (разделённые \\n)!",
          "Content-Type: application/x-ndjson",
          "Чередование: action line → data line → action line → data line",
          "Финальный \\n ОБЯЗАТЕЛЕН!"
        ]
      }
    },
    n8nNotes: [
      "Self-hosted: https://localhost:9200 (Basic Auth: elastic:password)",
      "Elastic Cloud: https://{deployment}.es.{region}.aws.cloud.es.io",
      "Bulk: NDJSON формат (application/x-ndjson) — НЕ обычный JSON!",
      "kNN search: кombинируется с full-text (hybrid search)",
      "dense_vector mapping нужно создать ПЕРЕД индексацией",
      "n8n имеет встроенную Elasticsearch ноду"
    ],
    rateLimits: "Self-hosted: нет. Cloud: зависит от плана.",
    docsUrl: "https://www.elastic.co/guide/en/elasticsearch/reference/current/rest-apis.html"
  },

  {
    name: "Upstash Vector",
    description: "Serverless vector DB с HTTP API. Bearer token. Самый простой cloud vector DB.",
    category: ["vector-db", "rag", "serverless"],
    baseUrl: "https://{endpoint}.upstash.io",
    auth: {
      type: "bearer",
      setup: "В n8n: Bearer auth с Upstash Vector REST Token. Получи из Upstash Console → Vector → REST Token."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      upsert: {
        method: "POST",
        path: "/upsert",
        description: "Вставить/обновить вектор(ы)",
        bodyExample: '[{"id":"doc1","vector":[0.1,0.2,0.3,0.4],"metadata":{"text":"Hello world","source":"doc1"}},{"id":"doc2","vector":[0.5,0.6,0.7,0.8],"metadata":{"text":"Another text"}}]',
        response: "result: 'Success'",
        notes: [
          "Body = МАССИВ объектов (не обёрнут!)",
          "metadata: произвольный JSON",
          "Для текста без вектора (auto-embedding): data field вместо vector"
        ]
      },
      query: {
        method: "POST",
        path: "/query",
        description: "Поиск ближайших векторов",
        bodyExample: '{"vector":[0.1,0.2,0.3,0.4],"topK":5,"includeMetadata":true,"includeVectors":false,"filter":"source = \'doc1\'"}',
        response: "result[] — массив с id, score, metadata",
        notes: [
          "includeMetadata: true для RAG!",
          "filter: SQL-like синтаксис ('field = value AND field2 > 5')",
          "Для text query (auto-embedding): data вместо vector"
        ]
      },
      upsert_data: {
        method: "POST",
        path: "/upsert-data",
        description: "Вставить текст (Upstash автоматически сгенерирует embedding!)",
        bodyExample: '[{"id":"doc1","data":"Hello world, this is my document text","metadata":{"source":"doc1"}}]',
        response: "result: 'Success'",
        notes: [
          "data вместо vector: Upstash сам генерирует embedding!",
          "Нужен index с embedding model (создай в Console с выбранной моделью)",
          "Самый простой способ: текст → автоматический вектор"
        ]
      }
    },
    n8nNotes: [
      "Самый простой serverless vector DB",
      "Bearer auth с REST Token",
      "Встроенный embedding: /upsert-data с data полем (не нужен свой embedding!)",
      "includeMetadata:true для RAG",
      "filter: SQL-like ('field = value')",
      "Pay-per-request: идеален для low-traffic RAG"
    ],
    rateLimits: "1000 req/sec на Free plan.",
    docsUrl: "https://upstash.com/docs/vector/api/endpoints"
  },

  {
    name: "Tavily",
    description: "AI-оптимизированный поисковый API. Bearer token. Лучший search API для AI агентов.",
    category: ["search", "ai", "web-search"],
    baseUrl: "https://api.tavily.com",
    auth: {
      type: "bearer",
      setup: "В n8n: Bearer auth с Tavily API Key. Или передай api_key в body."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      search: {
        method: "POST",
        path: "/search",
        description: "AI-оптимизированный веб-поиск. Возвращает clean content.",
        bodyExample: '{"query":"What is the latest news about AI?","search_depth":"advanced","include_answer":true,"include_raw_content":false,"max_results":5,"include_domains":[],"exclude_domains":[]}',
        response: "answer — AI-сгенерированный ответ, results[] — массив с title, url, content",
        notes: [
          "search_depth: 'basic' (быстрый) или 'advanced' (глубокий, дороже)",
          "include_answer: true — Tavily сгенерирует ответ из результатов!",
          "results[].content: уже очищенный текст (не HTML)",
          "include_raw_content: true — полный контент страниц",
          "api_key можно передать в body вместо Bearer header"
        ]
      },
      extract: {
        method: "POST",
        path: "/extract",
        description: "Извлечь контент из конкретных URL",
        bodyExample: '{"urls":["https://example.com/article1","https://example.com/article2"]}',
        response: "results[] — массив с url, raw_content",
        notes: ["Для извлечения контента из известных URL"]
      }
    },
    n8nNotes: [
      "Простейший search API для AI — один POST запрос",
      "include_answer:true — получи готовый ответ без своего LLM",
      "search_depth:'advanced' — лучше для сложных запросов",
      "api_key можно в body ИЛИ Bearer header"
    ],
    rateLimits: "Free: 1000 req/month. Paid: varies.",
    docsUrl: "https://docs.tavily.com/documentation/api-reference/search"
  },

  {
    name: "Firecrawl",
    description: "Web → LLM-ready markdown. Bearer token. Scrape, crawl, map, extract endpoints.",
    category: ["scraping", "ai", "web-to-markdown"],
    baseUrl: "https://api.firecrawl.dev/v2",
    auth: {
      type: "bearer",
      setup: "В n8n: Bearer auth с Firecrawl API Key (fc-...)."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      scrape: {
        method: "POST",
        path: "/scrape",
        description: "Скрапить одну страницу → markdown/HTML/JSON",
        bodyExample: '{"url":"https://example.com","formats":["markdown"],"onlyMainContent":true}',
        response: "data.markdown — clean markdown контент, data.metadata — title, sourceURL",
        notes: [
          "formats: markdown, html, rawHtml, links, screenshot, json, branding",
          "onlyMainContent: true — убрать nav/footer (рекомендуется!)",
          "waitFor: мс ожидания JS рендеринга",
          "actions: клики, скролл и т.д. перед скрапингом",
          "Для structured extraction: formats:['json'] + jsonOptions.prompt"
        ]
      },
      crawl: {
        method: "POST",
        path: "/crawl",
        description: "Краулить весь сайт. ASYNC! POST → polling GET.",
        bodyExample: '{"url":"https://docs.example.com","limit":50,"scrapeOptions":{"formats":["markdown"]}}',
        response: "id — crawl job ID для polling",
        notes: [
          "ASYNC! Возвращает job ID, polling через GET /v2/crawl/{id}",
          "limit: макс кол-во страниц",
          "webhook: URL для callback при завершении",
          "includePaths/excludePaths: regex фильтры URL"
        ]
      },
      crawl_status: {
        method: "GET",
        path: "/crawl/{id}",
        description: "Получить статус и результаты crawl",
        response: "status: 'completed'|'scraping'|'failed', data[] — массив страниц",
        notes: ["Polling: проверяй status пока не 'completed'"]
      },
      map: {
        method: "POST",
        path: "/map",
        description: "Получить все URL сайта (быстро, без скрапинга контента)",
        bodyExample: '{"url":"https://example.com"}',
        response: "links[] — массив URL",
        notes: ["Быстрее crawl — только обнаружение URL"]
      }
    },
    n8nNotes: [
      "/scrape — одна страница (sync), /crawl — весь сайт (async!)",
      "Crawl: POST → получи ID → GET /crawl/{id} для polling",
      "formats:['markdown'] — лучший формат для LLM",
      "onlyMainContent:true рекомендуется (убирает шум)",
      "v2 API (текущий). v1 deprecated.",
      "1 credit per scrape, 1 credit per crawled page"
    ],
    rateLimits: "Free: 500 credits/month. Paid: varies.",
    docsUrl: "https://docs.firecrawl.dev/"
  },

  {
    name: "Apify",
    description: "Scraping platform с 4000+ готовых actors. Bearer token. ASYNC: run actor → get results.",
    category: ["scraping", "automation", "actors"],
    baseUrl: "https://api.apify.com/v2",
    auth: {
      type: "bearer",
      setup: "В n8n: Bearer auth с Apify API Token. Или token в query: ?token=YOUR_TOKEN."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      run_actor: {
        method: "POST",
        path: "/acts/{actorId}/runs",
        description: "Запустить actor (скрапер). ASYNC!",
        bodyExample: '{"startUrls":[{"url":"https://example.com"}],"maxCrawledPages":10}',
        response: "data.id — run ID для polling, data.status",
        notes: [
          "ASYNC! Возвращает run ID, результаты потом через GET",
          "actorId: username/actor-name (напр. apify/web-scraper)",
          "Body = input для конкретного actor (зависит от actor!)",
          "?waitForFinish=120 — подождать до 120 сек (sync-like)"
        ]
      },
      get_run_dataset: {
        method: "GET",
        path: "/actor-runs/{runId}/dataset/items",
        description: "Получить результаты запущенного actor",
        response: "Массив результатов (формат зависит от actor)",
        notes: [
          "Дождись завершения run (status: SUCCEEDED)",
          "format: json (по умолчанию), csv, xlsx, xml",
          "clean, limit, offset для фильтрации"
        ]
      },
      run_actor_sync: {
        method: "POST",
        path: "/acts/{actorId}/run-sync-get-dataset-items",
        description: "Запустить actor и сразу получить результаты (SYNC!)",
        response: "Массив результатов напрямую",
        notes: [
          "SYNC endpoint! Блокирует до завершения",
          "Таймаут: ?timeout=120 (сек)",
          "Проще для n8n — один запрос вместо двух"
        ]
      }
    },
    n8nNotes: [
      "run-sync-get-dataset-items — ЛУЧШИЙ endpoint для n8n (sync, один запрос)",
      "Body = input конкретного actor (смотри доку actor-а!)",
      "Популярные actors: apify/web-scraper, apify/google-search-scraper, apify/instagram-scraper",
      "?token=YOUR_TOKEN в query — альтернатива Bearer",
      "n8n имеет встроенную Apify ноду"
    ],
    rateLimits: "Free: $5/month credits. Paid: varies.",
    docsUrl: "https://docs.apify.com/api/v2"
  },

  {
    name: "Browserless",
    description: "Headless Chrome API. Bearer token. HTML рендеринг, PDF генерация, скриншоты.",
    category: ["scraping", "headless-browser", "pdf"],
    baseUrl: "https://chrome.browserless.io",
    auth: {
      type: "query",
      setup: "API token в query: ?token=YOUR_TOKEN. Или заголовок Authorization: Bearer YOUR_TOKEN."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      get_content: {
        method: "POST",
        path: "/content",
        description: "Получить rendered HTML страницы (с JS)",
        bodyExample: '{"url":"https://example.com","waitForSelector":"#content"}',
        response: "HTML контент (text/html)",
        notes: [
          "Рендерит JavaScript!",
          "waitForSelector: ждать появления элемента",
          "waitForTimeout: ждать мс",
          "Ответ: HTML текст (не JSON!)"
        ]
      },
      screenshot: {
        method: "POST",
        path: "/screenshot",
        description: "Скриншот страницы. БИНАРНЫЙ ответ!",
        bodyExample: '{"url":"https://example.com","options":{"fullPage":true,"type":"png"}}',
        response: "Бинарный PNG/JPEG",
        notes: [
          "Ответ бинарный. В n8n: Response Format = File",
          "options.type: png, jpeg, webp",
          "options.fullPage: true — вся страница"
        ]
      },
      pdf: {
        method: "POST",
        path: "/pdf",
        description: "HTML → PDF. БИНАРНЫЙ ответ!",
        bodyExample: '{"url":"https://example.com","options":{"printBackground":true,"format":"A4"}}',
        response: "Бинарный PDF",
        notes: [
          "Ответ бинарный. В n8n: Response Format = File",
          "Для HTML→PDF: html поле вместо url"
        ]
      }
    },
    n8nNotes: [
      "?token=YOUR_TOKEN в каждом URL",
      "Рендерит JS — получаешь финальный HTML",
      "screenshot и pdf: Response Format = File в n8n!",
      "Self-hosted: docker run -p 3000:3000 browserless/chrome"
    ],
    rateLimits: "Free: 6 hours/month. Paid: varies.",
    docsUrl: "https://docs.browserless.io/"
  },

  {
    name: "SerpAPI",
    description: "Google/Bing/YouTube SERP results через API. API key в query. GET запросы.",
    category: ["search", "serp", "google"],
    baseUrl: "https://serpapi.com",
    auth: {
      type: "query",
      setup: "API key в query: ?api_key=YOUR_KEY"
    },
    defaultHeaders: {},
    endpoints: {
      google_search: {
        method: "GET",
        path: "/search",
        description: "Google search results",
        response: "organic_results[] — массив с title, link, snippet",
        notes: [
          "?engine=google&q=search+query&api_key=YOUR_KEY",
          "engine: google, bing, youtube, google_maps, google_images и др.",
          "organic_results: основные результаты",
          "answer_box: featured snippet",
          "knowledge_graph: инфо-панель"
        ]
      }
    },
    n8nNotes: [
      "Все через GET с query params",
      "?engine= определяет поисковую систему",
      "Возвращает structured JSON (не HTML!)",
      "Альтернатива: Tavily (проще для AI)"
    ],
    rateLimits: "Free: 100 searches/month.",
    docsUrl: "https://serpapi.com/search-api"
  },

  {
    name: "ScrapingBee",
    description: "Web scraping API с прокси и JS рендерингом. API key в query/header.",
    category: ["scraping", "proxy"],
    baseUrl: "https://app.scrapingbee.com/api/v1",
    auth: {
      type: "query",
      setup: "API key в query: ?api_key=YOUR_KEY"
    },
    defaultHeaders: {},
    endpoints: {
      scrape: {
        method: "GET",
        path: "/",
        description: "Скрапить URL с прокси и JS рендерингом",
        response: "HTML контент страницы (text/html)",
        notes: [
          "?api_key=KEY&url=https://example.com&render_js=true",
          "render_js: true — рендерить JavaScript",
          "premium_proxy: true — residential прокси",
          "extract_rules: JSON объект для CSS selector extraction",
          "return_page_source: true — оригинальный HTML",
          "Ответ: HTML (не JSON!) если без extract_rules"
        ]
      }
    },
    n8nNotes: [
      "Все параметры через GET query params",
      "Ответ = HTML по умолчанию (не JSON!)",
      "С extract_rules: возвращает JSON с extracted data",
      "render_js=true для JS-heavy сайтов"
    ],
    rateLimits: "Free: 1000 credits.",
    docsUrl: "https://www.scrapingbee.com/documentation/"
  },

  {
    name: "Bright Data",
    description: "Крупнейший прокси-сервис + Web Scraper API. Bearer token.",
    category: ["scraping", "proxy", "data"],
    baseUrl: "https://api.brightdata.com",
    auth: {
      type: "bearer",
      setup: "Bearer auth с Bright Data API Token."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      trigger_collection: {
        method: "POST",
        path: "/datasets/v3/trigger",
        description: "Запустить сбор данных. ASYNC!",
        bodyExample: '{"discover":{"url":"https://example.com"},"scrape":{"limit":100}}',
        response: "snapshot_id — ID для получения результатов",
        notes: [
          "ASYNC: POST trigger → GET snapshot/{id}",
          "Используй готовые collectors для популярных сайтов",
          "Прокси встроены — не нужна отдельная настройка"
        ]
      }
    },
    n8nNotes: [
      "Основной use case: готовые dataset collectors (Amazon, LinkedIn и т.д.)",
      "ASYNC: trigger → polling snapshot",
      "Proxy: отдельная настройка для custom scraping",
      "Сложнее чем Firecrawl/Apify для простых задач"
    ],
    rateLimits: "Зависит от плана.",
    docsUrl: "https://docs.brightdata.com/scraping-automation/web-scraper-api/overview"
  },

  {
    name: "RapidAPI Hub",
    description: "Маркетплейс 40K+ API. Кастомные заголовки X-RapidAPI-Key + X-RapidAPI-Host.",
    category: ["api-hub", "marketplace"],
    baseUrl: "https://{api-name}.p.rapidapi.com",
    auth: {
      type: "header",
      setup: "В n8n: добавь ДВА заголовка: 1) X-RapidAPI-Key: YOUR_KEY, 2) X-RapidAPI-Host: {api-name}.p.rapidapi.com.",
      headerName: "X-RapidAPI-Key"
    },
    defaultHeaders: {},
    endpoints: {
      any_endpoint: {
        method: "GET/POST",
        path: "/{varies}",
        description: "Зависит от конкретного API на RapidAPI",
        notes: [
          "ДВА обязательных заголовка: X-RapidAPI-Key + X-RapidAPI-Host",
          "Endpoint, method, body — всё зависит от конкретного API",
          "Один API key для ВСЕХ API на RapidAPI"
        ]
      }
    },
    n8nNotes: [
      "ДВА заголовка: X-RapidAPI-Key + X-RapidAPI-Host",
      "X-RapidAPI-Host = URL API без https:// (напр. judge0-ce.p.rapidapi.com)",
      "Endpoints зависят от конкретного API — смотри доку API на RapidAPI",
      "Один key = доступ к 40K+ API"
    ],
    rateLimits: "Зависит от конкретного API на RapidAPI.",
    docsUrl: "https://docs.rapidapi.com/"
  },

  {
    name: "Exa",
    description: "AI semantic search API. Bearer token. Поиск по смыслу, не по ключевым словам.",
    category: ["search", "ai", "semantic-search"],
    baseUrl: "https://api.exa.ai",
    auth: {
      type: "bearer",
      setup: "В n8n: Bearer auth с Exa API Key."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      search: {
        method: "POST",
        path: "/search",
        description: "Семантический поиск по вебу",
        bodyExample: '{"query":"machine learning frameworks for production","numResults":5,"type":"auto","contents":{"text":true}}',
        response: "results[] — массив с title, url, text, score",
        notes: [
          "type: 'auto' (AI выбирает), 'neural' (semantic), 'keyword'",
          "contents.text: true — вернуть текст страницы (критично для RAG!)",
          "contents.highlights: true — ключевые цитаты",
          "includeDomains/excludeDomains: фильтр по доменам",
          "startPublishedDate/endPublishedDate: фильтр по дате"
        ]
      },
      find_similar: {
        method: "POST",
        path: "/findSimilar",
        description: "Найти страницы похожие на указанную",
        bodyExample: '{"url":"https://example.com/article","numResults":5,"contents":{"text":true}}',
        response: "results[] — массив похожих страниц",
        notes: ["url: страница-эталон для поиска похожих"]
      },
      get_contents: {
        method: "POST",
        path: "/contents",
        description: "Получить контент по URL (без поиска)",
        bodyExample: '{"ids":["https://example.com/page1","https://example.com/page2"],"text":true}',
        response: "results[] — массив с text контентом",
        notes: ["ids: массив URL для получения контента"]
      }
    },
    n8nNotes: [
      "contents.text:true — ОБЯЗАТЕЛЬНО для получения текста (иначе только URL/title)",
      "type:'neural' для семантического, 'keyword' для точного",
      "findSimilar: уникальная фича — найди похожие на данный URL",
      "Лучше SerpAPI для AI-задач (семантика vs ключевые слова)"
    ],
    rateLimits: "Free: 1000 req/month.",
    docsUrl: "https://docs.exa.ai/"
  },

  {
    name: "Jina AI Reader",
    description: "URL → чистый текст для LLM. САМЫЙ ПРОСТОЙ API: просто добавь r.jina.ai/ перед URL.",
    category: ["scraping", "ai", "reader"],
    baseUrl: "https://r.jina.ai",
    auth: {
      type: "bearer",
      setup: "Бесплатно без auth (rate limited). С auth: Bearer YOUR_JINA_API_KEY."
    },
    defaultHeaders: { "Accept": "application/json" },
    endpoints: {
      read_url: {
        method: "GET",
        path: "/{url}",
        description: "Получить clean content любой страницы. URL ПРЯМО В PATH!",
        response: "data.content — markdown текст страницы, data.title",
        notes: [
          "ПРОСТЕЙШИЙ API: GET https://r.jina.ai/https://example.com",
          "URL страницы ПРЯМО в path (после r.jina.ai/)",
          "Accept: application/json — JSON ответ. Без него — plain text markdown",
          "Бесплатно без auth (но rate limited)",
          "Идеален для быстрого URL → text"
        ]
      },
      search: {
        method: "GET",
        path: "/search",
        description: "Поиск с получением контента",
        response: "data[] — массив результатов с content",
        notes: [
          "?q=search+query",
          "Комбинирует поиск и скрапинг"
        ]
      }
    },
    n8nNotes: [
      "ПРОСТЕЙШИЙ web→text: GET https://r.jina.ai/{URL}",
      "Accept: application/json для JSON, без — plain text markdown",
      "Бесплатно без key (rate limited), с key — больше лимиты",
      "Идеален для LLM: чистый markdown без мусора",
      "Не нужна настройка — работает из коробки"
    ],
    rateLimits: "Free: 20 req/min без key. С key: 200 req/min.",
    docsUrl: "https://jina.ai/reader/"
  },

  {
    name: "RSS / Atom Feeds",
    description: "Стандартные форматы новостных лент. XML ответ. Без auth.",
    category: ["data", "news", "rss"],
    baseUrl: "varies",
    auth: {
      type: "query",
      setup: "Обычно без авторизации. URL ленты зависит от сайта."
    },
    defaultHeaders: { "Accept": "application/xml" },
    endpoints: {
      get_feed: {
        method: "GET",
        path: "/{feed_url}",
        description: "Получить RSS/Atom ленту. XML ответ!",
        response: "XML с channel/item элементами (RSS) или feed/entry (Atom)",
        notes: [
          "ОТВЕТ = XML (не JSON!)",
          "RSS: <item><title>...</title><link>...</link><description>...</description></item>",
          "Atom: <entry><title>...</title><link href='...'/><summary>...</summary></entry>",
          "Для JSON: используй сервис-конвертер (rss2json.com) или n8n RSS Feed Read ноду"
        ]
      }
    },
    n8nNotes: [
      "РЕКОМЕНДАЦИЯ: n8n RSS Feed Read нода (парсит XML автоматически)",
      "Для HTTP Request: ответ = XML, нужно парсить",
      "Популярные feed URL: /rss, /feed, /atom.xml, /rss.xml",
      "Без auth в большинстве случаев"
    ],
    rateLimits: "Зависит от сервера. Рекомендуется не чаще 1 раз в 15 мин.",
    docsUrl: "https://www.rssboard.org/rss-specification"
  },

  {
    name: "Hunter.io",
    description: "Email finder & verifier. API key в query или Bearer.",
    category: ["data", "email-finder", "lead-generation"],
    baseUrl: "https://api.hunter.io/v2",
    auth: {
      type: "query",
      setup: "API key в query: ?api_key=YOUR_KEY. Или Bearer auth."
    },
    defaultHeaders: {},
    endpoints: {
      domain_search: {
        method: "GET",
        path: "/domain-search",
        description: "Найти все email для домена",
        response: "data.emails[] — массив с email, first_name, last_name, position",
        notes: [
          "?domain=example.com&api_key=YOUR_KEY",
          "type: personal, generic (role-based)",
          "seniority: junior, senior, executive",
          "department: executive, it, finance и т.д."
        ]
      },
      email_finder: {
        method: "GET",
        path: "/email-finder",
        description: "Найти email конкретного человека",
        response: "data.email — найденный email, data.score — confidence",
        notes: [
          "?domain=example.com&first_name=John&last_name=Doe&api_key=YOUR_KEY",
          "score: 0-100 (confidence)"
        ]
      },
      email_verifier: {
        method: "GET",
        path: "/email-verifier",
        description: "Проверить существование email",
        response: "data.result: 'deliverable', 'undeliverable', 'risky'",
        notes: ["?email=john@example.com&api_key=YOUR_KEY"]
      }
    },
    n8nNotes: [
      "Все через GET с query params",
      "api_key в query ИЛИ Bearer header",
      "Тратит credits: search = 1 per request, find = 1, verify = 1",
      "score: confidence level найденного email"
    ],
    rateLimits: "Free: 25 searches/month, 50 verifications.",
    docsUrl: "https://hunter.io/api-documentation"
  },

  {
    name: "Amazon S3",
    description: "AWS Object Storage. AWS SigV4 auth (СЛОЖНО). S3-совместимый стандарт.",
    category: ["storage", "aws", "s3"],
    baseUrl: "https://s3.{region}.amazonaws.com",
    auth: {
      type: "header",
      setup: "AWS SigV4 подпись — ОЧЕНЬ сложно в n8n HTTP Request. РЕКОМЕНДАЦИЯ: n8n AWS S3 нода или pre-signed URLs.",
      headerName: "Authorization (AWS SigV4)"
    },
    defaultHeaders: {},
    endpoints: {
      put_object: {
        method: "PUT",
        path: "/{bucket}/{key}",
        description: "Загрузить файл. Body = raw binary данные файла!",
        response: "ETag header — hash загруженного файла",
        notes: [
          "AWS SigV4 подпись в Authorization header — очень сложно вручную!",
          "Body = raw binary (файл), НЕ JSON!",
          "Content-Type: MIME тип файла (image/jpeg, application/pdf и т.д.)",
          "РЕКОМЕНДАЦИЯ: используй pre-signed URL (POST /? uploads → PUT на signed URL)"
        ]
      },
      get_object: {
        method: "GET",
        path: "/{bucket}/{key}",
        description: "Скачать файл. БИНАРНЫЙ ответ.",
        response: "Бинарный контент файла",
        notes: [
          "Ответ бинарный. В n8n: Response Format = File",
          "Content-Type в ответе = MIME тип файла"
        ]
      },
      list_objects: {
        method: "GET",
        path: "/{bucket}",
        description: "Список файлов в bucket",
        response: "XML! ListBucketResult → Contents[] → Key, Size, LastModified",
        notes: [
          "Ответ XML (НЕ JSON!)",
          "?list-type=2 — для v2 listing",
          "?prefix=folder/ — фильтр по \"папке\"",
          "?max-keys=1000 — до 1000 за запрос"
        ]
      },
      presigned_url: {
        method: "N/A",
        path: "N/A",
        description: "Pre-signed URL — URL с встроенной авторизацией (обходит SigV4 для n8n!)",
        notes: [
          "Сгенерируй pre-signed URL через AWS SDK/CLI",
          "Используй этот URL в n8n HTTP Request (без auth headers!)",
          "aws s3 presign s3://bucket/key --expires-in 3600",
          "ЛУЧШИЙ СПОСОБ работы с S3 из n8n HTTP Request"
        ]
      }
    },
    n8nNotes: [
      "НЕ РЕКОМЕНДУЕТСЯ через HTTP Request — SigV4 слишком сложна",
      "РЕКОМЕНДАЦИЯ 1: n8n AWS S3 нода (обрабатывает SigV4)",
      "РЕКОМЕНДАЦИЯ 2: Pre-signed URLs (сгенерируй через AWS CLI/Lambda, используй в HTTP Request без auth)",
      "List: ответ XML! Нужно парсить",
      "S3 = стандарт: Backblaze, Wasabi, MinIO, DigitalOcean Spaces — все S3-совместимы"
    ],
    rateLimits: "3,500 PUT/sec, 5,500 GET/sec per prefix.",
    docsUrl: "https://docs.aws.amazon.com/AmazonS3/latest/API/Welcome.html"
  },

  {
    name: "Dropbox",
    description: "File storage API. OAuth2 Bearer. ДВА URL: api.dropboxapi.com (JSON) и content.dropboxapi.com (binary).",
    category: ["storage", "files", "dropbox"],
    baseUrl: "https://api.dropboxapi.com/2",
    auth: {
      type: "bearer",
      setup: "OAuth2 Bearer token. В n8n: используй Dropbox ноду (обрабатывает OAuth). Для HTTP Request: Bearer с access_token."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      list_folder: {
        method: "POST",
        path: "/files/list_folder",
        description: "Список файлов в папке. POST, не GET!",
        bodyExample: '{"path":"/Documents","recursive":false,"limit":100}',
        response: "entries[] — массив файлов с name, path_display, .tag (file/folder)",
        notes: [
          "POST для списка (не GET!)",
          "path: '' = root, '/folder' = конкретная папка",
          "has_more + cursor → для пагинации через /files/list_folder/continue"
        ]
      },
      upload: {
        method: "POST",
        path: "/files/upload",
        description: "Загрузить файл. ДРУГОЙ URL! Metadata в HEADER!",
        contentType: "application/octet-stream",
        response: "id — file ID, path_display, size",
        notes: [
          "URL: https://content.dropboxapi.com/2/files/upload (НЕ api.dropboxapi.com!)",
          "Content-Type: application/octet-stream (raw binary!)",
          "Metadata в HEADER: Dropbox-API-Arg: {\"path\":\"/file.txt\",\"mode\":\"add\"}",
          "Body = raw file content",
          "Dropbox-API-Arg: JSON строка в header! Экранируй non-ASCII."
        ]
      },
      download: {
        method: "POST",
        path: "/files/download",
        description: "Скачать файл. ДРУГОЙ URL! POST, не GET! БИНАРНЫЙ ответ!",
        response: "Бинарный контент файла. Metadata в header Dropbox-API-Result.",
        notes: [
          "URL: https://content.dropboxapi.com/2/files/download",
          "POST метод (не GET!)",
          "Metadata в HEADER: Dropbox-API-Arg: {\"path\":\"/file.txt\"}",
          "Ответ бинарный. В n8n: Response Format = File",
          "Metadata ответа в header Dropbox-API-Result (не в body!)"
        ]
      },
      create_shared_link: {
        method: "POST",
        path: "/sharing/create_shared_link_with_settings",
        description: "Создать shared link",
        bodyExample: '{"path":"/Documents/report.pdf","settings":{"requested_visibility":"public"}}',
        response: "url — shared link URL",
        notes: ["Для получения прямого URL: замени ?dl=0 на ?dl=1 в URL"]
      }
    },
    n8nNotes: [
      "ДВА URL! JSON операции: api.dropboxapi.com. Binary (upload/download): content.dropboxapi.com",
      "Upload/Download: metadata в HEADER Dropbox-API-Arg (JSON строка в header!)",
      "Upload: Content-Type = application/octet-stream, body = raw file",
      "Download: POST (не GET!), Response Format = File",
      "POST для ВСЕХ операций (включая list folder)",
      "n8n имеет встроенную Dropbox ноду"
    ],
    rateLimits: "Зависит от endpoint. В целом generous.",
    docsUrl: "https://www.dropbox.com/developers/documentation/http/documentation"
  },

  {
    name: "Microsoft OneDrive",
    description: "File storage через Microsoft Graph API. OAuth2 обязателен.",
    category: ["storage", "files", "microsoft"],
    baseUrl: "https://graph.microsoft.com/v1.0",
    auth: {
      type: "oauth2",
      setup: "OAuth2 через Azure AD. В n8n: используй Microsoft OneDrive ноду (обрабатывает OAuth)."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      list_items: {
        method: "GET",
        path: "/me/drive/root/children",
        description: "Список файлов в корне OneDrive",
        response: "value[] — массив items с name, id, size, webUrl",
        notes: [
          "/me/drive/root/children — корень",
          "/me/drive/items/{id}/children — содержимое папки",
          "/me/drive/root:/{path}:/children — по пути"
        ]
      },
      upload_small: {
        method: "PUT",
        path: "/me/drive/root:/{path}:/content",
        description: "Загрузить файл (до 4MB). Body = raw binary.",
        response: "id, name, size, webUrl",
        notes: [
          "PUT метод!",
          "Content-Type: MIME тип файла",
          "Body = raw binary content",
          "Путь в URL: /root:/{folder/filename.ext}:/content",
          "До 4MB. Для больших: upload session"
        ]
      },
      download: {
        method: "GET",
        path: "/me/drive/items/{item-id}/content",
        description: "Скачать файл. БИНАРНЫЙ ответ (302 redirect).",
        response: "302 redirect на download URL → бинарный контент",
        notes: [
          "Возвращает 302 redirect! Следуй за redirect для файла",
          "Ответ бинарный. В n8n: Response Format = File",
          "В n8n: убедись что Follow Redirects включён"
        ]
      }
    },
    n8nNotes: [
      "РЕКОМЕНДАЦИЯ: n8n Microsoft OneDrive нода",
      "OAuth2 через Azure AD — сложная настройка",
      "Upload small: PUT с raw binary до 4MB",
      "Download: 302 redirect → follow redirect → binary",
      "Пути через :/path:/content синтаксис"
    ],
    rateLimits: "10,000 req/10min per app.",
    docsUrl: "https://learn.microsoft.com/en-us/graph/api/resources/onedrive"
  },

  {
    name: "Box",
    description: "Enterprise file storage. OAuth2 или Developer Token (short-lived). ДВА URL как Dropbox.",
    category: ["storage", "files", "enterprise"],
    baseUrl: "https://api.box.com/2.0",
    auth: {
      type: "bearer",
      setup: "OAuth2 или Developer Token (живёт 1 час! Из Box Developer Console). Bearer auth."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      list_items: {
        method: "GET",
        path: "/folders/{folder_id}/items",
        description: "Список файлов в папке",
        response: "entries[] — массив items с id, name, type",
        notes: [
          "folder_id: '0' = root folder",
          "fields: name,size,modified_at (указать какие поля вернуть)"
        ]
      },
      upload: {
        method: "POST",
        path: "/files/content",
        description: "Загрузить файл. ДРУГОЙ URL! MULTIPART!",
        contentType: "multipart/form-data",
        response: "entries[0].id — file ID",
        notes: [
          "URL: https://upload.box.com/api/2.0/files/content (НЕ api.box.com!)",
          "MULTIPART: attributes (JSON) + file (binary)",
          "attributes: {\"name\":\"file.txt\",\"parent\":{\"id\":\"FOLDER_ID\"}}",
          "parent.id: '0' = root"
        ]
      },
      download: {
        method: "GET",
        path: "/files/{file_id}/content",
        description: "Скачать файл. 302 redirect → binary.",
        response: "302 redirect → бинарный контент",
        notes: [
          "Ответ бинарный (через redirect). В n8n: Response Format = File",
          "Follow Redirects должен быть включён"
        ]
      }
    },
    n8nNotes: [
      "Developer Token живёт 1 ЧАС! Только для тестирования",
      "Production: OAuth2 или Server Authentication (JWT)",
      "Upload URL: upload.box.com (не api.box.com!)",
      "Upload: multipart с attributes JSON + file binary",
      "Download: 302 redirect → follow → binary"
    ],
    rateLimits: "1000 req/min per user.",
    docsUrl: "https://developer.box.com/reference/"
  },

  {
    name: "Backblaze B2",
    description: "Дешёвое cloud storage. S3-Compatible API (рекомендуется) или Native API. SigV4 auth.",
    category: ["storage", "s3-compatible", "backup"],
    baseUrl: "https://s3.{region}.backblazeb2.com",
    auth: {
      type: "header",
      setup: "S3-Compatible: AWS SigV4 с Application Key ID и Application Key. Native API: b2_authorize_account → auth token."
    },
    defaultHeaders: {},
    endpoints: {
      s3_put_object: {
        method: "PUT",
        path: "/{bucket}/{key}",
        description: "Загрузить файл через S3-Compatible API (рекомендуется)",
        notes: [
          "S3-Compatible API: тот же синтаксис что AWS S3!",
          "Endpoint: s3.{region}.backblazeb2.com",
          "Auth: AWS SigV4 (Application Key ID = Access Key, Application Key = Secret Key)",
          "Используй AWS SDK с переопределённым endpoint",
          "РЕКОМЕНДУЕТСЯ через S3-Compatible вместо Native API"
        ]
      },
      native_authorize: {
        method: "GET",
        path: "/b2api/v3/b2_authorize_account",
        description: "Native API: получить auth token. Basic Auth!",
        response: "authorizationToken — для всех последующих запросов, apiInfo.storageApi.apiUrl — base URL",
        notes: [
          "Basic Auth: Application Key ID : Application Key",
          "URL: https://api.backblazeb2.com/b2api/v3/b2_authorize_account",
          "authorizationToken: используй в Authorization header",
          "apiUrl: уникальный URL для data operations (НЕ api.backblazeb2.com!)"
        ]
      },
      native_upload: {
        method: "POST",
        path: "/b2api/v3/b2_upload_file/{uploadUrl}",
        description: "Native API: загрузить файл. ДВУХШАГОВЫЙ процесс!",
        notes: [
          "ШАГ 1: POST b2_get_upload_url → uploadUrl + authorizationToken",
          "ШАГ 2: POST на uploadUrl с файлом в body и metadata в headers",
          "X-Bz-File-Name: имя файла",
          "X-Bz-Content-Sha1: SHA1 hash файла (или 'do_not_verify')",
          "Content-Type: MIME тип файла",
          "Body = raw binary"
        ]
      }
    },
    n8nNotes: [
      "РЕКОМЕНДАЦИЯ: S3-Compatible API (используй как AWS S3 с другим endpoint)",
      "S3 endpoint: s3.{region}.backblazeb2.com",
      "Для n8n: AWS S3 нода с overridden endpoint = самый простой способ",
      "Native API сложнее: authorize → get_upload_url → upload",
      "1/4 цены AWS S3"
    ],
    rateLimits: "Depends on account tier.",
    docsUrl: "https://www.backblaze.com/docs/cloud-storage-s3-compatible-api"
  },

  {
    name: "Wasabi",
    description: "S3-совместимое cloud storage. 100% AWS S3 API. Дешевле S3.",
    category: ["storage", "s3-compatible"],
    baseUrl: "https://s3.{region}.wasabisys.com",
    auth: {
      type: "header",
      setup: "AWS SigV4: тот же протокол что AWS S3. Access Key + Secret Key из Wasabi Console."
    },
    defaultHeaders: {},
    endpoints: {
      all_s3_operations: {
        method: "PUT/GET/DELETE",
        path: "/{bucket}/{key}",
        description: "Все операции = AWS S3 API. Используй AWS SDK с Wasabi endpoint.",
        notes: [
          "100% S3-совместимый — используй AWS S3 документацию",
          "Endpoint: s3.{region}.wasabisys.com",
          "Regions: us-east-1, us-east-2, us-west-1, eu-central-1, ap-northeast-1 и др.",
          "Используй AWS SDK/CLI с overridden endpoint"
        ]
      }
    },
    n8nNotes: [
      "100% S3-совместимый — используй n8n AWS S3 ноду с Wasabi endpoint",
      "Endpoint: s3.{region}.wasabisys.com",
      "Access Key и Secret Key из Wasabi Console → Access Keys",
      "Дешевле AWS S3 (no egress fees!)"
    ],
    rateLimits: "Нет egress charges. Rate limits generous.",
    docsUrl: "https://docs.wasabi.com/docs/rest-api-introduction"
  },

  {
    name: "MinIO",
    description: "Self-hosted S3-совместимое хранилище. Open-source. 100% S3 API.",
    category: ["storage", "s3-compatible", "self-hosted", "open-source"],
    baseUrl: "http://localhost:9000",
    auth: {
      type: "header",
      setup: "AWS SigV4: тот же протокол что AWS S3. Access Key + Secret Key из MinIO Console (по умолчанию minioadmin:minioadmin)."
    },
    defaultHeaders: {},
    endpoints: {
      all_s3_operations: {
        method: "PUT/GET/DELETE",
        path: "/{bucket}/{key}",
        description: "Все операции = AWS S3 API. Используй AWS SDK с MinIO endpoint.",
        notes: [
          "100% S3-совместимый — используй AWS S3 документацию",
          "Self-hosted: docker run -p 9000:9000 -p 9001:9001 minio/minio server /data",
          "По умолчанию: Access Key = minioadmin, Secret Key = minioadmin",
          "Console: http://localhost:9001",
          "API: http://localhost:9000"
        ]
      }
    },
    n8nNotes: [
      "100% S3-совместимый — используй n8n AWS S3 ноду с MinIO endpoint",
      "Self-hosted: http://localhost:9000 (или IP сервера)",
      "По умолчанию: minioadmin:minioadmin",
      "s3ForcePathStyle: true (MinIO использует path-style, не virtual-hosted)",
      "Идеален для self-hosted n8n + local storage"
    ],
    rateLimits: "Self-hosted: зависит от hardware.",
    docsUrl: "https://min.io/docs/minio/linux/developers/minio-drivers.html"
  },

  {
    name: "Calendly",
    description: "Scheduling API. Bearer OAuth2/Personal Access Token. Webhook-ориентированный.",
    category: ["calendar", "scheduling"],
    baseUrl: "https://api.calendly.com",
    auth: {
      type: "bearer",
      setup: "В n8n: Bearer auth с Calendly Personal Access Token (из Settings → Developer → Personal Access Tokens)."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      get_current_user: {
        method: "GET",
        path: "/users/me",
        description: "Получить текущего пользователя (нужен для user URI)",
        response: "resource.uri — user URI для других endpoints",
        notes: [
          "Вызови первым для получения user URI",
          "URI формат: https://api.calendly.com/users/XXXX"
        ]
      },
      list_events: {
        method: "GET",
        path: "/scheduled_events",
        description: "Список запланированных встреч",
        response: "collection[] — массив event объектов с name, start_time, end_time, status",
        notes: [
          "?user=USER_URI — ОБЯЗАТЕЛЕН!",
          "?min_start_time, max_start_time: ISO 8601 datetime фильтры",
          "?status=active — только активные",
          "URI-based IDs: все ссылки через полные URI, не числовые ID"
        ]
      },
      list_event_invitees: {
        method: "GET",
        path: "/scheduled_events/{event_uuid}/invitees",
        description: "Получить приглашённых на встречу",
        response: "collection[] — массив invitee с name, email",
        notes: ["event_uuid: UUID из URI события"]
      },
      create_single_use_link: {
        method: "POST",
        path: "/scheduling_links",
        description: "Создать одноразовую ссылку для бронирования",
        bodyExample: '{"max_event_count":1,"owner":"https://api.calendly.com/event_types/YOUR_EVENT_TYPE_UUID","owner_type":"EventType"}',
        response: "resource.booking_url — URL для бронирования",
        notes: [
          "owner: полный URI event type (не ID!)",
          "max_event_count: 1 = одноразовая"
        ]
      }
    },
    n8nNotes: [
      "URI-based IDs! Все ссылки = полные URL (https://api.calendly.com/users/XXX)",
      "user URI нужен для большинства endpoints — получи через GET /users/me",
      "Нельзя СОЗДАТЬ бронирование через API — только через scheduling link!",
      "Для trigger на новое бронирование: webhook (BOOKING_CREATED)",
      "n8n имеет встроенную Calendly Trigger ноду"
    ],
    rateLimits: "10,000 req/day.",
    docsUrl: "https://developer.calendly.com/api-docs/reference"
  },

  {
    name: "Cal.com",
    description: "Open-source scheduling. Bearer API key. v2 API с обязательным cal-api-version header.",
    category: ["calendar", "scheduling", "open-source"],
    baseUrl: "https://api.cal.com/v2",
    auth: {
      type: "bearer",
      setup: "В n8n: Bearer auth с Cal.com API Key (cal_...). Получи из Settings → Security → API Keys."
    },
    defaultHeaders: {
      "Content-Type": "application/json",
      "cal-api-version": "2024-08-13"
    },
    endpoints: {
      get_slots: {
        method: "GET",
        path: "/slots/available",
        description: "Получить доступные слоты для бронирования",
        response: "data.slots — объект с датами и массивами слотов",
        notes: [
          "?startTime=2026-03-15T00:00:00Z&endTime=2026-03-22T00:00:00Z&eventTypeId=123",
          "cal-api-version: 2024-09-04 для /slots (отличается от /bookings!)",
          "eventTypeId или eventTypeSlug+username обязательны"
        ]
      },
      create_booking: {
        method: "POST",
        path: "/bookings",
        description: "Создать бронирование",
        bodyExample: '{"start":"2026-03-15T10:00:00Z","eventTypeId":123,"attendee":{"name":"John Doe","email":"john@example.com","timeZone":"Europe/Warsaw"}}',
        response: "data.id — booking ID, data.uid — уникальный UID",
        notes: [
          "cal-api-version: 2024-08-13 ОБЯЗАТЕЛЕН!",
          "start: ISO 8601 UTC",
          "attendee: name, email, timeZone обязательны",
          "eventTypeId ИЛИ eventTypeSlug+username"
        ]
      },
      cancel_booking: {
        method: "POST",
        path: "/bookings/{bookingUid}/cancel",
        description: "Отменить бронирование",
        bodyExample: '{"cancellationReason":"Schedule conflict"}',
        response: "status: 'CANCELLED'",
        notes: ["bookingUid в URL пути (не числовой id, а UID!)"]
      },
      list_event_types: {
        method: "GET",
        path: "/event-types",
        description: "Список типов событий",
        response: "data[] — массив event type объектов с id, slug, title, length",
        notes: ["Нужен для получения eventTypeId"]
      }
    },
    n8nNotes: [
      "ОБЯЗАТЕЛЬНЫЙ header: cal-api-version (разный для разных endpoints!)",
      "cal-api-version: 2024-08-13 для bookings, 2024-09-04 для slots",
      "Bearer token: cal_... (из Settings → Security)",
      "Можно создать бронирование через API (в отличие от Calendly!)",
      "Self-hosted: замени api.cal.com на свой домен",
      "n8n имеет встроенную Cal.com Trigger ноду"
    ],
    rateLimits: "120 req/min с API key.",
    docsUrl: "https://cal.com/docs/api-reference/v2"
  },

  {
    name: "Zoom",
    description: "Video meetings API. OAuth2 (Server-to-Server) или Bearer. Создание/управление встречами.",
    category: ["calendar", "video-conferencing", "meetings"],
    baseUrl: "https://api.zoom.us/v2",
    auth: {
      type: "bearer",
      setup: "Server-to-Server OAuth: POST https://zoom.us/oauth/token (account_credentials grant) → access_token. Или Personal Access Token (JWT deprecated). Bearer auth."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_meeting: {
        method: "POST",
        path: "/users/{userId}/meetings",
        description: "Создать Zoom meeting",
        bodyExample: '{"topic":"Team Sync","type":2,"start_time":"2026-03-15T10:00:00Z","duration":30,"timezone":"Europe/Warsaw","settings":{"host_video":true,"participant_video":true,"join_before_host":false,"waiting_room":true}}',
        response: "id — meeting ID (число), join_url — URL для участников, start_url — URL для хоста",
        notes: [
          "userId: 'me' для текущего пользователя",
          "type: 1 (instant), 2 (scheduled), 3 (recurring no fixed time), 8 (recurring fixed time)",
          "join_url: отправь участникам",
          "start_url: для хоста (с auth token!)"
        ]
      },
      list_meetings: {
        method: "GET",
        path: "/users/{userId}/meetings",
        description: "Список запланированных встреч",
        response: "meetings[] — массив meeting объектов",
        notes: ["?type=scheduled, live, upcoming, upcoming_meetings, previous_meetings"]
      },
      get_meeting: {
        method: "GET",
        path: "/meetings/{meetingId}",
        description: "Получить детали встречи",
        response: "id, topic, join_url, start_url, status",
        notes: ["meetingId: числовой ID"]
      },
      delete_meeting: {
        method: "DELETE",
        path: "/meetings/{meetingId}",
        description: "Удалить встречу",
        response: "Пустое тело при успехе (204)",
        notes: ["ПУСТОЕ ТЕЛО при 204"]
      }
    },
    n8nNotes: [
      "Server-to-Server OAuth App рекомендуется (JWT deprecated!)",
      "OAuth: POST https://zoom.us/oauth/token с grant_type=account_credentials + account_id",
      "userId='me' для текущего пользователя",
      "type=2 для обычных scheduled meetings",
      "join_url: для участников, start_url: для хоста",
      "n8n имеет встроенную Zoom ноду"
    ],
    rateLimits: "Light: 10 req/sec. Medium: 30 req/sec. Heavy: 80 req/sec.",
    docsUrl: "https://developers.zoom.us/docs/api/"
  },

  {
    name: "Acuity Scheduling",
    description: "Scheduling API (Squarespace). Basic Auth (User ID:API Key). Простой REST.",
    category: ["calendar", "scheduling"],
    baseUrl: "https://acuityscheduling.com/api/v1",
    auth: {
      type: "basic",
      setup: "В n8n: HTTP Basic Auth. Username = User ID, Password = API Key. Получи из Integrations → API Credentials."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      list_appointments: {
        method: "GET",
        path: "/appointments",
        description: "Список бронирований",
        response: "Массив appointment объектов с id, datetime, firstName, lastName, email",
        notes: [
          "?minDate=2026-03-01&maxDate=2026-03-31 — фильтр по дате",
          "?calendarID=123 — фильтр по календарю"
        ]
      },
      create_appointment: {
        method: "POST",
        path: "/appointments",
        description: "Создать бронирование",
        bodyExample: '{"datetime":"2026-03-15T10:00:00-0500","appointmentTypeID":12345,"firstName":"John","lastName":"Doe","email":"john@example.com"}',
        response: "id — appointment ID",
        notes: [
          "datetime: ISO 8601 С timezone offset!",
          "appointmentTypeID ОБЯЗАТЕЛЕН — получи через GET /appointment-types"
        ]
      },
      get_availability: {
        method: "GET",
        path: "/availability/times",
        description: "Получить доступные слоты",
        response: "Массив объектов с time (ISO datetime)",
        notes: [
          "?appointmentTypeID=123&date=2026-03-15&calendarID=456",
          "appointmentTypeID и date ОБЯЗАТЕЛЬНЫ"
        ]
      },
      cancel_appointment: {
        method: "PUT",
        path: "/appointments/{id}/cancel",
        description: "Отменить бронирование. PUT, не DELETE!",
        response: "Обновлённый appointment с canceled: true",
        notes: ["PUT метод (не DELETE!)"]
      }
    },
    n8nNotes: [
      "Basic Auth: User ID + API Key",
      "Cancellation: PUT /appointments/{id}/cancel (не DELETE!)",
      "appointmentTypeID нужен для создания и проверки доступности",
      "Теперь часть Squarespace (бывший отдельный сервис)",
      "n8n имеет встроенную Acuity Scheduling ноду"
    ],
    rateLimits: "~10 req/sec.",
    docsUrl: "https://developers.acuityscheduling.com/reference"
  },

  {
    name: "Microsoft Bookings",
    description: "Scheduling через Microsoft Graph API. OAuth2. Часть Microsoft 365.",
    category: ["calendar", "scheduling", "microsoft"],
    baseUrl: "https://graph.microsoft.com/v1.0",
    auth: {
      type: "oauth2",
      setup: "OAuth2 через Azure AD. Требует Microsoft 365 Business/Enterprise. Scope: Bookings.ReadWrite.All."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      list_businesses: {
        method: "GET",
        path: "/solutions/bookingBusinesses",
        description: "Список Booking businesses (календарей бронирования)",
        response: "value[] — массив business объектов с id, displayName",
        notes: ["Нужен для получения bookingBusinessId"]
      },
      create_appointment: {
        method: "POST",
        path: "/solutions/bookingBusinesses/{bookingBusinessId}/appointments",
        description: "Создать бронирование",
        bodyExample: '{"serviceId":"SERVICE_ID","startDateTime":{"dateTime":"2026-03-15T10:00:00","timeZone":"Europe/Warsaw"},"endDateTime":{"dateTime":"2026-03-15T10:30:00","timeZone":"Europe/Warsaw"},"customers":[{"name":"John Doe","emailAddress":"john@example.com"}]}',
        response: "id — appointment ID",
        notes: [
          "serviceId: ID сервиса (типа встречи) — обязателен",
          "DateTime формат: {dateTime: '...', timeZone: '...'} (как Calendar API)",
          "customers: массив объектов с name и emailAddress"
        ]
      },
      get_staff_availability: {
        method: "POST",
        path: "/solutions/bookingBusinesses/{bookingBusinessId}/getStaffAvailability",
        description: "Получить доступность сотрудников. POST, не GET!",
        bodyExample: '{"staffIds":["STAFF_ID"],"startDateTime":{"dateTime":"2026-03-15T00:00:00","timeZone":"UTC"},"endDateTime":{"dateTime":"2026-03-22T00:00:00","timeZone":"UTC"}}',
        response: "value[] — массив availability per staff member",
        notes: ["POST для проверки доступности (не GET!)"]
      }
    },
    n8nNotes: [
      "OAuth2 через Azure AD — сложная настройка",
      "Часть Microsoft Graph API (тот же auth что Outlook, Teams)",
      "Требует Microsoft 365 Business Premium или выше",
      "DateTime: объект {dateTime, timeZone} (не строка!)",
      "POST для getStaffAvailability (не GET!)"
    ],
    rateLimits: "Graph API throttling.",
    docsUrl: "https://learn.microsoft.com/en-us/graph/api/resources/booking-api-overview"
  },

  {
    name: "Typeform",
    description: "Form/survey API. Bearer token. Мощный API для чтения ответов и создания форм.",
    category: ["forms", "surveys"],
    baseUrl: "https://api.typeform.com",
    auth: {
      type: "bearer",
      setup: "В n8n: Bearer auth с Typeform Personal Access Token. Получи из Settings → Personal tokens."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      list_responses: {
        method: "GET",
        path: "/forms/{form_id}/responses",
        description: "Получить ответы на форму",
        response: "items[] — массив response объектов с answers[]",
        notes: [
          "form_id: из URL формы",
          "?page_size=25&since=2026-01-01T00:00:00Z — фильтрация",
          "answers[]: массив с field.id, type, и значением (text, number, choice и т.д.)",
          "Значение ответа зависит от типа: text, number, boolean, choice.label, choices.labels[]"
        ]
      },
      get_form: {
        method: "GET",
        path: "/forms/{form_id}",
        description: "Получить структуру формы (вопросы, настройки)",
        response: "fields[] — массив вопросов с id, title, type",
        notes: ["fields[].id: нужен для маппинга ответов к вопросам"]
      },
      create_form: {
        method: "POST",
        path: "/forms",
        description: "Создать новую форму",
        bodyExample: '{"title":"Customer Feedback","fields":[{"type":"short_text","title":"What is your name?"},{"type":"rating","title":"How would you rate our service?","properties":{"steps":5}}]}',
        response: "id — form ID, _links.display — URL формы",
        notes: [
          "type: short_text, long_text, email, number, rating, multiple_choice, yes_no, date и др.",
          "properties: настройки поля (steps для rating, choices для multiple_choice)"
        ]
      }
    },
    n8nNotes: [
      "Personal Access Token из Settings → Personal tokens",
      "Ответы: answers[] с разными типами значений (text, number, choice.label)",
      "field.id в ответах маппится к fields[].id в структуре формы",
      "n8n имеет встроенную Typeform Trigger ноду (webhook)"
    ],
    rateLimits: "2 req/sec для responses, 5 req/sec для forms.",
    docsUrl: "https://www.typeform.com/developers/responses/"
  },

  {
    name: "Tally",
    description: "Free form builder. Bearer token. REST API + Webhooks для ответов.",
    category: ["forms", "surveys", "free"],
    baseUrl: "https://api.tally.so",
    auth: {
      type: "bearer",
      setup: "В n8n: Bearer auth с Tally API Key. Получи из User Settings → API."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      list_forms: {
        method: "GET",
        path: "/forms",
        description: "Список форм",
        response: "Массив form объектов с id, name, status",
        notes: ["?page=1&limit=10 для пагинации"]
      },
      get_submissions: {
        method: "GET",
        path: "/forms/{formId}/submissions",
        description: "Получить ответы на форму",
        response: "Массив submission объектов с responses[]",
        notes: [
          "responses[]: массив с questionId, answer",
          "questions также возвращаются для маппинга"
        ]
      },
      get_submission: {
        method: "GET",
        path: "/forms/{formId}/submissions/{submissionId}",
        description: "Получить конкретный ответ",
        response: "questions[] + submission.responses[]",
        notes: ["Включает и вопросы, и ответы"]
      }
    },
    n8nNotes: [
      "API в бете — может измениться",
      "Для real-time: Webhook интеграция (Tally → Settings → Integrations → Webhook)",
      "Webhook payload: fields[] с key, label, type, value",
      "Webhook проще чем API для n8n (Tally Trigger → Webhook)",
      "Бесплатная форма с безлимитными ответами!"
    ],
    rateLimits: "Не документировано точно (beta).",
    docsUrl: "https://developers.tally.so/"
  },

  {
    name: "JotForm",
    description: "Form builder API. API key в query ИЛИ header. Простой REST.",
    category: ["forms", "surveys"],
    baseUrl: "https://api.jotform.com",
    auth: {
      type: "query",
      setup: "API key в query: ?apiKey=YOUR_KEY. Или заголовок APIKEY: YOUR_KEY. Получи из Settings → API."
    },
    defaultHeaders: {},
    endpoints: {
      get_submissions: {
        method: "GET",
        path: "/form/{formId}/submissions",
        description: "Получить ответы на форму",
        response: "content[] — массив submission объектов с answers",
        notes: [
          "?apiKey=YOUR_KEY",
          "answers: объект где ключи = question IDs, значения = {text, answer, type}",
          "?limit=20&offset=0 — пагинация",
          "?filter={\"created_at:gt\":\"2026-01-01\"} — JSON filter в query"
        ]
      },
      get_form: {
        method: "GET",
        path: "/form/{formId}",
        description: "Получить структуру формы",
        response: "content — form объект с id, title, status, count",
        notes: ["formId: из URL формы (число)"]
      },
      get_form_questions: {
        method: "GET",
        path: "/form/{formId}/questions",
        description: "Получить список вопросов формы",
        response: "content — объект с question IDs как ключами",
        notes: ["Для маппинга answers к вопросам"]
      },
      create_submission: {
        method: "POST",
        path: "/form/{formId}/submissions",
        description: "Создать submission (ответ) программатически",
        contentType: "application/x-www-form-urlencoded",
        bodyExample: "submission[3]=John+Doe&submission[4]=john@example.com&submission[5]=Great+service",
        response: "content.submissionID — ID нового ответа",
        notes: [
          "FORM-URLENCODED! НЕ JSON!",
          "submission[{questionID}]=value",
          "questionID: числовой ID вопроса (получи через /questions)"
        ]
      }
    },
    n8nNotes: [
      "API key в query (?apiKey=) ИЛИ заголовок APIKEY",
      "Ответы обёрнуты в content: {content: [...]}",
      "Create submission: FORM-URLENCODED! submission[qid]=value",
      "EU endpoint: eu-api.jotform.com (для EU данных)",
      "filter: JSON строка в query param"
    ],
    rateLimits: "Free: 1000 submissions/month, 100 API calls/day.",
    docsUrl: "https://api.jotform.com/docs/"
  },

  {
    name: "SurveyMonkey",
    description: "Survey API. Bearer OAuth2 token. Сложная настройка, мощный функционал.",
    category: ["forms", "surveys"],
    baseUrl: "https://api.surveymonkey.com/v3",
    auth: {
      type: "bearer",
      setup: "OAuth2 Bearer token. Создай приложение в SurveyMonkey Developer Portal → OAuth2 flow."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      list_surveys: {
        method: "GET",
        path: "/surveys",
        description: "Список опросов",
        response: "data[] — массив survey объектов с id, title, href",
        notes: ["?page=1&per_page=50 — пагинация"]
      },
      get_survey_responses: {
        method: "GET",
        path: "/surveys/{surveyId}/responses/bulk",
        description: "Получить все ответы опроса (bulk)",
        response: "data[] — массив response объектов с pages[].questions[].answers[]",
        notes: [
          "ВЛОЖЕННАЯ структура: response.pages[].questions[].answers[]",
          "answers[]: массив с choice_id, text, row_id",
          "Нужен маппинг choice_id к тексту через GET /surveys/{id}/details",
          "?per_page=100 — макс 100 ответов за запрос"
        ]
      },
      get_survey_details: {
        method: "GET",
        path: "/surveys/{surveyId}/details",
        description: "Получить структуру опроса с вопросами и choices",
        response: "pages[].questions[].answers.choices[] — варианты ответов с id и text",
        notes: ["Нужен для маппинга choice_id к текстовому ответу"]
      }
    },
    n8nNotes: [
      "OAuth2 обязателен — нет API key варианта",
      "Ответы ВЛОЖЕНЫ: response → pages → questions → answers",
      "choice_id нужно маппить к тексту через /surveys/{id}/details",
      "Для простых форм Typeform/Tally проще"
    ],
    rateLimits: "120 req/min. 500 req/day (Basic plan).",
    docsUrl: "https://developer.surveymonkey.com/api/v3/"
  },

  {
    name: "Fillout",
    description: "Modern form builder. Bearer API key. Простой REST API.",
    category: ["forms", "surveys"],
    baseUrl: "https://api.fillout.com/v1/api",
    auth: {
      type: "bearer",
      setup: "В n8n: Bearer auth с Fillout API Key. Получи из Settings → Integrations → API Key."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      list_submissions: {
        method: "GET",
        path: "/forms/{formId}/submissions",
        description: "Получить ответы на форму",
        response: "responses[] — массив response объектов с questions[]",
        notes: [
          "formId: из URL формы",
          "questions[]: массив с id, name, type, value",
          "value: уже содержит текстовый ответ (не нужен маппинг!)",
          "?afterDate=2026-01-01T00:00:00Z — фильтр",
          "?pageSize=50&offset=0 — пагинация"
        ]
      },
      get_form: {
        method: "GET",
        path: "/forms/{formId}",
        description: "Получить структуру формы",
        response: "fields[] — массив полей с id, name, type",
        notes: ["Для проверки доступных полей"]
      }
    },
    n8nNotes: [
      "Простейший form API — value содержит текстовый ответ (не ID!)",
      "Bearer API Key из Settings → Integrations",
      "Для real-time: Webhook интеграция в Fillout",
      "Альтернатива Typeform с более простым API"
    ],
    rateLimits: "Не документировано точно.",
    docsUrl: "https://www.fillout.com/help/fillout-rest-api"
  },

  {
    name: "WordPress REST API",
    description: "WordPress CMS. Basic Auth (Application Password) или JWT. Site-specific URL.",
    category: ["cms", "wordpress", "blog"],
    baseUrl: "https://{site}/wp-json/wp/v2",
    auth: {
      type: "basic",
      setup: "В n8n: HTTP Basic Auth. Username = WordPress username, Password = Application Password (из Users → Profile → Application Passwords). НЕ обычный пароль!"
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_post: {
        method: "POST",
        path: "/posts",
        description: "Создать пост",
        bodyExample: '{"title":"My New Post","content":"<p>Post content in HTML</p>","status":"draft","categories":[1],"tags":[5,10]}',
        response: "id — post ID, link — URL поста",
        notes: [
          "status: 'draft', 'publish', 'private', 'pending'",
          "content: HTML формат",
          "categories, tags: массивы ID (не имён!)",
          "featured_media: ID медиа для thumbnail"
        ]
      },
      list_posts: {
        method: "GET",
        path: "/posts",
        description: "Список постов",
        response: "Массив post объектов",
        notes: [
          "?per_page=10&page=1&status=publish",
          "?search=keyword — поиск",
          "?categories=1,2 — фильтр по категориям",
          "Пагинация: X-WP-Total и X-WP-TotalPages в response headers"
        ]
      },
      upload_media: {
        method: "POST",
        path: "/media",
        description: "Загрузить медиа файл. Binary body!",
        contentType: "image/jpeg",
        response: "id — media ID (для featured_media), source_url — URL файла",
        notes: [
          "Content-Type: MIME тип файла (image/jpeg, image/png и т.д.)",
          "Content-Disposition: attachment; filename='photo.jpg'",
          "Body = raw binary данные файла",
          "Полученный id используй как featured_media в постах"
        ]
      }
    },
    n8nNotes: [
      "Basic Auth: username + Application Password (НЕ обычный пароль!)",
      "Application Password: Users → Profile → Application Passwords (WordPress 5.6+)",
      "Site URL в base: https://your-site.com/wp-json/wp/v2",
      "content: HTML (не Markdown!)",
      "Media upload: raw binary + Content-Type = MIME type",
      "n8n имеет встроенную WordPress ноду"
    ],
    rateLimits: "Зависит от хостинга.",
    docsUrl: "https://developer.wordpress.org/rest-api/reference/"
  },

  {
    name: "Webflow",
    description: "Website builder с CMS API v2. Bearer token. Staged vs Live items.",
    category: ["cms", "website-builder"],
    baseUrl: "https://api.webflow.com/v2",
    auth: {
      type: "bearer",
      setup: "В n8n: Bearer auth с Site API Token (из Project Settings → Integrations → Generate API Token)."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_item_live: {
        method: "POST",
        path: "/collections/{collection_id}/items/live",
        description: "Создать CMS item (сразу live на сайте)",
        bodyExample: '{"isArchived":false,"isDraft":false,"fieldData":{"name":"New Post","slug":"new-post","post-body":"<p>Content here</p>","date":"2026-03-15T00:00:00Z"}}',
        response: "id — item ID, fieldData",
        notes: [
          "fieldData: ключи = slug поля в коллекции (name, slug обязательны!)",
          "/items/live: сразу публикуется",
          "/items: создаёт draft (staged)",
          "Batch: до 100 items за запрос",
          "collection_id: из CMS Collection settings"
        ]
      },
      list_items: {
        method: "GET",
        path: "/collections/{collection_id}/items",
        description: "Список CMS items",
        response: "items[] — массив item объектов с fieldData",
        notes: [
          "Для CDN-backed чтение: api-cdn.webflow.com (быстрее!)",
          "?limit=100&offset=0 — пагинация"
        ]
      },
      publish_items: {
        method: "POST",
        path: "/collections/{collection_id}/items/publish",
        description: "Опубликовать staged items (draft → live)",
        bodyExample: '{"itemIds":["ITEM_ID_1","ITEM_ID_2"]}',
        response: "publishedItemIds[]",
        notes: ["Для staged items: create → publish двухшаговый процесс"]
      }
    },
    n8nNotes: [
      "Site API Token из Project Settings → Integrations",
      "fieldData: ключи = slug полей коллекции (не display name!)",
      "name и slug ОБЯЗАТЕЛЬНЫ в fieldData",
      "/items/live = сразу live, /items = draft",
      "Для чтения: api-cdn.webflow.com (CDN, быстрее)"
    ],
    rateLimits: "60 req/min (CMS/Business: 120 req/min).",
    docsUrl: "https://developers.webflow.com/data/reference"
  },

  {
    name: "Ghost",
    description: "Headless CMS для блогов. Admin API Key → JWT token. Content API Key в query.",
    category: ["cms", "blog", "headless"],
    baseUrl: "https://{site}/ghost/api",
    auth: {
      type: "bearer",
      setup: "Admin API: конвертируй Admin API Key в JWT token (short-lived!). Content API: ?key=CONTENT_KEY в query."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_post: {
        method: "POST",
        path: "/admin/posts/",
        description: "Создать пост (Admin API). JWT auth!",
        bodyExample: '{"posts":[{"title":"My Post","html":"<p>Content here</p>","status":"draft","tags":[{"name":"Tech"}]}]}',
        response: "posts[0].id — post ID, posts[0].url",
        notes: [
          "ADMIN API: JWT Bearer auth (НЕ API key напрямую!)",
          "Admin API Key формат: {id}:{secret}. Нужно сгенерировать JWT из него",
          "Body обёрнут: {posts: [{...}]} (массив!)",
          "html ИЛИ mobiledoc для контента",
          "tags: массив объектов {name: 'Tag'} (создаст если не существует)"
        ]
      },
      list_posts_content: {
        method: "GET",
        path: "/content/posts/",
        description: "Список постов (Content API — для чтения)",
        response: "posts[] — массив post объектов",
        notes: [
          "CONTENT API: ?key=CONTENT_API_KEY в query (не JWT!)",
          "?include=tags,authors",
          "?filter=tag:tech+status:published",
          "Content API = только чтение. Admin API = чтение + запись"
        ]
      }
    },
    n8nNotes: [
      "ДВА API: Content (чтение, key в query) и Admin (запись, JWT Bearer)",
      "Admin API Key → JWT: нужен код для генерации JWT из id:secret",
      "JWT библиотека: jsonwebtoken, aud='/admin/', iat=now, exp=now+5min",
      "Content API проще: просто ?key=... в URL",
      "Body: {posts: [{...}]} — массив обёрнутый в posts!"
    ],
    rateLimits: "Зависит от хостинга.",
    docsUrl: "https://ghost.org/docs/admin-api/"
  },

  {
    name: "Strapi",
    description: "Open-source headless CMS. Bearer JWT token. Self-hosted. Автогенерируемый REST API.",
    category: ["cms", "headless", "open-source", "self-hosted"],
    baseUrl: "http://localhost:1337/api",
    auth: {
      type: "bearer",
      setup: "Bearer JWT: POST /api/auth/local с identifier+password → jwt. Или API Token из Settings → API Tokens."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      login: {
        method: "POST",
        path: "/auth/local",
        description: "Получить JWT token",
        bodyExample: '{"identifier":"admin@example.com","password":"YOUR_PASSWORD"}',
        response: "jwt — Bearer token, user — объект пользователя",
        notes: ["identifier: email или username"]
      },
      list_entries: {
        method: "GET",
        path: "/{content-type}",
        description: "Список записей (автогенерированный endpoint per content type)",
        response: "data[] — массив записей с id и attributes",
        notes: [
          "Endpoint = pluralized content type name: /api/articles, /api/products",
          "?populate=* — включить все relations (по умолчанию НЕ включены!)",
          "?filters[title][$contains]=search — фильтрация",
          "?pagination[page]=1&pagination[pageSize]=25",
          "?sort=createdAt:desc"
        ]
      },
      create_entry: {
        method: "POST",
        path: "/{content-type}",
        description: "Создать запись",
        bodyExample: '{"data":{"title":"My Article","content":"Article content","category":1}}',
        response: "data.id — ID записи, data.attributes",
        notes: [
          "Body обёрнут: {data: {...}}!",
          "Ответ тоже обёрнут: {data: {id, attributes: {...}}}",
          "Relations по ID: category: 1 (не имя!)"
        ]
      }
    },
    n8nNotes: [
      "Self-hosted: URL зависит от деплоя (localhost:1337 по умолчанию)",
      "Auth: JWT (POST /auth/local) ИЛИ API Token (проще, из Settings)",
      "Body обёрнут в data: {data: {...}}. Ответ тоже {data: {...}}",
      "?populate=* ОБЯЗАТЕЛЕН для получения relations/media!",
      "Endpoints автогенерируются из content types",
      "n8n имеет встроенную Strapi ноду"
    ],
    rateLimits: "Self-hosted: нет встроенных лимитов.",
    docsUrl: "https://docs.strapi.io/dev-docs/api/rest"
  },

  {
    name: "Contentful",
    description: "Headless CMS. ДВА API: Content Delivery (Bearer) и Content Management (Bearer). Space ID в URL.",
    category: ["cms", "headless"],
    baseUrl: "https://cdn.contentful.com",
    auth: {
      type: "bearer",
      setup: "Delivery API: Bearer с Content Delivery Access Token. Management API: Bearer с Content Management Token. Разные токены!"
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      get_entries: {
        method: "GET",
        path: "/spaces/{space_id}/environments/{environment_id}/entries",
        description: "Получить entries (Delivery API — CDN, только чтение)",
        response: "items[] — массив entry объектов с fields",
        notes: [
          "URL: cdn.contentful.com (Delivery) или api.contentful.com (Management)",
          "?content_type=blogPost — фильтр по content type",
          "?fields.title=My+Post — фильтр по полю",
          "?include=2 — глубина linked entries",
          "environment_id: обычно 'master'"
        ]
      },
      create_entry: {
        method: "POST",
        path: "/spaces/{space_id}/environments/{environment_id}/entries",
        description: "Создать entry (Management API)",
        bodyExample: '{"fields":{"title":{"en-US":"My Post"},"body":{"en-US":"Content here"}}}',
        response: "sys.id — entry ID",
        notes: [
          "URL: api.contentful.com (НЕ cdn!)",
          "Management Token (НЕ Delivery!)",
          "ОБЯЗАТЕЛЬНЫЙ header: X-Contentful-Content-Type: YOUR_CONTENT_TYPE_ID",
          "Поля ЛОКАЛИЗОВАНЫ: {\"title\": {\"en-US\": \"value\"}} (не просто строка!)",
          "Создаёт draft. Для публикации: PUT /{entry_id}/published"
        ]
      },
      publish_entry: {
        method: "PUT",
        path: "/spaces/{space_id}/environments/{environment_id}/entries/{entry_id}/published",
        description: "Опубликовать entry (draft → published)",
        response: "sys.publishedVersion",
        notes: [
          "ОБЯЗАТЕЛЬНЫЙ header: X-Contentful-Version: {current_version}",
          "version: из sys.version предыдущего ответа"
        ]
      }
    },
    n8nNotes: [
      "ДВА API: cdn.contentful.com (чтение) и api.contentful.com (запись)",
      "Delivery Token для чтения, Management Token для записи — РАЗНЫЕ токены!",
      "Поля ЛОКАЛИЗОВАНЫ: {fieldName: {'en-US': 'value'}} — не забудь locale!",
      "X-Contentful-Content-Type header при создании entry",
      "X-Contentful-Version header при публикации",
      "Create → Publish: двухшаговый процесс"
    ],
    rateLimits: "Delivery: 78 req/sec. Management: 10 req/sec.",
    docsUrl: "https://www.contentful.com/developers/docs/references/content-delivery-api/"
  },

  {
    name: "Sanity",
    description: "Headless CMS с GROQ query language. Bearer token. GROQ ≠ SQL ≠ GraphQL.",
    category: ["cms", "headless"],
    baseUrl: "https://{projectId}.api.sanity.io/v2023-08-01",
    auth: {
      type: "bearer",
      setup: "Bearer auth с Sanity API Token (из Settings → API → Tokens). Для чтения без auth: CDN endpoint."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      query: {
        method: "GET",
        path: "/data/query/{dataset}",
        description: "GROQ запрос (Sanity's query language). GET!",
        response: "result — результат GROQ запроса",
        notes: [
          "?query=*[_type == 'post']{title, body, 'author': author->name}",
          "GROQ: уникальный query language (не SQL, не GraphQL!)",
          "dataset: обычно 'production'",
          "CDN: {projectId}.apicdn.sanity.io (кэшировано, для чтения)"
        ]
      },
      mutate: {
        method: "POST",
        path: "/data/mutate/{dataset}",
        description: "Создать/обновить/удалить документы",
        bodyExample: '{"mutations":[{"create":{"_type":"post","title":"My Post","body":"Content"}}]}',
        response: "results[] — массив результатов, transactionId",
        notes: [
          "mutations: массив операций (create, createOrReplace, patch, delete)",
          "patch: {\"patch\": {\"id\": \"doc-id\", \"set\": {\"title\": \"Updated\"}}}",
          "Может содержать несколько mutations за раз (транзакция!)"
        ]
      }
    },
    n8nNotes: [
      "GROQ для запросов: уникальный query language (не SQL/GraphQL!)",
      "GROQ в query param: ?query=*[_type == 'post']{title}",
      "mutations для записи: {mutations: [{create: {...}}, {patch: {...}}]}",
      "API version в URL: /v2023-08-01/ (дата-based)",
      "CDN endpoint для чтения: apicdn.sanity.io (быстрее)"
    ],
    rateLimits: "CDN: generous. Mutations: 25 req/sec.",
    docsUrl: "https://www.sanity.io/docs/http-api"
  },

  {
    name: "Directus",
    description: "Open-source headless CMS/BaaS. Bearer token или Static Token. Автогенерируемый REST API.",
    category: ["cms", "headless", "baas", "open-source", "self-hosted"],
    baseUrl: "http://localhost:8055",
    auth: {
      type: "bearer",
      setup: "Bearer JWT: POST /auth/login → access_token. Или Static Token (из User Settings — проще для n8n!)."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      login: {
        method: "POST",
        path: "/auth/login",
        description: "Получить access_token (JWT)",
        bodyExample: '{"email":"admin@example.com","password":"YOUR_PASSWORD"}',
        response: "data.access_token, data.refresh_token",
        notes: ["access_token: short-lived. refresh_token: для обновления"]
      },
      list_items: {
        method: "GET",
        path: "/items/{collection}",
        description: "Список записей из коллекции",
        response: "data[] — массив записей",
        notes: [
          "collection = имя таблицы/коллекции",
          "?fields=id,title,status — выбор полей",
          "?filter[status][_eq]=published — фильтрация",
          "?sort=-date_created — сортировка",
          "?limit=25&offset=0 — пагинация",
          "?deep[translations][_filter][languages_code][_eq]=en-US — глубокий фильтр"
        ]
      },
      create_item: {
        method: "POST",
        path: "/items/{collection}",
        description: "Создать запись",
        bodyExample: '{"title":"My Article","content":"<p>Content</p>","status":"draft"}',
        response: "data — созданная запись",
        notes: [
          "Body = простой объект (БЕЗ обёртки data!)",
          "Ответ обёрнут: {data: {...}}",
          "Relations по ID: category: 1"
        ]
      }
    },
    n8nNotes: [
      "Static Token ПРОЩЕ для n8n: User Settings → Token (не истекает!)",
      "?access_token=TOKEN в query ИЛИ Authorization: Bearer TOKEN",
      "Ответ обёрнут в data: {data: [...]}, но body при создании БЕЗ обёртки!",
      "Фильтры: ?filter[field][operator]=value (_eq, _contains, _gt, _in и т.д.)",
      "Self-hosted: docker-compose, URL зависит от деплоя"
    ],
    rateLimits: "Self-hosted: нет лимитов.",
    docsUrl: "https://docs.directus.io/reference/introduction.html"
  },

  {
    name: "Storyblok",
    description: "Headless CMS. ДВА API: Content Delivery (token в query) и Management (Bearer).",
    category: ["cms", "headless"],
    baseUrl: "https://api.storyblok.com/v2",
    auth: {
      type: "query",
      setup: "Content Delivery: ?token=YOUR_PUBLIC_TOKEN в query. Management API: Bearer с Personal Access Token."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      get_stories: {
        method: "GET",
        path: "/cdn/stories",
        description: "Получить stories (Delivery API — CDN)",
        response: "stories[] — массив story объектов с content (компоненты)",
        notes: [
          "?token=YOUR_TOKEN в query",
          "?version=draft ИЛИ published",
          "?starts_with=blog/ — фильтр по папке",
          "?filter_query[component][in]=article — фильтр по типу",
          "content: дерево компонентов (вложенная JSON структура)"
        ]
      },
      get_story: {
        method: "GET",
        path: "/cdn/stories/{slug}",
        description: "Получить конкретный story по slug",
        response: "story — объект с content",
        notes: [
          "slug: полный путь (blog/my-post)",
          "?token=... обязателен"
        ]
      },
      create_story: {
        method: "POST",
        path: "/v1/spaces/{space_id}/stories",
        description: "Создать story (Management API)",
        bodyExample: '{"story":{"name":"My Post","slug":"my-post","content":{"component":"article","title":"My Post","body":"Content"}}}',
        response: "story.id",
        notes: [
          "Management API URL: mapi.storyblok.com/v1/ (другой URL!)",
          "Bearer auth с Personal Access Token",
          "Body обёрнут: {story: {...}}",
          "content: объект с component (тип) и полями"
        ]
      }
    },
    n8nNotes: [
      "ДВА API: CDN (api.storyblok.com, token в query) и Management (mapi.storyblok.com, Bearer)",
      "Delivery: ?token=PUBLIC_TOKEN. Management: Bearer PERSONAL_TOKEN",
      "content: дерево компонентов (component field определяет тип)",
      "?version=draft для preview, ?version=published для production"
    ],
    rateLimits: "Delivery: 50 req/sec. Management: 3 req/sec.",
    docsUrl: "https://www.storyblok.com/docs/api/content-delivery/v2"
  },

  {
    name: "Zendesk",
    description: "Helpdesk API. Basic Auth (email/token:API_KEY) или Bearer OAuth2. Subdomain-specific URL.",
    category: ["support", "helpdesk", "ticketing"],
    baseUrl: "https://{subdomain}.zendesk.com/api/v2",
    auth: {
      type: "basic",
      setup: "В n8n: HTTP Basic Auth. Username = email/token (буквально с /token!), Password = API Key. Или Bearer OAuth2."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_ticket: {
        method: "POST",
        path: "/tickets",
        description: "Создать тикет",
        bodyExample: '{"ticket":{"subject":"Help needed","description":"I have a problem with...","priority":"normal","requester":{"name":"John Doe","email":"john@example.com"},"tags":["urgent","billing"]}}',
        response: "ticket.id — ticket ID, ticket.url",
        notes: [
          "Body обёрнут: {ticket: {...}}",
          "priority: 'urgent', 'high', 'normal', 'low'",
          "requester: создаст нового пользователя если email не существует",
          "type: 'problem', 'incident', 'question', 'task'"
        ]
      },
      update_ticket: {
        method: "PUT",
        path: "/tickets/{id}",
        description: "Обновить тикет (статус, комментарий и т.д.)",
        bodyExample: '{"ticket":{"status":"solved","comment":{"body":"Issue resolved!","public":true}}}',
        response: "ticket — обновлённый объект",
        notes: [
          "comment.body: добавить комментарий",
          "comment.public: true = видимый клиенту, false = внутренний",
          "status: 'new', 'open', 'pending', 'hold', 'solved', 'closed'"
        ]
      },
      search: {
        method: "GET",
        path: "/search",
        description: "Поиск тикетов, пользователей и т.д.",
        response: "results[] — массив результатов",
        notes: [
          "?query=type:ticket status:open priority:urgent",
          "Zendesk search syntax (не SQL!)"
        ]
      }
    },
    n8nNotes: [
      "Basic Auth: email/token:API_KEY (буквально 'user@email.com/token' как username!)",
      "Subdomain в URL: {company}.zendesk.com",
      "Body обёрнут: {ticket: {...}}, {user: {...}}",
      "comment.public для видимости клиенту",
      "n8n имеет встроенную Zendesk ноду"
    ],
    rateLimits: "400 req/min (Team), 700 req/min (Professional+).",
    docsUrl: "https://developer.zendesk.com/api-reference/"
  },

  {
    name: "Intercom",
    description: "Customer messaging platform. Bearer token. Versioned API (Intercom-Version header рекомендуется).",
    category: ["support", "messaging", "crm"],
    baseUrl: "https://api.intercom.io",
    auth: {
      type: "bearer",
      setup: "В n8n: Bearer auth с Intercom Access Token (из Settings → Developer Hub → App → Authentication)."
    },
    defaultHeaders: {
      "Content-Type": "application/json",
      "Intercom-Version": "2.11"
    },
    endpoints: {
      create_contact: {
        method: "POST",
        path: "/contacts",
        description: "Создать или обновить контакт (lead или user)",
        bodyExample: '{"role":"user","email":"john@example.com","name":"John Doe","custom_attributes":{"plan":"premium"}}',
        response: "id — contact ID, type: 'contact'",
        notes: [
          "role: 'user' (идентифицированный) или 'lead' (анонимный)",
          "external_id: ваш ID пользователя (для маппинга)",
          "custom_attributes: произвольные поля"
        ]
      },
      send_message: {
        method: "POST",
        path: "/messages",
        description: "Отправить сообщение (in-app, email)",
        bodyExample: '{"message_type":"inapp","subject":"Welcome!","body":"Thanks for signing up!","from":{"type":"admin","id":"ADMIN_ID"},"to":{"type":"user","id":"CONTACT_ID"}}',
        response: "id — message ID, type: 'admin_message'",
        notes: [
          "message_type: 'inapp' или 'email'",
          "from: admin (оператор), to: user/lead (контакт)",
          "Для conversation reply: POST /conversations/{id}/reply"
        ]
      },
      search_contacts: {
        method: "POST",
        path: "/contacts/search",
        description: "Поиск контактов с фильтрами. POST, не GET!",
        bodyExample: '{"query":{"field":"email","operator":"=","value":"john@example.com"}}',
        response: "data[] — массив contact объектов",
        notes: [
          "POST для поиска!",
          "Operators: =, !=, ~, !~, <, >, IN, NIN"
        ]
      }
    },
    n8nNotes: [
      "Intercom-Version header рекомендуется (без него — default version)",
      "Поиск через POST (не GET!)",
      "role: 'user' vs 'lead' — разные типы контактов",
      "Conversation reply: POST /conversations/{id}/reply (не /messages!)",
      "n8n имеет встроенную Intercom ноду"
    ],
    rateLimits: "~83 req/10sec (500 req/min).",
    docsUrl: "https://developers.intercom.com/docs/references/rest-api/api.intercom.io/"
  },

  {
    name: "Freshdesk",
    description: "Helpdesk API. Basic Auth (API Key:X). Domain-specific URL. Простой REST.",
    category: ["support", "helpdesk", "ticketing"],
    baseUrl: "https://{domain}.freshdesk.com/api/v2",
    auth: {
      type: "basic",
      setup: "В n8n: HTTP Basic Auth. Username = API Key, Password = 'X' (буквально буква X). API Key из Profile → API Key."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_ticket: {
        method: "POST",
        path: "/tickets",
        description: "Создать тикет",
        bodyExample: '{"subject":"Help needed","description":"<p>Problem description in HTML</p>","email":"john@example.com","priority":2,"status":2,"type":"Question"}',
        response: "id — ticket ID",
        notes: [
          "priority: 1 (Low), 2 (Medium), 3 (High), 4 (Urgent)",
          "status: 2 (Open), 3 (Pending), 4 (Resolved), 5 (Closed)",
          "description: HTML формат",
          "email ИЛИ requester_id обязателен"
        ]
      },
      list_tickets: {
        method: "GET",
        path: "/tickets",
        description: "Список тикетов",
        response: "Массив ticket объектов",
        notes: [
          "?filter=new_and_my_open — предустановленные фильтры",
          "?per_page=30&page=1",
          "?updated_since=2026-01-01T00:00:00Z"
        ]
      },
      reply_to_ticket: {
        method: "POST",
        path: "/tickets/{id}/reply",
        description: "Ответить на тикет",
        bodyExample: '{"body":"<p>Thanks for reaching out! Here is the solution...</p>"}',
        response: "id — reply ID",
        notes: ["body: HTML формат"]
      }
    },
    n8nNotes: [
      "Basic Auth: API Key как username, 'X' как password (буквально X!)",
      "Domain в URL: {company}.freshdesk.com",
      "priority/status: ЧИСЛА (не строки!): 1=Low, 2=Medium/Open и т.д.",
      "description и body: HTML формат",
      "n8n имеет встроенную Freshdesk ноду"
    ],
    rateLimits: "Зависит от плана. Free: 50 req/min.",
    docsUrl: "https://developers.freshdesk.com/api/"
  },

  {
    name: "Crisp",
    description: "Customer messaging. Basic Auth (identifier:key) + X-Crisp-Tier header. Website ID в URL.",
    category: ["support", "live-chat", "messaging"],
    baseUrl: "https://api.crisp.chat/v1",
    auth: {
      type: "basic",
      setup: "В n8n: HTTP Basic Auth. Username = Token Identifier, Password = Token Key. ОБЯЗАТЕЛЬНЫЙ header X-Crisp-Tier: plugin."
    },
    defaultHeaders: {
      "Content-Type": "application/json",
      "X-Crisp-Tier": "plugin"
    },
    endpoints: {
      send_message: {
        method: "POST",
        path: "/website/{website_id}/conversation/{session_id}/message",
        description: "Отправить сообщение в conversation",
        bodyExample: '{"type":"text","from":"operator","origin":"chat","content":"Hello! How can I help you?"}',
        response: "data.fingerprint — message ID",
        notes: [
          "website_id и session_id в URL пути",
          "from: 'operator' (агент) или 'user' (клиент)",
          "type: 'text', 'file', 'animation', 'audio', 'picker', 'field', 'carousel', 'note'",
          "origin: 'chat' (стандарт)"
        ]
      },
      list_conversations: {
        method: "GET",
        path: "/website/{website_id}/conversations/{page_number}",
        description: "Список conversation",
        response: "data[] — массив conversation объектов",
        notes: [
          "page_number в URL пути (не query param!)",
          "website_id обязателен в каждом запросе"
        ]
      },
      change_state: {
        method: "PATCH",
        path: "/website/{website_id}/conversation/{session_id}/state",
        description: "Изменить статус conversation (resolved/unresolved)",
        bodyExample: '{"state":"resolved"}',
        response: "data — обновлённый state",
        notes: ["state: 'resolved', 'unresolved', 'pending'"]
      }
    },
    n8nNotes: [
      "Basic Auth: identifier:key (token keypair из Crisp Marketplace)",
      "ОБЯЗАТЕЛЬНЫЙ header X-Crisp-Tier: plugin (или user)",
      "website_id В URL каждого запроса",
      "page_number в URL пути (не query!): /conversations/1",
      "Типы сообщений: text, note (внутренний), file, picker и др."
    ],
    rateLimits: "Rate limits + daily quotas. ~10 req/sec.",
    docsUrl: "https://docs.crisp.chat/references/rest-api/v1/"
  },

  {
    name: "LiveChat",
    description: "Live chat API. Bearer OAuth2 или PAT. Versioned API.",
    category: ["support", "live-chat"],
    baseUrl: "https://api.livechatinc.com/v3.5",
    auth: {
      type: "bearer",
      setup: "В n8n: Bearer auth с Personal Access Token (из Developer Console → Tools → Personal Access Tokens)."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      send_event: {
        method: "POST",
        path: "/agent/action/send_event",
        description: "Отправить сообщение в чат",
        bodyExample: '{"chat_id":"CHAT_ID","event":{"type":"message","text":"Hello! How can I help?"}}',
        response: "event_id",
        notes: [
          "Agent API: /agent/action/...",
          "Customer API: /customer/action/... (другой scope!)",
          "event.type: 'message', 'file', 'rich_message', 'system_message'"
        ]
      },
      list_chats: {
        method: "POST",
        path: "/agent/action/list_chats",
        description: "Список чатов. POST, не GET!",
        bodyExample: '{"filters":{"include_active":true,"include_chats_without_threads":false},"limit":25}',
        response: "chats[] — массив chat объектов с thread[]",
        notes: ["POST для списка (не GET!)"]
      }
    },
    n8nNotes: [
      "ДВА API: Agent API (/agent/) и Customer API (/customer/) — разные scope!",
      "POST для ВСЕХ операций (включая list)!",
      "PAT проще чем OAuth2 для server-side"
    ],
    rateLimits: "~10 req/sec per token.",
    docsUrl: "https://developers.livechat.com/docs/messaging/agent-chat-api/"
  },

  {
    name: "Help Scout",
    description: "Helpdesk API. Bearer OAuth2. Mailbox-based conversations.",
    category: ["support", "helpdesk"],
    baseUrl: "https://api.helpscout.net/v2",
    auth: {
      type: "bearer",
      setup: "OAuth2: POST https://api.helpscout.net/v2/oauth2/token с client_id, client_secret, grant_type=client_credentials. Bearer auth."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_conversation: {
        method: "POST",
        path: "/conversations",
        description: "Создать conversation (тикет)",
        bodyExample: '{"subject":"Help needed","customer":{"email":"john@example.com"},"mailboxId":12345,"type":"email","status":"active","threads":[{"type":"customer","text":"I need help with my order"}]}',
        response: "ID в Location header (не в body!)",
        notes: [
          "ID созданного conversation в LOCATION HEADER (не в body!)",
          "mailboxId обязателен",
          "threads[]: начальное сообщение",
          "type: 'email', 'phone', 'chat'"
        ]
      },
      list_conversations: {
        method: "GET",
        path: "/conversations",
        description: "Список conversations",
        response: "_embedded.conversations[] — массив",
        notes: [
          "HAL+JSON формат ответа!",
          "_embedded содержит данные, _links содержит пагинацию",
          "?mailbox=12345&status=active"
        ]
      }
    },
    n8nNotes: [
      "OAuth2: client_credentials flow",
      "HAL+JSON формат ответов (_embedded, _links)",
      "Created resource ID в Location header (не в body!)",
      "mailboxId обязателен для создания"
    ],
    rateLimits: "400 req/min.",
    docsUrl: "https://developer.helpscout.com/mailbox-api/"
  },

  {
    name: "Chatwoot",
    description: "Open-source customer support. Bearer API token. Self-hosted или cloud.",
    category: ["support", "live-chat", "open-source", "self-hosted"],
    baseUrl: "https://{host}/api/v1",
    auth: {
      type: "bearer",
      setup: "В n8n: добавь заголовок api_access_token: YOUR_TOKEN. Или Bearer auth. Получи из Profile Settings → Access Token."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      send_message: {
        method: "POST",
        path: "/accounts/{account_id}/conversations/{conversation_id}/messages",
        description: "Отправить сообщение в conversation",
        bodyExample: '{"content":"Hello! How can I help?","message_type":"outgoing","private":false}',
        response: "id — message ID",
        notes: [
          "message_type: 'outgoing' (от агента), 'incoming' (от клиента)",
          "private: true = internal note",
          "account_id в URL пути"
        ]
      },
      create_contact: {
        method: "POST",
        path: "/accounts/{account_id}/contacts",
        description: "Создать контакт",
        bodyExample: '{"name":"John Doe","email":"john@example.com","phone_number":"+79991234567"}',
        response: "payload.contact.id",
        notes: ["Ответ обёрнут: {payload: {contact: {...}}}"]
      },
      list_conversations: {
        method: "GET",
        path: "/accounts/{account_id}/conversations",
        description: "Список conversations",
        response: "data.payload[] — массив conversation объектов",
        notes: [
          "?status=open&assignee_type=me",
          "?page=1"
        ]
      }
    },
    n8nNotes: [
      "Auth: заголовок api_access_token ИЛИ Bearer token",
      "account_id В URL каждого запроса",
      "Self-hosted: URL зависит от деплоя",
      "Cloud: app.chatwoot.com",
      "Open-source альтернатива Intercom/Zendesk"
    ],
    rateLimits: "Self-hosted: нет. Cloud: varies.",
    docsUrl: "https://www.chatwoot.com/developers/api/"
  },

  {
    name: "Tawk.to",
    description: "Бесплатный live chat. НЕТ публичного REST API для отправки сообщений. Только Webhooks + REST API.",
    category: ["support", "live-chat", "free"],
    baseUrl: "https://api.tawk.to/v3",
    auth: {
      type: "bearer",
      setup: "REST API ограничен. Bearer auth с API Key из Dashboard → Administration → API Keys."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      webhook: {
        method: "POST",
        path: "WEBHOOK_URL",
        description: "Webhook: получать уведомления о новых чатах и сообщениях",
        notes: [
          "Основной способ интеграции: Webhooks (не REST API!)",
          "Events: chat:start, chat:end, ticket:create, visitor:online",
          "Настрой в Dashboard → Administration → Webhooks",
          "Payload: JSON с event, data (visitor, messages)"
        ]
      },
      list_chats: {
        method: "GET",
        path: "/chats",
        description: "Список чатов (REST API)",
        response: "data[] — массив chat объектов",
        notes: [
          "REST API ограничен по функционалу",
          "Основные операции: чтение чатов, тикетов, посетителей"
        ]
      }
    },
    n8nNotes: [
      "ОСНОВНОЙ СПОСОБ: Webhooks (не REST API!)",
      "REST API ограничен — нельзя отправлять сообщения через API",
      "Для n8n: настрой Webhook → n8n Webhook trigger",
      "Бесплатный live chat — подходит для малого бизнеса",
      "Для полноценного API: используй Crisp или Chatwoot"
    ],
    rateLimits: "Не документировано.",
    docsUrl: "https://developer.tawk.to/"
  },

  {
    name: "Google Analytics (GA4)",
    description: "GA4 Data API. OAuth2. Для чтения аналитики. Measurement Protocol для отправки событий.",
    category: ["analytics", "google"],
    baseUrl: "https://analyticsdata.googleapis.com/v1beta",
    auth: {
      type: "oauth2",
      setup: "OAuth2 через Google Cloud Console (Service Account рекомендуется). Для Measurement Protocol: API secret в query (без OAuth)."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      run_report: {
        method: "POST",
        path: "/properties/{propertyId}:runReport",
        description: "Запустить аналитический отчёт (Data API — чтение)",
        bodyExample: '{"dateRanges":[{"startDate":"2026-01-01","endDate":"2026-03-01"}],"metrics":[{"name":"activeUsers"},{"name":"sessions"}],"dimensions":[{"name":"country"},{"name":"deviceCategory"}],"limit":100}',
        response: "rows[] — массив с dimensionValues и metricValues",
        notes: [
          "propertyId: GA4 Property ID (число, без 'properties/' префикса в body)",
          "dateRanges: обязателен! startDate/endDate в YYYY-MM-DD",
          "metrics: activeUsers, sessions, screenPageViews, conversions и др.",
          "dimensions: country, city, deviceCategory, sessionSource и др.",
          "OAuth2 с Service Account → добавь SA email в GA4 Property Access"
        ]
      },
      measurement_protocol: {
        method: "POST",
        path: "https://www.google-analytics.com/mp/collect",
        description: "Отправить событие (Measurement Protocol — БЕЗ OAuth!)",
        bodyExample: '{"client_id":"CLIENT_ID","events":[{"name":"purchase","params":{"currency":"USD","value":9.99,"items":[{"item_name":"Product"}]}}]}',
        response: "Пустое тело при успехе (204)",
        notes: [
          "ДРУГОЙ URL: www.google-analytics.com/mp/collect (не analyticsdata!)",
          "Auth в query: ?measurement_id=G-XXXXX&api_secret=YOUR_SECRET",
          "НЕТ OAuth — api_secret из GA4 Admin → Data Streams → Measurement Protocol",
          "client_id обязателен (ваш ID клиента)",
          "ПУСТОЕ ТЕЛО при успехе (204) — нет validation ответа!",
          "Для debug: /mp/collect → /debug/mp/collect (покажет ошибки)"
        ]
      }
    },
    n8nNotes: [
      "ДВА API: Data API (OAuth2, чтение) и Measurement Protocol (api_secret, запись)",
      "Data API: OAuth2 с Service Account (сложная настройка)",
      "Measurement Protocol: ?measurement_id=G-XXX&api_secret=SECRET (без OAuth!)",
      "MP: ПУСТОЕ ТЕЛО при успехе — для debug используй /debug/mp/collect",
      "n8n имеет встроенную Google Analytics ноду"
    ],
    rateLimits: "Data API: 10 req/sec. MP: нет строгих лимитов.",
    docsUrl: "https://developers.google.com/analytics/devguides/reporting/data/v1"
  },

  {
    name: "Mixpanel",
    description: "Product analytics. ДВА API: Import (track events — Basic Auth) и Query (read — Bearer).",
    category: ["analytics", "product-analytics"],
    baseUrl: "https://api.mixpanel.com",
    auth: {
      type: "basic",
      setup: "Import API: Basic Auth (username = Service Account Username, password = Service Account Secret). Query API (mixpanel.com/api/2.0): Basic Auth с SA credentials."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      track: {
        method: "POST",
        path: "/import",
        description: "Импортировать события (batch). Рекомендуемый endpoint.",
        bodyExample: '[{"event":"Sign Up","properties":{"distinct_id":"user_123","time":1741024800,"$insert_id":"unique_event_id","plan":"premium"}},{"event":"Purchase","properties":{"distinct_id":"user_123","time":1741024900,"amount":29.99}}]',
        response: "code: 200, num_records_imported — кол-во импортированных",
        notes: [
          "Body = МАССИВ событий (batch!)",
          "Basic Auth: SA Username : SA Secret",
          "?project_id=YOUR_PROJECT_ID в query",
          "properties.distinct_id ОБЯЗАТЕЛЕН (ID пользователя)",
          "properties.time: UNIX timestamp в секундах",
          "properties.$insert_id: уникальный ID для дедупликации"
        ]
      },
      track_simple: {
        method: "GET",
        path: "/track",
        description: "Простой трекинг (одно событие через GET). Проще но ограниченнее.",
        response: "1 при успехе, 0 при ошибке",
        notes: [
          "?data=BASE64_ENCODED_JSON — событие в base64!",
          "Без auth — проект определяется по token в data",
          "Для серверного: используй /import вместо /track"
        ]
      }
    },
    n8nNotes: [
      "/import (POST, batch, Basic Auth) — рекомендуемый для серверного трекинга",
      "/track (GET, base64 в query) — простой но устаревающий",
      "Basic Auth: Service Account credentials",
      "?project_id= обязателен для /import",
      "distinct_id ОБЯЗАТЕЛЕН в каждом событии"
    ],
    rateLimits: "Import: 2000 events/sec. Track: rate limited.",
    docsUrl: "https://developer.mixpanel.com/reference/import-events"
  },

  {
    name: "Segment",
    description: "Customer data platform. Basic Auth (Write Key:). Track, Identify, Page, Screen events.",
    category: ["analytics", "cdp", "data-platform"],
    baseUrl: "https://api.segment.io/v1",
    auth: {
      type: "basic",
      setup: "В n8n: HTTP Basic Auth. Username = Write Key (из Source Settings), Password = пустой."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      track: {
        method: "POST",
        path: "/track",
        description: "Отправить event (действие пользователя)",
        bodyExample: '{"userId":"user_123","event":"Order Completed","properties":{"revenue":52.00,"currency":"USD","orderId":"order_456"},"timestamp":"2026-03-05T12:00:00Z"}',
        response: "success: true",
        notes: [
          "userId ИЛИ anonymousId ОБЯЗАТЕЛЕН!",
          "event: имя события (human-readable: 'Order Completed', не 'order_completed')",
          "properties: произвольный объект",
          "timestamp: ISO 8601 (опционален, default = now)"
        ]
      },
      identify: {
        method: "POST",
        path: "/identify",
        description: "Идентифицировать пользователя (привязать traits)",
        bodyExample: '{"userId":"user_123","traits":{"name":"John Doe","email":"john@example.com","plan":"premium","createdAt":"2026-01-01T00:00:00Z"}}',
        response: "success: true",
        notes: [
          "traits: свойства пользователя (name, email, plan и т.д.)",
          "Вызывай при регистрации и изменении профиля"
        ]
      },
      batch: {
        method: "POST",
        path: "/batch",
        description: "Batch отправка нескольких событий. До 500KB / 2500 events.",
        bodyExample: '{"batch":[{"type":"track","userId":"user_123","event":"Page Viewed","properties":{"page":"Home"}},{"type":"identify","userId":"user_123","traits":{"name":"John"}}]}',
        response: "success: true",
        notes: [
          "batch: массив событий с type (track, identify, page, screen, group)",
          "Макс 500KB per request, 2500 events, 32KB per event",
          "Каждое событие должно иметь type + userId/anonymousId"
        ]
      }
    },
    n8nNotes: [
      "Basic Auth: Write Key как username, password ПУСТОЙ",
      "userId ИЛИ anonymousId обязателен в КАЖДОМ event!",
      "Типы: track (действие), identify (профиль), page (просмотр), screen (мобильный)",
      "Segment роутит данные во ВСЕ подключённые destinations автоматически",
      "batch: до 2500 events за запрос"
    ],
    rateLimits: "1000 events/sec per source. Engage: 1000/sec.",
    docsUrl: "https://segment.com/docs/connections/sources/catalog/libraries/server/http-api/"
  },

  {
    name: "Amplitude",
    description: "Product analytics. API Key в header. HTTP V2 API для track, Export для query.",
    category: ["analytics", "product-analytics"],
    baseUrl: "https://api2.amplitude.com",
    auth: {
      type: "header",
      setup: "Для tracking: Api-Key: YOUR_API_KEY в header (HTTP V2 API). Для export: Basic Auth (API Key:Secret Key).",
      headerName: "Api-Key"
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      track: {
        method: "POST",
        path: "/2/httpapi",
        description: "Отправить события (batch)",
        bodyExample: '{"api_key":"YOUR_API_KEY","events":[{"user_id":"user_123","event_type":"Purchase","event_properties":{"product":"Premium Plan","revenue":29.99},"time":1741024800000}]}',
        response: "code: 200, events_ingested — кол-во",
        notes: [
          "api_key В BODY (не только в header!)",
          "events: массив (batch до 2000 events или 20MB)",
          "user_id ИЛИ device_id обязателен",
          "event_type: имя события",
          "time: UNIX timestamp в МИЛЛИСЕКУНДАХ!",
          "event_properties: произвольный объект"
        ]
      },
      identify: {
        method: "POST",
        path: "/identify",
        description: "Обновить user properties",
        bodyExample: '{"api_key":"YOUR_API_KEY","identification":[{"user_id":"user_123","user_properties":{"$set":{"name":"John","plan":"premium"}}}]}',
        response: "code: 200",
        notes: [
          "user_properties.$set: установить свойства",
          "user_properties.$unset: удалить свойства",
          "identification: массив (batch)"
        ]
      }
    },
    n8nNotes: [
      "api_key В BODY запроса (не только в header!)",
      "time в МИЛЛИСЕКУНДАХ (не секундах!)",
      "user_id ИЛИ device_id обязателен",
      "Batch: до 2000 events за запрос",
      "Export API (чтение): Basic Auth с API Key:Secret Key"
    ],
    rateLimits: "Batch: 30 events/sec per device. Concurrent: varies.",
    docsUrl: "https://www.docs.developers.amplitude.com/analytics/apis/http-v2-api/"
  },

  {
    name: "Plausible",
    description: "Privacy-first analytics. Bearer API key. Простой REST для чтения + Events API для записи.",
    category: ["analytics", "privacy", "open-source"],
    baseUrl: "https://plausible.io/api",
    auth: {
      type: "bearer",
      setup: "В n8n: Bearer auth с Plausible API Key (из Settings → API Keys)."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      send_event: {
        method: "POST",
        path: "/event",
        description: "Отправить pageview или custom event",
        bodyExample: '{"name":"pageview","url":"https://example.com/page","domain":"example.com"}',
        response: "Accepted (202). Пустое тело.",
        notes: [
          "name: 'pageview' для просмотра, или custom event name",
          "url и domain ОБЯЗАТЕЛЬНЫ",
          "ПУСТОЕ ТЕЛО при 202 Accepted",
          "User-Agent header важен для device detection",
          "X-Forwarded-For: IP посетителя (для location)"
        ]
      },
      get_stats: {
        method: "GET",
        path: "/v1/stats/aggregate",
        description: "Получить агрегированную статистику",
        response: "results — объект с метриками (visitors, pageviews, bounce_rate и т.д.)",
        notes: [
          "?site_id=example.com&period=30d&metrics=visitors,pageviews",
          "period: day, 7d, 30d, month, 6mo, 12mo, custom",
          "metrics: visitors, visits, pageviews, views_per_visit, bounce_rate, visit_duration, events",
          "filters: visit:source==Google (фильтрация)"
        ]
      },
      get_breakdown: {
        method: "GET",
        path: "/v1/stats/breakdown",
        description: "Статистика по dimensions (breakdown)",
        response: "results[] — массив с property и метриками",
        notes: [
          "?site_id=example.com&period=30d&property=visit:source&metrics=visitors",
          "property: visit:source, visit:country, event:page, event:name и др."
        ]
      }
    },
    n8nNotes: [
      "Простейший analytics API",
      "Events API: POST /api/event (pageview или custom event)",
      "Stats API: GET /api/v1/stats/... (чтение)",
      "site_id = domain (example.com)",
      "Privacy-first: не собирает cookies, GDPR-compliant",
      "Self-hosted или Plausible Cloud"
    ],
    rateLimits: "600 req/hour для Stats API.",
    docsUrl: "https://plausible.io/docs/stats-api"
  },

  {
    name: "PostHog",
    description: "Open-source product analytics. Bearer/Project API Key. Events, feature flags, session replay.",
    category: ["analytics", "product-analytics", "open-source"],
    baseUrl: "https://app.posthog.com",
    auth: {
      type: "bearer",
      setup: "Capture API: Project API Key в body (без header!). Read API: Bearer с Personal API Key."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      capture: {
        method: "POST",
        path: "/capture/",
        description: "Отправить событие. API key В BODY (не в header!)",
        bodyExample: '{"api_key":"YOUR_PROJECT_API_KEY","event":"user signed up","distinct_id":"user_123","properties":{"plan":"premium","$current_url":"https://example.com/signup"},"timestamp":"2026-03-05T12:00:00Z"}',
        response: "status: 1 при успехе",
        notes: [
          "api_key В BODY (не в header!)",
          "distinct_id ОБЯЗАТЕЛЕН (ID пользователя)",
          "event: имя события",
          "properties: произвольный объект",
          "Свойства с $: зарезервированные ($current_url, $browser и т.д.)",
          "Trailing slash обязателен: /capture/ (не /capture)"
        ]
      },
      capture_batch: {
        method: "POST",
        path: "/batch/",
        description: "Batch отправка событий",
        bodyExample: '{"api_key":"YOUR_PROJECT_API_KEY","batch":[{"event":"pageview","distinct_id":"user_123","properties":{"$current_url":"https://example.com"}},{"event":"click","distinct_id":"user_123","properties":{"element":"button"}}]}',
        response: "status: 1",
        notes: ["batch: массив событий. api_key на верхнем уровне (один раз)"]
      },
      query_insights: {
        method: "GET",
        path: "/api/projects/{project_id}/insights/",
        description: "Получить сохранённые insights (чтение). Personal API Key!",
        response: "results[] — массив insight объектов",
        notes: [
          "Bearer auth с Personal API Key (не Project API Key!)",
          "Personal API Key: из User Settings → Personal API Keys"
        ]
      }
    },
    n8nNotes: [
      "Capture: api_key В BODY (не в header!) + Project API Key",
      "Read API: Bearer с Personal API Key (другой ключ!)",
      "distinct_id ОБЯЗАТЕЛЕН (ID пользователя)",
      "Trailing slash обязателен: /capture/, /batch/",
      "Self-hosted: замени app.posthog.com на свой URL",
      "Open-source альтернатива Mixpanel/Amplitude"
    ],
    rateLimits: "Self-hosted: нет. Cloud: varies.",
    docsUrl: "https://posthog.com/docs/api"
  },

  {
    name: "GitHub",
    description: "GitHub REST API. Bearer token. Обязательный Accept header. Мощнейший VCS API.",
    category: ["devtools", "git", "vcs"],
    baseUrl: "https://api.github.com",
    auth: {
      type: "bearer",
      setup: "В n8n: Bearer auth с Personal Access Token (Classic или Fine-grained). Из Settings → Developer Settings → Personal Access Tokens."
    },
    defaultHeaders: {
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    endpoints: {
      create_issue: {
        method: "POST",
        path: "/repos/{owner}/{repo}/issues",
        description: "Создать issue",
        bodyExample: '{"title":"Bug: login broken","body":"Steps to reproduce:\\n1. Go to login page\\n2. Click submit","labels":["bug","urgent"],"assignees":["username"]}',
        response: "number — issue номер, html_url — URL issue",
        notes: [
          "owner/repo в URL пути",
          "body: Markdown формат",
          "labels и assignees: массивы строк"
        ]
      },
      create_repo: {
        method: "POST",
        path: "/user/repos",
        description: "Создать репозиторий",
        bodyExample: '{"name":"my-repo","description":"My new repo","private":true,"auto_init":true}',
        response: "id, full_name, html_url, clone_url",
        notes: ["auto_init: true — создаст README"]
      },
      list_repos: {
        method: "GET",
        path: "/user/repos",
        description: "Список репозиториев текущего пользователя",
        response: "Массив repo объектов",
        notes: [
          "?sort=updated&direction=desc&per_page=30",
          "Пагинация: Link header с rel='next'"
        ]
      },
      get_file_content: {
        method: "GET",
        path: "/repos/{owner}/{repo}/contents/{path}",
        description: "Получить содержимое файла",
        response: "content — base64 encoded, sha — для обновления",
        notes: [
          "content: base64 encoded! Нужно декодировать",
          "sha: нужен для PUT (обновление файла)",
          "?ref=branch_name — конкретная ветка"
        ]
      },
      create_or_update_file: {
        method: "PUT",
        path: "/repos/{owner}/{repo}/contents/{path}",
        description: "Создать или обновить файл. PUT, не POST!",
        bodyExample: '{"message":"Update README","content":"BASE64_ENCODED_CONTENT","sha":"CURRENT_SHA_FOR_UPDATE","branch":"main"}',
        response: "content.html_url",
        notes: [
          "content: base64 encoded новое содержимое!",
          "sha ОБЯЗАТЕЛЕН для обновления (получи через GET contents)",
          "sha НЕ нужен для создания нового файла",
          "message: commit message"
        ]
      }
    },
    n8nNotes: [
      "Accept: application/vnd.github+json рекомендуется",
      "X-GitHub-Api-Version: 2022-11-28 рекомендуется",
      "File content: base64 encoded (и в запросе, и в ответе!)",
      "sha нужен для обновления файла — сначала GET, потом PUT с sha",
      "Пагинация: Link header (не в body!)",
      "n8n имеет встроенную GitHub ноду"
    ],
    rateLimits: "5000 req/hour с auth. 60 req/hour без auth.",
    docsUrl: "https://docs.github.com/en/rest"
  },

  {
    name: "GitLab",
    description: "GitLab REST API. Bearer (Personal Access Token) или PRIVATE-TOKEN header.",
    category: ["devtools", "git", "vcs", "ci-cd"],
    baseUrl: "https://gitlab.com/api/v4",
    auth: {
      type: "header",
      setup: "В n8n: добавь заголовок PRIVATE-TOKEN: YOUR_PAT. Или Bearer auth. PAT из User Settings → Access Tokens.",
      headerName: "PRIVATE-TOKEN"
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_issue: {
        method: "POST",
        path: "/projects/{id}/issues",
        description: "Создать issue",
        bodyExample: '{"title":"Bug report","description":"Steps to reproduce...","labels":"bug,urgent","assignee_ids":[123]}',
        response: "iid — issue номер (project-scoped), web_url",
        notes: [
          "id: project ID (число) ИЛИ URL-encoded path (owner%2Frepo)",
          "labels: СТРОКА через запятую (не массив!)",
          "iid: номер issue в проекте (не глобальный id)"
        ]
      },
      list_projects: {
        method: "GET",
        path: "/projects",
        description: "Список проектов",
        response: "Массив project объектов",
        notes: [
          "?membership=true — только мои проекты",
          "?search=keyword — поиск",
          "Пагинация: page + per_page query params (не Link header!)"
        ]
      },
      trigger_pipeline: {
        method: "POST",
        path: "/projects/{id}/trigger/pipeline",
        description: "Запустить CI/CD pipeline",
        bodyExample: '{"ref":"main","token":"YOUR_PIPELINE_TRIGGER_TOKEN","variables":{"DEPLOY_ENV":"production"}}',
        response: "id — pipeline ID, web_url",
        notes: [
          "token: Pipeline Trigger Token (отдельный от PAT!)",
          "ref: branch или tag name",
          "variables: объект с переменными CI"
        ]
      }
    },
    n8nNotes: [
      "Auth: PRIVATE-TOKEN header ИЛИ Bearer auth — оба работают",
      "Project ID: число ИЛИ URL-encoded path (owner%2Frepo)",
      "labels = строка через запятую (не массив!)",
      "Пагинация: page/per_page в query (X-Total в response header)",
      "Self-hosted: замени gitlab.com на свой URL"
    ],
    rateLimits: "2000 req/min (authenticated).",
    docsUrl: "https://docs.gitlab.com/ee/api/rest/"
  },

  {
    name: "Vercel",
    description: "Deployment platform API. Bearer token. Деплой, домены, env vars.",
    category: ["devtools", "hosting", "deployment"],
    baseUrl: "https://api.vercel.com",
    auth: {
      type: "bearer",
      setup: "В n8n: Bearer auth с Vercel Token (из Settings → Tokens)."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      list_deployments: {
        method: "GET",
        path: "/v6/deployments",
        description: "Список деплоев",
        response: "deployments[] — массив с uid, url, state, created",
        notes: [
          "?projectId=YOUR_PROJECT_ID — фильтр по проекту",
          "?teamId=YOUR_TEAM_ID — для team проектов",
          "state: READY, ERROR, BUILDING, QUEUED"
        ]
      },
      create_deployment: {
        method: "POST",
        path: "/v13/deployments",
        description: "Создать деплой",
        bodyExample: '{"name":"my-project","gitSource":{"type":"github","ref":"main","repoId":"REPO_ID"}}',
        response: "id — deployment ID, url — deployment URL",
        notes: [
          "Обычно деплой через git push (auto)",
          "API деплой: для programmatic control",
          "?teamId= если team project"
        ]
      },
      list_env_vars: {
        method: "GET",
        path: "/v10/projects/{projectId}/env",
        description: "Список environment variables проекта",
        response: "envs[] — массив env var объектов",
        notes: ["?teamId= для team projects"]
      },
      create_env_var: {
        method: "POST",
        path: "/v10/projects/{projectId}/env",
        description: "Создать environment variable",
        bodyExample: '{"key":"API_KEY","value":"secret_value","type":"encrypted","target":["production","preview"]}',
        response: "Созданный env var объект",
        notes: [
          "type: 'encrypted' (secret), 'plain', 'system'",
          "target: ['production', 'preview', 'development']"
        ]
      }
    },
    n8nNotes: [
      "Bearer token из Settings → Tokens",
      "?teamId= обязателен для team проектов (не personal)",
      "Versioned endpoints: /v6/deployments, /v10/projects/... (разные версии!)",
      "Обычно деплой через git, API для env vars и management"
    ],
    rateLimits: "Зависит от плана.",
    docsUrl: "https://vercel.com/docs/rest-api"
  },

  {
    name: "Netlify",
    description: "Deployment platform API. Bearer token. Sites, deploys, forms.",
    category: ["devtools", "hosting", "deployment"],
    baseUrl: "https://api.netlify.com/api/v1",
    auth: {
      type: "bearer",
      setup: "В n8n: Bearer auth с Netlify Personal Access Token (из User Settings → Applications → Personal Access Tokens)."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      list_sites: {
        method: "GET",
        path: "/sites",
        description: "Список сайтов",
        response: "Массив site объектов с id, name, url, ssl_url",
        notes: ["?filter=all — все сайты"]
      },
      create_site_deploy: {
        method: "POST",
        path: "/sites/{site_id}/deploys",
        description: "Создать деплой для сайта",
        bodyExample: '{"branch":"main"}',
        response: "id — deploy ID, state, deploy_url",
        notes: ["Обычно через git, API для programmatic control"]
      },
      list_form_submissions: {
        method: "GET",
        path: "/forms/{form_id}/submissions",
        description: "Получить submissions из Netlify Forms",
        response: "Массив submission объектов с data (ответы)",
        notes: [
          "form_id: из Dashboard → Forms",
          "Netlify Forms: встроенные формы без backend"
        ]
      }
    },
    n8nNotes: [
      "Bearer token из User Settings → Applications",
      "Основные use cases: manage env vars, trigger deploys, read form submissions",
      "Netlify Forms submissions через API"
    ],
    rateLimits: "Зависит от плана.",
    docsUrl: "https://docs.netlify.com/api/get-started/"
  },

  {
    name: "DocuSign",
    description: "E-signature API. OAuth2 Bearer. Сложная настройка, мощный функционал.",
    category: ["devtools", "e-signature", "legal"],
    baseUrl: "https://{server}.docusign.net/restapi/v2.1",
    auth: {
      type: "oauth2",
      setup: "OAuth2 обязателен (Authorization Code Grant или JWT). Demo: demo.docusign.net. Production: {account-specific}.docusign.net."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_envelope: {
        method: "POST",
        path: "/accounts/{accountId}/envelopes",
        description: "Создать и отправить документ на подпись (envelope)",
        bodyExample: '{"emailSubject":"Please sign this document","recipients":{"signers":[{"email":"signer@example.com","name":"John Doe","recipientId":"1","routingOrder":"1","tabs":{"signHereTabs":[{"documentId":"1","pageNumber":"1","xPosition":"200","yPosition":"700"}]}}]},"documents":[{"documentBase64":"BASE64_PDF","name":"Contract.pdf","fileExtension":"pdf","documentId":"1"}],"status":"sent"}',
        response: "envelopeId — UUID конверта",
        notes: [
          "status: 'sent' = отправить сразу, 'created' = draft",
          "documents[].documentBase64: PDF в base64!",
          "tabs: позиции для подписи (signHereTabs, dateSignedTabs и т.д.)",
          "accountId: из /oauth/userinfo endpoint"
        ]
      },
      get_envelope_status: {
        method: "GET",
        path: "/accounts/{accountId}/envelopes/{envelopeId}",
        description: "Получить статус конверта",
        response: "status: 'sent', 'delivered', 'completed', 'declined', 'voided'",
        notes: ["Polling: проверяй status пока не 'completed'"]
      }
    },
    n8nNotes: [
      "OAuth2 обязателен — сложная настройка",
      "Demo: demo.docusign.net, Production: account-specific URL",
      "Documents: base64 encoded PDF",
      "tabs: координаты подписи на страницах (xPosition, yPosition)",
      "status:'sent' для отправки, 'created' для draft"
    ],
    rateLimits: "1000 req/hour per account.",
    docsUrl: "https://developers.docusign.com/docs/esign-rest-api/"
  },

  {
    name: "PandaDoc",
    description: "Document automation & e-signature. Bearer API Key. Создание документов из шаблонов.",
    category: ["devtools", "documents", "e-signature"],
    baseUrl: "https://api.pandadoc.com/public/v1",
    auth: {
      type: "bearer",
      setup: "В n8n: Bearer auth с PandaDoc API Key (из Settings → Integrations → API Key). Формат: API-Key YOUR_KEY."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      create_document: {
        method: "POST",
        path: "/documents",
        description: "Создать документ из шаблона",
        bodyExample: '{"name":"Contract for John","template_uuid":"YOUR_TEMPLATE_UUID","recipients":[{"email":"john@example.com","first_name":"John","last_name":"Doe","role":"Client"}],"tokens":[{"name":"Client.Company","value":"Acme Corp"}],"fields":{"amount":{"value":"10000"}}}',
        response: "id — document ID, status: 'document.uploaded'",
        notes: [
          "template_uuid: ID шаблона из PandaDoc Dashboard",
          "tokens: заполнить переменные в шаблоне ({Client.Company})",
          "fields: заполнить поля формы",
          "recipients: получатели с ролями"
        ]
      },
      send_document: {
        method: "POST",
        path: "/documents/{id}/send",
        description: "Отправить документ на подпись",
        bodyExample: '{"message":"Please review and sign","subject":"Document for your signature","silent":false}',
        response: "id, status: 'document.sent'",
        notes: [
          "Двухшаговый: create → send",
          "silent: true = без email уведомления"
        ]
      },
      get_document_status: {
        method: "GET",
        path: "/documents/{id}",
        description: "Получить статус документа",
        response: "status: 'document.draft', 'document.sent', 'document.completed' и др.",
        notes: ["Polling для проверки подписания"]
      }
    },
    n8nNotes: [
      "Auth header: 'API-Key YOUR_KEY' (с префиксом API-Key!)",
      "Двухшаговый: create document → send document",
      "tokens: подстановка переменных в шаблон",
      "Шаблоны создаются в PandaDoc UI"
    ],
    rateLimits: "Зависит от плана.",
    docsUrl: "https://developers.pandadoc.com/reference/"
  },

  {
    name: "Bitbucket",
    description: "Atlassian Git hosting. Basic Auth (App Password) или Bearer OAuth2.",
    category: ["devtools", "git", "vcs"],
    baseUrl: "https://api.bitbucket.org/2.0",
    auth: {
      type: "basic",
      setup: "В n8n: HTTP Basic Auth. Username = Bitbucket username, Password = App Password (из Personal Settings → App Passwords)."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      list_repos: {
        method: "GET",
        path: "/repositories/{workspace}",
        description: "Список репозиториев в workspace",
        response: "values[] — массив repo объектов с slug, full_name, links",
        notes: [
          "workspace: workspace slug (не username!)",
          "Пагинация: next URL в response"
        ]
      },
      create_issue: {
        method: "POST",
        path: "/repositories/{workspace}/{repo_slug}/issues",
        description: "Создать issue",
        bodyExample: '{"title":"Bug report","content":{"raw":"Description in Markdown"},"priority":"major","kind":"bug"}',
        response: "id — issue ID",
        notes: [
          "content.raw: Markdown формат",
          "priority: trivial, minor, major, critical, blocker",
          "kind: bug, enhancement, proposal, task"
        ]
      },
      create_pull_request: {
        method: "POST",
        path: "/repositories/{workspace}/{repo_slug}/pullrequests",
        description: "Создать pull request",
        bodyExample: '{"title":"Feature: new login","source":{"branch":{"name":"feature/login"}},"destination":{"branch":{"name":"main"}},"description":"Added new login page"}',
        response: "id — PR ID, links.html.href — URL",
        notes: ["source и destination: branch objects"]
      }
    },
    n8nNotes: [
      "Basic Auth: username + App Password (НЕ обычный пароль!)",
      "App Password: Personal Settings → App Passwords",
      "workspace slug в URL (не username!)",
      "content.raw для Markdown текста"
    ],
    rateLimits: "1000 req/hour per user.",
    docsUrl: "https://developer.atlassian.com/cloud/bitbucket/rest/intro/"
  },

  {
    name: "Sentry",
    description: "Error tracking API. Bearer auth token. Организация и проект в URL.",
    category: ["devtools", "monitoring", "error-tracking"],
    baseUrl: "https://sentry.io/api/0",
    auth: {
      type: "bearer",
      setup: "В n8n: Bearer auth с Sentry Auth Token (из Settings → Account → API → Auth Tokens)."
    },
    defaultHeaders: { "Content-Type": "application/json" },
    endpoints: {
      list_issues: {
        method: "GET",
        path: "/projects/{organization_id_or_slug}/{project_id_or_slug}/issues/",
        description: "Список issues (ошибок) в проекте",
        response: "Массив issue объектов с id, title, count, lastSeen",
        notes: [
          "?query=is:unresolved — фильтр",
          "?sort=date — сортировка",
          "Trailing slash обязателен!",
          "organization_id_or_slug и project_id_or_slug в URL"
        ]
      },
      resolve_issue: {
        method: "PUT",
        path: "/projects/{organization_id_or_slug}/{project_id_or_slug}/issues/",
        description: "Batch обновление issues (resolve, ignore и т.д.)",
        bodyExample: '{"status":"resolved"}',
        response: "Обновлённые issues",
        notes: [
          "?id=ISSUE_ID — какие issues обновить (можно несколько: id=1&id=2)",
          "status: 'resolved', 'unresolved', 'ignored'"
        ]
      },
      create_alert_rule: {
        method: "POST",
        path: "/projects/{organization_id_or_slug}/{project_id_or_slug}/rules/",
        description: "Создать alert rule",
        bodyExample: '{"name":"High Error Rate","conditions":[{"id":"sentry.rules.conditions.event_frequency.EventFrequencyCondition","value":100,"interval":"1h"}],"actions":[{"id":"sentry.integrations.slack.notify_action.SlackNotifyServiceAction","channel":"#alerts"}],"frequency":30}',
        response: "id — rule ID",
        notes: ["conditions + actions: сложная конфигурация"]
      }
    },
    n8nNotes: [
      "Bearer auth token (из Account → API → Auth Tokens)",
      "Trailing slash обязателен в URL!",
      "organization_slug и project_slug в URL",
      "Self-hosted: замени sentry.io на свой URL",
      "n8n имеет встроенную Sentry ноду"
    ],
    rateLimits: "Зависит от плана.",
    docsUrl: "https://docs.sentry.io/api/"
  },

];
