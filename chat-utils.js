const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const ModelEnumMap = {
    BASIC: "gpt-3.5-turbo-0613",
    PLUS: "gpt-3.5-turbo-16k-0613",
    PRO: "gpt-4-0613",
    MAX: "gpt-4-32k-0613",
}

async function getChatResponse(prompt, options = {}) {
    options = { temperature: 0.92, model: ModelEnumMap.BASIC, ...options };
    const messages = Array.isArray(prompt) ? prompt : [{ role: "user", content: prompt }];

    // choose model
    if (JSON.stringify(messages).length > 4096) {
        options.model = ModelEnumMap.PLUS;
    }

    const response = await openai.createChatCompletion({
        model: options.model,
        temperature: options.temperature,
        messages: [
            { role: "system", content: "You are a helpful assistant" },
            ...messages,
        ],
    });

    return response.data.choices[0].message.content;
}

module.exports = {
    getChatResponse,
}