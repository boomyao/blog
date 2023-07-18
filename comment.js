const { getChatResponse } = require("./chat-utils");
const { random, splitNumberedString } = require("./utils");

async function getCommentBatch(prompt, options) {
    const { language = "English", min = 1, max = 5 } = options;
    const count = random(min, max);
    prompt = prompt.replace(/{{language}}/g, language).replace(/{{count}}/g, count);
    const comments = await getChatResponse(prompt);
    const results = await splitNumberedString(comments);
    if (results.length !== count) {
        return [comments]
    }
    return results;
}

async function getQuestionCommentBatch(article, options) {
    const prompt = `Assuming you are a person skilled at thinking, you are always able to pose thought-provoking questions from various perspectives.

    This is my article:
    ${article}

    Now everyone is allowed to ask {{count}} questions. After reading, you came up with {{count}} imaginative questions.:
    tips: separating response with numerical indicators;please response with {{language}};`;
    return getCommentBatch(prompt, options);
}

async function getEncourageCommentBatch(article, options) {
    const prompt = `Assuming you are a discerning talent spotter, adept at giving others affirmation as a means of encouragement.

    This is my article:
    ${article}

    After reading, you gave {{count}} compliments about my thoughts.
    tips: separating response with numerical indicators;please response with {{language}};`;

    return getCommentBatch(prompt, options);
}

async function getCriticalCommentBatch(article, options) {
    const prompt = `Assuming you are a person with strong critical thinking skills, you always come up with viewpoints that differ from me.

    This is my article:
    ${article}

    After reading through the article, you have put forward {{count}} dissenting opinions.
    tips: separating response with numerical indicators;please response with {{language}};
    `;

    return getCommentBatch(prompt, options);
}

async function getWritingGuide(article, language = "English") {
    const prompt = `Suppose you are a language expert who excels in guiding others to write better articles.

    This is my article:
    ${article}

    After reading through the article, you raised some questions and pointed out areas that need improvement. You also provided suggestions and reasons for correcting. You said(please response with ${language}):`;

    const comments = await getChatResponse(prompt);
    return comments;
}

async function replyToComment(article, history) {
    const messages = [
        { role: "user", content: `This is article:\n${article}` },
        { role: "user", content: "Do you have any questions, ideas, or suggestions?"},
        ...history
    ]
    const response = await getChatResponse(messages);
    return response;
}

module.exports = {
    getQuestionCommentBatch,
    getEncourageCommentBatch,
    getCriticalCommentBatch,
    getWritingGuide,
    replyToComment,
}