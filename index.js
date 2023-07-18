const github = require('@actions/github');
const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const ModelEnumMap = {
    BASIC: "gpt-3.5-turbo-0613",
    LONG: "gpt-3.5-turbo-16k-0613",
    PRO: "gpt-4-0613",
    MAX: "gpt-4-32k-0613",
}

async function getChatResponse(prompt, options = {}) {
    options = { temperature: 0.92, model: ModelEnumMap.BASIC, ...options };
    const messages = Array.isArray(prompt) ? prompt : [{ role: "user", content: prompt }];
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

async function getContentLanguage(content) {
    // shorten the content
    content = content.substring(0, 50);
    const prompt = `What language is this content written in?\n\n${content}\n\nJust tell me the language name.\nLanguage name:`;
    const result = await getChatResponse(prompt, { temperature: 0 });
    return result;
}

async function splitNumberedString(inputString) {
    const inputList = inputString.split(/\n+/);
    
    const outputList = inputList.map(item => {
        return item.replace(/\d+[\.\)] /g, "").trim();
    });

    return outputList.filter(item => item !== "");
}

async function getQuestionCommentBatch(article, language = "English") {
    const count = random(2, 5);

    const prompt = `Assuming you are a person skilled at thinking, you are always able to pose thought-provoking questions from various perspectives.
    My native language is ${language}.

    This is my article:
    ${article}

    Now everyone is allowed to ask ${count} questions. After reading, you came up with ${count} imaginative questions, separated by numerical indices. Here are the questions you asked with ${language}:`;

    const comments = await getChatResponse(prompt);
    return await splitNumberedString(comments);
}

async function getIdeaCommentBatch(article, language = "English") {
    const count = random(2, 5);

    const prompt = `Assuming you are a highly thoughtful polymath, you always manage to extrapolate more ideas beyond others' perspectives.
    My native language is ${language}.

    This is my article:
    ${article}

    Now everyone is allowed to present ${count} ideas. After reading them, you have put forward ${count} unconventional and profound ideas, separated by numerical sequence. You said with ${language}:`;
    const comments = await getChatResponse(prompt);
    return await splitNumberedString(comments);
}

async function getErrorComment(article, language = "English") {
    const prompt = `Suppose you are a language expert who excels in guiding others to write better articles.
    I and your native language are both ${language}.

    This is my article:
    ${article}

    After reading through the article, you raised some questions and pointed out areas that need improvement. You also provided suggestions and reasons for correcting. You said with ${language}:`;

    const comments = await getChatResponse(prompt);
    return comments;
}

async function getEncourageCommentBatch(article, language = "English") {
    const count = random(2, 3);

    const prompt = `Assuming you are a discerning talent spotter, adept at giving others affirmation as a means of encouragement.
    I and your native language are both ${language}.

    This is my article:
    ${article}

    After reading, you gave ${count} compliments about my thoughts, separating them with numerical indicators. You expressed them in ${language} and In an informal tone, you said:`;

    const comments = await getChatResponse(prompt);
    return await splitNumberedString(comments);
}

async function replyToComment(article, history) {
    const messages = [
        { role: "user", content: `This is article:\n${article}` },
        { role: "user", content: "你有什么问题或想法和建议吗？"},
        ...history
    ]
    const response = await getChatResponse(messages);
    return response;
}

function isArticle() {
    const { payload } = github.context
    return payload.issue && payload.action === 'opened' && payload.issue.labels.some(label => label.name === 'article')
}

function isComment() {
    const { payload } = github.context
    return payload.action === 'created' && payload.comment?.author_association === 'OWNER'
}

async function postComments(comments) {
    const octokit = github.getOctokit(GITHUB_TOKEN)
    const context = github.context
    const { owner, repo } = context.repo
    const { number } = context.issue

    for (let content, i = 0; content = comments[i++];) {
        await octokit.rest.issues.createComment({
            owner,
            repo,
            issue_number: number,
            body: content
        })
    }
}

function shuffleList(list) {
    for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
    }
}

function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatQuoteComments(issueText) {
    const lines = issueText.split('\r\n');
    
    const result = [];

    lines.forEach(line => {
        const parts = line.split(' ');

        // calculate the number of ">" in the beginning of the line
        const level = parts.reduce((count, part) => part === '>' ? count + 1 : count, 0);

        // remove all ">" in the beginning of the line
        const text = parts.filter(part => part !== '>' && part !== '').join(' ').trim();

        // only add the line if it is not empty
        if (text) {
            result.push({
                level,
                text
            });
        }
    });

    return result;
}

function createQuoteComment(originalComment, replyText) {
    const quotedComment = originalComment.split('\r\n').map(line => line ? '> ' + line : '>').join('\r\n');
    
    const fullComment = `${quotedComment}\r\n\r\n${replyText}`;

    return fullComment;
}

function getRoleByLevel(level) {
    if (level % 2 === 0) {
        return 'user'
    } else {
        return 'assistant'
    }
}

// main
async function main() {
    const context = github.context

    if (isArticle()) {
        const { body, title } = context.payload.issue;
        const article = `${title}\n${body}`;

        const language = await getContentLanguage(article);

        const results = await Promise.all([
            getErrorComment(article, language),
            getQuestionCommentBatch(article, language),
            getIdeaCommentBatch(article, language),
            getEncourageCommentBatch(article, language)
        ]);

        const comments = [results[0], ...results[1], ...results[2], ...results[3]];

        shuffleList(comments);

        await postComments(comments);
    } else if (isComment()) {
        const { issue, comment } = context.payload;
        const article = `${issue.title}\n${issue.body}`;
        const comments = formatQuoteComments(comment.body);
        const history = comments.map(comment => ({ role: getRoleByLevel(comment.level), content: comment.text }));
        const response = await replyToComment(article, history);
        const replyText = createQuoteComment(comment.body, response);
        await postComments([replyText]);
    }
}

main().then(() => {
    process.exit();
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });