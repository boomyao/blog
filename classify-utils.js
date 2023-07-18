const { getChatResponse } = require('./chat-utils');

async function getContentLanguage(content) {
    // shorten the content
    content = content.substring(0, 50);
    const prompt = `What language is this content written in?\n\n${content}\n\nJust tell me the language name.\nLanguage name:`;
    const result = await getChatResponse(prompt, { temperature: 0 });
    return result;
}

module.exports = {
    getContentLanguage,
}